/**
 * Firebase configuration and initialization.
 *
 * Uses the Expo-compatible Firebase JS SDK (v9 modular).
 * Set the EXPO_PUBLIC_FIREBASE_* variables in your .env file.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-ignore - getReactNativePersistence is sometimes not exported in the main entry point's types
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  memoryLocalCache,
} from "firebase/firestore";
import { Platform } from "react-native";

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

// Auth — must use initializeAuth with AsyncStorage persistence on React Native
// so the user stays logged in after the app is closed.
// initializeAuth throws on hot-reload (already initialized), so we fall back to getAuth.
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  _auth = getAuth(app);
}

export const auth = _auth;

// Firestore — enable offline persistence so all reads/writes work offline
// and sync automatically when connectivity is restored.
let _db: ReturnType<typeof getFirestore>;
try {
  _db = initializeFirestore(app, {
    localCache: Platform.OS === "web"
      ? memoryLocalCache()
      : persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }),
  });
} catch (e) {
  // Already initialized (hot reload) — get the existing instance
  _db = getFirestore(app);
}

export const db = _db;
export default app;
