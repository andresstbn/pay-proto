import { describe, expect, it } from 'vitest';
import { Transaction } from '../domain/types';
import { incomingCompletedTransactions } from './incoming-transfer-policy';

const incoming: Transaction = {
  id: 'incoming-1',
  qrType: 'personal',
  qrReferenceId: 'recipient-1',
  payerId: 'payer-1',
  recipientId: 'recipient-1',
  amountInCents: 500,
  currency: 'EUR',
  concept: 'Cena',
  status: 'completed',
  createdAt: 1,
};

describe('incomingCompletedTransactions', () => {
  it('devuelve únicamente ingresos nuevos del usuario', () => {
    const sent = { ...incoming, id: 'sent-1', payerId: 'recipient-1', recipientId: 'payer-1' };
    const alreadyKnown = { ...incoming, id: 'known-1' };
    const result = incomingCompletedTransactions(
      [incoming, sent, alreadyKnown],
      'recipient-1',
      new Set(['known-1']),
    );
    expect(result).toEqual([incoming]);
  });

  it('no vuelve a notificar una transferencia conocida', () => {
    expect(incomingCompletedTransactions([incoming], 'recipient-1', new Set(['incoming-1']))).toEqual([]);
  });
});
