import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { useCallback } from 'react';

import { signInWithFacebookToken } from './auth-service';
import { normalizeAuthError } from './errors';
import { signInWithNativeGoogle } from './google-sign-in.android';
import { AuthResult, SocialLoginController, SocialProvider } from './types';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const FACEBOOK_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'ericpay',
  path: 'oauth/facebook',
});

export function useSocialLogin(): SocialLoginController {
  const [facebookRequest, , promptFacebook] = Facebook.useAuthRequest({
    androidClientId: FACEBOOK_APP_ID,
    iosClientId: FACEBOOK_APP_ID,
    redirectUri: FACEBOOK_REDIRECT_URI,
    scopes: ['public_profile', 'email'],
    usePKCE: false,
  });

  const isConfigured = useCallback((provider: SocialProvider) => {
    if (provider === 'google') {
      return Boolean(GOOGLE_WEB_CLIENT_ID)
        && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
    }
    if (provider === 'facebook') return Boolean(FACEBOOK_APP_ID);
    return false;
  }, []);

  const signIn = useCallback(
    async (provider: SocialProvider): Promise<AuthResult> => {
      if (!isConfigured(provider)) return configurationResult(provider);

      if (provider === 'google') {
        return signInWithNativeGoogle(GOOGLE_WEB_CLIENT_ID);
      }

      if (provider === 'facebook') {
        if (!facebookRequest) return preparingResult('Facebook');
        try {
          const response = await promptFacebook();
          const earlyResult = authSessionFailure(response);
          if (earlyResult) return earlyResult;
          if (response.type !== 'success') return preparingResult('Facebook');

          const accessToken = response.authentication?.accessToken ?? response.params.access_token;
          return accessToken
            ? signInWithFacebookToken(accessToken)
            : missingProviderTokenResult('Facebook');
        } catch (error: unknown) {
          return normalizeAuthError(error);
        }
      }

      return configurationResult('apple');
    },
    [facebookRequest, isConfigured, promptFacebook],
  );

  return { signIn, isConfigured };
}

function authSessionFailure(response: AuthSession.AuthSessionResult): AuthResult | null {
  if (response.type === 'cancel' || response.type === 'dismiss') {
    return normalizeAuthError({ code: 'auth/popup-closed-by-user' });
  }
  if (response.type === 'error') {
    return {
      ok: false,
      code: 'unknown',
      message: 'El proveedor no pudo completar el acceso. Inténtalo de nuevo.',
      retryable: true,
    };
  }
  return null;
}

function configurationResult(provider: SocialProvider): Extract<AuthResult, { ok: false }> {
  if (provider === 'google' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return {
      ok: false,
      code: 'native-setup-required',
      message: 'Google requiere el development build de EricPay; Expo Go no incluye este acceso.',
      retryable: false,
    };
  }

  const label = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Apple';
  const variable = provider === 'google'
    ? 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'
    : provider === 'facebook'
      ? 'EXPO_PUBLIC_FACEBOOK_APP_ID'
      : null;
  return {
    ok: false,
    code: 'native-setup-required',
    message: variable
      ? `${label} aún no está configurado en este build (${variable}). Puedes entrar con email.`
      : `${label} solo está disponible en iPhone y iPad.`,
    retryable: false,
  };
}

function preparingResult(provider: string): Extract<AuthResult, { ok: false }> {
  return {
    ok: false,
    code: 'unknown',
    message: `${provider} todavía se está preparando. Espera un instante e inténtalo de nuevo.`,
    retryable: true,
  };
}

function missingProviderTokenResult(provider: string): Extract<AuthResult, { ok: false }> {
  return {
    ok: false,
    code: 'missing-token',
    message: `${provider} no devolvió una credencial válida. Inténtalo de nuevo.`,
    retryable: true,
  };
}
