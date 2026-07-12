export const INITIAL_BALANCE_IN_CENTS = 100_000;
export const PROFILE_CURRENCY = 'EUR' as const;

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_PHOTO_URL_LENGTH = 500;

export interface ProfileRecord {
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
}

export interface ProfileRepository {
  syncProfile(profile: ProfileRecord): Promise<void>;
  ensureProfile(profile: ProfileRecord): Promise<void>;
}

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  syncOwnProfile(identity: { userId: string; email: unknown }, input: {
    displayName: unknown;
    photoUrl: unknown;
  }): Promise<void> {
    return this.repository.syncProfile(profileRecord(identity, input));
  }

  ensureProfile(identity: { userId: string; email: unknown }, input: {
    displayName: unknown;
    photoUrl: unknown;
  }): Promise<void> {
    return this.repository.ensureProfile(profileRecord(identity, input));
  }
}

function profileRecord(
  identity: { userId: string; email: unknown },
  input: { displayName: unknown; photoUrl: unknown },
): ProfileRecord {
  const email = typeof identity.email === 'string' ? identity.email : '';
  const displayName = optionalText(
    input.displayName,
    'displayName',
    MAX_DISPLAY_NAME_LENGTH,
  );
  return {
    userId: identity.userId,
    email,
    displayName: displayName || fallbackName(email),
    photoUrl: optionalText(input.photoUrl, 'photoUrl', MAX_PHOTO_URL_LENGTH),
  };
}

function optionalText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new ProfileError(`${field} debe ser texto.`);
  }
  const clean = value.trim();
  if (clean.length > maxLength) {
    throw new ProfileError(`${field} es demasiado largo.`);
  }
  return clean;
}

function fallbackName(email: string): string {
  const localPart = email.split('@')[0]?.trim();
  return localPart || 'Usuario';
}
