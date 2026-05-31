/**
 * Shared app types — Firebase-based.
 */

export interface AppUser {
  id: string;       // Firebase UID
  email: string;
  name?: string | null;
  avatar?: string | null;
}
