import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signInWithGoogleTokens: vi.fn().mockResolvedValue({ ok: true }),
}));
const nativeSdkMocks = vi.hoisted(() => ({
  GoogleOneTapSignIn: {
    configure: vi.fn(),
    checkPlayServices: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn().mockResolvedValue({
      type: 'success',
      data: { idToken: 'dummy-default-loader-token' },
    }),
    createAccount: vi.fn(),
    presentExplicitSignIn: vi.fn(),
  },
  isNoSavedCredentialFoundResponse: (response: Response) => response.type === 'no-saved',
  isCancelledResponse: (response: Response) => response.type === 'cancelled',
  isSuccessResponse: (response: Response) => response.type === 'success',
  isErrorWithCode: (error: unknown): error is { code: string } => (
    typeof error === 'object' && error !== null && 'code' in error
  ),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

vi.mock('./auth-service', () => authMocks);
vi.mock('react-native-nitro-google-signin', () => nativeSdkMocks);

import { GoogleSignInModuleLoader, signInWithNativeGoogle } from './google-sign-in.android';

type Response = { type: 'success'; data: { idToken: string | null } }
  | { type: 'no-saved' }
  | { type: 'cancelled' };

function googleModule(responses: Response[], playServicesError?: unknown) {
  const queue = [...responses];
  const nextResponse = async () => queue.shift() ?? { type: 'cancelled' as const };
  const module = {
    GoogleOneTapSignIn: {
      configure: vi.fn(),
      checkPlayServices: playServicesError
        ? vi.fn().mockRejectedValue(playServicesError)
        : vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn(nextResponse),
      createAccount: vi.fn(nextResponse),
      presentExplicitSignIn: vi.fn(nextResponse),
    },
    isNoSavedCredentialFoundResponse: (response: Response) => response.type === 'no-saved',
    isCancelledResponse: (response: Response) => response.type === 'cancelled',
    isSuccessResponse: (response: Response) => response.type === 'success',
    isErrorWithCode: (error: unknown): error is { code: string } => (
      typeof error === 'object' && error !== null && 'code' in error
    ),
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
  };
  return {
    load: vi.fn(async () => module) as unknown as GoogleSignInModuleLoader,
    module,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Android native Google sign-in', () => {
  it('rechaza una configuración sin Web client ID antes de cargar el SDK nativo', async () => {
    const { load } = googleModule([]);

    await expect(signInWithNativeGoogle('  ', load)).resolves.toMatchObject({
      ok: false,
      code: 'native-setup-required',
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('convierte el ID token nativo en una sesión Firebase', async () => {
    const { load, module } = googleModule([
      { type: 'success', data: { idToken: 'dummy-google-id-token' } },
    ]);

    await expect(signInWithNativeGoogle('dummy-web-client-id', load)).resolves.toEqual({ ok: true });
    expect(module.GoogleOneTapSignIn.configure).toHaveBeenCalledWith({
      webClientId: 'dummy-web-client-id',
      autoSelectOnSignIn: false,
    });
    expect(authMocks.signInWithGoogleTokens).toHaveBeenCalledWith({
      idToken: 'dummy-google-id-token',
    });
  });

  it('carga el SDK nativo real a través del import diferido', async () => {
    await expect(signInWithNativeGoogle('dummy-web-client-id')).resolves.toEqual({ ok: true });
    expect(nativeSdkMocks.GoogleOneTapSignIn.checkPlayServices).toHaveBeenCalledOnce();
    expect(authMocks.signInWithGoogleTokens).toHaveBeenCalledWith({
      idToken: 'dummy-default-loader-token',
    });
  });

  it('recorre los fallbacks de Credential Manager antes del acceso explícito', async () => {
    const { load, module } = googleModule([
      { type: 'no-saved' },
      { type: 'no-saved' },
      { type: 'success', data: { idToken: 'dummy-explicit-token' } },
    ]);

    await expect(signInWithNativeGoogle('dummy-web-client-id', load)).resolves.toEqual({ ok: true });
    expect(module.GoogleOneTapSignIn.signIn).toHaveBeenCalledOnce();
    expect(module.GoogleOneTapSignIn.createAccount).toHaveBeenCalledOnce();
    expect(module.GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalledOnce();
  });

  it('normaliza la cancelación sin autenticar en Firebase', async () => {
    const { load } = googleModule([{ type: 'cancelled' }]);

    await expect(signInWithNativeGoogle('dummy-web-client-id', load)).resolves.toMatchObject({
      ok: false,
      code: 'cancelled',
    });
    expect(authMocks.signInWithGoogleTokens).not.toHaveBeenCalled();
  });

  it('rechaza respuestas parciales y Play Services no disponible', async () => {
    const partial = googleModule([{ type: 'success', data: { idToken: null } }]);
    await expect(signInWithNativeGoogle('dummy-web-client-id', partial.load)).resolves.toMatchObject({
      ok: false,
      code: 'missing-token',
    });

    const unavailableError = { code: 'PLAY_SERVICES_NOT_AVAILABLE' };
    const unavailable = googleModule([], unavailableError);
    await expect(signInWithNativeGoogle('dummy-web-client-id', unavailable.load)).resolves.toMatchObject({
      ok: false,
      code: 'provider-disabled',
      retryable: false,
    });
  });

  it('normaliza cancelaciones lanzadas por el SDK', async () => {
    const cancellation = googleModule([], { code: 'SIGN_IN_CANCELLED' });

    await expect(signInWithNativeGoogle('dummy-web-client-id', cancellation.load)).resolves.toMatchObject({
      ok: false,
      code: 'cancelled',
    });
  });

  it('rechaza el fallback final sin credencial y normaliza errores desconocidos', async () => {
    const exhausted = googleModule([
      { type: 'no-saved' },
      { type: 'no-saved' },
      { type: 'no-saved' },
    ]);
    await expect(signInWithNativeGoogle('dummy-web-client-id', exhausted.load)).resolves.toMatchObject({
      ok: false,
      code: 'missing-token',
    });

    const unknown = googleModule([], new Error('native boundary failed'));
    await expect(signInWithNativeGoogle('dummy-web-client-id', unknown.load)).resolves.toMatchObject({
      ok: false,
      code: 'unknown',
    });
  });
});
