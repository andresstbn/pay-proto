import { randomUUID } from 'node:crypto';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GroupError } from './domain';
import { GroupService } from './service';

type Input = Record<string, unknown>;

export function createGroupHandlers(service: GroupService) {
  return {
    createGroup: callable('group_create', (uid, data) => service.createGroup(uid, {
      name: data.name,
    })),
    rotateGroupInvite: callable('group_invite_rotate', (uid, data) => service.rotateInvite(uid, {
      groupId: data.groupId,
    })),
    joinGroup: callable('group_join', (uid, data) => service.joinGroup(uid, {
      code: data.code,
    })),
    setGroupParticipation: callable('group_participation_set', async (uid, data) => ({
      active: await service.setParticipation(uid, {
        groupId: data.groupId,
        active: data.active,
      }),
    })),
    setGroupMemberRole: callable('group_role_set', async (uid, data) => {
      await service.setMemberRole(uid, {
        groupId: data.groupId,
        memberId: data.memberId,
        role: data.role,
      });
      return {};
    }),
    removeGroupMember: callable('group_member_remove', async (uid, data) => {
      await service.removeMember(uid, {
        groupId: data.groupId,
        memberId: data.memberId,
      });
      return {};
    }),
    leaveGroup: callable('group_leave', async (uid, data) => {
      await service.leaveGroup(uid, { groupId: data.groupId });
      return {};
    }),
    transferGroupOwnership: callable('group_ownership_transfer', async (uid, data) => {
      await service.transferOwnership(uid, {
        groupId: data.groupId,
        newOwnerId: data.newOwnerId,
      });
      return {};
    }),
    archiveGroup: callable('group_archive', async (uid, data) => {
      await service.archiveGroup(uid, { groupId: data.groupId });
      return {};
    }),
    createGroupFixedQr: callable('group_qr_create', async (uid, data) => ({
      qrId: await service.createFixedQr(uid, {
        groupId: data.groupId,
        name: data.name,
        amountInCents: data.amountInCents,
        concept: data.concept,
      }),
    })),
    deactivateGroupQr: callable('group_qr_deactivate', async (uid, data) => {
      await service.deactivateQr(uid, {
        groupId: data.groupId,
        qrId: data.qrId,
      });
      return {};
    }),
    previewGroupPayment: callable('group_payment_preview', (uid, data) => (
      service.previewPayment(uid, paymentTarget(data))
    )),
    payGroup: callable('group_payment', async (uid, data) => {
      const result = await service.payGroup(uid, {
        ...paymentTarget(data),
        clientRequestId: data.clientRequestId,
      });
      return { ...result, id: result.transactionId };
    }),
  };
}

function paymentTarget(data: Input): {
  groupId?: unknown;
  qrId?: unknown;
  amountInCents?: unknown;
} {
  return {
    groupId: data.groupId,
    qrId: data.qrId,
    amountInCents: data.amountInCents,
  };
}

function callable<T>(
  event: string,
  operation: (uid: string, data: Input) => Promise<T>,
) {
  return onCall({ timeoutSeconds: 30 }, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
    }
    const correlationId = randomUUID();
    const startedAt = Date.now();
    logger.info({ event, status: 'started', correlationId });

    try {
      const data = isInput(request.data) ? request.data : {};
      const result = await operation(request.auth.uid, data);
      logger.info({
        event,
        status: 'completed',
        correlationId,
        durationMs: Date.now() - startedAt,
      });
      return { ok: true, ...result };
    } catch (error: unknown) {
      const errorCode = error instanceof GroupError ? error.code : 'internal';
      logger.error({
        event,
        status: 'failed',
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCode,
        errorType: error instanceof Error ? error.name : 'unknown',
      });
      if (error instanceof GroupError) {
        throw new HttpsError(error.code, error.message);
      }
      throw new HttpsError('internal', 'No se pudo completar la operación del grupo.');
    }
  });
}

function isInput(value: unknown): value is Input {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
