import React, { useState, useCallback, useEffect, memo } from "react";
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
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { TrendingUp } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface CategoryRow {
  name: string;
  color: string;
  percent: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const FILTER_DATA: Record<FilterOption, {
  score: number;
  scoreTrend: string;
  bars: BarData[];
  miniStats: MiniStat[];
  categories: CategoryRow[];
}> = {
  Today: {
    score: 84,
    scoreTrend: "Your score increased 12% this month",
    bars: [
      { day: "Mon", value: 60, isToday: false },
      { day: "Tue", value: 75, isToday: false },
      { day: "Wed", value: 50, isToday: false },
      { day: "Thu", value: 90, isToday: true  },
      { day: "Fri", value: 40, isToday: false },
      { day: "Sat", value: 30, isToday: false },
      { day: "Sun", value: 20, isToday: false },
    ],
    miniStats: [
      { bg: "#c8e6c9", label: "Focus Time",  value: "3.2h",    sub: "+40 min",    labelColor: "#166534", valueColor: "#14532d", subColor: "#166534" },
      { bg: "#f8d7e3", label: "Tasks Done",  value: "12",      sub: "This week",  labelColor: "#9d174d", valueColor: "#831843", subColor: "#9d174d" },
      { bg: "#fef3c7", label: "Streak",      value: "14 days", sub: "Best ever",  labelColor: "#92400e", valueColor: "#78350f", subColor: "#92400e" },
      { bg: "#dbeafe", label: "Habit Rate",  value: "92%",     sub: "This week",  labelColor: "#1e40af", valueColor: "#1e3a8a", subColor: "#1e40af" },
    ],
    categories: [
      { name: "Work",     color: "#7a3a3a", percent: 45 },
      { name: "Health",   color: "#27774a", percent: 25 },
      { name: "Personal", color: "#2e5fa3", percent: 20 },
      { name: "Study",    color: "#6d4fc9", percent: 10 },
    ],
  },
  Weekly: {
    score: 78,
    scoreTrend: "Consistent performance this week",
    bars: [
      { day: "Mon", value: 55, isToday: false },
      { day: "Tue", value: 80, isToday: false },
      { day: "Wed", value: 65, isToday: false },
      { day: "Thu", value: 90, isToday: true  },
      { day: "Fri", value: 70, isToday: false },
      { day: "Sat", value: 45, isToday: false },
      { day: "Sun", value: 35, isToday: false },
    ],
    miniStats: [
      { bg: "#c8e6c9", label: "Focus Time",  value: "18.4h",   sub: "+2.1h vs last", labelColor: "#166534", valueColor: "#14532d", subColor: "#166534" },
      { bg: "#f8d7e3", label: "Tasks Done",  value: "34",      sub: "This week",     labelColor: "#9d174d", valueColor: "#831843", subColor: "#9d174d" },
      { bg: "#fef3c7", label: "Streak",      value: "14 days", sub: "Best ever",     labelColor: "#92400e", valueColor: "#78350f", subColor: "#92400e" },
      { bg: "#dbeafe", label: "Habit Rate",  value: "88%",     sub: "This week",     labelColor: "#1e40af", valueColor: "#1e3a8a", subColor: "#1e40af" },
    ],
    categories: [
      { name: "Work",     color: "#7a3a3a", percent: 50 },
      { name: "Health",   color: "#27774a", percent: 20 },
      { name: "Personal", color: "#2e5fa3", percent: 18 },
      { name: "Study",    color: "#6d4fc9", percent: 12 },
    ],
  },
  Monthly: {
    score: 91,
    scoreTrend: "Best month so far this year",
    bars: [
      { day: "Mon", value: 70, isToday: false },
      { day: "Tue", value: 85, isToday: false },
      { day: "Wed", value: 75, isToday: false },
      { day: "Thu", value: 95, isToday: true  },
      { day: "Fri", value: 80, isToday: false },
      { day: "Sat", value: 60, isToday: false },
      { day: "Sun", value: 50, isToday: false },
    ],
    miniStats: [
      { bg: "#c8e6c9", label: "Focus Time",  value: "72h",     sub: "+8h vs last",  labelColor: "#166534", valueColor: "#14532d", subColor: "#166534" },
      { bg: "#f8d7e3", label: "Tasks Done",  value: "128",     sub: "This month",   labelColor: "#9d174d", valueColor: "#831843", subColor: "#9d174d" },
      { bg: "#fef3c7", label: "Streak",      value: "14 days", sub: "Best ever",    labelColor: "#92400e", valueColor: "#78350f", subColor: "#92400e" },
      { bg: "#dbeafe", label: "Habit Rate",  value: "95%",     sub: "This month",   labelColor: "#1e40af", valueColor: "#1e3a8a", subColor: "#1e40af" },
    ],
    categories: [
      { name: "Work",     color: "#7a3a3a", percent: 42 },
      { name: "Health",   color: "#27774a", percent: 28 },
      { name: "Personal", color: "#2e5fa3", percent: 20 },
      { name: "Study",    color: "#6d4fc9", percent: 10 },
    ],
  },
};

// ─── Animated bar ─────────────────────────────────────────────────────────────

const MAX_BAR_HEIGHT = 100;

const AnimatedBar = memo(function AnimatedBar({ bar, delay }: { bar: BarData; delay: number }) {
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withTiming((bar.value / 100) * MAX_BAR_HEIGHT, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [bar.value, delay, height]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={styles.barColumn}>
      <Text style={[styles.barPercent, bar.isToday ? styles.barPercentToday : null]}>
        {bar.value}%
      </Text>
      <View style={styles.barTrack}>
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

// ─── Category bar row ─────────────────────────────────────────────────────────

const CategoryBarRow = memo(function CategoryBarRow({ row, delay }: { row: CategoryRow; delay: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(row.percent, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [row.percent, delay, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <View style={styles.catRow}>
      <View style={[styles.catDot, { backgroundColor: row.color }]} />
      <Text style={styles.catName}>{row.name}</Text>
      <View style={styles.catBarTrack}>
        <Animated.View style={[styles.catBarFill, { backgroundColor: row.color }, fillStyle]} />
      </View>
      <Text style={styles.catPercent}>{row.percent}%</Text>
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  const [activeFilter, setActiveFilter] = useState<FilterOption>("Today");
  const data = FILTER_DATA[activeFilter];

  const handleFilter = useCallback((f: FilterOption) => {
    Haptics.selectionAsync();
    setActiveFilter(f);
  }, []);

  const filters: FilterOption[] = ["Today", "Weekly", "Monthly"];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.headerRow}>
          <Text style={styles.headerTitle}>Statistics</Text>
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
        </Animated.View>

        {/* Score card */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>PRODUCTIVITY</Text>
            <Text style={styles.scoreNumber}>{data.score}%</Text>
            <View style={styles.scoreTrendRow}>
              <TrendingUp size={12} color="#5a4fa0" />
              <Text style={styles.scoreTrend}>{data.scoreTrend}</Text>
            </View>
          </View>
          <View style={styles.scoreBarContainer}>
            <ScoreProgressBar percent={data.score} goal={90} />
            <Text style={styles.scoreGoal}>Goal: 90%</Text>
          </View>
        </Animated.View>

        {/* Bar chart */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.chartCard}>
          <Text style={styles.cardTitle}>Weekly Overview</Text>
          <View style={styles.barsRow}>
            {data.bars.map((bar, i) => (
              <AnimatedBar key={bar.day} bar={bar} delay={i * 60} />
            ))}
          </View>
        </Animated.View>

        {/* Mini stat grid */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.miniGrid}>
          <MiniStatCard stat={data.miniStats[0]} />
          <MiniStatCard stat={data.miniStats[1]} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.miniGrid}>
          <MiniStatCard stat={data.miniStats[2]} />
          <MiniStatCard stat={data.miniStats[3]} />
        </Animated.View>

        {/* Category breakdown */}
        <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.catCard}>
          <Text style={styles.cardTitle}>Time by Category</Text>
          <View style={styles.catList}>
            {data.categories.map((row, i) => (
              <CategoryBarRow key={row.name} row={row} delay={i * 80} />
            ))}
          </View>
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

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  headerTitle: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, color: "#1a1a1a" },
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
  cardTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 15, color: "#1a1a1a" },
  barsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: MAX_BAR_HEIGHT + 40 },
  barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  barPercent: { fontFamily: FontFamily.inter.semiBold, fontSize: 10, color: "#aaa" },
  barPercentToday: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },
  barTrack: { width: 28, height: MAX_BAR_HEIGHT, justifyContent: "flex-end", backgroundColor: "#f5f5f5", borderRadius: 4, overflow: "hidden" },
  barFill: { width: 28, backgroundColor: "#d0d0d0", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barFillToday: { backgroundColor: "#1a1a1a" },
  barDay: { fontFamily: FontFamily.inter.regular, fontSize: 10, color: "#aaa" },
  barDayToday: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },

  miniGrid: { flexDirection: "row", gap: 8 },
  miniCard: { flex: 1, borderRadius: 20, padding: 14, gap: 2 },
  miniLabel: { fontFamily: FontFamily.inter.semiBold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 },
  miniValue: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, lineHeight: 28 },
  miniSub: { fontFamily: FontFamily.inter.regular, fontSize: 11 },

  catCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, gap: 14 },
  catList: { gap: 12 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 99 },
  catName: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#1a1a1a", width: 64 },
  catBarTrack: { flex: 1, height: 4, backgroundColor: "#f0eeea", borderRadius: 99, overflow: "hidden" },
  catBarFill: { height: 4, borderRadius: 99 },
  catPercent: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#888", width: 32, textAlign: "right" },
});
