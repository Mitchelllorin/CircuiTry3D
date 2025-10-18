import React from "react";

const GITHUB_REPO = "https://github.com/Mitchelllorin/CircuiTry3D";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        color: "#fff",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 720 }}>
        <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 8 }}>
          <span style={{ color: "#88ccff" }}>Circui</span>
          <span style={{ color: "#ffbb55" }}>Try</span>
          <span style={{ color: "#00ff88" }}>3D</span>
        </div>
        <div style={{ opacity: 0.8, marginBottom: 24 }}>Professional Circuit Design • Mobile-first • Three.js</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            style={btnStyle("#111827", "#ffffff", "#374151")}
          >
            View on GitHub
          </a>
          <a href="/app" style={btnStyle("#10b981", "#111827")}>Launch App</a>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 9999,
    background: bg,
    color,
    border: border ? `1px solid ${border}` : undefined,
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  };
}
