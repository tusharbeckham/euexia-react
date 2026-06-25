import { useState } from "react";
import { Dumbbell, Flame, CheckCircle, Clock, ChevronDown } from "lucide-react";

// `stepBased: true` marks activities where carrying your phone would make
// StepCounter's sensor pick up the same motion as actual steps — meaning its
// calories would double-count with this workout's MET-based calories.
// For everything else (cycling, swimming, weights, sports, yoga, etc.) the
// phone sensor isn't realistically capturing the activity, so no conflict.
const exerciseList = [
  { name: "Running (8 km/h)", met: 8.3, category: "Cardio", stepBased: true },
  { name: "Running (12 km/h)", met: 11.5, category: "Cardio", stepBased: true },
  { name: "Walking (5 km/h)", met: 3.5, category: "Cardio", stepBased: true },
  { name: "Brisk Walk", met: 4.5, category: "Cardio", stepBased: true },
  { name: "Cycling (moderate)", met: 7.5, category: "Cardio", stepBased: false },
  { name: "Cycling (fast)", met: 10.0, category: "Cardio", stepBased: false },
  { name: "Jump Rope", met: 12.3, category: "Cardio", stepBased: true },
  { name: "Swimming", met: 8.0, category: "Cardio", stepBased: false },
  { name: "Rowing", met: 7.0, category: "Cardio", stepBased: false },
  { name: "Stair Climbing", met: 8.0, category: "Cardio", stepBased: true },
  { name: "Elliptical", met: 6.0, category: "Cardio", stepBased: false },
  { name: "Treadmill", met: 8.0, category: "Cardio", stepBased: true },
  { name: "Weight Training", met: 5.0, category: "Strength", stepBased: false },
  { name: "Powerlifting", met: 6.0, category: "Strength", stepBased: false },
  { name: "Bodyweight Training", met: 4.5, category: "Strength", stepBased: false },
  { name: "Kettlebell", met: 8.0, category: "Strength", stepBased: false },
  { name: "CrossFit", met: 10.0, category: "Strength", stepBased: false },
  { name: "HIIT", met: 10.0, category: "HIIT", stepBased: false },
  { name: "Tabata", met: 11.0, category: "HIIT", stepBased: false },
  { name: "Circuit Training", met: 8.0, category: "HIIT", stepBased: false },
  { name: "Football", met: 8.0, category: "Sports", stepBased: false },
  { name: "Basketball", met: 8.0, category: "Sports", stepBased: false },
  { name: "Cricket", met: 5.0, category: "Sports", stepBased: false },
  { name: "Badminton", met: 7.0, category: "Sports", stepBased: false },
  { name: "Tennis", met: 8.0, category: "Sports", stepBased: false },
  { name: "Volleyball", met: 6.0, category: "Sports", stepBased: false },
  { name: "Table Tennis", met: 4.5, category: "Sports", stepBased: false },
  { name: "Yoga", met: 3.0, category: "Mind-Body", stepBased: false },
  { name: "Pilates", met: 3.5, category: "Mind-Body", stepBased: false },
  { name: "Stretching", met: 2.5, category: "Mind-Body", stepBased: false },
  { name: "Meditation", met: 1.5, category: "Mind-Body", stepBased: false },
  { name: "Dancing", met: 5.5, category: "Other", stepBased: false },
  { name: "Martial Arts", met: 10.0, category: "Other", stepBased: false },
  { name: "Boxing", met: 9.0, category: "Other", stepBased: false },
  { name: "Rock Climbing", met: 8.0, category: "Other", stepBased: false },
  { name: "Hiking", met: 6.0, category: "Other", stepBased: true },
  { name: "Zumba", met: 6.5, category: "Other", stepBased: false },
];

function getCalories(exerciseName, durationMins) {
  const weight = Number(localStorage.getItem("profile_weight")) || 70;
  const found = exerciseList.find((e) => e.name === exerciseName);
  const met = found ? found.met : 5.0;
  return Math.round(met * weight * (durationMins / 60));
}

function WorkoutLog() {
  const [workouts, setWorkouts] = useState(
    () => JSON.parse(localStorage.getItem("workouts")) || [],
  );
  const [totalCal, setTotalCal] = useState(
    () => Number(localStorage.getItem("totalCalories")) || 0,
  );
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Whether the phone was carried during this workout. Defaults to the
  // activity's stepBased flag when an exercise is picked (sensible default,
  // zero extra taps for the common case), but the toggle below lets the
  // user correct it — e.g. they went for a run but left the phone at home.
  const [hadPhone, setHadPhone] = useState(false);

  const calGoal = Number(localStorage.getItem("goal_calories")) || 500;
  const isGoalDone = totalCal >= calGoal;
  const percent = Math.min((totalCal / calGoal) * 100, 100);

  const categories = ["All", ...new Set(exerciseList.map((e) => e.category))];
  const filteredExercises =
    selectedCategory === "All"
      ? exerciseList
      : exerciseList.filter((e) => e.category === selectedCategory);

  const selectedExercise = exerciseList.find((e) => e.name === name);
  const isStepBased = selectedExercise?.stepBased || false;
  // Only actually skip the total if it's a step-type activity AND the phone
  // was along for it — that's the only scenario where steps already counted it.
  const willExcludeFromTotal = isStepBased && hadPhone;

  const previewCal =
    name && duration ? getCalories(name, Number(duration)) : null;

  function addWorkout() {
    if (!name) {
      alert("Please select an exercise!");
      return;
    }
    if (Number(duration) < 1 || Number(duration) > 300) {
      alert("Duration must be between 1 and 300 minutes!");
      return;
    }
    const calories = getCalories(name, Number(duration));
    const excludedFromTotal = isStepBased && hadPhone;
    const newWorkouts = [
      ...workouts,
      { name, duration: Number(duration), calories, excludedFromTotal },
    ];
    // Skip adding to the running total when steps already covered this
    // session — the workout still gets logged below either way.
    const newTotal = excludedFromTotal ? totalCal : totalCal + calories;
    setWorkouts(newWorkouts);
    setTotalCal(newTotal);
    localStorage.setItem("workouts", JSON.stringify(newWorkouts));
    localStorage.setItem("totalCalories", newTotal);
    setName("");
    setDuration("");
    setHadPhone(false);
  }

  return (
    <div className="card">
      <p className="card-label">Workout Log</p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "3rem",
            fontWeight: "800",
            color: isGoalDone ? "#ff9f0a" : "var(--text)",
            lineHeight: 1,
          }}
        >
          {totalCal}
        </span>
        <span style={{ fontSize: "1rem", color: "var(--muted)" }}>
          / {calGoal} cal
        </span>
        {isGoalDone && <CheckCircle size={24} color="#ff9f0a" />}
      </div>

      <div
        style={{
          background: "var(--surface2)",
          borderRadius: "99px",
          height: "5px",
          marginBottom: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: percent + "%",
            height: "100%",
            background: isGoalDone
              ? "#ff9f0a"
              : "linear-gradient(90deg, #ff9f0a, #ffcc00)",
            borderRadius: "99px",
            transition: "width 0.6s ease",
            boxShadow: "0 0 8px rgba(255,159,10,0.4)",
          }}
        />
      </div>

      {isGoalDone && (
        <div className="goal-banner orange">
          <Flame size={18} color="#ff9f0a" />
          <span
            style={{ color: "#ff9f0a", fontSize: "0.9rem", fontWeight: "600" }}
          >
            Calorie goal reached!
          </span>
        </div>
      )}

      {/* Exercise Dropdown */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: "100%",
            padding: "13px 16px",
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            borderRadius: "14px",
            color: name ? "var(--text)" : "var(--muted)",
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{name || "Select Exercise"}</span>
          <ChevronDown size={16} color="var(--muted)" />
        </div>

        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              right: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              zIndex: 50,
              maxHeight: "280px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "10px",
                overflowX: "auto",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "99px",
                    border: "none",
                    background:
                      selectedCategory === cat ? "#ff9f0a" : "var(--surface2)",
                    color: selectedCategory === cat ? "#000" : "var(--muted)",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ overflowY: "auto", maxHeight: "200px" }}>
              {filteredExercises.map((ex) => (
                <div
                  key={ex.name}
                  onClick={() => {
                    setName(ex.name);
                    // Sensible default — checked for step-type activities,
                    // unchecked otherwise. User can still flip it below.
                    setHadPhone(ex.stepBased);
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--text)", fontSize: "0.9rem" }}>
                    {ex.name}
                  </span>
                  <span style={{ color: "#ff9f0a", fontSize: "0.75rem" }}>
                    MET {ex.met}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duration */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <input
          type="number"
          placeholder="Duration (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min={1}
          max={300}
          className="input"
          style={{ paddingRight: "44px" }}
        />
        <Clock
          size={16}
          color="var(--muted)"
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </div>

      {/* Phone-carried toggle — only matters for step-type activities,
          since that's the only case where double-counting can happen. */}
      {isStepBased && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface2)",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "10px",
            border: "1px solid var(--border)",
            gap: "12px",
          }}
        >
          <div>
            <span style={{ color: "var(--text)", fontSize: "0.9rem" }}>
              Had your phone with you?
            </span>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.72rem",
                marginTop: "2px",
              }}
            >
              {hadPhone
                ? "Steps already counted this — won't add to total"
                : "Phone wasn't tracking — will add to total"}
            </p>
          </div>
          <div
            onClick={() => setHadPhone(!hadPhone)}
            style={{
              width: "52px",
              height: "30px",
              borderRadius: "999px",
              background: hadPhone ? "#ff9f0a" : "var(--input-border)",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.3s ease",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "3px",
                left: hadPhone ? "26px" : "4px",
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
      )}

      {previewCal && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "#ff9f0a",
            marginBottom: "10px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          ≈ {previewCal} calories will be burned
          {willExcludeFromTotal ? " (already in your step calories)" : ""}
        </p>
      )}
      <button
        className="primary-btn orange"
        onClick={addWorkout}
      >
        <Dumbbell size={18} />
        Log Workout
      </button>
      <div style={{ marginTop: "14px" }}>
        {workouts.map((w, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface2)",
              padding: "12px 16px",
              borderRadius: "14px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <span style={{ color: "var(--text)", fontSize: "0.9rem" }}>
                {w.name}
              </span>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.75rem",
                  marginTop: "2px",
                }}
              >
                {w.duration} mins
                {w.excludedFromTotal ? " · counted via steps" : ""}
              </p>
            </div>
            <span style={{ color: "#ff9f0a", fontWeight: "700" }}>
              {w.calories} cal
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkoutLog;