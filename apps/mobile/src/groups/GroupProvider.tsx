import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  QueryDocumentSnapshot,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../domain/firebase';
import {
  GROUP_ACTIVITY_TYPE,
  GROUP_CALLABLE,
  GROUP_COLLECTION,
  GROUP_QR_STATUS,
  GROUP_QR_KIND,
  GROUP_ROLE,
  GROUP_STATUS,
} from './constants';
import { groupReceiptFromData, groupSentTransactionFromData } from './document-mappers';
import { buildGroupHistory } from './history-policy';
import {
  Group,
  GroupActionResult,
  GroupActivity,
  GroupCreateResult,
  GroupHistoryItem,
  GroupInviteResult,
  GroupPayResult,
  GroupPaymentPreview,
  GroupPreviewResult,
  GroupQr,
  GroupReceipt,
  GroupRole,
  GroupSentTransaction,
} from './types';

interface GroupPaymentInput {
  groupId?: string;
  qrId?: string;
  amountInCents?: number;
}

interface PayGroupInput extends GroupPaymentInput {
  clientRequestId: string;
}

interface GroupActions {
  createGroup: (name: string) => Promise<GroupCreateResult>;
  rotateInvite: (groupId: string) => Promise<GroupInviteResult>;
  joinGroup: (code: string) => Promise<GroupCreateResult>;
  setParticipation: (groupId: string, active: boolean) => Promise<GroupActionResult>;
  setMemberRole: (groupId: string, userId: string, role: Exclude<GroupRole, typeof GROUP_ROLE.OWNER>) => Promise<GroupActionResult>;
  removeMember: (groupId: string, userId: string) => Promise<GroupActionResult>;
  leaveGroup: (groupId: string) => Promise<GroupActionResult>;
  transferOwnership: (groupId: string, newOwnerId: string) => Promise<GroupActionResult>;
  archiveGroup: (groupId: string) => Promise<GroupActionResult>;
  createGroupQr: (args: { groupId: string; name: string; concept: string; amountInCents: number }) => Promise<GroupCreateResult>;
  deactivateGroupQr: (groupId: string, qrId: string) => Promise<GroupActionResult>;
  previewPayment: (args: GroupPaymentInput) => Promise<GroupPreviewResult>;
  payGroup: (args: PayGroupInput) => Promise<GroupPayResult>;
}

interface GroupContextValue extends GroupActions {
  groups: Group[];
  qrsByGroup: Record<string, GroupQr[]>;
  activityByGroup: Record<string, GroupActivity[]>;
  history: GroupHistoryItem[];
  currentUserId: string | null;
  loading: boolean;
  historyReady: boolean;
  error: string | null;
  retry: () => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

function timestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function groupFromDoc(doc: QueryDocumentSnapshot): Group {
  const data = doc.data();
  return {
    id: doc.id,
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    adminIds: strings(data.adminIds),
    memberIds: strings(data.memberIds),
    activeMemberIds: strings(data.activeMemberIds),
    status: data.status === GROUP_STATUS.ARCHIVED ? GROUP_STATUS.ARCHIVED : GROUP_STATUS.ACTIVE,
    openQrId: typeof data.openQrId === 'string' ? data.openQrId : '',
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
    lastActivityAt: timestamp(data.lastActivityAt ?? data.updatedAt ?? data.createdAt),
  };
}

function qrFromDoc(doc: QueryDocumentSnapshot): GroupQr {
  const data = doc.data();
  return {
    id: doc.id,
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    name: typeof data.name === 'string' ? data.name : 'QR fijo',
    type: data.type === GROUP_QR_KIND.OPEN ? GROUP_QR_KIND.OPEN : GROUP_QR_KIND.FIXED,
    concept: typeof data.concept === 'string' ? data.concept : '',
    amountInCents: typeof data.amountInCents === 'number' ? data.amountInCents : 0,
    currency: 'EUR',
    status: data.status === GROUP_QR_STATUS.INACTIVE ? GROUP_QR_STATUS.INACTIVE : GROUP_QR_STATUS.ACTIVE,
    createdAt: timestamp(data.createdAt),
  };
}

function activityFromDoc(doc: QueryDocumentSnapshot): GroupActivity {
  const data = doc.data();
  const knownTypes = Object.values(GROUP_ACTIVITY_TYPE) as string[];
  return {
    id: doc.id,
    groupId: typeof data.groupId === 'string' ? data.groupId : '',
    type: knownTypes.includes(data.type) ? data.type : GROUP_ACTIVITY_TYPE.CREATED,
    actorId: typeof data.actorId === 'string' ? data.actorId : undefined,
    targetMemberId: typeof data.targetMemberId === 'string' ? data.targetMemberId : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined,
    amountInCents: typeof data.amountInCents === 'number' ? data.amountInCents : undefined,
    recipientCount: typeof data.recipientCount === 'number' ? data.recipientCount : undefined,
    active: typeof data.active === 'boolean' ? data.active : undefined,
    createdAt: timestamp(data.createdAt),
  };
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code.slice(0, 80);
  }
  return 'unknown';
}

function friendlyError(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (code.includes('permission-denied')) return 'No tienes permisos para realizar esta acción.';
  if (code.includes('unauthenticated')) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  if (code.includes('not-found')) return 'El grupo o QR ya no está disponible.';
  if (code.includes('already-exists')) return 'Esta operación ya se había realizado.';
  if (code.includes('resource-exhausted')) return 'El grupo ha alcanzado su límite de miembros.';
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const clean = error.message.replace(/^Firebase:\s*/i, '').slice(0, 180);
    if (clean) return clean;
  }
  return fallback;
}

function logBoundary(operation: string, status: 'started' | 'completed' | 'failed', startedAt: number, error?: unknown) {
  const payload = {
    event: 'group_callable',
    provider: 'firebase_functions',
    operation,
    status,
    durationMs: Date.now() - startedAt,
    ...(error ? { errorCode: errorCode(error) } : {}),
  };
  if (status === 'failed') console.warn(payload);
  else console.info(payload);
}

async function callFunction<Response>(name: string, args: unknown): Promise<Response> {
  const startedAt = Date.now();
  logBoundary(name, 'started', startedAt);
  try {
    const payload = args && typeof args === 'object' && !Array.isArray(args)
      ? Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined))
      : args;
    const response = await httpsCallable(functions, name)(payload);
    logBoundary(name, 'completed', startedAt);
    return response.data as Response;
  } catch (error) {
    logBoundary(name, 'failed', startedAt, error);
    throw error;
  }
}

function roleFor(group: Group, userId: string | null): GroupRole {
  if (userId === group.ownerId) return GROUP_ROLE.OWNER;
  if (userId && group.adminIds.includes(userId)) return GROUP_ROLE.ADMIN;
  return GROUP_ROLE.MEMBER;
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [qrsByGroup, setQrsByGroup] = useState<Record<string, GroupQr[]>>({});
  const [activityByGroup, setActivityByGroup] = useState<Record<string, GroupActivity[]>>({});
  const [sentTransactions, setSentTransactions] = useState<GroupSentTransaction[]>([]);
  const [receivedReceipts, setReceivedReceipts] = useState<GroupReceipt[]>([]);
  const [loading, setLoading] = useState(Boolean(auth.currentUser));
  const [historyReady, setHistoryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => onAuthStateChanged(auth, (user) => setCurrentUserId(user?.uid ?? null)), []);

  useEffect(() => {
    if (!currentUserId) {
      setGroups([]);
      setQrsByGroup({});
      setActivityByGroup({});
      setSentTransactions([]);
      setReceivedReceipts([]);
      setHistoryReady(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    return onSnapshot(
      query(collection(db, GROUP_COLLECTION.GROUPS), where('memberIds', 'array-contains', currentUserId)),
      (snapshot) => {
        setGroups(snapshot.docs.map(groupFromDoc).sort((a, b) => b.lastActivityAt - a.lastActivityAt));
        setLoading(false);
      },
      (snapshotError) => {
        console.warn({ event: 'group_snapshot', status: 'failed', step: 'groups', errorCode: errorCode(snapshotError) });
        setError(friendlyError(snapshotError, 'No se pudieron cargar tus grupos.'));
        setLoading(false);
      },
    );
  }, [currentUserId, retryKey]);

  useEffect(() => {
    if (groups.length === 0) {
      setQrsByGroup({});
      setActivityByGroup({});
      return;
    }

    const unsubscribers = groups.flatMap((group) => {
      const unsubscribeQrs = onSnapshot(
        query(collection(db, GROUP_COLLECTION.QRS), where('groupId', '==', group.id)),
        (snapshot) => setQrsByGroup((current) => ({
          ...current,
          [group.id]: snapshot.docs.map(qrFromDoc).sort((a, b) => b.createdAt - a.createdAt),
        })),
        (snapshotError) => {
          console.warn({ event: 'group_snapshot', status: 'failed', step: 'qrs', errorCode: errorCode(snapshotError) });
          setError(friendlyError(snapshotError, 'No se pudieron cargar los QRs del grupo.'));
        },
      );
      const unsubscribeActivity = onSnapshot(
        query(collection(db, GROUP_COLLECTION.ACTIVITY), where('groupId', '==', group.id)),
        (snapshot) => setActivityByGroup((current) => ({
          ...current,
          [group.id]: snapshot.docs.map(activityFromDoc).sort((a, b) => b.createdAt - a.createdAt),
        })),
        (snapshotError) => {
          console.warn({ event: 'group_snapshot', status: 'failed', step: 'activity', errorCode: errorCode(snapshotError) });
          setError(friendlyError(snapshotError, 'No se pudo cargar la actividad del grupo.'));
        },
      );
      return [unsubscribeQrs, unsubscribeActivity];
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [groups.map((group) => group.id).join('|'), retryKey]);

  useEffect(() => {
    if (!currentUserId) return;
    setHistoryReady(false);
    setSentTransactions([]);
    setReceivedReceipts([]);
    const historyError = (step: 'sent_transactions' | 'received_receipts') => (snapshotError: unknown) => {
      console.warn({ event: 'group_snapshot', status: 'failed', step, errorCode: errorCode(snapshotError) });
      setError(friendlyError(snapshotError, 'No se pudo cargar el historial grupal.'));
    };
    const unsubscribeSent = onSnapshot(
      query(collection(db, GROUP_COLLECTION.TRANSACTIONS), where('payerId', '==', currentUserId)),
      (snapshot) => setSentTransactions(snapshot.docs.flatMap((doc) => {
        const transaction = groupSentTransactionFromData(doc.id, doc.data());
        return transaction ? [transaction] : [];
      })),
      historyError('sent_transactions'),
    );
    const unsubscribeReceipts = onSnapshot(
      query(collection(db, GROUP_COLLECTION.RECEIPTS), where('recipientId', '==', currentUserId)),
      (snapshot) => {
        setReceivedReceipts(snapshot.docs.flatMap((doc) => {
          const receipt = groupReceiptFromData(doc.id, doc.data());
          return receipt ? [receipt] : [];
        }));
        setHistoryReady(true);
      },
      historyError('received_receipts'),
    );
    return () => {
      unsubscribeSent();
      unsubscribeReceipts();
    };
  }, [currentUserId, retryKey]);

  const action = useCallback(async (name: string, args: unknown, fallback: string): Promise<GroupActionResult> => {
    try {
      const data = await callFunction<{ ok?: boolean }>(name, args);
      if (data.ok === false) return { ok: false, error: fallback };
      return { ok: true };
    } catch (actionError) {
      return { ok: false, error: friendlyError(actionError, fallback) };
    }
  }, []);

  const actions: GroupActions = useMemo(() => ({
    async createGroup(name) {
      try {
        const data = await callFunction<{ ok?: boolean; id?: string; groupId?: string }>(GROUP_CALLABLE.CREATE, { name });
        const id = data.groupId ?? data.id;
        return id ? { ok: true, id } : { ok: false, error: 'El servidor no devolvió el grupo creado.' };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo crear el grupo.') };
      }
    },
    async rotateInvite(groupId) {
      try {
        const data = await callFunction<{ ok?: boolean; code?: string; inviteCode?: string; link?: string; joinUrl?: string }>(GROUP_CALLABLE.ROTATE_INVITE, { groupId });
        const code = data.code ?? data.inviteCode;
        if (!code) return { ok: false, error: 'El servidor no devolvió un código de invitación.' };
        return { ok: true, code, link: data.link ?? data.joinUrl ?? `ericpay://groups/join?code=${encodeURIComponent(code)}` };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo generar la invitación.') };
      }
    },
    async joinGroup(code) {
      try {
        const data = await callFunction<{ ok?: boolean; id?: string; groupId?: string }>(GROUP_CALLABLE.JOIN, { code });
        const id = data.groupId ?? data.id;
        return id ? { ok: true, id } : { ok: false, error: 'La invitación no devolvió un grupo válido.' };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo usar esta invitación.') };
      }
    },
    setParticipation: (groupId, active) => action(GROUP_CALLABLE.SET_PARTICIPATION, { groupId, active }, 'No se pudo cambiar tu participación.'),
    setMemberRole: (groupId, userId, role) => action(GROUP_CALLABLE.SET_MEMBER_ROLE, { groupId, memberId: userId, role }, 'No se pudo cambiar el rol.'),
    removeMember: (groupId, userId) => action(GROUP_CALLABLE.REMOVE_MEMBER, { groupId, memberId: userId }, 'No se pudo eliminar al miembro.'),
    leaveGroup: (groupId) => action(GROUP_CALLABLE.LEAVE, { groupId }, 'No se pudo abandonar el grupo.'),
    transferOwnership: (groupId, newOwnerId) => action(GROUP_CALLABLE.TRANSFER_OWNERSHIP, { groupId, newOwnerId }, 'No se pudo transferir la propiedad.'),
    archiveGroup: (groupId) => action(GROUP_CALLABLE.ARCHIVE, { groupId }, 'No se pudo archivar el grupo.'),
    async createGroupQr(args) {
      try {
        const data = await callFunction<{ ok?: boolean; id?: string; qrId?: string }>(GROUP_CALLABLE.CREATE_QR, args);
        const id = data.qrId ?? data.id;
        return id ? { ok: true, id } : { ok: false, error: 'El servidor no devolvió el QR creado.' };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo crear el QR fijo.') };
      }
    },
    deactivateGroupQr: (groupId, qrId) => action(GROUP_CALLABLE.DEACTIVATE_QR, { groupId, qrId }, 'No se pudo desactivar el QR.'),
    async previewPayment(args) {
      try {
        const data = await callFunction<Record<string, unknown>>(GROUP_CALLABLE.PREVIEW_PAYMENT, args);
        const source = data.preview && typeof data.preview === 'object' ? data.preview as Record<string, unknown> : data;
        if (typeof source.groupId !== 'string' || typeof source.groupName !== 'string' || typeof source.amountInCents !== 'number' || typeof source.recipientCount !== 'number') {
          return { ok: false, error: 'La previsualización recibida no es válida.' };
        }
        const preview: GroupPaymentPreview = {
          groupId: source.groupId,
          groupName: source.groupName,
          amountInCents: source.amountInCents,
          recipientCount: source.recipientCount,
          concept: typeof source.concept === 'string' ? source.concept : '',
          qrId: typeof source.qrId === 'string' ? source.qrId : undefined,
        };
        return { ok: true, preview };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo previsualizar el pago.') };
      }
    },
    async payGroup(args) {
      try {
        const data = await callFunction<Record<string, unknown>>(GROUP_CALLABLE.PAY, args);
        const source = data.receipt && typeof data.receipt === 'object' ? data.receipt as Record<string, unknown> : data;
        const transactionId = typeof source.transactionId === 'string'
          ? source.transactionId
          : typeof source.id === 'string' ? source.id : undefined;
        if (
          !transactionId
          || typeof source.groupId !== 'string'
          || typeof source.amountInCents !== 'number'
          || typeof source.recipientCount !== 'number'
          || typeof source.payerBalanceInCentsAfter !== 'number'
        ) {
          return { ok: false, error: 'El recibo recibido no es válido.' };
        }
        return {
          ok: true,
          transactionId,
          groupId: source.groupId,
          amountInCents: source.amountInCents,
          recipientCount: source.recipientCount,
          payerBalanceInCentsAfter: source.payerBalanceInCentsAfter,
          createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
        };
      } catch (actionError) {
        return { ok: false, error: friendlyError(actionError, 'No se pudo completar el pago.') };
      }
    },
  }), [action]);

  const history = useMemo<GroupHistoryItem[]>(() => {
    if (!currentUserId) return [];
    return buildGroupHistory(sentTransactions, receivedReceipts);
  }, [currentUserId, sentTransactions, receivedReceipts]);

  const value = useMemo<GroupContextValue>(() => ({
    groups,
    qrsByGroup,
    activityByGroup,
    history,
    currentUserId,
    loading,
    historyReady,
    error,
    retry: () => setRetryKey((current) => current + 1),
    ...actions,
  }), [groups, qrsByGroup, activityByGroup, history, currentUserId, loading, historyReady, error, actions]);

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups(): GroupContextValue {
  const context = useContext(GroupContext);
  if (!context) throw new Error('useGroups debe usarse dentro de GroupProvider');
  return context;
}

export function useGroup(groupId: string | undefined) {
  const context = useGroups();
  const group = context.groups.find((item) => item.id === groupId);
  return {
    ...context,
    group,
    qrs: groupId ? context.qrsByGroup[groupId] ?? [] : [],
    activity: groupId ? context.activityByGroup[groupId] ?? [] : [],
    role: group ? roleFor(group, context.currentUserId) : GROUP_ROLE.MEMBER,
  };
}

export function groupRole(group: Group, userId: string | null): GroupRole {
  return roleFor(group, userId);
}
