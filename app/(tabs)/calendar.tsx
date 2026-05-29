import React, { useState, useCallback, memo } from "react";
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
import { ChevronLeft, ChevronRight, MapPin, Plus, Calendar } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "day" | "week" | "month";
type EventCategory = "Work" | "Personal" | "Health" | "Social" | "Focus";

interface CalEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<EventCategory, string> = {
  Work:     "#7a3a3a",
  Personal: "#2e5fa3",
  Health:   "#27774a",
  Social:   "#c0392b",
  Focus:    "#6d4fc9",
};

const DAY_COLORS = [
  "#2e5fa3", // Mon
  "#27774a", // Tue
  "#7a3a3a", // Wed
  "#6d4fc9", // Thu
  "#b8860b", // Fri
  "#2a2a2a", // Sat
  "#c0392b", // Sun
];

const WEEK_DAYS_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const FULL_DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Mock events ─────────────────────────────────────────────────────────────

const _today = new Date();
const _tomorrow = addDays(_today, 1);

let MOCK_EVENTS: CalEvent[] = [
  { id: "1", title: "Team Standup",    time: "9:00 AM",  location: "Zoom",           category: "Work",     date: toISO(_today)    },
  { id: "2", title: "Design Review",   time: "2:00 PM",  location: "Office",         category: "Work",     date: toISO(_today)    },
  { id: "3", title: "Gym Session",     time: "6:00 AM",  location: "Fitness Center", category: "Health",   date: toISO(_today)    },
  { id: "4", title: "Lunch with Alex", time: "12:30 PM", location: "Cafe",           category: "Social",   date: toISO(_tomorrow) },
  { id: "5", title: "Deep Work Block", time: "10:00 AM", location: "Home",           category: "Focus",    date: toISO(_tomorrow) },
];

// ─── View Toggle ─────────────────────────────────────────────────────────────

const ViewToggle = memo(function ViewToggle({
  active,
  onChange,
}: {
  active: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const modes: ViewMode[] = ["day", "week", "month"];
  return (
    <View style={styles.viewToggleRow}>
      {modes.map((m) => (
        <Pressable
          key={m}
          onPress={() => { Haptics.selectionAsync(); onChange(m); }}
          style={[
            styles.viewTogglePill,
            active === m ? styles.viewTogglePillActive : styles.viewTogglePillInactive,
          ]}
        >
          <Text style={[
            styles.viewToggleText,
            active === m ? styles.viewToggleTextActive : styles.viewToggleTextInactive,
          ]}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// ─── Event Card ───────────────────────────────────────────────────────────────

const EventCard = memo(function EventCard({ event }: { event: CalEvent }) {
  const color = CATEGORY_COLORS[event.category];
  return (
    <View style={[styles.eventCard, { backgroundColor: color }]}>
      <Text style={styles.eventTime}>{event.time}</Text>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <View style={styles.eventLocationRow}>
        <MapPin size={12} color="rgba(255,255,255,0.7)" />
        <Text style={styles.eventLocation}>{event.location}</Text>
      </View>
    </View>
  );
});

// ─── Day View ─────────────────────────────────────────────────────────────────

const DayView = memo(function DayView({
  selectedDate,
  onPrev,
  onNext,
  events,
}: {
  selectedDate: Date;
  onPrev: () => void;
  onNext: () => void;
  events: CalEvent[];
}) {
  const dayOfWeek = FULL_DAY_NAMES[selectedDate.getDay()];
  const dayNum = selectedDate.getDate();
  const monthName = MONTH_NAMES[selectedDate.getMonth()];
  const dateKey = toISO(selectedDate);
  const dayEvents = events.filter((e) => e.date === dateKey);

  return (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayHeader}>
        <Pressable onPress={onPrev} hitSlop={12} style={styles.arrowBtn}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <View style={styles.dayHeaderCenter}>
          <Text style={styles.dayOfWeek}>{dayOfWeek.toUpperCase()}</Text>
          <Text style={styles.dayNumber}>{dayNum}</Text>
          <Text style={styles.dayMonth}>{monthName}</Text>
        </View>
        <Pressable onPress={onNext} hitSlop={12} style={styles.arrowBtn}>
          <ChevronRight size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      {dayEvents.length === 0 ? (
        <View style={styles.noEventsBox}>
          <Text style={styles.noEventsText}>No events today</Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {dayEvents.map((e, i) => (
            <Animated.View key={e.id} entering={FadeInDown.delay(i * 80).duration(350)}>
              <EventCard event={e} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Week View ────────────────────────────────────────────────────────────────

const WeekView = memo(function WeekView({
  selectedDate,
  events,
  onDayPress,
}: {
  selectedDate: Date;
  events: CalEvent[];
  onDayPress: (date: Date) => void;
}) {
  const dow = selectedDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(selectedDate, mondayOffset);

  return (
    <View style={styles.weekContainer}>
      {WEEK_DAYS_ABBR.map((abbr, i) => {
        const d = addDays(monday, i);
        const dateKey = toISO(d);
        const dayEvents = events.filter((e) => e.date === dateKey);
        const color = DAY_COLORS[i];
        return (
          <Animated.View
            key={abbr}
            entering={FadeInDown.delay(i * 60).duration(350)}
            style={[styles.weekRow, { backgroundColor: color }]}
          >
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDayPress(d); }}
              style={styles.weekDayBlock}
            >
              <Text style={styles.weekDayAbbr}>{abbr}</Text>
              <Text style={styles.weekDayNum}>{d.getDate()}</Text>
              <View style={styles.weekAddHint}>
                <Plus size={10} color="rgba(255,255,255,0.5)" />
              </View>
            </Pressable>
            <View style={styles.weekEventChips}>
              {dayEvents.length === 0 ? (
                <Text style={styles.weekNoEvents}>Free</Text>
              ) : (
                dayEvents.map((e) => (
                  <View key={e.id} style={styles.weekChip}>
                    <Text style={styles.weekChipText} numberOfLines={1}>{e.title}</Text>
                  </View>
                ))
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
});

// ─── Month View ───────────────────────────────────────────────────────────────

const MonthView = memo(function MonthView({
  selectedDate,
  onPrevMonth,
  onNextMonth,
  events,
  onDayPress,
}: {
  selectedDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: CalEvent[];
  onDayPress: (date: Date) => void;
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const todayKey = toISO(new Date());
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDates = new Set(events.map((e) => e.date));

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, key: `empty-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toISO(new Date(year, month, d)) });
  }

  return (
    <View style={styles.monthContainer}>
      <View style={styles.monthHeader}>
        <Pressable onPress={onPrevMonth} hitSlop={12}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable onPress={onNextMonth} hitSlop={12}>
          <ChevronRight size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <View style={styles.monthDayNames}>
        {DAY_NAMES_SHORT.map((n) => (
          <Text key={n} style={styles.monthDayNameText}>{n}</Text>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {cells.map((cell) => {
          const isToday = cell.key === todayKey;
          const hasEvent = cell.day !== null && eventDates.has(cell.key);
          return (
            <Pressable
              key={cell.key}
              style={styles.monthCell}
              onPress={() => {
                if (!cell.day) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDayPress(new Date(year, month, cell.day));
              }}
              disabled={!cell.day}
            >
              {cell.day !== null && (
                <>
                  <View style={[styles.monthDayCircle, isToday ? styles.monthDayCircleToday : null]}>
                    <Text style={[styles.monthDayText, isToday ? styles.monthDayTextToday : null]}>
                      {cell.day}
                    </Text>
                  </View>
                  {hasEvent && <View style={styles.monthEventDot} />}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalEvent[]>(MOCK_EVENTS);

  // Add event sheet state
  const [showSheet, setShowSheet] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState<EventCategory>("Work");

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const handlePrevDay = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedDate((d) => addDays(d, -1));
  }, []);

  const handleNextDay = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedDate((d) => addDays(d, 1));
  }, []);

  const handlePrevMonth = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedDate((d) => { const r = new Date(d); r.setMonth(r.getMonth() - 1); return r; });
  }, []);

  const handleNextMonth = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedDate((d) => { const r = new Date(d); r.setMonth(r.getMonth() + 1); return r; });
  }, []);

  const openSheet = useCallback((date: Date) => {
    setSelectedDate(date);
    setFormTitle(""); setFormTime(""); setFormLocation(""); setFormCategory("Work");
    setShowSheet(true);
  }, []);

  const handleFabPress = useCallback(() => {
    fabScale.value = withSpring(0.9, { damping: 12, stiffness: 300 }, () => {
      fabScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openSheet(selectedDate);
  }, [fabScale, openSheet, selectedDate]);

  const handleDayPress = useCallback((date: Date) => {
    openSheet(date);
  }, [openSheet]);

  const handleAddEvent = useCallback(() => {
    if (!formTitle.trim()) {
      Alert.alert("Title required", "Please enter an event title.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newEvent: CalEvent = {
      id: Date.now().toString(),
      title: formTitle.trim(),
      time: formTime.trim() || "All day",
      location: formLocation.trim() || "—",
      category: formCategory,
      date: toISO(selectedDate),
    };
    setEvents(prev => [...prev, newEvent]);
    // keep MOCK_EVENTS in sync so sub-components see the update
    MOCK_EVENTS = [...MOCK_EVENTS, newEvent];
    setShowSheet(false);
  }, [formTitle, formTime, formLocation, formCategory, selectedDate]);

  const handleViewChange = useCallback((v: ViewMode) => setViewMode(v), []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <ViewToggle active={viewMode} onChange={handleViewChange} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          {viewMode === "day" && (
            <DayView selectedDate={selectedDate} onPrev={handlePrevDay} onNext={handleNextDay} events={events} />
          )}
          {viewMode === "week" && <WeekView selectedDate={selectedDate} events={events} onDayPress={handleDayPress} />}
          {viewMode === "month" && (
            <MonthView selectedDate={selectedDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} events={events} onDayPress={handleDayPress} />
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fab, { bottom: insets.bottom + 64 + 12 + 16 }, fabStyle]}>
        <Pressable onPress={handleFabPress} style={styles.fabInner}>
          <Plus size={24} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* Add Event Sheet */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <Pressable style={sheetStyles.overlay} onPress={() => setShowSheet(false)} />
        <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.titleRow}>
            <Calendar size={18} color="#b8a9f0" />
            <Text style={sheetStyles.title}>New Event</Text>
          </View>
          <Text style={sheetStyles.dateLabel}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>

          <TextInput
            style={sheetStyles.input}
            placeholder="Event title"
            placeholderTextColor="#555"
            value={formTitle}
            onChangeText={setFormTitle}
          />
          <TextInput
            style={sheetStyles.input}
            placeholder="Time (e.g. 9:00 AM)"
            placeholderTextColor="#555"
            value={formTime}
            onChangeText={setFormTime}
          />
          <TextInput
            style={sheetStyles.input}
            placeholder="Location (optional)"
            placeholderTextColor="#555"
            value={formLocation}
            onChangeText={setFormLocation}
          />

          <Text style={sheetStyles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sheetStyles.categoryRow}>
            {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => {
              const isActive = formCategory === cat;
              const color = CATEGORY_COLORS[cat];
              return (
                <Pressable
                  key={cat}
                  onPress={() => { Haptics.selectionAsync(); setFormCategory(cat); }}
                  style={[
                    sheetStyles.categoryPill,
                    isActive ? { backgroundColor: color } : sheetStyles.categoryPillInactive,
                  ]}
                >
                  <Text style={[sheetStyles.categoryText, isActive ? { color: "#fff" } : sheetStyles.categoryTextInactive]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={handleAddEvent} style={sheetStyles.saveBtn}>
            <Text style={sheetStyles.saveBtnText}>Add Event</Text>
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
  content: { paddingHorizontal: 16, gap: 14 },

  viewToggleRow: { flexDirection: "row", gap: 6, alignSelf: "flex-start" },
  viewTogglePill: { borderRadius: 99, paddingVertical: 7, paddingHorizontal: 18 },
  viewTogglePillActive: { backgroundColor: "#1a1a1a" },
  viewTogglePillInactive: { backgroundColor: "#eceae5" },
  viewToggleText: { fontFamily: FontFamily.inter.semiBold, fontSize: 13 },
  viewToggleTextActive: { color: "#fff" },
  viewToggleTextInactive: { color: "#666" },

  dayViewContainer: { gap: 16 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  arrowBtn: { padding: 8 },
  dayHeaderCenter: { alignItems: "center", flex: 1 },
  dayOfWeek: { fontFamily: FontFamily.inter.semiBold, fontSize: 13, color: "#888", letterSpacing: 0.5 },
  dayNumber: { fontFamily: FontFamily.poppins.black, fontSize: 52, color: "#1a1a1a", letterSpacing: -0.5, lineHeight: 58 },
  dayMonth: { fontFamily: FontFamily.poppins.extraBold, fontSize: 20, color: "#1a1a1a" },
  noEventsBox: { alignItems: "center", paddingVertical: 40 },
  noEventsText: { fontFamily: FontFamily.inter.regular, fontSize: 14, color: "#aaa" },
  eventList: { gap: 10 },

  eventCard: { borderRadius: 22, padding: 16, minHeight: 90, justifyContent: "space-between" },
  eventTime: { fontFamily: FontFamily.inter.bold, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  eventTitle: { fontFamily: FontFamily.poppins.extraBold, fontSize: 18, color: "#fff", flex: 1, marginVertical: 4 },
  eventLocationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventLocation: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "rgba(255,255,255,0.7)" },

  weekContainer: { gap: 8 },
  weekRow: { flexDirection: "row", borderRadius: 18, overflow: "hidden", minHeight: 64, alignItems: "center" },
  weekDayBlock: { width: 56, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  weekDayAbbr: { fontFamily: FontFamily.inter.bold, fontSize: 13, color: "#fff" },
  weekDayNum: { fontFamily: FontFamily.poppins.black, fontSize: 20, color: "#fff", lineHeight: 24 },
  weekAddHint: { marginTop: 2 },
  weekEventChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10 },
  weekChip: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  weekChipText: { fontFamily: FontFamily.inter.bold, fontSize: 10, color: "#fff" },
  weekNoEvents: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "rgba(255,255,255,0.5)" },

  monthContainer: { backgroundColor: "#fff", borderRadius: 22, padding: 16, gap: 12 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { fontFamily: FontFamily.poppins.bold, fontSize: 16, color: "#1a1a1a" },
  monthDayNames: { flexDirection: "row" },
  monthDayNameText: { flex: 1, textAlign: "center", fontFamily: FontFamily.inter.semiBold, fontSize: 11, color: "#aaa" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: `${100 / 7}%` as any, alignItems: "center", paddingVertical: 4, gap: 2 },
  monthDayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  monthDayCircleToday: { backgroundColor: "#1a1a1a" },
  monthDayText: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#1a1a1a" },
  monthDayTextToday: { color: "#fff", fontFamily: FontFamily.inter.bold },
  monthEventDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: "#b8a9f0" },

  fab: { position: "absolute", right: 20 },
  fabInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
});

// ─── Sheet Styles ─────────────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#1a1a1a", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 12 },
  handle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#fff" },
  dateLabel: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888", marginTop: -4 },
  input: { backgroundColor: "#242424", borderRadius: 14, padding: 14, fontFamily: FontFamily.inter.regular, fontSize: 14, color: "#fff" },
  label: { fontFamily: FontFamily.inter.semiBold, fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryPill: { borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  categoryPillInactive: { backgroundColor: "#2a2a2a" },
  categoryText: { fontFamily: FontFamily.inter.semiBold, fontSize: 13 },
  categoryTextInactive: { color: "#666" },
  saveBtn: { backgroundColor: "#b8a9f0", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: FontFamily.poppins.bold, fontSize: 14, color: "#1a1a1a" },
});
