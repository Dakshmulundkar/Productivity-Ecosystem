import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications should handle when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

export async function scheduleFocusDoneNotification(seconds: number, sessionType: string) {
  if (Platform.OS === "web") return null;

  // Cancel any existing ones first
  await cancelAllFocusNotifications();

  const title = sessionType === "Pomodoro" ? "Focus Session Complete!" : "Break Over!";
  const body = sessionType === "Pomodoro" ? "Great job! Time to take a short break." : "Ready to get back to work?";

  return await Notifications.scheduleNotificationAsync({
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
}

export async function cancelAllFocusNotifications() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
