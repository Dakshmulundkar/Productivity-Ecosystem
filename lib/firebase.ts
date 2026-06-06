/**
 * Firebase configuration and initialization.
 *
 * Uses the Expo-compatible Firebase JS SDK (v9 modular).
 * Set the EXPO_PUBLIC_FIREBASE_* variables in your .env file.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth — initializeAuth with AsyncStorage persistence keeps the user logged in
// after the app is closed. Falls back to getAuth on hot-reload.
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  _auth = getAuth(app);
}

export const auth = _auth;

// Firestore — plain getFirestore works correctly on React Native.
// NOTE: persistentLocalCache (IndexedDB) is NOT supported on React Native and
// crashes the app on startup. Offline resilience is handled at the store layer
// via Zustand + AsyncStorage (all writes are fire-and-forget with local state
// as source of truth, so data survives offline and syncs when reconnected).
export const db = getFirestore(app);

export default app;
