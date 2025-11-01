import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import "../styles/builder-ui.css";

type BuilderInvokeAction =
  | "toggle-wire-mode"
  | "toggle-rotate-mode"
  | "add-junction"
  | "auto-arrange"
  | "reset-camera"
  | "fit-screen"
  | "toggle-current-flow"
  | "toggle-polarity"
  | "cycle-layout"
  | "toggle-grid"
  | "toggle-labels"
  | "load-preset"
  | "generate-practice"
  | "practice-help"
  | "show-tutorial"
  | "show-wire-guide"
  | "show-shortcuts"
  | "show-about"
  | "open-arena";

type BuilderMessage =
  | { type: "builder:add-component"; payload: { componentType: string } }
  | { type: "builder:add-junction" }
  | { type: "builder:set-analysis-open"; payload: { open: boolean } }
  | { type: "builder:invoke-action"; payload: { action: BuilderInvokeAction; data?: Record<string, unknown> } };

type ComponentAction = {
  id: string;
  icon: string;
  label: string;
  action: "component" | "junction";
  builderType?: "battery" | "resistor" | "led" | "switch";
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

const createBadgeLabel = (label: string) => {
  const sanitized = label.replace(/[^\w\s]/g, " ");
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return label.slice(0, 3).toUpperCase();
  }

  const initials = words.map((word) => word[0]?.toUpperCase() ?? "").join("");
  if (initials.length >= 2) {
    return initials.slice(0, 3);
  }

  return (words[0] ?? label).slice(0, 3).toUpperCase();
};

const COMPONENT_ACTIONS: ComponentAction[] = [
  { id: "battery", icon: "B", label: "Battery", action: "component", builderType: "battery" },
  { id: "resistor", icon: "R", label: "Resistor", action: "component", builderType: "resistor" },
  { id: "led", icon: "LED", label: "LED", action: "component", builderType: "led" },
  { id: "switch", icon: "SW", label: "Switch", action: "component", builderType: "switch" },
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

type PanelAction = {
  id: string;
  label: string;
  description: string;
  action: BuilderInvokeAction;
  data?: Record<string, unknown>;
};

const WIRE_TOOL_ACTIONS: PanelAction[] = [
  {
    id: "wire-mode",
    label: "Wire Mode",
    description: "Switch into wiring mode to connect components node to node.",
    action: "toggle-wire-mode",
  },
  {
    id: "rotate-mode",
    label: "Rotate Mode",
    description: "Rotate the active component to align with your build.",
    action: "toggle-rotate-mode",
  },
  {
    id: "junction",
    label: "Add Junction",
    description: "Drop a junction node for branching or merging wires.",
    action: "add-junction",
  },
  {
    id: "auto-arrange",
    label: "Auto Arrange",
    description: "Let CircuiTry tidy the layout while preserving connections.",
    action: "auto-arrange",
  },
];

const CURRENT_MODE_ACTIONS: PanelAction[] = [
  {
    id: "flow-style",
    label: "Toggle Current Flow",
    description: "Swap between electron cloud and conventional current views.",
    action: "toggle-current-flow",
  },
  {
    id: "polarity",
    label: "Polarity Indicators",
    description: "Show or hide polarity markers on applicable components.",
    action: "toggle-polarity",
  },
  {
    id: "layout-mode",
    label: "Cycle Layout Mode",
    description: "Step through free, square, and linear auto-layout modes.",
    action: "cycle-layout",
  },
];

const VIEW_CONTROL_ACTIONS: PanelAction[] = [
  {
    id: "reset-camera",
    label: "Reset Camera",
    description: "Return the camera to the default framing and distance.",
    action: "reset-camera",
  },
  {
    id: "fit-screen",
    label: "Fit to Screen",
    description: "Frame the full circuit within the active viewport.",
    action: "fit-screen",
  },
  {
    id: "toggle-grid",
    label: "Toggle Grid",
    description: "Show or hide the design grid for precise placement.",
    action: "toggle-grid",
  },
  {
    id: "toggle-labels",
    label: "Toggle Labels",
    description: "Display or conceal component reference labels.",
    action: "toggle-labels",
  },
];

type PracticeScenario = {
  id: string;
  label: string;
  question: string;
  description: string;
  preset: string;
};

const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: "series-basic",
    label: "Series Circuit",
    question: "Find total resistance and current.",
    description: "Combine series resistances and solve for current with W.I.R.E.",
    preset: "series_basic",
  },
  {
    id: "parallel-basic",
    label: "Parallel Circuit",
    question: "Find equivalent resistance in parallel.",
    description: "Apply reciprocal sums to determine the total resistance.",
    preset: "parallel_basic",
  },
  {
    id: "mixed-circuit",
    label: "Mixed Circuit",
    question: "Analyze a mixed topology.",
    description: "Break the network into series and parallel segments to solve.",
    preset: "mixed_circuit",
  },
  {
    id: "switch-control",
    label: "Switch Control",
    question: "Compare behaviour with the switch on or off.",
    description: "Focus on how switching impacts overall power draw.",
    preset: "switch_control",
  },
];

const PRACTICE_ACTIONS: PanelAction[] = [
  {
    id: "random-problem",
    label: "Random Practice Problem",
    description: "Generate a fresh practice challenge from the curated set.",
    action: "generate-practice",
  },
  {
    id: "practice-help",
    label: "Practice Mode Guide",
    description: "Review tips on how to approach the guided problems.",
    action: "practice-help",
  },
  {
    id: "open-arena",
    label: "Component Arena",
    description: "Open the arena view for rapid-fire component drills.",
    action: "open-arena",
  },
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

type HelpShortcut = {
  id: string;
  title: string;
  summary: string;
};

const HELP_SHORTCUTS: HelpShortcut[] = HELP_SECTIONS.map((section) => ({
  id: section.title,
  title: section.title,
  summary: section.paragraphs[0] ?? "",
}));

const HELP_ACTIONS: PanelAction[] = [
  {
    id: "tutorial",
    label: "Guided Tutorial",
    description: "Launch the original guided walkthrough inside the workspace.",
    action: "show-tutorial",
  },
  {
    id: "wire-guide",
    label: "W.I.R.E. Guide",
    description: "Review the classic breakdown of Watts, Current, Resistance, and Voltage.",
    action: "show-wire-guide",
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    description: "See every keyboard accelerator available in the builder.",
    action: "show-shortcuts",
  },
  {
    id: "about",
    label: "About CircuiTry3D",
    description: "View the release notes and version information.",
    action: "show-about",
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
  const pendingMessages = useRef<BuilderMessage[]>([]);
  const helpSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isFrameReady, setFrameReady] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 0));
  const [isLeftOpen, setLeftOpen] = useState(false);
  const [isRightOpen, setRightOpen] = useState(false);
  const [isBottomOpen, setBottomOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [requestedHelpSection, setRequestedHelpSection] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isHelpOpen || !requestedHelpSection) {
      return;
    }

    const target = helpSectionRefs.current[requestedHelpSection];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setRequestedHelpSection(null);
  }, [isHelpOpen, requestedHelpSection]);

  const postToBuilder = useCallback(
    (message: BuilderMessage, options: { allowQueue?: boolean } = {}) => {
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

  const triggerBuilderAction = useCallback(
    (action: BuilderInvokeAction, data?: Record<string, unknown>) => {
      postToBuilder({ type: "builder:invoke-action", payload: { action, data } });
    },
    [postToBuilder]
  );

  const openHelpSection = useCallback(
    (sectionTitle?: string) => {
      setHelpOpen(true);
      setRequestedHelpSection(sectionTitle ?? null);
    },
    []
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

    const failed: BuilderMessage[] = [];
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
    postToBuilder({ type: "builder:set-analysis-open", payload: { open: isBottomOpen } });
  }, [isBottomOpen, postToBuilder]);

  const handleComponentAction = useCallback(
    (component: ComponentAction) => {
      if (!component) {
        return;
      }

      if (component.action === "junction") {
        postToBuilder({ type: "builder:add-junction" });
        return;
      }

      if (!component.builderType) {
        console.warn(`Missing builder mapping for component '${component.id}'`);
        return;
      }

      postToBuilder({
        type: "builder:add-component",
        payload: { componentType: component.builderType },
      });
    },
    [postToBuilder]
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
        <div className="panel-content">
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
          <div className="panel-section">
            <p className="section-title">Wire Modes</p>
            <div className="tool-buttons">
              {WIRE_TOOL_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => triggerBuilderAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="tool-label">{action.label}</span>
                  <span className="tool-description">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`builder-quick-slider builder-quick-slider-left${isLeftOpen ? " panel-open" : ""}`}
        role="group"
        aria-label="Quick component and wiring controls"
      >
        <div className="slider-section">
          <span className="slider-heading">Parts</span>
          <div className="slider-stack">
            {COMPONENT_ACTIONS.map((component) => (
              <button
                key={component.id}
                type="button"
                className="slider-btn"
                onClick={() => handleComponentAction(component)}
                disabled={controlsDisabled}
                aria-disabled={controlsDisabled}
                title={controlsDisabled ? controlDisabledTitle : component.label}
                data-component-action={component.action}
              >
                <span className="slider-icon" aria-hidden="true">
                  {component.icon}
                </span>
                <span className="slider-label">{component.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="slider-section">
          <span className="slider-heading">Wire</span>
          <div className="slider-stack">
            {WIRE_TOOL_ACTIONS.map((action) => {
              const badge = createBadgeLabel(action.label);
              return (
                <button
                  key={action.id}
                  type="button"
                  className="slider-btn"
                  onClick={() => triggerLegacyAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="slider-icon" aria-hidden="true">
                    {badge}
                  </span>
                  <span className="slider-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="slider-expand"
          onClick={() => setLeftOpen((prev) => !prev)}
          aria-pressed={isLeftOpen}
        >
          {isLeftOpen ? "Hide Menu" : "Open Menu"}
        </button>
      </div>

      <aside className={`builder-panel panel-right ${isRightOpen ? "open" : ""}`} aria-hidden={!isRightOpen}>
        <div className="panel-content">
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
          <div className="panel-section">
            <p className="section-title">Current Modes</p>
            <div className="tool-buttons">
              {CURRENT_MODE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => triggerBuilderAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="tool-label">{action.label}</span>
                  <span className="tool-description">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel-section">
            <p className="section-title">Workspace View</p>
            <div className="tool-buttons">
              {VIEW_CONTROL_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => triggerBuilderAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="tool-label">{action.label}</span>
                  <span className="tool-description">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`builder-quick-slider builder-quick-slider-right${isRightOpen ? " panel-open" : ""}`}
        role="group"
        aria-label="Quick mode and view controls"
      >
        <div className="slider-section">
          <span className="slider-heading">Modes</span>
          <div className="slider-stack">
            {CURRENT_MODE_ACTIONS.map((action) => {
              const badge = createBadgeLabel(action.label);
              return (
                <button
                  key={action.id}
                  type="button"
                  className="slider-btn"
                  onClick={() => triggerLegacyAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="slider-icon" aria-hidden="true">
                    {badge}
                  </span>
                  <span className="slider-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="slider-section">
          <span className="slider-heading">View</span>
          <div className="slider-stack">
            {VIEW_CONTROL_ACTIONS.map((action) => {
              const badge = createBadgeLabel(action.label);
              return (
                <button
                  key={action.id}
                  type="button"
                  className="slider-btn"
                  onClick={() => triggerLegacyAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="slider-icon" aria-hidden="true">
                    {badge}
                  </span>
                  <span className="slider-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="slider-section">
          <span className="slider-heading">Help</span>
          <div className="slider-stack">
            {LEGACY_HELP_ACTIONS.map((action) => {
              const badge = createBadgeLabel(action.label);
              return (
                <button
                  key={action.id}
                  type="button"
                  className="slider-btn"
                  onClick={() => triggerLegacyAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="slider-icon" aria-hidden="true">
                    {badge}
                  </span>
                  <span className="slider-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="slider-expand"
          onClick={() => setRightOpen((prev) => !prev)}
          aria-pressed={isRightOpen}
        >
          {isRightOpen ? "Hide Details" : "Open Details"}
        </button>
      </div>

      <section
        ref={bottomPanelRef}
        className={`builder-panel panel-bottom ${isBottomOpen ? "open" : ""}`}
        aria-hidden={!isBottomOpen}
        aria-expanded={isBottomOpen}
      >
        <div className="panel-content">
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
              <button
                type="button"
                className="builder-help-launch"
                onClick={() => openHelpSection(HELP_SECTIONS[0]?.title)}
              >
                Open Guided Tutorial
              </button>
            </div>
          </div>
          <div className="panel-section">
            <p className="section-title">Practice Questions</p>
            <div className="practice-grid">
              {PRACTICE_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className="practice-card"
                  onClick={() => triggerBuilderAction("load-preset", { preset: scenario.preset })}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : scenario.question}
                >
                  <span className="practice-label">{scenario.label}</span>
                  <span className="practice-question">{scenario.question}</span>
                  <span className="practice-description">{scenario.description}</span>
                </button>
              ))}
            </div>
            <div className="panel-subsection">
              <div className="tool-buttons">
                {PRACTICE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="tool-btn"
                    onClick={() => triggerBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : action.description}
                  >
                    <span className="tool-label">{action.label}</span>
                    <span className="tool-description">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="panel-section">
            <p className="section-title">Help &amp; Guides</p>
            <div className="tool-buttons">
              {HELP_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => triggerBuilderAction(action.action, action.data)}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={controlsDisabled ? controlDisabledTitle : action.description}
                >
                  <span className="tool-label">{action.label}</span>
                  <span className="tool-description">{action.description}</span>
                </button>
              ))}
            </div>
            <div className="help-shortcut-grid">
              {HELP_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.id}
                  type="button"
                  className="help-shortcut"
                  onClick={() => openHelpSection(shortcut.title)}
                >
                  <span className="help-shortcut-title">{shortcut.title}</span>
                  <span className="help-shortcut-summary">{shortcut.summary}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="builder-quick-slider builder-quick-slider-bottom" role="group" aria-label="Quick analysis and practice controls">
        <div className="slider-metrics" aria-hidden="true">
          {WIRE_METRICS.map((metric) => (
            <div key={metric.id} className="slider-metric">
              <span className="metric-letter">{metric.letter}</span>
              <span className="metric-value">{metric.value}</span>
              <span className="metric-label">{metric.label}</span>
            </div>
          ))}
        </div>
        <div className="slider-chip-row">
          {PRACTICE_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="slider-chip"
              onClick={() => triggerLegacyAction(action.action, action.data)}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              title={controlsDisabled ? controlDisabledTitle : action.description}
            >
              <span className="slider-chip-label">{action.label}</span>
            </button>
          ))}
          {PRACTICE_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="slider-chip"
              onClick={() => triggerLegacyAction("load-preset", { preset: scenario.preset })}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              title={controlsDisabled ? controlDisabledTitle : scenario.question}
            >
              <span className="slider-chip-label">{scenario.label}</span>
            </button>
          ))}
          <button type="button" className="slider-chip" onClick={() => openHelpSection()}>
            <span className="slider-chip-label">Help Center</span>
          </button>
        </div>
        <button
          type="button"
          className="slider-expand"
          onClick={() => setBottomOpen((prev) => !prev)}
          aria-pressed={isBottomOpen}
        >
          {isBottomOpen ? "Hide Analysis" : "Open Analysis"}
        </button>
      </div>

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
            <div
              key={section.title}
              className="help-section"
              ref={(element) => {
                if (element) {
                  helpSectionRefs.current[section.title] = element;
                } else {
                  delete helpSectionRefs.current[section.title];
                }
              }}
            >
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
