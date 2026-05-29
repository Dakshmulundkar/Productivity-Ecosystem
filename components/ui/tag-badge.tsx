import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontFamily } from "@/lib/_core/theme";

export type TagType = "Work" | "Personal" | "Health" | "HighPriority";

interface TagBadgeProps {
  type: TagType;
  label?: string;
}

const TAG_COLORS: Record<TagType, { bg: string; text: string; display: string }> = {
  Work:         { bg: "#ede9fe", text: "#5b21b6", display: "Work" },
  Personal:     { bg: "#fce7f3", text: "#9d174d", display: "Personal" },
  Health:       { bg: "#dcfce7", text: "#166534", display: "Health" },
  HighPriority: { bg: "#fee2e2", text: "#991b1b", display: "High" },
};

export const TagBadge = memo(function TagBadge({ type, label }: TagBadgeProps) {
  const colors = TAG_COLORS[type];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {label ?? colors.display}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 10,
  },
});
