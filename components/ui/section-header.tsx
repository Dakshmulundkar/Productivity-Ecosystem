import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FontFamily } from "@/lib/_core/theme";

interface SectionHeaderProps {
  label: string;
  onSeeAll?: () => void;
}

export const SectionHeader = memo(function SectionHeader({
  label,
  onSeeAll,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 12,
    color: "#aaaaaa",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  seeAll: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "#aaaaaa",
  },
});
