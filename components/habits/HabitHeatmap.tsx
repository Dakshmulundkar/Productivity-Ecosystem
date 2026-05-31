import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { FontFamily } from "@/lib/_core/theme";
import type { HeatmapCell } from "@/shared/habitTypes";

interface HabitHeatmapProps {
  habitName: string;
  frequency?: string;
  cells: HeatmapCell[];
}

export const HabitHeatmap = memo(function HabitHeatmap({
  habitName,
  frequency = "Everyday",
  cells,
}: HabitHeatmapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{habitName}</Text>
        <Text style={styles.freq}>{frequency}</Text>
      </View>
      <View style={styles.grid}>
        {cells.map((cell, i) => (
          <Animated.View
            key={cell.date}
            entering={FadeIn.delay(i * 8).duration(150)}
            style={[styles.cell, { backgroundColor: cell.color }]}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: "#18181b",
  },
  freq: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#8b8b8b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
