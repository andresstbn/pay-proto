import { describe, expect, it } from 'vitest';
import { createGroupPaymentRequestId } from './request-id';

describe('createGroupPaymentRequestId', () => {
  it('creates a stable transport-safe id from its inputs', () => {
    expect(createGroupPaymentRequestId(() => 1_700_000_000_000, () => 0.25)).toMatch(/^group-pay-[a-z0-9]+-[a-z0-9]{10}$/);
  });
});
