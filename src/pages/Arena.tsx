import React from "react";
import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#0f172a"
  },
  header: {
    padding: "12px",
    background: "rgba(0,0,0,0.95)",
    borderBottom: "2px solid rgba(0,255,136,0.3)",
    display: "flex",
    gap: "8px"
  },
  backButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#111827",
    color: "#e5e7eb",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px"
  },
  title: {
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    marginLeft: "8px"
  },
  iframe: {
    width: "100%",
    flex: 1,
    border: 0
  }
};

export default function Arena() {
  const navigate = useNavigate();

  const handleBack = () => {
    // Navigate to home page for predictable behavior
    // If user came from another page, they can use browser back
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back
        </button>
        <span style={styles.title}>
          Component Arena
        </span>
      </div>
      <iframe
        title="Component Arena"
        src="/arena.html"
        style={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
