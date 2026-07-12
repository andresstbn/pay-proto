import { FieldValue, Firestore, Transaction } from 'firebase-admin/firestore';
import {
  INITIAL_BALANCE_IN_CENTS,
  PROFILE_CURRENCY,
  ProfileRecord,
  ProfileRepository,
} from './profile-service';

export class FirestoreProfileRepository implements ProfileRepository {
  constructor(private readonly firestore: Firestore) {}

  syncProfile(profile: ProfileRecord): Promise<void> {
    return this.writeProfile(profile, true);
  }

  ensureProfile(profile: ProfileRecord): Promise<void> {
    return this.writeProfile(profile, false);
  }

  private async writeProfile(profile: ProfileRecord, updateExisting: boolean): Promise<void> {
    const userRef = this.firestore.collection('users').doc(profile.userId);
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (snapshot.exists) {
        if (updateExisting) {
          transaction.update(userRef, {
            displayName: profile.displayName,
            photoUrl: profile.photoUrl,
          });
        }
        return;
      }

      createProfile(transaction, userRef, profile);
    });
  }
}

function createProfile(
  transaction: Transaction,
  userRef: FirebaseFirestore.DocumentReference,
  profile: ProfileRecord,
): void {
  transaction.create(userRef, {
    id: profile.userId,
    displayName: profile.displayName,
    email: profile.email,
    photoUrl: profile.photoUrl,
    balanceInCents: INITIAL_BALANCE_IN_CENTS,
    currency: PROFILE_CURRENCY,
    createdAt: FieldValue.serverTimestamp(),
  });
}
