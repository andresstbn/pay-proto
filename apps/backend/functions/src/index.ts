import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions/v1';

initializeApp();
const db = getFirestore();

// Helper to generate custom IDs (like those in domain/store.tsx)
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 1. Auth Trigger (v1 style background trigger): Se ejecuta automáticamente al registrar un nuevo usuario.
// Inicializa su perfil en Firestore con un saldo inicial ficticio de €1.000,00.
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  if (!user) return;

  const uid = user.uid;
  const userRef = db.collection('users').doc(uid);

  const doc = await userRef.get();
  if (doc.exists) return; // Si ya existe, no hacemos nada.

  // Nombre inicial: displayName, o extraído del email, o 'Usuario'
  let displayName = user.displayName;
  if (!displayName && user.email) {
    displayName = user.email.split('@')[0];
  }
  if (!displayName) {
    displayName = 'Usuario';
  }

  await userRef.set({
    id: uid,
    displayName: displayName,
    email: user.email || '',
    photoUrl: user.photoURL || '',
    balanceInCents: 100_000, // Saldo inicial: €1.000,00 (RF-001 §5)
    currency: 'EUR',
    createdAt: FieldValue.serverTimestamp(),
  });
});

// 2. Cloud Function: Crear cobro puntual (OneTimeRequest)
export const createOneTimeRequest = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { amountInCents, concept } = request.data as { amountInCents: number; concept: string };
  if (typeof amountInCents !== 'number' || amountInCents <= 0) {
    throw new HttpsError('invalid-argument', 'El monto debe ser mayor que cero.');
  }

  const cleanConcept = (concept || '').trim();
  const requestId = generateId('req');
  const now = Date.now();
  const ONE_TIME_TTL_MS = 15 * 60 * 1000; // 15 minutos de vigencia (RF-001 §7)

  const oneTimeRef = db.collection('oneTimeRequests').doc(requestId);
  await oneTimeRef.set({
    id: requestId,
    recipientId: auth.uid,
    amountInCents: amountInCents,
    currency: 'EUR',
    concept: cleanConcept,
    status: 'pending',
    createdAt: now,
    expiresAt: now + ONE_TIME_TTL_MS,
    paidAt: null,
    transactionId: null,
  });

  return { ok: true, id: requestId };
});

// 3. Cloud Function: Pagar cobro puntual (OneTimeRequest)
export const payOneTime = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { requestId } = request.data as { requestId: string };
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'Se requiere el identificador de cobro (requestId).');
  }

  const payerId = auth.uid;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const requestRef = db.collection('oneTimeRequests').doc(requestId);
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists) {
        throw new HttpsError('not-found', 'QR inválido o desactivado.');
      }

      const reqData = requestDoc.data()!;
      
      // Validaciones del cobro puntual
      const now = Date.now();
      if (reqData.status === 'paid') {
        throw new HttpsError('failed-precondition', 'Solicitud ya pagada.');
      }
      if (reqData.status === 'cancelled' || reqData.status === 'expired') {
        throw new HttpsError('failed-precondition', 'QR inválido o desactivado.');
      }
      if (now > reqData.expiresAt) {
        throw new HttpsError('failed-precondition', 'Solicitud expirada.');
      }

      const recipientId = reqData.recipientId;
      if (payerId === recipientId) {
        throw new HttpsError('failed-precondition', 'No puedes pagarte a ti mismo.');
      }

      const amount = reqData.amountInCents;

      // Obtener usuarios e interactuar con saldos
      const payerRef = db.collection('users').doc(payerId);
      const recipientRef = db.collection('users').doc(recipientId);

      const payerDoc = await transaction.get(payerRef);
      const recipientDoc = await transaction.get(recipientRef);

      if (!payerDoc.exists || !recipientDoc.exists) {
        throw new HttpsError('not-found', 'Usuario receptor inexistente.');
      }

      const payerData = payerDoc.data()!;
      if (payerData.balanceInCents < amount) {
        throw new HttpsError('failed-precondition', 'Saldo insuficiente.');
      }

      // Generar ID de transacción
      const txnId = generateId('txn');
      const txnRef = db.collection('transactions').doc(txnId);

      // 1. Descontar saldo pagador
      transaction.update(payerRef, {
        balanceInCents: FieldValue.increment(-amount),
      });

      // 2. Incrementar saldo receptor
      transaction.update(recipientRef, {
        balanceInCents: FieldValue.increment(amount),
      });

      // 3. Crear registro de transacción
      transaction.set(txnRef, {
        id: txnId,
        qrType: 'one_time',
        qrReferenceId: requestId,
        payerId: payerId,
        recipientId: recipientId,
        amountInCents: amount,
        currency: 'EUR',
        concept: reqData.concept,
        status: 'completed',
        createdAt: Date.now(),
      });

      // 4. Actualizar estado del cobro puntual a pagado
      transaction.update(requestRef, {
        status: 'paid',
        paidAt: Date.now(),
        transactionId: txnId,
      });

      return { transactionId: txnId };
    });

    return { ok: true, id: result.transactionId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Error al procesar el pago.');
  }
});

// 4. Cloud Function: Pagar a QR personal (Monto Abierto)
export const payPersonal = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { recipientId, amountInCents, concept } = request.data as {
    recipientId: string;
    amountInCents: number;
    concept: string;
  };

  if (!recipientId || typeof amountInCents !== 'number' || amountInCents <= 0) {
    throw new HttpsError('invalid-argument', 'Monto o receptor inválidos.');
  }

  const payerId = auth.uid;
  if (payerId === recipientId) {
    throw new HttpsError('failed-precondition', 'No puedes pagarte a ti mismo.');
  }

  const cleanConcept = (concept || '').trim();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const payerRef = db.collection('users').doc(payerId);
      const recipientRef = db.collection('users').doc(recipientId);

      const payerDoc = await transaction.get(payerRef);
      const recipientDoc = await transaction.get(recipientRef);

      if (!payerDoc.exists || !recipientDoc.exists) {
        throw new HttpsError('not-found', 'Usuario receptor inexistente.');
      }

      const payerData = payerDoc.data()!;
      if (payerData.balanceInCents < amountInCents) {
        throw new HttpsError('failed-precondition', 'Saldo insuficiente.');
      }

      const txnId = generateId('txn');
      const txnRef = db.collection('transactions').doc(txnId);

      // 1. Descontar saldo pagador
      transaction.update(payerRef, {
        balanceInCents: FieldValue.increment(-amountInCents),
      });

      // 2. Incrementar saldo receptor
      transaction.update(recipientRef, {
        balanceInCents: FieldValue.increment(amountInCents),
      });

      // 3. Crear transacción
      transaction.set(txnRef, {
        id: txnId,
        qrType: 'personal',
        qrReferenceId: recipientId,
        payerId: payerId,
        recipientId: recipientId,
        amountInCents: amountInCents,
        currency: 'EUR',
        concept: cleanConcept,
        status: 'completed',
        createdAt: Date.now(),
      });

      return { transactionId: txnId };
    });

    return { ok: true, id: result.transactionId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Error al procesar el pago.');
  }
});

// 5. Cloud Function: Crear un QR reutilizable
export const createReusableQr = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { name, amountInCents, description } = request.data as {
    name: string;
    amountInCents: number;
    description: string;
  };

  if (!name || !name.trim()) {
    throw new HttpsError('invalid-argument', 'El QR necesita un nombre.');
  }
  if (typeof amountInCents !== 'number' || amountInCents <= 0) {
    throw new HttpsError('invalid-argument', 'El monto debe ser mayor que cero.');
  }

  const qrId = generateId('qr');
  const qrRef = db.collection('reusableQrs').doc(qrId);

  await qrRef.set({
    id: qrId,
    ownerId: auth.uid,
    name: name.trim(),
    description: (description || '').trim(),
    amountInCents: amountInCents,
    currency: 'EUR',
    status: 'active',
    createdAt: Date.now(),
  });

  return { ok: true, id: qrId };
});

// 6. Cloud Function: Pagar a QR reutilizable
export const payReusable = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { qrId } = request.data as { qrId: string };
  if (!qrId) {
    throw new HttpsError('invalid-argument', 'Se requiere el identificador de QR (qrId).');
  }

  const payerId = auth.uid;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const qrRef = db.collection('reusableQrs').doc(qrId);
      const qrDoc = await transaction.get(qrRef);

      if (!qrDoc.exists) {
        throw new HttpsError('not-found', 'QR inválido o desactivado.');
      }

      const qrData = qrDoc.data()!;
      if (qrData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'QR inválido o desactivado.');
      }

      const recipientId = qrData.ownerId;
      if (payerId === recipientId) {
        throw new HttpsError('failed-precondition', 'No puedes pagarte a ti mismo.');
      }

      const amount = qrData.amountInCents;

      // Obtener perfiles de usuario
      const payerRef = db.collection('users').doc(payerId);
      const recipientRef = db.collection('users').doc(recipientId);

      const payerDoc = await transaction.get(payerRef);
      const recipientDoc = await transaction.get(recipientRef);

      if (!payerDoc.exists || !recipientDoc.exists) {
        throw new HttpsError('not-found', 'Usuario receptor inexistente.');
      }

      const payerData = payerDoc.data()!;
      if (payerData.balanceInCents < amount) {
        throw new HttpsError('failed-precondition', 'Saldo insuficiente.');
      }

      const txnId = generateId('txn');
      const txnRef = db.collection('transactions').doc(txnId);

      // 1. Descontar saldo pagador
      transaction.update(payerRef, {
        balanceInCents: FieldValue.increment(-amount),
      });

      // 2. Incrementar saldo receptor
      transaction.update(recipientRef, {
        balanceInCents: FieldValue.increment(amount),
      });

      // 3. Crear transacción
      transaction.set(txnRef, {
        id: txnId,
        qrType: 'reusable',
        qrReferenceId: qrId,
        payerId: payerId,
        recipientId: recipientId,
        amountInCents: amount,
        currency: 'EUR',
        concept: qrData.name,
        status: 'completed',
        createdAt: Date.now(),
      });

      return { transactionId: txnId };
    });

    return { ok: true, id: result.transactionId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Error al procesar el pago.');
  }
});

// 7. Cloud Function: Desactivar un QR reutilizable
export const deactivateReusable = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  const { qrId } = request.data as { qrId: string };
  if (!qrId) {
    throw new HttpsError('invalid-argument', 'Se requiere el identificador de QR (qrId).');
  }

  const qrRef = db.collection('reusableQrs').doc(qrId);
  const qrDoc = await qrRef.get();

  if (!qrDoc.exists) {
    throw new HttpsError('not-found', 'QR inválido o desactivado.');
  }

  const qrData = qrDoc.data()!;
  if (qrData.ownerId !== auth.uid) {
    throw new HttpsError('permission-denied', 'No tienes permiso para desactivar este QR.');
  }

  await qrRef.update({
    status: 'inactive',
  });

  return { ok: true };
});

// 8. Cloud Function: Obtener todos los usuarios y transacciones para el dashboard
export const adminGetDashboardData = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'El usuario debe estar autenticado.');
  }

  try {
    // 1. Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    const usersList: any[] = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      usersList.push({
        id: doc.id,
        displayName: data.displayName || 'Usuario',
        email: data.email || '',
        photoUrl: data.photoUrl || '',
        balanceInCents: data.balanceInCents ?? 0,
        currency: data.currency || 'EUR',
      });
    });

    // 2. Obtener todas las transacciones
    const transactionsSnapshot = await db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactionsList: any[] = [];
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      transactionsList.push({
        id: doc.id,
        qrType: data.qrType || 'unknown',
        qrReferenceId: data.qrReferenceId || '',
        payerId: data.payerId || '',
        recipientId: data.recipientId || '',
        amountInCents: data.amountInCents ?? 0,
        currency: data.currency || 'EUR',
        concept: data.concept || '',
        status: data.status || 'completed',
        createdAt: data.createdAt || 0,
      });
    });

    return {
      ok: true,
      users: usersList,
      transactions: transactionsList,
    };
  } catch (err: any) {
    throw new HttpsError('internal', err.message || 'Error al obtener datos del dashboard.');
  }
});

