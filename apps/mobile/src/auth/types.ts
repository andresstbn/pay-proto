export type SocialProvider = 'google' | 'facebook' | 'apple';

export type AuthErrorCode =
  | 'cancelled'
  | 'popup-blocked'
  | 'account-conflict'
  | 'wrong-account'
  | 'invalid-email'
  | 'weak-password'
  | 'invalid-credential'
  | 'too-many-requests'
  | 'network'
  | 'provider-disabled'
  | 'native-setup-required'
  | 'missing-token'
  | 'link-failed'
  | 'unknown';

export interface PendingLinkSummary {
  email: string;
  provider: SocialProvider;
}

export type AuthResult =
  | {
      ok: true;
      linkedProvider?: SocialProvider;
    }
  | {
      ok: false;
      code: AuthErrorCode;
      message: string;
      retryable: boolean;
      pendingLink?: PendingLinkSummary;
    };

export interface GoogleTokens {
  idToken: string;
  accessToken?: string;
}

export interface AppleTokens {
  idToken: string;
  rawNonce: string;
  displayName?: string;
}

export interface SocialLoginController {
  signIn: (provider: SocialProvider) => Promise<AuthResult>;
  isConfigured: (provider: SocialProvider) => boolean;
}
