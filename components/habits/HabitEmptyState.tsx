import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

interface HabitEmptyStateProps {
  onAdd: () => void;
}

const SPRING = { damping: 15, stiffness: 300 };

export const HabitEmptyState = memo(function HabitEmptyState({ onAdd }: HabitEmptyStateProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Sparkles size={40} color="#b8a9f0" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>No habits yet</Text>
      <Text style={styles.sub}>Tap + to add your first habit</Text>
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onAdd}
          onPressIn={() => { scale.value = withSpring(0.95, SPRING); }}
          onPressOut={() => { scale.value = withSpring(1, SPRING); }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Add Habit</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0ecff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 16,
    color: "#18181b",
  },
  sub: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "#8b8b8b",
  },
  btn: {
    marginTop: 8,
    backgroundColor: "#b8a9f0",
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  btnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: "#1a1a1a",
  },
});
