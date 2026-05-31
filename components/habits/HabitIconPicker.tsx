import React, { memo, useCallback } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { HabitIcon, HABIT_ICON_KEYS } from "./HabitIcons";

interface IconCellProps {
  iconKey: string;
  isSelected: boolean;
  selectedColor: string;
  onPress: (key: string) => void;
}

const SPRING = { damping: 15, stiffness: 350 };

const IconCell = memo(function IconCell({
  iconKey,
  isSelected,
  selectedColor,
  onPress,
}: IconCellProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(1.15, SPRING, () => {
      scale.value = withSpring(1, SPRING);
    });
    onPress(iconKey);
  }, [iconKey, onPress, scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.cell,
          isSelected
            ? { backgroundColor: selectedColor }
            : styles.cellInactive,
        ]}
      >
        <HabitIcon
          name={iconKey}
          size={22}
          color={isSelected ? "#ffffff" : "#888888"}
          strokeWidth={1.8}
        />
      </Pressable>
    </Animated.View>
  );
});

interface HabitIconPickerProps {
  selected: string;
  selectedColor: string;
  onSelect: (key: string) => void;
}

export const HabitIconPicker = memo(function HabitIconPicker({
  selected,
  selectedColor,
  onSelect,
}: HabitIconPickerProps) {
  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {/* Center the grid by using justifyContent center on the wrap */}
      <View style={styles.grid}>
        {HABIT_ICON_KEYS.map((key) => (
          <IconCell
            key={key}
            iconKey={key}
            isSelected={selected === key}
            selectedColor={selectedColor}
            onPress={onSelect}
          />
        ))}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 200,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",   // centers icons so no empty gap on right
    alignItems: "center",
  },
  cell: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cellInactive: {
    backgroundColor: "#eceae5",  // light cream — matches app theme
  },
});
