import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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

type HelpSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type HelpLegendItem = {
  id: string;
  letter: string;
  label: string;
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

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    paragraphs: [
      "Pull out the Component Library, tap a device, then place it directly into the 3D workspace.",
      "Use the Wire Tool to drag intelligent routes between pins?the pathfinder keeps everything tidy.",
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
      "Toggle panels closed when you need the full canvas?only the slim toggles remain visible.",
    ],
    bullets: [
      "Double-tap a component to focus the camera.",
      "Hold Shift while wiring to enable precision snapping.",
    ],
  },
  {
    title: "Build Smarter with W.I.R.E.",
    paragraphs: [
      "Watch wattage, current, resistance, and voltage update in real time as you design.",
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

const WIRE_LEGEND: HelpLegendItem[] = [
  { id: "watts", letter: "W", label: "Wattage" },
  { id: "current", letter: "I", label: "Current" },
  { id: "resistance", letter: "R", label: "Resistance" },
  { id: "voltage", letter: "E", label: "Voltage" },
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
      } catch {
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
      } catch {
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

  const minOffset = 220;
  const maxOffset = viewportHeight ? Math.max(minOffset, Math.round(viewportHeight * 0.65)) : 440;
  const rawOffset = Math.round(bottomPanelHeight) + 40;
  const bottomPanelOffset = isBottomOpen ? Math.min(Math.max(rawOffset, minOffset), maxOffset) : 0;

  const shellStyle: CSSProperties | undefined = bottomPanelOffset
    ? ({ "--bottom-panel-offset": `${bottomPanelOffset}px` } as CSSProperties)
    : undefined;

  const workspaceStyle: CSSProperties | undefined = bottomPanelOffset
    ? { height: `calc(100vh - ${bottomPanelOffset}px)` }
    : undefined;

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled ? "Workspace is still loading" : undefined;

  return (
    <div className={`builder-shell${isBottomOpen ? " bottom-open" : ""}`} style={shellStyle}>
      <div className="builder-logo-header">
        <div className="builder-logo-text" aria-label="CircuiTry3D">
          <span className="builder-logo-circui">Circui</span>
          <span className="builder-logo-try">Try</span>
          <span className="builder-logo-3d">3D</span>
        </div>
      </div>

      <aside className={`builder-panel panel-left ${isLeftOpen ? "open" : ""}`} aria-hidden={!isLeftOpen}>
        <div className="panel-header">
          <span className="panel-title">Component Library</span>
          <p className="panel-subtitle">Tap to add parts directly into the workspace.</p>
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
          <p className="panel-subtitle">Select anything in the scene to inspect it here.</p>
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
        <span className="status-indicator" aria-hidden="true" />
        {isFrameReady ? "Workspace ready?tap and drag to build." : "Loading workspace?"}
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
          }}
        />
      </div>

      <div className="builder-floating-logo" aria-hidden="true">
        <span className="builder-logo-circui">Circui</span>
        <span className="builder-logo-try">Try</span>
        <span className="builder-logo-3d">3D</span>
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
