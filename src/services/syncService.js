import { supabase } from "./supabase";

const today = () => {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export async function syncToSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const data = {
    user_id: user.id,
    log_date: today(),
    steps: Number(localStorage.getItem("steps")) || 0,
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
      if (todayLog.steps) localStorage.setItem("steps", String(todayLog.steps));
      if (todayLog.water) localStorage.setItem("water", String(todayLog.water));
      if (todayLog.calories) localStorage.setItem("stepCalories", String(todayLog.calories));
      if (todayLog.kms) localStorage.setItem("kms", String(todayLog.kms));
      if (todayLog.streak) localStorage.setItem("streak", String(todayLog.streak));

      // Re-initialize the native background counter so it doesn't zero out today's count
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const StepSensor = registerPlugin("StepSensor");
          if (StepSensor && StepSensor.setSteps) {
            await StepSensor.setSteps({ value: todayLog.steps || 0 });
          }
        }
      } catch (err) {
        console.error("Failed to sync step count back to native:", err);
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