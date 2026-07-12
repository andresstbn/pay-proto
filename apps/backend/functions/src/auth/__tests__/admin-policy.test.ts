import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasAdminClaim } from '../admin-policy';

describe('admin authorization policy', () => {
  it('accepts only the explicit boolean admin claim', () => {
    assert.equal(hasAdminClaim({ admin: true }), true);
    assert.equal(hasAdminClaim({ admin: false }), false);
    assert.equal(hasAdminClaim({ admin: 'true' }), false);
    assert.equal(hasAdminClaim({}), false);
    assert.equal(hasAdminClaim(null), false);
  });
});
