import React, { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth-context";
import { FontFamily } from "@/lib/_core/theme";
import { getGreeting, splitName, getInitials } from "@/lib/dashboard-utils";
import { SectionHeader } from "@/components/ui/section-header";
import { FilterPills } from "@/components/ui/filter-pills";
import { ProductivityRing } from "@/components/dashboard/productivity-ring";
import { StatCard } from "@/components/dashboard/stat-card";
import { TasksCard } from "@/components/dashboard/tasks-card";
import type { Task as DashTask } from "@/components/dashboard/tasks-card";
import { HabitsCard, Habit, HeatmapCell } from "@/components/dashboard/habits-card";
import { FocusCTACard } from "@/components/dashboard/focus-cta-card";
import { useTaskStore } from "@/store/useTaskStore";
import { useFocusStore, formatFocusTime } from "@/store/useFocusStore";

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_USER = { name: "Arjun Sharma" };
const MOCK_SCORE = { value: 84, trend: "12% from yesterday" };

const MOCK_HABITS: Habit[] = [
  { id: "1", name: "Hydration", icon: "Droplets", streak: 6,  percent: 75, iconBg: "#dbeafe", iconColor: "#1e40af", barColor: "#60a5fa" },
  { id: "2", name: "Exercise",  icon: "Dumbbell", streak: 12, percent: 90, iconBg: "#dcfce7", iconColor: "#166534", barColor: "#4ade80" },
  { id: "3", name: "Reading",   icon: "BookOpen", streak: 3,  percent: 40, iconBg: "#fce7f3", iconColor: "#9d174d", barColor: "#f472b6" },
];

const MOCK_HEATMAP: HeatmapCell[] = [
  { color: "#dcfce7" }, { color: "#86efac" }, { color: "#4ade80" }, { color: "#86efac" }, { color: "#dcfce7" },
  { color: "#4ade80" }, { color: "#22c55e" }, { color: "#16a34a" }, { color: "#4ade80" }, { color: "#22c55e" },
  { color: "#dcfce7" }, { color: "#86efac" }, { color: "#4ade80" }, { color: "#22c55e" }, { color: "#16a34a" },
  { color: "#22c55e" }, { color: "#16a34a" }, { color: "#4ade80" }, { color: "#86efac" }, { color: "#22c55e" },
  { color: "#4ade80" }, { color: "#16a34a" }, { color: "#22c55e" }, { color: "#dcfce7" }, { color: "#4ade80" },
  { color: "#22c55e" }, { color: "#86efac" }, { color: "#4ade80" }, { color: "#16a34a" }, { color: "#22c55e" },
  { color: "#4ade80" }, { color: "#86efac" }, { color: "#22c55e" }, { color: "#16a34a" }, { color: "#4ade80" },
];

const FILTER_OPTIONS = ["Today", "Tomorrow", "All"];

// Priority → TagType mapping for the dashboard task card
function priorityToTag(priority: string): DashTask["tag"] {
  if (priority === "High") return "HighPriority";
  if (priority === "Medium") return "Personal";
  return "Work";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Task store ──
  const storeTasks   = useTaskStore((s) => s.tasks);
  const toggleTask   = useTaskStore((s) => s.toggleTask);

  // ── Filter state ──
  const [activeFilter, setActiveFilter] = useState<string>("Today");

  // ── Focus store ──
  const isRunning          = useFocusStore((s) => s.isRunning);
  const isPaused           = useFocusStore((s) => s.isPaused);
  const sessionType        = useFocusStore((s) => s.sessionType);
  const remainingSeconds   = useFocusStore((s) => s.remainingSeconds);
  const focusSecondsToday  = useFocusStore((s) => s.focusSecondsToday);
  const startSession       = useFocusStore((s) => s.startSession);
  const pauseSession       = useFocusStore((s) => s.pauseSession);
  const resumeSession      = useFocusStore((s) => s.resumeSession);
  const stopSession        = useFocusStore((s) => s.stopSession);
  const tick               = useFocusStore((s) => s.tick);

  // ── Timer interval ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, tick]);

  // ── Derived: filtered tasks from store ──
  const todayTasks = useMemo((): DashTask[] => {
    const tomorrowLabel = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const filtered = storeTasks.filter((t) => {
      if (activeFilter === "All") return !t.done;
      if (activeFilter === "Tomorrow") return t.dueDate === "Tomorrow" || t.dueDate === tomorrowLabel;
      // "Today" — default
      return t.dueDate === "Today";
    });
    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      time: t.done ? "Completed" : `Due ${t.dueDate.toLowerCase()}`,
      tag: priorityToTag(t.priority),
      done: t.done,
    }));
  }, [storeTasks, activeFilter]);

  const remainingCount = useMemo(
    () => todayTasks.filter((t) => !t.done).length,
    [todayTasks],
  );

  const doneTodayCount = useMemo(
    () => todayTasks.filter((t) => t.done).length,
    [todayTasks],
  );

  // ── Focus time display ──
  const focusTimeDisplay = useMemo(() => {
    const total = focusSecondsToday;
    if (total < 60) return total > 0 ? `${total}s` : "0m";
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }, [focusSecondsToday]);

  // ── Focus CTA label ──
  const focusLabel = useMemo(() => {
    if (isRunning) {
      const m = Math.floor(remainingSeconds / 60);
      const s = remainingSeconds % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    if (isPaused) return "Paused";
    return "Start focus session";
  }, [isRunning, isPaused, remainingSeconds]);

  const focusSub = useMemo(() => {
    if (isRunning || isPaused) return `${sessionType} · ${Math.floor(useFocusStore.getState().totalSeconds / 60)} min`;
    return "Pomodoro · 25 min";
  }, [isRunning, isPaused, sessionType]);

  // ── Handlers ──
  const handleToggleTask = useCallback((id: string) => toggleTask(id), [toggleTask]);

  const handleFocusStart = useCallback(() => {
    if (isRunning) {
      pauseSession();
    } else if (isPaused) {
      resumeSession();
    } else {
      startSession("Pomodoro");
    }
  }, [isRunning, isPaused, startSession, pauseSession, resumeSession]);

  const handleFocusStop = useCallback(() => {
    stopSession();
  }, [stopSession]);

  // ── User display — from auth (name set at login) ──
  const displayName = user?.name ?? MOCK_USER.name;
  const { first, last } = splitName(displayName);
  const initials = getInitials(displayName);
  const greeting = getGreeting();

  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  // ── Dynamic stat cards ──
  const statCards = useMemo(() => [
    {
      bg: "#c8e6c9",
      label: "Focus today",
      value: focusTimeDisplay,
      subtitle: isRunning ? "Session active" : "Tap Start to begin",
      labelColor: "#166534",
      valueColor: "#14532d",
      subtitleColor: "#166534",
    },
    {
      bg: "#f8d7e3",
      label: "Tasks done",
      value: String(doneTodayCount),
      subtitle: `${remainingCount} remaining today`,
      labelColor: "#9d174d",
      valueColor: "#831843",
      subtitleColor: "#9d174d",
    },
    {
      bg: "#fef3c7",
      label: "Streak",
      value: "14 days",
      subtitle: "Personal best!",
      labelColor: "#92400e",
      valueColor: "#78350f",
      subtitleColor: "#92400e",
    },
    {
      bg: "#dbeafe",
      label: "Habit rate",
      value: "92%",
      subtitle: "This week",
      labelColor: "#1e40af",
      valueColor: "#1e3a8a",
      subtitleColor: "#1e40af",
    },
  ], [focusTimeDisplay, isRunning, doneTodayCount, remainingCount]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting row */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingSub}>{greeting} ☀</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              <Text style={styles.greetingFirst}>{first} </Text>
              {last ? <Text style={styles.greetingLast}>{last}</Text> : null}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </Animated.View>

        {/* Filter pills — live filtering */}
        <Animated.View entering={FadeInDown.delay(40).duration(400)}>
          <FilterPills options={FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
        </Animated.View>

        {/* Productivity score card */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>PRODUCTIVITY SCORE</Text>
            <Text style={styles.scoreNumber}>{MOCK_SCORE.value}</Text>
            <Text style={styles.scoreTrend}>↑ {MOCK_SCORE.trend}</Text>
          </View>
          <ProductivityRing score={MOCK_SCORE.value} size={80} />
        </Animated.View>

        {/* Pastel stat grid — live data */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.statGrid}>
          <StatCard {...statCards[0]} />
          <StatCard {...statCards[1]} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.statGrid}>
          <StatCard {...statCards[2]} />
          <StatCard {...statCards[3]} />
        </Animated.View>

        {/* Tasks section — live from store */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionGap}>
          <SectionHeader label={activeFilter === "All" ? "All Pending Tasks" : `${activeFilter}'s Tasks`} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <TasksCard
            tasks={todayTasks}
            remainingCount={remainingCount}
            onToggle={handleToggleTask}
          />
        </Animated.View>

        {/* Habits section */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.sectionGap}>
          <SectionHeader label="Habits" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <HabitsCard
            habits={MOCK_HABITS}
            heatmapCells={MOCK_HEATMAP}
            heatmapLabel="Exercise · last 5 weeks"
          />
        </Animated.View>

        {/* Focus CTA — live timer */}
        <Animated.View entering={FadeInDown.delay(360).duration(400)} style={styles.focusGap}>
          <FocusCTACard
            onStart={handleFocusStart}
            onStop={handleFocusStop}
            isRunning={isRunning}
            isPaused={isPaused}
            label={focusLabel}
            subtitle={focusSub}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },

  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 2, marginBottom: 2 },
  greetingLeft: { flex: 1, marginRight: 12 },
  greetingSub: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#888888", marginBottom: 2 },
  greetingName: { fontSize: 22, lineHeight: 26 },
  greetingFirst: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, color: "#1a1a1a" },
  greetingLast: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, color: "#b8a9f0" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#b8a9f0", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 13, color: "#ffffff" },

  scoreCard: { backgroundColor: "#b8a9f0", borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLeft: { flex: 1, marginRight: 12 },
  scoreLabel: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#7a6eb0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  scoreNumber: { fontFamily: FontFamily.poppins.black, fontSize: 42, color: "#1a1a1a", lineHeight: 46 },
  scoreTrend: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#5a4fa0", marginTop: 4 },

  statGrid: { flexDirection: "row", gap: 8 },
  sectionGap: { marginTop: 10 },
  focusGap: { marginTop: 2 },
});
