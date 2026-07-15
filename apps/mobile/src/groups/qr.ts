import { QrPayload } from '../domain/types';
import {
  ERICPAY_GROUP_QR_VERSION,
  ERICPAY_QR_APP,
  GROUP_QR_TYPE,
} from './constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
}

export function parsePropiQr(raw: string): QrPayload | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || value.app !== ERICPAY_QR_APP || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'one_time' || value.type === 'reusable') {
    if (value.version !== undefined || !isNonEmptyId(value.id)) return null;
    return { app: ERICPAY_QR_APP, type: value.type, id: value.id };
  }

  if (value.type === 'personal') {
    if (value.version !== undefined || !isNonEmptyId(value.userId)) return null;
    return { app: ERICPAY_QR_APP, type: value.type, userId: value.userId };
  }

  if (value.type === GROUP_QR_TYPE.OPEN) {
    if (value.version !== ERICPAY_GROUP_QR_VERSION || !isNonEmptyId(value.groupId)) return null;
    return {
      app: ERICPAY_QR_APP,
      version: ERICPAY_GROUP_QR_VERSION,
      type: GROUP_QR_TYPE.OPEN,
      groupId: value.groupId,
    };
  }

  if (value.type === GROUP_QR_TYPE.FIXED) {
    if (value.version !== ERICPAY_GROUP_QR_VERSION || !isNonEmptyId(value.qrId)) return null;
    return {
      app: ERICPAY_QR_APP,
      version: ERICPAY_GROUP_QR_VERSION,
      type: GROUP_QR_TYPE.FIXED,
      qrId: value.qrId,
    };
  }

  return null;
}

export function groupOpenQrPayload(groupId: string): Extract<QrPayload, { type: typeof GROUP_QR_TYPE.OPEN }> {
  return {
    app: ERICPAY_QR_APP,
    version: ERICPAY_GROUP_QR_VERSION,
    type: GROUP_QR_TYPE.OPEN,
    groupId,
  };
}

export function groupFixedQrPayload(qrId: string): Extract<QrPayload, { type: typeof GROUP_QR_TYPE.FIXED }> {
  return {
    app: ERICPAY_QR_APP,
    version: ERICPAY_GROUP_QR_VERSION,
    type: GROUP_QR_TYPE.FIXED,
    qrId,
  };
}
