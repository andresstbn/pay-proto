import { AuthCredential } from 'firebase/auth';

import { PendingLinkSummary, SocialProvider } from './types';

interface PendingLink extends PendingLinkSummary {
  credential: AuthCredential;
}

// OAuth credentials contain short-lived tokens. Keep them in memory only: never
// persist them in AsyncStorage or include them in diagnostics.
let pendingLink: PendingLink | null = null;

export function savePendingLink(args: {
  credential: AuthCredential;
  email: string;
  provider: SocialProvider;
}): PendingLinkSummary {
  pendingLink = {
    credential: args.credential,
    email: args.email.trim().toLowerCase(),
    provider: args.provider,
  };
  return { email: pendingLink.email, provider: pendingLink.provider };
}

export function readPendingLink(): PendingLink | null {
  return pendingLink;
}

export function pendingLinkSummary(): PendingLinkSummary | null {
  return pendingLink ? { email: pendingLink.email, provider: pendingLink.provider } : null;
}

export function clearPendingLink(): void {
  pendingLink = null;
}
