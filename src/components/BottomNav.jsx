import { Home, User, Settings } from "lucide-react";
import React from "react"; // ← Yeh add karo

function BottomNav({ activePage, setActivePage }) {
  const tabs = [
    { id: "home", label: "Home", Icon: Home },
    { id: "profile", label: "Profile", Icon: User },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  return (
    <nav>
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={activePage === id ? "active" : ""}
          onClick={() => setActivePage(id)}
        >
          {/* Yeh line error fix karti hai */}
          {React.createElement(Icon, { size: 22 })}
          {label}
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
