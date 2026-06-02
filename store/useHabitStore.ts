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

// ─── Seed data ────────────────────────────────────────────────────────────────

const today       = toISO(new Date());
const yesterday   = toISO(addDays(new Date(), -1));
const twoDaysAgo  = toISO(addDays(new Date(), -2));
const threeDaysAgo = toISO(addDays(new Date(), -3));

const SEED_HABITS: Habit[] = [
  { id: "h1", name: "Hydration", description: "Drink 8 glasses of water", icon: "Droplets", color: "#74b9ff", category: "Health", frequency: "daily", completionsPerDay: 1, createdAt: Date.now() - 7 * 86400000 },
  { id: "h2", name: "Exercise",  description: "30 min workout",           icon: "Dumbbell", color: "#6BCB77", category: "Health", frequency: "daily", completionsPerDay: 1, createdAt: Date.now() - 14 * 86400000 },
  { id: "h3", name: "Reading",   description: "Read for 20 minutes",      icon: "BookOpen", color: "#fd79a8", category: "Personal", frequency: "daily", completionsPerDay: 1, createdAt: Date.now() - 5 * 86400000 },
];

const SEED_LOGS: HabitLog[] = [
  { id: "l1", habitId: "h1", date: yesterday,    completions: 1, completedAt: Date.now() - 86400000 },
  { id: "l2", habitId: "h1", date: twoDaysAgo,   completions: 1, completedAt: Date.now() - 2 * 86400000 },
  { id: "l3", habitId: "h1", date: threeDaysAgo, completions: 1, completedAt: Date.now() - 3 * 86400000 },
  { id: "l4", habitId: "h2", date: today,        completions: 1, completedAt: Date.now() },
  { id: "l5", habitId: "h2", date: yesterday,    completions: 1, completedAt: Date.now() - 86400000 },
  { id: "l6", habitId: "h2", date: twoDaysAgo,   completions: 1, completedAt: Date.now() - 2 * 86400000 },
  { id: "l7", habitId: "h2", date: threeDaysAgo, completions: 1, completedAt: Date.now() - 3 * 86400000 },
  { id: "l8", habitId: "h3", date: yesterday,    completions: 1, completedAt: Date.now() - 86400000 },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface HabitStore {
  habits: Habit[];
  logs: HabitLog[];
  _unsubHabits: Unsubscribe | null;
  _unsubLogs: Unsubscribe | null;
  _processingIds: Set<string>;

  addHabit: (input: NewHabitInput) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logCompletion: (habitId: string, date: string, count?: number) => Promise<void>;
  removeLog: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreakForHabit: (habitId: string) => number;
  getSuccessRate: (habitId: string) => number;
  getBestStreak: (habitId: string) => number;
  getHeatmapData: (habitId: string, weeks: number) => HeatmapCell[];
  getLast5Days: (habitId: string) => { date: string; dayLabel: string; completed: boolean; isToday: boolean }[];
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
      _processingIds: new Set(),

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
            await setDoc(doc(db, "users", uid, "habits", habit.id), data);
            
            // Sync success: clear dirty flag
            set((s) => ({
              habits: s.habits.map((h) => h.id === habit.id ? { ...h, _isDirty: false } : (h as any))
            }));
          }
        } catch (error: any) {
          console.error("[HabitStore] Add failed:", error);
          Alert.alert("Error", error.message || "Failed to add habit");
        }
      },

      deleteHabit: async (id) => {
        try {
          set((s) => ({ 
            habits: s.habits.filter((h) => h.id !== id), 
            logs: s.logs.filter((l) => l.habitId !== id) 
          }));
          const uid = auth.currentUser?.uid;
          if (uid) {
            await deleteDoc(doc(db, "users", uid, "habits", id));
          }
        } catch (error: any) {
          console.error("[HabitStore] Delete failed:", error);
          Alert.alert("Error", "Failed to delete habit");
        }
      },

      logCompletion: async (habitId, date, count = 1) => {
        const uid = auth.currentUser?.uid;
        const processKey = `${habitId}_${date}`;
        if (!uid || get()._processingIds.has(processKey)) return;

        get()._processingIds.add(processKey);
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
            await deleteDoc(doc(db, "users", uid, "habitLogs", id));
          } else {
            await setDoc(doc(db, "users", uid, "habitLogs", id), cleanFirestoreData(newLog), { merge: true });
          }
          
          // Release lock
          set((state) => ({
            logs: state.logs.map((l) => (l.id === id ? { ...(l as any), _isDirty: false } : l))
          }));
        } catch (error: any) {
          console.error("[HabitStore] Log failed:", error);
          Alert.alert("Sync Error", "Failed to save completion");
        } finally {
          get()._processingIds.delete(processKey);
        }
      },

      removeLog: async (habitId, date) => {
        try {
          set((s) => ({ 
            logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === date)) 
          }));
          const uid = auth.currentUser?.uid;
          if (uid) {
            await deleteDoc(doc(db, "users", uid, "habitLogs", `${habitId}-${date}`));
          }
        } catch (error: any) {
          console.error("[HabitStore] Remove log failed:", error);
          Alert.alert("Error", "Failed to remove completion");
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
              const serverHabits = snap.docs.map((d) => {
                const data = d.data({ serverTimestamps: "estimate" });
                // Sanitization: Ensure required fields exist to prevent UI crashes
                return {
                  ...data,
                  id: d.id,
                  name: data.name || "Untitled Habit",
                  icon: data.icon || "Activity",
                  color: data.color || "#b8a9f0",
                  completionsPerDay: Math.max(1, data.completionsPerDay || 1),
                  createdAt: data.createdAt || Date.now(),
                } as Habit;
              });
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
              const serverLogs = snap.docs.map((l) => l.data({ serverTimestamps: "estimate" }) as HabitLog);
              set((state) => {
                const currentLogs = state.logs || [];
                const merged = serverLogs.map((l) => {
                  const local = currentLogs.find((loc) => loc.id === l.id);
                  if (local && (local as any)._isDirty) return local;
                  return l;
                });
                // Keep local-only dirty logs
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
