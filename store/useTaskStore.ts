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
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { cleanFirestoreData } from "@/lib/utils";

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }

export type Priority = "Low" | "Medium" | "High";
import { TaskSchema, type Task } from "@/shared/schemas";
export type { Task };
import { Alert } from "react-native";

interface TaskStore {
  tasks: Task[];
  _unsubscribe: (() => void) | null;
  // Plain Record instead of Set — Sets are not JSON-serializable and get
  // silently corrupted when rehydrated from AsyncStorage.
  _processingIds: Record<string, boolean>;

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
      _processingIds: {},

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
            // Fire-and-forget: Firestore offline cache queues this automatically
            // and syncs when connectivity is restored. Do not await — it would
            // hang forever when offline.
            setDoc(doc(db, "users", uid, "tasks", id), data).then(() => {
              set((s) => ({
                tasks: s.tasks.map((t) => t.id === id ? { ...t, _isDirty: false } : (t as any))
              }));
            }).catch((e) => {
              console.warn("[TaskStore] addTask Firestore write failed (will retry when online):", e);
            });
          }
        } catch (error: any) {
          console.error("[TaskStore] Add failed:", error);
          Alert.alert("Error", error.message || "Failed to add task");
          // Rollback local state if desired, but here we just alert
        }
      },

      toggleTask: async (id) => {
        const uid = auth.currentUser?.uid;
        if (!uid || get()._processingIds[id] === true) return;
        
        get()._processingIds[id] = true;
        const task = get().tasks.find((t) => t.id === id);
        if (!task) {
          const ids = { ...get()._processingIds };
          delete ids[id];
          set({ _processingIds: ids });
          return;
        }

        const nextDone = !task.done;
        // Optimistic update immediately — UI feels instant
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: nextDone, _isDirty: true } : t)),
        }));

        // Fire-and-forget — Firestore offline cache queues this and syncs when online
        setDoc(doc(db, "users", uid, "tasks", id), { done: nextDone, updatedAt: serverTimestamp() }, { merge: true })
          .then(() => {
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === id ? { ...(t as any), _isDirty: false } : t)),
            }));
          })
          .catch((e) => {
            console.warn("[TaskStore] toggleTask offline (will sync later):", e);
          })
          .finally(() => {
            const ids = { ...get()._processingIds };
            delete ids[id];
            set({ _processingIds: ids });
          });
        // Release lock immediately for the optimistic case
        // (the .finally above handles it after the async op)
      },

      deleteTask: async (id) => {
        // Optimistic delete immediately
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          deleteDoc(doc(db, "users", uid, "tasks", id)).catch((e) => {
            console.warn("[TaskStore] deleteTask offline (will sync later):", e);
          });
        }
      },

      editTask: async (id, updates) => {
        // Optimistic update immediately
        set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          const data = cleanFirestoreData({ ...updates, updatedAt: serverTimestamp() });
          updateDoc(doc(db, "users", uid, "tasks", id), data).catch((e) => {
            console.warn("[TaskStore] editTask offline (will sync later):", e);
          });
        }
      },

      subscribeToFirestore: (userId) => {
        try {
          get()._unsubscribe?.();
          const q = query(
            collection(db, "users", userId, "tasks"),
            orderBy("createdAt", "desc"),
            // No hard limit — we need historical tasks for the weekly bar chart
            // comparison (prev week vs this week). AsyncStorage caches them locally.
          );
          const unsub = onSnapshot(
            q,
            { includeMetadataChanges: false },
            (snap) => {
              const serverTasks: Task[] = [];
              for (const d of snap.docs) {
                try {
                  const data = d.data({ serverTimestamps: "estimate" });
                  // Skip docs that are missing the id or title — prevents downstream crashes
                  if (!data.id || typeof data.title !== "string") continue;
                  serverTasks.push({
                    id: data.id,
                    title: data.title,
                    description: typeof data.description === "string" ? data.description : "",
                    priority: ["Low", "Medium", "High"].includes(data.priority) ? data.priority : "Medium",
                    dueDateISO: typeof data.dueDateISO === "string" ? data.dueDateISO : toISO(new Date()),
                    done: !!data.done,
                    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
                  });
                } catch (e) {
                  console.warn("[TaskStore] Skipping malformed task doc:", d.id, e);
                }
              }

              set((state) => {
                const currentTasks = state.tasks || [];
                const merged = serverTasks.map((sTask) => {
                  const local = currentTasks.find((l) => l.id === sTask.id);
                  if (local && (local as any)._isDirty) return local;
                  return sTask;
                });
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
