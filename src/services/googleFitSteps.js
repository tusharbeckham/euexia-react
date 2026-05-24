import { GoogleFit } from "capacitor-google-fit";

export const STEPS_SYNCED_EVENT = "euexia-steps-synced";

export function readCachedStepsToday() {
  const today = new Date().toISOString().split("T")[0];
  if (localStorage.getItem("steps_date") === today) {
    return Number(localStorage.getItem("steps")) || 0;
  }
  return 0;
}

export async function fetchTodayStepCount() {
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
