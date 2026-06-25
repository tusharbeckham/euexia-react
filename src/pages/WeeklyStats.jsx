import { useState, useEffect } from "react";
import { X, Footprints, Droplets, Flame, MapPin } from "lucide-react";
import Ring from "../components/Ring";

// Same -5h day boundary used everywhere else in the app (App.jsx, StepCounter).
// Returns the weekday name (Sun..Sat) for "today + offsetDays".
function getWeekdayName(offsetDays = 0) {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  d.setDate(d.getDate() + offsetDays);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function WeeklyStats() {
  const [selectedDay, setSelectedDay] = useState(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // `weeklyData` in localStorage only gets written when a day rolls over
  // (see App.jsx), so today's entry is never in there while the day is
  // still in progress — that's why this card kept showing stale/old numbers
  // for today. Fix: re-read today's live keys (same ones StepCounter /
  // WaterTracker / WorkoutLog write to) and merge them in just for display.
  // The interval + storage listener keep it live without needing a refresh.
  const [, forceRefresh] = useState(0);
  useEffect(() => {
    const sync = () => forceRefresh((n) => n + 1);
    window.addEventListener("storage", sync);
    const id = setInterval(sync, 5000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(id);
    };
  }, []);

  const storedWeeklyData = JSON.parse(localStorage.getItem("weeklyData")) || {};
  const todayName = getWeekdayName();
  const liveToday = {
    steps: Number(localStorage.getItem("steps")) || 0,
    water: Number(localStorage.getItem("water")) || 0,
    calories: Number(localStorage.getItem("stepCalories")) || 0,
    kms: Number(localStorage.getItem("kms")) || 0,
  };
  const weeklyData = { ...storedWeeklyData, [todayName]: liveToday };

  const stepGoal = Number(localStorage.getItem("goal_steps")) || 10000;
  const waterGoal = Number(localStorage.getItem("goal_water")) || 8;
  const calGoal = Number(localStorage.getItem("goal_calories")) || 500;

  const totalSteps = days.reduce(
    (sum, d) => sum + (weeklyData[d]?.steps || 0),
    0,
  );
  const totalWater = days.reduce(
    (sum, d) => sum + (weeklyData[d]?.water || 0),
    0,
  );
  const totalCals = days.reduce(
    (sum, d) => sum + (weeklyData[d]?.calories || 0),
    0,
  );
  const totalKms = days.reduce((sum, d) => sum + (weeklyData[d]?.kms || 0), 0);

  // Same -5h boundary for "which bar is today", consistent with the rest of the app.
  const todayDow = (() => {
    const d = new Date();
    d.setHours(d.getHours() - 5);
    return d.getDay();
  })();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;

  return (
    <>
      <div className="card">
        <p className="card-label">Weekly Summary</p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <Ring
            percent={Math.min((totalSteps / (stepGoal * 7)) * 100, 100)}
            color="#30d158"
            size={75}
            stroke={7}
            label="Steps"
            value={totalSteps.toLocaleString()}
          />
          <Ring
            percent={Math.min(
              (totalKms / (stepGoal * 7 * 0.000762)) * 100,
              100,
            )}
            color="#0a84ff"
            size={75}
            stroke={7}
            label="KMs"
            value={totalKms.toFixed(1) + " km"}
          />
          <Ring
            percent={Math.min((totalWater / (waterGoal * 7)) * 100, 100)}
            color="#5e5ce6"
            size={75}
            stroke={7}
            label="Water"
            value={totalWater + " gl"}
          />
          <Ring
            percent={Math.min((totalCals / (calGoal * 7)) * 100, 100)}
            color="#ff9f0a"
            size={75}
            stroke={7}
            label="Cals"
            value={totalCals + " cal"}
          />
        </div>

        <p className="card-label" style={{ marginBottom: "12px" }}>
          Tap a day for details
        </p>

        <div
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "flex-end",
            height: "70px",
          }}
        >
          {days.map((day, i) => {
            const daySteps = weeklyData[day]?.steps || 0;
            const height = Math.max((daySteps / stepGoal) * 60, 4);
            const isToday = i === todayIndex;
            const hasData = daySteps > 0;

            return (
              <div
                key={day}
                onClick={() => hasData && setSelectedDay(day)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  hasData && setSelectedDay(day);
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  cursor: hasData ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: height + "px",
                    background: isToday
                      ? "#30d158"
                      : hasData
                        ? "#25a244"
                        : "var(--surface2)",
                    borderRadius: "6px",
                    boxShadow: isToday
                      ? "0 0 10px rgba(48,209,88,0.4)"
                      : "none",
                    opacity: hasData || isToday ? 1 : 0.4,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: isToday ? "#30d158" : "var(--muted)",
                  }}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "28px 28px 0 0",
              padding: "28px 20px 48px",
              width: "100%",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: "800",
                  color: "var(--text)",
                }}
              >
                {selectedDay}'s Stats
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                style={{
                  background: "var(--surface2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} color="var(--text)" />
              </button>
            </div>

            {[
              {
                icon: <Footprints size={18} color="#30d158" />,
                label: "Steps",
                value: (weeklyData[selectedDay]?.steps || 0).toLocaleString(),
                color: "#30d158",
              },
              {
                icon: <MapPin size={18} color="#0a84ff" />,
                label: "Distance",
                value: (weeklyData[selectedDay]?.kms || 0).toFixed(2) + " km",
                color: "#0a84ff",
              },
              {
                icon: <Droplets size={18} color="#5e5ce6" />,
                label: "Water",
                value: (weeklyData[selectedDay]?.water || 0) + " glasses",
                color: "#5e5ce6",
              },
              {
                icon: <Flame size={18} color="#ff9f0a" />,
                label: "Calories Burned",
                value: (weeklyData[selectedDay]?.calories || 0) + " cal",
                color: "#ff9f0a",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--surface2)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  marginBottom: "10px",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {item.icon}
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {item.label}
                  </span>
                </div>
                <span
                  style={{
                    color: item.color,
                    fontWeight: "700",
                    fontSize: "1rem",
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default WeeklyStats;