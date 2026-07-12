import { Firestore, FieldValue, Transaction } from 'firebase-admin/firestore';
import {
  Group,
  GroupActivity,
  GroupInvite,
  GroupPaymentRequest,
  GroupPaymentTransaction,
  GroupQr,
  GroupReceipt,
  UserBalance,
} from './domain';
import {
  GroupCollection,
  GroupsRepository,
  GroupTransaction,
} from './repository';

export class FirestoreGroupsRepository implements GroupsRepository {
  constructor(private readonly firestore: Firestore) {}

  createId(collection: GroupCollection): string {
    return this.firestore.collection(collection).doc().id;
  }

  runTransaction<T>(work: (transaction: GroupTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction((transaction) => (
      work(new FirestoreGroupTransaction(this.firestore, transaction))
    ));
  }
}

class FirestoreGroupTransaction implements GroupTransaction {
  constructor(
    private readonly firestore: Firestore,
    private readonly transaction: Transaction,
  ) {}

  async getGroup(groupId: string): Promise<Group | null> {
    const snapshot = await this.transaction.get(this.firestore.collection('groups').doc(groupId));
    return snapshot.exists ? asDocument<Group>(snapshot.id, snapshot.data()) : null;
  }

  async getQr(qrId: string): Promise<GroupQr | null> {
    const snapshot = await this.transaction.get(this.firestore.collection('groupQrs').doc(qrId));
    return snapshot.exists ? asDocument<GroupQr>(snapshot.id, snapshot.data()) : null;
  }

  async getInvite(inviteHash: string): Promise<GroupInvite | null> {
    const snapshot = await this.transaction.get(
      this.firestore.collection('groupInvites').doc(inviteHash),
    );
    return snapshot.exists ? asDocument<GroupInvite>(snapshot.id, snapshot.data()) : null;
  }

  async getUserBalance(userId: string): Promise<UserBalance | null> {
    const snapshot = await this.transaction.get(this.firestore.collection('users').doc(userId));
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      balanceInCents: data?.balanceInCents as number,
    };
  }

  async getPaymentRequest(requestId: string): Promise<GroupPaymentRequest | null> {
    const snapshot = await this.transaction.get(
      this.firestore.collection('groupPaymentRequests').doc(requestId),
    );
    return snapshot.exists ? asDocument<GroupPaymentRequest>(snapshot.id, snapshot.data()) : null;
  }

  async listGroupQrs(groupId: string): Promise<GroupQr[]> {
    const query = this.firestore.collection('groupQrs').where('groupId', '==', groupId);
    const snapshot = await this.transaction.get(query);
    return snapshot.docs.map((document) => asDocument<GroupQr>(document.id, document.data()));
  }

  createGroup(group: Group): void {
    this.transaction.create(this.firestore.collection('groups').doc(group.id), group);
  }

  updateGroup(groupId: string, changes: Partial<Group>): void {
    this.transaction.update(this.firestore.collection('groups').doc(groupId), changes);
  }

  createQr(qr: GroupQr): void {
    this.transaction.create(this.firestore.collection('groupQrs').doc(qr.id), qr);
  }

  updateQr(qrId: string, changes: Partial<GroupQr>): void {
    this.transaction.update(this.firestore.collection('groupQrs').doc(qrId), changes);
  }

  createInvite(invite: GroupInvite): void {
    this.transaction.create(this.firestore.collection('groupInvites').doc(invite.id), invite);
  }

  updateInvite(inviteHash: string, changes: Partial<GroupInvite>): void {
    this.transaction.update(this.firestore.collection('groupInvites').doc(inviteHash), changes);
  }

  updateUserBalance(userId: string, deltaInCents: number): void {
    this.transaction.update(this.firestore.collection('users').doc(userId), {
      balanceInCents: FieldValue.increment(deltaInCents),
    });
  }

  createPaymentTransaction(payment: GroupPaymentTransaction): void {
    this.transaction.create(this.firestore.collection('transactions').doc(payment.id), payment);
  }

  createGroupReceipt(receipt: GroupReceipt): void {
    this.transaction.create(this.firestore.collection('groupReceipts').doc(receipt.id), receipt);
  }

  createPaymentRequest(request: GroupPaymentRequest): void {
    this.transaction.create(
      this.firestore.collection('groupPaymentRequests').doc(request.id),
      request,
    );
  }

  createActivity(activity: GroupActivity): void {
    this.transaction.create(this.firestore.collection('groupActivity').doc(activity.id), activity);
  }
}

function asDocument<T>(id: string, data: FirebaseFirestore.DocumentData | undefined): T {
  return { ...data, id } as T;
}
