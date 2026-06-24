import { useState } from "react";
import { CheckCircle, Droplets } from "lucide-react";

function WaterTracker() {
  const [water, setWater] = useState(
    () => Number(localStorage.getItem("water")) || 0,
  );
  const goal = Number(localStorage.getItem("goal_water")) || 8;

  function addGlass() {
    if (water < goal) {
      const newWater = water + 1;
      setWater(newWater);
      localStorage.setItem("water", newWater);
    }
  }

  const isGoalDone = water >= goal;

  return (
    <div className="card">
      <p className="card-label">Water Intake</p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            color: isGoalDone ? "#0a84ff" : "var(--text)",
            lineHeight: 1,
          }}
        >
          {water}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}>
          / {goal} glasses
        </span>
        {isGoalDone && <CheckCircle size={24} color="#0a84ff" />}
      </div>

      {isGoalDone && (
        <div className="goal-banner blue">
          <Droplets size={18} color="#0a84ff" />
          <span
            style={{ color: "#0a84ff", fontSize: "0.9rem", fontWeight: "600" }}
          >
            Water goal reached!
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {Array.from({ length: goal }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "6px",
              borderRadius: "99px",
              background: i < water ? "#0a84ff" : "var(--surface2)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      <button
        className="primary-btn blue"
        onClick={addGlass}
      >
        <Droplets size={18} />
        Add Glass
      </button>
    </div>
  );
}

export default WaterTracker;
