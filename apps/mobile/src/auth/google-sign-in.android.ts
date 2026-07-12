import { signInWithGoogleTokens } from './auth-service';
import { normalizeAuthError } from './errors';
import { AuthResult } from './types';

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');
export type GoogleSignInModuleLoader = () => Promise<GoogleSignInModule>;

const loadGoogleSignIn: GoogleSignInModuleLoader = () => import('react-native-nitro-google-signin');

export async function signInWithNativeGoogle(
  webClientId: string,
  loadModule: GoogleSignInModuleLoader = loadGoogleSignIn,
): Promise<AuthResult> {
  if (!webClientId.trim()) return missingConfigurationResult();

  let google: GoogleSignInModule | null = null;
  try {
    google = await loadModule();
    google.GoogleOneTapSignIn.configure({
      webClientId,
      autoSelectOnSignIn: false,
    });

    await google.GoogleOneTapSignIn.checkPlayServices();
    let response = await google.GoogleOneTapSignIn.signIn();
    if (google.isNoSavedCredentialFoundResponse(response)) {
      response = await google.GoogleOneTapSignIn.createAccount();
    }
    if (google.isNoSavedCredentialFoundResponse(response)) {
      response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
    }

    if (google.isCancelledResponse(response)) return cancelledResult();
    if (!google.isSuccessResponse(response) || !response.data.idToken) {
      return missingTokenResult();
    }

    return signInWithGoogleTokens({ idToken: response.data.idToken });
  } catch (error: unknown) {
    if (google?.isErrorWithCode(error)) {
      if (error.code === google.statusCodes.SIGN_IN_CANCELLED) return cancelledResult();
      if (error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          ok: false,
          code: 'provider-disabled',
          message: 'Google Play Services no está disponible o necesita actualizarse.',
          retryable: false,
        };
      }
    }
    return normalizeAuthError(error);
  }
}

function missingConfigurationResult(): Extract<AuthResult, { ok: false }> {
  return {
    ok: false,
    code: 'native-setup-required',
    message: 'Google aún no está configurado en este build (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).',
    retryable: false,
  };
}

function cancelledResult(): Extract<AuthResult, { ok: false }> {
  return normalizeAuthError({ code: 'auth/popup-closed-by-user' });
}

function missingTokenResult(): Extract<AuthResult, { ok: false }> {
  return {
    ok: false,
    code: 'missing-token',
    message: 'Google no devolvió una credencial válida. Inténtalo de nuevo.',
    retryable: true,
  };
}
