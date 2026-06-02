import { z } from "zod";

export const PrioritySchema = z.enum(["Low", "Medium", "High"]);

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional().default(""),
  priority: PrioritySchema,
  dueDateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  done: z.boolean(),
  createdAt: z.number(),
});

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional().default(""),
  icon: z.string(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color hex"),
  category: z.string().optional().default("General"),
  frequency: z.enum(["daily", "weekly"]),
  completionsPerDay: z.number().min(1).max(10),
  streakGoal: z.number().optional().default(30),
  createdAt: z.number(),
});

export type Task = z.infer<typeof TaskSchema>;
export type Habit = z.infer<typeof HabitSchema>;
