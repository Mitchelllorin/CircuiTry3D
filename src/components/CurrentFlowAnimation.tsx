import React from "react";

export default function CurrentFlowAnimation() {
  return (
    <div
      style={{
        width: "100%",
        height: "6px",
        background:
          "linear-gradient(90deg, #00f, #0ff, #00f)",
        backgroundSize: "200% 100%",
        animation: "flow 1.2s linear infinite",
        marginTop: "8px",
        marginBottom: "8px",
        borderRadius: "4px",
      }}
    />
  );
}

