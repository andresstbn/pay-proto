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

export type GroupCollection =
  | 'groups'
  | 'groupQrs'
  | 'groupActivity'
  | 'groupReceipts'
  | 'transactions';

export interface GroupTransaction {
  getGroup(groupId: string): Promise<Group | null>;
  getQr(qrId: string): Promise<GroupQr | null>;
  getInvite(inviteHash: string): Promise<GroupInvite | null>;
  getUserBalance(userId: string): Promise<UserBalance | null>;
  getPaymentRequest(requestId: string): Promise<GroupPaymentRequest | null>;
  listGroupQrs(groupId: string): Promise<GroupQr[]>;

  createGroup(group: Group): void;
  updateGroup(groupId: string, changes: Partial<Group>): void;
  createQr(qr: GroupQr): void;
  updateQr(qrId: string, changes: Partial<GroupQr>): void;
  createInvite(invite: GroupInvite): void;
  updateInvite(inviteHash: string, changes: Partial<GroupInvite>): void;
  updateUserBalance(userId: string, deltaInCents: number): void;
  createPaymentTransaction(payment: GroupPaymentTransaction): void;
  createGroupReceipt(receipt: GroupReceipt): void;
  createPaymentRequest(request: GroupPaymentRequest): void;
  createActivity(activity: GroupActivity): void;
}

export interface GroupsRepository {
  createId(collection: GroupCollection): string;
  runTransaction<T>(work: (transaction: GroupTransaction) => Promise<T>): Promise<T>;
}
