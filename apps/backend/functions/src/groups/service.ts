import {
  GROUP_CURRENCY,
  Group,
  GroupActivity,
  GroupError,
  GroupInvite,
  GroupPaymentResult,
  GroupPaymentTransaction,
  GroupQr,
  MAX_GROUP_FIXED_QRS,
  MAX_GROUP_MEMBERS,
} from './domain';
import {
  assertActiveGroup,
  assertManager,
  assertMember,
  assertOwner,
  assertValidAmount,
  distributeAmount,
  normalizeInviteCode,
  roleFor,
} from './policy';
import { GroupTransaction, GroupsRepository } from './repository';

const GROUP_NAME_MAX_LENGTH = 60;
const QR_NAME_MAX_LENGTH = 60;
const CONCEPT_MAX_LENGTH = 120;
const CLIENT_REQUEST_ID_MAX_LENGTH = 128;
const NORMALIZED_INVITE_LENGTH = 24;

export interface GroupServiceDependencies {
  repository: GroupsRepository;
  now: () => number;
  generateInviteCode: () => string;
  hash: (value: string) => string;
}

export interface PaymentPreview {
  groupId: string;
  groupName: string;
  qrId: string;
  qrType: GroupQr['type'];
  amountInCents: number;
  currency: typeof GROUP_CURRENCY;
  concept: string;
  recipientCount: number;
  baseShareInCents: number;
  extraCentRecipients: number;
}

export interface PaymentTargetInput {
  groupId?: unknown;
  qrId?: unknown;
  amountInCents?: unknown;
}

export class GroupService {
  constructor(private readonly dependencies: GroupServiceDependencies) {}

  async createGroup(actorId: string, input: { name: unknown }): Promise<{
    groupId: string;
    openQrId: string;
    inviteCode: string;
    joinUrl: string;
  }> {
    const name = requiredText(input.name, 'name', 2, GROUP_NAME_MAX_LENGTH);
    const groupId = this.dependencies.repository.createId('groups');
    const openQrId = this.dependencies.repository.createId('groupQrs');
    const activityId = this.dependencies.repository.createId('groupActivity');
    const invitation = this.newInvitation();
    const now = this.dependencies.now();

    await this.dependencies.repository.runTransaction(async (transaction) => {
      await requireUser(transaction, actorId);

      const group: Group = {
        id: groupId,
        name,
        ownerId: actorId,
        adminIds: [],
        memberIds: [actorId],
        activeMemberIds: [actorId],
        status: 'active',
        distributionCursor: 0,
        openQrId,
        activeInviteHash: invitation.hash,
        createdAt: now,
        updatedAt: now,
      };
      const qr: GroupQr = {
        id: openQrId,
        groupId,
        type: 'open',
        name: 'QR abierto',
        concept: name,
        amountInCents: null,
        currency: GROUP_CURRENCY,
        status: 'active',
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      };

      transaction.createGroup(group);
      transaction.createQr(qr);
      transaction.createInvite(inviteRecord(invitation.hash, groupId, actorId, now));
      transaction.createActivity(activity(activityId, groupId, 'group_created', actorId, now));
    });

    return {
      groupId,
      openQrId,
      inviteCode: invitation.code,
      joinUrl: joinUrl(invitation.code),
    };
  }

  async rotateInvite(actorId: string, input: { groupId: unknown }): Promise<{
    inviteCode: string;
    joinUrl: string;
  }> {
    const groupId = safeId(input.groupId, 'groupId');
    const invitation = this.newInvitation();
    const now = this.dependencies.now();

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertManager(group, actorId);
      const previousInvite = group.activeInviteHash
        ? await transaction.getInvite(group.activeInviteHash)
        : null;

      if (previousInvite) {
        transaction.updateInvite(previousInvite.id, {
          status: 'inactive',
          invalidatedAt: now,
        });
      }
      transaction.createInvite(inviteRecord(invitation.hash, groupId, actorId, now));
      transaction.updateGroup(groupId, {
        activeInviteHash: invitation.hash,
        updatedAt: now,
      });
    });

    return { inviteCode: invitation.code, joinUrl: joinUrl(invitation.code) };
  }

  async joinGroup(actorId: string, input: { code: unknown }): Promise<{
    groupId: string;
    alreadyMember: boolean;
  }> {
    const code = requiredText(input.code, 'code', 1, 80);
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== NORMALIZED_INVITE_LENGTH) {
      throw new GroupError('invalid-argument', 'El código de invitación no es válido.');
    }
    const inviteHash = this.dependencies.hash(normalized);
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    return this.dependencies.repository.runTransaction(async (transaction) => {
      const invite = await transaction.getInvite(inviteHash);
      if (!invite || invite.status !== 'active') {
        throw new GroupError('not-found', 'La invitación no existe o ya no está activa.');
      }
      const group = await requireGroup(transaction, invite.groupId);
      assertActiveGroup(group);
      if (group.activeInviteHash !== inviteHash) {
        throw new GroupError('not-found', 'La invitación no existe o ya no está activa.');
      }
      await requireUser(transaction, actorId);

      if (group.memberIds.includes(actorId)) {
        return { groupId: group.id, alreadyMember: true };
      }
      if (group.memberIds.length >= MAX_GROUP_MEMBERS) {
        throw new GroupError('failed-precondition', 'El grupo ya alcanzó el límite de miembros.');
      }

      transaction.updateGroup(group.id, {
        memberIds: [...group.memberIds, actorId],
        activeMemberIds: [...group.activeMemberIds, actorId],
        updatedAt: now,
      });
      transaction.createActivity(activity(activityId, group.id, 'member_joined', actorId, now));
      return { groupId: group.id, alreadyMember: false };
    });
  }

  async setParticipation(actorId: string, input: { groupId: unknown; active: unknown }): Promise<boolean> {
    const groupId = safeId(input.groupId, 'groupId');
    if (typeof input.active !== 'boolean') {
      throw new GroupError('invalid-argument', 'active debe ser un booleano.');
    }
    const isActive = input.active;
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertMember(group, actorId);
      const wasActive = group.activeMemberIds.includes(actorId);
      if (wasActive === isActive) return;

      transaction.updateGroup(groupId, {
        activeMemberIds: isActive
          ? [...group.activeMemberIds, actorId]
          : group.activeMemberIds.filter((memberId) => memberId !== actorId),
        updatedAt: now,
      });
      transaction.createActivity({
        ...activity(activityId, groupId, 'participation_changed', actorId, now),
        active: isActive,
      });
    });

    return isActive;
  }

  async setMemberRole(
    actorId: string,
    input: { groupId: unknown; memberId: unknown; role: unknown },
  ): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const memberId = safeId(input.memberId, 'memberId');
    if (input.role !== 'admin' && input.role !== 'member') {
      throw new GroupError('invalid-argument', 'El rol debe ser admin o member.');
    }
    const role = input.role;
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertOwner(group, actorId);
      if (memberId === group.ownerId || !group.memberIds.includes(memberId)) {
        throw new GroupError('failed-precondition', 'El usuario indicado no es un miembro gestionable.');
      }

      const adminIds = role === 'admin'
        ? [...new Set([...group.adminIds, memberId])]
        : group.adminIds.filter((id) => id !== memberId);
      transaction.updateGroup(groupId, { adminIds, updatedAt: now });
      transaction.createActivity({
        ...activity(activityId, groupId, 'role_changed', actorId, now),
        targetMemberId: memberId,
        role,
      });
    });
  }

  async removeMember(actorId: string, input: { groupId: unknown; memberId: unknown }): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const memberId = safeId(input.memberId, 'memberId');
    if (actorId === memberId) {
      throw new GroupError('failed-precondition', 'Usa la acción de abandonar el grupo.');
    }
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      const actorRole = assertManager(group, actorId);
      const targetRole = roleFor(group, memberId);
      if (!targetRole || targetRole === 'owner' || (actorRole === 'admin' && targetRole === 'admin')) {
        throw new GroupError('permission-denied', 'No puedes eliminar a este miembro.');
      }
      const activeInvite = group.activeInviteHash
        ? await transaction.getInvite(group.activeInviteHash)
        : null;

      transaction.updateGroup(groupId, {
        memberIds: group.memberIds.filter((id) => id !== memberId),
        activeMemberIds: group.activeMemberIds.filter((id) => id !== memberId),
        adminIds: group.adminIds.filter((id) => id !== memberId),
        activeInviteHash: '',
        updatedAt: now,
      });
      if (activeInvite) {
        transaction.updateInvite(activeInvite.id, { status: 'inactive', invalidatedAt: now });
      }
      transaction.createActivity({
        ...activity(activityId, groupId, 'member_removed', actorId, now),
        targetMemberId: memberId,
      });
    });
  }

  async leaveGroup(actorId: string, input: { groupId: unknown }): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertMember(group, actorId);
      if (group.ownerId === actorId) {
        throw new GroupError('failed-precondition', 'Transfiere la propiedad o archiva el grupo antes de abandonarlo.');
      }

      transaction.updateGroup(groupId, {
        memberIds: group.memberIds.filter((id) => id !== actorId),
        activeMemberIds: group.activeMemberIds.filter((id) => id !== actorId),
        adminIds: group.adminIds.filter((id) => id !== actorId),
        updatedAt: now,
      });
      transaction.createActivity(activity(activityId, groupId, 'member_left', actorId, now));
    });
  }

  async transferOwnership(
    actorId: string,
    input: { groupId: unknown; newOwnerId: unknown },
  ): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const newOwnerId = safeId(input.newOwnerId, 'newOwnerId');
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertOwner(group, actorId);
      if (newOwnerId === actorId || !group.memberIds.includes(newOwnerId)) {
        throw new GroupError('failed-precondition', 'El nuevo propietario debe ser otro miembro del grupo.');
      }

      transaction.updateGroup(groupId, {
        ownerId: newOwnerId,
        adminIds: [...new Set([
          ...group.adminIds.filter((id) => id !== newOwnerId),
          actorId,
        ])],
        updatedAt: now,
      });
      transaction.createActivity({
        ...activity(activityId, groupId, 'ownership_transferred', actorId, now),
        targetMemberId: newOwnerId,
      });
    });
  }

  async archiveGroup(actorId: string, input: { groupId: unknown }): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const now = this.dependencies.now();
    const activityId = this.dependencies.repository.createId('groupActivity');

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertOwner(group, actorId);
      const invite = group.activeInviteHash
        ? await transaction.getInvite(group.activeInviteHash)
        : null;
      const qrs = await transaction.listGroupQrs(groupId);

      transaction.updateGroup(groupId, {
        status: 'archived',
        activeMemberIds: [],
        activeInviteHash: '',
        updatedAt: now,
      });
      if (invite) {
        transaction.updateInvite(invite.id, { status: 'inactive', invalidatedAt: now });
      }
      qrs.forEach((qr) => transaction.updateQr(qr.id, { status: 'inactive', updatedAt: now }));
      transaction.createActivity(activity(activityId, groupId, 'group_archived', actorId, now));
    });
  }

  async createFixedQr(
    actorId: string,
    input: { groupId: unknown; name: unknown; amountInCents: unknown; concept?: unknown },
  ): Promise<string> {
    const groupId = safeId(input.groupId, 'groupId');
    const name = requiredText(input.name, 'name', 1, QR_NAME_MAX_LENGTH);
    assertValidAmount(input.amountInCents);
    const amountInCents = input.amountInCents;
    const concept = optionalText(input.concept, 'concept', CONCEPT_MAX_LENGTH);
    const qrId = this.dependencies.repository.createId('groupQrs');
    const activityId = this.dependencies.repository.createId('groupActivity');
    const now = this.dependencies.now();

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      assertActiveGroup(group);
      assertManager(group, actorId);
      const existingQrs = await transaction.listGroupQrs(groupId);
      const fixedQrCount = existingQrs.filter((qr) => qr.type === 'fixed').length;
      if (fixedQrCount >= MAX_GROUP_FIXED_QRS) {
        throw new GroupError(
          'failed-precondition',
          `El grupo no puede tener más de ${MAX_GROUP_FIXED_QRS} QRs fijos.`,
        );
      }

      transaction.createQr({
        id: qrId,
        groupId,
        type: 'fixed',
        name,
        concept,
        amountInCents,
        currency: GROUP_CURRENCY,
        status: 'active',
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      });
      transaction.updateGroup(groupId, { updatedAt: now });
      transaction.createActivity(activity(activityId, groupId, 'qr_created', actorId, now));
    });

    return qrId;
  }

  async deactivateQr(actorId: string, input: { groupId: unknown; qrId: unknown }): Promise<void> {
    const groupId = safeId(input.groupId, 'groupId');
    const qrId = safeId(input.qrId, 'qrId');
    const activityId = this.dependencies.repository.createId('groupActivity');
    const now = this.dependencies.now();

    await this.dependencies.repository.runTransaction(async (transaction) => {
      const group = await requireGroup(transaction, groupId);
      const qr = await requireQr(transaction, qrId);
      assertActiveGroup(group);
      assertManager(group, actorId);
      if (qr.groupId !== groupId || qr.type === 'open') {
        throw new GroupError('failed-precondition', 'Solo se pueden desactivar QRs fijos de este grupo.');
      }

      if (qr.status !== 'inactive') {
        transaction.updateQr(qrId, { status: 'inactive', updatedAt: now });
        transaction.updateGroup(groupId, { updatedAt: now });
        transaction.createActivity(activity(activityId, groupId, 'qr_deactivated', actorId, now));
      }
    });
  }

  async previewPayment(
    actorId: string,
    input: PaymentTargetInput,
  ): Promise<PaymentPreview> {
    const target = parsePaymentTarget(input);

    return this.dependencies.repository.runTransaction(async (transaction) => {
      const { group, qr } = await resolvePaymentTarget(transaction, target);
      assertPayable(group, qr);
      const amountInCents = resolvePaymentAmount(qr, input.amountInCents);
      const distribution = distributeAmount(
        amountInCents,
        group.activeMemberIds,
        actorId,
        group.distributionCursor,
      );

      return {
        groupId: group.id,
        groupName: group.name,
        qrId: qr.id,
        qrType: qr.type,
        amountInCents,
        currency: GROUP_CURRENCY,
        concept: qr.concept || qr.name,
        recipientCount: distribution.allocations.length,
        baseShareInCents: distribution.baseShareInCents,
        extraCentRecipients: distribution.extraCentRecipients,
      };
    });
  }

  async payGroup(
    actorId: string,
    input: PaymentTargetInput & { clientRequestId: unknown },
  ): Promise<GroupPaymentResult & { replayed: boolean }> {
    const target = parsePaymentTarget(input);
    const clientRequestId = requiredText(
      input.clientRequestId,
      'clientRequestId',
      8,
      CLIENT_REQUEST_ID_MAX_LENGTH,
    );
    if (!/^[A-Za-z0-9._:-]+$/.test(clientRequestId)) {
      throw new GroupError('invalid-argument', 'clientRequestId contiene caracteres no válidos.');
    }
    const requestId = this.dependencies.hash(`${actorId}\u0000${clientRequestId}`);
    const fingerprint = this.dependencies.hash(JSON.stringify({
      groupId: target.kind === 'open' ? target.groupId : null,
      qrId: target.kind === 'fixed' ? target.qrId : null,
      amountInCents: input.amountInCents ?? null,
    }));
    const transactionId = this.dependencies.repository.createId('transactions');
    const activityId = this.dependencies.repository.createId('groupActivity');
    const now = this.dependencies.now();

    return this.dependencies.repository.runTransaction(async (transaction) => {
      const previousRequest = await transaction.getPaymentRequest(requestId);
      if (previousRequest) {
        if (previousRequest.payerId !== actorId || previousRequest.requestFingerprint !== fingerprint) {
          throw new GroupError('already-exists', 'clientRequestId ya fue utilizado con otra solicitud.');
        }
        return { ...previousRequest.result, replayed: true };
      }

      const { group, qr } = await resolvePaymentTarget(transaction, target);
      assertPayable(group, qr);
      const amountInCents = resolvePaymentAmount(qr, input.amountInCents);
      const distribution = distributeAmount(
        amountInCents,
        group.activeMemberIds,
        actorId,
        group.distributionCursor,
      );
      const payer = await requireUser(transaction, actorId);
      await Promise.all(
        distribution.allocations.map((allocation) => requireUser(transaction, allocation.recipientId)),
      );

      if (payer.balanceInCents < amountInCents) {
        throw new GroupError('failed-precondition', 'Saldo insuficiente.');
      }
      const result: GroupPaymentResult = {
        transactionId,
        groupId: group.id,
        amountInCents,
        recipientCount: distribution.allocations.length,
        payerBalanceInCentsAfter: payer.balanceInCents - amountInCents,
        createdAt: now,
      };
      const payment: GroupPaymentTransaction = {
        id: transactionId,
        qrType: qr.type === 'open' ? 'group_open' : 'group_fixed',
        qrReferenceId: qr.id,
        groupId: group.id,
        groupName: group.name,
        payerId: actorId,
        recipientCount: distribution.allocations.length,
        amountInCents,
        currency: GROUP_CURRENCY,
        concept: qr.concept || qr.name,
        status: 'completed',
        createdAt: now,
      };

      transaction.updateUserBalance(actorId, -amountInCents);
      distribution.allocations.forEach((allocation) => {
        transaction.updateUserBalance(allocation.recipientId, allocation.amountInCents);
      });
      transaction.updateGroup(group.id, {
        distributionCursor: distribution.nextCursor,
        updatedAt: now,
      });
      transaction.createPaymentTransaction(payment);
      distribution.allocations.forEach((allocation) => {
        transaction.createGroupReceipt({
          id: this.dependencies.repository.createId('groupReceipts'),
          transactionId,
          groupId: group.id,
          groupName: group.name,
          qrType: payment.qrType,
          qrReferenceId: qr.id,
          payerId: actorId,
          recipientId: allocation.recipientId,
          amountInCents: allocation.amountInCents,
          totalAmountInCents: amountInCents,
          recipientCount: distribution.allocations.length,
          currency: GROUP_CURRENCY,
          concept: payment.concept,
          status: 'completed',
          createdAt: now,
        });
      });
      transaction.createPaymentRequest({
        id: requestId,
        payerId: actorId,
        requestFingerprint: fingerprint,
        result,
        createdAt: now,
      });
      transaction.createActivity({
        id: activityId,
        groupId: group.id,
        type: 'payment_completed',
        transactionId,
        amountInCents,
        recipientCount: distribution.allocations.length,
        createdAt: now,
      });

      return { ...result, replayed: false };
    });
  }

  private newInvitation(): { code: string; hash: string } {
    const code = this.dependencies.generateInviteCode();
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== NORMALIZED_INVITE_LENGTH) {
      throw new Error('El proveedor de invitaciones generó un código inválido.');
    }
    return { code, hash: this.dependencies.hash(normalized) };
  }
}

type PaymentTarget =
  | { kind: 'open'; groupId: string }
  | { kind: 'fixed'; qrId: string };

function parsePaymentTarget(input: PaymentTargetInput): PaymentTarget {
  const hasGroupId = input.groupId !== undefined && input.groupId !== null;
  const hasQrId = input.qrId !== undefined && input.qrId !== null;
  if (hasGroupId === hasQrId) {
    throw new GroupError('invalid-argument', 'Indica groupId para QR abierto o qrId para QR fijo.');
  }
  return hasGroupId
    ? { kind: 'open', groupId: safeId(input.groupId, 'groupId') }
    : { kind: 'fixed', qrId: safeId(input.qrId, 'qrId') };
}

async function resolvePaymentTarget(
  transaction: GroupTransaction,
  target: PaymentTarget,
): Promise<{ group: Group; qr: GroupQr }> {
  if (target.kind === 'open') {
    const group = await requireGroup(transaction, target.groupId);
    const qr = await requireQr(transaction, group.openQrId);
    if (qr.type !== 'open' || qr.groupId !== group.id) {
      throw new GroupError('failed-precondition', 'El QR abierto del grupo no es válido.');
    }
    return { group, qr };
  }

  const qr = await requireQr(transaction, target.qrId);
  if (qr.type !== 'fixed') {
    throw new GroupError('invalid-argument', 'Usa groupId para pagar un QR abierto.');
  }
  return { group: await requireGroup(transaction, qr.groupId), qr };
}

function activity(
  id: string,
  groupId: string,
  type: GroupActivity['type'],
  actorId: string,
  createdAt: number,
): GroupActivity {
  return { id, groupId, type, actorId, createdAt };
}

function inviteRecord(hash: string, groupId: string, actorId: string, now: number): GroupInvite {
  return {
    id: hash,
    groupId,
    status: 'active',
    createdBy: actorId,
    createdAt: now,
    invalidatedAt: null,
  };
}

async function requireGroup(transaction: GroupTransaction, groupId: string): Promise<Group> {
  const group = await transaction.getGroup(groupId);
  if (!group) throw new GroupError('not-found', 'El grupo no existe.');
  return group;
}

async function requireQr(transaction: GroupTransaction, qrId: string): Promise<GroupQr> {
  const qr = await transaction.getQr(qrId);
  if (!qr) throw new GroupError('not-found', 'El QR no existe.');
  return qr;
}

async function requireUser(transaction: GroupTransaction, userId: string) {
  const user = await transaction.getUserBalance(userId);
  if (!user) throw new GroupError('not-found', 'El usuario no existe.');
  if (!Number.isSafeInteger(user.balanceInCents) || user.balanceInCents < 0) {
    throw new GroupError('failed-precondition', 'El saldo del usuario no es válido.');
  }
  return user;
}

function assertPayable(group: Group, qr: GroupQr): void {
  assertActiveGroup(group);
  if (qr.status !== 'active') {
    throw new GroupError('failed-precondition', 'El QR está desactivado.');
  }
}

function resolvePaymentAmount(qr: GroupQr, requestedAmount: unknown): number {
  if (qr.type === 'fixed') {
    assertValidAmount(qr.amountInCents);
    if (requestedAmount !== undefined && requestedAmount !== qr.amountInCents) {
      throw new GroupError('invalid-argument', 'El importe no coincide con el QR fijo.');
    }
    return qr.amountInCents;
  }
  assertValidAmount(requestedAmount);
  return requestedAmount;
}

function safeId(value: unknown, field: string): string {
  const id = requiredText(value, field, 1, 128);
  if (id.includes('/')) {
    throw new GroupError('invalid-argument', `${field} no es válido.`);
  }
  return id;
}

function requiredText(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new GroupError('invalid-argument', `${field} debe ser texto.`);
  }
  const clean = value.trim();
  if (clean.length < minLength || clean.length > maxLength) {
    throw new GroupError(
      'invalid-argument',
      `${field} debe tener entre ${minLength} y ${maxLength} caracteres.`,
    );
  }
  return clean;
}

function optionalText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new GroupError('invalid-argument', `${field} debe ser texto.`);
  }
  const clean = value.trim();
  if (clean.length > maxLength) {
    throw new GroupError('invalid-argument', `${field} no puede superar ${maxLength} caracteres.`);
  }
  return clean;
}

function joinUrl(code: string): string {
  return `ericpay://groups/join?code=${encodeURIComponent(code)}`;
}
