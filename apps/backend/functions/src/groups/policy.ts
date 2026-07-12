import {
  Group,
  GroupError,
  GroupRole,
  MAX_GROUP_AMOUNT_IN_CENTS,
} from './domain';

const INVITE_CODE_SEPARATOR = '-';

export function assertActiveGroup(group: Group): void {
  if (group.status !== 'active') {
    throw new GroupError('failed-precondition', 'El grupo está archivado.');
  }
}

export function roleFor(group: Group, userId: string): GroupRole | null {
  if (group.ownerId === userId) return 'owner';
  if (group.adminIds.includes(userId)) return 'admin';
  if (group.memberIds.includes(userId)) return 'member';
  return null;
}

export function assertMember(group: Group, userId: string): GroupRole {
  const role = roleFor(group, userId);
  if (!role) {
    throw new GroupError('permission-denied', 'No perteneces a este grupo.');
  }
  return role;
}

export function assertManager(group: Group, userId: string): GroupRole {
  const role = assertMember(group, userId);
  if (role === 'member') {
    throw new GroupError('permission-denied', 'Se requiere ser propietario o administrador.');
  }
  return role;
}

export function assertOwner(group: Group, userId: string): void {
  if (group.ownerId !== userId) {
    throw new GroupError('permission-denied', 'Solo el propietario puede realizar esta acción.');
  }
}

export function assertValidAmount(amountInCents: unknown): asserts amountInCents is number {
  if (
    typeof amountInCents !== 'number' ||
    !Number.isSafeInteger(amountInCents) ||
    amountInCents <= 0 ||
    amountInCents > MAX_GROUP_AMOUNT_IN_CENTS
  ) {
    throw new GroupError('invalid-argument', 'El importe debe ser un número entero de céntimos válido.');
  }
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().split(INVITE_CODE_SEPARATOR).join('');
}

export interface Distribution {
  allocations: Array<{ recipientId: string; amountInCents: number }>;
  nextCursor: number;
  baseShareInCents: number;
  extraCentRecipients: number;
}

export function distributeAmount(
  amountInCents: number,
  activeMemberIds: string[],
  payerId: string,
  cursor: number,
): Distribution {
  assertValidAmount(amountInCents);

  const recipientIds = [...new Set(activeMemberIds)].filter((memberId) => memberId !== payerId);
  if (recipientIds.length === 0) {
    throw new GroupError('failed-precondition', 'El grupo no tiene receptores activos para este pago.');
  }
  if (amountInCents < recipientIds.length) {
    throw new GroupError('failed-precondition', 'El importe es demasiado pequeño para repartirlo entre los miembros activos.');
  }

  const baseShareInCents = Math.floor(amountInCents / recipientIds.length);
  const extraCentRecipients = amountInCents % recipientIds.length;
  const start = normalizeCursor(cursor, recipientIds.length);
  const extraRecipients = new Set<string>();

  for (let offset = 0; offset < extraCentRecipients; offset += 1) {
    extraRecipients.add(recipientIds[(start + offset) % recipientIds.length]);
  }

  const allocations = recipientIds.map((recipientId) => ({
    recipientId,
    amountInCents: baseShareInCents + (extraRecipients.has(recipientId) ? 1 : 0),
  }));
  const cursorAdvance = Math.max(1, extraCentRecipients);

  return {
    allocations,
    nextCursor: (start + cursorAdvance) % recipientIds.length,
    baseShareInCents,
    extraCentRecipients,
  };
}

function normalizeCursor(cursor: number, recipientCount: number): number {
  if (!Number.isSafeInteger(cursor) || cursor < 0) return 0;
  return cursor % recipientCount;
}
