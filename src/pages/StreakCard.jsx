import { Flame } from "lucide-react";

function StreakCard() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const streakStr = localStorage.getItem("streak");
  const streak = streakStr !== null ? Number(streakStr) : 0;

  return (
    <div className="card">
      <p className="card-label">Current Streak</p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Flame size={36} color="#ff9f0a" />
        <span
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            color: "#ff9f0a",
            lineHeight: 1,
          }}
        >
          {streak}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}>
          {streak === 1 ? "day" : "days"}
        </span>
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}
      >
        {days.map((day, i) => {
          const isActive = i <= todayIndex && i > todayIndex - streak;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: isActive
                    ? "linear-gradient(135deg, #ff9f0a, #cc7a00)"
                    : "var(--surface2)",
                  border: "1px solid",
                  borderColor: isActive ? "#ff9f0a" : "var(--border)",
                  boxShadow: isActive
                    ? "0 0 12px rgba(255,159,10,0.4)"
                    : "none",
                }}
              />
              <span
                style={{
                  fontSize: "0.65rem",
                  color: isActive ? "#ff9f0a" : "var(--muted)",
                }}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StreakCard;
