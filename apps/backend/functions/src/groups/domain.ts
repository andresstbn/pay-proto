export const GROUP_CURRENCY = 'EUR' as const;
export const MAX_GROUP_MEMBERS = 20;
export const MAX_GROUP_AMOUNT_IN_CENTS = 100_000_000;
export const MAX_GROUP_FIXED_QRS = 100;

export type GroupStatus = 'active' | 'archived';
export type GroupRole = 'owner' | 'admin' | 'member';
export type GroupQrType = 'open' | 'fixed';
export type GroupQrStatus = 'active' | 'inactive';
export type GroupActivityType =
  | 'group_created'
  | 'member_joined'
  | 'member_removed'
  | 'member_left'
  | 'participation_changed'
  | 'role_changed'
  | 'ownership_transferred'
  | 'group_archived'
  | 'qr_created'
  | 'qr_deactivated'
  | 'payment_completed';

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  activeMemberIds: string[];
  status: GroupStatus;
  distributionCursor: number;
  openQrId: string;
  activeInviteHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface GroupQr {
  id: string;
  groupId: string;
  type: GroupQrType;
  name: string;
  concept: string;
  amountInCents: number | null;
  currency: typeof GROUP_CURRENCY;
  status: GroupQrStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: number;
  invalidatedAt: number | null;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  type: GroupActivityType;
  actorId?: string;
  targetMemberId?: string;
  active?: boolean;
  role?: Exclude<GroupRole, 'owner'>;
  transactionId?: string;
  amountInCents?: number;
  recipientCount?: number;
  createdAt: number;
}

export interface GroupPaymentTransaction {
  id: string;
  qrType: 'group_open' | 'group_fixed';
  qrReferenceId: string;
  groupId: string;
  groupName: string;
  payerId: string;
  recipientCount: number;
  amountInCents: number;
  currency: typeof GROUP_CURRENCY;
  concept: string;
  status: 'completed';
  createdAt: number;
}

export interface GroupPaymentResult {
  transactionId: string;
  groupId: string;
  amountInCents: number;
  recipientCount: number;
  payerBalanceInCentsAfter: number;
  createdAt: number;
}

export interface GroupReceipt {
  id: string;
  transactionId: string;
  groupId: string;
  groupName: string;
  qrType: 'group_open' | 'group_fixed';
  qrReferenceId: string;
  payerId: string;
  recipientId: string;
  amountInCents: number;
  totalAmountInCents: number;
  recipientCount: number;
  currency: typeof GROUP_CURRENCY;
  concept: string;
  status: 'completed';
  createdAt: number;
}

export interface GroupPaymentRequest {
  id: string;
  payerId: string;
  requestFingerprint: string;
  result: GroupPaymentResult;
  createdAt: number;
}

export interface UserBalance {
  id: string;
  balanceInCents: number;
}

export type GroupErrorCode =
  | 'invalid-argument'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'failed-precondition';

export class GroupError extends Error {
  constructor(
    readonly code: GroupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GroupError';
  }
}
