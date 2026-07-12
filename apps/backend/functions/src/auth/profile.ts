import { randomUUID } from 'node:crypto';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ProfileError, ProfileService } from './profile-service';

export function createSyncOwnProfile(service: ProfileService) {
  return onCall({ timeoutSeconds: 15 }, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }

    const correlationId = randomUUID();
    const startedAt = Date.now();
    logger.info({
      event: 'auth_profile_sync',
      status: 'started',
      correlationId,
    });

    try {
      await service.syncOwnProfile(
        { userId: request.auth.uid, email: request.auth.token.email },
        {
          displayName: request.data?.displayName,
          photoUrl: request.data?.photoUrl,
        },
      );
      logger.info({
        event: 'auth_profile_sync',
        status: 'completed',
        correlationId,
        durationMs: Date.now() - startedAt,
      });
      return { ok: true };
    } catch (error: unknown) {
      const errorCode = error instanceof ProfileError ? 'invalid-argument' : 'internal';
      logger.error({
        event: 'auth_profile_sync',
        status: 'failed',
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCode,
        errorType: error instanceof Error ? error.name : 'unknown',
      });
      if (error instanceof ProfileError) {
        throw new HttpsError('invalid-argument', error.message);
      }
      throw new HttpsError('internal', 'No se pudo sincronizar el perfil.');
    }
  });
}
