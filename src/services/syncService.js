import { supabase } from "./supabase";
import { Capacitor, registerPlugin } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();
const StepSensor = isNative ? registerPlugin("StepSensor") : null;

const today = () => {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export async function syncToSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // On native, always read the live step count from the hardware service
  // (SharedPreferences) — never trust localStorage for steps, it can be stale.
  let liveSteps = Number(localStorage.getItem("steps")) || 0;
  if (isNative && StepSensor) {
    try {
      const result = await StepSensor.getSteps();
      if (result && result.value !== undefined) {
        liveSteps = result.value;
        // Also update localStorage so the rest of the app stays in sync
        localStorage.setItem("steps", String(liveSteps));
        localStorage.setItem("kms", (liveSteps * 0.000762).toFixed(2));
        localStorage.setItem("stepCalories", String(Math.round(liveSteps * 0.04)));
      }
    } catch (e) {
      console.error("syncToSupabase: failed to read native steps:", e);
    }
  }

  const data = {
    user_id: user.id,
    log_date: today(),
    steps: liveSteps,
    water: Number(localStorage.getItem("water")) || 0,
    calories: Number(localStorage.getItem("stepCalories")) || 0,
    kms: Number(localStorage.getItem("kms")) || 0,
    streak: Number(localStorage.getItem("streak")) || 0,
  };

  await supabase.from("daily_logs").upsert(data, {
    onConflict: "user_id,log_date"
  });
}

export async function loadFromSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata || {};
  if (meta.profile_name) localStorage.setItem("profile_name", meta.profile_name);
  if (meta.profile_age) localStorage.setItem("profile_age", meta.profile_age);
  if (meta.profile_weight) localStorage.setItem("profile_weight", meta.profile_weight);
  if (meta.profile_height) localStorage.setItem("profile_height", meta.profile_height);
  if (meta.goal_steps) localStorage.setItem("goal_steps", meta.goal_steps);
  if (meta.goal_water) localStorage.setItem("goal_water", meta.goal_water);
  if (meta.goal_calories) localStorage.setItem("goal_calories", meta.goal_calories);
  if (meta.theme) {
    localStorage.setItem("theme", meta.theme);
    document.body.className = `theme-${meta.theme}`;
  }

  // Also fetch from profiles table so manual updates in Supabase dashboard are respected
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name, goal_steps, goal_water, goal_calories")
    .eq("id", user.id)
    .single();

  if (profileData) {
    if (profileData.display_name) localStorage.setItem("profile_name", profileData.display_name);
    if (profileData.goal_steps) localStorage.setItem("goal_steps", String(profileData.goal_steps));
    if (profileData.goal_water) localStorage.setItem("goal_water", String(profileData.goal_water));
    if (profileData.goal_calories) localStorage.setItem("goal_calories", String(profileData.goal_calories));
  }

  const d = new Date();
  d.setDate(d.getDate() - 7);
  const sevenDaysAgo = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const { data: logs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("log_date", sevenDaysAgo);

  if (logs && logs.length > 0) {
    const weeklyData = {};
    const t = today();
    let todayLog = null;

    logs.forEach(log => {
      if (log.log_date === t) {
        todayLog = log;
      } else {
        const [y, m, dt] = log.log_date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, dt);
        const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dateObj.getDay()];
        weeklyData[dayName] = {
          steps: log.steps || 0,
          water: log.water || 0,
          calories: log.calories || 0,
          kms: log.kms || 0
        };
      }
    });

    localStorage.setItem("weeklyData", JSON.stringify(weeklyData));

    if (todayLog) {
      if (todayLog.water) localStorage.setItem("water", String(todayLog.water));
      if (todayLog.streak) localStorage.setItem("streak", String(todayLog.streak));

      // ── Steps: cloud value must NEVER be allowed to roll the live native
      //    counter backwards. loadFromSupabase() runs on every auth event
      //    (sign-in, periodic token refresh, app resume) — not just once.
      //    A stale or zero `daily_logs.steps` row (e.g. from before the
      //    sensor was working, or simply because the last upload predates
      //    the steps you've taken since) must not stomp the real, currently
      //    higher native count. The only legitimate use case for restoring
      //    from the cloud is a reinstall / fresh login on a new device,
      //    where the native counter genuinely has less data than the cloud.
      //    So: only "catch up" the native counter when the cloud value is
      //    strictly greater than what the device currently has — never set
      //    it to an equal-or-lower value, and never set it to 0.
      if (todayLog.steps) {
        try {
          if (isNative && StepSensor) {
            const native = await StepSensor.getSteps();
            const nativeSteps = native?.value ?? 0;

            if (todayLog.steps > nativeSteps) {
              await StepSensor.setSteps({ value: todayLog.steps });
              localStorage.setItem("steps", String(todayLog.steps));
              localStorage.setItem("kms", (todayLog.steps * 0.000762).toFixed(2));
              localStorage.setItem("stepCalories", String(Math.round(todayLog.steps * 0.04)));
            }
            // else: native count is already >= cloud — leave it alone.
          } else {
            // Web fallback: safe to trust cloud value directly.
            localStorage.setItem("steps", String(todayLog.steps));
            localStorage.setItem("kms", (todayLog.steps * 0.000762).toFixed(2));
            localStorage.setItem("stepCalories", String(Math.round(todayLog.steps * 0.04)));
          }
        } catch (err) {
          console.error("Failed to sync step count back to native:", err);
        }
      }
    }
  }
}

export async function syncWorkouts(workouts) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("workouts")
    .delete()
    .eq("user_id", user.id)
    .eq("log_date", today());

  if (!workouts?.length) return;

  await supabase.from("workouts").insert(
    workouts.map(w => ({ ...w, user_id: user.id, log_date: today() }))
  );
}