import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { FontFamily } from "@/lib/_core/theme";

interface FilterPillsProps {
  options: string[];
  active: string;
  onChange: (value: string) => void;
}

const SPRING_CONFIG = { damping: 15, stiffness: 300, mass: 0.8 };

const FilterPill = memo(function FilterPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
      >
        <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

export const FilterPills = memo(function FilterPills({
  options,
  active,
  onChange,
}: FilterPillsProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => (
        <FilterPill
          key={option}
          label={option}
          isActive={active === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillActive: {
    backgroundColor: "#1a1a1a",
  },
  pillInactive: {
    backgroundColor: "#eceae5",
  },
  pillText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
  },
  pillTextActive: {
    color: "#ffffff",
  },
  pillTextInactive: {
    color: "#666666",
  },
});
