import { Currency } from '../domain/types';
import {
  GROUP_ACTIVITY_TYPE,
  GROUP_QR_TYPE,
  GROUP_QR_STATUS,
  GROUP_QR_KIND,
  GROUP_ROLE,
  GROUP_STATUS,
  GROUP_TRANSACTION_STATUS,
} from './constants';

export type GroupRole = (typeof GROUP_ROLE)[keyof typeof GROUP_ROLE];
export type GroupStatus = (typeof GROUP_STATUS)[keyof typeof GROUP_STATUS];
export type GroupQrStatus = (typeof GROUP_QR_STATUS)[keyof typeof GROUP_QR_STATUS];
export type GroupActivityType = (typeof GROUP_ACTIVITY_TYPE)[keyof typeof GROUP_ACTIVITY_TYPE];

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  activeMemberIds: string[];
  status: GroupStatus;
  openQrId: string;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export interface GroupQr {
  id: string;
  groupId: string;
  name: string;
  type: (typeof GROUP_QR_KIND)[keyof typeof GROUP_QR_KIND];
  concept: string;
  amountInCents: number;
  currency: Currency;
  status: GroupQrStatus;
  createdAt: number;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  type: GroupActivityType;
  actorId?: string;
  targetMemberId?: string;
  transactionId?: string;
  amountInCents?: number;
  recipientCount?: number;
  active?: boolean;
  createdAt: number;
}

export interface GroupSentTransaction {
  id: string;
  qrType: (typeof GROUP_QR_TYPE)[keyof typeof GROUP_QR_TYPE];
  qrReferenceId: string;
  groupId: string;
  groupName: string;
  payerId: string;
  amountInCents: number;
  currency: Currency;
  concept: string;
  recipientCount: number;
  status: (typeof GROUP_TRANSACTION_STATUS)[keyof typeof GROUP_TRANSACTION_STATUS];
  createdAt: number;
}

export interface GroupReceipt {
  id: string;
  transactionId: string;
  recipientId: string;
  payerId: string;
  groupId: string;
  groupName: string;
  qrType: (typeof GROUP_QR_TYPE)[keyof typeof GROUP_QR_TYPE];
  qrReferenceId: string;
  amountInCents: number;
  totalAmountInCents: number;
  recipientCount: number;
  currency: Currency;
  concept: string;
  status: (typeof GROUP_TRANSACTION_STATUS)[keyof typeof GROUP_TRANSACTION_STATUS];
  createdAt: number;
}

export interface GroupHistoryItem {
  id: string;
  transactionId: string;
  qrType: (typeof GROUP_QR_TYPE)[keyof typeof GROUP_QR_TYPE];
  qrReferenceId: string;
  groupId: string;
  groupName: string;
  payerId: string;
  currency: Currency;
  concept: string;
  status: (typeof GROUP_TRANSACTION_STATUS)[keyof typeof GROUP_TRANSACTION_STATUS];
  createdAt: number;
  direction: 'sent' | 'received';
  visibleAmountInCents: number;
  totalAmountInCents: number;
  recipientCount: number;
}

export interface GroupPaymentPreview {
  groupId: string;
  groupName: string;
  amountInCents: number;
  concept: string;
  recipientCount: number;
  qrId?: string;
}

export type GroupActionResult = { ok: true } | { ok: false; error: string };
export type GroupCreateResult = { ok: true; id: string } | { ok: false; error: string };
export type GroupInviteResult =
  | { ok: true; code: string; link: string }
  | { ok: false; error: string };
export type GroupPreviewResult =
  | { ok: true; preview: GroupPaymentPreview }
  | { ok: false; error: string };
export type GroupPayResult =
  | {
      ok: true;
      transactionId: string;
      groupId: string;
      amountInCents: number;
      recipientCount: number;
      payerBalanceInCentsAfter: number;
      createdAt: number;
    }
  | { ok: false; error: string };
