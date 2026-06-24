import { useState, useEffect } from "react";
import StepCounter from "../components/StepCounter";
import WaterTracker from "../pages/WaterTracker";
import WorkoutLog from "../pages/WorkoutLog";
import StreakCard from "../pages/StreakCard";
import WeeklyStats from "../pages/WeeklyStats";
import NotificationBanner from "../components/NotificationBanner";
import { Sun, Moon, Sunset, Flame } from "lucide-react";

// ── Total Calories Card ──────────────────────────────────────────────────────
// Combines step-burn calories (stored by StepCounter) and workout calories
// (stored by WorkoutLog) into a single daily total.
function TotalCaloriesCard() {
  const read = () => {
    const step = Number(localStorage.getItem("stepCalories")) || 0;
    const workout = Number(localStorage.getItem("totalCalories")) || 0;
    return { step, workout, total: step + workout };
  };

  const [data, setData] = useState(read);

  useEffect(() => {
    // Re-read whenever any localStorage key the app writes changes.
    const sync = () => setData(read());
    window.addEventListener("storage", sync);
    // Also poll every 5 s so same-tab updates are caught.
    const id = setInterval(sync, 5000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(id);
    };
  }, []);

  const calGoal = Number(localStorage.getItem("goal_calories")) || 500;
  const percent = Math.min((data.total / calGoal) * 100, 100);
  const isGoalDone = data.total >= calGoal;

  return (
    <div className="card">
      <p className="card-label">Total Calories Burned Today</p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
        <span
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            lineHeight: 1,
            color: isGoalDone ? "#ff9f0a" : "var(--text)",
          }}
        >
          {data.total.toLocaleString()}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/ {calGoal} cal</span>
        {isGoalDone && <Flame size={24} color="#ff9f0a" />}
      </div>

      {/* Breakdown sub-cards */}
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
          <p style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase" }}>
            Running
          </p>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#30d158" }}>
            {data.step} cal
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
          <p style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase" }}>
            Workouts
          </p>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ff9f0a" }}>
            {data.workout} cal
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--surface2)", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: isGoalDone
              ? "#ff9f0a"
              : "linear-gradient(90deg, #ff9f0a, #ffcc00)",
            borderRadius: "99px",
            transition: "width 0.6s ease",
            boxShadow: "0 0 8px rgba(255,159,10,0.4)",
          }}
        />
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px", textAlign: "right" }}>
        {Math.round(percent)}% of daily goal
      </p>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const hour = new Date().getHours();
  let greeting = "Good Evening";
  let GreetIcon = Moon;
  let iconColor = "#5e5ce6";

  if (hour < 12) {
    greeting = "Good Morning";
    GreetIcon = Sun;
    iconColor = "#ff9f0a";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
    GreetIcon = Sunset;
    iconColor = "#ff6b6b";
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="page">
      <div style={{ marginBottom: "24px" }}>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.85rem",
            marginBottom: "4px",
          }}
        >
          {today}
        </p>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "var(--text)",
          }}
        >
          {greeting} <GreetIcon size={28} color={iconColor} />
        </h1>
      </div>

      <NotificationBanner />

      <div className="animate">
        <StepCounter />
      </div>
      <div className="animate delay-1">
        <WaterTracker />
      </div>
      <div className="animate delay-2">
        <WorkoutLog />
      </div>
      <div className="animate delay-2">
        <TotalCaloriesCard />
      </div>
      <div className="animate delay-3">
        <StreakCard />
      </div>
      <div className="animate delay-3">
        <WeeklyStats />
      </div>
    </div>
  );
}

export default Dashboard;

