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
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
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

  addHabit: (input: NewHabitInput) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logCompletion: (habitId: string, date: string) => Promise<void>;
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
      habits: SEED_HABITS,
      logs: SEED_LOGS,
      _unsubHabits: null,
      _unsubLogs: null,

      addHabit: async (input) => {
        const habit: Habit = { ...input, id: Date.now().toString(), createdAt: Date.now() };
        set((s) => ({ habits: [...s.habits, habit] }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "habits", habit.id), { ...habit, updatedAt: serverTimestamp() });
        }
      },

      deleteHabit: async (id) => {
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id), logs: s.logs.filter((l) => l.habitId !== id) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await deleteDoc(doc(db, "users", uid, "habits", id));
        }
      },

      logCompletion: async (habitId, date) => {
        if (get().logs.some((l) => l.habitId === habitId && l.date === date)) return;
        const log: HabitLog = { id: `${habitId}-${date}`, habitId, date, completions: 1, completedAt: Date.now() };
        set((s) => ({ logs: [...s.logs, log] }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "habitLogs", log.id), { ...log, updatedAt: serverTimestamp() });
        }
      },

      removeLog: async (habitId, date) => {
        set((s) => ({ logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === date)) }));
        const uid = auth.currentUser?.uid;
        if (uid) {
          await deleteDoc(doc(db, "users", uid, "habitLogs", `${habitId}-${date}`));
        }
      },

      isCompleted: (habitId, date) => get().logs.some((l) => l.habitId === habitId && l.date === date),

      getStreakForHabit: (habitId) => {
        const logDates = new Set(get().logs.filter((l) => l.habitId === habitId).map((l) => l.date));
        let streak = 0, d = new Date();
        if (!logDates.has(toISO(d))) d = addDays(d, -1);
        while (logDates.has(toISO(d))) { streak++; d = addDays(d, -1); }
        return streak;
      },

      getBestStreak: (habitId) => {
        const dates = [...new Set(get().logs.filter((l) => l.habitId === habitId).map((l) => l.date))].sort();
        if (dates.length === 0) return 0;
        let best = 1, current = 1;
        for (let i = 1; i < dates.length; i++) {
          const diff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / 86400000;
          if (diff === 1) { current++; best = Math.max(best, current); } else { current = 1; }
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
          return { date: dateStr, count, color: count > 0 ? habit.color : colorWithOpacity(habit.color, 0.12) };
        });
      },

      getLast5Days: (habitId) => {
        const todayStr = toISO(new Date());
        const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return Array.from({ length: 5 }, (_, i) => {
          const d = addDays(new Date(), -(4 - i));
          const dateStr = toISO(d);
          return { date: dateStr, dayLabel: DAY_ABBR[d.getDay()], completed: get().isCompleted(habitId, dateStr), isToday: dateStr === todayStr };
        });
      },

      getTotalCompleted: () => {
        const todayStr = toISO(new Date());
        return get().habits.filter((h) => get().logs.some((l) => l.habitId === h.id && l.date === todayStr)).length;
      },

      subscribeToFirestore: (userId) => {
        get()._unsubHabits?.();
        get()._unsubLogs?.();
        const unsubH = onSnapshot(
          query(collection(db, "users", userId, "habits"), orderBy("createdAt", "asc")),
          (snap) => { if (!snap.empty) set({ habits: snap.docs.map((d) => d.data() as Habit) }); }
        );
        const unsubL = onSnapshot(
          collection(db, "users", userId, "habitLogs"),
          (snap) => { if (!snap.empty) set({ logs: snap.docs.map((d) => d.data() as HabitLog) }); }
        );
        set({ _unsubHabits: unsubH, _unsubLogs: unsubL });
      },

      unsubscribeFromFirestore: () => {
        get()._unsubHabits?.();
        get()._unsubLogs?.();
        set({ _unsubHabits: null, _unsubLogs: null });
      },
    }),
    {
      name: "habits-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ habits: s.habits, logs: s.logs }),
    },
  ),
);
