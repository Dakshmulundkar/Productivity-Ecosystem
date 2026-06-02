/**
 * Profile store — Zustand with Firestore sync.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  onSnapshot 
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { cleanFirestoreData } from "@/lib/utils";

interface ProfileStore {
  name: string;
  hasOnboarded: boolean;
  setName: (name: string) => Promise<void>;
  setHasOnboarded: (v: boolean) => Promise<void>;
  syncFromFirestore: () => void;
  unsubscribeFromFirestore: () => void;
  clearStore: () => void;
  _unsubscribe: (() => void) | null;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      name: "",
      hasOnboarded: false,

      setName: async (name) => {
        set({ name });
        const uid = auth.currentUser?.uid;
        if (uid) {
          const data = cleanFirestoreData({ name, updatedAt: serverTimestamp() });
          await setDoc(doc(db, "users", uid, "profile", "data"), data, { merge: true });
        }
      },

      setHasOnboarded: async (v) => {
        set({ hasOnboarded: v });
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "profile", "data"), { hasOnboarded: v, updatedAt: serverTimestamp() }, { merge: true });
        }
      },

      syncFromFirestore: () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) return;
          const uid = currentUser.uid;
          
          get().unsubscribeFromFirestore();

          const unsub = onSnapshot(
            doc(db, "users", uid, "profile", "data"), 
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                set({ 
                  name: data.name ?? get().name, 
                  hasOnboarded: data.hasOnboarded ?? get().hasOnboarded 
                });
              } else {
                // Fallback to Firebase Auth displayName if Firestore doc hasn't been created yet
                const authName = auth.currentUser?.displayName;
                if (authName && !get().name) {
                  set({ name: authName });
                }
              }
            },
            (error) => console.error("[ProfileStore] Sync error:", error)
          );
          
          set({ _unsubscribe: unsub });
        } catch (error) {
          console.error("[ProfileStore] syncFromFirestore failed:", error);
        }
      },

      unsubscribeFromFirestore: () => {
        get()._unsubscribe?.();
        set({ _unsubscribe: null });
      },

      clearStore: () => {
        get().unsubscribeFromFirestore();
        set({ name: "", _unsubscribe: null });
      },
      _unsubscribe: null,
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ name: s.name, hasOnboarded: s.hasOnboarded }),
    },
  ),
);
