import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      },

      pauseSession: () => {
        const { startedAt, pausedElapsed } = get();
        // Capture how many seconds have elapsed so far
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
      },

      resumeSession: () => {
        set({
          isRunning: true,
          isPaused: false,
          startedAt: Date.now(), // restart wall-clock from now
        });
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
      },

      syncTimer: () => {
        const { isRunning, startedAt, pausedElapsed, totalSeconds, sessionType } = get();
        if (!isRunning || !startedAt) return;

        const totalElapsed = pausedElapsed + Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, totalSeconds - totalElapsed);

        if (remaining <= 0) {
          // Session complete
          const focusGain = sessionType === "Pomodoro" ? totalSeconds : 0;
          set((state) => ({
            isRunning: false,
            isPaused: false,
            remainingSeconds: 0,
            elapsedSeconds: totalSeconds,
            startedAt: null,
            pausedElapsed: 0,
            focusSecondsToday: state.focusSecondsToday + focusGain,
          }));
        } else {
          set({
            remainingSeconds: remaining,
            elapsedSeconds: totalElapsed,
          });
        }
      },

      // Legacy tick — kept for compatibility, delegates to syncTimer
      tick: () => get().syncTimer(),
    }),
    {
      name: "focus-storage-v2",  // bumped key so old state doesn't conflict
      storage: createJSONStorage(() => AsyncStorage),
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

export function formatFocusTime(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? `${seconds}s` : "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
