/**
 * Habit store — Zustand with Firestore sync.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
  limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { cleanFirestoreData } from "@/lib/utils";
import { HabitSchema } from "@/shared/schemas";
import { Alert } from "react-native";
import type { Habit, HabitLog, NewHabitInput, HeatmapCell } from "@/shared/habitTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function colorWithOpacity(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface HabitStore {
  habits: Habit[];
  logs: HabitLog[];
  _unsubHabits: Unsubscribe | null;
  _unsubLogs: Unsubscribe | null;
  // Use a plain Record instead of Set — Sets are not JSON-serializable
  // and get silently corrupted on AsyncStorage rehydration.
  _processingIds: Record<string, boolean>;

  addHabit: (input: NewHabitInput) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logCompletion: (habitId: string, date: string, count?: number) => Promise<void>;
  removeLog: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreakForHabit: (habitId: string) => number;
  getSuccessRate: (habitId: string) => number;
  getBestStreak: (habitId: string) => number;
  getHeatmapData: (habitId: string, weeks: number) => HeatmapCell[];
  getLast5Days: (habitId: string) => { date: string; dayLabel: string; completed: boolean; count: number; isToday: boolean }[];
  getTotalCompleted: () => number;
  subscribeToFirestore: (userId: string) => void;
  unsubscribeFromFirestore: () => void;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      logs: [],
      _unsubHabits: null,
      _unsubLogs: null,
      _processingIds: {},

      addHabit: async (input: NewHabitInput) => {
        try {
          const id = Date.now().toString();
          const rawHabit = { ...input, id, createdAt: Date.now() };
          
          // Validate using Zod
          const habit = HabitSchema.parse(rawHabit);
          
          // Add locally with dirty flag to prevent server overwrite during sync
          const habitWithDirty = { ...habit, _isDirty: true };
          set((s) => ({ habits: [...s.habits, habitWithDirty] }));

          const uid = auth.currentUser?.uid;
          if (uid) {
            const data = cleanFirestoreData({ 
              ...habit, 
              updatedAt: serverTimestamp() 
            });
            // Fire-and-forget: Firestore offline cache queues this and
            // syncs automatically when connectivity is restored.
            setDoc(doc(db, "users", uid, "habits", habit.id), data).then(() => {
              set((s) => ({
                habits: s.habits.map((h) => h.id === habit.id ? { ...h, _isDirty: false } : (h as any))
              }));
            }).catch((e) => {
              console.warn("[HabitStore] addHabit Firestore write failed (will retry when online):", e);
            });
          }
        } catch (error: any) {
          console.error("[HabitStore] Add failed:", error);
          Alert.alert("Error", error.message || "Failed to add habit");
        }
      },

      deleteHabit: async (id) => {
        // Optimistic delete immediately
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          logs: s.logs.filter((l) => l.habitId !== id),
        }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          deleteDoc(doc(db, "users", uid, "habits", id)).catch((e) => {
            console.warn("[HabitStore] deleteHabit offline (will sync later):", e);
          });
        }
      },

      logCompletion: async (habitId, date, count = 1) => {
        const uid = auth.currentUser?.uid;
        const processKey = `${habitId}_${date}`;
        if (!uid || get()._processingIds[processKey] === true) return;

        get()._processingIds[processKey] = true;
        try {
          const habit = get().habits.find((h) => h.id === habitId);
          if (!habit) return;

          const id = `${habitId}-${date}`;
          const existing = get().logs.find((l) => l.habitId === habitId && l.date === date);
          
          // Loop behavior: if current is max, next is 0. Otherwise increment.
          let nextCount = (existing?.completions ?? 0) + count;
          if (nextCount > habit.completionsPerDay) nextCount = 0;
          
          const newLog: HabitLog = { 
            id, 
            habitId, 
            date, 
            completions: nextCount, 
            completedAt: Date.now() 
          };

          // Optimistic update + Dirty lock
          set((state) => ({
            logs: existing
              ? state.logs.map((l) => (l.id === id ? { ...newLog, _isDirty: true } : l))
              : [...state.logs, { ...newLog, _isDirty: true }],
          }));

          if (nextCount === 0) {
            deleteDoc(doc(db, "users", uid, "habitLogs", id)).catch((e) => {
              console.warn("[HabitStore] removeLog offline (will sync later):", e);
            });
          } else {
            setDoc(doc(db, "users", uid, "habitLogs", id), cleanFirestoreData(newLog), { merge: true }).then(() => {
              set((state) => ({
                logs: state.logs.map((l) => (l.id === id ? { ...(l as any), _isDirty: false } : l))
              }));
            }).catch((e) => {
              console.warn("[HabitStore] logCompletion offline (will sync later):", e);
            });
          }
        } catch (error: any) {
          console.error("[HabitStore] Log failed:", error);
          Alert.alert("Sync Error", "Failed to save completion");
        } finally {
          const ids = { ...get()._processingIds };
          delete ids[processKey];
          set({ _processingIds: ids });
        }
      },

      removeLog: async (habitId, date) => {
        set((s) => ({
          logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === date)),
        }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          deleteDoc(doc(db, "users", uid, "habitLogs", `${habitId}-${date}`)).catch((e) => {
            console.warn("[HabitStore] removeLog offline (will sync later):", e);
          });
        }
      },

      isCompleted: (habitId, date) => {
        const habit = get().habits.find(h => h.id === habitId);
        if (!habit) return false;
        const log = get().logs.find((l) => l.habitId === habitId && l.date === date);
        return (log?.completions ?? 0) >= habit.completionsPerDay;
      },

      getStreakForHabit: (habitId) => {
        const logDates = new Set(get().logs.filter((l) => l.habitId === habitId).map((l) => l.date));
        let streak = 0, d = new Date();
        if (!logDates.has(toISO(d))) d = addDays(d, -1);
        
        // Safety counter to prevent infinite loops
        let iterations = 0;
        while (logDates.has(toISO(d)) && iterations < 1000) { 
          streak++; 
          d = addDays(d, -1); 
          iterations++;
        }
        return streak;
      },

      getBestStreak: (habitId) => {
        const logsForHabit = get().logs.filter((l) => l.habitId === habitId);
        const dates = [...new Set(logsForHabit.map((l) => l.date))].sort();
        if (dates.length === 0) return 0;
        
        let best = 1, current = 1;
        // Safety loop
        for (let i = 1; i < dates.length && i < 5000; i++) {
          const d1 = new Date(dates[i-1]);
          const d2 = new Date(dates[i]);
          const diff = (d2.getTime() - d1.getTime()) / 86400000;
          if (Math.round(diff) === 1) { 
            current++; 
            best = Math.max(best, current); 
          } else { 
            current = 1; 
          }
        }
        return best;
      },

      getSuccessRate: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        const days = Math.max(1, Math.floor((Date.now() - habit.createdAt) / 86400000));
        const completed = new Set(get().logs.filter((l) => l.habitId === habitId).map((l) => l.date)).size;
        return Math.round((completed / days) * 100);
      },

      getHeatmapData: (habitId, weeks = 8) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return [];
        const logMap = new Map(get().logs.filter((l) => l.habitId === habitId).map((l) => [l.date, l.completions]));
        return Array.from({ length: weeks * 7 }, (_, i) => {
          const d = addDays(new Date(), -(weeks * 7 - 1 - i));
          const dateStr = toISO(d);
          const count = logMap.get(dateStr) ?? 0;
          
          let opacity = 0.12;
          if (count > 0) {
            opacity = Math.min(0.2 + (count / habit.completionsPerDay) * 0.8, 1);
          }
          
          return { 
            date: dateStr, 
            count, 
            color: colorWithOpacity(habit.color, opacity) 
          };
        });
      },

      getLast5Days: (habitId) => {
        const todayStr = toISO(new Date());
        const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const logs = get().logs || []; // Ensure logs is an array
        
        return Array.from({ length: 5 }, (_, i) => {
          const d = addDays(new Date(), -(4 - i));
          const dateStr = toISO(d);
          const log = logs.find((l) => l.habitId === habitId && l.date === dateStr);
          return { 
            date: dateStr, 
            dayLabel: DAY_ABBR[d.getDay()], 
            completed: get().isCompleted(habitId, dateStr), 
            count: log?.completions ?? 0,
            isToday: dateStr === todayStr 
          };
        });
      },

      getTotalCompleted: () => {
        const todayStr = toISO(new Date());
        return get().habits.filter((h) => get().logs.some((l) => l.habitId === h.id && l.date === todayStr)).length;
      },

      subscribeToFirestore: (userId) => {
        try {
          get()._unsubHabits?.();
          get()._unsubLogs?.();
          const unsubH = onSnapshot(
            query(collection(db, "users", userId, "habits"), orderBy("createdAt", "asc")),
            (snap) => {
              const serverHabits: Habit[] = [];
              for (const d of snap.docs) {
                try {
                  const data = d.data({ serverTimestamps: "estimate" });
                  serverHabits.push({
                    id: d.id,
                    name: typeof data.name === "string" && data.name ? data.name : "Untitled Habit",
                    description: typeof data.description === "string" ? data.description : "",
                    icon: typeof data.icon === "string" && data.icon ? data.icon : "Activity",
                    color: typeof data.color === "string" && data.color.startsWith("#") ? data.color : "#b8a9f0",
                    category: typeof data.category === "string" ? data.category : "General",
                    frequency: data.frequency === "weekly" ? "weekly" : "daily",
                    completionsPerDay: Math.max(1, Math.min(10, Number(data.completionsPerDay) || 1)),
                    streakGoal: Number(data.streakGoal) || 30,
                    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
                  });
                } catch (e) {
                  console.warn("[HabitStore] Skipping malformed habit doc:", d.id, e);
                }
              }
              set((state) => {
                const currentHabits = state.habits || [];
                const merged = serverHabits.map((h) => {
                  const local = currentHabits.find((l) => l.id === h.id);
                  if (local && (local as any)._isDirty) return local;
                  return h;
                });
                // Keep local-only dirty habits 
                const localOnlyDirty = currentHabits.filter(
                  (l) => (l as any)._isDirty && !serverHabits.some((sh) => sh.id === l.id)
                );
                return { habits: [...merged, ...localOnlyDirty] };
              });
            },
            (error) => console.error("[HabitStore] Habits sync error:", error)
          );
          const unsubL = onSnapshot(
            query(collection(db, "users", userId, "habitLogs"), orderBy("completedAt", "desc"), limit(200)),
            (snap) => {
              const serverLogs: HabitLog[] = [];
              for (const d of snap.docs) {
                try {
                  const data = d.data({ serverTimestamps: "estimate" });
                  // Skip docs missing required fields — prevents crashes in isCompleted/getLast5Days
                  if (typeof data.habitId !== "string" || typeof data.date !== "string") continue;
                  serverLogs.push({
                    id: typeof data.id === "string" ? data.id : d.id,
                    habitId: data.habitId,
                    date: data.date,
                    completions: Math.max(0, Number(data.completions) || 0),
                    completedAt: typeof data.completedAt === "number" ? data.completedAt : Date.now(),
                  });
                } catch (e) {
                  console.warn("[HabitStore] Skipping malformed log doc:", d.id, e);
                }
              }
              set((state) => {
                const currentLogs = state.logs || [];
                const merged = serverLogs.map((l) => {
                  const local = currentLogs.find((loc) => loc.id === l.id);
                  if (local && (local as any)._isDirty) return local;
                  return l;
                });
                const localOnlyDirty = currentLogs.filter(
                  (l) => (l as any)._isDirty && !serverLogs.some((sl) => sl.id === l.id)
                );
                return { logs: [...merged, ...localOnlyDirty] };
              });
            },
            (error) => console.error("[HabitStore] Logs sync error:", error)
          );
          set({ _unsubHabits: unsubH, _unsubLogs: unsubL });
        } catch (e) {
          console.error("[HabitStore] subscribeToFirestore failed:", e);
        }
      },

      unsubscribeFromFirestore: () => {
        get()._unsubHabits?.();
        get()._unsubLogs?.();
        set({ _unsubHabits: null, _unsubLogs: null, habits: [], logs: [] });
      },
    }),
    {
      name: "habits-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ habits: s.habits, logs: s.logs }),
    },
  ),
);
