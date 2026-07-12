import { Expo } from 'expo-server-sdk';
import { describe, expect, it, vi } from 'vitest';
import { ExpoPushProvider } from './expo-push-provider';

const transaction = {
  id: 'txn-1',
  payerId: 'payer-1',
  recipientId: 'recipient-1',
  amountInCents: 1250,
  currency: 'EUR',
  status: 'completed' as const,
};

describe('ExpoPushProvider', () => {
  it('incluye canal, sonido original y navegación en el payload', async () => {
    const sendPushNotificationsAsync = vi.fn().mockResolvedValue([{ status: 'ok', id: 'receipt-1' }]);
    const provider = new ExpoPushProvider({ sendPushNotificationsAsync } as unknown as Expo);

    await expect(provider.sendIncomingTransfer({
      token: 'ExponentPushToken[test]',
      transaction,
      payerName: 'María',
      soundEnabled: true,
    })).resolves.toEqual({ ok: true, receiptId: 'receipt-1', retryable: false });

    expect(sendPushNotificationsAsync).toHaveBeenCalledWith([
      expect.objectContaining({
        channelId: 'incoming-transfers-v1',
        sound: 'ericpay-received.wav',
        data: { type: 'incoming_transfer', transactionId: 'txn-1' },
      }),
    ]);
  });

  it('respeta la preferencia de sonido desactivado', async () => {
    const sendPushNotificationsAsync = vi.fn().mockResolvedValue([{ status: 'ok', id: 'receipt-2' }]);
    const provider = new ExpoPushProvider({ sendPushNotificationsAsync } as unknown as Expo);
    await provider.sendIncomingTransfer({
      token: 'ExponentPushToken[test]',
      transaction,
      payerName: 'María',
      soundEnabled: false,
    });
    expect(sendPushNotificationsAsync).toHaveBeenCalledWith([expect.objectContaining({ sound: null })]);
  });
});
