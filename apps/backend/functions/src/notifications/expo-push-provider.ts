import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PUSH_ERROR_CODES, PUSH_NOTIFICATION } from './constants';
import { PushDeliveryResult, PushNotificationProvider } from './domain';

const RETRYABLE_ERRORS = new Set<string>([
  PUSH_ERROR_CODES.messageRateExceeded,
  PUSH_ERROR_CODES.providerError,
  PUSH_ERROR_CODES.timeout,
  PUSH_ERROR_CODES.unknown,
]);

export class ExpoPushProvider implements PushNotificationProvider {
  constructor(
    private readonly expo = new Expo(),
    private readonly timeoutMs = PUSH_NOTIFICATION.providerTimeoutMs,
  ) {}

  async sendIncomingTransfer(input: Parameters<PushNotificationProvider['sendIncomingTransfer']>[0]): Promise<PushDeliveryResult> {
    const amount = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: input.transaction.currency,
    }).format(input.transaction.amountInCents / 100);
    const message: ExpoPushMessage = {
      to: input.token,
      title: 'Transferencia recibida',
      body: `${input.payerName} te envió ${amount}`,
      data: { type: 'incoming_transfer', transactionId: input.transaction.id },
      priority: 'high',
      channelId: PUSH_NOTIFICATION.channelId,
      sound: input.soundEnabled ? PUSH_NOTIFICATION.soundName : null,
    };

    let lastResult: PushDeliveryResult = {
      ok: false,
      errorCode: PUSH_ERROR_CODES.unknown,
      retryable: true,
    };

    for (let attempt = 0; attempt < PUSH_NOTIFICATION.maxProviderAttempts; attempt += 1) {
      lastResult = await this.sendOnce(message);
      if (lastResult.ok || !lastResult.retryable) return lastResult;
    }
    return lastResult;
  }

  private async sendOnce(message: ExpoPushMessage): Promise<PushDeliveryResult> {
    try {
      const tickets = await Promise.race([
        this.expo.sendPushNotificationsAsync([message]),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(PUSH_ERROR_CODES.timeout)), this.timeoutMs);
        }),
      ]);
      return this.ticketResult(tickets[0]);
    } catch (error) {
      const errorCode = error instanceof Error && error.message === PUSH_ERROR_CODES.timeout
        ? PUSH_ERROR_CODES.timeout
        : PUSH_ERROR_CODES.unknown;
      return { ok: false, errorCode, retryable: true };
    }
  }

  private ticketResult(ticket: ExpoPushTicket | undefined): PushDeliveryResult {
    if (!ticket) return { ok: false, errorCode: PUSH_ERROR_CODES.unknown, retryable: true };
    if (ticket.status === 'ok') return { ok: true, receiptId: ticket.id, retryable: false };
    const errorCode = ticket.details?.error ?? PUSH_ERROR_CODES.unknown;
    return { ok: false, errorCode, retryable: RETRYABLE_ERRORS.has(errorCode) };
  }
}
