export const ADMIN_CLAIM = 'admin';

export function hasAdminClaim(token: unknown): boolean {
  return Boolean(
    token
    && typeof token === 'object'
    && (token as Record<string, unknown>)[ADMIN_CLAIM] === true,
  );
}
