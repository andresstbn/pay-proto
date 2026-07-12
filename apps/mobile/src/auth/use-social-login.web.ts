import { useCallback } from 'react';

import { signInWithSocialProvider } from './social-login.web';
import { SocialLoginController, SocialProvider } from './types';

export function useSocialLogin(): SocialLoginController {
  const signIn = useCallback(
    (provider: SocialProvider) => signInWithSocialProvider(provider),
    [],
  );
  const isConfigured = useCallback(() => true, []);
  return { signIn, isConfigured };
}
