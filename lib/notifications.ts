import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications should handle when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn("Notifications handler could not be set (this is expected in Expo Go)");
}

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

// Track focus notification IDs so we only cancel those — never calendar alarms
const _focusNotifIds = new Set<string>();

export async function scheduleFocusDoneNotification(seconds: number, sessionType: string) {
  if (Platform.OS === "web") return null;

  // Cancel only previously scheduled focus notifications
  await cancelAllFocusNotifications();

  const title = sessionType === "Pomodoro" ? "Focus Session Complete!" : "Break Over!";
  const body =
    sessionType === "Pomodoro"
      ? "Great job! Time to take a short break."
      : "Ready to get back to work?";

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    _focusNotifIds.add(id);
    return id;
  } catch (e) {
    console.warn("[notifications] scheduleFocusDoneNotification failed:", e);
    return null;
  }
}

export async function cancelAllFocusNotifications() {
  if (Platform.OS === "web") return;
  // Cancel only the focus notifications we scheduled — leave calendar alarms intact
  const ids = Array.from(_focusNotifIds);
  _focusNotifIds.clear();
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
}
