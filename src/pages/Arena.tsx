import React from "react";
import { useNavigate } from "react-router-dom";

export default function Arena() {
  const navigate = useNavigate();

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a" }}>
      <div style={{ 
        padding: "12px", 
        background: "rgba(0,0,0,0.95)", 
        borderBottom: "2px solid rgba(0,255,136,0.3)",
        display: "flex",
        gap: "8px"
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #334155",
            background: "#111827",
            color: "#e5e7eb",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          ← Back
        </button>
        <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", marginLeft: "8px" }}>
          Component Arena
        </span>
      </div>
      <iframe
        title="Component Arena"
        src="/arena.html"
        style={{ width: "100%", flex: 1, border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
