import { createHash } from 'node:crypto';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { PUSH_NOTIFICATION } from './constants';
import {
  PushDeliveryRepository,
  PushTokenRegistration,
  PushTokenRepository,
  UserProfileRepository,
} from './domain';

export function pushTokenId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class FirestorePushTokenRepository implements PushTokenRepository {
  constructor(private readonly db: Firestore) {}

  async listEnabled(userId: string): Promise<PushTokenRegistration[]> {
    const snapshot = await this.db.collection('users').doc(userId).collection('pushTokens')
      .where('enabled', '==', true).get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        token: String(data.token),
        soundEnabled: data.soundEnabled !== false,
      };
    });
  }

  async upsert(userId: string, registration: PushTokenRegistration & { platform: string }): Promise<void> {
    await this.db.collection('users').doc(userId).collection('pushTokens').doc(registration.id).set({
      token: registration.token,
      platform: registration.platform,
      soundEnabled: registration.soundEnabled,
      enabled: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  async setEnabledForUser(userId: string, enabled: boolean): Promise<void> {
    const snapshot = await this.db.collection('users').doc(userId).collection('pushTokens').get();
    const writer = this.db.bulkWriter();
    snapshot.docs.forEach((document) => writer.update(document.ref, {
      enabled,
      updatedAt: FieldValue.serverTimestamp(),
    }));
    await writer.close();
  }

  async disable(userId: string, tokenId: string): Promise<void> {
    await this.db.collection('users').doc(userId).collection('pushTokens').doc(tokenId).set({
      enabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

export class FirestorePushDeliveryRepository implements PushDeliveryRepository {
  constructor(private readonly db: Firestore) {}

  async claim(transactionId: string, tokenId: string): Promise<boolean> {
    const id = `${transactionId}_${tokenId}`;
    const reference = this.db.collection('pushDeliveries').doc(id);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data();
      if (data?.status === 'sent') return false;
      if (Number(data?.attempts ?? 0) >= PUSH_NOTIFICATION.maxDeliveryAttempts) return false;
      if (data?.status === 'processing' && Number(data.leaseUntil) > Date.now()) return false;
      transaction.set(reference, {
        transactionId,
        tokenId,
        status: 'processing',
        leaseUntil: Date.now() + PUSH_NOTIFICATION.deliveryLeaseMs,
        attempts: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });
  }

  async markSent(transactionId: string, tokenId: string, receiptId?: string): Promise<void> {
    await this.update(transactionId, tokenId, { status: 'sent', receiptId: receiptId ?? null });
  }

  async markFailed(transactionId: string, tokenId: string, errorCode?: string): Promise<void> {
    await this.update(transactionId, tokenId, { status: 'failed', errorCode: errorCode ?? null });
  }

  private async update(transactionId: string, tokenId: string, data: Record<string, unknown>): Promise<void> {
    await this.db.collection('pushDeliveries').doc(`${transactionId}_${tokenId}`).set({
      ...data,
      leaseUntil: 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

export class FirestoreUserProfileRepository implements UserProfileRepository {
  constructor(private readonly db: Firestore) {}

  async displayName(userId: string): Promise<string> {
    const snapshot = await this.db.collection('users').doc(userId).get();
    const displayName = snapshot.data()?.displayName;
    return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Alguien';
  }
}
