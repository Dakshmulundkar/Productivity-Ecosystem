import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronDown, ChevronRight, Minus, Plus, Pencil, X, Check } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { HabitReminderPicker, type Reminder } from "./HabitReminderPicker";
import { CompletionDotPreview } from "./CompletionDotPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabitAdvancedOptionsProps {
  streakGoal: number | undefined;
  category: string;
  completionsPerDay: number;
  onStreakGoalChange: (v: number | undefined) => void;
  onCategoryChange: (v: string) => void;
  onCompletionsChange: (v: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STREAK_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: "None",    value: undefined },
  { label: "7 days",  value: 7 },
  { label: "14 days", value: 14 },
  { label: "21 days", value: 21 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

const CATEGORIES = ["Health", "Work", "Personal", "Study", "Finance", "Custom"];

// ─── Picker Modal ─────────────────────────────────────────────────────────────

function PickerModal<T extends string | number | undefined>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={18} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt) => {
            const isSelected = opt.value === selected;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => { Haptics.selectionAsync(); onSelect(opt.value); onClose(); }}
                style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
              >
                <Text style={[pickerStyles.optionText, isSelected && pickerStyles.optionTextSelected]}>
                  {opt.label}
                </Text>
                {isSelected && <Check size={16} color="#a29bfe" strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#1a1a1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontFamily: FontFamily.poppins.bold, fontSize: 16, color: "#fff" },
  option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.08)" },
  optionSelected: {},
  optionText: { fontFamily: FontFamily.inter.regular, fontSize: 15, color: "rgba(255,255,255,0.7)" },
  optionTextSelected: { color: "#a29bfe", fontFamily: FontFamily.inter.semiBold },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const HabitAdvancedOptions = memo(function HabitAdvancedOptions({
  streakGoal,
  category,
  completionsPerDay,
  onStreakGoalChange,
  onCategoryChange,
  onCompletionsChange,
}: HabitAdvancedOptionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [trackingMode, setTrackingMode] = useState<"step" | "custom">("step");
  const [showStreakPicker, setShowStreakPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const chevronRotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    chevronRotation.value = withTiming(next ? 180 : 0, { duration: 250 });
    Haptics.selectionAsync();
  }, [expanded, chevronRotation]);

  const streakLabel = streakGoal ? `${streakGoal} days` : "None";
  const categoryLabel = category || "None";

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleExpand} style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Advanced Options</Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color="#888" strokeWidth={2} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.twoCol}>
            <View style={styles.halfBlock}>
              <Text style={styles.fieldLabel}>Streak Goal</Text>
              <Pressable
                style={styles.selectorBtn}
                onPress={() => { Haptics.selectionAsync(); setShowStreakPicker(true); }}
              >
                <Text style={styles.selectorText}>{streakLabel}</Text>
                <ChevronRight size={14} color="#aaa" strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.halfBlock}>
              <Text style={styles.fieldLabel}>Reminder</Text>
              <Pressable
                style={styles.selectorBtn}
                onPress={() => { Haptics.selectionAsync(); setShowReminderPicker(true); }}
              >
                <Text style={styles.selectorText}>
                  {reminders.length === 0 ? "0 Active" : `${reminders.length} Active`}
                </Text>
                <ChevronRight size={14} color="#aaa" strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Categories</Text>
            <Pressable
              style={styles.selectorBtnFull}
              onPress={() => { Haptics.selectionAsync(); setShowCategoryPicker(true); }}
            >
              <Text style={styles.selectorText}>{categoryLabel}</Text>
              <ChevronRight size={14} color="#aaa" strokeWidth={2} />
            </Pressable>
          </View>

          <View>
            <Text style={styles.fieldLabel}>How should completions be tracked?</Text>
            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => { setTrackingMode("step"); Haptics.selectionAsync(); }}
                style={[styles.segmentBtn, trackingMode === "step" && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, trackingMode === "step" && styles.segmentTextActive]}>
                  Step By Step
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setTrackingMode("custom"); Haptics.selectionAsync(); }}
                style={[styles.segmentBtn, trackingMode === "custom" && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, trackingMode === "custom" && styles.segmentTextActive]}>
                  Custom Value
                </Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>Increment by 1 with each completion</Text>
          </View>

          {/* ── Completions Per Day (PART 1 IMPLEMENTATION) ── */}
          <View style={styles.completionsHeaderRow}>
            <Text style={styles.fieldLabel}>Completions Per Day</Text>
            <CompletionDotPreview count={completionsPerDay} color="#b8a9f0" />
          </View>

          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterBtn}
              onPress={() => { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCompletionsChange(Math.max(1, completionsPerDay - 1)); 
              }}
            >
              <Minus size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </Pressable>
            
            <View style={styles.counterDisplay}>
              <Text style={styles.counterValue}>{completionsPerDay} / Day</Text>
            </View>

            <Pressable
              style={styles.counterBtn}
              onPress={() => { 
                if (completionsPerDay >= 10) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onCompletionsChange(completionsPerDay + 1); 
                }
              }}
            >
              <Plus size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </Pressable>

            <Pressable style={styles.counterBtn}>
              <Pencil size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </Pressable>
          </View>
          
          <Text style={styles.helperTextCentered}>
            The ring fills completely when this number is met
          </Text>
        </View>
      )}

      <PickerModal
        visible={showStreakPicker}
        title="Streak Goal"
        options={STREAK_OPTIONS}
        selected={streakGoal}
        onSelect={onStreakGoalChange}
        onClose={() => setShowStreakPicker(false)}
      />

      <PickerModal
        visible={showCategoryPicker}
        title="Category"
        options={CATEGORIES.map((c) => ({ label: c, value: c }))}
        selected={category}
        onSelect={onCategoryChange}
        onClose={() => setShowCategoryPicker(false)}
      />

      <HabitReminderPicker
        visible={showReminderPicker}
        reminders={reminders}
        onSave={setReminders}
        onClose={() => setShowReminderPicker(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  toggleLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "#888",
  },
  content: {
    gap: 16,
    paddingBottom: 20,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  halfBlock: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  selectorBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eceae5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectorBtnFull: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eceae5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectorText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "#555",
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#eceae5",
    borderRadius: 999,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#1a1a1a",
  },
  segmentText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: "#888",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  helperText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#aaa",
    marginTop: 4,
  },
  completionsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterDisplay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 20,
    color: "#1a1a1a",
  },
  helperTextCentered: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "rgba(0,0,0,0.35)",
    textAlign: "center",
    marginTop: -4,
  },
});
