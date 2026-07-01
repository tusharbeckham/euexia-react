import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import StreakCelebration from "./components/StreakCelebration";
import Auth from "./pages/Auth";
import SplashScreen from "./components/SplashScreen";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./services/supabase";
import { syncToSupabase, loadFromSupabase } from "./services/syncService";
import { checkNativeAuth } from "./utils/authBridge";
import { onLoginSuccess } from "./utils/authBridge";
import { withTimeout } from "./utils/withTimeout";
import "./App.css";

let CapacitorApp = null;
if (Capacitor.isNativePlatform()) {
  import("@capacitor/app").then((m) => { CapacitorApp = m.App; });
}

let CapacitorUpdater = null;
if (Capacitor.isNativePlatform()) {
  import("@capgo/capacitor-updater").then((m) => { CapacitorUpdater = m.CapacitorUpdater; });
}

// Initialize native Google Sign-In (must happen before any SocialLogin.login() call)
if (Capacitor.isNativePlatform()) {
  import("@capgo/capacitor-social-login").then(({ SocialLogin }) => {
    SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      },
    });
  });
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  // Splash and auth run in PARALLEL — no more sequential delay.
  // The splash just plays its animation; auth check happens simultaneously.
  const handleSplashDone = () => setSplashDone(true);

  // Auth state + load data on login — starts immediately on mount (parallel with splash)
  useEffect(() => {
    const init = async () => {
      await checkNativeAuth().catch(() => {});
      // getSession() calls fetch() with no timeout. On Android, mobile data can
      // report "connected" while having no real internet (dead APN / exhausted
      // data pack) — the fetch then hangs forever and setAuthLoading(false)
      // below would never run, freezing the loading spinner. Cap it at 7s and
      // fall back to a null session so the app always reaches Auth/Dashboard.
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        7000,
        { data: { session: null } }
      );
      setUser(session?.user ?? null);
      if (session?.user) {
        // These make their own unguarded network calls (loadFromSupabase ->
        // supabase.auth.getUser() -> fetch()). A dead network makes them hang
        // rather than reject, so a plain .catch() can't recover — they must be
        // timed out too, otherwise setAuthLoading(false) is never reached for a
        // returning user whose stored token is still valid (getSession returns
        // instantly from storage, no refresh, so the getSession timeout above
        // never fires). withTimeout guards the hang; .catch() swallows any
        // rejection so neither can block the two lines below.
        await withTimeout(loadFromSupabase(), 7000).catch(() => {});
        await withTimeout(onLoginSuccess(), 7000).catch(() => {}); // Ensure native layer knows we are logged in to start the step service
      }
      setAuthLoading(false);
      if (CapacitorUpdater) {
        CapacitorUpdater.notifyAppReady();
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadFromSupabase();
        if (_event === "SIGNED_IN") await onLoginSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync to Supabase every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(syncToSupabase, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Push notifications — schedule only once. Re-scheduling on every launch
  // resets the clock-time slots (id 2 @ 6PM, id 3 @ 8PM) via Capacitor's
  // LocalNotifications.schedule(), which can push "today's" reminder to
  // tomorrow if the app is relaunched after that hour has already passed.
  useEffect(() => {
    async function setupNotifications() {
      if (!isNative) return;
      try {
        const { requestNotificationPermission, scheduleWaterReminder } =
          await import("./services/notifications");

        const granted = await requestNotificationPermission();
        if (!granted) {
          localStorage.removeItem("notificationsScheduledAt");
          return;
        }

        const lastScheduled = localStorage.getItem("notificationsScheduledAt");

        // Already scheduled — Capacitor's "every: day"
        // schedules persist on their own, no need to touch them again.
        if (lastScheduled) return;

        await scheduleWaterReminder();
        localStorage.setItem("notificationsScheduledAt", new Date().toISOString().slice(0, 10));
      } catch (e) {
        console.log("Notifications not supported:", e);
      }
    }
    if (user) setupNotifications();
  }, [user]);

  // Theme init
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.body.className = `theme-${theme}`;
  }, []);




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

  // Show splash first always
  if (!splashDone) return <SplashScreen onDone={handleSplashDone} />;

  // Instead of returning null (black screen), show a loading indicator
  // that matches the splash aesthetic while auth resolves
  if (authLoading) return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998,
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid rgba(48, 209, 88, 0.15)',
        borderTopColor: '#30d158',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Auth />;

  return (
    <div className="main-wrapper">
      <StreakCelebration />
      {activePage === "home" && <Dashboard />}
      {activePage === "profile" && <Profile />}
      {activePage === "settings" && (
        <Settings onThemeChange={(t) => (document.body.className = `theme-${t}`)} />
      )}
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

export default App;