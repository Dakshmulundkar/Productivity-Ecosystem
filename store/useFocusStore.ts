import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SessionType = "Pomodoro" | "Short Break" | "Long Break";

interface FocusStore {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  focusSecondsToday: number;
  lastResetDate: string; // YYYY-MM-DD — resets focusSecondsToday each new day

  startSession: (type: SessionType) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  tick: () => void;
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
        });
      },

      pauseSession: () => set({ isRunning: false, isPaused: true }),

      resumeSession: () => set({ isRunning: true, isPaused: false }),

      stopSession: () => {
        const { elapsedSeconds, sessionType } = get();
        const focusGain = sessionType === "Pomodoro" ? elapsedSeconds : 0;
        set((state) => ({
          isRunning: false,
          isPaused: false,
          remainingSeconds: state.totalSeconds,
          elapsedSeconds: 0,
          focusSecondsToday: state.focusSecondsToday + focusGain,
        }));
      },

      tick: () => {
        const { remainingSeconds, elapsedSeconds, sessionType, totalSeconds } = get();
        if (remainingSeconds <= 1) {
          const focusGain = sessionType === "Pomodoro" ? totalSeconds : 0;
          set((state) => ({
            isRunning: false,
            isPaused: false,
            remainingSeconds: 0,
            elapsedSeconds: state.totalSeconds,
            focusSecondsToday: state.focusSecondsToday + focusGain,
          }));
        } else {
          set({
            remainingSeconds: remainingSeconds - 1,
            elapsedSeconds: elapsedSeconds + 1,
          });
        }
      },
    }),
    {
      name: "focus-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist running state — timer stops if app is killed
      partialize: (state) => ({
        focusSecondsToday: state.focusSecondsToday,
        lastResetDate: state.lastResetDate,
        sessionType: state.sessionType,
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
