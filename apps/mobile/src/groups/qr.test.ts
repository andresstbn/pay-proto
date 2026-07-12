import { describe, expect, it } from 'vitest';
import { groupFixedQrPayload, groupOpenQrPayload, parseEricPayQr } from './qr';

describe('parseEricPayQr', () => {
  it('accepts every legacy payload without adding a protocol version', () => {
    expect(parseEricPayQr('{"app":"ericpay","type":"one_time","id":"request-1"}')).toEqual({
      app: 'ericpay',
      type: 'one_time',
      id: 'request-1',
    });
    expect(parseEricPayQr('{"app":"ericpay","type":"personal","userId":"user-1"}')).toEqual({
      app: 'ericpay',
      type: 'personal',
      userId: 'user-1',
    });
    expect(parseEricPayQr('{"app":"ericpay","type":"reusable","id":"qr-1"}')).toEqual({
      app: 'ericpay',
      type: 'reusable',
      id: 'qr-1',
    });
  });

  it('accepts versioned open and fixed group payloads', () => {
    expect(parseEricPayQr(JSON.stringify(groupOpenQrPayload('group-1')))).toEqual(groupOpenQrPayload('group-1'));
    expect(parseEricPayQr(JSON.stringify(groupFixedQrPayload('qr-1')))).toEqual(groupFixedQrPayload('qr-1'));
  });

  it.each([
    '',
    'not-json',
    '[]',
    '{"app":"other","type":"personal","userId":"user-1"}',
    '{"app":"ericpay","type":"unknown","id":"value"}',
    '{"app":"ericpay","type":"personal","userId":""}',
    '{"app":"ericpay","version":1,"type":"personal","userId":"user-1"}',
    '{"app":"ericpay","type":"group_open","groupId":"group-1"}',
    '{"app":"ericpay","version":2,"type":"group_fixed","qrId":"qr-1"}',
  ])('rejects an invalid or foreign payload: %s', (raw) => {
    expect(parseEricPayQr(raw)).toBeNull();
  });
});
