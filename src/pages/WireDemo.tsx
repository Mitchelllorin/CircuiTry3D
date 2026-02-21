import React, { useState } from "react";
import { WireDrawer, type WireMode } from "../ui/wire-drawer";
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

const canvasShellStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: "28px",
  padding: "4px",
  background: "linear-gradient(135deg, rgba(0, 255, 196, 0.18), rgba(84, 152, 255, 0.08))",
  boxShadow: "0 32px 64px rgba(3, 12, 32, 0.55)",
  maxWidth: "min(92vw, 720px)",
  margin: "0 auto",
};

const canvasInnerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  borderRadius: "24px",
  background: "linear-gradient(160deg, rgba(8, 20, 44, 0.96), rgba(4, 12, 28, 0.92))",
  border: "1px solid rgba(136, 204, 255, 0.25)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 40px rgba(6, 18, 42, 0.55)",
  padding: "18px",
  backdropFilter: "blur(18px)",
  overflow: "hidden",
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
  const [mode, setMode] = useState<WireMode>("free");

  const handleClear = () => {
    setWires([]);
    setNodes(nodes.filter((n) => n.type === "componentPin"));
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        color: palette.text,
        background: `linear-gradient(135deg, ${palette.navy}, ${palette.navyAlt} 45%, ${palette.navyDeep})`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 20% 15%, rgba(0, 255, 204, 0.16), transparent 55%), radial-gradient(circle at 78% 78%, rgba(88, 168, 255, 0.14), transparent 62%)`,
          pointerEvents: "none",
          opacity: 0.9,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "36px 24px 48px",
          gap: "20px",
        }}
      >
        <h1
          style={{
            margin: 0,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "32px",
            textAlign: "center",
            textShadow: "0 0 24px rgba(0, 255, 180, 0.32)",
          }}
        >
          Wire System Demo
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: "680px",
            textAlign: "center",
            color: palette.muted,
            lineHeight: 1.6,
            textShadow: "0 2px 10px rgba(3, 10, 22, 0.6)",
          }}
        >
          Draw wires between pins by clicking and dragging. Intelligent routing automatically introduces junctions when runs
          intersect. Green nodes indicate component pins, amber nodes reveal junctions, and cyan nodes mark free anchors.
        </p>

        <div style={{ marginTop: "6px" }}>
          <button
            onClick={handleClear}
            style={{
              padding: "12px 28px",
              background: `linear-gradient(135deg, ${palette.green}, ${palette.orange})`,
              color: "#08162f",
              border: "1px solid rgba(0, 255, 136, 0.35)",
              borderRadius: "999px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              boxShadow: "0 20px 46px rgba(255, 136, 0, 0.28)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            Clear Wires
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "18px",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px 20px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(12, 32, 64, 0.86), rgba(6, 18, 42, 0.82))",
            border: "1px solid rgba(136, 204, 255, 0.22)",
            boxShadow: "0 18px 46px rgba(3, 12, 32, 0.45)",
            color: palette.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: palette.green,
                border: "2px solid rgba(232, 246, 255, 0.92)",
                boxShadow: "0 0 18px rgba(0, 255, 136, 0.45)",
              }}
            />
            <span>Component Pin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: palette.orange,
                border: "2px solid rgba(232, 246, 255, 0.92)",
                boxShadow: "0 0 18px rgba(255, 136, 0, 0.45)",
              }}
            />
            <span>Junction</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: palette.cyan,
                border: "2px solid rgba(232, 246, 255, 0.92)",
                boxShadow: "0 0 18px rgba(136, 204, 255, 0.45)",
              }}
            />
            <span>Wire Anchor</span>
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, rgba(12, 32, 64, 0.9), rgba(6, 18, 42, 0.88))",
            border: "1px solid rgba(136, 204, 255, 0.24)",
            padding: "14px 22px",
            borderRadius: "20px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            color: palette.text,
            boxShadow: "0 24px 52px rgba(3, 12, 32, 0.5)",
            backdropFilter: "blur(14px)",
            maxWidth: "min(96vw, 760px)",
          }}
        >
          <span style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: "11px", opacity: 0.78 }}>
            Wiring Modes
          </span>
          {(
            [
              { id: "free", label: "Freeform", blurb: "Sketch direct lines" },
              { id: "schematic", label: "Schematic", blurb: "90-degree corners" },
              { id: "square", label: "Square", blurb: "Outside right angles" },
              { id: "offset", label: "Offset", blurb: "Parallel detours" },
              { id: "star", label: "Star", blurb: "Radial bends" },
              { id: "arc", label: "Arc", blurb: "Smooth sweep" },
              { id: "routing", label: "Routing", blurb: "Auto path" },
            ] satisfies { id: WireMode; label: string; blurb: string }[]
          ).map((option) => {
            const isActive = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  border: `1px solid ${isActive ? "rgba(0, 255, 180, 0.65)" : "rgba(136, 204, 255, 0.35)"}`,
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0, 255, 180, 0.18), rgba(32, 220, 255, 0.15))"
                    : "rgba(8, 24, 48, 0.6)",
                  color: isActive ? palette.green : palette.muted,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: "132px",
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  boxShadow: isActive ? "0 0 24px rgba(0, 255, 200, 0.28)" : "none",
                }}
              >
                <span style={{ fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{option.label}</span>
                <span style={{ fontSize: "11px", opacity: 0.72 }}>{option.blurb}</span>
              </button>
            );
          })}
          <span style={{ fontSize: "12px", opacity: 0.72 }}>
            Tip: Hold <code style={{ fontSize: "11px" }}>Shift</code> while dragging in Schematic, Square, Offset, Star, or Arc mode to flip the bend direction.
          </span>
        </div>

        <div style={canvasShellStyle}>
          <div
            style={{
              position: "absolute",
              inset: "12px",
              borderRadius: "22px",
              background: `radial-gradient(circle at 28% 22%, rgba(0, 255, 196, 0.18), transparent 68%), radial-gradient(circle at 72% 78%, rgba(84, 152, 255, 0.16), transparent 68%)`,
              opacity: 0.82,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div style={canvasInnerStyle}>
            <WireDrawer
              width={600}
              height={600}
              wires={wires}
              nodes={nodes}
              onWiresChange={setWires}
              onNodesChange={setNodes}
              mode={mode}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "22px",
            background: "linear-gradient(145deg, rgba(12, 32, 64, 0.92), rgba(6, 18, 42, 0.88))",
            borderRadius: "22px",
            maxWidth: "640px",
            fontSize: "14px",
            color: palette.muted,
            border: "1px solid rgba(136, 204, 255, 0.22)",
            boxShadow: "0 20px 50px rgba(3, 12, 32, 0.4)",
            backdropFilter: "blur(14px)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: palette.text,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: "15px",
            }}
          >
            Statistics
          </h3>
          <ul style={{ margin: "12px 0 0", paddingLeft: "20px", lineHeight: 1.6 }}>
            <li>Total Wires: {wires.length}</li>
            <li>Total Nodes: {nodes.length}</li>
            <li>Component Pins: {nodes.filter((n) => n.type === "componentPin").length}</li>
            <li>Junctions: {nodes.filter((n) => n.type === "junction").length}</li>
            <li>Wire Anchors: {nodes.filter((n) => n.type === "wireAnchor").length}</li>
            <li>Mode: {mode}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WireSystemDemo;
