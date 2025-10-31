import { useEffect, useState } from "react";
import "../styles/builder-ui.css";

const COMPONENTS = [
  { id: "power", icon: "PS", label: "Power Supply" },
  { id: "resistor", icon: "R", label: "Resistor" },
  { id: "capacitor", icon: "C", label: "Capacitor" },
  { id: "ground", icon: "G", label: "Ground" },
  { id: "inductor", icon: "L", label: "Inductor" },
  { id: "sensor", icon: "S", label: "Sensor" },
];

const TOOL_BUTTONS = [
  { id: "select", label: "Select Tool", description: "Tap components to edit" },
  { id: "draw", label: "Wire Tool", description: "Drag to sketch new connections" },
  { id: "measure", label: "Measure", description: "Check distances and alignment" },
  { id: "simulate", label: "Run Simulation", description: "Preview circuit behaviour" },
];

const PROPERTY_ITEMS = [
  { id: "component", name: "Selected Component", value: "None" },
  { id: "position", name: "Position", value: "-" },
  { id: "rotation", name: "Rotation", value: "-" },
  { id: "metadata", name: "Metadata", value: "Tap any element to inspect" },
];

const WIRE_METRICS = [
  { id: "watts", letter: "W", label: "Watts", value: "0.0" },
  { id: "current", letter: "I", label: "Current", value: "0.00 A" },
  { id: "resistance", letter: "R", label: "Resistance", value: "0.0 Ohm" },
  { id: "voltage", letter: "E", label: "Voltage", value: "0.0 V" },
];

const HELP_SECTIONS = [
  {
    title: "Getting Started",
    paragraphs: [
      "Pull out the Component Library, tap a device, then place it directly into the 3D workspace.",
      "Use the Wire Tool to drag intelligent routes between pins - the pathfinder keeps everything tidy.",
    ],
    bullets: [
      "One-touch buttons add, rotate, duplicate, or delete components.",
      "Use the bottom analysis panel to monitor live circuit health via W.I.R.E.",
    ],
  },
  {
    title: "Workspace Navigation",
    paragraphs: [
      "Orbit with left-click drag, pan with right-click or two fingers, and scroll or pinch to zoom.",
      "Toggle panels closed when you need the full canvas - only the branded toggles remain visible.",
    ],
    bullets: [
      "Double-tap a component to focus the camera.",
      "Hold Shift while wiring to enable precision snapping.",
    ],
  },
  {
    title: "Build Smarter with W.I.R.E.",
    paragraphs: [
      "Watch wattage, current, resistance, and voltage update in real-time as you design.",
      "Hover any metric in the analysis panel to view optimization tips for that value.",
    ],
    bullets: [
      "Green metrics indicate optimal performance.",
      "Orange or red highlights call out potential bottlenecks.",
    ],
  },
  {
    title: "Tips & Shortcuts",
    paragraphs: [
      "Tap the quick actions on the left panel to rotate, mirror, or lock components instantly.",
      "Save favorite setups as templates for fast reuse across projects.",
    ],
    bullets: [
      "Ctrl + S saves to the cloud instantly.",
      "Ctrl + Z reverts the last action; Ctrl + Shift + Z replays it.",
    ],
  },
];

const WIRE_LEGEND = [
  { id: "watts", letter: "W", label: "Wattage" },
  { id: "current", letter: "I", label: "Current" },
  { id: "resistance", letter: "R", label: "Resistance" },
  { id: "voltage", letter: "E", label: "Voltage" },
];

export default function Builder() {
  const [isLeftOpen, setLeftOpen] = useState(true);
  const [isRightOpen, setRightOpen] = useState(false);
  const [isBottomOpen, setBottomOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("builder-body");
    return () => {
      document.body.classList.remove("builder-body");
    };
  }, []);

  return (
    <div className="builder-shell">
      <div className="builder-logo-header">
        <div className="builder-logo-text">CircuiTry3D</div>
      </div>

      <aside className={`builder-panel panel-left ${isLeftOpen ? "open" : ""}`} aria-hidden={!isLeftOpen}>
        <div className="panel-header">
          <span className="panel-title">Component Library</span>
          <p className="panel-subtitle">Drop components into your build with a single tap.</p>
        </div>
        <div className="panel-section">
          <div className="component-grid">
            {COMPONENTS.map((component) => (
              <button key={component.id} type="button" className="component-btn">
                <span className="component-icon" aria-hidden="true">
                  {component.icon}
                </span>
                <span className="component-label">{component.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <p className="section-title">Quick Actions</p>
          <div className="tool-buttons">
            {TOOL_BUTTONS.map((button) => (
              <button key={button.id} type="button" className="tool-btn">
                <span className="tool-label">{button.label}</span>
                <span className="tool-description">{button.description}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <aside className={`builder-panel panel-right ${isRightOpen ? "open" : ""}`} aria-hidden={!isRightOpen}>
        <div className="panel-header">
          <span className="panel-title">Properties</span>
          <p className="panel-subtitle">Select any element in the workspace to edit its values.</p>
        </div>
        <div className="panel-section">
          {PROPERTY_ITEMS.map((item) => (
            <div key={item.id} className="property-item">
              <div className="property-name">{item.name}</div>
              <div className="property-value">{item.value}</div>
            </div>
          ))}
        </div>
      </aside>

      <section className={`builder-panel panel-bottom ${isBottomOpen ? "open" : ""}`} aria-hidden={!isBottomOpen}>
        <div className="panel-header">
          <span className="panel-title">W.I.R.E. Analysis</span>
          <p className="panel-subtitle">Watch core metrics adjust as your circuit evolves.</p>
        </div>
        <div className="panel-section">
          <div className="builder-wire-display">
            <div className="wire-title">Circuit Snapshot</div>
            <div className="wire-grid">
              {WIRE_METRICS.map((metric) => (
                <div key={metric.id} className={`wire-metric ${metric.id}`}>
                  <div className="metric-letter">{metric.letter}</div>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              ))}
            </div>
            <div className="circuit-stats">Tap any metric to learn how W.I.R.E. keeps your build balanced.</div>
            <button type="button" className="builder-help-launch" onClick={() => setHelpOpen(true)}>
              Open Guided Tutorial
            </button>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="builder-panel-toggle toggle-left"
        aria-label="Toggle component library"
        onClick={() => setLeftOpen((prev) => !prev)}
      >
        {isLeftOpen ? "<" : ">"}
      </button>

      <button
        type="button"
        className="builder-panel-toggle toggle-right"
        aria-label="Toggle properties panel"
        onClick={() => setRightOpen((prev) => !prev)}
      >
        {isRightOpen ? ">" : "<"}
      </button>

      <button
        type="button"
        className="builder-panel-toggle toggle-bottom"
        aria-label="Toggle analysis panel"
        onClick={() => setBottomOpen((prev) => !prev)}
      >
        {isBottomOpen ? "v" : "^"}
      </button>

      <div className="builder-status-bar">
        <span className="status-indicator" aria-hidden="true" /> Build Mode Active - W.I.R.E. ready for insights
      </div>

      <div className="builder-workspace">
        <iframe
          className="builder-iframe"
          title="CircuiTry3D Builder"
          src="legacy.html"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <div
        className={`builder-help-modal ${isHelpOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isHelpOpen}
        onClick={() => setHelpOpen(false)}
      >
        <div className="builder-help-content" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close help">
            X
          </button>
          <h2 className="help-title">CircuiTry3D Help Center</h2>
          {HELP_SECTIONS.map((section) => (
            <div key={section.title} className="help-section">
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="wire-legend">
            {WIRE_LEGEND.map((legend) => (
              <div key={legend.id} className={`legend-item ${legend.letter.toLowerCase()}`}>
                <div className="legend-letter">{legend.letter}</div>
                <div className="legend-label">{legend.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
