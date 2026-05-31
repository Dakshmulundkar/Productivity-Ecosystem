/**
 * Auth utilities — Firebase-based.
 *
 * Firebase manages tokens automatically. These helpers are kept as thin
 * wrappers so existing imports don't break. The actual auth state is
 * managed by lib/auth-context.tsx via onAuthStateChanged.
 */
import { auth } from "@/lib/firebase";

export type User = {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
};

/** Get the current Firebase ID token (refreshed automatically). */
export async function getSessionToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** No-op — Firebase manages token storage internally. */
export async function setSessionToken(_token: string): Promise<void> {}

/** No-op — Firebase manages token removal via signOut(). */
export async function removeSessionToken(): Promise<void> {}

/** Get current user info from Firebase auth state. */
export async function getUserInfo(): Promise<User | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email ?? "",
    name: user.displayName,
    avatar: user.photoURL,
  };
}

/** No-op — Firebase manages user info internally. */
export async function setUserInfo(_user: User): Promise<void> {}

/** No-op — Firebase manages cleanup via signOut(). */
export async function clearUserInfo(): Promise<void> {}
