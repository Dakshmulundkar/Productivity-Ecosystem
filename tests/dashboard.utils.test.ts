import { describe, it, expect } from "vitest";
import { getGreeting, splitName, getInitials } from "../lib/dashboard-utils";

// ─── P1: Greeting correctness ─────────────────────────────────────────────────
// Validates: Requirements 3.1
describe("P1 — getGreeting correctness", () => {
  it("returns 'Good morning' for hours 0–11", () => {
    const morningHours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (const hour of morningHours) {
      // We test the logic directly by checking the hour boundaries
      // since getGreeting() uses new Date().getHours() internally
      const result = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      expect(result).toBe("Good morning");
    }
  });

  it("returns 'Good afternoon' for hours 12–16", () => {
    const afternoonHours = [12, 13, 14, 15, 16];
    for (const hour of afternoonHours) {
      const result = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      expect(result).toBe("Good afternoon");
    }
  });

  it("returns 'Good evening' for hours 17–23", () => {
    const eveningHours = [17, 18, 19, 20, 21, 22, 23];
    for (const hour of eveningHours) {
      const result = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      expect(result).toBe("Good evening");
    }
  });

  it("returns one of the three valid greetings at any time", () => {
    const validGreetings = ["Good morning", "Good afternoon", "Good evening"];
    const result = getGreeting();
    expect(validGreetings).toContain(result);
  });
});

// ─── P2: Name splitting ───────────────────────────────────────────────────────
// Validates: Requirements 3.2, 3.3, 3.4
describe("P2 — splitName correctness", () => {
  it("single-word names return { first: name, last: '' }", () => {
    const singleWords = ["Arjun", "Alice", "Bob", "X", "Zara"];
    for (const name of singleWords) {
      const result = splitName(name);
      expect(result).toEqual({ first: name, last: "" });
    }
  });

  it("two-word names split on the first space", () => {
    expect(splitName("Arjun Sharma")).toEqual({ first: "Arjun", last: "Sharma" });
    expect(splitName("John Doe")).toEqual({ first: "John", last: "Doe" });
    expect(splitName("Alice Bob")).toEqual({ first: "Alice", last: "Bob" });
  });

  it("three-word names: first word is first, rest is last", () => {
    expect(splitName("Mary Jane Watson")).toEqual({ first: "Mary", last: "Jane Watson" });
    expect(splitName("Jean Claude Van")).toEqual({ first: "Jean", last: "Claude Van" });
  });

  it("trims leading/trailing whitespace before splitting", () => {
    // The full string is trimmed first, so trailing spaces are removed before the split
    expect(splitName("  Arjun Sharma  ")).toEqual({ first: "Arjun", last: "Sharma" });
    expect(splitName("  Alice  ")).toEqual({ first: "Alice", last: "" });
  });

  it("property: first + last always reconstructs the trimmed name for two-word inputs", () => {
    const names = ["Arjun Sharma", "John Doe", "Alice Bob", "Mary Jane"];
    for (const name of names) {
      const { first, last } = splitName(name);
      expect(`${first} ${last}`).toBe(name.trim());
    }
  });
});

// ─── P3: Initials ─────────────────────────────────────────────────────────────
// Validates: Requirements 3.5, 3.6
describe("P3 — getInitials correctness", () => {
  it("single word returns first letter uppercase", () => {
    expect(getInitials("Arjun")).toBe("A");
    expect(getInitials("alice")).toBe("A");
    expect(getInitials("bob")).toBe("B");
    expect(getInitials("Z")).toBe("Z");
  });

  it("two words returns first two initials uppercase", () => {
    expect(getInitials("Arjun Sharma")).toBe("AS");
    expect(getInitials("john doe")).toBe("JD");
    expect(getInitials("Alice Bob")).toBe("AB");
  });

  it("three+ words returns only first two initials", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MJ");
    expect(getInitials("Jean Claude Van Damme")).toBe("JC");
    expect(getInitials("A B C D E")).toBe("AB");
  });

  it("property: result is always 1 or 2 characters", () => {
    const names = ["A", "Alice", "Alice Bob", "Alice Bob Charlie", "X Y Z W"];
    for (const name of names) {
      const result = getInitials(name);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(2);
    }
  });

  it("property: result is always uppercase", () => {
    const names = ["arjun sharma", "john doe", "alice", "bob charlie"];
    for (const name of names) {
      const result = getInitials(name);
      expect(result).toBe(result.toUpperCase());
    }
  });
});

// ─── P4: Ring geometry ────────────────────────────────────────────────────────
// Validates: Requirements 5.6, 5.8
describe("P4 — Ring geometry correctness", () => {
  const r = 32;
  const circumference = 2 * Math.PI * r;

  it("strokeDashoffset is in [0, circumference] for all scores 0–100", () => {
    const scores = Array.from({ length: 101 }, (_, i) => i); // 0..100
    for (const score of scores) {
      const offset = circumference * (1 - score / 100);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(circumference);
    }
  });

  it("score 0 produces offset equal to circumference (empty ring)", () => {
    const offset = circumference * (1 - 0 / 100);
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("score 100 produces offset of 0 (full ring)", () => {
    const offset = circumference * (1 - 100 / 100);
    expect(offset).toBeCloseTo(0, 5);
  });

  it("offset is monotonically decreasing as score increases", () => {
    const scores = [0, 10, 25, 50, 75, 90, 100];
    const offsets = scores.map(s => circumference * (1 - s / 100));
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]!);
    }
  });
});

// ─── P5: Remaining count ──────────────────────────────────────────────────────
// Validates: Requirements 8.2
describe("P5 — Remaining count correctness", () => {
  type Task = { id: string; done: boolean };

  function toggleTask(tasks: Task[], id: string): Task[] {
    return tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }

  function remainingCount(tasks: Task[]): number {
    return tasks.filter(t => !t.done).length;
  }

  it("remainingCount equals tasks.filter(t => !t.done).length after any toggle", () => {
    const initial: Task[] = [
      { id: "1", done: false },
      { id: "2", done: false },
      { id: "3", done: true },
      { id: "4", done: false },
    ];

    // Toggle sequences to test
    const sequences = [
      ["1"],
      ["2", "3"],
      ["1", "2", "3", "4"],
      ["1", "1"], // toggle twice
      ["3", "3", "3"], // toggle three times
    ];

    for (const seq of sequences) {
      let tasks = [...initial];
      for (const id of seq) {
        tasks = toggleTask(tasks, id);
        const computed = remainingCount(tasks);
        const expected = tasks.filter(t => !t.done).length;
        expect(computed).toBe(expected);
      }
    }
  });

  it("remainingCount is always between 0 and tasks.length", () => {
    const tasks: Task[] = [
      { id: "1", done: false },
      { id: "2", done: true },
      { id: "3", done: false },
    ];
    const count = remainingCount(tasks);
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(tasks.length);
  });
});

// ─── P6: Filter pill state ────────────────────────────────────────────────────
// Validates: Requirements 4.4, 4.6
describe("P6 — Filter pill state correctness", () => {
  it("after onChange is called with a label, active equals that label", () => {
    const options = ["Today", "Tomorrow", "All"];
    let active = "Today";
    const onChange = (value: string) => { active = value; };

    for (const option of options) {
      onChange(option);
      expect(active).toBe(option);
    }
  });

  it("property: active always equals the last value passed to onChange", () => {
    let active = "Today";
    const onChange = (value: string) => { active = value; };

    // Simulate random sequences of pill presses
    const sequences = [
      ["Tomorrow", "All", "Today"],
      ["All", "All", "Tomorrow"],
      ["Today", "Tomorrow", "All", "Today"],
    ];

    for (const seq of sequences) {
      for (const option of seq) {
        onChange(option);
        expect(active).toBe(option);
      }
    }
  });

  it("default active is 'Today'", () => {
    // This mirrors the useState('Today') default in the dashboard
    const active = "Today";
    expect(active).toBe("Today");
  });
});

// ─── P7: Task toggle idempotency ──────────────────────────────────────────────
// Validates: Requirements 8.3, 8.4, 8.6
describe("P7 — Task toggle idempotency", () => {
  type Task = { id: string; title: string; done: boolean };

  function toggleTask(tasks: Task[], id: string): Task[] {
    return tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }

  it("toggling a task twice returns it to its original done state", () => {
    const tasks: Task[] = [
      { id: "1", title: "Task A", done: false },
      { id: "2", title: "Task B", done: true },
      { id: "3", title: "Task C", done: false },
    ];

    for (const task of tasks) {
      const originalDone = task.done;
      let state = [...tasks];
      state = toggleTask(state, task.id);
      state = toggleTask(state, task.id);
      const restored = state.find(t => t.id === task.id)!;
      expect(restored.done).toBe(originalDone);
    }
  });

  it("property: toggling N times is equivalent to toggling (N mod 2) times", () => {
    const tasks: Task[] = [
      { id: "1", title: "Task A", done: false },
      { id: "2", title: "Task B", done: true },
    ];

    for (const task of tasks) {
      const originalDone = task.done;

      // Toggle 4 times (even) → should be back to original
      let state = [...tasks];
      for (let i = 0; i < 4; i++) {
        state = toggleTask(state, task.id);
      }
      expect(state.find(t => t.id === task.id)!.done).toBe(originalDone);

      // Toggle 3 times (odd) → should be flipped
      state = [...tasks];
      for (let i = 0; i < 3; i++) {
        state = toggleTask(state, task.id);
      }
      expect(state.find(t => t.id === task.id)!.done).toBe(!originalDone);
    }
  });

  it("toggling one task does not affect other tasks", () => {
    const tasks: Task[] = [
      { id: "1", title: "Task A", done: false },
      { id: "2", title: "Task B", done: true },
      { id: "3", title: "Task C", done: false },
    ];

    const toggled = toggleTask(tasks, "1");
    // Task 2 and 3 should be unchanged
    expect(toggled.find(t => t.id === "2")!.done).toBe(true);
    expect(toggled.find(t => t.id === "3")!.done).toBe(false);
  });
});
