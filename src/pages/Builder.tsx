import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
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

const COMPONENT_ACTIONS: ComponentAction[] = [
  { id: "battery", icon: "B", label: "Battery", action: "component", legacyType: "battery" },
  { id: "resistor", icon: "R", label: "Resistor", action: "component", legacyType: "resistor" },
  { id: "led", icon: "LED", label: "LED", action: "component", legacyType: "led" },
  { id: "switch", icon: "SW", label: "Switch", action: "component", legacyType: "switch" },
  { id: "junction", icon: "J", label: "Junction", action: "junction" },
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
  const bottomPanelRef = useRef<HTMLElement | null>(null);
  const pendingMessages = useRef<LegacyMessage[]>([]);
  const [isFrameReady, setFrameReady] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 0));
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
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
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
    if (!isBottomOpen) {
      setBottomPanelHeight(0);
      return;
    }

    const panel = bottomPanelRef.current;
    if (!panel) {
      return;
    }

    const measure = () => {
      const rect = panel.getBoundingClientRect();
      setBottomPanelHeight(rect.height);
    };

    measure();

    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(panel);
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", measure);
      }
    };
  }, [isBottomOpen]);

  useEffect(() => {
    sendMessageToLegacy({ type: "builder:set-analysis-open", payload: { open: isBottomOpen } });
  }, [isBottomOpen, sendMessageToLegacy]);

  const handleComponentAction = useCallback(
    (component: ComponentAction) => {
      if (!component) {
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

  const minOffset = 260;
  const maxOffset = viewportHeight ? Math.max(minOffset, Math.round(viewportHeight * 0.7)) : 520;
  const rawOffset = Math.round(bottomPanelHeight) + 48;
  const bottomPanelOffset = isBottomOpen ? Math.min(Math.max(rawOffset, minOffset), maxOffset) : 0;

  const shellStyle: CSSProperties | undefined = bottomPanelOffset
    ? ({ "--bottom-panel-offset": `${bottomPanelOffset}px` } as CSSProperties)
    : undefined;

  const workspaceStyle: CSSProperties | undefined = bottomPanelOffset
    ? { height: `calc(100vh - ${bottomPanelOffset}px)` }
    : undefined;

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled ? "Circuit workspace is still loading?" : undefined;

  const activeTopic = HELP_TOPICS.find((topic) => topic.id === activeHelpTopic) ?? HELP_TOPICS[0];

  return (
    <div className={`builder-shell${isBottomOpen ? " bottom-open" : ""}`} style={shellStyle}>
      <div className="builder-logo-header">
        <div className="builder-logo-content">
          <div className="builder-logo-text">CircuiTry3D</div>
          <nav className="builder-nav" aria-label="Main">
            <Link to="/pricing" className="builder-nav-link">
              Plans &amp; Pricing
            </Link>
          </nav>
        </div>
      </div>

      <aside className={`builder-panel panel-left ${isLeftOpen ? "open" : ""}`} aria-hidden={!isLeftOpen}>
        <div className="panel-header">
          <span className="panel-title">Component Library</span>
          <p className="panel-subtitle">Drop components into your build with a single tap.</p>
        </div>
        <div className="panel-section">
          <div className="component-grid">
            {COMPONENT_ACTIONS.map((component) => (
              <button
                key={component.id}
                type="button"
                className="component-btn"
                onClick={() => handleComponentAction(component)}
                disabled={controlsDisabled}
                aria-disabled={controlsDisabled}
                title={controlsDisabled ? controlDisabledTitle : component.label}
                data-component-action={component.action}
              >
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

      <section
        ref={bottomPanelRef}
        className={`builder-panel panel-bottom ${isBottomOpen ? "open" : ""}`}
        aria-hidden={!isBottomOpen}
        aria-expanded={isBottomOpen}
      >
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
              Open Help & Tutorials
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

      <button
        type="button"
        className="builder-help-fab"
        aria-label="Open help and tutorials"
        title="Open help and tutorials"
        onClick={() => setHelpOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      <div className="builder-status-bar">
        <span className="status-indicator" aria-hidden="true" /> Build Mode Active - W.I.R.E. ready for insights
      </div>

      <div className="builder-workspace" style={workspaceStyle} aria-busy={!isFrameReady}>
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
      </div>

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
            X
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
