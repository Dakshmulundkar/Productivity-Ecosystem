import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { FontFamily } from "@/lib/_core/theme";

interface DaySquare {
  date: string;
  dayLabel: string;
  completed: boolean;
  count: number;
  isToday: boolean;
}

interface HabitDaySquaresProps {
  days: DaySquare[];
  color: string;
  max: number;
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
  max = 1,
}: HabitDaySquaresProps) {
  return (
    <View style={styles.row}>
      {days.map((day, i) => {
        const opacity = day.count > 0 ? (0.25 + (day.count / max) * 0.75) : 1;
        const bgColor = day.count > 0 ? hexToRgba(color, opacity) : hexToRgba(color, 0.12);

        return (
          <Animated.View
            key={day.date}
            entering={FadeIn.delay(i * 30).duration(200)}
            style={styles.col}
          >
            <Text style={styles.dayLabel}>{day.dayLabel}</Text>
            <View
              style={[
                styles.square,
                day.count > 0
                  ? { backgroundColor: bgColor }
                  : day.isToday
                  ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color }
                  : { backgroundColor: hexToRgba(color, 0.12) },
              ]}
            />
          </Animated.View>
        );
      })}
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
