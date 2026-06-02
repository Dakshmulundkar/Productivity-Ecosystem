import React, { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  AppState,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Check, Plus } from "lucide-react-native";

import { useAuth } from "@/lib/auth-context";
import { FontFamily } from "@/lib/_core/theme";
import { getGreeting, splitName, getInitials } from "@/lib/dashboard-utils";
import { useRouter } from "expo-router";
import { SectionHeader } from "@/components/ui/section-header";
import { FilterPills } from "@/components/ui/filter-pills";
import { ProductivityRing } from "@/components/dashboard/productivity-ring";
import { StatCard } from "@/components/dashboard/stat-card";
import { TasksCard } from "@/components/dashboard/tasks-card";
import type { Task as DashTask } from "@/components/dashboard/tasks-card";
import { FocusCTACard } from "@/components/dashboard/focus-cta-card";
import { useTaskStore } from "@/store/useTaskStore";
import { useFocusStore } from "@/store/useFocusStore";
import { useHabitStore } from "@/store/useHabitStore";
import { HabitRow, hexToRgba } from "@/components/habits/HabitRow";
import { HabitEmptyState } from "@/components/habits/HabitEmptyState";
import { HabitIcon } from "@/components/habits/HabitIcons";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { NewHabitSheet } from "@/components/habits/NewHabitSheet";
import { useProfileStore } from "@/store/useProfileStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const FILTER_OPTIONS = ["Today", "Tomorrow", "All"];

function priorityToTag(priority: string): DashTask["tag"] {
  if (priority === "High") return "HighPriority";
  if (priority === "Medium") return "Personal";
  return "Work";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Stores ──
  const storeTasks        = useTaskStore((s) => s.tasks);
  const toggleTask        = useTaskStore((s) => s.toggleTask);
  const habits            = useHabitStore((s) => s.habits);
  const habitLogs         = useHabitStore((s) => s.logs);
  const logCompletion     = useHabitStore((s) => s.logCompletion);
  const removeLog         = useHabitStore((s) => s.removeLog);
  const isCompleted       = useHabitStore((s) => s.isCompleted);
  const getStreakForHabit = useHabitStore((s) => s.getStreakForHabit);
  const getLast5Days      = useHabitStore((s) => s.getLast5Days);
  const getHeatmapData    = useHabitStore((s) => s.getHeatmapData);
  const deleteHabit       = useHabitStore((s) => s.deleteHabit);

  const isRunning         = useFocusStore((s) => s.isRunning);
  const isPaused          = useFocusStore((s) => s.isPaused);
  const sessionType       = useFocusStore((s) => s.sessionType);
  const remainingSeconds  = useFocusStore((s) => s.remainingSeconds);
  const focusSecondsToday = useFocusStore((s) => s.focusSecondsToday);
  const startSession      = useFocusStore((s) => s.startSession);
  const pauseSession      = useFocusStore((s) => s.pauseSession);
  const resumeSession     = useFocusStore((s) => s.resumeSession);
  const stopSession       = useFocusStore((s) => s.stopSession);
  const syncTimer         = useFocusStore((s) => s.syncTimer);
  const totalSeconds      = useFocusStore((s) => s.totalSeconds);

  const [activeFilter, setActiveFilter] = useState<string>("Today");
  const [habitView, setHabitView] = useState<"Today" | "Weekly" | "Overall">("Today");
  const [showNewHabit, setShowNewHabit] = useState(false);

  const addHabitScale = useSharedValue(1);
  const addHabitStyle = useAnimatedStyle(() => ({ transform: [{ scale: addHabitScale.value }] }));

  const handleAddHabit = useCallback(() => {
    addHabitScale.value = withSpring(0.88, { damping: 12, stiffness: 350 }, () => {
      addHabitScale.value = withSpring(1, { damping: 12, stiffness: 350 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNewHabit(true);
  }, [addHabitScale]);

  // ── Floating focus bar — hide on scroll, show after 5s idle ──
  const focusBarOpacity  = useSharedValue(1);
  const focusBarTranslateY = useSharedValue(0);
  const idleTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef   = useRef(false);

  const showFocusBar = useCallback(() => {
    focusBarOpacity.value    = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    focusBarTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [focusBarOpacity, focusBarTranslateY]);

  const hideFocusBar = useCallback(() => {
    focusBarOpacity.value    = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
    focusBarTranslateY.value = withTiming(16, { duration: 200, easing: Easing.in(Easing.ease) });
  }, [focusBarOpacity, focusBarTranslateY]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // When a session is running always keep it visible so user can see timer
    if (isRunning) { showFocusBar(); return; }
    idleTimerRef.current = setTimeout(() => {
      if (!isScrollingRef.current) showFocusBar();
    }, 5000);
  }, [showFocusBar, isRunning]);

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Don't hide while session is running — user needs to see the timer
    if (!isRunning) hideFocusBar();
  }, [hideFocusBar, isRunning]);

  const handleScrollEnd = useCallback((_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = false;
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Start idle timer on mount; re-run when isRunning changes
  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  const focusBarAnimStyle = useAnimatedStyle(() => ({
    opacity: focusBarOpacity.value,
    transform: [{ translateY: focusBarTranslateY.value }],
  }));

  // ── Derived dates ──
  const todayISO    = toISO(new Date());
  const tomorrowISO = toISO(addDays(new Date(), 1));

  // ── Filtered tasks — Optimized for zero-lag ──
  const filteredTasks = useMemo((): DashTask[] => {
    // console.log("[Performance] Re-calculating tasks...");
    const filtered = storeTasks.filter((t) => {
      if (activeFilter === "All") return !t.done;
      if (activeFilter === "Tomorrow") return t.dueDateISO === tomorrowISO;
      return t.dueDateISO === todayISO; // "Today"
    });
    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      time: t.done ? "Completed" : `Due ${t.dueDateISO === todayISO ? "today" : t.dueDateISO === tomorrowISO ? "tomorrow" : t.dueDateISO}`,
      tag: priorityToTag(t.priority),
      done: t.done,
    }));
  }, [storeTasks, activeFilter, todayISO, tomorrowISO]);

  const remainingCount = useMemo(() => filteredTasks.filter((t) => !t.done).length, [filteredTasks]);
  const doneTodayCount = useMemo(() => storeTasks.filter((t) => t.done && t.dueDateISO === todayISO).length, [storeTasks, todayISO]);

  // ── Live habit rate (today) ──
  const habitRate = useMemo(() => {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h) => isCompleted(h.id, todayISO)).length;
    return Math.round((completed / habits.length) * 100);
  }, [habits, isCompleted, todayISO]);

  // ── Live streak — longest current consecutive days with any task done ──
  const currentStreak = useMemo(() => {
    const doneDates = new Set(
      storeTasks.filter((t) => t.done).map((t) => t.dueDateISO),
    );
    if (doneDates.size === 0) return 0;

    let streak = 0;
    let d = new Date();
    // Check if today is completed, if not, check yesterday to keep streak alive
    if (!doneDates.has(toISO(d))) {
      d = addDays(d, -1);
    }
    
    // Max 1000 days to prevent any runaway loops
    while (doneDates.has(toISO(d)) && streak < 1000) {
      streak++;
      d = addDays(d, -1);
    }
    return streak;
  }, [storeTasks]);

  // ── Productivity score — weighted composite of today's metrics ──
  const productivityScore = useMemo(() => {
    const totalToday = storeTasks.filter((t) => t.dueDateISO === todayISO).length;
    const taskScore = totalToday > 0 ? (doneTodayCount / totalToday) * 40 : 0; // 40% weight
    const focusScore = Math.min(focusSecondsToday / (2 * 3600), 1) * 30;       // 30% weight (2h = 100%)
    const habitScore = (habitRate / 100) * 30;                                  // 30% weight
    return Math.round(taskScore + focusScore + habitScore);
  }, [storeTasks, doneTodayCount, focusSecondsToday, habitRate, todayISO]);

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
    if (isRunning || isPaused) return `${sessionType} · ${Math.floor(totalSeconds / 60)} min`;
    return "Pomodoro · 25 min";
  }, [isRunning, isPaused, sessionType, totalSeconds]);

  // ── Handlers ──
  const handleToggleTask  = useCallback((id: string) => toggleTask(id), [toggleTask]);
  const handleHabitToggle = useCallback((habitId: string, date: string) => {
    // Always call logCompletion — the store's cycling logic handles
    // incrementing and resetting (0→1→...→max→0) automatically.
    logCompletion(habitId, date);
  }, [logCompletion]);

  const handleHabitDelete = useCallback((habitId: string) => {
    deleteHabit(habitId);
  }, [deleteHabit]);
  const handleFocusStart  = useCallback(() => {
    if (isRunning) pauseSession();
    else if (isPaused) resumeSession();
    else startSession("Pomodoro");
  }, [isRunning, isPaused, startSession, pauseSession, resumeSession]);
  const handleFocusStop   = useCallback(() => stopSession(), [stopSession]);

  // ── Weekly habit dates (Mon–Sun) ──
  const weekDates = useMemo(() => {
    const dow = new Date().getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = addDays(new Date(), mondayOffset);
    const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return WEEK_DAYS.map((label, i) => ({
      label,
      iso: toISO(addDays(monday, i)),
    }));
  }, []);

  // ── User display — Prefer profile store name over auth display name ──
  const profileName = useProfileStore((s) => s.name);
  const displayName = profileName || user?.name || "";
  const { first, last } = splitName(displayName || "there");
  const initials = displayName ? getInitials(displayName) : "?";
  const greeting = getGreeting();

  // Extra padding so content scrolls clear of the floating focus bar (bar height ~78px)
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24 + 88;

  // ── Stat cards — optimized for zero-lag ──
  const statCards = useMemo(() => {
    // console.log("[Performance] Re-calculating stats...");
    return [
      {
        bg: "#c8e6c9",
        label: "Focus today",
        value: focusTimeDisplay,
        subtitle: isRunning ? "Session active" : "Tap Start to begin",
        labelColor: "#166534", valueColor: "#14532d", subtitleColor: "#166534",
      },
      {
        bg: "#f8d7e3",
        label: "Tasks done",
        value: String(doneTodayCount),
        subtitle: `${remainingCount} remaining today`,
        labelColor: "#9d174d", valueColor: "#831843", subtitleColor: "#9d174d",
      },
      {
        bg: "#fef3c7",
        label: "Streak",
        value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}`,
        subtitle: currentStreak > 0 ? "Keep it up!" : "Start today",
        labelColor: "#92400e", valueColor: "#78350f", subtitleColor: "#92400e",
      },
      {
        bg: "#dbeafe",
        label: "Habit rate",
        value: `${habitRate}%`,
        subtitle: "Today",
        labelColor: "#1e40af", valueColor: "#1e3a8a", subtitleColor: "#1e40af",
      },
    ];
  }, [focusTimeDisplay, isRunning, doneTodayCount, remainingCount, currentStreak, habitRate]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollBegin={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingSub}>{greeting} ☀</Text>
            {/* Name auto-shrinks to fit — never truncates with ... */}
            <Text
              style={styles.greetingName}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              numberOfLines={1}
            >
              <Text style={styles.greetingFirst}>{first} </Text>
              {last ? <Text style={styles.greetingLast}>{last}</Text> : null}
            </Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/profile"); }}
            hitSlop={8}
            style={styles.avatar}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Filter pills */}
        <Animated.View entering={FadeInDown.delay(40).duration(400)}>
          <FilterPills options={FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
        </Animated.View>

        {/* Productivity score — live */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>PRODUCTIVITY SCORE</Text>
            <Text style={styles.scoreNumber}>{productivityScore}</Text>
            <Text style={styles.scoreTrend}>
              {productivityScore >= 70 ? "↑ Great progress today" :
               productivityScore >= 40 ? "→ Keep going" :
               "↓ Let's get started"}
            </Text>
          </View>
          <ProductivityRing score={productivityScore} size={80} />
        </Animated.View>

        {/* Stat grid — all live */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.statGrid}>
          <StatCard {...statCards[0]} />
          <StatCard {...statCards[1]} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.statGrid}>
          <StatCard {...statCards[2]} />
          <StatCard {...statCards[3]} />
        </Animated.View>

        {/* Tasks section */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionGap}>
          <SectionHeader label={activeFilter === "All" ? "All Pending Tasks" : `${activeFilter}'s Tasks`} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <TasksCard tasks={filteredTasks} remainingCount={remainingCount} onToggle={handleToggleTask} />
        </Animated.View>

        {/* Habits section — header with toggle + add button */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.sectionGap}>
          <View style={styles.habitSectionHeader}>
            {/* Left: label + sub-view toggle (same style as Stats Habits tab) */}
            <View style={styles.habitHeaderLeft}>
              <Text style={styles.habitSectionLabel}>HABITS</Text>
              <View style={styles.habitToggleRow}>
                {(["Today", "Weekly", "Overall"] as const).map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => { Haptics.selectionAsync(); setHabitView(v); }}
                    style={[
                      styles.habitTogglePill,
                      habitView === v ? styles.habitTogglePillActive : styles.habitTogglePillInactive,
                    ]}
                  >
                    <Text style={[
                      styles.habitToggleText,
                      habitView === v ? styles.habitToggleTextActive : styles.habitToggleTextInactive,
                    ]}>
                      {v}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Right: + button */}
            <Animated.View style={addHabitStyle}>
              <Pressable onPress={handleAddHabit} style={styles.habitAddBtn}>
                <Plus size={16} color="#ffffff" strokeWidth={2.5} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(400)}>
          {/* TODAY view */}
          {habitView === "Today" && (
            habits.length === 0 ? (
              <HabitEmptyState onAdd={handleAddHabit} />
            ) : (
              <View style={styles.habitCard}>
                {habits.map((habit, i) => {
                  const log = habitLogs.find(l => l.habitId === habit.id && l.date === todayISO);
                  return (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      streak={getStreakForHabit(habit.id)}
                      isCompleted={isCompleted(habit.id, todayISO)}
                      currentCompletions={log?.completions ?? 0}
                      last5Days={getLast5Days(habit.id)}
                      onToggle={handleHabitToggle}
                      onDelete={handleHabitDelete}
                      todayDate={todayISO}
                      isLast={i === habits.length - 1}
                    />
                  );
                })}
              </View>
            )
          )}

          {/* WEEKLY view */}
          {habitView === "Weekly" && (
            habits.length === 0 ? (
              <HabitEmptyState onAdd={handleAddHabit} />
            ) : (
              <View style={styles.weeklyCard}>
                {habits.map((habit, hi) => (
                  <View
                    key={habit.id}
                    style={[styles.weeklyRow, hi < habits.length - 1 && styles.weeklyRowBorder]}
                  >
                    <View style={styles.weeklyLeft}>
                      <View style={[styles.weeklyIconBox, { backgroundColor: hexToRgba(habit.color, 0.15) }]}>
                        <HabitIcon name={habit.icon} size={16} color={habit.color} strokeWidth={2} />
                      </View>
                      <View>
                        <Text style={styles.weeklyHabitName} numberOfLines={1}>{habit.name}</Text>
                        <Text style={styles.weeklyFreq}>Everyday</Text>
                      </View>
                    </View>
                    <View style={styles.weeklyDays}>
                      {weekDates.map((day) => {
                        const done = isCompleted(habit.id, day.iso);
                        return (
                          <View key={day.label} style={styles.weeklyDayCol}>
                            <Text style={styles.weeklyDayLabel}>{day.label.slice(0, 1)}</Text>
                            <View style={[
                              styles.weeklyCircle,
                              done
                                ? { backgroundColor: habit.color, borderColor: habit.color }
                                : styles.weeklyCircleEmpty,
                            ]}>
                              {done && <Check size={10} color="#fff" strokeWidth={2.5} />}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )
          )}

          {/* OVERALL view */}
          {habitView === "Overall" && (
            habits.length === 0 ? (
              <HabitEmptyState onAdd={handleAddHabit} />
            ) : (
              <View style={styles.overallCard}>
                {habits.map((habit, i) => (
                  <View
                    key={habit.id}
                    style={[styles.overallItem, i < habits.length - 1 && styles.overallItemBorder]}
                  >
                    <HabitHeatmap
                      habitName={habit.name}
                      frequency="Everyday"
                      cells={getHeatmapData(habit.id, 8)}
                    />
                  </View>
                ))}
              </View>
            )
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Floating Focus Bar — fixed above tab bar, hide on scroll ── */}
      <Animated.View
        style={[
          styles.floatingFocusBar,
          { bottom: insets.bottom + 64 + 12 + 10 },
          focusBarAnimStyle,
        ]}
      >
        <FocusCTACard
          onStart={handleFocusStart}
          onStop={handleFocusStop}
          isRunning={isRunning}
          isPaused={isPaused}
          label={focusLabel}
          subtitle={focusSub}
        />
      </Animated.View>

      {/* New Habit Sheet */}
      <NewHabitSheet
        visible={showNewHabit}
        onClose={() => setShowNewHabit(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },
  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 2, marginBottom: 2 },
  greetingLeft: { flex: 1, marginRight: 12 },
  greetingSub: { fontFamily: FontFamily.inter.regular, fontSize: 15, color: "#888888", marginBottom: 2 },
  greetingName: { fontSize: 28, lineHeight: 32 },
  greetingFirst: { fontFamily: FontFamily.poppins.extraBold, fontSize: 28, color: "#1a1a1a" },
  greetingLast: { fontFamily: FontFamily.poppins.extraBold, fontSize: 28, color: "#b8a9f0" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#b8a9f0", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 13, color: "#ffffff" },
  scoreCard: { backgroundColor: "#b8a9f0", borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLeft: { flex: 1, marginRight: 12 },
  scoreLabel: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#7a6eb0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  scoreNumber: { fontFamily: FontFamily.poppins.black, fontSize: 42, color: "#1a1a1a", lineHeight: 46 },
  scoreTrend: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#5a4fa0", marginTop: 4 },
  statGrid: { flexDirection: "row", gap: 8 },
  sectionGap: { marginTop: 10 },
  floatingFocusBar: {
    position: "absolute",
    left: 16,
    right: 16,
    // shadow so it floats above content
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  habitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    overflow: "hidden",
  },
  weeklyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    overflow: "hidden",
    paddingVertical: 4,
  },
  weeklyRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  weeklyRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeebe6",
  },
  weeklyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  weeklyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyHabitName: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: "#18181b",
  },
  weeklyFreq: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#8b8b8b",
  },
  weeklyDays: {
    flexDirection: "row",
    gap: 6,
  },
  weeklyDayCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  weeklyDayLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 8,
    color: "#aaa",
  },
  weeklyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  weeklyCircleEmpty: {
    borderColor: "#ddd",
    backgroundColor: "transparent",
  },

  // ── Habits section header ──────────────────────────────────────────────────
  habitSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  habitHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  habitSectionLabel: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 12,
    color: "#aaaaaa",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  // Toggle pills — identical to HabitsTab in Stats
  habitToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  habitTogglePill: {
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  habitTogglePillActive: {
    backgroundColor: "#1a1a1a",
  },
  habitTogglePillInactive: {
    backgroundColor: "#eceae5",
  },
  habitToggleText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
  },
  habitToggleTextActive: {
    color: "#ffffff",
  },
  habitToggleTextInactive: {
    color: "#666666",
  },
  // + button
  habitAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  // Overall heatmap card
  overallCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    padding: 16,
    gap: 18,
  },
  overallItem: {
    paddingBottom: 18,
  },
  overallItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeebe6",
  },
});
