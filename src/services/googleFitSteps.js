import { Capacitor } from "@capacitor/core";

// GoogleFit is only available on native Android — dynamic import prevents
// the module from being resolved (and crashing) when running in a browser.
let GoogleFit = null;
if (Capacitor.isNativePlatform()) {
  // eslint-disable-next-line no-undef
  import("capacitor-google-fit").then((m) => {
    GoogleFit = m.GoogleFit;
  });
}

export const STEPS_SYNCED_EVENT = "euexia-steps-synced";

export function readCachedStepsToday() {
  const today = new Date().toISOString().split("T")[0];
  if (localStorage.getItem("steps_date") === today) {
    return Number(localStorage.getItem("steps")) || 0;
  }
  return 0;
}

export async function fetchTodayStepCount() {
  if (!Capacitor.isNativePlatform() || !GoogleFit) {
    // On web, return the localStorage-cached value.
    return readCachedStepsToday();
  }
  await GoogleFit.connect();
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await GoogleFit.getSteps({
    startTime: startOfDay.toISOString(),
    endTime: now.toISOString(),
  });
  return result?.value ?? 0;
}

export function persistStepMetrics(steps) {
  const today = new Date().toISOString().split("T")[0];
  const kms = (steps * 0.000762).toFixed(2);
  const calories = Math.round(steps * 0.04);
  localStorage.setItem("steps", String(steps));
  localStorage.setItem("steps_date", today);
  localStorage.setItem("kms", kms);
  localStorage.setItem("stepCalories", String(calories));
}

export function broadcastStepsSynced(steps) {
  window.dispatchEvent(
    new CustomEvent(STEPS_SYNCED_EVENT, { detail: { steps } }),
  );
}
