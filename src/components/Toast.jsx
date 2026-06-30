import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

function Toast({ message, show, onHide }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!show) return null;

  return (
    <>
      <style>
        {`
          @keyframes toastIn {
            0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
            70% { transform: translate(-50%, -5px) scale(1.02); }
            100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          }
          @keyframes progressShrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          bottom: "90px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(28, 28, 30, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(48, 209, 88, 0.3)",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 9999,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          animation:
            "toastIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <CheckCircle size={20} color="#30d158" />
        <span
          style={{
            color: "#fff",
            fontSize: "0.95rem",
            fontWeight: "500",
            letterSpacing: "-0.01em",
          }}
        >
          {message}
        </span>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "3px",
            background: "#30d158",
            animation: "progressShrink 2.5s linear forwards",
          }}
        />
      </div>
    </>
  );
}

export default Toast;
