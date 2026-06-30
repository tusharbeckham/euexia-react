import { useState } from "react";
import { Target, Droplets, Flame, Bell, Moon, Sun, LogOut } from "lucide-react";
import Toast from "../components/Toast";
import { supabase } from "../services/supabase";
import { onLogout } from "../utils/authBridge";

function Settings({ onThemeChange }) {
  const [goals, setGoals] = useState({
    steps: localStorage.getItem("goal_steps") || "10000",
    water: localStorage.getItem("goal_water") || "8",
    calories: localStorage.getItem("goal_calories") || "500",
  });

  const [notifications, setNotifications] = useState(
    localStorage.getItem("notifications") === "true" || false,
  );

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  function handleChange(e) {
    setGoals({ ...goals, [e.target.name]: e.target.value });
  }

  function toggleNotifications() {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem("notifications", newVal.toString());
  }

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    onThemeChange(newTheme);
    
    // Fire Supabase update in the background (non-blocking)
    supabase.auth.updateUser({
      data: { theme: newTheme }
    }).catch((err) => console.error("Theme sync error:", err));
  }

  function handleSave() {
    const steps = Number(goals.steps);
    const water = Number(goals.water);
    const calories = Number(goals.calories);

    if (steps < 1000 || steps > 50000) {
      setToastMsg("Step goal must be 1,000 – 50,000!");
      setShowToast(true);
      return;
    }
    if (water < 1 || water > 20) {
      setToastMsg("Water goal must be 1 – 20 glasses!");
      setShowToast(true);
      return;
    }
    if (calories < 100 || calories > 5000) {
      setToastMsg("Calorie goal must be 100 – 5,000!");
      setShowToast(true);
      return;
    }

    // Optimistic: save locally + show toast instantly
    localStorage.setItem("goal_steps", goals.steps);
    localStorage.setItem("goal_water", goals.water);
    localStorage.setItem("goal_calories", goals.calories);
    setToastMsg("Goals saved successfully!");
    setShowToast(true);

    // Fire Supabase updates in the background (non-blocking)
    Promise.all([
      supabase.auth.updateUser({
        data: {
          goal_steps: goals.steps,
          goal_water: goals.water,
          goal_calories: goals.calories,
        }
      }),
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          return supabase.from("profiles").update({
            goal_steps: Number(goals.steps),
            goal_water: Number(goals.water),
            goal_calories: Number(goals.calories)
          }).eq("id", user.id);
        }
      }),
    ]).catch((err) => console.error("Goals sync error:", err));
  }

  const fields = [
    {
      label: "Step Goal",
      name: "steps",
      icon: <Target size={18} color="#30d158" />,
      min: 1000,
      max: 50000,
      hint: "1,000 – 50,000 steps",
    },
    {
      label: "Water Goal (glasses)",
      name: "water",
      icon: <Droplets size={18} color="#0a84ff" />,
      min: 1,
      max: 20,
      hint: "1 – 20 glasses",
    },
    {
      label: "Calorie Burn Goal",
      name: "calories",
      icon: <Flame size={18} color="#ff9f0a" />,
      min: 100,
      max: 5000,
      hint: "100 – 5,000 calories",
    },
  ];

  return (
    <div className="page animate">
      <Toast
        message={toastMsg}
        show={showToast}
        onHide={() => setShowToast(false)}
      />

      <p className="card-label">Preferences</p>
      <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "28px" }}>
        Settings
      </h1>

      {/* Theme Toggle */}
      <div className="card">
        <p className="card-label">Appearance</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {theme === "dark" ? (
              <Moon size={22} color="#5e5ce6" />
            ) : (
              <Sun size={22} color="#ff9f0a" />
            )}
            <span style={{ fontSize: "1rem", color: "var(--text)" }}>
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </div>

          <div
            onClick={toggleTheme}
            style={{
              width: "52px",
              height: "30px",
              borderRadius: "999px",
              background: theme === "dark" ? "#5e5ce6" : "#ff9f0a",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.3s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "3px",
                left: theme === "dark" ? "4px" : "26px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                transition: "left 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Notifications Toggle */}
      <div className="card">
        <p className="card-label">Notifications</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Bell
              size={22}
              color={notifications ? "#30d158" : "var(--muted)"}
            />
            <span style={{ fontSize: "1rem", color: "var(--text)" }}>
              Daily Reminders
            </span>
          </div>

          <div
            onClick={toggleNotifications}
            style={{
              width: "52px",
              height: "30px",
              borderRadius: "999px",
              background: notifications ? "#30d158" : "var(--input-border)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.3s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "3px",
                left: notifications ? "26px" : "4px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                transition: "left 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Daily Goals */}
      <div className="card">
        <p className="card-label">Daily Goals</p>

        {fields.map((field) => (
          <div key={field.name} style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              {field.icon}
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text2)",
                  margin: 0,
                }}
              >
                {field.label}
              </p>
            </div>

            <input
              type="number"
              name={field.name}
              value={goals[field.name]}
              onChange={handleChange}
              min={field.min}
              max={field.max}
              className="input"
            />

            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginTop: "6px",
              }}
            >
              {field.hint}
            </p>
          </div>
        ))}

        <button
          onClick={handleSave}
          className="input"
          style={{
            background: "linear-gradient(135deg, #0a84ff, #0066cc)",
            color: "#fff",
            fontWeight: "700",
            fontSize: "1.05rem",
            marginTop: "12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Save Goals
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          await onLogout();
        }}
        className="input"
        style={{
          width: "100%",
          background: "rgba(255,59,48,0.12)",
          color: "#ff3b30",
          fontWeight: "700",
          fontSize: "1.05rem",
          marginTop: "16px",
          border: "1px solid rgba(255,59,48,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  );
}

export default Settings;
