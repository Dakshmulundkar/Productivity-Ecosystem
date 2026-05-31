/**
 * Profile store — Zustand with Firestore sync.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface ProfileStore {
  name: string;
  hasOnboarded: boolean;
  setName: (name: string) => Promise<void>;
  setHasOnboarded: (v: boolean) => Promise<void>;
  syncFromFirestore: () => Promise<void>;
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
          await setDoc(doc(db, "users", uid, "profile", "data"), { name, updatedAt: serverTimestamp() }, { merge: true });
        }
      },

      setHasOnboarded: async (v) => {
        set({ hasOnboarded: v });
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "profile", "data"), { hasOnboarded: v, updatedAt: serverTimestamp() }, { merge: true });
        }
      },

      syncFromFirestore: async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid, "profile", "data"));
        if (snap.exists()) {
          const data = snap.data();
          set({ name: data.name ?? get().name, hasOnboarded: data.hasOnboarded ?? get().hasOnboarded });
        }
      },
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ name: s.name, hasOnboarded: s.hasOnboarded }),
    },
  ),
);
