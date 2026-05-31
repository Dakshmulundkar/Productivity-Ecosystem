/**
 * Firebase configuration and initialization.
 *
 * Uses the Expo-compatible Firebase JS SDK (v9 modular).
 * Set the EXPO_PUBLIC_FIREBASE_* variables in your .env file.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
