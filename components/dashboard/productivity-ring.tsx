import React, { memo, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FontFamily } from "@/lib/_core/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProductivityRingProps {
  score: number; // 0–100
  size?: number;
}

const RADIUS = 32;
const STROKE_WIDTH = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ProductivityRing = memo(function ProductivityRing({
  score,
  size = 80,
}: ProductivityRingProps) {
  const strokeDashoffset = useSharedValue(CIRCUMFERENCE);

  useEffect(() => {
    const safeScore = isNaN(score) ? 0 : score;
    const targetOffset = CIRCUMFERENCE * (1 - safeScore / 100);
    strokeDashoffset.value = withTiming(targetOffset, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, strokeDashoffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const center = size / 2;
  const scale = size / 80;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={styles.svg}
      >
        {/* Background ring */}
        <Circle
          cx={40}
          cy={40}
          r={RADIUS}
          fill="none"
          stroke="rgba(26,26,26,0.15)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={40}
          cy={40}
          r={RADIUS}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{score}%</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    transform: [{ rotate: "-90deg" }],
  },
  labelContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FontFamily.poppins.extraBold,
    fontSize: 14,
    color: "#1a1a1a",
  },
});
