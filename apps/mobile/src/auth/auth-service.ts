import { FirebaseError } from 'firebase/app';
import {
  AuthCredential,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

import { auth, functions } from '../domain/firebase';
import { authErrorCode, authErrorEmail, isAccountConflict, normalizeAuthError } from './errors';
import { clearPendingLink, readPendingLink, savePendingLink } from './pending-link';
import { AppleTokens, AuthResult, GoogleTokens, SocialProvider } from './types';

type CredentialFromError = (error: FirebaseError) => AuthCredential | null;

function isFirebaseError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError;
}

async function discardSignedInSession(): Promise<void> {
  await signOut(auth).catch(() => undefined);
}

async function finishPendingLink(userCredential: UserCredential): Promise<AuthResult> {
  const pending = readPendingLink();
  if (!pending) return { ok: true };

  const signedInEmail = userCredential.user.email?.trim().toLowerCase();
  if (!signedInEmail || signedInEmail !== pending.email) {
    await discardSignedInSession();
    return {
      ok: false,
      code: 'wrong-account',
      message: `Entra con la cuenta ${pending.email} para terminar de vincular el acceso.`,
      retryable: true,
      pendingLink: { email: pending.email, provider: pending.provider },
    };
  }

  try {
    await linkWithCredential(userCredential.user, pending.credential);
    clearPendingLink();
    return { ok: true, linkedProvider: pending.provider };
  } catch {
    // The provider credential may already be expired or invalid. Keeping it
    // would force every later login through the same failing link attempt.
    clearPendingLink();
    await discardSignedInSession();
    return {
      ok: false,
      code: 'link-failed',
      message: 'No se pudo vincular el nuevo acceso. Vuelve a iniciarlo desde el botón del proveedor.',
      retryable: true,
    };
  }
}

export async function performSocialSignIn(
  provider: SocialProvider,
  operation: () => Promise<UserCredential>,
  credentialFromError: CredentialFromError,
): Promise<AuthResult> {
  try {
    const userCredential = await operation();
    const result = await finishPendingLink(userCredential);
    if (result.ok) {
      void syncOwnProfile(result.linkedProvider ?? provider, userCredential.user);
    }
    return result;
  } catch (error: unknown) {
    if (isAccountConflict(error) && isFirebaseError(error)) {
      const credential = credentialFromError(error);
      const email = authErrorEmail(error);
      if (credential && email) {
        const pendingLink = savePendingLink({ credential, email, provider });
        return {
          ok: false,
          code: 'account-conflict',
          message: `Ya tienes una cuenta con ${email}. Entra con ese acceso para vincular ${providerLabel(provider)}.`,
          retryable: true,
          pendingLink,
        };
      }
    }

    return normalizeAuthError(error);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      ok: false,
      code: 'invalid-email',
      message: 'Escribe un correo electrónico válido.',
      retryable: true,
    };
  }
  if (password.length < 6) {
    return {
      ok: false,
      code: 'weak-password',
      message: 'La contraseña debe tener al menos 6 caracteres.',
      retryable: true,
    };
  }

  const pending = readPendingLink();
  if (pending) {
    if (pending.email !== cleanEmail) {
      return {
        ok: false,
        code: 'wrong-account',
        message: `Usa ${pending.email} para terminar de vincular el acceso.`,
        retryable: true,
        pendingLink: { email: pending.email, provider: pending.provider },
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const result = await finishPendingLink(userCredential);
      if (result.ok && result.linkedProvider) {
        void syncOwnProfile(result.linkedProvider, userCredential.user);
      }
      return result;
    } catch (error: unknown) {
      return normalizeAuthError(error);
    }
  }

  try {
    return await finishPendingLink(await signInWithEmailAndPassword(auth, cleanEmail, password));
  } catch (error: unknown) {
    const code = authErrorCode(error);
    if (code !== 'auth/user-not-found' && code !== 'auth/invalid-credential') {
      return normalizeAuthError(error);
    }
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await updateProfile(userCredential.user, { displayName: cleanEmail.split('@')[0] }).catch(() => undefined);
    return { ok: true };
  } catch (error: unknown) {
    return normalizeAuthError(error);
  }
}

export async function signInWithGoogleTokens(tokens: GoogleTokens): Promise<AuthResult> {
  if (!tokens.idToken.trim()) return missingTokenResult('Google');
  const credential = GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken);
  return performSocialSignIn(
    'google',
    () => signInWithCredential(auth, credential),
    GoogleAuthProvider.credentialFromError,
  );
}

export async function signInWithFacebookToken(accessToken: string): Promise<AuthResult> {
  if (!accessToken.trim()) return missingTokenResult('Facebook');
  const credential = FacebookAuthProvider.credential(accessToken);
  return performSocialSignIn(
    'facebook',
    () => signInWithCredential(auth, credential),
    FacebookAuthProvider.credentialFromError,
  );
}

export async function signInWithAppleTokens(tokens: AppleTokens): Promise<AuthResult> {
  if (!tokens.idToken.trim() || !tokens.rawNonce.trim()) return missingTokenResult('Apple');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: tokens.idToken, rawNonce: tokens.rawNonce });
  return performSocialSignIn(
    'apple',
    async () => {
      const userCredential = await signInWithCredential(auth, credential);
      const displayName = tokens.displayName?.trim();
      if (displayName) {
        const startedAt = Date.now();
        await updateProfile(userCredential.user, { displayName }).catch((error: unknown) => {
          logDegradedAuthBoundary('auth_profile_update', 'apple', startedAt, error);
        });
      }
      return userCredential;
    },
    OAuthProvider.credentialFromError,
  );
}

export async function syncOwnProfile(
  provider: SocialProvider,
  user: User | null = auth.currentUser,
): Promise<void> {
  if (!user) return;
  const startedAt = Date.now();
  try {
    await httpsCallable(functions, 'syncOwnProfile')({
      displayName: user.displayName ?? '',
      photoUrl: user.photoURL ?? '',
    });
  } catch (error: unknown) {
    logDegradedAuthBoundary('auth_profile_sync', provider, startedAt, error);
  }
}

function logDegradedAuthBoundary(
  event: 'auth_profile_update' | 'auth_profile_sync',
  provider: SocialProvider,
  startedAt: number,
  error: unknown,
): void {
  const rawCode = authErrorCode(error);
  const errorCode = /^[a-z0-9/_-]{1,80}$/i.test(rawCode) ? rawCode : 'unknown';
  console.warn({
    event,
    status: 'degraded',
    step: event === 'auth_profile_sync' ? 'syncOwnProfile' : 'updateFirebaseProfile',
    provider,
    durationMs: Date.now() - startedAt,
    errorCode,
    fallback: 'login_continues',
  });
}

function missingTokenResult(provider: string): AuthResult {
  return {
    ok: false,
    code: 'missing-token',
    message: `${provider} no devolvió una credencial válida. Inténtalo de nuevo.`,
    retryable: true,
  };
}

export function providerLabel(provider: SocialProvider): string {
  if (provider === 'google') return 'Google';
  if (provider === 'facebook') return 'Facebook';
  return 'Apple';
}
