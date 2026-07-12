import { useCallback } from 'react';

import { AuthResult, SocialLoginController, SocialProvider } from './types';

// TypeScript fallback. Metro selects the native or web implementation.
export function useSocialLogin(): SocialLoginController {
  const signIn = useCallback(async (provider: SocialProvider): Promise<AuthResult> => ({
    ok: false,
    code: 'native-setup-required',
    message: `${provider} necesita un build compatible. Puedes entrar con email.`,
    retryable: false,
  }), []);
  const isConfigured = useCallback(() => false, []);
  return { signIn, isConfigured };
}
