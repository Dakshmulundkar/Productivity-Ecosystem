/**
 * HabitReminderPicker
 *
 * A fully custom reminder time + day-of-week picker sheet.
 * No external library needed — uses ScrollView-based time wheels
 * and a day-of-week toggle row.
 *
 * Design: dark `#18181b` sheet, lavender accents, matches NewHabitSheet aesthetic.
 */

import React, { memo, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { X, Bell, Plus, Trash2 } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  hour: number;   // 0–23
  minute: number; // 0, 15, 30, 45
  days: number[]; // 0=Sun, 1=Mon … 6=Sat
}

interface HabitReminderPickerProps {
  visible: boolean;
  reminders: Reminder[];
  onSave: (reminders: Reminder[]) => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SPRING = { damping: 18, stiffness: 250 };

// ─── Time Wheel ───────────────────────────────────────────────────────────────

interface WheelProps {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  format?: (v: number) => string;
}

const TimeWheel = memo(function TimeWheel({ items, selected, onSelect, format }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = items.indexOf(selected);

  // Scroll to selected on mount
  const handleLayout = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      onSelect(items[clamped]);
      Haptics.selectionAsync();
    },
    [items, onSelect],
  );

  return (
    <View style={wheelStyles.container}>
      {/* Selection highlight */}
      <View style={wheelStyles.highlight} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        style={wheelStyles.scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={handleLayout}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      >
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <View key={item} style={wheelStyles.item}>
              <Text style={[wheelStyles.itemText, isSelected && wheelStyles.itemTextSelected]}>
                {format ? format(item) : String(item).padStart(2, "0")}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const wheelStyles = StyleSheet.create({
  container: {
    width: 72,
    height: WHEEL_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  highlight: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(162,155,254,0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(162,155,254,0.3)",
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 22,
    color: "rgba(255,255,255,0.25)",
  },
  itemTextSelected: {
    color: "#ffffff",
    fontSize: 26,
  },
});

// ─── Day Toggle Row ───────────────────────────────────────────────────────────

const DayToggleRow = memo(function DayToggleRow({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (day: number) => void;
}) {
  return (
    <View style={dayStyles.row}>
      {DAY_LABELS.map((label, i) => {
        const isOn = selected.includes(i);
        return (
          <Pressable
            key={i}
            onPress={() => { onToggle(i); Haptics.selectionAsync(); }}
            style={[dayStyles.pill, isOn && dayStyles.pillActive]}
          >
            <Text style={[dayStyles.pillText, isOn && dayStyles.pillTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const dayStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pillActive: {
    backgroundColor: "#7c3aed",
  },
  pillText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  pillTextActive: {
    color: "#ffffff",
  },
});

// ─── Reminder Row ─────────────────────────────────────────────────────────────

const ReminderRow = memo(function ReminderRow({
  reminder,
  onDelete,
}: {
  reminder: Reminder;
  onDelete: (id: string) => void;
}) {
  const h = String(reminder.hour).padStart(2, "0");
  const m = String(reminder.minute).padStart(2, "0");
  const ampm = reminder.hour < 12 ? "AM" : "PM";
  const h12 = reminder.hour % 12 || 12;
  const dayStr = reminder.days.length === 7
    ? "Every day"
    : reminder.days.length === 0
    ? "No days"
    : reminder.days.map((d) => DAY_FULL[d]).join(", ");

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <Bell size={16} color="#a29bfe" strokeWidth={2} />
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.time}>{`${h12}:${m} ${ampm}`}</Text>
        <Text style={rowStyles.days}>{dayStr}</Text>
      </View>
      <Pressable
        onPress={() => { onDelete(reminder.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        hitSlop={12}
        style={rowStyles.deleteBtn}
      >
        <Trash2 size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
      </Pressable>
    </View>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(162,155,254,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  time: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 16,
    color: "#ffffff",
  },
  days: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main Picker ──────────────────────────────────────────────────────────────

export const HabitReminderPicker = memo(function HabitReminderPicker({
  visible,
  reminders,
  onSave,
  onClose,
}: HabitReminderPickerProps) {
  const [localReminders, setLocalReminders] = useState<Reminder[]>(reminders);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHour, setNewHour] = useState(8);
  const [newMinute, setNewMinute] = useState(0);
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri default

  const addBtnScale = useSharedValue(1);
  const addBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  const handleToggleDay = useCallback((day: number) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }, []);

  const handleAddReminder = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const reminder: Reminder = {
      id: Date.now().toString(),
      hour: newHour,
      minute: newMinute,
      days: newDays,
    };
    setLocalReminders((prev) => [...prev, reminder]);
    setShowAddForm(false);
    setNewHour(8);
    setNewMinute(0);
    setNewDays([1, 2, 3, 4, 5]);
  }, [newHour, newMinute, newDays]);

  const handleDeleteReminder = useCallback((id: string) => {
    setLocalReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(localReminders);
    onClose();
  }, [localReminders, onSave, onClose]);

  const handleClose = useCallback(() => {
    setShowAddForm(false);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Bell size={18} color="#a29bfe" strokeWidth={2} />
            <Text style={styles.title}>Reminders</Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <X size={18} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* Existing reminders */}
          {localReminders.length > 0 && (
            <View style={styles.reminderList}>
              {localReminders.map((r) => (
                <ReminderRow key={r.id} reminder={r} onDelete={handleDeleteReminder} />
              ))}
            </View>
          )}

          {localReminders.length === 0 && !showAddForm && (
            <View style={styles.emptyState}>
              <Bell size={32} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No reminders yet</Text>
              <Text style={styles.emptySub}>Add a reminder to stay on track</Text>
            </View>
          )}

          {/* Add reminder form */}
          {showAddForm && (
            <View style={styles.addForm}>
              <Text style={styles.formLabel}>Pick a time</Text>

              {/* Time wheels */}
              <View style={styles.wheelRow}>
                <TimeWheel
                  items={HOURS}
                  selected={newHour}
                  onSelect={setNewHour}
                  format={(v) => {
                    const h = v % 12 || 12;
                    return String(h).padStart(2, "0");
                  }}
                />
                <Text style={styles.wheelColon}>:</Text>
                <TimeWheel
                  items={MINUTES}
                  selected={newMinute}
                  onSelect={setNewMinute}
                  format={(v) => String(v).padStart(2, "0")}
                />
                <View style={styles.ampmCol}>
                  <Pressable
                    onPress={() => { setNewHour((h) => h < 12 ? h : h - 12); Haptics.selectionAsync(); }}
                    style={[styles.ampmBtn, newHour < 12 && styles.ampmBtnActive]}
                  >
                    <Text style={[styles.ampmText, newHour < 12 && styles.ampmTextActive]}>AM</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setNewHour((h) => h >= 12 ? h : h + 12); Haptics.selectionAsync(); }}
                    style={[styles.ampmBtn, newHour >= 12 && styles.ampmBtnActive]}
                  >
                    <Text style={[styles.ampmText, newHour >= 12 && styles.ampmTextActive]}>PM</Text>
                  </Pressable>
                </View>
              </View>

              {/* Day selector */}
              <Text style={[styles.formLabel, { marginTop: 20 }]}>Repeat on</Text>
              <DayToggleRow selected={newDays} onToggle={handleToggleDay} />

              {/* Quick presets */}
              <View style={styles.presetRow}>
                {[
                  { label: "Every day", days: [0,1,2,3,4,5,6] },
                  { label: "Weekdays",  days: [1,2,3,4,5] },
                  { label: "Weekends",  days: [0,6] },
                ].map((preset) => (
                  <Pressable
                    key={preset.label}
                    onPress={() => { setNewDays(preset.days); Haptics.selectionAsync(); }}
                    style={styles.presetBtn}
                  >
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Add button */}
              <Pressable onPress={handleAddReminder} style={styles.addConfirmBtn}>
                <Text style={styles.addConfirmText}>Add Reminder</Text>
              </Pressable>

              {/* Cancel */}
              <Pressable
                onPress={() => setShowAddForm(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Add new reminder button */}
          {!showAddForm && (
            <Animated.View style={addBtnStyle}>
              <Pressable
                onPress={() => {
                  addBtnScale.value = withSpring(0.95, SPRING, () => {
                    addBtnScale.value = withSpring(1, SPRING);
                  });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAddForm(true);
                }}
                style={styles.addNewBtn}
              >
                <Plus size={16} color="#a29bfe" strokeWidth={2.5} />
                <Text style={styles.addNewText}>Add Reminder</Text>
              </Pressable>
            </Animated.View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Save button */}
        {!showAddForm && (
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              Done {localReminders.length > 0 ? `(${localReminders.length})` : ""}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#18181b",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 20,
    color: "#ffffff",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },

  // Reminder list
  reminderList: { gap: 0, marginBottom: 16 },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
  },
  emptySub: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },

  // Add form
  addForm: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 16,
    gap: 0,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  formLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  // Wheel row
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  wheelColon: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 28,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  ampmCol: {
    gap: 6,
    marginLeft: 8,
  },
  ampmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ampmBtnActive: {
    backgroundColor: "#7c3aed",
  },
  ampmText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  ampmTextActive: {
    color: "#ffffff",
  },

  // Presets
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    flexWrap: "wrap",
  },
  presetBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  presetText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  // Add confirm
  addConfirmBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  addConfirmText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 14,
    color: "#ffffff",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  // Add new button
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(162,155,254,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(162,155,254,0.25)",
    borderStyle: "dashed",
  },
  addNewText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 14,
    color: "#a29bfe",
  },

  // Save
  saveBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveBtnText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "#ffffff",
  },
});
