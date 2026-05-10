import { LocalNotifications } from "@capacitor/local-notifications";

export async function requestNotificationPermission() {
  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

export async function scheduleWaterReminder() {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1,
        title: "💧 Drink Water!",
        body: "Time to hydrate! Log your water intake.",
        schedule: { every: "hour", count: 1, on: { hour: 9 } },
        sound: null,
        actionTypeId: "",
        extra: null,
      },
      {
        id: 2,
        title: "🏃 Step Goal Reminder",
        body: "Keep moving! Check your steps for today.",
        schedule: { every: "day", on: { hour: 18, minute: 0 } },
        sound: null,
        actionTypeId: "",
        extra: null,
      },
      {
        id: 3,
        title: "🔥 Daily Streak!",
        body: "Don't break your streak! Log your activity.",
        schedule: { every: "day", on: { hour: 20, minute: 0 } },
        sound: null,
        actionTypeId: "",
        extra: null,
      },
    ],
  });
}

export async function cancelAllNotifications() {
  await LocalNotifications.cancelAll();
}
