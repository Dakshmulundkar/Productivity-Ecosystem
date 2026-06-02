/**
 * Firebase Auth context for Vero.
 *
 * Supports:
 * - Email + password (login / signup)
 * - Google Sign-In (via GoogleAuthProvider)
 * - Email OTP / magic link (sendSignInLinkToEmail)
 * - Logout
 *
 * The `user` object exposed matches the shape the rest of the app expects.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ─── Google Sign-In — only available in native builds, not Expo Go / web ──────
// Importing the native module directly crashes on web and Expo Go because
// the TurboModule 'RNGoogleSignin' is not registered in those environments.
// We lazy-require it at call time so the module load never throws.
function getGoogleSignin() {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateUserAvatar: (photoURL: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OTP_EMAIL_KEY = "vero_otp_email";

function firebaseUserToUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    name: fbUser.displayName ?? undefined,
    avatar: fbUser.photoURL ?? undefined,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure Google Sign-In once on mount (native only)
  useEffect(() => {
    const gs = getGoogleSignin();
    if (!gs) return;
    gs.GoogleSignin.configure({
      webClientId:    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID    ?? "",
      iosClientId:    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID    ?? "",
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
      offlineAccess: true,
    });
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser ? firebaseUserToUser(fbUser) : null);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Email + password login ──
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          throw new Error("No account found with this email.");
        case "auth/wrong-password":
          throw new Error("Incorrect password. Please try again.");
        case "auth/too-many-requests":
          throw new Error("Too many attempts. Please try again later.");
        case "auth/user-disabled":
          throw new Error("This account has been disabled.");
        default:
          throw new Error("Login failed. Please check your credentials.");
      }
    }
  };

  // ── Email + password signup ──
  const signup = async (email: string, password: string, name: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      await updateProfile(cred.user, { displayName: name });
      // Force refresh so onAuthStateChanged picks up the display name
      setUser(firebaseUserToUser({ ...cred.user, displayName: name }));
    } catch (error: any) {
      switch (error.code) {
        case "auth/email-already-in-use":
          throw new Error("An account with this email already exists.");
        case "auth/invalid-email":
          throw new Error("Please enter a valid email address.");
        case "auth/weak-password":
          throw new Error("Password must be at least 6 characters.");
        default:
          throw new Error("Signup failed. Please try again.");
      }
    }
  };

  // ── Logout ──
  const logout = async () => {
    // 1. Log out from Firebase
    await signOut(auth);
    // 2. Log out from Google (if native) to allow account switching
    const gs = getGoogleSignin();
    if (gs) {
      try {
        await gs.GoogleSignin.signOut();
      } catch (e) {
        console.warn("Google Sign-out failed:", e);
      }
    }
  };

  // ── Google Sign-In ──
  const loginWithGoogle = async () => {
    const gs = getGoogleSignin();
    if (!gs) {
      throw new Error("Google Sign-In is not available in this environment. Please use a native build.");
    }
    const { GoogleSignin, statusCodes } = gs;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken ?? (signInResult as any).idToken;
      if (!idToken) throw new Error("No ID token from Google Sign-In");
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error("Google Sign-In was cancelled.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error("Google Sign-In already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play Services not available.");
      }
      throw error;
    }
  };

  // ── OTP / magic link ──
  const loginWithOTP = async (email: string) => {
    const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const bundleId   = process.env.EXPO_PUBLIC_APP_BUNDLE_ID;

    if (!authDomain || !bundleId) {
      throw new Error("App is not configured correctly. Missing environment variables.");
    }

    const actionCodeSettings = {
      // firebaseapp.com is always an authorized domain — no extra Firebase Console setup needed
      url: `https://${authDomain}/finishSignIn`,
      handleCodeInApp: true,
      iOS:     { bundleId },
      android: { packageName: bundleId, installIfNotInstalled: true },
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email so we can complete sign-in when the link is opened
    await AsyncStorage.setItem(OTP_EMAIL_KEY, email);
  };

  // ── Verify OTP / complete magic link ──
  const verifyOTP = async (email: string, _code: string) => {
    // For email link sign-in, the "code" is actually the full link URL
    // In practice, the app receives this via deep link in app/oauth/callback.tsx
    const savedEmail = (await AsyncStorage.getItem(OTP_EMAIL_KEY)) ?? email;
    if (isSignInWithEmailLink(auth, _code)) {
      await signInWithEmailLink(auth, savedEmail, _code);
      await AsyncStorage.removeItem(OTP_EMAIL_KEY);
    } else {
      throw new Error("Invalid sign-in link.");
    }
  };

  // ── Password reset ──
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-email":
          throw new Error("No account found with this email address.");
        case "auth/too-many-requests":
          throw new Error("Too many requests. Please try again later.");
        default:
          throw new Error("Failed to send reset email. Please try again.");
      }
    }
  };

  const updateUserName = async (name: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      setUser((prev) => (prev ? { ...prev, name } : null));
    }
  };

  const updateUserAvatar = async (photoURL: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL });
      setUser((prev) => (prev ? { ...prev, avatar: photoURL } : null));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    login,
    signup,
    logout,
    loginWithGoogle,
    loginWithOTP,
    verifyOTP,
    resetPassword,
    updateUserName,
    updateUserAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
