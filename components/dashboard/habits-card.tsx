import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Droplets,
  Dumbbell,
  BookOpen,
  Moon,
  Heart,
  Zap,
  LucideIcon,
} from "lucide-react-native";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FontFamily } from "@/lib/_core/theme";

export type HabitIconName = "Droplets" | "Dumbbell" | "BookOpen" | "Moon" | "Heart" | "Zap";

const ICON_MAP: Record<HabitIconName, LucideIcon> = {
  Droplets,
  Dumbbell,
  BookOpen,
  Moon,
  Heart,
  Zap,
};

export interface Habit {
  id: string;
  name: string;
  icon: HabitIconName;
  streak: number;
  percent: number;
  iconBg: string;
  iconColor: string;
  barColor: string;
}

export interface HeatmapCell {
  color: string;
}

interface HabitRowProps {
  habit: Habit;
  index: number;
}

const HabitRow = memo(function HabitRow({ habit, index }: HabitRowProps) {
  const IconComponent = ICON_MAP[habit.icon];

  return (
    <View style={styles.habitRow}>
      <View style={[styles.iconBox, { backgroundColor: habit.iconBg }]}>
        <IconComponent size={18} color={habit.iconColor} strokeWidth={2} />
      </View>

      <View style={styles.habitMeta}>
        <Text style={styles.habitName}>{habit.name}</Text>
        <Text style={styles.habitStreak}>{habit.streak}-day streak</Text>
        <View style={styles.barRow}>
          <ProgressBar
            percent={habit.percent}
            color={habit.barColor}
            animationDelay={index * 100}
          />
        </View>
      </View>

      <Text style={styles.habitPct}>{habit.percent}%</Text>
    </View>
  );
});

interface HabitsCardProps {
  habits: Habit[];
  heatmapCells: HeatmapCell[];
  heatmapLabel: string;
}

export const HabitsCard = memo(function HabitsCard({
  habits,
  heatmapCells,
  heatmapLabel,
}: HabitsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Today's habits</Text>

      {habits.map((habit, index) => (
        <HabitRow key={habit.id} habit={habit} index={index} />
      ))}

      {/* Heatmap */}
      <View style={styles.heatmapSection}>
        <Text style={styles.heatmapLabel}>{heatmapLabel.toUpperCase()}</Text>
        <View style={styles.heatmapGrid}>
          {heatmapCells.map((cell, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.delay(index * 20).duration(200)}
              style={[styles.heatCell, { backgroundColor: cell.color }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 14,
  },
  cardTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 12,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  habitMeta: {
    flex: 1,
  },
  habitName: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: "#1a1a1a",
  },
  habitStreak: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#888888",
    marginBottom: 5,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitPct: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 12,
    color: "#1a1a1a",
    flexShrink: 0,
    minWidth: 36,
    textAlign: "right",
  },
  heatmapSection: {
    marginTop: 12,
  },
  heatmapLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    color: "#aaaaaa",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
