import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import { Activity } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { scheduleWaterReminder } from "./services/notifications";
import {
  fetchTodayStepCount,
  persistStepMetrics,
  broadcastStepsSynced,
} from "./services/googleFitSteps";
import "./App.css";

// @capacitor/app's App plugin — only imported & used on native.
// We lazy-import it to avoid crashing in a browser environment.
let CapacitorApp = null;
if (Capacitor.isNativePlatform()) {
  import("@capacitor/app").then((m) => {
    CapacitorApp = m.App;
  });
}

// GoogleFit plugin — native only, lazy-imported so web builds don't fail.
let GoogleFit = null;
if (Capacitor.isNativePlatform()) {
  import("capacitor-google-fit").then((m) => {
    GoogleFit = m.GoogleFit;
  });
}

const isNative = Capacitor.isNativePlatform();

// Day starts at 5:00 AM locally instead of midnight.
function getTodayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 5); // Anything before 5 AM falls into yesterday's bucket
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function App() {
  const [activePage, setActivePage] = useState("home");

  // Show the Connect screen on both web and native.
  const [isConnected, setIsConnected] = useState(false);

  // 1. Google Fit Connection Check & Theme Setup
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.body.className = `theme-${theme}`;

    if (!isNative) return; // Nothing to check in a browser

    const checkGoogleConnection = async () => {
      try {
        if (GoogleFit) {
          await GoogleFit.connect();
          setIsConnected(true);
        }
      } catch (e) {
        console.error("Google Fit Connection Error:", e);
        setIsConnected(false);
      }
    };
    checkGoogleConnection();
  }, []);

  // Refresh steps from Google Fit when app returns to foreground.
  useEffect(() => {
    if (!isConnected || !isNative) return;

    let handle = null;
    const attach = async () => {
      if (!CapacitorApp) return;
      handle = await CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
        if (!isActive) return;
        try {
          const count = await fetchTodayStepCount();
          persistStepMetrics(count);
          broadcastStepsSynced(count);
        } catch (e) {
          console.error("Steps refresh on resume:", e);
        }
      });
    };
    attach();

    return () => {
      if (handle) handle.remove();
    };
  }, [isConnected]);

  // 2. Handle Connect Button
  const handleConnect = async () => {
    try {
      if (isNative && GoogleFit) {
        await GoogleFit.connect();
      }
      setIsConnected(true);
    } catch (err) {
      console.error("Connection failed", err);
      alert("Bhai, Google Fit connect nahi ho paya. Console check kar!");
    }
  };



  // 3. Notifications Setup
  useEffect(() => {
    async function setupNotifications() {
      const notificationsEnabled =
        localStorage.getItem("notifications") === "true";
      if (notificationsEnabled) {
        try {
          await scheduleWaterReminder();
        } catch (e) {
          console.log("Notifications not supported:", e);
        }
      }
    }
    setupNotifications();
  }, []);

  // 4. Streak & LocalStorage Logic (Wahi purana wala)
  useEffect(() => {
    const savedDate = localStorage.getItem("savedDate");
    const todayDate = getTodayISO();

    if (!savedDate) {
      localStorage.setItem("savedDate", todayDate);
      localStorage.setItem("streak", "0");
      localStorage.setItem("lastStreakDate", todayDate);
      return;
    }

    if (savedDate !== todayDate) {
      const yesterdaySteps = Number(localStorage.getItem("steps")) || 0;
      const stepGoal = Number(localStorage.getItem("goal_steps")) || 10000;
      const goalCompleted = yesterdaySteps >= stepGoal;

      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        new Date().getDay()
      ];
      const weeklyData = JSON.parse(localStorage.getItem("weeklyData")) || {};
      weeklyData[dayName] = {
        steps: yesterdaySteps,
        water: Number(localStorage.getItem("water")) || 0,
        calories: Number(localStorage.getItem("stepCalories")) || 0,
        kms: Number(localStorage.getItem("kms")) || 0,
      };
      localStorage.setItem("weeklyData", JSON.stringify(weeklyData));

      localStorage.removeItem("steps");
      localStorage.removeItem("steps_date");
      localStorage.removeItem("water");
      localStorage.removeItem("workouts");
      localStorage.removeItem("totalCalories");
      localStorage.removeItem("kms");
      localStorage.removeItem("stepCalories");

      const lastStreakDate = localStorage.getItem("lastStreakDate");
      const yesterdayDate = getYesterdayISO();
      let streak = Number(localStorage.getItem("streak")) || 0;

      if (lastStreakDate === yesterdayDate) {
        if (goalCompleted) {
          streak = streak + 1;
        } else {
          streak = 0;
        }
      } else if (lastStreakDate === todayDate) {
        // already updated
      } else {
        streak = 0;
      }

      localStorage.setItem("streak", String(streak));
      localStorage.setItem("lastStreakDate", todayDate);
      localStorage.setItem("savedDate", todayDate);
    }
  }, []);

  return (
    <div className="main-wrapper">
      {!isConnected ? (
        // Login / Connect Screen
        <div className="animate" style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "radial-gradient(circle at top right, rgba(48, 209, 88, 0.15), transparent 60%), var(--bg)",
            color: "var(--text)",
            padding: "24px",
            textAlign: "center"
          }}
        >
          <div style={{
            background: 'var(--surface2)',
            padding: '24px',
            borderRadius: '50%',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(48, 209, 88, 0.2)',
            border: '1px solid var(--nav-border)'
          }}>
            <Activity size={48} color="#30d158" />
          </div>

          <h1 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Welcome to <span style={{ color: "#30d158" }}>Euexia</span>
          </h1>
          
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: "1.6", marginBottom: "40px", maxWidth: "300px" }}>
            Your personal health companion. Start tracking your daily steps, water intake, and workouts.
          </p>

          <button className="primary-btn" onClick={handleConnect} style={{ maxWidth: '300px' }}>
            <Activity size={20} /> Start Tracking
          </button>
        </div>
      ) : (
        // Main App Content
        <>
          {activePage === "home" && <Dashboard />}
          {activePage === "profile" && <Profile />}
          {activePage === "settings" && (
            <Settings
              onThemeChange={(t) => (document.body.className = `theme-${t}`)}
            />
          )}
          <BottomNav activePage={activePage} setActivePage={setActivePage} />
        </>
      )}
    </div>
  );
}

export default App;
