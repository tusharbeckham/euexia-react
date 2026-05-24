import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { GoogleFit } from "capacitor-google-fit";
import { App } from "@capacitor/app"; // In-built core package, no installation needed

function StepCounter() {
  const today = new Date().toISOString().split("T")[0];
  const [steps, setSteps] = useState(0);

  const goal = Number(localStorage.getItem("goal_steps")) || 10000;
  const kms = (steps * 0.000762).toFixed(2);
  const calories = Math.round(steps * 0.04);

  // Saara syncing aur background-resume logic ek hi effect mein
  useEffect(() => {
    const syncSteps = async () => {
      try {
        await GoogleFit.connect();
        const now = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const result = await GoogleFit.getSteps({
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        });

        if (result && result.value !== undefined) {
          setSteps(result.value);
        }
      } catch (err) {
        console.error("Google Fit Sync Error:", err);
      }
    };

    // 1. App open hote hi pehli baar steps fetch karo
    syncSteps();

    // 2. Live tracking ke liye interval (jab app open ho)
    const interval = setInterval(syncSteps, 30000);

    // 3. SMART BACKGROUND JUGAD: Jab user app ko background se foreground mein laaye
    const appStateListener = App.addListener("appStateChange", (state) => {
      if (state.isActive) {
        console.log(
          "App active ho gayi bhai, background steps sync ho rahe hain...",
        );
        syncSteps(); // Background ke saare steps turant load ho jayenge
      }
    });

    // Cleanup functions
    return () => {
      clearInterval(interval);
      appStateListener.then((listener) => listener.remove());
    };
  }, []);

  // LocalStorage update karne ke liye alag effect
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
      <p className="card-label">Steps Today</p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
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
          }}
        />
      </div>
    </div>
  );
}

export default StepCounter;
