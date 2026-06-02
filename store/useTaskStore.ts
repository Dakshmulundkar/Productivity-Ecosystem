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
  limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { cleanFirestoreData } from "@/lib/utils";

export type Priority = "Low" | "Medium" | "High";
import { TaskSchema, type Task } from "@/shared/schemas";
export type { Task };
import { Alert } from "react-native";

interface TaskStore {
  tasks: Task[];
  _unsubscribe: (() => void) | null;
  _processingIds: Set<string>;

  addTask: (task: Omit<Task, "id" | "createdAt" | "done">) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  editTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => Promise<void>;
  subscribeToFirestore: (userId: string) => void;
  unsubscribeFromFirestore: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      _unsubscribe: null,
      _processingIds: new Set(),

      addTask: async (input) => {
        try {
          const id = Date.now().toString();
          const rawTask = { ...input, id, createdAt: Date.now(), done: false };
          
          // Validate before saving
          const newTask = TaskSchema.parse(rawTask);
          
          // Add locally with dirty flag
          const taskWithDirty = { ...newTask, _isDirty: true };
          set((s) => ({ tasks: [taskWithDirty, ...s.tasks] }));
          
          const uid = auth.currentUser?.uid;
          if (uid) {
            const data = cleanFirestoreData({
              ...newTask,
              updatedAt: serverTimestamp(),
            });
            await setDoc(doc(db, "users", uid, "tasks", id), data);

            // Sync success: clear dirty flag
            set((s) => ({
              tasks: s.tasks.map((t) => t.id === id ? { ...t, _isDirty: false } : (t as any))
            }));
          }
        } catch (error: any) {
          console.error("[TaskStore] Add failed:", error);
          Alert.alert("Error", error.message || "Failed to add task");
          // Rollback local state if desired, but here we just alert
        }
      },

      toggleTask: async (id) => {
        const uid = auth.currentUser?.uid;
        if (!uid || get()._processingIds.has(id)) return;
        
        get()._processingIds.add(id);
        const task = get().tasks.find((t) => t.id === id);
        if (!task) {
          get()._processingIds.delete(id);
          return;
        }

        const nextDone = !task.done;
        // Optimistic update + mark as Dirty to prevent server sync from overwriting it before it reaches Firestore
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: nextDone, _isDirty: true } : t)),
        }));

        try {
          await setDoc(doc(db, "users", uid, "tasks", id), { done: nextDone, updatedAt: serverTimestamp() }, { merge: true });
          // Success: stop protecting
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...(t as any), _isDirty: false } : t)),
          }));
        } catch (error: any) {
          console.error("[TaskStore] Toggle failed:", error);
          // Revert on error
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !nextDone } : t)),
          }));
          Alert.alert("Sync Error", "Could not update task on server");
        } finally {
          get()._processingIds.delete(id);
        }
      },

      deleteTask: async (id) => {
        try {
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
          const uid = auth.currentUser?.uid;
          if (uid) {
            await deleteDoc(doc(db, "users", uid, "tasks", id));
          }
        } catch (error: any) {
          console.error("[TaskStore] Delete failed:", error);
          Alert.alert("Error", "Failed to delete task");
        }
      },

      editTask: async (id, updates) => {
        try {
          set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
          const uid = auth.currentUser?.uid;
          if (uid) {
            const data = cleanFirestoreData({ 
              ...updates, 
              updatedAt: serverTimestamp() 
            });
            await updateDoc(doc(db, "users", uid, "tasks", id), data);
          }
        } catch (error: any) {
          console.error("[TaskStore] Edit failed:", error);
          Alert.alert("Error", "Failed to save changes");
        }
      },

      subscribeToFirestore: (userId) => {
        try {
          get()._unsubscribe?.();
          const q = query(
            collection(db, "users", userId, "tasks"),
            orderBy("createdAt", "desc"),
            limit(100),
          );
          const unsub = onSnapshot(
            q, 
            { includeMetadataChanges: false }, 
            (snap) => {
              const serverTasks = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }) as Task);
              
              set((state) => {
                const currentTasks = state.tasks || [];
                // Reconcile: Don't let server data overwrite tasks that are currently being edited locally
                const merged = serverTasks.map((sTask) => {
                  // Ensure mandatory fields exist
                  const task = {
                    ...sTask,
                    priority: sTask.priority || "Medium",
                    dueDateISO: sTask.dueDateISO || new Date().toISOString().slice(0, 10),
                    done: !!sTask.done,
                  };
                  const local = currentTasks.find((l) => l.id === task.id);
                  if (local && (local as any)._isDirty) return local;
                  return task;
                });
                
                // Keep local-only dirty tasks 
                const localOnlyDirty = currentTasks.filter(
                  (l) => (l as any)._isDirty && !serverTasks.some((st) => st.id === l.id)
                );
                
                return { tasks: [...merged, ...localOnlyDirty] };
              });
            },
            (error) => {
              console.error("[TaskStore] Subscription error:", error);
            }
          );
          set({ _unsubscribe: unsub });
        } catch (error: any) {
          console.error("[TaskStore] subscribeToFirestore failed:", error);
        }
      },

      unsubscribeFromFirestore: () => {
        get()._unsubscribe?.();
        set({ _unsubscribe: null, tasks: [] });
      },
    }),
    {
      name: "tasks-storage-v3",   // bumped version so old seed data is not loaded
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tasks: s.tasks }),
    },
  ),
);
