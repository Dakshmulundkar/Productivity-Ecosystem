import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Play, Pause, Square } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

interface FocusCTACardProps {
  onStart: () => void;       // toggles play/pause
  onStop?: () => void;       // stops and resets
  isRunning?: boolean;
  isPaused?: boolean;
  label?: string;            // timer display or "Start focus session"
  subtitle?: string;         // "Pomodoro · 25 min" or session info
}

const SPRING = { damping: 15, stiffness: 300, mass: 0.8 };

export const FocusCTACard = memo(function FocusCTACard({
  onStart,
  onStop,
  isRunning = false,
  isPaused = false,
  label = "Start focus session",
  subtitle = "Pomodoro · 25 min",
}: FocusCTACardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn  = useCallback(() => { scale.value = withSpring(0.97, SPRING); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1,    SPRING); }, [scale]);

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStart();
  }, [onStart]);

  const handleStop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStop?.();
  }, [onStop]);

  const active = isRunning || isPaused;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.inner}
      >
        {/* Icon box */}
        <View style={styles.iconBox}>
          {isRunning
            ? <Pause size={22} color="#1a1a1a" fill="#1a1a1a" />
            : <Play  size={22} color="#1a1a1a" fill="#1a1a1a" />}
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {/* Play / Pause */}
          <Pressable onPress={handleStart} style={styles.startBtn} hitSlop={8}>
            <Text style={styles.startBtnText}>
              {isRunning ? "Pause" : isPaused ? "Resume" : "Start"}
            </Text>
          </Pressable>

          {/* Stop — only visible when active */}
          {active && onStop ? (
            <Pressable onPress={handleStop} style={styles.stopBtn} hitSlop={8}>
              <Square size={14} color="#888" fill="#888" />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 22,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#b8a9f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 14,
    color: "#ffffff",
  },
  subtitle: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#666666",
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  startBtn: {
    backgroundColor: "#b8a9f0",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  startBtnText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 12,
    color: "#1a1a1a",
  },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
});
