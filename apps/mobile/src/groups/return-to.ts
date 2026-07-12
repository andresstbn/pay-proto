const JOIN_PATH = '/groups/join';
const JOIN_PREFIX = `${JOIN_PATH}?code=`;
const INVITE_ALPHABET = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{24}$/;
const ENCODED_INVITE_ALPHABET = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ-]+$/;

export interface GroupJoinReturnTarget {
  href: string;
  pathname: '/groups/join';
  code: string;
}

export function normalizeGroupInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, '').slice(0, 24);
}

export function groupJoinReturnTo(code: string): string | null {
  const normalized = normalizeGroupInviteCode(code);
  return INVITE_ALPHABET.test(normalized) ? `${JOIN_PREFIX}${normalized}` : null;
}

export function safeGroupJoinReturnTarget(value: unknown): GroupJoinReturnTarget | null {
  if (typeof value !== 'string' || value.length > 160 || !value.startsWith(JOIN_PREFIX)) return null;
  let decodedCode: string;
  try {
    decodedCode = decodeURIComponent(value.slice(JOIN_PREFIX.length));
  } catch {
    return null;
  }
  if (!ENCODED_INVITE_ALPHABET.test(decodedCode.toUpperCase())) return null;
  const href = groupJoinReturnTo(decodedCode);
  if (!href) return null;
  return { href, pathname: JOIN_PATH, code: normalizeGroupInviteCode(decodedCode) };
}
