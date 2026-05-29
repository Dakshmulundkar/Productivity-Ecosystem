import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProfileStore {
  name: string;
  hasOnboarded: boolean;
  setName: (name: string) => void;
  setHasOnboarded: (v: boolean) => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      name: "",
      hasOnboarded: false,
      setName: (name) => set({ name }),
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
