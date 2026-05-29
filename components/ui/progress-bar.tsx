import React, { memo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface ProgressBarProps {
  percent: number;       // 0–100
  color: string;
  animationDelay?: number;
}

export const ProgressBar = memo(function ProgressBar({
  percent,
  color,
  animationDelay = 0,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      animationDelay,
      withTiming(percent, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [percent, animationDelay, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    height: 5,
    backgroundColor: "#f0eeea",
    borderRadius: 99,
    overflow: "hidden",
    flex: 1,
  },
  fill: {
    height: 5,
    borderRadius: 99,
  },
});
