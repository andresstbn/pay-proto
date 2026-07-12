import { describe, expect, it } from 'vitest';

import { authErrorCode, authErrorEmail, normalizeAuthError } from './errors';

describe('normalizeAuthError', () => {
  it('normaliza una cancelación sin exponer el mensaje interno', () => {
    const result = normalizeAuthError({
      code: 'auth/popup-closed-by-user',
      message: 'sensitive provider details',
    });

    expect(result.code).toBe('cancelled');
    expect(result.retryable).toBe(true);
    expect(result.message).not.toContain('sensitive');
  });

  it('ofrece recuperación cuando el popup está bloqueado', () => {
    expect(normalizeAuthError({ code: 'auth/popup-blocked' })).toMatchObject({
      code: 'popup-blocked',
      retryable: true,
    });
  });

  it('usa un error seguro para códigos desconocidos', () => {
    expect(normalizeAuthError({ code: 'auth/internal-error', message: 'raw backend error' })).toEqual({
      ok: false,
      code: 'unknown',
      message: 'No hemos podido iniciar sesión. Inténtalo de nuevo.',
      retryable: true,
    });
  });
});

describe('authErrorEmail', () => {
  it('normaliza el correo del conflicto de cuenta', () => {
    expect(authErrorEmail({ customData: { email: ' Persona@Example.com ' } })).toBe('persona@example.com');
  });

  it('ignora datos incompletos', () => {
    expect(authErrorEmail({ customData: { email: 'not-an-email' } })).toBeNull();
    expect(authErrorEmail(null)).toBeNull();
    expect(authErrorEmail({})).toBeNull();
    expect(authErrorEmail({ customData: null })).toBeNull();
  });
});

describe('authErrorCode', () => {
  it('solo acepta códigos de texto', () => {
    expect(authErrorCode(null)).toBe('');
    expect(authErrorCode({ code: 42 })).toBe('');
    expect(authErrorCode({ code: 'auth/network-request-failed' })).toBe('auth/network-request-failed');
  });
});
