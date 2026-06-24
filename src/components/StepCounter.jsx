import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { registerPlugin } from "@capacitor/core";

// 🚀 Safety check: Check karo ki capacitor environment available hai ya nahi
const isNative = typeof window !== "undefined" && window.capacitor !== undefined;
const StepSensor = isNative ? registerPlugin("StepSensor") : null;

function StepCounter() {
  const today = new Date().toISOString().split("T")[0];
  const [steps, setSteps] = useState(0);

  const goal = Number(localStorage.getItem("goal_steps")) || 10000;
  const kms = (steps * 0.000762).toFixed(2);
  const calories = Math.round(steps * 0.04);

  useEffect(() => {
    const fetchNativeSteps = async () => {
      // Agar native nahi hai (web/vercel), toh sirf log karke return ho jao
      if (!isNative || !StepSensor) {
        console.log("Not on native Android, skipping sensor.");
        return;
      }

      try {
        const result = await StepSensor.getSteps();
        if (result && result.value !== undefined) {
          setSteps(result.value);
        }
      } catch (err) {
        console.error("Hardware Sensor Error:", err);
      }
    };

    fetchNativeSteps();

    // Sirf native environment mein interval chalayein
    let interval;
    if (isNative) {
      interval = setInterval(fetchNativeSteps, 5000);
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNativeSteps();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ... baaki localStorage update logic wahi rahega ...

  return (
    <div className="card">
      <p className="card-label">
         {isNative ? "Steps Today (Native Tracking)" : "Steps Today (Web Mode)"}
      </p>
      
      {/* ... baki UI same rahega ... */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <span style={{ fontSize: "3rem", fontWeight: "800", color: steps >= goal ? "#30d158" : "var(--text)" }}>
          {steps.toLocaleString()}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}> / {goal.toLocaleString()}</span>
      </div>
      {/* ... Progress Bar same ... */}
    </div>
  );
}

export default StepCounter;