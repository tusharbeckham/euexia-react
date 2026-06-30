import { Sunrise, Droplets, Dumbbell, Heart } from "lucide-react";

function NotificationBanner() {
  const hour = new Date().getHours();
  let message = "Stay consistent today!";
  let Icon = Heart;
  let color = "#30d158";

  if (hour >= 6 && hour < 12) {
    message = "Morning! Start logging your steps!";
    Icon = Sunrise;
    color = "#ff9f0a";
  } else if (hour >= 12 && hour < 14) {
    message = "Lunch time! Drink some water!";
    Icon = Droplets;
    color = "#0a84ff";
  } else if (hour >= 17 && hour < 20) {
    message = "Evening workout time!";
    Icon = Dumbbell;
    color = "#ff6b6b";
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "16px",
        padding: "14px 16px",
        marginBottom: "12px",
        borderLeft: `4px solid ${color}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.9rem",
        fontWeight: "500",
        color: "var(--text)",
        border: "1px solid var(--border)",
      }}
    >
      <Icon size={20} color={color} />
      <span>{message}</span>
    </div>
  );
}

export default NotificationBanner;
