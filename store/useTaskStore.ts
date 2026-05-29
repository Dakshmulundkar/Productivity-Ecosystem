import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Priority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; // "Today", "Tomorrow", or display string
  done: boolean;
  createdAt: number;
}

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  editTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
}

const SEED_TASKS: Task[] = [
  { id: "seed-1", title: "Review Q4 report",     description: "Financial review",      priority: "High",   dueDate: "Today",    done: true,  createdAt: Date.now() - 5000 },
  { id: "seed-2", title: "Design system audit",  description: "Review all components", priority: "High",   dueDate: "Today",    done: false, createdAt: Date.now() - 4000 },
  { id: "seed-3", title: "Call with Priya",      description: "Catch-up call",         priority: "Medium", dueDate: "Today",    done: false, createdAt: Date.now() - 3000 },
  { id: "seed-4", title: "Morning run",          description: "5km run",               priority: "Low",    dueDate: "Today",    done: false, createdAt: Date.now() - 2000 },
  { id: "seed-5", title: "Update documentation", description: "API docs update",       priority: "Low",    dueDate: "Tomorrow", done: false, createdAt: Date.now() - 1000 },
];

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: SEED_TASKS,

      addTask: (task) =>
        set((state) => ({
          tasks: [
            { ...task, id: Date.now().toString(), createdAt: Date.now() },
            ...state.tasks,
          ],
        })),

      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t,
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      editTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        })),
    }),
    {
      name: "tasks-storage",           // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
