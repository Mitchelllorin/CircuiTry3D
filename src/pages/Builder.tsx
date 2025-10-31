import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/builder-ui.css";

type LegacyMessage =
  | { type: "builder:add-component"; payload: { componentType: string } }
  | { type: "builder:add-junction" }
  | { type: "builder:set-analysis-open"; payload: { open: boolean } };

type ComponentAction = {
  id: string;
  icon: string;
  label: string;
  action: "component" | "junction";
  legacyType?: "battery" | "resistor" | "led" | "switch";
};

type LibraryItem = ComponentAction & {
  disabled?: boolean;
  hint?: string;
};

type LibrarySection = {
  id: string;
  title: string;
  items: LibraryItem[];
};

const QUICK_COMPONENTS: ComponentAction[] = [
  { id: "battery", icon: "B", label: "Battery", action: "component", legacyType: "battery" },
  { id: "resistor", icon: "R", label: "Resistor", action: "component", legacyType: "resistor" },
  { id: "led", icon: "LED", label: "LED", action: "component", legacyType: "led" },
  { id: "switch", icon: "SW", label: "Switch", action: "component", legacyType: "switch" },
  { id: "junction", icon: "J", label: "Junction", action: "junction" },
];

const COMPONENT_LIBRARY: LibrarySection[] = [
  {
    id: "sources",
    title: "Sources",
    items: [
      { id: "source-dc", icon: "DC", label: "DC Source", action: "component", legacyType: "battery" },
      { id: "source-rail", icon: "VCC", label: "Rail", action: "component", disabled: true, hint: "Soon" },
      { id: "source-ac", icon: "AC", label: "A/C", action: "component", disabled: true, hint: "Soon" },
      { id: "source-pulse", icon: "PW", label: "Pulse", action: "component", disabled: true, hint: "Soon" },
      { id: "source-noise", icon: "NS", label: "Noise", action: "component", disabled: true, hint: "Soon" },
    ],
  },
  {
    id: "linear",
    title: "Linear",
    items: [
      { id: "library-resistor", icon: "R", label: "Resistor", action: "component", legacyType: "resistor" },
      { id: "library-led", icon: "LED", label: "LED", action: "component", legacyType: "led" },
      { id: "library-pot", icon: "POT", label: "Potentiometer", action: "component", disabled: true, hint: "Soon" },
      { id: "library-cap", icon: "C", label: "Capacitor", action: "component", disabled: true, hint: "Soon" },
      { id: "library-ind", icon: "L", label: "Inductor", action: "component", disabled: true, hint: "Soon" },
    ],
  },
  {
    id: "control",
    title: "Control",
    items: [
      { id: "library-switch", icon: "SW", label: "Switch", action: "component", legacyType: "switch" },
      { id: "library-junction", icon: "J", label: "Junction", action: "junction" },
      { id: "library-relay", icon: "RY", label: "Relay", action: "component", disabled: true, hint: "Soon" },
      { id: "library-sensor", icon: "SN", label: "Sensor", action: "component", disabled: true, hint: "Soon" },
    ],
  },
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

type HelpSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: boolean;
};

type HelpLegendItem = {
  id: string;
  letter: string;
  label: string;
  description?: string;
};

type HelpTopic = {
  id: string;
  label: string;
  tagline: string;
  sections: HelpSection[];
  legend?: HelpLegendItem[];
  footer?: string;
};

const WIRE_LEGEND: HelpLegendItem[] = [
  {
    id: "watts",
    letter: "W",
    label: "Watts (Power)",
    description: "Energy per second. P = V * I or I^2 * R.",
  },
  {
    id: "current",
    letter: "I",
    label: "Current (Amps)",
    description: "Flow rate of electrons. I = V / R.",
  },
  {
    id: "resistance",
    letter: "R",
    label: "Resistance (Ohms)",
    description: "Opposition to current. R = V / I.",
  },
  {
    id: "voltage",
    letter: "E",
    label: "Voltage (EMF)",
    description: "Electrical pressure driving the circuit. E = I * R.",
  },
];

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "quick-start",
    label: "Quick Start",
    tagline: "Launch a working circuit and read the results in minutes.",
    sections: [
      {
        title: "Getting started",
        paragraphs: [
          "Drop components from the library or use shortcuts; every action updates W.I.R.E. in real time.",
        ],
        bullets: [
          "Add core parts fast: B (Battery), R (Resistor), L (LED), S (Switch), J (Junction).",
          "Press W or choose the Wire Tool to connect terminals and complete the loop to light up the analysis.",
          "Use quick actions to rotate, duplicate, and align parts without breaking focus.",
        ],
      },
      {
        title: "Visual learning cues",
        paragraphs: [
          "CircuiTry3D keeps the W.I.R.E. palette consistent so you always know what you are reading.",
        ],
        bullets: [
          "Blue = Watts (Power)",
          "Orange = Current (Amps)",
          "Green = Resistance (Ohms)",
          "Red = EMF / Voltage",
          "Switch between Electron Flow and Current Flow or toggle polarity markers from the View controls.",
        ],
      },
      {
        title: "Advanced workspace tools",
        bullets: [
          "Routing styles: Free-form, Manhattan, Perimeter, Simple, and A* for clean connections.",
          "Drop junctions (J) to branch into parallel paths with smart snapping.",
          "Auto-Arrange generates textbook layouts instantly; Layout modes adapt for Free, Square, or Linear circuits.",
          "Reset view, fit to screen, and grid toggles keep navigation under control on any device.",
        ],
      },
      {
        title: "Build smarter",
        bullets: [
          "Double-click a component to focus and edit values; long-press wires to reroute or delete.",
          "Shift + Drag temporarily disables grid snap for micro adjustments.",
          "Hover metrics in the analysis panel for coaching tips as you iterate.",
        ],
      },
    ],
  },
  {
    id: "wire-method",
    label: "W.I.R.E. Method",
    tagline: "Understand the metrics that drive every circuit decision.",
    sections: [
      {
        title: "Read the panel at a glance",
        paragraphs: [
          "The W.I.R.E. mnemonic pairs every value with a color and letter so trends stand out instantly.",
          "Watch the bottom analysis panel while you build; the values update live as connections change.",
        ],
      },
      {
        title: "Learning layers included",
        bullets: [
          "EIR triangle reinforces Ohm's law relationships with interactive triangles.",
          "Power triangle highlights alternative formulas such as W = I^2 * R and W = E^2 / R.",
          "Worksheet mode walks learners through step-by-step calculations with auto-filled values.",
          "Solve mode checks student answers with instant feedback and tolerances.",
          "Practice mode serves guided problems for series, parallel, combination, and switch circuits.",
        ],
      },
    ],
    legend: WIRE_LEGEND,
    footer: "The W.I.R.E. palette keeps beginners oriented while giving pros fast diagnostics.",
  },
  {
    id: "shortcuts",
    label: "Shortcuts & Controls",
    tagline: "Stay in flow with a command set tuned for builders and educators.",
    sections: [
      {
        title: "Component & tool keys",
        bullets: [
          "B = Battery, R = Resistor, L = LED, S = Switch, J = Junction.",
          "W toggles Wire Mode, T toggles Rotate Mode, Space toggles menus, Esc cancels or exits the current mode.",
        ],
      },
      {
        title: "Editing & file management",
        bullets: [
          "Ctrl + Z / Ctrl + Y handle Undo and Redo.",
          "Ctrl + C / Ctrl + V copy and paste selected components.",
          "Delete or Backspace removes selected items.",
          "Ctrl + S / Ctrl + O / Ctrl + N save, load, or start a new circuit.",
        ],
      },
      {
        title: "View and navigation",
        bullets: [
          "H resets the camera, F fits to screen, G toggles the grid.",
          "Left-click drag orbits, right-click drag pans, scroll or pinch zooms.",
          "Double-click provides quick focus and edit; middle-click drag delivers pro-level panning.",
        ],
      },
      {
        title: "Touch gestures",
        bullets: [
          "Tap selects, drag moves components, long-press opens property editing.",
          "Two-finger drag pans the workspace, pinch zooms, rotate gestures orbit the camera.",
          "Long-press wires to edit or delete routing.",
        ],
      },
      {
        title: "Pro tips",
        bullets: [
          "Hold Shift while dragging to disable grid snap temporarily.",
          "Use arrow keys for ultra-fine positioning.",
          "Ctrl + Scroll boosts zoom speed for large layouts.",
          "Follow the quick workflow: B -> R -> W -> connect terminals -> review W.I.R.E.",
        ],
      },
    ],
  },
  {
    id: "about",
    label: "About CircuiTry3D",
    tagline: "A professional 3D circuit lab built for classrooms, makers, and pros.",
    sections: [
      {
        title: "What you get",
        bullets: [
          "Interactive 3D workspace with real-time electrical calculations.",
          "Color-coded W.I.R.E. metrics and smart auto-labeling (B1, R1, LED1, SW1).",
          "Flexible wiring with multiple routing algorithms and intelligent snapping.",
          "Branding overlays and polished layouts for presentation-ready results.",
        ],
      },
      {
        title: "Education-ready tooling",
        bullets: [
          "W.I.R.E., EIR triangle, and Power triangle panels translate math into visuals.",
          "Worksheets, Solve mode, and guided Practice circuits support self-paced learning.",
          "Random problem generator keeps classes engaged with fresh challenges.",
        ],
      },
      {
        title: "Who it empowers",
        bullets: [
          "Students: learn by doing with instant visual feedback and exportable circuits.",
          "Educators: spin up textbook-perfect examples with auto-arranged layouts.",
          "Makers & pros: prototype ideas quickly and share interactive demos.",
        ],
      },
      {
        title: "Technology & platforms",
        bullets: [
          "Built with Three.js, modern JavaScript, HTML5 Canvas, and CSS3.",
          "Graph-based topology detection, multiple routing engines, and persistent local storage.",
          "Optimized for desktop with full keyboard support and touch-friendly controls for tablets and phones.",
        ],
      },
    ],
  },
];

export default function Builder() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingMessages = useRef<LegacyMessage[]>([]);
  const [isFrameReady, setFrameReady] = useState(false);
  const [isLeftOpen, setLeftOpen] = useState(true);
  const [isRightOpen, setRightOpen] = useState(false);
  const [isBottomOpen, setBottomOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [activeHelpTopic, setActiveHelpTopic] = useState(HELP_TOPICS[0].id);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      const { data } = event;
      if (!data || typeof data !== "object") {
        return;
      }

      const { type, payload } = data as { type?: string; payload?: unknown };

      if (type === "legacy:ready") {
        setFrameReady(true);
        return;
      }

      if (type === "legacy:analysis-state" && payload && typeof payload === "object" && "open" in payload) {
        const desired = (payload as { open?: unknown }).open;
        if (typeof desired === "boolean") {
          setBottomOpen(desired);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("builder-body");
    return () => {
      document.body.classList.remove("builder-body");
    };
  }, []);

  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHelpOpen]);

  const sendMessageToLegacy = useCallback(
    (message: LegacyMessage, options: { allowQueue?: boolean } = {}) => {
      const { allowQueue = true } = options;
      const frameWindow = iframeRef.current?.contentWindow;

      if (!frameWindow || !isFrameReady) {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }

      try {
        frameWindow.postMessage(message, "*");
        return true;
      } catch (error) {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }
    },
    [isFrameReady]
  );

  useEffect(() => {
    if (!isFrameReady) {
      return;
    }

    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }

    if (!pendingMessages.current.length) {
      return;
    }

    const queue = [...pendingMessages.current];
    pendingMessages.current = [];

    const failed: LegacyMessage[] = [];
    queue.forEach((message) => {
      try {
        frameWindow.postMessage(message, "*");
      } catch (error) {
        failed.push(message);
      }
    });

    if (failed.length > 0) {
      pendingMessages.current = failed;
    }
  }, [isFrameReady]);

  useEffect(() => {
    sendMessageToLegacy({ type: "builder:set-analysis-open", payload: { open: isBottomOpen } });
  }, [isBottomOpen, sendMessageToLegacy]);

  const handleComponentAction = useCallback(
    (component: LibraryItem) => {
      if (!component || component.disabled) {
        return;
      }

      if (component.action === "junction") {
        sendMessageToLegacy({ type: "builder:add-junction" });
        return;
      }

      if (!component.legacyType) {
        console.warn(`Missing legacy mapping for component '${component.id}'`);
        return;
      }

      sendMessageToLegacy({
        type: "builder:add-component",
        payload: { componentType: component.legacyType },
      });
    },
    [sendMessageToLegacy]
  );

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled ? "Workspace is still loading" : undefined;

  const activeTopic = HELP_TOPICS.find((topic) => topic.id === activeHelpTopic) ?? HELP_TOPICS[0];

  return (
    <div className="builder-shell">
      <header className="builder-app-bar">
        <button
          type="button"
          className="app-icon-button"
          aria-label={`${isLeftOpen ? "Collapse" : "Expand"} component library`}
          onClick={() => setLeftOpen((prev) => !prev)}
          aria-pressed={isLeftOpen}
        >
          <span aria-hidden="true">:::</span>
        </button>
        <div className="builder-brand">
          <span className="brand-title">CircuiTry3D</span>
          <span className="brand-subtitle">Spatial Circuit Builder</span>
        </div>
        <div className="builder-app-actions">
          <span className={`workspace-status ${isFrameReady ? "ready" : "loading"}`}>
            <span className="status-dot" aria-hidden="true" />
            {isFrameReady ? "Workspace ready" : "Warming up workspace"}
          </span>
          <button type="button" className="app-action-button" onClick={() => setHelpOpen(true)}>
            Help
          </button>
          <button
            type="button"
            className="app-action-button"
            onClick={() => setRightOpen((prev) => !prev)}
            aria-pressed={isRightOpen}
          >
            Inspector
          </button>
        </div>
      </header>

      <aside className={`library-drawer ${isLeftOpen ? "open" : ""}`} aria-hidden={!isLeftOpen}>
        <div className="drawer-head">
          <div>
            <p className="drawer-eyebrow">Library</p>
            <h2 className="drawer-title">Drop & go components</h2>
          </div>
          <button type="button" className="drawer-close" aria-label="Collapse component library" onClick={() => setLeftOpen(false)}>
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="drawer-scroll">
          {COMPONENT_LIBRARY.map((section) => (
            <section key={section.id} className="library-section">
              <header className="library-section-header">
                <span>{section.title}</span>
                <span className="library-section-divider" aria-hidden="true" />
              </header>
              <div className="library-grid">
                {section.items.map((item) => {
                  const disabled = controlsDisabled || item.disabled;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="library-item"
                      onClick={() => handleComponentAction(item)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      title={
                        disabled && !controlsDisabled
                          ? item.hint ?? "Coming soon"
                          : controlsDisabled
                          ? controlDisabledTitle
                          : item.label
                      }
                      data-status={item.disabled ? "soon" : item.action}
                    >
                      <span className="library-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="library-label">{item.label}</span>
                      {item.disabled && <span className="library-hint">Soon</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>

      {!isLeftOpen && (
        <button type="button" className="library-handle" aria-label="Open component library" onClick={() => setLeftOpen(true)}>
          Library
        </button>
      )}

      <aside className={`inspector-drawer ${isRightOpen ? "open" : ""}`} aria-hidden={!isRightOpen}>
        <div className="drawer-head">
          <div>
            <p className="drawer-eyebrow">Inspector</p>
            <h2 className="drawer-title">Selection details</h2>
          </div>
          <button type="button" className="drawer-close" aria-label="Collapse inspector" onClick={() => setRightOpen(false)}>
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="inspector-scroll">
          {PROPERTY_ITEMS.map((item) => (
            <div key={item.id} className="inspector-item">
              <span className="inspector-name">{item.name}</span>
              <span className="inspector-value">{item.value}</span>
            </div>
          ))}
        </div>
      </aside>

      {!isRightOpen && (
        <button type="button" className="inspector-handle" aria-label="Open inspector" onClick={() => setRightOpen(true)}>
          Inspector
        </button>
      )}

      <main className="builder-workspace" aria-busy={!isFrameReady}>
        <iframe
          ref={iframeRef}
          className="builder-iframe"
          title="CircuiTry3D Builder"
          src="/legacy.html?embed=builder"
          sandbox="allow-scripts allow-same-origin allow-popups"
          onLoad={() => {
            setFrameReady(true);
            sendMessageToLegacy({ type: "builder:set-analysis-open", payload: { open: isBottomOpen } });
          }}
        />
      </main>

      <div className="floating-stack" aria-hidden={false}>
        <button
          type="button"
          className="floating-button"
          onClick={() => setBottomOpen((prev) => !prev)}
          aria-pressed={isBottomOpen}
          title={isBottomOpen ? "Hide analysis" : "Show analysis"}
        >
          <span aria-hidden="true">{isBottomOpen ? "v" : "^"}</span>
        </button>
        <button
          type="button"
          className="floating-button"
          onClick={() => handleComponentAction({ id: "quick-junction", icon: "J", label: "Junction", action: "junction" })}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          title={controlsDisabled ? controlDisabledTitle : "Drop junction"}
        >
          <span aria-hidden="true">J</span>
        </button>
        <button type="button" className="floating-button" onClick={() => setHelpOpen(true)} title="Help & tutorials">
          <span aria-hidden="true">?</span>
        </button>
      </div>

      <section className={`analysis-sheet ${isBottomOpen ? "open" : ""}`} aria-hidden={!isBottomOpen} aria-expanded={isBottomOpen}>
        <header className="analysis-header">
          <div>
            <p className="drawer-eyebrow">Analysis</p>
            <h2 className="drawer-title">W.I.R.E. snapshot</h2>
          </div>
          <button type="button" className="analysis-close" aria-label="Collapse analysis panel" onClick={() => setBottomOpen(false)}>
            Close
          </button>
        </header>
        <p className="analysis-subtitle">Track watts, current, resistance, and voltage without leaving the workspace.</p>
        <div className="analysis-grid">
          {WIRE_METRICS.map((metric) => (
            <div key={metric.id} className={`analysis-metric ${metric.id}`}>
              <span className="metric-letter">{metric.letter}</span>
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">{metric.value}</span>
            </div>
          ))}
        </div>
        <button type="button" className="analysis-help-link" onClick={() => setHelpOpen(true)}>
          Learn the W.I.R.E. method
        </button>
      </section>

      <button
        type="button"
        className="analysis-handle"
        aria-label={isBottomOpen ? "Hide analysis" : "Show analysis"}
        aria-expanded={isBottomOpen}
        onClick={() => setBottomOpen((prev) => !prev)}
      >
        {isBottomOpen ? "Hide analysis" : "W.I.R.E. analysis"}
      </button>

      <nav className="component-tray" aria-label="Quick components">
        {QUICK_COMPONENTS.map((component) => (
          <button
            key={component.id}
            type="button"
            className="tray-item"
            onClick={() => handleComponentAction(component)}
            disabled={controlsDisabled}
            aria-disabled={controlsDisabled}
            title={controlsDisabled ? controlDisabledTitle : component.label}
          >
            <span className="tray-icon" aria-hidden="true">
              {component.icon}
            </span>
            <span className="tray-label">{component.label}</span>
          </button>
        ))}
      </nav>

      <div
        className={`builder-help-modal ${isHelpOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isHelpOpen}
        aria-labelledby="help-modal-title"
        onClick={() => setHelpOpen(false)}
      >
        <div className="builder-help-content" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close help">
            x
          </button>
          <h2 className="help-title" id="help-modal-title">
            CircuiTry3D Help Center
          </h2>
          <div className="help-tabs" role="tablist" aria-label="Help topics">
            {HELP_TOPICS.map((topic) => {
              const isActive = topic.id === activeHelpTopic;
              return (
                <button
                  key={topic.id}
                  type="button"
                  className={`help-tab ${isActive ? "active" : ""}`}
                  onClick={() => setActiveHelpTopic(topic.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`help-panel-${topic.id}`}
                  id={`help-tab-${topic.id}`}
                  tabIndex={isActive ? 0 : -1}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
          <div
            className="help-topic"
            role="tabpanel"
            id={`help-panel-${activeTopic.id}`}
            aria-labelledby={`help-tab-${activeTopic.id}`}
          >
            <p className="help-tagline">{activeTopic.tagline}</p>
            {activeTopic.sections.map((section) => (
              <div key={section.title} className="help-section">
                <h3>{section.title}</h3>
                {section.paragraphs?.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className={`help-list ${section.ordered ? "ordered" : ""}`}>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {activeTopic.legend && (
              <div className="wire-legend">
                {activeTopic.legend.map((legend) => (
                  <div key={legend.id} className={`legend-item ${legend.letter.toLowerCase()}`}>
                    <div className="legend-letter">{legend.letter}</div>
                    <div className="legend-label">{legend.label}</div>
                    {legend.description && <p className="legend-description">{legend.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {activeTopic.footer && <p className="help-footer">{activeTopic.footer}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
