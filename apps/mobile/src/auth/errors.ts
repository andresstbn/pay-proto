import { AuthErrorCode, AuthResult } from './types';

type CodedError = {
  code?: unknown;
};

export function authErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const code = (error as CodedError).code;
  return typeof code === 'string' ? code : '';
}

export function isAccountConflict(error: unknown): boolean {
  return authErrorCode(error) === 'auth/account-exists-with-different-credential';
}

export function authErrorEmail(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const customData = (error as { customData?: unknown }).customData;
  if (typeof customData !== 'object' || customData === null) return null;
  const email = (customData as { email?: unknown }).email;
  return typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;
}

const ERROR_DETAILS: Record<string, { code: AuthErrorCode; message: string; retryable: boolean }> = {
  'auth/popup-closed-by-user': {
    code: 'cancelled',
    message: 'Inicio de sesión cancelado. Puedes intentarlo de nuevo cuando quieras.',
    retryable: true,
  },
  'auth/cancelled-popup-request': {
    code: 'cancelled',
    message: 'Inicio de sesión cancelado. Puedes intentarlo de nuevo cuando quieras.',
    retryable: true,
  },
  ERR_REQUEST_CANCELED: {
    code: 'cancelled',
    message: 'Inicio de sesión cancelado. Puedes intentarlo de nuevo cuando quieras.',
    retryable: true,
  },
  '1001': {
    code: 'cancelled',
    message: 'Inicio de sesión cancelado. Puedes intentarlo de nuevo cuando quieras.',
    retryable: true,
  },
  'auth/popup-blocked': {
    code: 'popup-blocked',
    message: 'El navegador bloqueó la ventana de acceso. Permite las ventanas emergentes e inténtalo de nuevo.',
    retryable: true,
  },
  'auth/invalid-email': {
    code: 'invalid-email',
    message: 'Escribe un correo electrónico válido.',
    retryable: true,
  },
  'auth/weak-password': {
    code: 'weak-password',
    message: 'La contraseña debe tener al menos 6 caracteres.',
    retryable: true,
  },
  'auth/invalid-credential': {
    code: 'invalid-credential',
    message: 'El correo o la contraseña no son correctos.',
    retryable: true,
  },
  'auth/wrong-password': {
    code: 'invalid-credential',
    message: 'El correo o la contraseña no son correctos.',
    retryable: true,
  },
  'auth/user-not-found': {
    code: 'invalid-credential',
    message: 'El correo o la contraseña no son correctos.',
    retryable: true,
  },
  'auth/email-already-in-use': {
    code: 'invalid-credential',
    message: 'Ya existe una cuenta con este correo. Comprueba la contraseña.',
    retryable: true,
  },
  'auth/too-many-requests': {
    code: 'too-many-requests',
    message: 'Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.',
    retryable: true,
  },
  'auth/network-request-failed': {
    code: 'network',
    message: 'No hay conexión con el servicio de acceso. Revisa tu red e inténtalo de nuevo.',
    retryable: true,
  },
  'auth/operation-not-allowed': {
    code: 'provider-disabled',
    message: 'Este método de acceso todavía no está habilitado.',
    retryable: false,
  },
  'auth/unauthorized-domain': {
    code: 'provider-disabled',
    message: 'Este dominio no está autorizado para iniciar sesión.',
    retryable: false,
  },
};

export function normalizeAuthError(error: unknown): Extract<AuthResult, { ok: false }> {
  const details = ERROR_DETAILS[authErrorCode(error)] ?? {
    code: 'unknown' as const,
    message: 'No hemos podido iniciar sesión. Inténtalo de nuevo.',
    retryable: true,
  };

  return { ok: false, ...details };
}
