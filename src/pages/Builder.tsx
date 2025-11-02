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
  | "open-arena"
  | "set-tool"
  | "run-simulation";

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

type BuilderToolId = "select" | "wire" | "measure";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  kind: "tool" | "action";
  action: BuilderInvokeAction;
  data?: Record<string, unknown>;
  tool?: BuilderToolId;
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

type HelpModalView = "overview" | "tutorial" | "wire-guide" | "shortcuts" | "about";

type HelpEntry = {
  id: string;
  label: string;
  description: string;
  view: HelpModalView;
};

const COMPONENT_ACTIONS: ComponentAction[] = [
  { id: "battery", icon: "B", label: "Battery", action: "component", builderType: "battery" },
  { id: "resistor", icon: "R", label: "Resistor", action: "component", builderType: "resistor" },
  { id: "led", icon: "LED", label: "LED", action: "component", builderType: "led" },
  { id: "switch", icon: "SW", label: "Switch", action: "component", builderType: "switch" },
  { id: "junction", icon: "J", label: "Junction", action: "junction" },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "select",
    label: "Select Tool",
    description: "Tap components to edit",
    kind: "tool",
    action: "set-tool",
    data: { tool: "select" },
    tool: "select",
  },
  {
    id: "wire",
    label: "Wire Tool",
    description: "Drag to sketch new connections",
    kind: "tool",
    action: "set-tool",
    data: { tool: "wire" },
    tool: "wire",
  },
  {
    id: "measure",
    label: "Measure",
    description: "Check distances and alignment",
    kind: "tool",
    action: "set-tool",
    data: { tool: "measure" },
    tool: "measure",
  },
  {
    id: "simulate",
    label: "Run Simulation",
    description: "Preview circuit behaviour",
    kind: "action",
    action: "run-simulation",
  },
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
    question: "Series loop: solve for total current (I_T).",
    description: "Log W.I.R.E. values, add the resistances, pick I = E / R_T, then confirm with KVL.",
    preset: "series_basic",
  },
  {
    id: "parallel-basic",
    label: "Parallel Circuit",
    question: "Parallel bus: find equivalent resistance and branch currents.",
    description: "Use W.I.R.E. to capture knowns, compute R_T with reciprocals, and check KCL/KVL compliance.",
    preset: "parallel_basic",
  },
  {
    id: "mixed-circuit",
    label: "Mixed Circuit",
    question: "Series-parallel combo: reduce and solve the ladder.",
    description: "Collapse branches with W.I.R.E., select the right Ohm's Law form, and verify against Kirchhoff.",
    preset: "mixed_circuit",
  },
  {
    id: "combo-challenge",
    label: "Combo Challenge",
    question: "Multi-loop combo: determine every unknown.",
    description: "Trace W.I.R.E. values, mix Ohm's Law identities, and enforce Kirchhoff on nested branches.",
    preset: "combination_advanced",
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
      "Toggle panels closed when you need the full canvas; only the slim toggles remain visible.",
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
const TUTORIAL_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    paragraphs: [
      "Add components from the Components menu, then place them directly into the 3D workspace.",
      "Use the Wire tool to connect terminals and close the circuit loop so current can flow.",
      "Open the analysis panels on the right to watch live calculations while you build.",
    ],
    bullets: [
      "Quick keys: B (battery), R (resistor), L (LED), S (switch), J (junction).",
      "Wire tool supports freeform, schematic, star, and auto-routing modes.",
      "Analysis panels include W.I.R.E., EIR triangle, power, worksheet, and solve tabs.",
    ],
  },
  {
    title: "Visual Learning",
    paragraphs: [
      "CircuiTry3D leans on the W.I.R.E. colour system so you always know which value you are adjusting.",
      "Switch between flow visualizations to compare electron movement with conventional current.",
    ],
    bullets: [
      "Colour legend: blue watts, orange current, green resistance, red voltage.",
      "Electron Flow mode shows semi-transparent particles moving negative to positive.",
      "Current Flow mode renders solid particles in the conventional positive to negative direction.",
      "Toggle polarity indicators to keep track of positive and negative terminals while wiring.",
    ],
  },
  {
    title: "Advanced Features",
    paragraphs: [
      "Explore routing, junctions, and layout tools to organise complex practice problems quickly.",
    ],
    bullets: [
      "Swap between free-form and Manhattan routes for textbook wiring.",
      "Drop junctions to branch into parallel paths.",
      "Auto-arrange builds clean study-ready layouts in a single click.",
      "Cycle through free, square, and linear layout modes from the View controls.",
    ],
  },
  {
    title: "Controls",
    paragraphs: [
      "Use mouse, keyboard, or touch controls depending on your device.",
    ],
    bullets: [
      "Drag to move components, long-press to edit values, and use two-finger gestures to zoom or pan.",
      "Keyboard: W toggles wire mode, T toggles rotate mode, Space toggles the legacy menu.",
      "Quick keys add components instantly: B, R, L, S, and J.",
    ],
  },
  {
    title: "View Controls & Tips",
    paragraphs: [
      "Keep the scene readable while you iterate on designs.",
    ],
    bullets: [
      "Reset View recentres the camera; Fit to Screen frames the active circuit.",
      "Toggle Grid and Toggle Labels for precision placement or a cleaner screenshot.",
      "Complete the circuit loop, use junctions for parallel runs, and experiment with routing modes for tidy builds.",
    ],
  },
];

const WIRE_GUIDE_SECTIONS: HelpSection[] = [
  {
    title: "W.I.R.E. Overview",
    paragraphs: [
      "The W.I.R.E. method keeps four core electrical values front and centre while you design circuits.",
    ],
    bullets: [
      "W - Watts (power)",
      "I - Current (amperes)",
      "R - Resistance (ohms)",
      "E - EMF / Voltage (volts)",
    ],
  },
  {
    title: "W - Watts (Power)",
    paragraphs: [
      "Watts describe how much energy a circuit uses each second.",
    ],
    bullets: [
      "Formula: P = V x I.",
      "Watch for power changes as you adjust voltage or current.",
      "Higher power means brighter lights and increased heat generation.",
    ],
  },
  {
    title: "I - Current (Amperes)",
    paragraphs: [
      "Current is the flow rate of electrons through the circuit.",
    ],
    bullets: [
      "Formula: I = V / R (Ohm's Law).",
      "Compare electron flow and conventional current visualisations inside the workspace.",
      "Measured in amperes; increasing resistance lowers current for a fixed voltage.",
    ],
  },
  {
    title: "R - Resistance (Ohms)",
    paragraphs: [
      "Resistance opposes current flow and is set by components like resistors and LEDs.",
    ],
    bullets: [
      "Formula: R = V / I.",
      "Higher resistance reduces current under the same voltage.",
      "Use resistors to protect LEDs and control current draw.",
    ],
  },
  {
    title: "E - EMF / Voltage (Volts)",
    paragraphs: [
      "Voltage is the electrical pressure supplied by your source.",
    ],
    bullets: [
      "Formula: V = I x R.",
      "Raising voltage increases current if resistance stays the same.",
      "Battery components provide the EMF that drives the circuit.",
    ],
  },
  {
    title: "Key Formulas",
    paragraphs: [
      "Keep the classic triangles in mind when solving problems.",
    ],
    bullets: [
      "Ohm's Law triangle (E over I and R) helps rearrange for voltage, current, or resistance.",
      "Power triangle (P over V and I) ties wattage to voltage and current.",
      "Remember: adjusting one value affects the others across the circuit.",
    ],
  },
  {
    title: "Practice Tips",
    paragraphs: [
      "Build small circuits and watch the analysis panel respond in real time.",
    ],
    bullets: [
      "Add or remove resistors to see how total resistance changes.",
      "Swap battery voltages to explore how EMF affects the rest of the system.",
      "Parallel paths lower total resistance; practice mode provides guided challenges.",
    ],
  },
];

const SHORTCUT_SECTIONS: HelpSection[] = [
  {
    title: "Components",
    bullets: [
      "B - add battery",
      "R - add resistor",
      "L - add LED",
      "S - add switch",
      "J - add junction",
    ],
    paragraphs: [
      "Use the quick keys whenever you need to drop the next component without leaving the workspace.",
    ],
  },
  {
    title: "Tools & Modes",
    bullets: [
      "W - toggle wire mode",
      "T - toggle rotate mode",
      "Space - toggle the legacy menu",
      "Esc - close menus or cancel the active mode",
    ],
  },
  {
    title: "Editing & Files",
    bullets: [
      "Ctrl+Z - undo",
      "Ctrl+Y - redo",
      "Ctrl+C - copy selected",
      "Ctrl+V - paste",
      "Delete or Backspace - remove selected",
      "Ctrl+S - save circuit",
      "Ctrl+O - load circuit",
      "Ctrl+N - new circuit",
    ],
  },
  {
    title: "View Control",
    bullets: [
      "H - reset camera",
      "F - fit to screen",
      "G - toggle grid",
    ],
  },
  {
    title: "Mouse Actions",
    bullets: [
      "Click to select and drag to move components.",
      "Scroll to zoom; right-click for context actions.",
      "In wire mode, click terminals to create connections and press Esc to exit.",
      "In rotate mode, clicking rotates by 90 degrees; press Esc to stop rotating.",
      "Long-press components or wires to edit, reroute, or delete.",
    ],
  },
  {
    title: "Touch Actions",
    bullets: [
      "Tap to select, drag to move, and long-press to edit.",
      "Pinch to zoom; two-finger drag to pan the workspace.",
      "Rotate with two fingers to adjust the view on supported devices.",
      "Tap terminals in wire mode to connect and long-press wires to manage branches.",
    ],
  },
  {
    title: "Pro Tips",
    bullets: [
      "Hold Shift while dragging to temporarily disable grid snapping.",
      "Use arrow keys for fine component positioning.",
      "Ctrl+scroll to speed up zooming.",
      "Double-click (or double-tap) for quick edits, then Space to reveal menus again.",
      "Try the quick workflow: B (battery), R (resistor), W (wire), connect, Space to review.",
    ],
  },
];

const ABOUT_SECTIONS: HelpSection[] = [
  {
    title: "Version & Focus",
    paragraphs: [
      "CircuiTry3D W.I.R.E. Circuit Builder v2.5 is a Three.js powered learning environment for visual thinkers.",
    ],
    bullets: [
      "Educational 3D circuit simulator with real-time calculations.",
      "Designed for classrooms, distance learning, and independent study.",
    ],
  },
  {
    title: "Circuit Building",
    bullets: [
      "Interactive 3D workspace with colour-coded W.I.R.E. metrics.",
      "Components auto-label as B1, R1, LED1, SW1 for quick reference.",
      "Grid snapping can be toggled for freeform placement versus precise layouts.",
    ],
  },
  {
    title: "Visualization",
    bullets: [
      "Electron flow and conventional current particle systems show movement through wires.",
      "Polarity indicators mark positive and negative terminals at a glance.",
      "Branding overlay can be toggled inside the legacy interface.",
    ],
  },
  {
    title: "Flexible Wiring & Layouts",
    bullets: [
      "Free-form, Manhattan, simple, perimeter, and A* routing styles.",
      "Smart junction placement with long-press editing for parallel branches.",
      "Auto-arrange plus free, square, and linear layout modes for presentation-ready circuits.",
    ],
  },
  {
    title: "Educational Tools",
    bullets: [
      "W.I.R.E., EIR triangle, power, worksheet, and solve panels support multiple learning paths.",
      "Practice mode covers series, parallel, mixed, and switch-controlled circuits with guided steps.",
      "Random problem generator keeps drills fresh.",
    ],
  },
  {
    title: "Purpose & Pedagogy",
    paragraphs: [
      "The W.I.R.E. framework reinforces Watts, Current, Resistance, and Voltage with immediate visual feedback.",
      "Hands-on experimentation makes abstract electrical concepts tangible.",
    ],
  },
  {
    title: "Platform Support",
    bullets: [
      "Desktop: full keyboard and mouse support with high-performance rendering.",
      "Mobile and tablet: touch-optimised gestures, pinch-to-zoom, long-press editing, responsive layout.",
    ],
  },
  {
    title: "Technical Details",
    bullets: [
      "Built with Three.js, JavaScript, HTML5 Canvas, and CSS3.",
      "Features real-time simulation, graph-based topology detection, multiple routing algorithms, and persistent storage.",
    ],
  },
  {
    title: "For Students & Educators",
    bullets: [
      "Students get instant feedback, practice problems, and exportable circuits.",
      "Educators can rapidly build examples, rely on professional layouts, and use the tool freely in class.",
    ],
  },
  {
    title: "Support & Feedback",
    paragraphs: [
      "Report ideas or issues at github.com/Mitchelllorin/CircuiTry3D.",
      "2025 CircuiTry3D - crafted for visual learners everywhere.",
    ],
  },
];

const HELP_VIEW_CONTENT: Record<HelpModalView, { title: string; description?: string; sections: HelpSection[]; showLegend?: boolean }> = {
  overview: {
    title: "CircuiTry3D Help Center",
    description: "Browse quick-start advice, navigation tips, and the W.I.R.E. legend.",
    sections: HELP_SECTIONS,
    showLegend: true,
  },
  "tutorial": {
    title: "Guided Tutorial",
    description: "Follow the original legacy walkthrough rebuilt for the modern interface.",
    sections: TUTORIAL_SECTIONS,
  },
  "wire-guide": {
    title: "W.I.R.E. Guide",
    description: "Understand how Watts, Current, Resistance, and Voltage relate while you design.",
    sections: WIRE_GUIDE_SECTIONS,
  },
  "shortcuts": {
    title: "Keyboard & Gesture Shortcuts",
    description: "Reference the complete set of controls for desktop and mobile builders.",
    sections: SHORTCUT_SECTIONS,
  },
  "about": {
    title: "About CircuiTry3D",
    description: "Review feature highlights, learning goals, and support resources from the legacy release.",
    sections: ABOUT_SECTIONS,
  },
};

const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "tutorial",
    label: "Guided Tutorial",
    description: "Step-by-step quick start copied from the legacy onboarding flow.",
    view: "tutorial",
  },
  {
    id: "wire-guide",
    label: "W.I.R.E. Guide",
    description: "Break down Watts, Current, Resistance, and Voltage in detail.",
    view: "wire-guide",
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    description: "Look up every keyboard, mouse, and touch shortcut in one place.",
    view: "shortcuts",
  },
  {
    id: "about",
    label: "About CircuiTry3D",
    description: "Learn what is new in v2.5 and how the simulator supports teaching.",
    view: "about",
  },
  {
    id: "help-center",
    label: "Help Center",
    description: "Open quick-start tips, navigation help, and the W.I.R.E. legend.",
    view: "overview",
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
  const simulationPulseTimer = useRef<number | null>(null);
  const helpSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isFrameReady, setFrameReady] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [requestedHelpSection, setRequestedHelpSection] = useState<string | null>(null);
  const [helpView, setHelpView] = useState<HelpModalView>("overview");
  const [isLeftMenuOpen, setLeftMenuOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });
  const [isRightMenuOpen, setRightMenuOpen] = useState(false);
  const [isBottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [activeQuickTool, setActiveQuickTool] = useState<BuilderToolId>("select");
  const [isSimulatePulsing, setSimulatePulsing] = useState(false);
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

      if (type === "legacy:tool-state") {
        const tool = typeof (payload as { tool?: string })?.tool === "string" ? (payload as { tool?: string }).tool : undefined;
        if (tool === "wire" || tool === "measure" || tool === "select") {
          setActiveQuickTool(tool);
        } else {
          setActiveQuickTool("select");
        }
        return;
      }

      if (type === "legacy:simulation") {
        if (simulationPulseTimer.current !== null) {
          window.clearTimeout(simulationPulseTimer.current);
        }
        setSimulatePulsing(true);
        simulationPulseTimer.current = window.setTimeout(() => {
          setSimulatePulsing(false);
          simulationPulseTimer.current = null;
        }, 1400);
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
    return () => {
      if (simulationPulseTimer.current !== null) {
        window.clearTimeout(simulationPulseTimer.current);
        simulationPulseTimer.current = null;
      }
    };
  }, []);

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
    if (!isHelpOpen || helpView !== "overview" || !requestedHelpSection) {
      return;
    }

    const target = helpSectionRefs.current[requestedHelpSection];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setRequestedHelpSection(null);
  }, [helpView, isHelpOpen, requestedHelpSection]);

  useEffect(() => {
    helpSectionRefs.current = {};
  }, [helpView]);

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

  const openHelpCenter = useCallback(
    (view: HelpModalView = "overview", sectionTitle?: string) => {
      setHelpView(view);
      setHelpOpen(true);
      setRequestedHelpSection(view === "overview" ? sectionTitle ?? null : null);
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

  const handleQuickAction = useCallback(
    (quickAction: QuickAction) => {
      triggerBuilderAction(quickAction.action, quickAction.data);

      if (quickAction.kind === "tool" && quickAction.tool) {
        setActiveQuickTool(quickAction.tool);
      }

      if (quickAction.id === "simulate") {
        if (simulationPulseTimer.current !== null) {
          window.clearTimeout(simulationPulseTimer.current);
        }
        setSimulatePulsing(true);
        simulationPulseTimer.current = window.setTimeout(() => {
          setSimulatePulsing(false);
          simulationPulseTimer.current = null;
        }, 1200);
      }
    },
    [triggerBuilderAction]
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
  const activeHelpContent = HELP_VIEW_CONTENT[helpView];

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
                {QUICK_ACTIONS.map((action) => {
                  const isActive = action.kind === "tool" && action.tool === activeQuickTool;
                  const isSimulation = action.id === "simulate";
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() => handleQuickAction(action)}
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      aria-pressed={action.kind === "tool" ? isActive : undefined}
                      data-active={action.kind === "tool" && isActive ? "true" : undefined}
                      data-pulse={isSimulation && isSimulatePulsing ? "true" : undefined}
                      title={controlsDisabled ? controlDisabledTitle : action.description}
                    >
                      <span className="slider-label">{action.label}</span>
                      <span className="slider-description">{action.description}</span>
                    </button>
                  );
                })}
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
                {HELP_ENTRIES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => openHelpCenter(entry.view)}
                    title={entry.description}
                  >
                    <span className="slider-chip-label">{entry.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="builder-status-bar">
        <span className="status-indicator" aria-hidden="true" />
        {isFrameReady ? "Workspace ready: tap and drag to build." : "Loading workspace..."}
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
          {helpView !== "overview" && (
            <button
              type="button"
              className="help-back"
              onClick={() => openHelpCenter("overview")}
              aria-label="Back to CircuiTry3D help overview"
            >
              {"< Back"}
            </button>
          )}
          <h2 className="help-title">{activeHelpContent.title}</h2>
          {activeHelpContent.description && <p className="help-description">{activeHelpContent.description}</p>}
          {helpView === "overview" && (
            <div className="help-nav" role="navigation" aria-label="Help section shortcuts">
              {HELP_SECTIONS.map((section) => (
                <button
                  key={section.title}
                  type="button"
                  className="help-nav-btn"
                  onClick={() => openHelpCenter("overview", section.title)}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}
          {activeHelpContent.sections.map((section) => (
            <div
              key={`${helpView}-${section.title}`}
              className="help-section"
              ref={helpView === "overview"
                ? (element) => {
                    if (element) {
                      helpSectionRefs.current[section.title] = element;
                    } else {
                      delete helpSectionRefs.current[section.title];
                    }
                  }
                : undefined}
            >
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${section.title}-p-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${section.title}-b-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {activeHelpContent.showLegend && (
            <div className="wire-legend">
              {WIRE_LEGEND.map((legend) => (
                <div key={legend.id} className={`legend-item ${legend.letter.toLowerCase()}`}>
                  <div className="legend-letter">{legend.letter}</div>
                  <div className="legend-label">{legend.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
