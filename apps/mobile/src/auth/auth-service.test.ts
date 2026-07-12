import { FirebaseError } from 'firebase/app';
import type { AuthCredential, User, UserCredential } from 'firebase/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  linkWithCredential: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));
const functionsMocks = vi.hoisted(() => ({
  callable: vi.fn().mockResolvedValue({ data: { ok: true } }),
}));

vi.mock('../domain/firebase', () => ({ auth: {}, functions: {} }));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  ...authMocks,
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: () => functionsMocks.callable,
}));

import {
  performSocialSignIn,
  providerLabel,
  signInWithAppleTokens,
  signInWithEmail,
  signInWithFacebookToken,
  signInWithGoogleTokens,
  syncOwnProfile,
} from './auth-service';
import { clearPendingLink, pendingLinkSummary } from './pending-link';

const pendingCredential = {
  providerId: 'google.com',
  signInMethod: 'google.com',
  toJSON: () => ({}),
} as AuthCredential;

function userCredential(email: string): UserCredential {
  return { user: { email } } as unknown as UserCredential;
}

async function createPendingGoogleLink(email = 'persona@example.com') {
  const error = new FirebaseError(
    'auth/account-exists-with-different-credential',
    'provider details must not reach the UI',
    { email },
  );
  return performSocialSignIn(
    'google',
    () => Promise.reject(error),
    () => pendingCredential,
  );
}

afterEach(() => {
  clearPendingLink();
  vi.clearAllMocks();
});

describe('provider account linking', () => {
  it('completa un acceso social sin conflicto y sincroniza el perfil', async () => {
    const credential = userCredential('social@example.com');

    await expect(performSocialSignIn(
      'google',
      () => Promise.resolve(credential),
      () => null,
    )).resolves.toEqual({ ok: true });

    await vi.waitFor(() => expect(functionsMocks.callable).toHaveBeenCalled());
  });

  it('conserva el proveedor pendiente y lo vincula tras validar el mismo email', async () => {
    const conflict = await createPendingGoogleLink();
    expect(conflict).toMatchObject({
      ok: false,
      code: 'account-conflict',
      pendingLink: { email: 'persona@example.com', provider: 'google' },
    });

    authMocks.signInWithEmailAndPassword.mockResolvedValue(userCredential('persona@example.com'));
    authMocks.linkWithCredential.mockResolvedValue(userCredential('persona@example.com'));

    await expect(signInWithEmail('Persona@example.com', 'correcta')).resolves.toEqual({
      ok: true,
      linkedProvider: 'google',
    });
    expect(authMocks.linkWithCredential).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'persona@example.com' }),
      pendingCredential,
    );
  });

  it('no autentica ni vincula una cuenta con otro email', async () => {
    await createPendingGoogleLink();

    const result = await signInWithEmail('otra@example.com', 'correcta');

    expect(result).toMatchObject({ ok: false, code: 'wrong-account' });
    expect(authMocks.signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(authMocks.linkWithCredential).not.toHaveBeenCalled();
  });

  it('cierra la sesión y descarta la credencial si la vinculación falla', async () => {
    await createPendingGoogleLink();
    authMocks.signInWithEmailAndPassword.mockResolvedValue(userCredential('persona@example.com'));
    authMocks.linkWithCredential.mockRejectedValue(new Error('provider failure'));
    authMocks.signOut.mockResolvedValue(undefined);

    const result = await signInWithEmail('persona@example.com', 'correcta');

    expect(result).toMatchObject({ ok: false, code: 'link-failed' });
    expect(authMocks.signOut).toHaveBeenCalledOnce();
    expect(pendingLinkSummary()).toBeNull();
  });

  it('cierra una sesión social que no corresponde al email pendiente', async () => {
    await createPendingGoogleLink();
    authMocks.signOut.mockResolvedValue(undefined);

    const result = await performSocialSignIn(
      'facebook',
      () => Promise.resolve(userCredential('otra@example.com')),
      () => null,
    );

    expect(result).toMatchObject({ ok: false, code: 'wrong-account' });
    expect(authMocks.signOut).toHaveBeenCalledOnce();
  });

  it('normaliza un conflicto que no incluye credencial vinculable', async () => {
    const error = new FirebaseError(
      'auth/account-exists-with-different-credential',
      'conflict without safe recovery',
    );

    await expect(performSocialSignIn(
      'facebook',
      () => Promise.reject(error),
      () => null,
    )).resolves.toMatchObject({ ok: false, code: 'unknown' });
  });
});

describe('email fallback', () => {
  it('valida email y contraseña antes de llamar a Firebase', async () => {
    await expect(signInWithEmail('correo-invalido', '123456')).resolves.toMatchObject({
      ok: false,
      code: 'invalid-email',
    });
    await expect(signInWithEmail('persona@example.com', '123')).resolves.toMatchObject({
      ok: false,
      code: 'weak-password',
    });
    expect(authMocks.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('crea la cuenta cuando Firebase confirma que no existe', async () => {
    authMocks.signInWithEmailAndPassword.mockRejectedValue(
      new FirebaseError('auth/user-not-found', 'not found'),
    );
    authMocks.createUserWithEmailAndPassword.mockResolvedValue(userCredential('nueva@example.com'));
    authMocks.updateProfile.mockResolvedValue(undefined);

    await expect(signInWithEmail('Nueva@example.com', 'correcta')).resolves.toEqual({ ok: true });
    expect(authMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'nueva@example.com',
      'correcta',
    );
  });

  it('entra en una cuenta existente sin intentar registrarla', async () => {
    authMocks.signInWithEmailAndPassword.mockResolvedValue(userCredential('existente@example.com'));

    await expect(signInWithEmail('existente@example.com', 'correcta')).resolves.toEqual({ ok: true });
    expect(authMocks.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('propaga de forma segura errores terminales de login y registro', async () => {
    authMocks.signInWithEmailAndPassword.mockRejectedValueOnce(
      new FirebaseError('auth/too-many-requests', 'raw throttling details'),
    );
    await expect(signInWithEmail('persona@example.com', 'correcta')).resolves.toMatchObject({
      ok: false,
      code: 'too-many-requests',
    });

    authMocks.signInWithEmailAndPassword.mockRejectedValueOnce(
      new FirebaseError('auth/invalid-credential', 'missing account'),
    );
    authMocks.createUserWithEmailAndPassword.mockRejectedValueOnce(
      new FirebaseError('auth/email-already-in-use', 'raw account detail'),
    );
    await expect(signInWithEmail('persona@example.com', 'correcta')).resolves.toMatchObject({
      ok: false,
      code: 'invalid-credential',
    });
  });
});

describe('provider credentials', () => {
  it('rechaza respuestas sin token', async () => {
    await expect(signInWithGoogleTokens({ idToken: '' })).resolves.toMatchObject({
      ok: false,
      code: 'missing-token',
    });
    await expect(signInWithFacebookToken('')).resolves.toMatchObject({
      ok: false,
      code: 'missing-token',
    });
    await expect(signInWithAppleTokens({ idToken: 'dummy', rawNonce: '' })).resolves.toMatchObject({
      ok: false,
      code: 'missing-token',
    });
  });

  it('convierte tokens de Google y Facebook en sesiones Firebase', async () => {
    authMocks.signInWithCredential.mockResolvedValue(userCredential('social@example.com'));

    await expect(signInWithGoogleTokens({
      idToken: 'dummy-google-id-token',
      accessToken: 'dummy-google-access-token',
    })).resolves.toEqual({ ok: true });
    await expect(signInWithFacebookToken('dummy-facebook-access-token')).resolves.toEqual({ ok: true });
    expect(authMocks.signInWithCredential).toHaveBeenCalledTimes(2);
  });

  it('actualiza el nombre de Apple sin bloquear el acceso si el perfil falla', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    authMocks.signInWithCredential.mockResolvedValue(userCredential('apple@example.com'));
    authMocks.updateProfile.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    await expect(signInWithAppleTokens({
      idToken: 'dummy-apple-id-token',
      rawNonce: 'dummy-apple-nonce',
      displayName: 'Persona Apple',
    })).resolves.toEqual({ ok: true });
    expect(warning).toHaveBeenCalledWith(expect.objectContaining({
      event: 'auth_profile_update',
      status: 'degraded',
    }));
    warning.mockRestore();
  });

  it('mantiene una etiqueta estable para cada proveedor', () => {
    expect(providerLabel('google')).toBe('Google');
    expect(providerLabel('facebook')).toBe('Facebook');
    expect(providerLabel('apple')).toBe('Apple');
  });
});

describe('profile synchronization', () => {
  it('no hace nada si todavía no existe un usuario autenticado', async () => {
    await expect(syncOwnProfile('google', null)).resolves.toBeUndefined();
    expect(functionsMocks.callable).not.toHaveBeenCalled();
  });

  it('sincroniza correctamente un perfil disponible', async () => {
    functionsMocks.callable.mockResolvedValueOnce({ data: { ok: true } });
    const user = { displayName: null, photoURL: null } as User;

    await expect(syncOwnProfile('facebook', user)).resolves.toBeUndefined();
    expect(functionsMocks.callable).toHaveBeenCalledWith({ displayName: '', photoUrl: '' });
  });

  it('envía el perfil propio sin bloquear el login si el callable falla', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    functionsMocks.callable.mockRejectedValueOnce({ code: 'functions/unavailable' });
    const user = {
      displayName: 'Nombre visible',
      photoURL: 'https://example.com/avatar.png',
    } as User;

    await expect(syncOwnProfile('google', user)).resolves.toBeUndefined();

    expect(functionsMocks.callable).toHaveBeenCalledWith({
      displayName: 'Nombre visible',
      photoUrl: 'https://example.com/avatar.png',
    });
    expect(warning).toHaveBeenCalledWith(expect.objectContaining({
      event: 'auth_profile_sync',
      status: 'degraded',
      provider: 'google',
      errorCode: 'functions/unavailable',
      fallback: 'login_continues',
    }));
    expect(JSON.stringify(warning.mock.calls)).not.toContain('Nombre visible');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('avatar.png');
    warning.mockRestore();
  });
});
