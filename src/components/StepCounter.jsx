import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";

// StepSensor plugin only works on native Android — guard the registration
// so it never throws when the app runs in a browser (Vercel, dev server).
const isNative = Capacitor.isNativePlatform();
const StepSensor = isNative ? registerPlugin("StepSensor") : null;

function StepCounter() {
  // Day starts at 5:00 AM locally instead of midnight.
  const d = new Date();
  d.setHours(d.getHours() - 5);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${day}`;

  // On web, seed state from localStorage so the UI isn't always 0.
  const cachedSteps =
    localStorage.getItem("steps_date") === today
      ? Number(localStorage.getItem("steps")) || 0
      : 0;

  const [steps, setSteps] = useState(cachedSteps);

  const goal = Number(localStorage.getItem("goal_steps")) || 10000;
  const kms = (steps * 0.000762).toFixed(2);
  const calories = Math.round(steps * 0.04);

  useEffect(() => {
    // Ye function direct phone ke hardware sensor se steps layega
    const fetchNativeSteps = async () => {
      if (!isNative || !StepSensor) return; // No-op in browser
      try {
        const result = await StepSensor.getSteps();
        if (result && result.value !== undefined) {
          setSteps(result.value);
        }
      } catch (err) {
        console.error("Hardware Sensor Error:", err);
      }
    };

    // 1. App load hote hi turant data fetch karo
    fetchNativeSteps();

    // 2. Har 5 second mein background sensor se fresh data screen par laao
    const interval = setInterval(fetchNativeSteps, 5000);

    // 3. Jab user app pe wapas aaye (background se foreground) to turant refresh karo
    //    Isse 5-second stale window eliminate ho jati hai.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNativeSteps();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // LocalStorage update logic
  useEffect(() => {
    localStorage.setItem("steps", steps.toString());
    localStorage.setItem("steps_date", today);
    localStorage.setItem("kms", kms);
    localStorage.setItem("stepCalories", String(calories));
  }, [steps, kms, calories, today]);

  const percent = Math.min((steps / goal) * 100, 100);
  const isGoalDone = steps >= goal;

  return (
    <div className="card">
      <p className="card-label">Steps Today (Native Tracking)</p>

      {/* Big step number + goal */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            color: isGoalDone ? "#30d158" : "var(--text)",
            lineHeight: 1,
          }}
        >
          {steps.toLocaleString()}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}>
          / {goal.toLocaleString()}
        </span>
        {isGoalDone && <Trophy size={24} color="#30d158" />}
      </div>

      {/* Distance + Calories sub-cards — exactly like the screenshot */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div
          style={{
            flex: 1,
            background: "var(--surface2)",
            borderRadius: "12px",
            padding: "10px 14px",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              color: "var(--muted)",
              letterSpacing: "0.08em",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            Distance
          </p>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0a84ff" }}>
            {kms} km
          </span>
        </div>

        <div
          style={{
            flex: 1,
            background: "var(--surface2)",
            borderRadius: "12px",
            padding: "10px 14px",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              color: "var(--muted)",
              letterSpacing: "0.08em",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            Calories
          </p>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ff9f0a" }}>
            {calories} cal
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          background: "var(--surface2)",
          borderRadius: "99px",
          height: "6px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: isGoalDone
              ? "#30d158"
              : "linear-gradient(90deg, #30d158, #00ff88)",
            borderRadius: "99px",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--muted)",
          marginTop: "6px",
          textAlign: "right",
        }}
      >
        {Math.round(percent)}% of daily goal
      </p>
    </div>
  );
}

export default StepCounter;
