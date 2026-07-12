import { describe, expect, it } from 'vitest';
import { GROUP_QR_TYPE, GROUP_TRANSACTION_STATUS } from './constants';
import { buildGroupHistory } from './history-policy';
import { GroupReceipt, GroupSentTransaction } from './types';

const sent: GroupSentTransaction = {
  id: 'transaction-sent',
  qrType: GROUP_QR_TYPE.OPEN,
  qrReferenceId: 'qr-open',
  groupId: 'group-1',
  groupName: 'Equipo terraza',
  payerId: 'payer',
  amountInCents: 900,
  currency: 'EUR',
  concept: 'Mesa 3',
  recipientCount: 3,
  status: GROUP_TRANSACTION_STATUS.COMPLETED,
  createdAt: 100,
};

const received: GroupReceipt = {
  id: 'receipt-1',
  transactionId: 'transaction-received',
  recipientId: 'recipient',
  payerId: 'another-payer',
  groupId: 'group-1',
  groupName: 'Equipo terraza',
  qrType: GROUP_QR_TYPE.FIXED,
  qrReferenceId: 'qr-fixed',
  amountInCents: 301,
  totalAmountInCents: 900,
  recipientCount: 3,
  currency: 'EUR',
  concept: 'Menú',
  status: GROUP_TRANSACTION_STATUS.COMPLETED,
  createdAt: 200,
};

describe('buildGroupHistory', () => {
  it('shows the sent total and the received private share without identity lists', () => {
    const history = buildGroupHistory([sent], [received]);

    expect(history.map((item) => ({
      direction: item.direction,
      visible: item.visibleAmountInCents,
      total: item.totalAmountInCents,
      recipients: item.recipientCount,
    }))).toEqual([
      { direction: 'received', visible: 301, total: 900, recipients: 3 },
      { direction: 'sent', visible: 900, total: 900, recipients: 3 },
    ]);
    expect(history[0]).not.toHaveProperty('recipientIds');
    expect(history[0]).not.toHaveProperty('allocations');
  });

  it('uses transactionId as the stable received history id', () => {
    expect(buildGroupHistory([], [received])[0].id).toBe(received.transactionId);
  });
});
