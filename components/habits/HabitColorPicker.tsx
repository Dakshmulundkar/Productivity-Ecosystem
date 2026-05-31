import React, { memo, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export const HABIT_COLORS = [
  // Row 1
  "#FF6B6B", "#FF9F43", "#FECA57", "#FFDD59", "#6BCB77", "#4ADE80", "#26de81",
  // Row 2
  "#2BCBBA", "#74b9ff", "#48dbfb", "#5EA0EF", "#7c7ade", "#a29bfe", "#7c3aed",
  // Row 3
  "#d63ad1", "#fd79a8", "#ff7675", "#636e72", "#b2bec3", "#dfe6e9", "#f5f6fa",
];

interface SwatchProps {
  color: string;
  isSelected: boolean;
  onPress: (color: string) => void;
}

const SPRING = { damping: 15, stiffness: 350 };

const Swatch = memo(function Swatch({ color, isSelected, onPress }: SwatchProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(1.1, SPRING);
    onPress(color);
  }, [color, onPress, scale]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(isSelected ? 1.1 : 1, SPRING);
  }, [isSelected, scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.swatch,
          { backgroundColor: color },
          isSelected && styles.swatchSelected,
        ]}
      />
    </Animated.View>
  );
});

interface HabitColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export const HabitColorPicker = memo(function HabitColorPicker({
  selected,
  onSelect,
}: HabitColorPickerProps) {
  return (
    <View style={styles.grid}>
      {HABIT_COLORS.map((color) => (
        <Swatch
          key={color}
          color={color}
          isSelected={selected === color}
          onPress={onSelect}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: "#ffffff",
  },
});
