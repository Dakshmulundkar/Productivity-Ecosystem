import React, { useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  TextInput,
  Alert,
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
const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; label: string }> = {
  Low:    { bg: "#dcfce7", text: "#166534", label: "LOW" },
  Medium: { bg: "#fef3c7", text: "#92400e", label: "MED" },
  High:   { bg: "#fee2e2", text: "#991b1b", label: "HIGH" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────
// (Initial tasks are seeded in the store — useTaskStore)

// ─── Date strip ───────────────────────────────────────────────────────────────

function buildDateStrip() {
  const today = new Date();
  const result = [];
  for (let i = -3; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push({
      dayNum: d.getDate(),
      dayName: DAYS_OF_WEEK[d.getDay()],
      isToday: i === 0,
      key: d.toISOString().slice(0, 10),
    });
  }
  return result;
}

const DATE_STRIP = buildDateStrip();

// ─── Sub-components ───────────────────────────────────────────────────────────

const DatePill = memo(function DatePill({
  dayNum, dayName, isSelected, onPress,
}: {
  dayNum: number; dayName: string; isSelected: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.datePill, isSelected ? styles.datePillActive : null]}>
      <Text style={[styles.datePillNum, isSelected ? styles.datePillNumActive : null]}>{dayNum}</Text>
      <Text style={[styles.datePillName, isSelected ? styles.datePillNameActive : null]}>{dayName}</Text>
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

  return (
    <Animated.View style={[styles.taskCard, animStyle]}>
      <View style={styles.taskCardTop}>
        <View style={styles.duePill}>
          <CalendarDays size={10} color="#888" />
          <Text style={styles.duePillText}>{task.dueDate}</Text>
        </View>
        <PriorityPill priority={task.priority} />
      </View>
      <Text style={[styles.taskTitle, task.done ? styles.taskTitleDone : null]} numberOfLines={2}>
        {task.title}
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
  selectedDate,
  onSelect,
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
      {/* Month nav */}
      <View style={calStyles.header}>
        <Pressable onPress={prevMonth} hitSlop={12} style={calStyles.navBtn}>
          <ChevronLeft size={18} color="#fff" />
        </Pressable>
        <Text style={calStyles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={calStyles.navBtn}>
          <ChevronRight size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Day name headers */}
      <View style={calStyles.dayNames}>
        {DAY_NAMES_SHORT.map(n => (
          <Text key={n} style={calStyles.dayNameText}>{n}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={calStyles.grid}>
        {cells.map(cell => {
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedKey;
          const isPast = cell.day !== null && cell.key < todayKey;
          return (
            <Pressable
              key={cell.key}
              style={calStyles.cell}
              onPress={() => {
                if (!cell.day || isPast) return;
                Haptics.selectionAsync();
                onSelect(new Date(viewYear, viewMonth, cell.day));
              }}
              disabled={!cell.day || isPast}
            >
              {cell.day !== null && (
                <View style={[
                  calStyles.dayCircle,
                  isSelected && calStyles.dayCircleSelected,
                  isToday && !isSelected && calStyles.dayCircleToday,
                  isPast && calStyles.dayCirclePast,
                ]}>
                  <Text style={[
                    calStyles.dayText,
                    isSelected && calStyles.dayTextSelected,
                    isToday && !isSelected && calStyles.dayTextToday,
                    isPast && calStyles.dayTextPast,
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
  dayCirclePast: {},
  dayText: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#ccc" },
  dayTextSelected: { color: "#1a1a1a", fontFamily: FontFamily.inter.bold },
  dayTextToday: { color: "#b8a9f0", fontFamily: FontFamily.inter.bold },
  dayTextPast: { color: "#444" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  // ── Store ──
  const tasks      = useTaskStore((s) => s.tasks);
  const addTask    = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    DATE_STRIP.find((d) => d.isToday)?.key ?? DATE_STRIP[3].key,
  );
  const [showSheet, setShowSheet] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<Priority>("Medium");
  const [formDueDate, setFormDueDate] = useState<"Today" | "Custom">("Today");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCalPicker, setShowCalPicker] = useState(false);

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
    setFormDueDate("Today"); setCustomDate(null); setShowCalPicker(false);
    setShowSheet(true);
  }, []);

  const closeSheet = useCallback(() => setShowSheet(false), []);

  const handleAddTask = useCallback(() => {
    if (!formTitle.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }
    if (formDueDate === "Custom" && !customDate) {
      Alert.alert("Date required", "Please pick a custom date.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dueDateLabel =
      formDueDate === "Today"
        ? "Today"
        : customDate
        ? customDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Today";
    addTask({
      title: formTitle.trim(),
      description: formDesc.trim() || "No description",
      priority: formPriority,
      dueDate: dueDateLabel,
      done: false,
    });
    setShowSheet(false);
  }, [formTitle, formDesc, formPriority, formDueDate, customDate, addTask]);

  const handleSelectDate = useCallback((key: string) => {
    Haptics.selectionAsync();
    setSelectedDateKey(key);
  }, []);

  const handleSelectPriority = useCallback((p: Priority) => setFormPriority(p), []);

  const pendingCount = tasks.filter((t) => !t.done).length;

  // ── Filter tasks by selected date ──
  const todayISO = toISO(new Date());
  const tomorrowISO = toISO(addDays(new Date(), 1));

  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Map dueDate label → ISO key for comparison
      if (t.dueDate === "Today") return selectedDateKey === todayISO;
      if (t.dueDate === "Tomorrow") return selectedDateKey === tomorrowISO;
      // Custom date stored as "Jun 15" — parse and compare
      try {
        const parsed = new Date(`${t.dueDate} ${new Date().getFullYear()}`);
        if (!isNaN(parsed.getTime())) return toISO(parsed) === selectedDateKey;
      } catch { /* ignore */ }
      return false;
    });
  }, [tasks, selectedDateKey, todayISO, tomorrowISO]);

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

        {/* Date strip */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
            {DATE_STRIP.map((d) => (
              <DatePill
                key={d.key}
                dayNum={d.dayNum}
                dayName={d.dayName}
                isSelected={selectedDateKey === d.key}
                onPress={() => handleSelectDate(d.key)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Task list — filtered by selected date */}
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
          />
          <TextInput
            style={[styles.sheetInput, styles.sheetInputMulti]}
            placeholder="Description (optional)"
            placeholderTextColor="#555"
            value={formDesc}
            onChangeText={setFormDesc}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.sheetLabel}>Priority</Text>
          <PrioritySelector selected={formPriority} onSelect={handleSelectPriority} />
          {/* Due date toggle */}
          <Text style={styles.sheetLabel}>Due Date</Text>
          <View style={styles.prioritySelectorRow}>
            {(["Today", "Custom"] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setFormDueDate(d);
                  if (d === "Custom") setShowCalPicker(true);
                  else setShowCalPicker(false);
                }}
                style={[
                  styles.prioritySelectorPill,
                  formDueDate === d ? styles.dueDateActive : styles.prioritySelectorPillInactive,
                ]}
              >
                <Text style={[
                  styles.prioritySelectorText,
                  formDueDate === d ? styles.dueDateActiveText : styles.prioritySelectorTextInactive,
                ]}>
                  {d === "Custom" && customDate
                    ? customDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : d}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* Inline calendar picker */}
          {showCalPicker && (
            <CalendarPicker
              selectedDate={customDate}
              onSelect={(date) => {
                setCustomDate(date);
                setShowCalPicker(false);
              }}
            />
          )}
          <Pressable onPress={handleAddTask} style={styles.sheetSaveBtn}>
            <Text style={styles.sheetSaveBtnText}>Save Task</Text>
          </Pressable>
        </View>
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
  newTaskBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1a1a1a", borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start", marginTop: 4 },
  newTaskBtnText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#fff" },

  dateStrip: { paddingVertical: 4, gap: 6, paddingRight: 8 },
  datePill: { alignItems: "center", justifyContent: "center", width: 44, paddingVertical: 8, borderRadius: 12, backgroundColor: "transparent" },
  datePillActive: { backgroundColor: "#1a1a1a" },
  datePillNum: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#1a1a1a", lineHeight: 24 },
  datePillNumActive: { color: "#fff" },
  datePillName: { fontFamily: FontFamily.inter.regular, fontSize: 10, color: "#888" },
  datePillNameActive: { color: "#fff" },

  taskCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 8 },
  taskCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  duePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f5f5", borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  duePillText: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#888" },
  priorityPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  priorityPillText: { fontFamily: FontFamily.inter.bold, fontSize: 10 },
  taskTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 17, color: "#1a1a1a", lineHeight: 22 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#aaa" },
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
  sheetDueRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2a2a2a", borderRadius: 12, padding: 12 },
  sheetDueText: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888", flex: 1 },
  sheetSaveBtn: { backgroundColor: "#b8a9f0", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  sheetSaveBtnText: { fontFamily: FontFamily.poppins.bold, fontSize: 14, color: "#1a1a1a" },
  dueDateActive: { backgroundColor: "#b8a9f0" },
  dueDateActiveText: { color: "#1a1a1a" },
});
