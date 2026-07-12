import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

import { auth } from '../domain/firebase';
import { performSocialSignIn } from './auth-service';
import { AuthResult, SocialProvider } from './types';

export async function signInWithSocialProvider(provider: SocialProvider): Promise<AuthResult> {
  if (provider === 'google') {
    const google = new GoogleAuthProvider();
    google.setCustomParameters({ prompt: 'select_account' });
    return performSocialSignIn(
      provider,
      () => signInWithPopup(auth, google),
      GoogleAuthProvider.credentialFromError,
    );
  }

  if (provider === 'facebook') {
    const facebook = new FacebookAuthProvider();
    facebook.addScope('email');
    return performSocialSignIn(
      provider,
      () => signInWithPopup(auth, facebook),
      FacebookAuthProvider.credentialFromError,
    );
  }

  const apple = new OAuthProvider('apple.com');
  apple.addScope('email');
  apple.addScope('name');
  apple.setCustomParameters({ locale: 'es' });
  return performSocialSignIn(
    provider,
    () => signInWithPopup(auth, apple),
    OAuthProvider.credentialFromError,
  );
}
