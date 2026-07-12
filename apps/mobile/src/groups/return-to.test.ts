import { describe, expect, it } from 'vitest';
import { groupJoinReturnTo, normalizeGroupInviteCode, safeGroupJoinReturnTarget } from './return-to';

const CODE = '2345-6789-ABCD-EFGH-JKMN-PQRS';
const NORMALIZED_CODE = '23456789ABCDEFGHJKMNPQRS';

describe('group join returnTo', () => {
  it('normalizes share-friendly invitation codes', () => {
    expect(normalizeGroupInviteCode(CODE.toLowerCase())).toBe(NORMALIZED_CODE);
    expect(groupJoinReturnTo(CODE)).toBe(`/groups/join?code=${NORMALIZED_CODE}`);
  });

  it('parses only the internal group join route', () => {
    expect(safeGroupJoinReturnTarget(`/groups/join?code=${NORMALIZED_CODE}`)).toEqual({
      href: `/groups/join?code=${NORMALIZED_CODE}`,
      pathname: '/groups/join',
      code: NORMALIZED_CODE,
    });
  });

  it.each([
    'https://evil.example/groups/join?code=23456789ABCDEFGHJKMNPQRS',
    '//evil.example/groups/join?code=23456789ABCDEFGHJKMNPQRS',
    '/home',
    '/groups/join?code=short',
    '/groups/join?code=23456789ABCDEFGHJKMNPQRS&next=https://evil.example',
    '/groups/join?code=%E0%A4%A',
  ])('rejects unsafe or unsupported return targets: %s', (value) => {
    expect(safeGroupJoinReturnTarget(value)).toBeNull();
  });

  it('rejects non-string and oversized targets', () => {
    expect(safeGroupJoinReturnTarget(undefined)).toBeNull();
    expect(safeGroupJoinReturnTarget(`/groups/join?code=${'A'.repeat(200)}`)).toBeNull();
  });
});
