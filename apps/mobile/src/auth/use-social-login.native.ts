import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import {
  signInWithAppleTokens,
  signInWithFacebookToken,
  signInWithGoogleTokens,
} from './auth-service';
import { normalizeAuthError } from './errors';
import { AuthResult, SocialLoginController, SocialProvider } from './types';

const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'ericpay',
  path: 'oauth/google',
});
const FACEBOOK_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'ericpay',
  path: 'oauth/facebook',
});

export function useSocialLogin(): SocialLoginController {
  const [googleRequest, , promptGoogle] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    shouldAutoExchangeCode: false,
  });
  const [facebookRequest, , promptFacebook] = Facebook.useAuthRequest({
    androidClientId: FACEBOOK_APP_ID,
    iosClientId: FACEBOOK_APP_ID,
    redirectUri: FACEBOOK_REDIRECT_URI,
    scopes: ['public_profile', 'email'],
    usePKCE: false,
  });

  const isConfigured = useCallback((provider: SocialProvider) => {
    if (provider === 'google') return Boolean(currentGoogleClientId());
    if (provider === 'facebook') return Boolean(FACEBOOK_APP_ID);
    return Platform.OS === 'ios';
  }, []);

  const signIn = useCallback(
    async (provider: SocialProvider): Promise<AuthResult> => {
      if (!isConfigured(provider)) return configurationResult(provider);

      if (provider === 'google') {
        if (!googleRequest) return preparingResult('Google');
        try {
          const response = await promptGoogle();
          const earlyResult = authSessionFailure(response);
          if (earlyResult) return earlyResult;

          if (response.type !== 'success') return preparingResult('Google');
          const directIdToken = response.authentication?.idToken ?? response.params.id_token;
          const directAccessToken = response.authentication?.accessToken ?? response.params.access_token;
          if (directIdToken) {
            return signInWithGoogleTokens({
              idToken: directIdToken,
              accessToken: directAccessToken,
            });
          }

          const code = response.params.code;
          if (!code) return missingProviderTokenResult('Google');
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: currentGoogleClientId(),
              code,
              redirectUri: googleRequest.redirectUri,
              extraParams: { code_verifier: googleRequest.codeVerifier ?? '' },
            },
            Google.discovery,
          );
          if (!tokenResponse.idToken) return missingProviderTokenResult('Google');
          return signInWithGoogleTokens({
            idToken: tokenResponse.idToken,
            accessToken: tokenResponse.accessToken,
          });
        } catch (error: unknown) {
          return normalizeAuthError(error);
        }
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

      try {
        if (!(await AppleAuthentication.isAvailableAsync())) {
          return {
            ok: false,
            code: 'provider-disabled',
            message: 'Apple no está disponible en este dispositivo.',
            retryable: false,
          };
        }

        const rawNonce = await secureNonce();
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        const credential = await AppleAuthentication.signInAsync({
          nonce: hashedNonce,
          state: Crypto.randomUUID(),
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        const displayName = credential.fullName
          ? AppleAuthentication.formatFullName(credential.fullName).trim()
          : '';
        return credential.identityToken
          ? signInWithAppleTokens({
              idToken: credential.identityToken,
              rawNonce,
              displayName: displayName || undefined,
            })
          : missingProviderTokenResult('Apple');
      } catch (error: unknown) {
        return normalizeAuthError(error);
      }
    },
    [facebookRequest, googleRequest, isConfigured, promptFacebook, promptGoogle],
  );

  return { signIn, isConfigured };
}

function currentGoogleClientId(): string {
  return Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID;
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

function configurationResult(provider: SocialProvider): AuthResult {
  const label = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Apple';
  const variable = provider === 'google'
    ? Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
      : 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
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

function preparingResult(provider: string): AuthResult {
  return {
    ok: false,
    code: 'unknown',
    message: `${provider} todavía se está preparando. Espera un instante e inténtalo de nuevo.`,
    retryable: true,
  };
}

function missingProviderTokenResult(provider: string): AuthResult {
  return {
    ok: false,
    code: 'missing-token',
    message: `${provider} no devolvió una credencial válida. Inténtalo de nuevo.`,
    retryable: true,
  };
}

async function secureNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
