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

// In React Native, we must use initializeAuth with getReactNativePersistence
// to ensure the user stays logged in after the app is closed.
let _auth;
try {
  _auth = getAuth(app);
} catch (e) {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const auth = _auth;

export const db   = getFirestore(app);
export default app;
