import { describe, expect, it } from 'vitest';
import { GROUP_QR_TYPE } from './constants';
import { groupReceiptFromData, groupSentTransactionFromData } from './document-mappers';

describe('private group document mappers', () => {
  it('maps a sent transaction using only aggregate recipient data', () => {
    const transaction = groupSentTransactionFromData('transaction-1', {
      qrType: GROUP_QR_TYPE.OPEN,
      qrReferenceId: 'qr-1',
      groupId: 'group-1',
      groupName: 'Equipo terraza',
      payerId: 'payer',
      amountInCents: 900,
      recipientCount: 3,
      concept: 'Mesa 3',
      createdAt: 100,
      recipientIds: ['private-user'],
      allocations: [{ userId: 'private-user', amountInCents: 300 }],
    });

    expect(transaction).toMatchObject({
      groupName: 'Equipo terraza',
      amountInCents: 900,
      recipientCount: 3,
    });
    expect(transaction).not.toHaveProperty('recipientIds');
    expect(transaction).not.toHaveProperty('allocations');
  });

  it('maps a receipt with the visible share and aggregate total', () => {
    const receipt = groupReceiptFromData('receipt-1', {
      transactionId: 'transaction-1',
      recipientId: 'recipient',
      payerId: 'payer',
      groupId: 'group-1',
      groupName: 'Equipo terraza',
      qrType: GROUP_QR_TYPE.FIXED,
      qrReferenceId: 'qr-1',
      amountInCents: 301,
      totalAmountInCents: 900,
      recipientCount: 3,
      concept: 'Menú',
      createdAt: 200,
    });

    expect(receipt).toMatchObject({
      payerId: 'payer',
      groupName: 'Equipo terraza',
      amountInCents: 301,
      totalAmountInCents: 900,
      recipientCount: 3,
    });
  });

  it('rejects documents outside the group QR protocol', () => {
    expect(groupSentTransactionFromData('legacy', { qrType: 'personal' })).toBeNull();
    expect(groupReceiptFromData('legacy', { qrType: 'personal' })).toBeNull();
  });

  it('uses privacy-safe defaults for incomplete trusted documents', () => {
    const sent = groupSentTransactionFromData('sent-defaults', {
      qrType: GROUP_QR_TYPE.OPEN,
      createdAt: { toMillis: () => 321 },
    });
    const receipt = groupReceiptFromData('receipt-defaults', {
      qrType: GROUP_QR_TYPE.FIXED,
    });

    expect(sent).toMatchObject({
      groupId: '',
      groupName: 'Grupo',
      payerId: '',
      amountInCents: 0,
      recipientCount: 0,
      createdAt: 321,
    });
    expect(receipt).toMatchObject({
      transactionId: '',
      recipientId: '',
      payerId: '',
      groupId: '',
      groupName: 'Grupo',
      amountInCents: 0,
      totalAmountInCents: 0,
      recipientCount: 0,
      createdAt: 0,
    });
  });
});
