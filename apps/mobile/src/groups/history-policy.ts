import { GroupHistoryItem, GroupReceipt, GroupSentTransaction } from './types';

export function buildGroupHistory(
  sentTransactions: GroupSentTransaction[],
  receivedReceipts: GroupReceipt[],
): GroupHistoryItem[] {
  const sent = sentTransactions.map((transaction): GroupHistoryItem => ({
    id: transaction.id,
    transactionId: transaction.id,
    qrType: transaction.qrType,
    qrReferenceId: transaction.qrReferenceId,
    groupId: transaction.groupId,
    groupName: transaction.groupName,
    payerId: transaction.payerId,
    currency: transaction.currency,
    concept: transaction.concept,
    status: transaction.status,
    createdAt: transaction.createdAt,
    direction: 'sent',
    visibleAmountInCents: transaction.amountInCents,
    totalAmountInCents: transaction.amountInCents,
    recipientCount: transaction.recipientCount,
  }));

  const received = receivedReceipts.map((receipt): GroupHistoryItem => ({
    id: receipt.transactionId,
    transactionId: receipt.transactionId,
    qrType: receipt.qrType,
    qrReferenceId: receipt.qrReferenceId,
    groupId: receipt.groupId,
    groupName: receipt.groupName,
    payerId: receipt.payerId,
    currency: receipt.currency,
    concept: receipt.concept,
    status: receipt.status,
    createdAt: receipt.createdAt,
    direction: 'received',
    visibleAmountInCents: receipt.amountInCents,
    totalAmountInCents: receipt.totalAmountInCents,
    recipientCount: receipt.recipientCount,
  }));

  return [...sent, ...received].sort((a, b) => b.createdAt - a.createdAt);
}
