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

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

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
  _unsubscribe: (() => void) | null;
  addEvent: (event: Omit<CalEvent, "id" | "createdAt" | "notifId30min" | "notifIdAlarm">) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  subscribeToFirestore: (userId: string) => void;
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
 */
async function scheduleEventNotifications(
  event: Omit<CalEvent, "id" | "createdAt" | "notifId30min" | "notifIdAlarm">,
): Promise<{ notifId30min?: string; notifIdAlarm?: string }> {
  // Only schedule on native — expo-notifications doesn't work on web
  if (Platform.OS === "web") return {};

  const parsed = parseTime(event.time);
  if (!parsed) return {}; // All day — no alarm

  try {
    const eventDate = buildEventDate(event.date, parsed.hour, parsed.minute);
    const now = Date.now();
    if (eventDate.getTime() <= now) return {};

    let notifId30min: string | undefined;
    let notifIdAlarm: string | undefined;

    // reminder 30m before
    const reminderDate = new Date(eventDate.getTime() - 30 * 60 * 1000);
    if (reminderDate.getTime() > now) {
      try {
        notifId30min = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Upcoming: ${event.title}`,
            body: `Starts in 30 minutes`,
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
        });
      } catch {}
    }

    // on-time alarm
    const alarmSound = event.alarmSoundUri ? event.alarmSoundUri : true;
    try {
      notifIdAlarm = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 ${event.title}`,
          body: `Starting now`,
          sound: alarmSound as any,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eventDate },
      });
    } catch {
      // fallback
      notifIdAlarm = await Notifications.scheduleNotificationAsync({
        content: { title: `🔔 ${event.title}`, body: `Starting now`, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eventDate },
      });
    }

    return { notifId30min, notifIdAlarm };
  } catch {
    return {};
  }
}

async function cancelEventNotifications(event: CalEvent): Promise<void> {
  if (Platform.OS === "web") return;
  if (event.notifId30min) await Notifications.cancelScheduledNotificationAsync(event.notifId30min).catch(() => {});
  if (event.notifIdAlarm) await Notifications.cancelScheduledNotificationAsync(event.notifIdAlarm).catch(() => {});
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: [],
      _unsubscribe: null,

      addEvent: async (event) => {
        const { notifId30min, notifIdAlarm } = await scheduleEventNotifications(event);
        const id = Date.now().toString();
        const newEvent: CalEvent = {
          ...event,
          id,
          createdAt: Date.now(),
          notifId30min,
          notifIdAlarm,
        };
        
        set((s) => ({ events: [newEvent, ...s.events] }));

        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "users", uid, "calendarEvents", id), {
            ...newEvent,
            updatedAt: serverTimestamp(),
          });
        }
      },

      deleteEvent: async (id) => {
        const event = get().events.find((e) => e.id === id);
        if (event) await cancelEventNotifications(event);
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));

        const uid = auth.currentUser?.uid;
        if (uid) {
          await deleteDoc(doc(db, "users", uid, "calendarEvents", id));
        }
      },

      subscribeToFirestore: (userId) => {
        get()._unsubscribe?.();
        const unsub = onSnapshot(
          collection(db, "users", userId, "calendarEvents"),
          (snap) => {
            const serverEvents = snap.docs.map(d => d.data() as CalEvent);
            set({ events: serverEvents });
          },
          (error) => console.error("[CalendarStore] sync error:", error)
        );
        set({ _unsubscribe: unsub });
      },
    }),
    {
      name: "calendar-events-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ events: s.events }),
    },
  ),
);
