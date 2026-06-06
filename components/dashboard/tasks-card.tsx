import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { Check, CheckCircle2 } from "lucide-react-native";
import { TagBadge, TagType } from "@/components/ui/tag-badge";
import { FontFamily } from "@/lib/_core/theme";

export interface Task {
  id: string;
  title: string;
  time: string;
  tag: TagType;
  done: boolean;
}

interface TaskRowProps {
  task: Task;
  isLast: boolean;
  onToggle: (id: string) => void;
}

const SPRING_CONFIG = { damping: 12, stiffness: 400, mass: 0.6 };

const TaskRow = memo(function TaskRow({ task, isLast, onToggle }: TaskRowProps) {
  const checkScale = useSharedValue(1);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = useCallback(() => {
    checkScale.value = withSequence(
      withSpring(1.3, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG),
    );
    onToggle(task.id);
  }, [task.id, onToggle, checkScale]);

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable onPress={handleToggle} hitSlop={8}>
        <Animated.View
          style={[
            styles.checkbox,
            task.done ? styles.checkboxDone : styles.checkboxEmpty,
            checkAnimStyle,
          ]}
        >
          {task.done && <Check size={10} color="#2e7d32" strokeWidth={3} />}
        </Animated.View>
      </Pressable>

      <View style={styles.info}>
        <Text
          style={[styles.title, task.done && styles.titleDone]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <Text style={styles.time}>
          {task.done ? "Completed" : "Due"} · {task.time}
        </Text>
      </View>

      <TagBadge type={task.tag} />
    </View>
  );
});

interface TasksCardProps {
  tasks: Task[];
  remainingCount: number;
  onToggle: (id: string) => void;
}

export const TasksCard = memo(function TasksCard({
  tasks,
  remainingCount,
  onToggle,
}: TasksCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My tasks</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{remainingCount} left</Text>
        </View>
      </View>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckCircle2 size={32} color="#e0dbd4" />
          <Text style={styles.emptyText}>No tasks for this period</Text>
        </View>
      ) : (
        tasks.filter(Boolean).map((task, index) => (
          <TaskRow
            key={task.id}
            task={task}
            isLast={index === tasks.length - 1}
            onToggle={onToggle}
          />
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "#1a1a1a",
  },
  countPill: {
    backgroundColor: "#1a1a1a",
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  countText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    color: "#ffffff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0eeea",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: "#c8e6c9",
    borderWidth: 0,
  },
  checkboxEmpty: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#dddddd",
  },
  info: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "#bbb",
  },
  title: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: "#1a1a1a",
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: "#bbbbbb",
  },
  time: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#aaaaaa",
    marginTop: 1,
  },
});
