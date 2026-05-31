import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { FontFamily } from "@/lib/_core/theme";

interface DaySquare {
  date: string;
  dayLabel: string;
  completed: boolean;
  isToday: boolean;
}

interface HabitDaySquaresProps {
  days: DaySquare[];
  color: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const HabitDaySquares = memo(function HabitDaySquares({
  days,
  color,
}: HabitDaySquaresProps) {
  return (
    <View style={styles.row}>
      {days.map((day, i) => (
        <Animated.View
          key={day.date}
          entering={FadeIn.delay(i * 30).duration(200)}
          style={styles.col}
        >
          <Text style={styles.dayLabel}>{day.dayLabel}</Text>
          <View
            style={[
              styles.square,
              day.completed
                ? { backgroundColor: color }
                : day.isToday
                ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color }
                : { backgroundColor: hexToRgba(color, 0.15) },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
  },
  col: {
    alignItems: "center",
    gap: 3,
  },
  dayLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 8,
    color: "#aaa",
  },
  square: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
});
