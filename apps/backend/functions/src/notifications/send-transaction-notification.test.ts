import { describe, expect, it } from 'vitest';
import {
  CompletedTransaction,
  PushDeliveryRepository,
  PushDeliveryResult,
  PushNotificationProvider,
  PushTokenRegistration,
  PushTokenRepository,
  UserProfileRepository,
} from './domain';
import { RetryablePushDeliveryError, SendTransactionNotification } from './send-transaction-notification';

const transaction: CompletedTransaction = {
  id: 'txn-1',
  payerId: 'payer-1',
  recipientId: 'recipient-1',
  amountInCents: 1250,
  currency: 'EUR',
  status: 'completed',
};

class FakeTokens implements PushTokenRepository {
  disabled: string[] = [];
  constructor(public registrations: PushTokenRegistration[]) {}
  async listEnabled() { return this.registrations; }
  async upsert() { return undefined; }
  async setEnabledForUser() { return undefined; }
  async disable(_userId: string, tokenId: string) { this.disabled.push(tokenId); }
}

class FakeDeliveries implements PushDeliveryRepository {
  sent: string[] = [];
  failed: string[] = [];
  constructor(private readonly claimResult = true) {}
  async claim() { return this.claimResult; }
  async markSent(_transactionId: string, tokenId: string) { this.sent.push(tokenId); }
  async markFailed(_transactionId: string, tokenId: string) { this.failed.push(tokenId); }
}

class FakeProfiles implements UserProfileRepository {
  async displayName() { return 'María'; }
}

class FakeProvider implements PushNotificationProvider {
  calls = 0;
  constructor(private readonly result: PushDeliveryResult) {}
  async sendIncomingTransfer() { this.calls += 1; return this.result; }
}

function setup(result: PushDeliveryResult, claimResult = true) {
  const tokens = new FakeTokens([{ id: 'token-1', token: 'ExponentPushToken[test]', soundEnabled: true }]);
  const deliveries = new FakeDeliveries(claimResult);
  const provider = new FakeProvider(result);
  const useCase = new SendTransactionNotification(tokens, deliveries, new FakeProfiles(), provider);
  return { tokens, deliveries, provider, useCase };
}

describe('SendTransactionNotification', () => {
  it('envía y registra una transferencia nueva', async () => {
    const subject = setup({ ok: true, receiptId: 'receipt-1', retryable: false });
    await expect(subject.useCase.execute(transaction)).resolves.toEqual({ sent: 1, skipped: 0 });
    expect(subject.deliveries.sent).toEqual(['token-1']);
    expect(subject.provider.calls).toBe(1);
  });

  it('omite una entrega ya reclamada', async () => {
    const subject = setup({ ok: true, retryable: false }, false);
    await expect(subject.useCase.execute(transaction)).resolves.toEqual({ sent: 0, skipped: 1 });
    expect(subject.provider.calls).toBe(0);
  });

  it('desactiva tokens que el proveedor ya no reconoce', async () => {
    const subject = setup({ ok: false, errorCode: 'DeviceNotRegistered', retryable: false });
    await expect(subject.useCase.execute(transaction)).resolves.toEqual({ sent: 0, skipped: 0 });
    expect(subject.tokens.disabled).toEqual(['token-1']);
    expect(subject.deliveries.failed).toEqual(['token-1']);
  });

  it('propaga un fallo transitorio para que el trigger reintente', async () => {
    const subject = setup({ ok: false, errorCode: 'ProviderTimeout', retryable: true });
    await expect(subject.useCase.execute(transaction)).rejects.toBeInstanceOf(RetryablePushDeliveryError);
    expect(subject.deliveries.failed).toEqual(['token-1']);
  });

  it('ignora transacciones inválidas', async () => {
    const subject = setup({ ok: true, retryable: false });
    await expect(subject.useCase.execute({ ...transaction, amountInCents: 0 })).resolves.toEqual({ sent: 0, skipped: 0 });
    expect(subject.provider.calls).toBe(0);
  });
});
