import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

// Shows a full-screen fire celebration the moment App.jsx's rollover logic
// detects the streak went up (see "streakCelebration" key in App.jsx).
// Reads + immediately deletes that key, so even if the user force-closes
// and reopens the app five times today, it only plays once — exactly when
// the streak was actually built.
function StreakCelebration() {
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("streakCelebration");
      if (!raw) return;
      localStorage.removeItem("streakCelebration"); // consume immediately
      const data = JSON.parse(raw);
      if (data && data.streak > 0) {
        setCelebration(data);
      }
    } catch (e) {
      console.error("Streak celebration read error:", e);
    }
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 3800);
    return () => clearTimeout(t);
  }, [celebration]);

  if (!celebration) return null;

  const embers = Array.from({ length: 10 });

  return (
    <div
      onClick={() => setCelebration(null)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        animation: "streakFadeIn 0.3s ease",
        cursor: "pointer",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "160px",
          height: "160px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {embers.map((_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              bottom: "32%",
              left: `${12 + i * 8}%`,
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: i % 2 === 0 ? "#ff9f0a" : "#ffcc00",
              opacity: 0,
              animation: `emberRise ${1.6 + (i % 4) * 0.3}s ease-in ${
                i * 0.15
              }s infinite`,
            }}
          />
        ))}

        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,159,10,0.35), transparent 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "flameGlow 1.1s ease-in-out infinite",
          }}
        >
          <Flame
            size={64}
            color="#ff9f0a"
            fill="#ff9f0a"
            style={{ animation: "flameFlicker 0.9s ease-in-out infinite" }}
          />
        </div>
      </div>

      <h2
        style={{
          color: "#fff",
          fontSize: "1.8rem",
          fontWeight: "800",
          marginTop: "20px",
          letterSpacing: "-0.3px",
        }}
      >
        Day {celebration.streak} Streak!
      </h2>
      <p
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: "0.95rem",
          marginTop: "6px",
          maxWidth: "260px",
        }}
      >
        {celebration.streak === 1
          ? "You started your streak — keep it going!"
          : "You're on fire — keep it going!"}
      </p>
    </div>
  );
}

export default StreakCelebration;