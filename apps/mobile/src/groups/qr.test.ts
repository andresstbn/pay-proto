import { describe, expect, it } from 'vitest';
import { groupFixedQrPayload, groupOpenQrPayload, parsePropiQr } from './qr';

describe('parsePropiQr', () => {
  it('accepts every legacy payload without adding a protocol version', () => {
    expect(parsePropiQr('{"app":"ericpay","type":"one_time","id":"request-1"}')).toEqual({
      app: 'ericpay',
      type: 'one_time',
      id: 'request-1',
    });
    expect(parsePropiQr('{"app":"ericpay","type":"personal","userId":"user-1"}')).toEqual({
      app: 'ericpay',
      type: 'personal',
      userId: 'user-1',
    });
    expect(parsePropiQr('{"app":"ericpay","type":"reusable","id":"qr-1"}')).toEqual({
      app: 'ericpay',
      type: 'reusable',
      id: 'qr-1',
    });
  });

  it('accepts versioned open and fixed group payloads', () => {
    expect(parsePropiQr(JSON.stringify(groupOpenQrPayload('group-1')))).toEqual(groupOpenQrPayload('group-1'));
    expect(parsePropiQr(JSON.stringify(groupFixedQrPayload('qr-1')))).toEqual(groupFixedQrPayload('qr-1'));
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
    expect(parsePropiQr(raw)).toBeNull();
  });
});
