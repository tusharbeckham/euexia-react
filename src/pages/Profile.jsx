import { useState } from "react";
import Toast from "../components/Toast";
import { supabase } from "../services/supabase";

function Profile() {
  const [form, setForm] = useState({
    name: localStorage.getItem("profile_name") || "",
    age: localStorage.getItem("profile_age") || "",
    weight: localStorage.getItem("profile_weight") || "",
    height: localStorage.getItem("profile_height") || "",
  });

  const [showToast, setShowToast] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSave() {
    // Optimistic: save locally + show toast instantly
    localStorage.setItem("profile_name", form.name);
    localStorage.setItem("profile_age", form.age);
    localStorage.setItem("profile_weight", form.weight);
    localStorage.setItem("profile_height", form.height);
    setShowToast(true);

    // Fire Supabase updates in the background (non-blocking)
    Promise.all([
      supabase.auth.updateUser({
        data: {
          profile_name: form.name,
          profile_age: form.age,
          profile_weight: form.weight,
          profile_height: form.height,
        }
      }),
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          return supabase.from("profiles").update({
            display_name: form.name
          }).eq("id", user.id);
        }
      }),
    ]).catch((err) => console.error("Profile sync error:", err));
  }

  return (
    <div className="page animate">
      <Toast
        message="Profile saved successfully!"
        show={showToast}
        onHide={() => setShowToast(false)}
      />

      <p className="card-label">Your Info</p>
      <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "24px" }}>
        Profile
      </h1>

      <div className="card">
        <p className="card-label">Personal Details</p>

        {[
          {
            label: "Name",
            name: "name",
            placeholder: "Your name",
            type: "text",
          },
          {
            label: "Age",
            name: "age",
            placeholder: "Your age",
            type: "number",
          },
          {
            label: "Weight (kg)",
            name: "weight",
            placeholder: "Your weight",
            type: "number",
          },
          {
            label: "Height (cm)",
            name: "height",
            placeholder: "Your height",
            type: "number",
          },
        ].map((field) => (
          <div key={field.name} style={{ marginBottom: "16px" }}>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text2)",
                marginBottom: "6px",
              }}
            >
              {field.label}
            </p>
            <input
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={form[field.name]}
              onChange={handleChange}
              className="input"
            />
          </div>
        ))}

        <button
          className="primary-btn"
          onClick={handleSave}
        >
          Save Profile
        </button>
      </div>
    </div>
  );
}

export default Profile;
