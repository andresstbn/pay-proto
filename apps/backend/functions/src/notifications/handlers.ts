import { Firestore } from 'firebase-admin/firestore';
import { Expo } from 'expo-server-sdk';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ExpoPushProvider } from './expo-push-provider';
import {
  FirestorePushDeliveryRepository,
  FirestorePushTokenRepository,
  FirestoreUserProfileRepository,
  pushTokenId,
} from './firestore-repositories';
import { CompletedTransaction } from './domain';
import { SendTransactionNotification } from './send-transaction-notification';

export function createNotificationHandlers(db: Firestore) {
  const tokens = new FirestorePushTokenRepository(db);
  const deliveries = new FirestorePushDeliveryRepository(db);
  const profiles = new FirestoreUserProfileRepository(db);
  const useCase = new SendTransactionNotification(tokens, deliveries, profiles, new ExpoPushProvider());

  const registerPushToken = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const { token, platform, soundEnabled } = request.data as Record<string, unknown>;
    if (!Expo.isExpoPushToken(token)) throw new HttpsError('invalid-argument', 'Token push inválido.');
    if (platform !== 'ios' && platform !== 'android') throw new HttpsError('invalid-argument', 'Plataforma inválida.');
    await tokens.upsert(request.auth.uid, {
      id: pushTokenId(token),
      token,
      platform,
      soundEnabled: soundEnabled !== false,
    });
    return { ok: true };
  });

  const setPushEnabled = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const enabled = request.data?.enabled;
    if (typeof enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Estado push inválido.');
    await tokens.setEnabledForUser(request.auth.uid, enabled);
    return { ok: true };
  });

  const onTransactionCreated = onDocumentCreated({
    document: 'transactions/{transactionId}',
    region: 'us-central1',
    retry: true,
  }, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();
    if (data.status !== 'completed') return;
    const transaction: CompletedTransaction = {
      id: event.params.transactionId,
      payerId: String(data.payerId ?? ''),
      recipientId: String(data.recipientId ?? ''),
      amountInCents: Number(data.amountInCents ?? 0),
      currency: String(data.currency ?? 'EUR'),
      status: 'completed',
    };
    if (!transaction.payerId || !transaction.recipientId) return;

    const startedAt = Date.now();
    try {
      const result = await useCase.execute(transaction);
      logger.info('incoming_transfer_push_completed', {
        transactionId: transaction.id,
        sent: result.sent,
        skipped: result.skipped,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      logger.error('incoming_transfer_push_failed', {
        transactionId: transaction.id,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  });

  return { registerPushToken, setPushEnabled, onTransactionCreated };
}
