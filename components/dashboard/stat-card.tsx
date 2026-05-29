import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontFamily } from "@/lib/_core/theme";

interface StatCardProps {
  bg: string;
  label: string;
  value: string;
  subtitle: string;
  labelColor: string;
  valueColor: string;
  subtitleColor: string;
}

export const StatCard = memo(function StatCard({
  bg,
  label,
  value,
  subtitle,
  labelColor,
  valueColor,
  subtitleColor,
}: StatCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: labelColor }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
  },
  label: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  value: {
    fontFamily: FontFamily.poppins.extraBold,
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    marginTop: 2,
  },
});
