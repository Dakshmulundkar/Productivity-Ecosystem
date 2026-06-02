import React, { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check, Trash2 } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { HabitIcon } from "./HabitIcons";
import { HabitDaySquares } from "./HabitDaySquares";
import { FontFamily } from "@/lib/_core/theme";
import type { Habit } from "@/shared/habitTypes";

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface HabitRowProps {
  habit: Habit;
  streak: number;
  isCompleted: boolean;
  currentCompletions: number;
  last5Days: { date: string; dayLabel: string; completed: boolean; isToday: boolean }[];
  onToggle: (habitId: string, date: string) => void;
  onDelete?: (habitId: string) => void;
  todayDate: string;
  isLast: boolean;
}

const SPRING = { damping: 15, stiffness: 400, mass: 0.6 };
const DELETE_SPRING = { damping: 18, stiffness: 300 };

export const HabitRow = memo(function HabitRow({
  habit,
  streak,
  isCompleted,
  currentCompletions,
  last5Days,
  onToggle,
  onDelete,
  todayDate,
  isLast,
}: HabitRowProps) {
  const [showDelete, setShowDelete] = useState(false);

  const checkScale   = useSharedValue(1);
  const checkOpacity = useSharedValue(isCompleted ? 1 : 0);
  const bgOpacity    = useSharedValue(isCompleted ? 1 : 0);
  const deleteTransX = useSharedValue(40);
  const deleteOpacity = useSharedValue(0);

  // Sync animation when isCompleted changes from store
  useEffect(() => {
    checkOpacity.value = withTiming(isCompleted ? 1 : 0, { duration: 200 });
    bgOpacity.value    = withTiming(isCompleted ? 1 : 0, { duration: 200 });
  }, [isCompleted, checkOpacity, bgOpacity]);

  // Animate delete button in/out
  useEffect(() => {
    if (showDelete) {
      deleteTransX.value  = withSpring(0, DELETE_SPRING);
      deleteOpacity.value = withTiming(1, { duration: 180 });
    } else {
      deleteTransX.value  = withSpring(40, DELETE_SPRING);
      deleteOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [showDelete, deleteTransX, deleteOpacity]);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const fillAnimStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));
  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));
  const deleteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: deleteTransX.value }],
    opacity: deleteOpacity.value,
  }));

  const handleToggle = useCallback(() => {
    if (showDelete) { setShowDelete(false); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    checkScale.value = withSequence(
      withSpring(0.85, SPRING),
      withSpring(1.15, SPRING),
      withSpring(1.0, SPRING),
    );
    const next = !isCompleted;
    checkOpacity.value = withTiming(next ? 1 : 0, { duration: 200 });
    bgOpacity.value    = withTiming(next ? 1 : 0, { duration: 200 });
    onToggle(habit.id, todayDate);
  }, [habit.id, todayDate, isCompleted, onToggle, checkScale, checkOpacity, bgOpacity, showDelete]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDelete((prev) => !prev);
  }, []);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowDelete(false);
    onDelete?.(habit.id);
  }, [habit.id, onDelete]);

  const handleRowPress = useCallback(() => {
    if (showDelete) setShowDelete(false);
  }, [showDelete]);

  return (
    <Pressable
      onPress={handleRowPress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={[
        styles.row,
        !isLast && styles.rowBorder,
        showDelete && styles.rowHighlight,
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: hexToRgba(habit.color, 0.15) }]}>
        <HabitIcon name={habit.icon} size={18} color={habit.color} strokeWidth={2} />
      </View>

      {/* Info + day squares */}
      <View style={styles.center}>
        <Text style={styles.name} numberOfLines={1}>{habit.name}</Text>
        <Text style={styles.streak}>{streak}-day streak</Text>
        <HabitDaySquares days={last5Days} color={habit.color} max={habit.completionsPerDay} />
      </View>

      {/* Delete button — slides in on long press */}
      <Animated.View style={[styles.deleteWrap, deleteAnimStyle]}>
        <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
          <Trash2 size={16} color="#ffffff" strokeWidth={2} />
        </Pressable>
      </Animated.View>

      {/* Completion circle / Segmented Progress */}
      <Pressable onPress={handleToggle} hitSlop={12}>
        <Animated.View style={[styles.checkCircle, { borderColor: habit.color }, checkAnimStyle]}>
          {/* Filled background part for 1-completion habits */}
          {habit.completionsPerDay === 1 && (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.checkCircleFill,
                { backgroundColor: habit.color },
                bgAnimStyle,
              ]}
            />
          )}

          {/* Segmented view for multi-completion habits */}
          {habit.completionsPerDay > 1 ? (
             <View style={styles.segmentsWrap}>
                <Svg width={42} height={42} viewBox="0 0 42 42">
                  {Array.from({ length: habit.completionsPerDay }).map((_, i) => {
                    const filled = i < currentCompletions;
                    const angle = 360 / habit.completionsPerDay;
                    const rotation = i * angle - 90;
                    const strokeDash = 100; // arbitrary total length
                    const gap = 2; // gap between segments in degrees
                    const strokePercent = (angle - gap) / 360;
                    const circum = 2 * Math.PI * 18; // radius 18
                    
                    return (
                      <Circle
                        key={i}
                        cx="21"
                        cy="21"
                        r="18"
                        fill="transparent"
                        stroke={filled ? habit.color : hexToRgba(habit.color, 0.15)}
                        strokeWidth={4}
                        strokeDasharray={`${circum * strokePercent} ${circum * (1 - strokePercent)}`}
                        transform={`rotate(${rotation}, 21, 21)`}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </Svg>
                <View style={styles.ringCenterText}>
                   <Text style={[styles.ringCount, { color: habit.color }]}>{currentCompletions}</Text>
                </View>
             </View>
          ) : (
            <Animated.View style={fillAnimStyle}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeebe6",
  },
  rowHighlight: {
    backgroundColor: "#fff5f5",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  center: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 14,
    color: "#18181b",
  },
  streak: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#8b8b8b",
  },
  deleteWrap: {
    marginRight: 4,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  checkCircleFill: {
    borderRadius: 21,
  },
  segmentsWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringCount: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 12,
  },
});
