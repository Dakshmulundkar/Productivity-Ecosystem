// ─── Habit Types ──────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;        // icon key string
  color: string;       // hex color
  category?: string;
  frequency: "daily" | "weekly" | "custom";
  completionsPerDay: number;
  streakGoal?: number;
  createdAt: number;   // timestamp
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;        // YYYY-MM-DD
  completions: number;
  completedAt: number; // timestamp
}

export interface NewHabitInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  category?: string;
  frequency: "daily" | "weekly" | "custom";
  completionsPerDay: number;
  streakGoal?: number;
}

export interface HeatmapCell {
  date: string;
  count: number;
  color: string;
}
