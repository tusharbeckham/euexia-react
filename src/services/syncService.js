import { supabase } from "./supabase";

const today = () => new Date().toISOString().split("T")[0];

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

  const { data } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today())
    .single();

  if (!data) return;

  if (data.steps) localStorage.setItem("steps", String(data.steps));
  if (data.water) localStorage.setItem("water", String(data.water));
  if (data.calories) localStorage.setItem("stepCalories", String(data.calories));
  if (data.kms) localStorage.setItem("kms", String(data.kms));
  if (data.streak) localStorage.setItem("streak", String(data.streak));
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