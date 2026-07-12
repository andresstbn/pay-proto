import { useRouter } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from './firebase';
import {
  OneTimeRequest,
  OneTimeStatus,
  ReusableQr,
  Transaction,
  User,
} from './types';

export type Result = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

interface StoreState {
  users: Record<string, User>;
  oneTimeRequests: Record<string, OneTimeRequest>;
  reusableQrs: Record<string, ReusableQr>;
  transactions: Transaction[];
  currentUserId: string | null;
  loading: boolean;
}

interface Store extends StoreState {
  loginWithGoogle: () => Promise<Result>;
  loginWithEmail: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  createOneTimeRequest: (args: { amountInCents: number; concept: string }) => Promise<CreateResult>;
  payOneTime: (args: { requestId: string }) => Promise<CreateResult>;
  payPersonal: (args: { recipientId: string; amountInCents: number; concept: string }) => Promise<CreateResult>;
  createReusableQr: (args: { name: string; amountInCents: number; description: string }) => Promise<CreateResult>;
  payReusable: (args: { qrId: string }) => Promise<CreateResult>;
  deactivateReusable: (args: { qrId: string }) => Promise<Result>;
}

const StoreContext = createContext<Store | null>(null);

// Estado derivado de expiración (RF-001 §7)
export function liveStatus(request: OneTimeRequest, now = Date.now()): OneTimeStatus {
  if (request.status === 'pending' && now > request.expiresAt) return 'expired';
  return request.status;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    users: {},
    oneTimeRequests: {},
    reusableQrs: {},
    transactions: [],
    currentUserId: null,
    loading: true,
  });

  const router = useRouter();

  // 1. Escuchar el estado de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setState((s) => ({ ...s, currentUserId: firebaseUser.uid, loading: false }));
      } else {
        setState((s) => ({
          ...s,
          currentUserId: null,
          loading: false,
          transactions: [],
          oneTimeRequests: {},
          reusableQrs: {},
        }));
      }
    });
    return unsubscribe;
  }, []);

  const uid = state.currentUserId;

  // 2. Escuchar la colección de usuarios en tiempo real (si está autenticado)
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap: Record<string, User> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        usersMap[d.id] = {
          id: d.id,
          displayName: data.displayName || 'Usuario',
          balanceInCents: data.balanceInCents ?? 0,
          currency: data.currency || 'EUR',
          photoUrl: data.photoUrl || '',
        };
      });
      setState((s) => ({ ...s, users: usersMap }));
    });
    return unsubscribe;
  }, [uid]);

  // 3. Escuchar cobros puntuales y QRs reutilizables
  useEffect(() => {
    if (!uid) return;

    const unsubRequests = onSnapshot(collection(db, 'oneTimeRequests'), (snapshot) => {
      const map: Record<string, OneTimeRequest> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          id: d.id,
          recipientId: data.recipientId,
          amountInCents: data.amountInCents,
          currency: data.currency,
          concept: data.concept,
          status: data.status,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          paidAt: data.paidAt,
          transactionId: data.transactionId,
        };
      });
      setState((s) => ({ ...s, oneTimeRequests: map }));
    });

    const unsubReusables = onSnapshot(collection(db, 'reusableQrs'), (snapshot) => {
      const map: Record<string, ReusableQr> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          id: d.id,
          ownerId: data.ownerId,
          name: data.name,
          description: data.description,
          amountInCents: data.amountInCents,
          currency: data.currency,
          status: data.status,
          createdAt: data.createdAt,
        };
      });
      setState((s) => ({ ...s, reusableQrs: map }));
    });

    return () => {
      unsubRequests();
      unsubReusables();
    };
  }, [uid]);

  // 4. Escuchar transacciones del usuario actual (donde sea pagador o receptor).
  // Dos consultas separadas fusionadas en cliente para no requerir índices compuestos (D-010).
  useEffect(() => {
    if (!uid) return;

    const txnFromDoc = (d: QueryDocumentSnapshot): Transaction => {
      const data = d.data();
      return {
        id: d.id,
        qrType: data.qrType,
        qrReferenceId: data.qrReferenceId,
        payerId: data.payerId,
        recipientId: data.recipientId,
        amountInCents: data.amountInCents,
        currency: data.currency || 'EUR',
        concept: data.concept,
        status: data.status,
        createdAt: data.createdAt,
      };
    };

    let sentTxns: Transaction[] = [];
    let rcvdTxns: Transaction[] = [];

    const updateTransactions = () => {
      const unique = Array.from(new Map([...sentTxns, ...rcvdTxns].map((t) => [t.id, t])).values());
      unique.sort((a, b) => b.createdAt - a.createdAt);
      setState((s) => ({ ...s, transactions: unique }));
    };

    const unsubSent = onSnapshot(query(collection(db, 'transactions'), where('payerId', '==', uid)), (snap) => {
      sentTxns = snap.docs.map(txnFromDoc);
      updateTransactions();
    });
    const unsubRcvd = onSnapshot(query(collection(db, 'transactions'), where('recipientId', '==', uid)), (snap) => {
      rcvdTxns = snap.docs.map(txnFromDoc);
      updateTransactions();
    });

    return () => {
      unsubSent();
      unsubRcvd();
    };
  }, [uid]);

  // Autenticación con Google real (popup) — solo Web; el botón no se muestra en móvil (D-014).
  // ponytail: Google real en móvil requiere development build + OAuth nativo; se hará si un incremento lo pide.
  async function loginWithGoogle(): Promise<Result> {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error en el login con Google.' };
    }
  }

  // Autenticación con email y contraseña. Si el email no existe, registra la cuenta.
  async function loginWithEmail(email: string, password: string): Promise<Result> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Por favor, ingresa un correo electrónico válido.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      return { ok: true };
    } catch (error: any) {
      // auth/invalid-credential cubre tanto "usuario no existe" como "contraseña incorrecta";
      // intentamos registrar y, si el email ya existe, era contraseña incorrecta.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const displayName = cleanEmail.split('@')[0];
          await updateProfile(credentials.user, { displayName });
          return { ok: true };
        } catch (createError: any) {
          if (createError.code === 'auth/email-already-in-use') {
            return { ok: false, error: 'Contraseña incorrecta.' };
          }
          return { ok: false, error: createError.message || 'Error al registrar el usuario.' };
        }
      }
      return { ok: false, error: error.message || 'Error de autenticación.' };
    }
  }

  async function logout() {
    await signOut(auth);
  }

  // Todas las Cloud Functions comparten el mismo contrato { ok, id? } y manejo de errores.
  async function callFn(name: string, args: unknown, fallbackError: string): Promise<CreateResult> {
    try {
      const res = await httpsCallable(functions, name)(args);
      const data = res.data as { ok: boolean; id?: string };
      return data.ok ? { ok: true, id: data.id ?? '' } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || fallbackError };
    }
  }

  const store: Store = {
    ...state,
    loginWithGoogle,
    loginWithEmail,
    logout,
    createOneTimeRequest: (args) => callFn('createOneTimeRequest', args, 'Error al crear solicitud.'),
    payOneTime: (args) => callFn('payOneTime', args, 'Error al pagar.'),
    payPersonal: (args) => callFn('payPersonal', args, 'Error al realizar el pago personal.'),
    createReusableQr: (args) => callFn('createReusableQr', args, 'Error al crear QR reutilizable.'),
    payReusable: (args) => callFn('payReusable', args, 'Error al pagar QR reutilizable.'),
    deactivateReusable: (args) => callFn('deactivateReusable', args, 'Error al desactivar QR.'),
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

export function useProtectedUser(): User | null {
  const user = useCurrentUser();
  const { loading, currentUserId } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUserId === null) {
      router.replace('/login');
    }
  }, [currentUserId, loading]);

  return user;
}
