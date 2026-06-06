import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { useHabitStore } from "@/store/useHabitStore";
import { HabitRow } from "./HabitRow";
import { HabitHeatmap } from "./HabitHeatmap";
import { HabitEmptyState } from "./HabitEmptyState";
import { HabitIcon } from "./HabitIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubView = "Today" | "Weekly" | "Overall";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Sub-view pill toggle ─────────────────────────────────────────────────────

const SubViewToggle = memo(function SubViewToggle({
  active,
  onChange,
}: {
  active: SubView;
  onChange: (v: SubView) => void;
}) {
  const views: SubView[] = ["Today", "Weekly", "Overall"];
  return (
    <View style={styles.subToggleRow}>
      {views.map((v) => (
        <Pressable
          key={v}
          onPress={() => { Haptics.selectionAsync(); onChange(v); }}
          style={[
            styles.subPill,
            active === v ? styles.subPillActive : styles.subPillInactive,
          ]}
        >
          <Text style={[
            styles.subPillText,
            active === v ? styles.subPillTextActive : styles.subPillTextInactive,
          ]}>
            {v}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// ─── Today view ───────────────────────────────────────────────────────────────

const TodayView = memo(function TodayView({ onAddHabit }: { onAddHabit: () => void }) {
  const habits = useHabitStore((s) => s.habits);
  const habitLogs = useHabitStore((s) => s.logs);
  const logCompletion = useHabitStore((s) => s.logCompletion);
  const isCompleted = useHabitStore((s) => s.isCompleted);
  const getStreakForHabit = useHabitStore((s) => s.getStreakForHabit);
  const getLast5Days = useHabitStore((s) => s.getLast5Days);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  const todayStr = toISO(new Date());

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const handleToggle = useCallback((habitId: string, date: string) => {
    // Always call logCompletion — the store's cycling logic handles reset
    logCompletion(habitId, date);
  }, [logCompletion]);

  const handleDelete = useCallback((habitId: string) => {
    deleteHabit(habitId);
  }, [deleteHabit]);

  if (habits.length === 0) {
    return <HabitEmptyState onAdd={onAddHabit} />;
  }

  return (
    <View style={styles.todayContainer}>
      {/* Header */}
      <View style={styles.todayHeader}>
        <Text style={styles.todayTitle}>Today's Habits</Text>
        <Text style={styles.todayDate}>{dateLabel}</Text>
      </View>

      {/* Habit card */}
      <View style={styles.habitCard}>
        {habits.map((habit, i) => {
          const log = habitLogs.find(l => l.habitId === habit.id && l.date === todayStr);
          return (
            <Animated.View
              key={habit.id}
              entering={FadeInDown.delay(i * 50).duration(350)}
            >
              <HabitRow
                habit={habit}
                streak={getStreakForHabit(habit.id)}
                isCompleted={isCompleted(habit.id, todayStr)}
                currentCompletions={log?.completions ?? 0}
                last5Days={getLast5Days(habit.id)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                todayDate={todayStr}
                isLast={i === habits.length - 1}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

// ─── Weekly view ──────────────────────────────────────────────────────────────

const WeeklyView = memo(function WeeklyView() {
  const habits = useHabitStore((s) => s.habits);
  const isCompleted = useHabitStore((s) => s.isCompleted);

  // Build Mon–Sun dates for current week
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(today, mondayOffset);
  const weekDates = WEEK_DAYS.map((_, i) => toISO(addDays(monday, i)));

  if (habits.length === 0) {
    return (
      <View style={styles.emptyCenter}>
        <Text style={styles.emptyText}>No habits yet. Add one to track your week.</Text>
      </View>
    );
  }

  return (
    <View style={styles.weeklyCard}>
      {habits.map((habit, hi) => (
        <Animated.View
          key={habit.id}
          entering={FadeInDown.delay(hi * 60).duration(350)}
          style={[styles.weeklyRow, hi < habits.length - 1 && styles.weeklyRowBorder]}
        >
          {/* Icon + name */}
          <View style={styles.weeklyLeft}>
            <View style={[styles.weeklyIconBox, { backgroundColor: hexToRgba(habit.color, 0.15) }]}>
              <HabitIcon name={habit.icon} size={16} color={habit.color} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.weeklyHabitName} numberOfLines={1}>{habit.name}</Text>
              <Text style={styles.weeklyFreq}>Everyday</Text>
            </View>
          </View>

          {/* 7 day circles */}
          <View style={styles.weeklyDays}>
            {WEEK_DAYS.map((day, di) => {
              const done = isCompleted(habit.id, weekDates[di]);
              return (
                <View key={day} style={styles.weeklyDayCol}>
                  <Text style={styles.weeklyDayLabel}>{day.slice(0, 1)}</Text>
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
        </Animated.View>
      ))}
    </View>
  );
});

// ─── Overall view ─────────────────────────────────────────────────────────────

const OverallView = memo(function OverallView() {
  const habits = useHabitStore((s) => s.habits);
  const getStreakForHabit = useHabitStore((s) => s.getStreakForHabit);
  const getSuccessRate = useHabitStore((s) => s.getSuccessRate);
  const getBestStreak = useHabitStore((s) => s.getBestStreak);
  const getHeatmapData = useHabitStore((s) => s.getHeatmapData);
  const getTotalCompleted = useHabitStore((s) => s.getTotalCompleted);

  const totalStreak = useMemo(() =>
    habits.length > 0
      ? Math.max(...habits.map((h) => getStreakForHabit(h.id)))
      : 0,
    [habits, getStreakForHabit],
  );

  const avgSuccessRate = useMemo(() =>
    habits.length > 0
      ? Math.round(habits.reduce((sum, h) => sum + getSuccessRate(h.id), 0) / habits.length)
      : 0,
    [habits, getSuccessRate],
  );

  const bestStreak = useMemo(() =>
    habits.length > 0
      ? Math.max(...habits.map((h) => getBestStreak(h.id)))
      : 0,
    [habits, getBestStreak],
  );

  const totalCompleted = getTotalCompleted();

  const summaryTiles = [
    { label: "Current Streak", value: `${totalStreak}`, unit: "days", bg: "#fef3c7", labelColor: "#92400e", valueColor: "#78350f" },
    { label: "Success Rate",   value: `${avgSuccessRate}%`, unit: "avg", bg: "#dbeafe", labelColor: "#1e40af", valueColor: "#1e3a8a" },
    { label: "Best Streak",    value: `${bestStreak}`, unit: "days", bg: "#dcfce7", labelColor: "#166534", valueColor: "#14532d" },
    { label: "Done Today",     value: `${totalCompleted}`, unit: "habits", bg: "#fce7f3", labelColor: "#9d174d", valueColor: "#831843" },
  ];

  return (
    <View style={styles.overallContainer}>
      {/* 2×2 summary grid */}
      <View style={styles.summaryGrid}>
        {summaryTiles.map((tile, i) => (
          <Animated.View
            key={tile.label}
            entering={FadeInDown.delay(i * 50).duration(350)}
            style={[styles.summaryTile, { backgroundColor: tile.bg }]}
          >
            <Text style={[styles.summaryLabel, { color: tile.labelColor }]}>
              {tile.label.toUpperCase()}
            </Text>
            <Text style={[styles.summaryValue, { color: tile.valueColor }]}>
              {tile.value}
            </Text>
            <Text style={[styles.summaryUnit, { color: tile.labelColor }]}>
              {tile.unit}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* Per-habit heatmaps */}
      {habits.length > 0 && (
        <View style={styles.heatmapCard}>
          <Text style={styles.heatmapCardTitle}>Activity Heatmaps</Text>
          <View style={styles.heatmapList}>
            {habits.map((habit, i) => (
              <Animated.View
                key={habit.id}
                entering={FadeInDown.delay(200 + i * 80).duration(350)}
                style={[styles.heatmapItem, i < habits.length - 1 && styles.heatmapItemBorder]}
              >
                <HabitHeatmap
                  habitName={habit.name}
                  frequency="Everyday"
                  cells={getHeatmapData(habit.id, 8)}
                />
              </Animated.View>
            ))}
          </View>
        </View>
      )}

      {habits.length === 0 && (
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Add habits to see your analytics.</Text>
        </View>
      )}
    </View>
  );
});

// ─── Main HabitsTab ───────────────────────────────────────────────────────────

interface HabitsTabProps {
  onAddHabit: () => void;
  scrollPaddingBottom: number;
}

export const HabitsTab = memo(function HabitsTab({
  onAddHabit,
  scrollPaddingBottom,
}: HabitsTabProps) {
  const [subView, setSubView] = useState<SubView>("Today");

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.tabContent, { paddingBottom: scrollPaddingBottom }]}
    >
      <SubViewToggle active={subView} onChange={setSubView} />

      {subView === "Today"   && <TodayView onAddHabit={onAddHabit} />}
      {subView === "Weekly"  && <WeeklyView />}
      {subView === "Overall" && <OverallView />}
    </ScrollView>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },

  subToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  subPill: {
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  subPillActive: { backgroundColor: "#1a1a1a" },
  subPillInactive: { backgroundColor: "#eceae5" },
  subPillText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12 },
  subPillTextActive: { color: "#fff" },
  subPillTextInactive: { color: "#666" },

  // Today
  todayContainer: { gap: 12 },
  todayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 18,
    color: "#18181b",
  },
  todayDate: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "#8b8b8b",
  },
  habitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    overflow: "hidden",
  },

  // Weekly
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

  // Overall
  overallContainer: { gap: 12 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryTile: {
    width: "47.5%",
    borderRadius: 20,
    padding: 14,
    gap: 2,
  },
  summaryLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontFamily: FontFamily.poppins.extraBold,
    fontSize: 26,
    lineHeight: 30,
  },
  summaryUnit: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
  },
  heatmapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    padding: 16,
    gap: 14,
  },
  heatmapCardTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "#1a1a1a",
  },
  heatmapList: { gap: 18 },
  heatmapItem: { paddingBottom: 18 },
  heatmapItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeebe6",
  },

  // Shared
  emptyCenter: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "#8b8b8b",
    textAlign: "center",
  },
});
