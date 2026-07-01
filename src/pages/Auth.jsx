import { useState } from "react";
import { supabase } from "../services/supabase";
import LogoImg from "../assets/hero.png";
import { onLoginSuccess } from "../utils/authBridge";
import { withTimeout } from "../utils/withTimeout";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async () => {
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000,
          { error: { message: "Network timeout — check your connection and try again." } }
        );
        if (error) throw error;
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({ email, password }),
          15000,
          { error: { message: "Network timeout — check your connection and try again." } }
        );
        if (error) throw error;
        await withTimeout(
          supabase.from("profiles").insert({
            id: data.user.id,
            display_name: name,
          }),
          15000,
          undefined
        );
      }
      await withTimeout(onLoginSuccess(), 15000, undefined); // starts step service + saves auth state natively
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      if (window.Capacitor?.isNativePlatform()) {
        // Native Android: show the Google account picker popup (no browser).
        // NOTE: the account-picker call is user-driven native UI, not a network
        // fetch, so it is intentionally NOT wrapped in a timeout — only the
        // Supabase network calls below are (those are what hang on a dead link).
        const { SocialLogin } = await import("@capgo/capacitor-social-login");
        const result = await SocialLogin.login({
          provider: "google",
          options: {},
        });
        if (result?.result?.idToken) {
          const { data: authData, error } = await withTimeout(
            supabase.auth.signInWithIdToken({
              provider: "google",
              token: result.result.idToken,
            }),
            15000,
            { error: { message: "Network timeout — check your connection and try again." } }
          );
          if (error) throw error;

          // Upsert profile row — works for both new signups and returning users
          if (authData?.user) {
            const displayName =
              authData.user.user_metadata?.full_name ||
              authData.user.user_metadata?.name ||
              authData.user.email?.split("@")[0] ||
              "User";
            await withTimeout(
              supabase.from("profiles").upsert({
                id: authData.user.id,
                display_name: displayName,
              }, { onConflict: "id" }),
              15000,
              undefined
            );
          }

          await withTimeout(onLoginSuccess(), 15000, undefined);
        } else {
          throw new Error("Google sign-in was cancelled");
        }
      } else {
        // Web fallback: browser redirect flow
        const { error } = await withTimeout(
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin },
          }),
          15000,
          { error: { message: "Network timeout — check your connection and try again." } }
        );
        if (error) throw error;
      }
    } catch (e) {
      setError(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#000", padding: "32px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      {/* Glow effects */}
      <div style={{
        position: "absolute", top: -80, right: -80, width: 260, height: 260,
        background: "radial-gradient(circle, rgba(48,209,88,0.18) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: -60, left: -60, width: 200, height: 200,
        background: "radial-gradient(circle, rgba(10,132,255,0.12) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      {/* Logo — apna logo aane par sirf yahan image tag lagao */}
      <div style={{ textAlign: "center", marginBottom: 8, zIndex: 1 }}>
        <div style={{
          width: 52, height: 52,
          background: "linear-gradient(135deg, #30d158, #20a040)",
          borderRadius: 16, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 12px",
          boxShadow: "0 0 24px rgba(48,209,88,0.35)",
          overflow: "hidden"
        }}>
          <img 
            src={LogoImg} 
            alt="Euexia Logo" 
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
          Euexia
        </h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
          Your personal health companion
        </p>
      </div>

      {/* Login / Signup tabs */}
      <div style={{
        display: "flex", background: "#111", borderRadius: 12,
        padding: 4, margin: "24px 0 20px", width: "100%", maxWidth: 340, zIndex: 1
      }}>
        {["Login", "Sign Up"].map((tab, i) => (
          <button key={tab} onClick={() => { setIsLogin(i === 0); setError(""); }}
            style={{
              flex: 1, padding: "9px", textAlign: "center", fontSize: 14,
              fontWeight: 600, borderRadius: 9, border: "none", cursor: "pointer",
              background: isLogin === (i === 0) ? "#1c1c1e" : "transparent",
              color: isLogin === (i === 0) ? "#fff" : "#555",
              transition: "all 0.2s"
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ width: "100%", maxWidth: 340, zIndex: 1 }}>
        {!isLogin && (
          <input
            style={inputStyle} placeholder="Your name"
            value={name} onChange={e => setName(e.target.value)}
          />
        )}
        <input
          style={inputStyle} placeholder="Email address" type="email"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input
          style={inputStyle} placeholder="Password" type="password"
          value={password} onChange={e => setPassword(e.target.value)}
        />

        {error && (
          <p style={{ color: "#ff453a", fontSize: 13, textAlign: "center", marginBottom: 10 }}>
            {error}
          </p>
        )}

        <button onClick={handleEmailAuth} disabled={loading} style={{
          width: "100%", padding: 15,
          background: "linear-gradient(135deg, #30d158, #20a040)",
          color: "#fff", fontSize: 16, fontWeight: 700, border: "none",
          borderRadius: 14, cursor: "pointer", marginBottom: 10,
          boxShadow: "0 4px 20px rgba(48,209,88,0.3)", letterSpacing: "0.2px"
        }}>
          {loading ? "Please wait..." : isLogin ? "Login →" : "Create Account →"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 10px" }}>
          <div style={{ flex: 1, height: 1, background: "#222" }} />
          <span style={{ fontSize: 12, color: "#444" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "#222" }} />
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} style={{
          width: "100%", padding: 14, background: "#111", color: "#fff",
          fontSize: 15, fontWeight: 600, border: "1px solid #2a2a2a",
          borderRadius: 14, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 10
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ fontSize: 12, color: "#444", textAlign: "center", marginTop: 20 }}>
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "#111", border: "1px solid #222",
  borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 15,
  marginBottom: 12, outline: "none", fontFamily: "inherit",
};