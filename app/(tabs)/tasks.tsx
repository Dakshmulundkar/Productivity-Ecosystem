import React, { useState, useCallback, memo, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  Flag,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { useTaskStore } from "@/store/useTaskStore";
import type { Priority, Task } from "@/store/useTaskStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Number of days to render on each side of today for the infinite strip
const DATE_WINDOW = 180;

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function formatDueLabel(iso: string): string {
  if (iso === "everyday") return "Everyday";
  const todayISO = toISO(new Date());
  const tomorrowISO = toISO(addDays(new Date(), 1));
  if (iso === todayISO) return "Today";
  if (iso === tomorrowISO) return "Tomorrow";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; label: string }> = {
  Low:    { bg: "#dcfce7", text: "#166534", label: "LOW" },
  Medium: { bg: "#fef3c7", text: "#92400e", label: "MED" },
  High:   { bg: "#fee2e2", text: "#991b1b", label: "HIGH" },
};

// ─── Date strip item ──────────────────────────────────────────────────────────

interface DateItem {
  key: string;       // YYYY-MM-DD
  dayNum: number;
  dayName: string;
  isToday: boolean;
}

function buildDateItem(offsetFromToday: number): DateItem {
  const d = addDays(new Date(), offsetFromToday);
  return {
    key: toISO(d),
    dayNum: d.getDate(),
    dayName: DAYS_OF_WEEK[d.getDay()],
    isToday: offsetFromToday === 0,
  };
}

// Pre-build DATE_WINDOW days in each direction
function buildDateRange(): DateItem[] {
  const items: DateItem[] = [];
  for (let i = -DATE_WINDOW; i <= DATE_WINDOW; i++) {
    items.push(buildDateItem(i));
  }
  return items;
}

const DATE_ITEMS = buildDateRange();
const TODAY_INDEX = DATE_WINDOW; // index of today in the array

// ─── Sub-components ───────────────────────────────────────────────────────────

const DatePill = memo(function DatePill({
  item, isSelected, onPress,
}: {
  item: DateItem; isSelected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.datePill,
        isSelected ? styles.datePillActive : null,
        item.isToday && !isSelected ? styles.datePillToday : null,
      ]}
    >
      <Text style={[styles.datePillNum, isSelected ? styles.datePillNumActive : null]}>
        {item.dayNum}
      </Text>
      <Text style={[styles.datePillName, isSelected ? styles.datePillNameActive : null]}>
        {item.dayName}
      </Text>
      {item.isToday && !isSelected && <View style={styles.todayDot} />}
    </Pressable>
  );
});

const PriorityPill = memo(function PriorityPill({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLES[priority];
  return (
    <View style={[styles.priorityPill, { backgroundColor: s.bg }]}>
      <Flag size={10} color={s.text} />
      <Text style={[styles.priorityPillText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
});

const TaskCard = memo(function TaskCard({
  task, onToggle, onDelete,
}: {
  task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleToggle = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id);
  }, [task.id, onToggle, scale]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(task.id);
  }, [task.id, onDelete]);

  const isEveryday = task.dueDateISO === "everyday";

  return (
    <Animated.View style={[styles.taskCard, animStyle]}>
      <View style={styles.taskCardTop}>
        <View style={[styles.duePill, isEveryday && styles.duePillEveryday]}>
          {isEveryday
            ? <Repeat size={10} color="#6d4fc9" />
            : <CalendarDays size={10} color="#888" />}
          <Text style={[styles.duePillText, isEveryday && styles.duePillTextEveryday]}>
            {formatDueLabel(task.dueDateISO)}
          </Text>
        </View>
        <PriorityPill priority={task.priority} />
      </View>
      {/* Wrap title in an extra Text for Android textDecorationLine + custom font compatibility */}
      <Text style={styles.taskTitle} numberOfLines={2}>
        <Text style={task.done ? [styles.taskTitleDone, styles.taskTitleDoneDecoration] : undefined}>
          {task.title}
        </Text>
      </Text>
      <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
      <View style={styles.taskCardBottom}>
        <Pressable onPress={handleToggle} style={styles.statusBadge}>
          {task.done
            ? <CheckCircle2 size={16} color="#166534" />
            : <Circle size={16} color="#888" />}
          <Text style={[styles.statusText, task.done ? styles.statusTextDone : null]}>
            {task.done ? "Done" : "Pending"}
          </Text>
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Trash2 size={16} color="#ccc" />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const PrioritySelector = memo(function PrioritySelector({
  selected, onSelect,
}: {
  selected: Priority; onSelect: (p: Priority) => void;
}) {
  const priorities: Priority[] = ["Low", "Medium", "High"];
  return (
    <View style={styles.prioritySelectorRow}>
      {priorities.map((p) => {
        const s = PRIORITY_STYLES[p];
        const isActive = selected === p;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            style={[
              styles.prioritySelectorPill,
              isActive ? { backgroundColor: s.bg } : styles.prioritySelectorPillInactive,
            ]}
          >
            <Text style={[
              styles.prioritySelectorText,
              isActive ? { color: s.text } : styles.prioritySelectorTextInactive,
            ]}>
              {p}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ─── Inline Calendar Picker ───────────────────────────────────────────────────

const CalendarPicker = memo(function CalendarPicker({
  selectedDate, onSelect,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = toISO(today);
  const selectedKey = selectedDate ? toISO(selectedDate) : null;

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, key: `e-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toISO(new Date(viewYear, viewMonth, d)) });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={calStyles.container}>
      <View style={calStyles.header}>
        <Pressable onPress={prevMonth} hitSlop={12} style={calStyles.navBtn}>
          <ChevronLeft size={18} color="#fff" />
        </Pressable>
        <Text style={calStyles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={calStyles.navBtn}>
          <ChevronRight size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={calStyles.dayNames}>
        {DAY_NAMES_SHORT.map(n => (
          <Text key={n} style={calStyles.dayNameText}>{n}</Text>
        ))}
      </View>
      <View style={calStyles.grid}>
        {cells.map(cell => {
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedKey;
          return (
            <Pressable
              key={cell.key}
              style={calStyles.cell}
              onPress={() => {
                if (!cell.day) return;
                Haptics.selectionAsync();
                onSelect(new Date(viewYear, viewMonth, cell.day));
              }}
              disabled={!cell.day}
            >
              {cell.day !== null && (
                <View style={[
                  calStyles.dayCircle,
                  isSelected && calStyles.dayCircleSelected,
                  isToday && !isSelected && calStyles.dayCircleToday,
                ]}>
                  <Text style={[
                    calStyles.dayText,
                    isSelected && calStyles.dayTextSelected,
                    isToday && !isSelected && calStyles.dayTextToday,
                  ]}>
                    {cell.day}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const calStyles = StyleSheet.create({
  container: { backgroundColor: "#242424", borderRadius: 18, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#333", alignItems: "center", justifyContent: "center" },
  monthTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 15, color: "#fff" },
  dayNames: { flexDirection: "row" },
  dayNameText: { flex: 1, textAlign: "center", fontFamily: FontFamily.inter.semiBold, fontSize: 11, color: "#666" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%` as any, alignItems: "center", paddingVertical: 3 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayCircleSelected: { backgroundColor: "#b8a9f0" },
  dayCircleToday: { borderWidth: 1.5, borderColor: "#b8a9f0" },
  dayText: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#ccc" },
  dayTextSelected: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },
  dayTextToday: { color: "#b8a9f0", fontFamily: FontFamily.inter.bold },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  const tasks      = useTaskStore((s) => s.tasks);
  const addTask    = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const todayKey = useMemo(() => toISO(new Date()), []);
  const stripRef = useRef<FlatList>(null);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [showSheet, setShowSheet] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<Priority>("Medium");
  // "today" | "everyday" | "custom"
  const [formDueDateMode, setFormDueDateMode] = useState<"today" | "everyday" | "custom">("today");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCalPicker, setShowCalPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll date strip to today on mount
  const handleStripLayout = useCallback(() => {
    stripRef.current?.scrollToIndex({ index: TODAY_INDEX, animated: false, viewPosition: 0.5 });
  }, []);

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTask(id);
  }, [toggleTask]);

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteTask(id);
  }, [deleteTask]);

  const openSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormTitle(""); setFormDesc(""); setFormPriority("Medium");
    setFormDueDateMode("today"); setCustomDate(null); setShowCalPicker(false);
    setShowSheet(true);
  }, []);

  const closeSheet = useCallback(() => setShowSheet(false), []);

  const handleAddTask = useCallback(async () => {
    if (isSubmitting) return;
    if (!formTitle.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }
    if (formDueDateMode === "custom" && !customDate) {
      Alert.alert("Date required", "Please pick a date.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const dueDateISO =
      formDueDateMode === "today"    ? toISO(new Date()) :
      formDueDateMode === "everyday" ? "everyday" :
      toISO(customDate!);

    try {
      setIsSubmitting(true);
      await addTask({
        title: formTitle.trim(),
        description: formDesc.trim() || "No description",
        priority: formPriority,
        dueDateISO,
      });
      setShowSheet(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to add task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, formTitle, formDesc, formPriority, formDueDateMode, customDate, addTask]);

  const handleSelectDate = useCallback((key: string) => {
    Haptics.selectionAsync();
    setSelectedDateKey(key);
  }, []);

  const handleSelectPriority = useCallback((p: Priority) => setFormPriority(p), []);

  const pendingCount = useMemo(() =>
    tasks.filter((t) => !t.done && (t.dueDateISO === "everyday" || t.dueDateISO >= todayKey)).length,
  [tasks, todayKey]);

  // Everyday tasks always show (undone). Date-specific tasks show on their date (done or undone).
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) =>
      t.dueDateISO === "everyday"
        ? !t.done  // everyday tasks: show until completed
        : t.dueDateISO === selectedDateKey  // date tasks: show on that date
    );
  }, [tasks, selectedDateKey]);

  const customDateLabel = useMemo(() => {
    if (formDueDateMode === "custom" && customDate) {
      return customDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return "Pick date";
  }, [formDueDateMode, customDate]);

  const renderDateItem = useCallback(({ item }: { item: DateItem }) => (
    <DatePill
      item={item}
      isSelected={selectedDateKey === item.key}
      onPress={() => handleSelectDate(item.key)}
    />
  ), [selectedDateKey, handleSelectDate]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 62, offset: 62 * index, index,
  }), []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{"MANAGE YOUR\nTASKS"}</Text>
            <Text style={styles.headerSub}>{pendingCount} task{pendingCount !== 1 ? "s" : ""} remaining</Text>
          </View>
          <Pressable onPress={openSheet} style={styles.newTaskBtn}>
            <Plus size={14} color="#fff" />
            <Text style={styles.newTaskBtnText}>New Task</Text>
          </Pressable>
        </Animated.View>

        {/* Infinite date strip */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <FlatList
            ref={stripRef}
            data={DATE_ITEMS}
            horizontal
            keyExtractor={(item) => item.key}
            renderItem={renderDateItem}
            getItemLayout={getItemLayout}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
            onLayout={handleStripLayout}
            onScrollToIndexFailed={() => {
              // Fallback: scroll after a small delay
              setTimeout(() => {
                stripRef.current?.scrollToIndex({ index: TODAY_INDEX, animated: false, viewPosition: 0.5 });
              }, 100);
            }}
            initialScrollIndex={TODAY_INDEX}
          />
        </Animated.View>

        {/* Selected date label */}
        <Text style={styles.dateLabel}>
          {selectedDateKey === todayKey
            ? "Today"
            : new Date(selectedDateKey + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
        </Text>

        {/* Task list */}
        {visibleTasks.map((task, i) => (
          <Animated.View key={task.id} entering={FadeInDown.delay(120 + i * 60).duration(400)}>
            <TaskCard task={task} onToggle={handleToggle} onDelete={handleDelete} />
          </Animated.View>
        ))}

        {visibleTasks.length === 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.emptyState}>
            <CheckCircle2 size={40} color="#ccc" />
            <Text style={styles.emptyText}>No tasks for this day.</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Create Task Sheet */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheetOverlay} onPress={closeSheet} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Task</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Task title"
              placeholderTextColor="#555"
              value={formTitle}
              onChangeText={setFormTitle}
              editable={!isSubmitting}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.sheetInput, styles.sheetInputMulti]}
              placeholder="Description (optional)"
              placeholderTextColor="#555"
              value={formDesc}
              onChangeText={setFormDesc}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
            <Text style={styles.sheetLabel}>Priority</Text>
            <PrioritySelector selected={formPriority} onSelect={handleSelectPriority} />

            <Text style={styles.sheetLabel}>Due Date</Text>
            <View style={styles.dueDateRow}>
              {/* Today */}
              <Pressable
                onPress={() => { setFormDueDateMode("today"); setShowCalPicker(false); }}
                style={[styles.dueDatePill, formDueDateMode === "today" && styles.dueDatePillActive]}
              >
                <Text style={[styles.dueDatePillText, formDueDateMode === "today" && styles.dueDatePillTextActive]}>
                  Today
                </Text>
              </Pressable>

              {/* Everyday */}
              <Pressable
                onPress={() => { setFormDueDateMode("everyday"); setShowCalPicker(false); }}
                style={[styles.dueDatePill, styles.dueDatePillEveryday, formDueDateMode === "everyday" && styles.dueDatePillEverydayActive]}
              >
                <Repeat size={11} color={formDueDateMode === "everyday" ? "#fff" : "#6d4fc9"} strokeWidth={2} />
                <Text style={[styles.dueDatePillText, styles.dueDatePillTextEveryday, formDueDateMode === "everyday" && styles.dueDatePillTextEverydayActive]}>
                  Everyday
                </Text>
              </Pressable>

              {/* Custom date */}
              <Pressable
                onPress={() => { setFormDueDateMode("custom"); setShowCalPicker(true); }}
                style={[styles.dueDatePill, formDueDateMode === "custom" && styles.dueDatePillActive]}
              >
                <CalendarDays size={11} color={formDueDateMode === "custom" ? "#1a1a1a" : "#888"} strokeWidth={2} />
                <Text style={[styles.dueDatePillText, formDueDateMode === "custom" && styles.dueDatePillTextActive]}>
                  {customDateLabel}
                </Text>
              </Pressable>
            </View>

            {/* Everyday hint */}
            {formDueDateMode === "everyday" && (
              <Text style={styles.everydayHint}>
                This task will appear every day until you mark it as done.
              </Text>
            )}

            {showCalPicker && (
              <CalendarPicker
                selectedDate={customDate}
                onSelect={(date) => {
                  setCustomDate(date);
                  setShowCalPicker(false);
                }}
              />
            )}

            <Pressable
              onPress={handleAddTask}
              disabled={isSubmitting}
              style={[styles.sheetSaveBtn, isSubmitting && styles.sheetSaveBtnDisabled]}
            >
              <Text style={styles.sheetSaveBtnText}>
                {isSubmitting ? "Saving..." : "Save Task"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  headerLeft: { flex: 1, marginRight: 12 },
  headerTitle: { fontFamily: FontFamily.poppins.black, fontSize: 28, color: "#1a1a1a", letterSpacing: -0.5, lineHeight: 32 },
  headerSub: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#888", marginTop: 4 },
  newTaskBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1a1a1a", borderRadius: 99, paddingVertical: 9, paddingHorizontal: 16, alignSelf: "flex-start", marginTop: 4 },
  newTaskBtnText: { fontFamily: FontFamily.inter.semiBold, fontSize: 13, color: "#fff" },

  dateStrip: { paddingVertical: 4, paddingHorizontal: 8, gap: 6 },
  datePill: { width: 56, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: "transparent" },
  datePillActive: { backgroundColor: "#1a1a1a" },
  datePillToday: { backgroundColor: "#f0eef9" },
  datePillNum: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#1a1a1a", lineHeight: 24 },
  datePillNumActive: { color: "#fff" },
  datePillName: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#888" },
  datePillNameActive: { color: "#fff" },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#b8a9f0", marginTop: 2 },

  dateLabel: { fontFamily: FontFamily.inter.semiBold, fontSize: 13, color: "#888", marginTop: -4 },

  taskCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 8 },
  taskCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  duePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f5f5", borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  duePillEveryday: { backgroundColor: "#ede9fe" },
  duePillText: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#888" },
  duePillTextEveryday: { color: "#6d4fc9", fontFamily: FontFamily.inter.semiBold },
  priorityPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  priorityPillText: { fontFamily: FontFamily.inter.bold, fontSize: 10 },
  taskTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 17, color: "#1a1a1a", lineHeight: 22 },
  taskTitleDone: { color: "#aaa" },  // fontFamily stays, decoration on wrapper below
  taskTitleDoneDecoration: { textDecorationLine: "line-through" },
  taskDesc: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#888" },
  taskCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#888" },
  statusTextDone: { color: "#166534" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: FontFamily.inter.regular, fontSize: 14, color: "#aaa" },

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: "#1a1a1a", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 18, color: "#fff", marginBottom: 4 },
  sheetInput: { backgroundColor: "#fff", borderRadius: 14, padding: 14, fontFamily: FontFamily.inter.regular, fontSize: 14, color: "#1a1a1a" },
  sheetInputMulti: { minHeight: 80, textAlignVertical: "top" },
  sheetLabel: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  prioritySelectorRow: { flexDirection: "row", gap: 8 },
  prioritySelectorPill: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  prioritySelectorPillInactive: { backgroundColor: "#2a2a2a" },
  prioritySelectorText: { fontFamily: FontFamily.inter.semiBold, fontSize: 13 },
  prioritySelectorTextInactive: { color: "#666" },

  // Due date pills
  dueDateRow: { flexDirection: "row", gap: 8 },
  dueDatePill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: "#2a2a2a" },
  dueDatePillActive: { backgroundColor: "#b8a9f0" },
  dueDatePillText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#666" },
  dueDatePillTextActive: { color: "#1a1a1a" },
  dueDatePillEveryday: { borderWidth: 1, borderColor: "#6d4fc9" },
  dueDatePillEverydayActive: { backgroundColor: "#6d4fc9", borderColor: "#6d4fc9" },
  dueDatePillTextEveryday: { color: "#b8a9f0" },
  dueDatePillTextEverydayActive: { color: "#fff" },
  everydayHint: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#6d4fc9", textAlign: "center", marginTop: -4 },

  sheetSaveBtn: { backgroundColor: "#b8a9f0", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  sheetSaveBtnDisabled: { opacity: 0.5 },
  sheetSaveBtnText: { fontFamily: FontFamily.poppins.bold, fontSize: 14, color: "#1a1a1a" },
});
