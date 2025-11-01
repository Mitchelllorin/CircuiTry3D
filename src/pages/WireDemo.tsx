import React, { useState } from "react";
import { WireDrawer } from "../ui/wire-drawer";
import type { Wire } from "../model/wire";
import type { Node } from "../model/node";
import { createNode } from "../model/node";
import "../styles/junction.css";

const palette = {
  navy: "#0f1b3d",
  navyAlt: "#16213e",
  navyDeep: "#0a1028",
  panel: "rgba(18, 36, 68, 0.82)",
  panelBorder: "rgba(0, 255, 136, 0.2)",
  green: "#00ff88",
  orange: "#ff8800",
  cyan: "#88ccff",
  text: "#e8f6ff",
  muted: "rgba(200, 220, 255, 0.72)",
};

const WireSystemDemo: React.FC = () => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [nodes, setNodes] = useState<Node[]>(() => {
    // Create some component pins for demonstration
    return [
      createNode("componentPin", { x: 100, y: 100 }, "pin1"),
      createNode("componentPin", { x: 300, y: 100 }, "pin2"),
      createNode("componentPin", { x: 100, y: 300 }, "pin3"),
      createNode("componentPin", { x: 300, y: 300 }, "pin4"),
    ];
  });

  const handleClear = () => {
    setWires([]);
    setNodes(nodes.filter((n) => n.type === "componentPin"));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px",
        background: `linear-gradient(135deg, ${palette.navy}, ${palette.navyAlt} 45%, ${palette.navyDeep})`,
        minHeight: "100vh",
        color: palette.text,
        gap: "8px",
      }}
    >
      <h1 style={{ marginBottom: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Wire System Demo</h1>
      <p style={{ marginBottom: "20px", maxWidth: "640px", textAlign: "center", color: palette.muted }}>
        Draw wires between pins by clicking and dragging. Wires automatically create junctions when crossing.
        Green dots are component pins, red dots are junctions, gray dots are free wire anchors.
      </p>
      
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleClear}
          style={{
            padding: "10px 24px",
            background: `linear-gradient(135deg, ${palette.green}, ${palette.orange})`,
            color: "#08162f",
            border: "1px solid rgba(0, 255, 136, 0.25)",
            borderRadius: "999px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 12px 26px rgba(255, 136, 0, 0.25)",
          }}
        >
          Clear Wires
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
          justifyContent: "center",
          color: palette.muted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: palette.green,
            border: "2px solid rgba(232, 246, 255, 0.85)",
          }} />
          <span>Component Pin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: palette.orange,
            border: "2px solid rgba(232, 246, 255, 0.85)",
          }} />
          <span>Junction</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: palette.cyan,
            border: "2px solid rgba(232, 246, 255, 0.85)",
          }} />
          <span>Wire Anchor</span>
        </div>
      </div>

      <div
        style={{
          background: palette.panel,
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 18px 40px rgba(3, 12, 32, 0.45)",
          border: `1px solid ${palette.panelBorder}`,
        }}
      >
        <WireDrawer
          width={600}
          height={600}
          wires={wires}
          nodes={nodes}
          onWiresChange={setWires}
          onNodesChange={setNodes}
        />
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "18px",
          background: palette.panel,
          borderRadius: "16px",
          maxWidth: "640px",
          fontSize: "14px",
          color: palette.muted,
          border: `1px solid ${palette.panelBorder}`,
          boxShadow: "0 18px 40px rgba(3, 12, 32, 0.35)",
        }}
      >
        <h3 style={{ marginTop: 0, color: palette.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>Statistics:</h3>
        <ul style={{ margin: "10px 0", paddingLeft: "20px" }}>
          <li>Total Wires: {wires.length}</li>
          <li>Total Nodes: {nodes.length}</li>
          <li>Component Pins: {nodes.filter((n) => n.type === "componentPin").length}</li>
          <li>Junctions: {nodes.filter((n) => n.type === "junction").length}</li>
          <li>Wire Anchors: {nodes.filter((n) => n.type === "wireAnchor").length}</li>
        </ul>
      </div>
    </div>
  );
};

export default WireSystemDemo;
