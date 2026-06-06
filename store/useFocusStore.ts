import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type SessionType = "Pomodoro" | "Short Break" | "Long Break";

/**
 * Background-safe focus timer.
 *
 * Instead of counting ticks, we store the wall-clock timestamp when the
 * session started (startedAt). On every tick — or when the app returns to
 * foreground — we compute elapsed = now - startedAt and derive remaining
 * from that. This means the timer keeps counting even when the app is
 * backgrounded or the JS thread is suspended.
 */
interface FocusStore {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  focusSecondsToday: number;
  lastResetDate: string;   // YYYY-MM-DD
  startedAt: number | null; // Date.now() when session started / resumed
  pausedElapsed: number;    // seconds elapsed before the current pause

  startSession: (type: SessionType) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  /** Call this on every UI tick AND on AppState foreground event */
  syncTimer: () => void;
  resetDailyIfNeeded: () => void;
  syncToFirestore: () => Promise<void>;
  subscribeToFirestore: () => void;
}

const SESSION_DURATIONS: Record<SessionType, number> = {
  "Pomodoro":    25 * 60,
  "Short Break":  5 * 60,
  "Long Break":  15 * 60,
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      isRunning: false,
      isPaused: false,
      sessionType: "Pomodoro",
      totalSeconds: SESSION_DURATIONS["Pomodoro"],
      remainingSeconds: SESSION_DURATIONS["Pomodoro"],
      elapsedSeconds: 0,
      focusSecondsToday: 0,
      lastResetDate: todayString(),
      startedAt: null,
      pausedElapsed: 0,

      subscribeToFirestore: () => {},

      resetDailyIfNeeded: () => {
        const today = todayString();
        if (get().lastResetDate !== today) {
          set({ focusSecondsToday: 0, lastResetDate: today });
        }
      },

      startSession: (type) => {
        get().resetDailyIfNeeded();
        const duration = SESSION_DURATIONS[type];
        set({
          isRunning: true,
          isPaused: false,
          sessionType: type,
          totalSeconds: duration,
          remainingSeconds: duration,
          elapsedSeconds: 0,
          startedAt: Date.now(),
          pausedElapsed: 0,
        });
        
        // Schedule push notification
        const { scheduleFocusDoneNotification } = require("@/lib/notifications");
        scheduleFocusDoneNotification(duration, type);
      },

      pauseSession: () => {
        const { startedAt, pausedElapsed } = get();
        const nowElapsed = startedAt
          ? pausedElapsed + Math.floor((Date.now() - startedAt) / 1000)
          : pausedElapsed;
        set({
          isRunning: false,
          isPaused: true,
          startedAt: null,
          pausedElapsed: nowElapsed,
          elapsedSeconds: nowElapsed,
        });

        // Cancel notification
        const { cancelAllFocusNotifications } = require("@/lib/notifications");
        cancelAllFocusNotifications();
      },

      resumeSession: () => {
        const remaining = get().remainingSeconds;
        set({
          isRunning: true,
          isPaused: false,
          startedAt: Date.now(),
        });

        // Re-schedule notification with remaining time
        const { scheduleFocusDoneNotification } = require("@/lib/notifications");
        scheduleFocusDoneNotification(remaining, get().sessionType);
      },

      stopSession: () => {
        const { startedAt, pausedElapsed, sessionType, totalSeconds } = get();
        const elapsed = startedAt
          ? pausedElapsed + Math.floor((Date.now() - startedAt) / 1000)
          : pausedElapsed;
        const focusGain = sessionType === "Pomodoro" ? Math.min(elapsed, totalSeconds) : 0;
        set((state) => ({
          isRunning: false,
          isPaused: false,
          remainingSeconds: state.totalSeconds,
          elapsedSeconds: 0,
          startedAt: null,
          pausedElapsed: 0,
          focusSecondsToday: state.focusSecondsToday + focusGain,
        }));
        get().syncToFirestore(); // ── Sync to Cloud ──

        // Cancel notification
        const { cancelAllFocusNotifications } = require("@/lib/notifications");
        cancelAllFocusNotifications();
      },

      syncTimer: () => {
        const { isRunning, startedAt, pausedElapsed, totalSeconds, sessionType } = get();
        if (!isRunning || !startedAt) return;

        // Guard against NaN from corrupted AsyncStorage rehydration
        const safePausedElapsed = typeof pausedElapsed === "number" && !isNaN(pausedElapsed) ? pausedElapsed : 0;
        const safeTotalSeconds = typeof totalSeconds === "number" && totalSeconds > 0 ? totalSeconds : SESSION_DURATIONS["Pomodoro"];

        const totalElapsed = safePausedElapsed + Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, safeTotalSeconds - totalElapsed);

        if (remaining <= 0) {
          // Session complete
          const focusGain = sessionType === "Pomodoro" ? safeTotalSeconds : 0;
          set((state) => ({
            isRunning: false,
            isPaused: false,
            remainingSeconds: 0,
            elapsedSeconds: safeTotalSeconds,
            startedAt: null,
            pausedElapsed: 0,
            focusSecondsToday: (state.focusSecondsToday || 0) + focusGain,
          }));
          get().syncToFirestore();
        } else {
          set({
            remainingSeconds: remaining,
            elapsedSeconds: totalElapsed,
          });
        }
      },

      syncToFirestore: async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const today = todayString();
        try {
          await setDoc(doc(db, "users", uid, "dailyFocusTime", today), {
            seconds: get().focusSecondsToday,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.error("[FocusStore] Firestore sync failed:", e);
        }
      },

      // Legacy tick — kept for compatibility, delegates to syncTimer
      tick: () => get().syncTimer(),
    }),
    {
      name: "focus-storage-v2",  // bumped key so old state doesn't conflict
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (rehydratedState) rehydratedState.resetDailyIfNeeded();
        };
      },
      partialize: (state) => ({
        focusSecondsToday: state.focusSecondsToday,
        lastResetDate: state.lastResetDate,
        sessionType: state.sessionType,
        // Persist running state so timer survives app restart
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        totalSeconds: state.totalSeconds,
        startedAt: state.startedAt,
        pausedElapsed: state.pausedElapsed,
      }),
    },
  ),
);

// Subscribe to auth changes to sync focus time from Firestore on login.
// This runs once at module load. The unsubscribe is intentionally kept alive
// for the app lifetime (single user session pattern).
let _focusAuthUnsub: (() => void) | null = null;
function initFocusAuthSync() {
  if (_focusAuthUnsub) return; // already initialised
  _focusAuthUnsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const today = todayString();
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "dailyFocusTime", today));
        if (snap.exists()) {
          const data = snap.data();
          const current = useFocusStore.getState().focusSecondsToday;
          // Only update if server value is higher (prevents back-syncing 0)
          if (data.seconds > current) {
            useFocusStore.setState({ focusSecondsToday: data.seconds });
          }
        }
      } catch {}
    }
  });
}
initFocusAuthSync();

export function formatFocusTime(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? `${seconds}s` : "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
