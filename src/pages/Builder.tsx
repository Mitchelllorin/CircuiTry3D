import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  | { type: "builder:invoke-action"; payload: { action: BuilderInvokeAction; data?: Record<string, unknown> } }
  | {
      type: "builder:export-arena";
      payload?: {
        requestId?: string;
        openWindow?: boolean;
        sessionName?: string;
        testVariables?: Record<string, unknown>;
      };
    };

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

type ArenaExportSummary = {
  sessionId: string;
  exportedAt: string;
  componentCount: number;
  wireCount: number;
  junctionCount: number;
  analysis?: {
    basic?: {
      voltage?: number;
      current?: number;
      resistance?: number;
      power?: number;
      topology?: string;
    };
    advanced?: {
      impedance?: number;
      netReactance?: number;
      phaseAngleDegrees?: number;
      totalResistance?: number;
      totalCapacitance?: number;
      totalInductance?: number;
      energyDelivered?: number;
      estimatedThermalRise?: number;
      frequencyHz?: number;
      temperatureC?: number;
    };
  };
  testVariables?: Record<string, unknown>;
  storage?: string;
  requestId?: string | null;
};

type ArenaExportStatus = "idle" | "exporting" | "ready" | "error";

const WIRE_TOOL_ACTIONS: PanelAction[] = [
  {
    id: "wire-mode",
    label: "Wire Mode",
    description: "Switch into wiring mode to pick freeform, schematic, star, or auto-routing paths.",
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
    label: "Component Arena Sync",
    description: "Export the active build and open the Component Arena for testing.",
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
      "Use the Wire Tool to drag intelligent routes between pins - swap between Freeform, Schematic, Star, or Routing modes from the left panel, and hold Shift in schematic mode to flip the elbow direction.",
    ],
    bullets: [
      "One-touch buttons add, rotate, duplicate, or delete components.",
      "Click anywhere along an existing wire to drop a junction and branch a new run - junctions can fan out in any direction.",
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

function subscribeToMediaQuery(query: MediaQueryList, listener: (event: MediaQueryListEvent) => void) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  // Fallback for older WebKit / Safari versions
  // eslint-disable-next-line deprecation/deprecation
  query.addListener(listener);
  // eslint-disable-next-line deprecation/deprecation
  return () => query.removeListener(listener);
}

export default function Builder() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingMessages = useRef<BuilderMessage[]>([]);
  const pendingArenaRequests = useRef<Map<string, { openWindow: boolean }>>(new Map());
  const helpSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isFrameReady, setFrameReady] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [requestedHelpSection, setRequestedHelpSection] = useState<string | null>(null);
  const [isLeftMenuOpen, setLeftMenuOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });
  const [isRightMenuOpen, setRightMenuOpen] = useState(false);
  const [isBottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [arenaExportStatus, setArenaExportStatus] = useState<ArenaExportStatus>("idle");
  const [arenaExportError, setArenaExportError] = useState<string | null>(null);
  const [lastArenaExport, setLastArenaExport] = useState<ArenaExportSummary | null>(null);
  const appBasePath = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }, []);

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

      if (type === "legacy:arena-export") {
        const summary = (payload || {}) as ArenaExportSummary | undefined;
        if (summary && typeof summary.sessionId === "string") {
          setArenaExportStatus("ready");
          setArenaExportError(null);
          setLastArenaExport(summary);

          const requestId = typeof summary.requestId === "string" ? summary.requestId : undefined;
          let shouldOpenWindow = false;

          if (requestId) {
            const meta = pendingArenaRequests.current.get(requestId);
            if (meta) {
              shouldOpenWindow = Boolean(meta.openWindow);
              pendingArenaRequests.current.delete(requestId);
            }
          } else {
            shouldOpenWindow = true;
          }

          if (shouldOpenWindow && typeof window !== "undefined") {
            const targetUrl = `${appBasePath}arena?session=${encodeURIComponent(summary.sessionId)}`;
            window.open(targetUrl, "_blank", "noopener");
          }
        } else {
          setArenaExportStatus("error");
          setArenaExportError("Arena export returned an unexpected response");
        }
        return;
      }

      if (type === "legacy:arena-export:error") {
        const errorPayload = (payload || {}) as { message?: string; requestId?: string };
        setArenaExportStatus("error");
        setArenaExportError(errorPayload?.message || "Arena export failed");
        if (errorPayload?.requestId) {
          pendingArenaRequests.current.delete(errorPayload.requestId);
        }
        return;
      }

    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [appBasePath]);

  useEffect(() => {
    document.body.classList.add("builder-body");
    return () => {
      document.body.classList.remove("builder-body");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const largeScreenQuery = window.matchMedia("(min-width: 1024px)");
    const compactScreenQuery = window.matchMedia("(max-width: 900px)");

    const handleLargeScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setLeftMenuOpen(true);
      }
    };

    const handleCompactScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setLeftMenuOpen(false);
      }
    };

    if (compactScreenQuery.matches) {
      setLeftMenuOpen(false);
    } else if (largeScreenQuery.matches) {
      setLeftMenuOpen(true);
    }

    const detachLargeScreen = subscribeToMediaQuery(largeScreenQuery, handleLargeScreen);
    const detachCompactScreen = subscribeToMediaQuery(compactScreenQuery, handleCompactScreen);

    return () => {
      detachLargeScreen();
      detachCompactScreen();
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

  const handleArenaSync = useCallback(
    (
      options: {
        openWindow?: boolean;
        sessionName?: string;
        testVariables?: Record<string, unknown>;
      } = {}
    ) => {
      const openWindow = options.openWindow ?? true;
      const requestId = `arena-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      pendingArenaRequests.current.set(requestId, { openWindow });
      setArenaExportStatus("exporting");
      setArenaExportError(null);

      const message: BuilderMessage = {
        type: "builder:export-arena",
        payload: {
          requestId,
          openWindow,
          sessionName: options.sessionName,
          testVariables: options.testVariables,
        },
      };

      postToBuilder(message);
    },
    [postToBuilder]
  );

  const handlePracticeAction = useCallback(
    (action: PanelAction) => {
      if (action.action === "open-arena") {
        handleArenaSync({ openWindow: true, sessionName: "Builder Hand-off" });
        return;
      }
      triggerBuilderAction(action.action, action.data);
    },
    [handleArenaSync, triggerBuilderAction]
  );

  const openLastArenaSession = useCallback(() => {
    if (!lastArenaExport?.sessionId) {
      return;
    }
    const targetUrl = `${appBasePath}arena?session=${encodeURIComponent(lastArenaExport.sessionId)}`;
    window.open(targetUrl, "_blank", "noopener");
  }, [appBasePath, lastArenaExport]);

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

  const arenaStatusMessage = useMemo(() => {
    switch (arenaExportStatus) {
      case "exporting":
        return "Exporting current build to Component Arena...";
      case "ready": {
        if (!lastArenaExport) {
          return "Component Arena export is ready.";
        }
        const exportedTime = lastArenaExport.exportedAt ? new Date(lastArenaExport.exportedAt) : null;
        const formattedTime = exportedTime && !Number.isNaN(exportedTime.getTime())
          ? exportedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null;
        const componentLabel = typeof lastArenaExport.componentCount === "number"
          ? `${lastArenaExport.componentCount} component${lastArenaExport.componentCount === 1 ? "" : "s"}`
          : null;
        if (componentLabel && formattedTime) {
          return `Last arena export: ${componentLabel} - ${formattedTime}`;
        }
        if (componentLabel) {
          return `Last arena export: ${componentLabel}`;
        }
        return "Component Arena export is ready.";
      }
      case "error":
        return arenaExportError ?? "Component Arena export failed.";
      default:
        return "Send this build to the Component Arena for advanced testing.";
    }
  }, [arenaExportStatus, arenaExportError, lastArenaExport]);

  const isArenaSyncing = arenaExportStatus === "exporting";
  const canOpenLastArena = Boolean(lastArenaExport?.sessionId);

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled ? "Workspace is still loading" : undefined;
  const builderFrameSrc = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}legacy.html?embed=builder`;
  }, []);

  return (
    <div className="builder-shell">
      <div className="builder-logo-header">
        <div className="builder-logo-text" aria-label="CircuiTry3D">
          <span className="builder-logo-circui">Circui</span>
          <span className="builder-logo-try">Try</span>
          <span className="builder-logo-3d">3D</span>
        </div>
      </div>

      <div className={`builder-menu-stage builder-menu-stage-left${isLeftMenuOpen ? " open" : ""}`}>
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-left"
          onClick={() => setLeftMenuOpen((open) => !open)}
          aria-expanded={isLeftMenuOpen}
          aria-label={isLeftMenuOpen ? "Collapse component library" : "Expand component library"}
          title={isLeftMenuOpen ? "Collapse component library" : "Expand component library"}
        >
          <span className="toggle-icon">{isLeftMenuOpen ? "<" : ">"}</span>
          <span className="toggle-text">Library</span>
        </button>
        <nav className="builder-menu builder-menu-left" role="navigation" aria-label="Component and wiring controls">
          <div className="builder-menu-scroll">
            <div className="slider-section">
              <span className="slider-heading">Parts</span>
              <div className="slider-stack">
                {COMPONENT_ACTIONS.map((component) => (
                  <button
                    key={component.id}
                    type="button"
                    className="slider-btn slider-btn-compact"
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
              <span className="slider-heading">Quick Actions</span>
              <div className="slider-stack">
                {TOOL_BUTTONS.map((button) => (
                  <button key={button.id} type="button" className="slider-btn slider-btn-stacked" title={button.description}>
                    <span className="slider-label">{button.label}</span>
                    <span className="slider-description">{button.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Wire Modes</span>
              <div className="slider-stack">
                {WIRE_TOOL_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => triggerBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : action.description}
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className={`builder-menu-stage builder-menu-stage-right${isRightMenuOpen ? " open" : ""}`}>
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-right"
          onClick={() => setRightMenuOpen((open) => !open)}
          aria-expanded={isRightMenuOpen}
          aria-label={isRightMenuOpen ? "Collapse mode and view controls" : "Expand mode and view controls"}
          title={isRightMenuOpen ? "Collapse mode and view controls" : "Expand mode and view controls"}
        >
          <span className="toggle-icon">{isRightMenuOpen ? ">" : "<"}</span>
          <span className="toggle-text">Controls</span>
        </button>
        <nav className="builder-menu builder-menu-right" role="complementary" aria-label="Mode and view controls">
          <div className="builder-menu-scroll">
            <div className="slider-section">
              <span className="slider-heading">Properties</span>
              <div className="property-stack">
                {PROPERTY_ITEMS.map((item) => (
                  <div key={item.id} className="property-item">
                    <div className="property-name">{item.name}</div>
                    <div className="property-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Modes</span>
              <div className="slider-stack">
                {CURRENT_MODE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => triggerBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : action.description}
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">View</span>
              <div className="slider-stack">
                {VIEW_CONTROL_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => triggerBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : action.description}
                  >
                    <span className="slider-label">{action.label}</span>
                    <span className="slider-description">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className={`builder-menu-stage builder-menu-stage-bottom${isBottomMenuOpen ? " open" : ""}`}>
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-bottom"
          onClick={() => setBottomMenuOpen((open) => !open)}
          aria-expanded={isBottomMenuOpen}
          aria-label={isBottomMenuOpen ? "Collapse analysis and guidance" : "Expand analysis and guidance"}
          title={isBottomMenuOpen ? "Collapse analysis and guidance" : "Expand analysis and guidance"}
        >
          <span className="toggle-icon">{isBottomMenuOpen ? "v" : "^"}</span>
          <span className="toggle-text">Insights</span>
        </button>
        <nav className="builder-menu builder-menu-bottom" role="navigation" aria-label="Analysis, practice, and guides">
          <div className="builder-menu-scroll builder-menu-scroll-bottom">
            <div className="slider-section">
              <span className="slider-heading">Analysis</span>
              <div className="menu-track menu-track-metrics">
                {WIRE_METRICS.map((metric) => (
                  <div key={metric.id} className="slider-metric">
                    <span className="metric-letter">{metric.letter}</span>
                    <span className="metric-value">{metric.value}</span>
                    <span className="metric-label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Practice</span>
              <div className="menu-track menu-track-chips">
                <div
                  role="status"
                  style={{
                    fontSize: "11px",
                    color: "rgba(136, 204, 255, 0.78)",
                    textAlign: "center",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(136, 204, 255, 0.22)",
                    background: "rgba(14, 30, 58, 0.48)",
                  }}
                >
                  {arenaStatusMessage}
                </div>
                {PRACTICE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => handlePracticeAction(action)}
                    disabled={controlsDisabled || (action.action === "open-arena" && isArenaSyncing)}
                    aria-disabled={controlsDisabled || (action.action === "open-arena" && isArenaSyncing)}
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : action.action === "open-arena" && isArenaSyncing
                        ? "Preparing Component Arena export?"
                        : action.description
                    }
                  >
                    <span className="slider-chip-label">{action.label}</span>
                  </button>
                ))}
                {PRACTICE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => triggerBuilderAction("load-preset", { preset: scenario.preset })}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : scenario.question}
                  >
                    <span className="slider-chip-label">{scenario.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="slider-chip"
                  onClick={openLastArenaSession}
                  disabled={!canOpenLastArena}
                  aria-disabled={!canOpenLastArena}
                  title={
                    canOpenLastArena
                      ? "Open the most recent Component Arena export"
                      : "Run a Component Arena export first"
                  }
                >
                  <span className="slider-chip-label">Open Last Arena Run</span>
                </button>
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Guides</span>
              <div className="menu-track menu-track-chips">
                {HELP_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => triggerBuilderAction(action.action, action.data)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={controlsDisabled ? controlDisabledTitle : action.description}
                  >
                    <span className="slider-chip-label">{action.label}</span>
                  </button>
                ))}
                {HELP_SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => openHelpSection(shortcut.title)}
                    title={shortcut.summary}
                  >
                    <span className="slider-chip-label">{shortcut.title}</span>
                  </button>
                ))}
                <button type="button" className="slider-chip" onClick={() => openHelpSection()}>
                  <span className="slider-chip-label">Help Center</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="builder-status-bar">
        <span className="status-indicator" aria-hidden="true" />
        {isFrameReady ? "Workspace ready?tap and drag to build." : "Loading workspace?"}
      </div>

      <div className="builder-workspace" aria-busy={!isFrameReady}>
        <iframe
          ref={iframeRef}
          className="builder-iframe"
          title="CircuiTry3D Builder"
          src={builderFrameSrc}
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
