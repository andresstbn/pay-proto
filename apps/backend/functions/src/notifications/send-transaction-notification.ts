import {
  CompletedTransaction,
  PushDeliveryRepository,
  PushNotificationProvider,
  PushTokenRepository,
  UserProfileRepository,
} from './domain';

export class RetryablePushDeliveryError extends Error {
  constructor() {
    super('Una o más entregas push fallaron de forma transitoria.');
    this.name = 'RetryablePushDeliveryError';
  }
}

export class SendTransactionNotification {
  constructor(
    private readonly tokens: PushTokenRepository,
    private readonly deliveries: PushDeliveryRepository,
    private readonly profiles: UserProfileRepository,
    private readonly provider: PushNotificationProvider,
  ) {}

  async execute(transaction: CompletedTransaction): Promise<{ sent: number; skipped: number }> {
    if (transaction.status !== 'completed' || transaction.amountInCents <= 0) {
      return { sent: 0, skipped: 0 };
    }

    const [registrations, payerName] = await Promise.all([
      this.tokens.listEnabled(transaction.recipientId),
      this.profiles.displayName(transaction.payerId),
    ]);

    let sent = 0;
    let skipped = 0;
    let shouldRetry = false;

    for (const registration of registrations) {
      const claimed = await this.deliveries.claim(transaction.id, registration.id);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      const result = await this.provider.sendIncomingTransfer({
        token: registration.token,
        transaction,
        payerName,
        soundEnabled: registration.soundEnabled,
      });

      if (result.ok) {
        await this.deliveries.markSent(transaction.id, registration.id, result.receiptId);
        sent += 1;
        continue;
      }

      await this.deliveries.markFailed(transaction.id, registration.id, result.errorCode);
      if (result.errorCode === 'DeviceNotRegistered') {
        await this.tokens.disable(transaction.recipientId, registration.id);
      } else if (result.retryable) {
        shouldRetry = true;
      }
    }

    if (shouldRetry) throw new RetryablePushDeliveryError();
    return { sent, skipped };
  }
}
