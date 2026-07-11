import { useRouter } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  DomainError,
  OneTimeRequest,
  OneTimeStatus,
  QrType,
  ReusableQr,
  Transaction,
  User,
} from './types';

const ONE_TIME_TTL_MS = 15 * 60 * 1000;

interface State {
  users: Record<string, User>;
  oneTimeRequests: Record<string, OneTimeRequest>;
  reusableQrs: Record<string, ReusableQr>;
  transactions: Transaction[];
  currentUserId: string | null;
}

function seed(): State {
  const users: Record<string, User> = {
    daniel: { id: 'daniel', displayName: 'Daniel', initial: 'D', balanceInCents: 100_000, currency: 'EUR' },
    laura: { id: 'laura', displayName: 'Laura', initial: 'L', balanceInCents: 100_000, currency: 'EUR' },
  };
  return { users, oneTimeRequests: {}, reusableQrs: {}, transactions: [], currentUserId: null };
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Estado derivado: una solicitud "pending" cuya expiración ya pasó se ve y se trata como expirada,
// sin necesidad de un job en segundo plano.
export function liveStatus(request: OneTimeRequest, now = Date.now()): OneTimeStatus {
  if (request.status === 'pending' && now > request.expiresAt) return 'expired';
  return request.status;
}

// --- Mutadores puros: (State, args) -> State. Lanzan DomainError con el mensaje que se muestra al usuario. ---
// Esta es la única capa de validación (RF-001 §16.5) — Fase 1 la traduce a Security Rules + Cloud Functions.

function mutCreateOneTimeRequest(
  s: State,
  args: { recipientId: string; amountInCents: number; concept: string }
): { state: State; id: string } {
  if (args.amountInCents <= 0) throw new DomainError('El monto debe ser mayor que cero.');
  const now = Date.now();
  const request: OneTimeRequest = {
    id: id('req'),
    recipientId: args.recipientId,
    amountInCents: args.amountInCents,
    currency: 'EUR',
    concept: args.concept.trim(),
    status: 'pending',
    createdAt: now,
    expiresAt: now + ONE_TIME_TTL_MS,
    paidAt: null,
    transactionId: null,
  };
  return { state: { ...s, oneTimeRequests: { ...s.oneTimeRequests, [request.id]: request } }, id: request.id };
}

function settle(s: State, payerId: string, recipientId: string, amountInCents: number): State {
  if (payerId === recipientId) throw new DomainError('No puedes pagarte a ti mismo.');
  const payer = s.users[payerId];
  const recipient = s.users[recipientId];
  if (!payer || !recipient) throw new DomainError('Usuario receptor inexistente.');
  if (payer.balanceInCents < amountInCents) throw new DomainError('Saldo insuficiente.');
  return {
    ...s,
    users: {
      ...s.users,
      [payerId]: { ...payer, balanceInCents: payer.balanceInCents - amountInCents },
      [recipientId]: { ...recipient, balanceInCents: recipient.balanceInCents + amountInCents },
    },
  };
}

function addTransaction(
  s: State,
  args: { qrType: QrType; qrReferenceId: string; payerId: string; recipientId: string; amountInCents: number; concept: string }
): { state: State; transaction: Transaction } {
  const transaction: Transaction = {
    id: id('txn'),
    status: 'completed',
    createdAt: Date.now(),
    currency: 'EUR',
    ...args,
  };
  return { state: { ...s, transactions: [transaction, ...s.transactions] }, transaction };
}

function mutPayOneTime(s: State, args: { requestId: string; payerId: string }): { state: State; id: string } {
  const request = s.oneTimeRequests[args.requestId];
  if (!request) throw new DomainError('QR inválido o desactivado.');
  const status = liveStatus(request);
  if (status === 'expired') throw new DomainError('Solicitud expirada.');
  if (status === 'paid') throw new DomainError('Solicitud ya pagada.');
  if (status === 'cancelled') throw new DomainError('QR inválido o desactivado.');

  const next = settle(s, args.payerId, request.recipientId, request.amountInCents);
  const { state: withTxn, transaction } = addTransaction(next, {
    qrType: 'one_time',
    qrReferenceId: request.id,
    payerId: args.payerId,
    recipientId: request.recipientId,
    amountInCents: request.amountInCents,
    concept: request.concept,
  });
  return {
    state: {
      ...withTxn,
      oneTimeRequests: {
        ...withTxn.oneTimeRequests,
        [request.id]: { ...request, status: 'paid', paidAt: Date.now(), transactionId: transaction.id },
      },
    },
    id: transaction.id,
  };
}

function mutPayPersonal(
  s: State,
  args: { recipientId: string; payerId: string; amountInCents: number; concept: string }
): { state: State; id: string } {
  if (args.amountInCents <= 0) throw new DomainError('El monto debe ser mayor que cero.');
  const next = settle(s, args.payerId, args.recipientId, args.amountInCents);
  const { state: withTxn, transaction } = addTransaction(next, {
    qrType: 'personal',
    qrReferenceId: args.recipientId,
    payerId: args.payerId,
    recipientId: args.recipientId,
    amountInCents: args.amountInCents,
    concept: args.concept.trim(),
  });
  return { state: withTxn, id: transaction.id };
}

function mutCreateReusableQr(
  s: State,
  args: { ownerId: string; name: string; amountInCents: number; description: string }
): { state: State; id: string } {
  if (args.amountInCents <= 0) throw new DomainError('El monto debe ser mayor que cero.');
  if (!args.name.trim()) throw new DomainError('El QR necesita un nombre.');
  const qr: ReusableQr = {
    id: id('qr'),
    ownerId: args.ownerId,
    name: args.name.trim(),
    description: args.description.trim(),
    amountInCents: args.amountInCents,
    currency: 'EUR',
    status: 'active',
    createdAt: Date.now(),
  };
  return { state: { ...s, reusableQrs: { ...s.reusableQrs, [qr.id]: qr } }, id: qr.id };
}

function mutPayReusable(s: State, args: { qrId: string; payerId: string }): { state: State; id: string } {
  const qr = s.reusableQrs[args.qrId];
  if (!qr) throw new DomainError('QR inválido o desactivado.');
  if (qr.status !== 'active') throw new DomainError('QR inválido o desactivado.');
  const next = settle(s, args.payerId, qr.ownerId, qr.amountInCents);
  const { state: withTxn, transaction } = addTransaction(next, {
    qrType: 'reusable',
    qrReferenceId: qr.id,
    payerId: args.payerId,
    recipientId: qr.ownerId,
    amountInCents: qr.amountInCents,
    concept: qr.name,
  });
  return { state: withTxn, id: transaction.id };
}

function mutDeactivateReusable(s: State, args: { qrId: string; ownerId: string }): State {
  const qr = s.reusableQrs[args.qrId];
  if (!qr || qr.ownerId !== args.ownerId) throw new DomainError('QR inválido o desactivado.');
  return { ...s, reusableQrs: { ...s.reusableQrs, [qr.id]: { ...qr, status: 'inactive' } } };
}

export type Result = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

interface Store extends State {
  login: (userId: string) => void;
  logout: () => void;
  createOneTimeRequest: (args: { recipientId: string; amountInCents: number; concept: string }) => CreateResult;
  payOneTime: (args: { requestId: string; payerId: string }) => CreateResult;
  payPersonal: (args: { recipientId: string; payerId: string; amountInCents: number; concept: string }) => CreateResult;
  createReusableQr: (args: { ownerId: string; name: string; amountInCents: number; description: string }) => CreateResult;
  payReusable: (args: { qrId: string; payerId: string }) => CreateResult;
  deactivateReusable: (args: { qrId: string; ownerId: string }) => Result;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(seed);
  // setState no garantiza ejecutar el updater de forma síncrona, así que las validaciones
  // (que pueden lanzar DomainError) corren sobre este snapshot, no dentro del updater.
  const latest = useRef(state);
  latest.current = state;

  function run(mutate: (s: State) => State): Result {
    try {
      const next = mutate(latest.current);
      latest.current = next;
      setState(next);
      return { ok: true };
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, error: e.message };
      throw e;
    }
  }

  function runCreate(mutate: (s: State) => { state: State; id: string }): CreateResult {
    try {
      const { state: next, id: newId } = mutate(latest.current);
      latest.current = next;
      setState(next);
      return { ok: true, id: newId };
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, error: e.message };
      throw e;
    }
  }

  const store: Store = {
    ...state,
    login: (userId) => setState((s) => ({ ...s, currentUserId: userId })),
    logout: () => setState((s) => ({ ...s, currentUserId: null })),
    createOneTimeRequest: (args) => runCreate((s) => mutCreateOneTimeRequest(s, args)),
    payOneTime: (args) => runCreate((s) => mutPayOneTime(s, args)),
    payPersonal: (args) => runCreate((s) => mutPayPersonal(s, args)),
    createReusableQr: (args) => runCreate((s) => mutCreateReusableQr(s, args)),
    payReusable: (args) => runCreate((s) => mutPayReusable(s, args)),
    deactivateReusable: (args) => run((s) => mutDeactivateReusable(s, args)),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}

export function useCurrentUser(): User | null {
  const { currentUserId, users } = useStore();
  return currentUserId ? users[currentUserId] : null;
}

// El estado vive solo en memoria: un refresco en web o volver a abrir la app lo vacía.
// Las pantallas protegidas usan esto para volver a /login en vez de romper con datos nulos.
export function useProtectedUser(): User | null {
  const user = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);
  return user;
}
