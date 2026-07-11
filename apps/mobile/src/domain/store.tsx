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
  doc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';

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
  loginWithEmailSimulated: (email: string) => Promise<Result>;
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
          initial: (data.displayName || 'U').charAt(0).toUpperCase(),
          balanceInCents: data.balanceInCents ?? 0,
          currency: data.currency || 'EUR',
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

  // 4. Escuchar transacciones del usuario actual (donde sea pagador o receptor)
  // Escuchamos por separado las enviadas y las recibidas para evitar requerir índices compuestos en Firestore
  useEffect(() => {
    if (!uid) return;

    let sentTxns: Transaction[] = [];
    let rcvdTxns: Transaction[] = [];

    const updateTransactions = () => {
      const merged = [...sentTxns, ...rcvdTxns];
      // Eliminar duplicados si existieran
      const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      // Ordenar por fecha descendente
      unique.sort((a, b) => b.createdAt - a.createdAt);
      setState((s) => ({ ...s, transactions: unique }));
    };

    const q1 = query(collection(db, 'transactions'), where('payerId', '==', uid));
    const unsubSent = onSnapshot(q1, (snapshot) => {
      sentTxns = [];
      snapshot.forEach((d) => {
        const data = d.data();
        sentTxns.push({
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
        });
      });
      updateTransactions();
    });

    const q2 = query(collection(db, 'transactions'), where('recipientId', '==', uid));
    const unsubRcvd = onSnapshot(q2, (snapshot) => {
      rcvdTxns = [];
      snapshot.forEach((d) => {
        const data = d.data();
        rcvdTxns.push({
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
        });
      });
      updateTransactions();
    });

    return () => {
      unsubSent();
      unsubRcvd();
    };
  }, [uid]);

  // Autenticación con Google Real (Web)
  async function loginWithGoogle(): Promise<Result> {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error en el login con Google.' };
    }
  }

  // Autenticación simulada por email (Nativo / Expo Go)
  async function loginWithEmailSimulated(email: string): Promise<Result> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Por favor, ingresa un correo electrónico válido.' };
    }

    const dummyPassword = 'password123'; // Contraseña fija interna para simulación

    try {
      // Intentar iniciar sesión
      await signInWithEmailAndPassword(auth, cleanEmail, dummyPassword);
      return { ok: true };
    } catch (error: any) {
      // Si el usuario no existe, lo creamos
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, dummyPassword);
          const displayName = cleanEmail.split('@')[0];
          // Asignar el displayName en Auth
          await updateProfile(credentials.user, { displayName });
          return { ok: true };
        } catch (createError: any) {
          return { ok: false, error: createError.message || 'Error al registrar el usuario.' };
        }
      }
      return { ok: false, error: error.message || 'Error de autenticación.' };
    }
  }

  async function logout() {
    await signOut(auth);
  }

  // Envolturas de funciones de backend (Cloud Functions v2)
  async function createOneTimeRequest(args: { amountInCents: number; concept: string }): Promise<CreateResult> {
    try {
      const func = httpsCallable(functions, 'createOneTimeRequest');
      const res = await func(args);
      const data = res.data as { ok: boolean; id: string };
      return data.ok ? { ok: true, id: data.id } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al crear solicitud.' };
    }
  }

  async function payOneTime(args: { requestId: string }): Promise<CreateResult> {
    try {
      const func = httpsCallable(functions, 'payOneTime');
      const res = await func(args);
      const data = res.data as { ok: boolean; id: string };
      return data.ok ? { ok: true, id: data.id } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al pagar.' };
    }
  }

  async function payPersonal(args: { recipientId: string; amountInCents: number; concept: string }): Promise<CreateResult> {
    try {
      const func = httpsCallable(functions, 'payPersonal');
      const res = await func(args);
      const data = res.data as { ok: boolean; id: string };
      return data.ok ? { ok: true, id: data.id } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al realizar el pago personal.' };
    }
  }

  async function createReusableQr(args: { name: string; amountInCents: number; description: string }): Promise<CreateResult> {
    try {
      const func = httpsCallable(functions, 'createReusableQr');
      const res = await func(args);
      const data = res.data as { ok: boolean; id: string };
      return data.ok ? { ok: true, id: data.id } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al crear QR reutilizable.' };
    }
  }

  async function payReusable(args: { qrId: string }): Promise<CreateResult> {
    try {
      const func = httpsCallable(functions, 'payReusable');
      const res = await func(args);
      const data = res.data as { ok: boolean; id: string };
      return data.ok ? { ok: true, id: data.id } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al pagar QR reutilizable.' };
    }
  }

  async function deactivateReusable(args: { qrId: string }): Promise<Result> {
    try {
      const func = httpsCallable(functions, 'deactivateReusable');
      const res = await func(args);
      const data = res.data as { ok: boolean };
      return data.ok ? { ok: true } : { ok: false, error: 'Error del servidor' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error al desactivar QR.' };
    }
  }

  const store: Store = {
    ...state,
    loginWithGoogle,
    loginWithEmailSimulated,
    logout,
    createOneTimeRequest,
    payOneTime,
    payPersonal,
    createReusableQr,
    payReusable,
    deactivateReusable,
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
  const { loading } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  return user;
}
