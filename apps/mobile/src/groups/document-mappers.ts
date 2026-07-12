import { GROUP_QR_TYPE, GROUP_TRANSACTION_STATUS } from './constants';
import { GroupReceipt, GroupSentTransaction } from './types';

function timestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

function isGroupQrType(value: unknown): value is GroupSentTransaction['qrType'] {
  return value === GROUP_QR_TYPE.OPEN || value === GROUP_QR_TYPE.FIXED;
}

export function groupSentTransactionFromData(
  id: string,
  data: Record<string, unknown>,
): GroupSentTransaction | null {
  if (!isGroupQrType(data.qrType)) return null;
  return {
    id,
    qrType: data.qrType,
    qrReferenceId: typeof data.qrReferenceId === 'string' ? data.qrReferenceId : '',
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    groupName: typeof data.groupName === 'string' ? data.groupName : 'Grupo',
    payerId: typeof data.payerId === 'string' ? data.payerId : '',
    amountInCents: typeof data.amountInCents === 'number' ? data.amountInCents : 0,
    currency: 'EUR',
    concept: typeof data.concept === 'string' ? data.concept : '',
    recipientCount: typeof data.recipientCount === 'number' ? data.recipientCount : 0,
    status: GROUP_TRANSACTION_STATUS.COMPLETED,
    createdAt: timestamp(data.createdAt),
  };
}

export function groupReceiptFromData(
  id: string,
  data: Record<string, unknown>,
): GroupReceipt | null {
  if (!isGroupQrType(data.qrType)) return null;
  return {
    id,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : '',
    recipientId: typeof data.recipientId === 'string' ? data.recipientId : '',
    payerId: typeof data.payerId === 'string' ? data.payerId : '',
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    groupName: typeof data.groupName === 'string' ? data.groupName : 'Grupo',
    qrType: data.qrType,
    qrReferenceId: typeof data.qrReferenceId === 'string' ? data.qrReferenceId : '',
    amountInCents: typeof data.amountInCents === 'number' ? data.amountInCents : 0,
    totalAmountInCents: typeof data.totalAmountInCents === 'number' ? data.totalAmountInCents : 0,
    recipientCount: typeof data.recipientCount === 'number' ? data.recipientCount : 0,
    currency: 'EUR',
    concept: typeof data.concept === 'string' ? data.concept : '',
    status: GROUP_TRANSACTION_STATUS.COMPLETED,
    createdAt: timestamp(data.createdAt),
  };
}
