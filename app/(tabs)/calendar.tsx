import React, { useState, useCallback, useRef, memo } from "react";
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
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ChevronLeft, ChevronRight, MapPin, Plus, Calendar, Clock } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { useCalendarStore, type CalEvent, type EventCategory } from "@/store/useCalendarStore";
import * as DocumentPicker from "expo-document-picker";
import * as Notifications from "expo-notifications";

// Request notification permissions on mount
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "day" | "week" | "month";

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

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/**
 * Convert a time string like "09:30 AM" or "All day" to minutes since midnight.
 * "All day" events sort to the very beginning (0).
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr || timeStr === "All day") return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Sort events chronologically by their time string */
function sortByTime(events: CalEvent[]): CalEvent[] {
  return [...events].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

// ─── Time Picker Wheel ────────────────────────────────────────────────────────

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3; // items visible at once (center = selected)

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}

const WheelColumn = memo(function WheelColumn({
  items, selectedIndex, onSelect, width,
}: WheelColumnProps) {
  const listRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  // Scroll to selected on mount / external change
  const scrollToIndex = useCallback((index: number, animated = true) => {
    listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated });
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    
    // Virtual haptics while scrolling
    if (clamped !== selectedIndex && !isScrolling.current) {
        // We only want to trigger this if it's a new index
    }
  }, [items.length, selectedIndex]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    scrollToIndex(clamped);
    if (clamped !== selectedIndex) {
      Haptics.selectionAsync();
      onSelect(clamped);
    }
    isScrolling.current = false;
  }, [items.length, selectedIndex, onSelect, scrollToIndex]);

  return (
    <View style={[wheelStyles.column, { width }]}>
      {/* Selection highlight */}
      <View style={wheelStyles.selectionBar} pointerEvents="none" />

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onLayout={() => scrollToIndex(selectedIndex, false)}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              style={wheelStyles.item}
              onPress={() => { 
                scrollToIndex(index); 
                onSelect(index); 
                Haptics.selectionAsync(); 
              }}
            >
              <Text style={[
                wheelStyles.itemText,
                isSelected ? wheelStyles.itemTextSelected : wheelStyles.itemTextDim,
              ]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
});

interface TimePickerProps {
  hour: number;       // 0–11 (index into HOURS)
  minute: number;     // 0–59 (index into MINUTES)
  period: number;     // 0=AM, 1=PM
  onHourChange: (i: number) => void;
  onMinuteChange: (i: number) => void;
  onPeriodChange: (i: number) => void;
}

const TimePicker = memo(function TimePicker({
  hour, minute, period, onHourChange, onMinuteChange, onPeriodChange,
}: TimePickerProps) {
  return (
    <View style={wheelStyles.container}>
      <WheelColumn items={HOURS}   selectedIndex={hour}   onSelect={onHourChange}   width={56} />
      <Text style={wheelStyles.colon}>:</Text>
      <WheelColumn items={MINUTES} selectedIndex={minute} onSelect={onMinuteChange} width={56} />
      <WheelColumn items={PERIODS} selectedIndex={period} onSelect={onPeriodChange} width={52} />
    </View>
  );
});

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
  const dayEvents = sortByTime(events.filter((e) => e.date === dateKey));

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
        const dayEvents = sortByTime(events.filter((e) => e.date === dateKey));
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

  // ── Persistent event store — no fake data, survives app restarts ──
  const events   = useCalendarStore((s) => s.events);
  const addEvent = useCalendarStore((s) => s.addEvent);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Add event sheet state
  const [showSheet, setShowSheet] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formHour, setFormHour]     = useState(8);   // index 0–11 → "01"–"12"
  const [formMinute, setFormMinute] = useState(0);   // index 0–59
  const [formPeriod, setFormPeriod] = useState(0);   // 0=AM, 1=PM
  const [formAllDay, setFormAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState<EventCategory>("Work");
  const [formAlarmEnabled, setFormAlarmEnabled] = useState(true);
  const [formAlarmSoundUri, setFormAlarmSoundUri] = useState<string | undefined>(undefined);
  const [formAlarmSoundName, setFormAlarmSoundName] = useState("Default");

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
    setFormTitle("");
    setFormHour(8); setFormMinute(0); setFormPeriod(0); setFormAllDay(false);
    setFormLocation(""); setFormCategory("Work");
    setFormAlarmEnabled(true); setFormAlarmSoundUri(undefined); setFormAlarmSoundName("Default");
    setShowSheet(true);
  }, []);

  // ── Pick alarm sound from device ──
  const handlePickSound = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setFormAlarmSoundUri(asset.uri);
        setFormAlarmSoundName(asset.name ?? "Custom sound");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // User cancelled or picker unavailable
    }
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

  const handleAddEvent = useCallback(async () => {
    if (!formTitle.trim()) {
      Alert.alert("Title required", "Please enter an event title.");
      return;
    }

    // Request notification permission if alarm is enabled
    if (formAlarmEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Notifications disabled",
          "Enable notifications in Settings to receive event reminders.",
          [{ text: "OK" }],
        );
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timeStr = formAllDay
      ? "All day"
      : `${HOURS[formHour]}:${MINUTES[formMinute]} ${PERIODS[formPeriod]}`;

    await addEvent({
      title: formTitle.trim(),
      time: timeStr,
      location: formLocation.trim() || "—",
      category: formCategory,
      date: toISO(selectedDate),
      alarmEnabled: formAlarmEnabled,
      alarmSoundUri: formAlarmEnabled ? formAlarmSoundUri : undefined,
    });
    setShowSheet(false);
  }, [formTitle, formHour, formMinute, formPeriod, formAllDay, formLocation, formCategory,
      selectedDate, formAlarmEnabled, formAlarmSoundUri, addEvent]);

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

          {/* Time picker */}
          <View style={sheetStyles.timeSection}>
            <View style={sheetStyles.timeLabelRow}>
              <Clock size={14} color="#888" />
              <Text style={sheetStyles.label}>TIME</Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setFormAllDay(v => !v); }}
                style={[sheetStyles.allDayPill, formAllDay && sheetStyles.allDayPillActive]}
              >
                <Text style={[sheetStyles.allDayText, formAllDay && sheetStyles.allDayTextActive]}>
                  All day
                </Text>
              </Pressable>
            </View>
            {!formAllDay && (
              <TimePicker
                hour={formHour}
                minute={formMinute}
                period={formPeriod}
                onHourChange={setFormHour}
                onMinuteChange={setFormMinute}
                onPeriodChange={setFormPeriod}
              />
            )}
          </View>

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

          {/* ── Alarm section ── */}
          <View style={sheetStyles.alarmRow}>
            <View style={sheetStyles.alarmLeft}>
              <Text style={sheetStyles.alarmIcon}>🔔</Text>
              <View>
                <Text style={sheetStyles.alarmTitle}>Alarm</Text>
                <Text style={sheetStyles.alarmSub}>
                  {formAlarmEnabled
                    ? formAllDay
                      ? "Reminder at 9:00 AM"
                      : "30 min before + at event time"
                    : "No alarm"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setFormAlarmEnabled(v => !v); }}
              style={[sheetStyles.alarmToggle, formAlarmEnabled && sheetStyles.alarmToggleOn]}
            >
              <Text style={[sheetStyles.alarmToggleText, formAlarmEnabled && sheetStyles.alarmToggleTextOn]}>
                {formAlarmEnabled ? "On" : "Off"}
              </Text>
            </Pressable>
          </View>

          {/* Sound picker — only shown when alarm is on */}
          {formAlarmEnabled && (
            <Pressable onPress={handlePickSound} style={sheetStyles.soundRow}>
              <Text style={sheetStyles.soundLabel}>🎵  Alarm sound</Text>
              <View style={sheetStyles.soundRight}>
                <Text style={sheetStyles.soundName} numberOfLines={1}>{formAlarmSoundName}</Text>
                <Text style={sheetStyles.soundChevron}>›</Text>
              </View>
            </Pressable>
          )}

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
  monthDayNameText: { flex: 1, textAlign: "center", fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#aaa" },
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

  // Time section
  timeSection: { gap: 8 },
  timeLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  allDayPill: {
    marginLeft: "auto",
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
  },
  allDayPillActive: { backgroundColor: "#b8a9f0" },
  allDayText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#666" },
  allDayTextActive: { color: "#1a1a1a" },

  // Alarm section
  alarmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242424",
    borderRadius: 14,
    padding: 14,
  },
  alarmLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  alarmIcon: { fontSize: 20 },
  alarmTitle: { fontFamily: FontFamily.inter.semiBold, fontSize: 14, color: "#fff" },
  alarmSub: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#666", marginTop: 2 },
  alarmToggle: {
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: "#333",
  },
  alarmToggleOn: { backgroundColor: "#b8a9f0" },
  alarmToggleText: { fontFamily: FontFamily.inter.bold, fontSize: 12, color: "#666" },
  alarmToggleTextOn: { color: "#1a1a1a" },

  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#242424",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  soundLabel: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#aaa" },
  soundRight: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, justifyContent: "flex-end" },
  soundName: { fontFamily: FontFamily.inter.semiBold, fontSize: 13, color: "#b8a9f0", maxWidth: 160 },
  soundChevron: { fontSize: 18, color: "#555", lineHeight: 22 },
});

// ─── Wheel Styles ─────────────────────────────────────────────────────────────

const wheelStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242424",
    borderRadius: 16,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: "hidden",
    gap: 0,
  },
  column: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: "hidden",
  },
  selectionBar: {
    position: "absolute",
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(184,169,240,0.12)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(184,169,240,0.25)",
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 22,
  },
  itemTextSelected: {
    color: "#ffffff",
  },
  itemTextDim: {
    color: "#444",
  },
  colon: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 26,
    color: "#fff",
    marginHorizontal: 2,
    marginBottom: 2,
  },
});
