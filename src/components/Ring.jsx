function Ring({ percent, color, size = 80, stroke = 8, label, value }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--ring-bg)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "var(--ring-text)",
          }}
        >
          {Math.round(percent)}%
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "var(--text)",
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: "0.6rem",
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

export default Ring;
