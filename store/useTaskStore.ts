/**
 * Task store — Zustand with Firestore sync.
 *
 * - Local state is managed by Zustand (instant UI updates)
 * - Firestore is used for cloud persistence and cross-device sync
 * - When user is not signed in, data stays local only
 * - No seed/demo data — starts empty, user creates their own tasks
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

export type Priority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDateISO: string;   // YYYY-MM-DD — never shifts
  done: boolean;
  createdAt: number;
}

interface TaskStore {
  tasks: Task[];
  _unsubscribe: Unsubscribe | null;

  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  editTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => Promise<void>;
  subscribeToFirestore: (userId: string) => void;
  unsubscribeFromFirestore: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],          // ← starts empty, no fake seed data
      _unsubscribe: null,

      addTask: async (task) => {
        const id = Date.now().toString();
        const newTask: Task = { ...task, id, createdAt: Date.now() };
        // Optimistic update — home page sees it instantly via Zustand
        set((s) => ({ tasks: [newTask, ...s.tasks] }));
        // Sync to Firestore if signed in
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "tasks", id), {
            ...newTask,
            updatedAt: serverTimestamp(),
          });
        }
      },

      toggleTask: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const done = !task.done;
        set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, done } : t) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await updateDoc(doc(db, "users", uid, "tasks", id), { done, updatedAt: serverTimestamp() });
        }
      },

      deleteTask: async (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await deleteDoc(doc(db, "users", uid, "tasks", id));
        }
      },

      editTask: async (id, updates) => {
        set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await updateDoc(doc(db, "users", uid, "tasks", id), { ...updates, updatedAt: serverTimestamp() });
        }
      },

      subscribeToFirestore: (userId) => {
        get()._unsubscribe?.();
        const q = query(
          collection(db, "users", userId, "tasks"),
          orderBy("createdAt", "desc"),
        );
        const unsub = onSnapshot(q, (snap) => {
          // Replace local state with Firestore truth (handles multi-device sync)
          const tasks: Task[] = snap.docs.map((d) => d.data() as Task);
          set({ tasks });
        });
        set({ _unsubscribe: unsub });
      },

      unsubscribeFromFirestore: () => {
        get()._unsubscribe?.();
        set({ _unsubscribe: null });
      },
    }),
    {
      name: "tasks-storage-v3",   // bumped version so old seed data is not loaded
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tasks: s.tasks }),
    },
  ),
);
