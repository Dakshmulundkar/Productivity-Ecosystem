import React, { memo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface CompletionDotPreviewProps {
  count: number;        // total completions per day (1–10 max)
  color: string;        // habit's chosen hex color
  filledCount?: number; // how many are currently filled (default = count)
}

const DOT_SIZE = 10;
const GAP = 4;
const SPRING_CONFIG = { stiffness: 300, damping: 14 };

const Dot = memo(function Dot({ color, filled }: { color: string; filled: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    backgroundColor: filled ? color : color, // color is same, opacity handled by style field
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, opacity: filled ? 1 : 0.18 },
        animatedStyle,
      ]}
    />
  );
});

export const CompletionDotPreview = memo(function CompletionDotPreview({
  count,
  color,
  filledCount,
}: CompletionDotPreviewProps) {
  const effectiveFilled = filledCount !== undefined ? filledCount : count;
  const pulseScale = useSharedValue(1);

  // Pulse effect when count changes
  useEffect(() => {
    pulseScale.value = withSequence(
      withTiming(1.08, { duration: 80 }),
      withSpring(1)
    );
  }, [count]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Create array of indices for dots
  const dots = Array.from({ length: Math.min(count, 10) }, (_, i) => i);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {dots.map((i) => (
        <Dot key={i} color={color} filled={i < effectiveFilled} />
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: 80,
    gap: GAP,
    justifyContent: "flex-end",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 4,
  },
});
