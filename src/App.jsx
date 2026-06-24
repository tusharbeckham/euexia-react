import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import { scheduleWaterReminder } from "./services/notifications";
import { GoogleFit } from "capacitor-google-fit"; // Import plugin
import {
  fetchTodayStepCount,
  persistStepMetrics,
  broadcastStepsSynced,
} from "./services/googleFitSteps";
import "./App.css";

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function App() {
  const [activePage, setActivePage] = useState("home");
  const [isConnected, setIsConnected] = useState(false); // Connection State

  // 1. Google Fit Connection Check & Theme Setup
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.body.className = `theme-${theme}`;

    // Silent login check
    const checkGoogleConnection = async () => {
      try {
        await GoogleFit.connect();
        setIsConnected(true);
      } catch (e) {
        console.error("Google Fit Connection Error:", e); // Use ho gaya, error gayab!
        setIsConnected(false);
      }
    };
    checkGoogleConnection();
  }, []);

  // Refresh steps from Google Fit when app returns to foreground (WebView was paused / user reopened app).
  useEffect(() => {
    if (!isConnected) return;

    const listenerPromise = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      try {
        const count = await fetchTodayStepCount();
        persistStepMetrics(count);
        broadcastStepsSynced(count);
      } catch (e) {
        console.error("Steps refresh on resume:", e);
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [isConnected]);

  // 2. Handle Connect Button
  const handleConnect = async () => {
    try {
      await GoogleFit.connect();
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
      localStorage.setItem("streak", "1");
      localStorage.setItem("lastStreakDate", todayDate);
      return;
    }

    if (savedDate !== todayDate) {
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        new Date().getDay()
      ];
      const weeklyData = JSON.parse(localStorage.getItem("weeklyData")) || {};
      weeklyData[dayName] = {
        steps: Number(localStorage.getItem("steps")) || 0,
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
        streak = streak + 1;
      } else if (lastStreakDate === todayDate) {
        // already updated
      } else {
        streak = 1;
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
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#121212",
            color: "white",
          }}
        >
          <h1 style={{ color: "#00d2ff" }}>Euexia</h1>
          <p style={{ marginBottom: "20px", opacity: 0.8 }}>
            Track your health with Google Fit
          </p>
          <button
            onClick={handleConnect}
            style={{
              padding: "15px 30px",
              borderRadius: "30px",
              border: "none",
              background: "linear-gradient(45deg, #00d2ff, #3a7bd5)",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Connect My Health Data
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
