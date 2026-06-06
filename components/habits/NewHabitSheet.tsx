import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { HabitIconPicker } from "./HabitIconPicker";
import { HabitColorPicker, HABIT_COLORS } from "./HabitColorPicker";
import { HabitAdvancedOptions } from "./HabitAdvancedOptions";
import { HabitIcon } from "./HabitIcons";
import { useHabitStore } from "@/store/useHabitStore";

interface NewHabitSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SPRING = { damping: 20, stiffness: 200 };

export const NewHabitSheet = memo(function NewHabitSheet({
  visible,
  onClose,
}: NewHabitSheetProps) {
  const insets = useSafeAreaInsets();
  const addHabit = useHabitStore((s) => s.addHabit);

  const [selectedIcon, setSelectedIcon] = useState("Activity");
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [streakGoal, setStreakGoal] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState("");
  const [completionsPerDay, setCompletionsPerDay] = useState(1);
  const [nameFocused, setNameFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a habit name.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveScale.value = withSpring(0.96, SPRING, () => {
      saveScale.value = withSpring(1, SPRING);
    });
    addHabit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
      category: category || undefined,
      frequency: "daily",
      completionsPerDay,
      streakGoal,
    });
    setName("");
    setDescription("");
    setSelectedIcon("Activity");
    setSelectedColor(HABIT_COLORS[0]);
    setStreakGoal(undefined);
    setCategory("");
    setCompletionsPerDay(1);
    onClose();
  }, [
    name, description, selectedIcon, selectedColor,
    category, completionsPerDay, streakGoal,
    addHabit, onClose, saveScale,
  ]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>New Habit</Text>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <X size={18} color="#888" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Selected icon preview */}
            <View style={styles.iconPreviewRow}>
              <View style={[styles.iconPreview, { backgroundColor: selectedColor }]}>
                <HabitIcon name={selectedIcon} size={32} color="#ffffff" strokeWidth={1.8} />
              </View>
            </View>

            {/* Icon picker */}
            <Text style={styles.sectionLabel}>Icon</Text>
            <View style={styles.iconPickerWrap}>
              <HabitIconPicker
                selected={selectedIcon}
                selectedColor={selectedColor}
                onSelect={setSelectedIcon}
              />
            </View>

            {/* Name */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Name</Text>
            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="e.g. Morning Run"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            {/* Description */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, descFocused && styles.inputFocused]}
              placeholder="Optional description..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              multiline
              numberOfLines={3}
            />

            {/* Color picker */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Color</Text>
            <HabitColorPicker selected={selectedColor} onSelect={setSelectedColor} />

            {/* Divider */}
            <View style={styles.divider} />

            {/* Advanced options */}
            <HabitAdvancedOptions
              streakGoal={streakGoal}
              category={category}
              completionsPerDay={completionsPerDay}
              onStreakGoalChange={setStreakGoal}
              onCategoryChange={setCategory}
              onCompletionsChange={setCompletionsPerDay}
            />

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Save button */}
          <Animated.View style={[styles.saveWrap, saveStyle]}>
            <Pressable
              onPress={handleSave}
              onPressIn={() => { saveScale.value = withSpring(0.97, SPRING); }}
              onPressOut={() => { saveScale.value = withSpring(1, SPRING); }}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Habit</Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill as object,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#f2f0ec",   // matches app background
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d0ccc6",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: FontFamily.poppins.extraBold,
    fontSize: 22,
    color: "#1a1a1a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eceae5",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 8,
  },
  iconPreviewRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  iconPickerWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "#e4dfd8",
    padding: 12,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#e4dfd8",
  },
  inputFocused: {
    borderColor: "#b8a9f0",
    borderWidth: 1.5,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  divider: {
    height: 0.5,
    backgroundColor: "#e4dfd8",
    marginVertical: 8,
  },
  saveWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: "#f2f0ec",
  },
  saveBtn: {
    backgroundColor: "#b8a9f0",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 16,
    color: "#1a1a1a",
  },
});
