import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence: (
    storage: typeof AsyncStorage,
  ) => FirebaseAuth.Persistence;
};

const { getAuth, initializeAuth } = FirebaseAuth;
const { getReactNativePersistence } = FirebaseAuth as ReactNativeAuthModule;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar la app si no ha sido inicializada previamente.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Expo Go necesita persistencia explícita en React Native; en Web se conserva
// el adaptador estándar del navegador. El fallback cubre Fast Refresh.
const auth = Platform.OS === 'web'
  ? getAuth(app)
  : (() => {
      try {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      } catch {
        return getAuth(app);
      }
    })();
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1'); // Regla por defecto de Firebase Cloud Functions

export { app, auth, db, functions };
