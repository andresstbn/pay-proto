import type { UserCredential } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signInWithCredential: vi.fn(),
}));
const functionsMocks = vi.hoisted(() => ({
  callable: vi.fn().mockResolvedValue({ data: { ok: true } }),
}));

vi.mock('../domain/firebase', () => ({ auth: {}, functions: {} }));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  signInWithCredential: authMocks.signInWithCredential,
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: () => functionsMocks.callable,
}));

import { GoogleSignInModuleLoader, signInWithNativeGoogle } from './google-sign-in.android';

const loadSuccessfulGoogleSdk = (async () => ({
  GoogleOneTapSignIn: {
    configure: vi.fn(),
    checkPlayServices: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn().mockResolvedValue({
      type: 'success',
      data: { idToken: 'dummy-integrated-google-id-token' },
    }),
    createAccount: vi.fn(),
    presentExplicitSignIn: vi.fn(),
  },
  isNoSavedCredentialFoundResponse: () => false,
  isCancelledResponse: () => false,
  isSuccessResponse: () => true,
  isErrorWithCode: () => false,
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
})) as unknown as GoogleSignInModuleLoader;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Google Android → Firebase integration', () => {
  it('convierte la respuesta nativa en una sesión Firebase y sincroniza el perfil', async () => {
    authMocks.signInWithCredential.mockResolvedValue({
      user: { email: 'persona@example.com' },
    } as unknown as UserCredential);

    await expect(signInWithNativeGoogle(
      'dummy-web-client-id',
      loadSuccessfulGoogleSdk,
    )).resolves.toEqual({ ok: true });

    expect(authMocks.signInWithCredential).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(functionsMocks.callable).toHaveBeenCalledOnce());
  });
});
