import React, { useState, useCallback, useEffect, memo, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { TrendingUp, Plus } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { HabitsTab } from "@/components/habits/HabitsTab";
import { NewHabitSheet } from "@/components/habits/NewHabitSheet";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { useTaskStore } from "@/store/useTaskStore";
import { useFocusStore } from "@/store/useFocusStore";
import { useHabitStore } from "@/store/useHabitStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = "Analytics" | "Habits";
type FilterOption = "Today" | "Weekly" | "Monthly";

interface BarData {
  day: string;
  value: number;
  isToday: boolean;
}

interface MiniStat {
  bg: string;
  label: string;
  value: string;
  sub: string;
  labelColor: string;
  valueColor: string;
  subColor: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function formatFocusHours(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? `${seconds}s` : "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

const MAX_BAR_HEIGHT = 100;

const AnimatedBar = memo(function AnimatedBar({ bar, delay }: { bar: BarData & { prevValue: number }; delay: number }) {
  const height = useSharedValue(0);
  const prevHeight = useSharedValue(0);

  useEffect(() => {
    // Current week animation
    height.value = withDelay(
      delay,
      withTiming((bar.value / 100) * MAX_BAR_HEIGHT, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    // Prev week animation (slightly faster/different delay to distinguish)
    prevHeight.value = withDelay(
      delay + 100,
      withTiming((bar.prevValue / 100) * MAX_BAR_HEIGHT, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [bar.value, bar.prevValue, delay, height, prevHeight]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));
  const prevBarStyle = useAnimatedStyle(() => ({ height: prevHeight.value }));

  return (
    <View style={styles.barColumn}>
      <Text style={[styles.barPercent, bar.isToday ? styles.barPercentToday : null]}>
        {bar.value}%
      </Text>
      <View style={styles.barTrack}>
        {/* Previous Week Bar (Light Shade) */}
        <Animated.View style={[styles.barFillPrev, prevBarStyle]} />
        {/* This Week Bar (Black/Solid) */}
        <Animated.View style={[styles.barFill, bar.isToday ? styles.barFillToday : null, barStyle]} />
      </View>
      <Text style={[styles.barDay, bar.isToday ? styles.barDayToday : null]}>{bar.day}</Text>
    </View>
  );
});

// ─── Mini stat card ───────────────────────────────────────────────────────────

const MiniStatCard = memo(function MiniStatCard({ stat }: { stat: MiniStat }) {
  return (
    <View style={[styles.miniCard, { backgroundColor: stat.bg }]}>
      <Text style={[styles.miniLabel, { color: stat.labelColor }]}>{stat.label.toUpperCase()}</Text>
      <Text style={[styles.miniValue, { color: stat.valueColor }]}>{stat.value}</Text>
      <Text style={[styles.miniSub,   { color: stat.subColor   }]}>{stat.sub}</Text>
    </View>
  );
});

// ─── Score progress bar ───────────────────────────────────────────────────────

function ScoreProgressBar({ percent, goal }: { percent: number; goal: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min((percent / goal) * 100, 100), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, goal, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <View style={styles.scoreBarTrack}>
      <Animated.View style={[styles.scoreBarFill, fillStyle]} />
    </View>
  );
}

// ─── Analytics tab content ────────────────────────────────────────────────────

const AnalyticsContent = memo(function AnalyticsContent({
  scrollPaddingBottom,
}: {
  scrollPaddingBottom: number;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("Today");
  const filters: FilterOption[] = ["Today", "Weekly", "Monthly"];

  // ── Live data from stores ──
  const tasks     = useTaskStore((s) => s.tasks);
  const habits    = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const focusSecondsToday = useFocusStore((s) => s.focusSecondsToday);
  const getHeatmapData = useHabitStore((s) => s.getHeatmapData);

  const todayISO = toISO(new Date());
  const todayDow = new Date().getDay(); // 0=Sun

  // ── Weekly bar data — comparison of this week vs last week ──
  const weekBars = useMemo((): (BarData & { prevValue: number })[] => {
    const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const baseDate = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(baseDate, i - todayDow + (todayDow === 0 ? -6 : 1)); // Mon this week
      const dPrev = addDays(d, -7); // Mon last week
      
      const isoThis = toISO(d);
      const isoPrev = toISO(dPrev);

      // This week stats
      const totalThis = tasks.filter((t) => t.dueDateISO === isoThis).length;
      const doneThis  = tasks.filter((t) => t.dueDateISO === isoThis && t.done).length;
      const valueThis = totalThis > 0 ? Math.round((doneThis / totalThis) * 100) : 0;

      // Last week stats
      const totalPrev = tasks.filter((t) => t.dueDateISO === isoPrev).length;
      const donePrev  = tasks.filter((t) => t.dueDateISO === isoPrev && t.done).length;
      const valuePrev = totalPrev > 0 ? Math.round((donePrev / totalPrev) * 100) : 0;

      return { 
        day: DAY_ABBR[d.getDay()], 
        value: valueThis, 
        prevValue: valuePrev,
        isToday: isoThis === todayISO 
      };
    });
  }, [tasks, todayISO, todayDow]);

  // ── Score — composite of tasks/focus/habits for the period ──
  const score = useMemo(() => {
    if (activeFilter === "Today") {
      const total = tasks.filter((t) => t.dueDateISO === todayISO).length;
      const done  = tasks.filter((t) => t.dueDateISO === todayISO && t.done).length;
      const taskScore   = total > 0 ? (done / total) * 40 : 0;
      const focusScore  = Math.min(focusSecondsToday / (2 * 3600), 1) * 30;
      const habitCount  = habits.length > 0
        ? habits.filter((h) => habitLogs.some((l) => l.habitId === h.id && l.date === todayISO && l.completions >= h.completionsPerDay)).length
        : 0;
      const habitScore  = habits.length > 0 ? (habitCount / habits.length) * 30 : 0;
      return Math.round(taskScore + focusScore + habitScore);
    }
    if (activeFilter === "Weekly") {
      const weekDates = Array.from({ length: 7 }, (_, i) =>
        toISO(addDays(new Date(), i - todayDow + (todayDow === 0 ? -6 : 1))),
      );
      const total = tasks.filter((t) => weekDates.includes(t.dueDateISO)).length;
      const done  = tasks.filter((t) => weekDates.includes(t.dueDateISO) && t.done).length;
      return total > 0 ? Math.round((done / total) * 100) : 0;
    }
    // Monthly
    const year = new Date().getFullYear(), month = new Date().getMonth();
    const monthDates = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) =>
      toISO(new Date(year, month, i + 1)),
    );
    const total = tasks.filter((t) => monthDates.includes(t.dueDateISO)).length;
    const done  = tasks.filter((t) => monthDates.includes(t.dueDateISO) && t.done).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [activeFilter, tasks, habits, habitLogs, focusSecondsToday, todayISO, todayDow]);

  const scoreTrend = score >= 70 ? "Great performance" : score >= 40 ? "Making progress" : "Room to grow";

  // ── Mini stats — all live ──
  const miniStats = useMemo((): MiniStat[] => {
    // Focus time
    const focusVal = formatFocusHours(focusSecondsToday);

    // Tasks done
    let tasksDone: number;
    let tasksSub: string;
    if (activeFilter === "Today") {
      tasksDone = tasks.filter((t) => t.dueDateISO === todayISO && t.done).length;
      tasksSub = "Today";
    } else if (activeFilter === "Weekly") {
      const weekDates = Array.from({ length: 7 }, (_, i) =>
        toISO(addDays(new Date(), i - todayDow + (todayDow === 0 ? -6 : 1))),
      );
      tasksDone = tasks.filter((t) => weekDates.includes(t.dueDateISO) && t.done).length;
      tasksSub = "This week";
    } else {
      const year = new Date().getFullYear(), month = new Date().getMonth();
      const monthDates = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) =>
        toISO(new Date(year, month, i + 1)),
      );
      tasksDone = tasks.filter((t) => monthDates.includes(t.dueDateISO) && t.done).length;
      tasksSub = "This month";
    }

    // Streak — consecutive days with at least one task done
    const doneDates = new Set(tasks.filter((t) => t.done).map((t) => t.dueDateISO));
    let streak = 0;
    let d = new Date();
    if (!doneDates.has(toISO(d))) d = addDays(d, -1);
    while (doneDates.has(toISO(d))) { streak++; d = addDays(d, -1); }

    // Habit rate
    const habitRate = habits.length > 0
      ? Math.round(
          habits.filter((h) => habitLogs.some((l) => l.habitId === h.id && l.date === todayISO && l.completions >= h.completionsPerDay)).length
          / habits.length * 100,
        )
      : 0;

    return [
      { bg: "#c8e6c9", label: "Focus Time", value: focusVal,          sub: "Today",    labelColor: "#166534", valueColor: "#14532d", subColor: "#166534" },
      { bg: "#f8d7e3", label: "Tasks Done", value: String(tasksDone), sub: tasksSub,   labelColor: "#9d174d", valueColor: "#831843", subColor: "#9d174d" },
      { bg: "#fef3c7", label: "Streak",     value: `${streak}d`,      sub: streak > 0 ? "Keep going!" : "Start today", labelColor: "#92400e", valueColor: "#78350f", subColor: "#92400e" },
      { bg: "#dbeafe", label: "Habit Rate", value: `${habitRate}%`,   sub: "Today",    labelColor: "#1e40af", valueColor: "#1e3a8a", subColor: "#1e40af" },
    ];
  }, [activeFilter, tasks, habits, habitLogs, focusSecondsToday, todayISO, todayDow]);

  const handleFilter = useCallback((f: FilterOption) => {
    Haptics.selectionAsync();
    setActiveFilter(f);
  }, [setActiveFilter]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.analyticsContent, { paddingBottom: scrollPaddingBottom }]}
    >
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => handleFilter(f)}
            style={[styles.filterPill, activeFilter === f ? styles.filterPillActive : styles.filterPillInactive]}
          >
            <Text style={[styles.filterPillText, activeFilter === f ? styles.filterPillTextActive : styles.filterPillTextInactive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Score card */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreLabel}>PRODUCTIVITY</Text>
          <Text style={styles.scoreNumber}>{score}%</Text>
          <View style={styles.scoreTrendRow}>
            <TrendingUp size={12} color="#5a4fa0" />
            <Text style={styles.scoreTrend}>{scoreTrend}</Text>
          </View>
        </View>
        <View style={styles.scoreBarContainer}>
          <ScoreProgressBar percent={score} goal={90} />
          <Text style={styles.scoreGoal}>Goal: 90%</Text>
        </View>
      </Animated.View>

      {/* Bar chart — comparison week vs week */}
      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.chartCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Weekly Overview</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(0,0,0,0.12)" }]} />
              <Text style={styles.legendText}>Last week</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#1a1a1a" }]} />
              <Text style={styles.legendText}>This week</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.barsRow}>
          {weekBars.map((bar, i) => (
            <AnimatedBar key={bar.day} bar={bar} delay={i * 60} />
          ))}
        </View>
      </Animated.View>

      {/* Mini stat grid — all live */}
      <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.miniGrid}>
        <MiniStatCard stat={miniStats[0]} />
        <MiniStatCard stat={miniStats[1]} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.miniGrid}>
        <MiniStatCard stat={miniStats[2]} />
        <MiniStatCard stat={miniStats[3]} />
      </Animated.View>

      {/* Overall Habits — heatmaps */}
      {habits.length > 0 && (
        <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.heatmapCard}>
          <Text style={styles.cardTitle}>Overall Habits</Text>
          <View style={styles.heatmapList}>
            {habits.map((habit, i) => (
              <View
                key={habit.id}
                style={[styles.heatmapItem, i < habits.length - 1 && styles.heatmapItemBorder]}
              >
                <HabitHeatmap
                  habitName={habit.name}
                  frequency="Everyday"
                  cells={getHeatmapData(habit.id, 8)}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  const [activeTab, setActiveTab] = useState<MainTab>("Analytics");
  const [showNewHabit, setShowNewHabit] = useState(false);

  const addBtnScale = useSharedValue(1);
  const addBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  const handleAddHabit = useCallback(() => {
    addBtnScale.value = withSpring(0.88, { damping: 12, stiffness: 350 }, () => {
      addBtnScale.value = withSpring(1, { damping: 12, stiffness: 350 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNewHabit(true);
  }, [addBtnScale]);

  const handleTabChange = useCallback((tab: MainTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Statistics</Text>
          {activeTab === "Habits" && (
            <Animated.View style={addBtnStyle}>
              <Pressable onPress={handleAddHabit} style={styles.addBtn}>
                <Plus size={18} color="#ffffff" strokeWidth={2.5} />
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* Main tab toggle */}
        <View style={styles.mainTabRow}>
          {(["Analytics", "Habits"] as MainTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[
                styles.mainTab,
                activeTab === tab ? styles.mainTabActive : styles.mainTabInactive,
              ]}
            >
              <Text style={[
                styles.mainTabText,
                activeTab === tab ? styles.mainTabTextActive : styles.mainTabTextInactive,
              ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === "Analytics" && (
        <AnalyticsContent scrollPaddingBottom={scrollPaddingBottom} />
      )}
      {activeTab === "Habits" && (
        <HabitsTab
          onAddHabit={handleAddHabit}
          scrollPaddingBottom={scrollPaddingBottom}
        />
      )}

      {/* New Habit Sheet */}
      <NewHabitSheet
        visible={showNewHabit}
        onClose={() => setShowNewHabit(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#f2f0ec",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.poppins.extraBold,
    fontSize: 22,
    color: "#1a1a1a",
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabRow: {
    flexDirection: "row",
    backgroundColor: "#eceae5",
    borderRadius: 99,
    padding: 3,
    alignSelf: "flex-start",
  },
  mainTab: {
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  mainTabActive: { backgroundColor: "#1a1a1a" },
  mainTabInactive: { backgroundColor: "transparent" },
  mainTabText: { fontFamily: FontFamily.inter.semiBold, fontSize: 13 },
  mainTabTextActive: { color: "#fff" },
  mainTabTextInactive: { color: "#666" },

  analyticsContent: { paddingHorizontal: 16, gap: 10, paddingTop: 8 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterPill: { borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12 },
  filterPillActive: { backgroundColor: "#1a1a1a" },
  filterPillInactive: { backgroundColor: "#eceae5" },
  filterPillText: { fontFamily: FontFamily.inter.semiBold, fontSize: 11 },
  filterPillTextActive: { color: "#fff" },
  filterPillTextInactive: { color: "#666" },

  scoreCard: { backgroundColor: "#b8a9f0", borderRadius: 24, padding: 18, gap: 14 },
  scoreLeft: { flex: 1 },
  scoreLabel: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#7a6eb0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  scoreNumber: { fontFamily: FontFamily.poppins.black, fontSize: 42, color: "#1a1a1a", lineHeight: 46 },
  scoreTrendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  scoreTrend: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#5a4fa0", flex: 1 },
  scoreBarContainer: { gap: 4 },
  scoreBarTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 99, overflow: "hidden" },
  scoreBarFill: { height: 4, backgroundColor: "#1a1a1a", borderRadius: 99 },
  scoreGoal: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#5a4fa0", textAlign: "right" },

  chartCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, gap: 16 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 15, color: "#1a1a1a" },
  legendRow: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontFamily: FontFamily.inter.regular, fontSize: 10, color: "#666" },
  barsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: MAX_BAR_HEIGHT + 40 },
  barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  barPercent: { fontFamily: FontFamily.inter.semiBold, fontSize: 10, color: "#aaa" },
  barPercentToday: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },
  barTrack: { width: 30, height: MAX_BAR_HEIGHT, justifyContent: "flex-end", backgroundColor: "#f8f7f4", borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  barFill: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#d0d0d0", borderRadius: 0, zIndex: 2 },
  barFillPrev: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 0, zIndex: 1 },
  barFillToday: { backgroundColor: "#1a1a1a" },
  barDay: { fontFamily: FontFamily.inter.regular, fontSize: 10, color: "#aaa" },
  barDayToday: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },

  miniGrid: { flexDirection: "row", gap: 8 },
  miniCard: { flex: 1, borderRadius: 20, padding: 14, gap: 2 },
  miniLabel: { fontFamily: FontFamily.inter.semiBold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 },
  miniValue: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, lineHeight: 28 },
  miniSub: { fontFamily: FontFamily.inter.regular, fontSize: 11 },
  heatmapCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, gap: 14 },
  heatmapList: { gap: 18 },
  heatmapItem: { paddingBottom: 18 },
  heatmapItemBorder: { borderBottomWidth: 0.5, borderBottomColor: "#eeebe6" },
});
