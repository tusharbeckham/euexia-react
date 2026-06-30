import { Capacitor } from "@capacitor/core";

// LocalNotifications is native-only — guard every call so it's a silent
// no-op when running in a browser (Vercel preview, dev server, etc.).
async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

export async function requestNotificationPermission() {
  const plugin = await getPlugin();
  if (!plugin) return false;
  const result = await plugin.requestPermissions();
  return result.display === "granted";
}

export async function scheduleWaterReminder() {
  const plugin = await getPlugin();
  if (!plugin) return;
  await plugin.schedule({
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
  const plugin = await getPlugin();
  if (!plugin) return;
  await plugin.cancelAll();
}
