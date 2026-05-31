/**
 * Calendar event store — Zustand persisted to AsyncStorage.
 *
 * Each event can have:
 *  - A 30-min-prior push notification (scheduled via expo-notifications)
 *  - An alarm at event time (also a notification, with a custom sound if picked)
 *
 * Events are stored by their ISO date so they always appear on the
 * correct day regardless of when the app is opened. No seed/demo data.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type EventCategory = "Work" | "Personal" | "Health" | "Social" | "Focus";

export interface CalEvent {
  id: string;
  title: string;
  time: string;           // e.g. "09:30 AM" or "All day"
  location: string;
  category: EventCategory;
  date: string;           // YYYY-MM-DD
  createdAt: number;
  // Alarm / notification fields
  alarmEnabled: boolean;
  alarmSoundUri?: string; // file:// URI picked from device, undefined = default sound
  notifId30min?: string;  // expo-notifications identifier for the 30-min-prior notif
  notifIdAlarm?: string;  // expo-notifications identifier for the on-time alarm
}

export interface CalendarStore {
  events: CalEvent[];
  addEvent: (event: Omit<CalEvent, "id" | "createdAt" | "notifId30min" | "notifIdAlarm">) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "09:30 AM" → { hour: 9, minute: 30 } or null for "All day" */
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr || timeStr === "All day") return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

/** Build a JS Date from YYYY-MM-DD + { hour, minute } */
function buildEventDate(dateISO: string, hour: number, minute: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/**
 * Schedule two notifications for an event:
 *  1. 30 minutes before — "Upcoming: <title>"
 *  2. At event time     — "<title> is starting now" (alarm sound)
 *
 * Returns { notifId30min, notifIdAlarm } — both may be undefined if the
 * time is in the past or the event is "All day".
 */
async function scheduleEventNotifications(
  event: Omit<CalEvent, "id" | "createdAt" | "notifId30min" | "notifIdAlarm">,
): Promise<{ notifId30min?: string; notifIdAlarm?: string }> {
  // Only schedule on native — expo-notifications doesn't work on web
  if (Platform.OS === "web") return {};

  const parsed = parseTime(event.time);
  if (!parsed) return {}; // All day — no alarm

  const eventDate = buildEventDate(event.date, parsed.hour, parsed.minute);
  const now = Date.now();

  // Don't schedule if event is in the past
  if (eventDate.getTime() <= now) return {};

  let notifId30min: string | undefined;
  let notifIdAlarm: string | undefined;

  // ── 30-min reminder ──
  const reminderDate = new Date(eventDate.getTime() - 30 * 60 * 1000);
  if (reminderDate.getTime() > now) {
    notifId30min = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Upcoming: ${event.title}`,
        body: `Starts in 30 minutes${event.location !== "—" ? ` · ${event.location}` : ""}`,
        sound: true,
        data: { eventId: "pending", type: "reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
  }

  // ── On-time alarm ──
  // Use custom sound if provided, otherwise default
  const alarmSound = event.alarmSoundUri
    ? event.alarmSoundUri
    : true; // true = default notification sound

  notifIdAlarm = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${event.title}`,
      body: `Starting now${event.location !== "—" ? ` · ${event.location}` : ""}`,
      sound: alarmSound as any,
      data: { eventId: "pending", type: "alarm" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: eventDate,
    },
  });

  return { notifId30min, notifIdAlarm };
}

/** Cancel scheduled notifications for an event */
async function cancelEventNotifications(event: CalEvent): Promise<void> {
  if (Platform.OS === "web") return;
  if (event.notifId30min) {
    await Notifications.cancelScheduledNotificationAsync(event.notifId30min).catch(() => {});
  }
  if (event.notifIdAlarm) {
    await Notifications.cancelScheduledNotificationAsync(event.notifIdAlarm).catch(() => {});
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: [],

      addEvent: async (event) => {
        // Schedule notifications first so we get the IDs
        const { notifId30min, notifIdAlarm } = await scheduleEventNotifications(event);

        const newEvent: CalEvent = {
          ...event,
          id: Date.now().toString(),
          createdAt: Date.now(),
          notifId30min,
          notifIdAlarm,
        };
        set((s) => ({ events: [newEvent, ...s.events] }));
      },

      deleteEvent: async (id) => {
        const event = get().events.find((e) => e.id === id);
        if (event) await cancelEventNotifications(event);
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      },
    }),
    {
      name: "calendar-events-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ events: s.events }),
    },
  ),
);
