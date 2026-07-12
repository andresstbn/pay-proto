import { Transaction } from '../domain/types';

export function incomingCompletedTransactions(
  transactions: Transaction[],
  recipientId: string,
  knownTransactionIds: ReadonlySet<string>,
): Transaction[] {
  return transactions.filter(
    (transaction) =>
      transaction.status === 'completed' &&
      transaction.recipientId === recipientId &&
      !knownTransactionIds.has(transaction.id),
  );
}
