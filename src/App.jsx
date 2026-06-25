import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import StreakCelebration from "./components/StreakCelebration";
import Auth from "./pages/Auth";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./services/supabase";
import { syncToSupabase, loadFromSupabase } from "./services/syncService";
import {
  fetchTodayStepCount,
  persistStepMetrics,
  broadcastStepsSynced,
} from "./services/googleFitSteps";
import "./App.css";

let CapacitorApp = null;
if (Capacitor.isNativePlatform()) {
  import("@capacitor/app").then((m) => { CapacitorApp = m.App; });
}

let GoogleFit = null;
if (Capacitor.isNativePlatform()) {
  import("capacitor-google-fit").then((m) => { GoogleFit = m.GoogleFit; });
}

const isNative = Capacitor.isNativePlatform();

function getTodayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getYesterdayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getWeekdayName(offsetDays = 0) {
  const d = new Date();
  d.setHours(d.getHours() - 5);
  d.setDate(d.getDate() + offsetDays);
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
}

function App() {
  const [activePage, setActivePage] = useState("home");
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth state + load data on login
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await loadFromSupabase();
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) await loadFromSupabase();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync to Supabase every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(syncToSupabase, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Push notifications
  useEffect(() => {
    async function setupNotifications() {
      if (!isNative) return;
      try {
        const { requestNotificationPermission, scheduleWaterReminder } =
          await import("./services/notifications");
        const granted = await requestNotificationPermission();
        if (granted) await scheduleWaterReminder();
      } catch (e) {
        console.log("Notifications not supported:", e);
      }
    }
    if (user) setupNotifications();
  }, [user]);

  // Theme + Google Fit connection
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.body.className = `theme-${theme}`;
    if (!isNative) return;

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

  // Steps refresh on app resume
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
          await syncToSupabase();
        } catch (e) {
          console.error("Steps refresh on resume:", e);
        }
      });
    };
    attach();
    return () => { if (handle) handle.remove(); };
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      if (isNative && GoogleFit) await GoogleFit.connect();
      setIsConnected(true);
    } catch (err) {
      console.error("Connection failed", err);
      alert("Bhai, Google Fit connect nahi ho paya. Console check kar!");
    }
  };

  // Streak & day rollover
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

      const dayName = getWeekdayName(-1);
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
          localStorage.setItem("streakCelebration", JSON.stringify({ streak, date: todayDate }));
        } else {
          streak = 0;
        }
      } else if (lastStreakDate !== todayDate) {
        streak = 0;
      }

      localStorage.setItem("streak", String(streak));
      localStorage.setItem("lastStreakDate", todayDate);
      localStorage.setItem("savedDate", todayDate);
      syncToSupabase();
    }
  }, []);

  if (authLoading) return null;
  if (!user) return <Auth />;

  return (
    <div className="main-wrapper">
      <StreakCelebration />
      {!isConnected && isNative ? (
        <div className="animate" style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          background: "radial-gradient(circle at top right, rgba(48,209,88,0.15), transparent 60%), var(--bg)",
          color: "var(--text)", padding: "24px", textAlign: "center"
        }}>
          <h1 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px" }}>
            Welcome to <span style={{ color: "#30d158" }}>Euexia</span>
          </h1>
          <p style={{ color: "var(--text2)", opacity: 0.78, fontSize: "1.02rem", lineHeight: "1.6", marginBottom: "40px", maxWidth: "300px" }}>
            Connect Google Fit to start tracking your steps.
          </p>
          <button className="primary-btn" onClick={handleConnect} style={{ maxWidth: "300px" }}>
            Connect Google Fit
          </button>
        </div>
      ) : (
        <>
          {activePage === "home" && <Dashboard />}
          {activePage === "profile" && <Profile />}
          {activePage === "settings" && (
            <Settings onThemeChange={(t) => (document.body.className = `theme-${t}`)} />
          )}
          <BottomNav activePage={activePage} setActivePage={setActivePage} />
        </>
      )}
    </div>
  );
}

export default App;