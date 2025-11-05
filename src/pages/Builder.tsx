import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../styles/builder-ui.css";
import "../styles/schematic.css";
import ArenaView from "../components/arena/ArenaView";
import Practice from "./Practice";
import { BuilderModeView } from "./SchematicMode";
import {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
  findPracticeProblemByPreset,
  getRandomPracticeProblem,
} from "../data/practiceProblems";
import type { PracticeProblem } from "../model/practice";
import {
  DEFAULT_SYMBOL_STANDARD,
  SYMBOL_STANDARD_OPTIONS,
  type SymbolStandard,
} from "../schematic/standards";

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
  | "clear-workspace"
  | "run-simulation";

type BuilderMessage =
  | { type: "builder:add-component"; payload: { componentType: string } }
  | { type: "builder:add-junction" }
  | { type: "builder:set-analysis-open"; payload: { open: boolean } }
  | {
      type: "builder:invoke-action";
      payload: { action: BuilderInvokeAction; data?: Record<string, unknown> };
    }
  | { type: "builder:request-mode-state" }
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

type LegacyModeState = {
  isWireMode: boolean;
  isRotateMode: boolean;
  isMeasureMode: boolean;
  currentFlowStyle: string;
  showPolarityIndicators: boolean;
  layoutMode: string;
  wireRoutingMode: string;
  showGrid: boolean;
  showLabels: boolean;
};

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

type HelpModalView =
  | "overview"
  | "tutorial"
  | "wire-guide"
  | "schematic"
  | "practice"
  | "shortcuts"
  | "about";

type HelpEntry = {
  id: string;
  label: string;
  description: string;
  view: HelpModalView;
};

const COMPONENT_ACTIONS: ComponentAction[] = [
  {
    id: "battery",
    icon: "B",
    label: "Battery",
    action: "component",
    builderType: "battery",
  },
  {
    id: "resistor",
    icon: "R",
    label: "Resistor",
    action: "component",
    builderType: "resistor",
  },
  {
    id: "led",
    icon: "LED",
    label: "LED",
    action: "component",
    builderType: "led",
  },
  {
    id: "switch",
    icon: "SW",
    label: "Switch",
    action: "component",
    builderType: "switch",
  },
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
    id: "clear",
    label: "Clear Workspace",
    description: "Remove all components, wires, and analysis data",
    kind: "action",
    action: "clear-workspace",
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

type SettingsItem = {
  id: string;
  label: string;
  action: BuilderInvokeAction;
  data?: Record<string, unknown>;
  getDescription: (
    state: LegacyModeState,
    helpers: { currentFlowLabel: string },
  ) => string;
  isActive?: (state: LegacyModeState) => boolean;
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

type BuilderLogoSettings = {
  speed: number;
  travelX: number;
  travelY: number;
  bounce: number;
  opacity: number;
  isVisible: boolean;
};

type LogoNumericSettingKey =
  | "speed"
  | "travelX"
  | "travelY"
  | "bounce"
  | "opacity";

const LOGO_SETTINGS_STORAGE_KEY = "builder:logo-motion";
const DEFAULT_LOGO_SETTINGS: BuilderLogoSettings = {
  speed: 28,
  travelX: 70,
  travelY: 55,
  bounce: 28,
  opacity: 100,
  isVisible: true,
};

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const WIRE_TOOL_ACTIONS: PanelAction[] = [
  {
    id: "wire-mode",
    label: "Wire Mode",
    description:
      "Switch into wiring mode to pick freeform, schematic (90 deg), star, or auto-routing paths.",
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

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: "flow-visualisation",
    label: "Flow Visualisation",
    action: "toggle-current-flow",
    getDescription: (_state, { currentFlowLabel }) =>
      `${currentFlowLabel} visualisation active`,
    isActive: (state) => state.currentFlowStyle === "solid",
  },
  {
    id: "polarity-markers",
    label: "Polarity Markers",
    action: "toggle-polarity",
    getDescription: (state) =>
      state.showPolarityIndicators
        ? "Polarity markers visible"
        : "Polarity markers hidden",
    isActive: (state) => state.showPolarityIndicators,
  },
  {
    id: "design-grid",
    label: "Design Grid",
    action: "toggle-grid",
    getDescription: (state) =>
      state.showGrid ? "Grid visible" : "Grid hidden",
    isActive: (state) => state.showGrid,
  },
  {
    id: "component-labels",
    label: "Component Labels",
    action: "toggle-labels",
    getDescription: (state) =>
      state.showLabels ? "Labels shown" : "Labels hidden",
    isActive: (state) => state.showLabels,
  },
];

type PracticeScenario = {
  id: string;
  label: string;
  question: string;
  description: string;
  preset: string;
  problemId?: string;
};

type PracticeWorksheetStatus = {
  problemId: string;
  complete: boolean;
};

const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: "series-basic",
    label: "Series Circuit",
    question: "Series loop: solve for total current (I_T).",
    description:
      "Log W.I.R.E. values, add the resistances, pick I = E / R_T, then confirm with KVL.",
    preset: "series_basic",
    problemId: "series-square-01",
  },
  {
    id: "parallel-basic",
    label: "Parallel Circuit",
    question: "Parallel bus: find equivalent resistance and branch currents.",
    description:
      "Use W.I.R.E. to capture knowns, compute R_T with reciprocals, and check KCL/KVL compliance.",
    preset: "parallel_basic",
    problemId: "parallel-square-02",
  },
  {
    id: "mixed-circuit",
    label: "Mixed Circuit",
    question: "Series-parallel combo: reduce and solve the ladder.",
    description:
      "Collapse branches with W.I.R.E., select the right Ohm's Law form, and verify against Kirchhoff.",
    preset: "mixed_circuit",
    problemId: "combo-square-03",
  },
  {
    id: "combo-challenge",
    label: "Combo Challenge",
    question: "Multi-loop combo: determine every unknown.",
    description:
      "Trace W.I.R.E. values, mix Ohm's Law identities, and enforce Kirchhoff on nested branches.",
    preset: "combination_advanced",
    problemId: "combo-square-03",
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
    label: "Table Method Guide",
    description: "Open the W.I.R.E. table method worksheet and solving steps.",
    action: "practice-help",
  },
  {
    id: "open-arena",
    label: "Component Arena Sync",
    description:
      "Export the active build and open the Component Arena for testing.",
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
      "Open the Schematic Standards guide when you need a refresher on textbook layout and symbol rules.",
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
      "Keyboard: W toggles wire mode, T toggles rotate mode, Space toggles the builder menu.",
      "Quick keys add components instantly: B, R, L, S, and J.",
    ],
  },
  {
    title: "View Controls & Tips",
    paragraphs: ["Keep the scene readable while you iterate on designs."],
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
    paragraphs: ["Watts describe how much energy a circuit uses each second."],
    bullets: [
      "Formula: P = V x I.",
      "Watch for power changes as you adjust voltage or current.",
      "Higher power means brighter lights and increased heat generation.",
    ],
  },
  {
    title: "I - Current (Amperes)",
    paragraphs: ["Current is the flow rate of electrons through the circuit."],
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
    paragraphs: ["Voltage is the electrical pressure supplied by your source."],
    bullets: [
      "Formula: V = I x R.",
      "Raising voltage increases current if resistance stays the same.",
      "Battery components provide the EMF that drives the circuit.",
    ],
  },
  {
    title: "Key Formulas",
    paragraphs: ["Keep the classic triangles in mind when solving problems."],
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

const SCHEMATIC_SECTIONS: HelpSection[] = [
  {
    title: "Standards & References",
    paragraphs: [
      "Professional schematics rely on common symbol libraries so anyone can read the circuit without guesswork.",
    ],
    bullets: [
      "IEC 60617 (international) and IEEE Std 315/ASME Y14.44 (North America) define the canonical symbols.",
      "Use your organisation's template if it specifies a particular standard or title block.",
      "Keep reference designators (R1, C3, SW1) unique and match the bill of materials.",
    ],
  },
  {
    title: "Symbol Conventions",
    paragraphs: [
      "Align symbols to a grid, keep power sources at the top or left, and ground points at the bottom to reinforce current direction.",
    ],
    bullets: [
      "Rotate symbols so pins face the wiring direction; avoid upside-down text or mirrored glyphs.",
      "Place component values close to the symbol (for example, R1 2 kOhm) and leave space for tolerance or part numbers.",
      "For polarized parts (LEDs, capacitors), ensure markings clearly indicate anode/cathode or positive/negative terminals.",
    ],
  },
  {
    title: "Wiring Discipline",
    paragraphs: [
      "Tidy wiring is just as important as the symbols. Readers should trace nets instantly without ambiguity.",
    ],
    bullets: [
      "Route nets horizontally and vertically; use the schematic (Manhattan) wire mode for 90 deg elbows in CircuiTry3D.",
      "Never create four-way junctions; stagger crossings and add a clear dot wherever conductors join.",
      "Use wire labels for long runs or nets that jump between sections instead of drawing huge detours.",
    ],
  },
  {
    title: "Layout Checklist",
    paragraphs: ["Before sharing a schematic, run through this quick audit."],
    bullets: [
      "Power enters top/left, returns bottom/right; functional blocks flow left-to-right (inputs to outputs).",
      "Group related components (filters, bias networks, bridges) inside neat rectangles or subtle callouts.",
      "Reference designators read left-to-right, top-to-bottom so automated annotation remains predictable.",
    ],
  },
  {
    title: "Applying It in CircuiTry3D",
    paragraphs: [
      "CircuiTry3D tools map directly onto these schematic habits so you can prototype in 3D and export a clean diagram.",
    ],
    bullets: [
      "Toggle Schematic routing (Wire tool -> routing preset) to snap to 90 deg elbows and match textbook diagrams.",
      "Turn on grid and labels while arranging; lock them off again when you capture screenshots for a cleaner finish.",
      "Use junction placements instead of overlapping wires to branch parallel nets, and mirror/rotate parts for consistent alignment.",
    ],
  },
];

const TABLE_METHOD_SECTIONS: HelpSection[] = [
  {
    title: "Why the Table Method",
    paragraphs: [
      "The W.I.R.E. table gives every component its own row so you can log what is known before solving any unknowns.",
      "Keep the columns locked to the W.I.R.E. compass: Watts (W), Current (I), Resistance (R), and Voltage (E).",
    ],
    bullets: [
      "Start with the givens from the prompt or schematic.",
      "Copy shared values (for example, series current) into each affected row.",
      "Leave blanks or '?' markers anywhere you still need to solve.",
    ],
  },
  {
    title: "Solve in Five Moves",
    paragraphs: [
      "1. Read the question and circle the target variable.",
      "2. Fill in every given value for W, I, R, or E in the worksheet rows.",
      "3. Choose the Ohm's Law or power identity that matches the two known values in the row.",
      "4. Record the newly solved value in the table, then update the totals row when complete.",
      "5. Check your work with Kirchhoff: sum voltages around each loop and verify currents at junctions.",
    ],
  },
  {
    title: "Formula Picker",
    paragraphs: [
      "Keep these identities beside the worksheet and grab the one that matches the givens in a row.",
    ],
    bullets: [
      "Ohm's Law: E = I * R, I = E / R, R = E / I.",
      "Power rules: P = E * I, P = I * I * R, P = (E * E) / R.",
      "Series recap: R_T = R1 + R2 + ..., current the same through every element.",
      "Parallel recap: 1 / R_T = 1/R1 + 1/R2 + ..., voltage the same on every branch.",
    ],
  },
  {
    title: "Worksheet Template",
    paragraphs: [
      "Copy this layout or print it from the guide panel whenever you need a blank sheet.",
      "```\nComponent        | W (Power) | I (Current) | R (Resistance) | E (Voltage)\n-----------------|-----------|-------------|----------------|-----------\nSource / Battery |           |             |                |           \nLoad 1           |           |             |                |           \nLoad 2           |           |             |                |           \nTotals           |           |             |                |           \n```",
    ],
    bullets: [
      "Add extra rows for more loads or branches.",
      "Totals confirm once every component row is solved.",
    ],
  },
  {
    title: "Where to Find It",
    paragraphs: [
      "Load any practice circuit inside the Builder and scroll to the Practice panel to see the interactive W.I.R.E. worksheet.",
      "Use Clear entries to reset your work and Reveal totals to compare against the simulator once you finish.",
      "Need a paper copy? Tap the Table Method Guide button again and print this view.",
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
      "Space - toggle the builder menu",
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
    bullets: ["H - reset camera", "F - fit to screen", "G - toggle grid"],
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
      "Branding overlay can be toggled inside the interface.",
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

const HELP_VIEW_CONTENT: Record<
  HelpModalView,
  {
    title: string;
    description?: string;
    sections: HelpSection[];
    showLegend?: boolean;
  }
> = {
  overview: {
    title: "CircuiTry3D Help Center",
    description:
      "Browse quick-start advice, navigation tips, and the W.I.R.E. legend.",
    sections: HELP_SECTIONS,
    showLegend: true,
  },
  tutorial: {
    title: "Guided Tutorial",
    description:
      "Follow the guided walkthrough tailored for the modern interface.",
    sections: TUTORIAL_SECTIONS,
  },
  "wire-guide": {
    title: "W.I.R.E. Guide",
    description:
      "Understand how Watts, Current, Resistance, and Voltage relate while you design.",
    sections: WIRE_GUIDE_SECTIONS,
  },
  schematic: {
    title: "Schematic Layout Guide",
    description:
      "Apply industry schematic standards while wiring inside the Builder.",
    sections: SCHEMATIC_SECTIONS,
  },
  practice: {
    title: "Table Method Worksheet",
    description:
      "Log the givens, pick the matching formula, and solve every W.I.R.E. slot step by step.",
    sections: TABLE_METHOD_SECTIONS,
  },
  shortcuts: {
    title: "Keyboard & Gesture Shortcuts",
    description:
      "Reference the complete set of controls for desktop and mobile builders.",
    sections: SHORTCUT_SECTIONS,
  },
  about: {
    title: "About CircuiTry3D",
    description:
      "Review feature highlights, learning goals, and support resources.",
    sections: ABOUT_SECTIONS,
  },
};

const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "practice",
    label: "Table Method Worksheet",
    description:
      "Open the W.I.R.E. table method steps plus a printable worksheet.",
    view: "practice",
  },
  {
    id: "tutorial",
    label: "Guided Tutorial",
    description: "Step-by-step quick start for the onboarding flow.",
    view: "tutorial",
  },
  {
    id: "wire-guide",
    label: "W.I.R.E. Guide",
    description:
      "Break down Watts, Current, Resistance, and Voltage in detail.",
    view: "wire-guide",
  },
  {
    id: "schematic",
    label: "Schematic Standards",
    description:
      "Reference best practices for clean, recognisable circuit diagrams.",
    view: "schematic",
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    description:
      "Look up every keyboard, mouse, and touch shortcut in one place.",
    view: "shortcuts",
  },
  {
    id: "about",
    label: "About CircuiTry3D",
    description:
      "Learn what is new in v2.5 and how the simulator supports teaching.",
    view: "about",
  },
  {
    id: "help-center",
    label: "Help Center",
    description:
      "Open quick-start tips, navigation help, and the W.I.R.E. legend.",
    view: "overview",
  },
];

const WIRE_LEGEND: HelpLegendItem[] = [
  { id: "watts", letter: "W", label: "Wattage" },
  { id: "current", letter: "I", label: "Current" },
  { id: "resistance", letter: "R", label: "Resistance" },
  { id: "voltage", letter: "E", label: "Voltage" },
];

type IconProps = {
  className?: string;
};

const IconTrash = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12.75 5.5h-5.5m-1.25 0h8m-1 0-.65 9.16a1.5 1.5 0 0 1-1.49 1.34h-2.32a1.5 1.5 0 0 1-1.49-1.34L6.5 5.5m3.5 3.25v4.75m-2-4.75v4.75m4-4.75v4.75"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPlay = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="m8 6.25 6.25 3.75L8 13.75V6.25Z" />
  </svg>
);

function subscribeToMediaQuery(
  query: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) {
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
  const pendingArenaRequests = useRef<Map<string, { openWindow: boolean }>>(
    new Map(),
  );
  const simulationPulseTimer = useRef<number | null>(null);
  const helpSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const floatingLogoRef = useRef<HTMLDivElement | null>(null);
  const floatingLogoAnimationRef = useRef<number | null>(null);
  const [isFrameReady, setFrameReady] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [requestedHelpSection, setRequestedHelpSection] = useState<
    string | null
  >(null);
  const [helpView, setHelpView] = useState<HelpModalView>("overview");
  const [isLeftMenuOpen, setLeftMenuOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });
  const [isRightMenuOpen, setRightMenuOpen] = useState(false);
  const [isBottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [activeQuickTool, setActiveQuickTool] =
    useState<BuilderToolId>("select");
  const [modeState, setModeState] = useState<LegacyModeState>({
    isWireMode: false,
    isRotateMode: false,
    isMeasureMode: false,
    currentFlowStyle: "misty",
    showPolarityIndicators: true,
    layoutMode: "free",
    wireRoutingMode: "freeform",
    showGrid: true,
    showLabels: true,
  });
  const [isSimulatePulsing, setSimulatePulsing] = useState(false);
  const [arenaExportStatus, setArenaExportStatus] =
    useState<ArenaExportStatus>("idle");
  const [arenaExportError, setArenaExportError] = useState<string | null>(null);
  const [lastArenaExport, setLastArenaExport] =
    useState<ArenaExportSummary | null>(null);
  const [isArenaPanelOpen, setArenaPanelOpen] = useState(false);
  const [isPracticePanelOpen, setPracticePanelOpen] = useState(false);
  const [isSchematicPanelOpen, setSchematicPanelOpen] = useState(false);
  const [schematicStandard, setSchematicStandard] = useState<SymbolStandard>(
    DEFAULT_SYMBOL_STANDARD,
  );
  const [activePracticeProblemId, setActivePracticeProblemId] = useState<
    string | null
  >(DEFAULT_PRACTICE_PROBLEM?.id ?? null);
  const [practiceWorksheetState, setPracticeWorksheetState] =
    useState<PracticeWorksheetStatus | null>(null);
  const [logoSettings, setLogoSettings] = useState<BuilderLogoSettings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LOGO_SETTINGS;
    }

    try {
      const stored = window.localStorage.getItem(LOGO_SETTINGS_STORAGE_KEY);
      if (!stored) {
        return DEFAULT_LOGO_SETTINGS;
      }

      const parsed = JSON.parse(stored) as Partial<BuilderLogoSettings>;
      return {
        speed: clamp(
          typeof parsed.speed === "number"
            ? parsed.speed
            : DEFAULT_LOGO_SETTINGS.speed,
          6,
          60,
        ),
        travelX: clamp(
          typeof parsed.travelX === "number"
            ? parsed.travelX
            : DEFAULT_LOGO_SETTINGS.travelX,
          10,
          100,
        ),
        travelY: clamp(
          typeof parsed.travelY === "number"
            ? parsed.travelY
            : DEFAULT_LOGO_SETTINGS.travelY,
          10,
          100,
        ),
        bounce: clamp(
          typeof parsed.bounce === "number"
            ? parsed.bounce
            : DEFAULT_LOGO_SETTINGS.bounce,
          0,
          120,
        ),
        opacity: clamp(
          typeof parsed.opacity === "number"
            ? parsed.opacity
            : DEFAULT_LOGO_SETTINGS.opacity,
          0,
          100,
        ),
        isVisible:
          typeof parsed.isVisible === "boolean"
            ? parsed.isVisible
            : DEFAULT_LOGO_SETTINGS.isVisible,
      };
    } catch {
      return DEFAULT_LOGO_SETTINGS;
    }
  });
  const [isLogoSettingsOpen, setLogoSettingsOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return false;
      }

      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
  );
  const practiceProblemRef = useRef<string | null>(
    DEFAULT_PRACTICE_PROBLEM?.id ?? null,
  );
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
        const tool =
          typeof (payload as { tool?: string })?.tool === "string"
            ? (payload as { tool?: string }).tool
            : undefined;
        if (tool === "wire" || tool === "measure") {
          setActiveQuickTool(tool);
        } else {
          setActiveQuickTool("select");
        }

        setModeState((previous) => ({
          ...previous,
          isWireMode: tool === "wire",
          isMeasureMode: tool === "measure",
          isRotateMode: tool === "rotate",
        }));
        return;
      }

      if (type === "legacy:mode-state") {
        if (!payload || typeof payload !== "object") {
          return;
        }

        const next = payload as Partial<LegacyModeState>;
        setModeState((previous) => ({
          ...previous,
          isWireMode:
            typeof next.isWireMode === "boolean"
              ? next.isWireMode
              : previous.isWireMode,
          isRotateMode:
            typeof next.isRotateMode === "boolean"
              ? next.isRotateMode
              : previous.isRotateMode,
          isMeasureMode:
            typeof next.isMeasureMode === "boolean"
              ? next.isMeasureMode
              : previous.isMeasureMode,
          currentFlowStyle:
            typeof next.currentFlowStyle === "string" &&
            next.currentFlowStyle.trim() !== ""
              ? next.currentFlowStyle
              : previous.currentFlowStyle,
          showPolarityIndicators:
            typeof next.showPolarityIndicators === "boolean"
              ? next.showPolarityIndicators
              : previous.showPolarityIndicators,
          layoutMode:
            typeof next.layoutMode === "string" && next.layoutMode.trim() !== ""
              ? next.layoutMode
              : previous.layoutMode,
          wireRoutingMode:
            typeof next.wireRoutingMode === "string" &&
            next.wireRoutingMode.trim() !== ""
              ? next.wireRoutingMode
              : previous.wireRoutingMode,
          showGrid:
            typeof next.showGrid === "boolean"
              ? next.showGrid
              : previous.showGrid,
          showLabels:
            typeof next.showLabels === "boolean"
              ? next.showLabels
              : previous.showLabels,
        }));
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

          const requestId =
            typeof summary.requestId === "string"
              ? summary.requestId
              : undefined;
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
        const errorPayload = (payload || {}) as {
          message?: string;
          requestId?: string;
        };
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
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(motionQuery.matches);
    return subscribeToMediaQuery(motionQuery, handleMotionChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        LOGO_SETTINGS_STORAGE_KEY,
        JSON.stringify(logoSettings),
      );
    } catch {
      // Ignore storage write failures (private browsing, quota, etc.)
    }
  }, [logoSettings]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setLogoSettingsOpen(false);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
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

    const detachLargeScreen = subscribeToMediaQuery(
      largeScreenQuery,
      handleLargeScreen,
    );
    const detachCompactScreen = subscribeToMediaQuery(
      compactScreenQuery,
      handleCompactScreen,
    );

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
    if (!isArenaPanelOpen && !isPracticePanelOpen && !isSchematicPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isArenaPanelOpen) {
          setArenaPanelOpen(false);
        }
        if (isPracticePanelOpen) {
          setPracticePanelOpen(false);
        }
        if (isSchematicPanelOpen) {
          setSchematicPanelOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isArenaPanelOpen, isPracticePanelOpen, isSchematicPanelOpen]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = floatingLogoRef.current;
    if (!element) {
      return;
    }

    if (floatingLogoAnimationRef.current !== null) {
      cancelAnimationFrame(floatingLogoAnimationRef.current);
      floatingLogoAnimationRef.current = null;
    }

    const normalizedOpacity = clamp(logoSettings.opacity, 0, 100) / 100;

    if (!logoSettings.isVisible || normalizedOpacity <= 0) {
      element.style.display = "none";
      element.style.opacity = "0";
      element.style.textShadow = "none";
      element.style.transform = "translateX(-50%) translateY(-50%)";
      return;
    }

    element.style.display = "";
    element.style.opacity = normalizedOpacity.toFixed(2);

    if (prefersReducedMotion) {
      const staticPrimary = 0.38 * normalizedOpacity;
      const staticSecondary = 0.24 * normalizedOpacity;
      element.style.transform = "translateX(-50%) translateY(-50%)";
      element.style.textShadow = `0 0 44px rgba(0, 255, 136, ${Math.max(0, staticPrimary).toFixed(2)}), 0 0 68px rgba(136, 204, 255, ${Math.max(
        0,
        staticSecondary,
      ).toFixed(2)})`;
      return;
    }

    let frameId: number;
    let previousTimestamp: number | null = null;
    let angle = 0;

    const animate = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;

      const orbitDuration = Math.max(logoSettings.speed, 4);
      angle =
        (angle + (deltaSeconds * (Math.PI * 2)) / orbitDuration) %
        (Math.PI * 2);

      const viewportWidth = window.innerWidth || 1440;
      const viewportHeight = window.innerHeight || 900;

      const horizontalMargin = 160;
      const verticalMargin = 200;

      const maxHorizontal = Math.max(
        0,
        (viewportWidth - horizontalMargin * 2) / 2,
      );
      const maxVertical = Math.max(
        0,
        (viewportHeight - verticalMargin * 2) / 2,
      );

      const amplitudeX =
        maxHorizontal * (clamp(logoSettings.travelX, 10, 100) / 100);
      const amplitudeY =
        maxVertical * (clamp(logoSettings.travelY, 10, 100) / 100);

      const orbitX = Math.cos(angle) * amplitudeX;
      const orbitY = Math.sin(angle) * amplitudeY;

      const bounceStrength = clamp(logoSettings.bounce, 0, 120);
      const bounceWave = Math.sin(angle * 2);
      const bounceOffset = bounceWave * bounceStrength;
      const tilt = bounceWave * 5.8;
      const scale = 1 + bounceWave * (bounceStrength / 360);

      const translateX = orbitX;
      const translateY = orbitY + bounceOffset;

      element.style.transform = `translateX(calc(-50% + ${translateX.toFixed(1)}px)) translateY(calc(-50% + ${translateY.toFixed(
        1,
      )}px)) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      const glowPrimary =
        (0.34 + Math.sin(angle * 1.7) * 0.12) * normalizedOpacity;
      const glowSecondary =
        (0.2 + Math.sin(angle * 2.3 + Math.PI / 4) * 0.08) * normalizedOpacity;
      element.style.textShadow = `0 0 44px rgba(0, 255, 136, ${Math.max(0, glowPrimary).toFixed(2)}), 0 0 68px rgba(136, 204, 255, ${Math.max(
        0,
        glowSecondary,
      ).toFixed(2)})`;

      frameId = window.requestAnimationFrame(animate);
      floatingLogoAnimationRef.current = frameId;
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      floatingLogoAnimationRef.current = null;
    };
  }, [logoSettings, prefersReducedMotion]);

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
    [isFrameReady],
  );

  useEffect(() => {
    if (!isFrameReady) {
      return;
    }

    postToBuilder(
      { type: "builder:request-mode-state" },
      { allowQueue: false },
    );
  }, [isFrameReady, postToBuilder]);

  const triggerBuilderAction = useCallback(
    (action: BuilderInvokeAction, data?: Record<string, unknown>) => {
      postToBuilder({
        type: "builder:invoke-action",
        payload: { action, data },
      });
    },
    [postToBuilder],
  );

  const triggerSimulationPulse = useCallback(() => {
    if (simulationPulseTimer.current !== null) {
      window.clearTimeout(simulationPulseTimer.current);
    }
    setSimulatePulsing(true);
    simulationPulseTimer.current = window.setTimeout(() => {
      setSimulatePulsing(false);
      simulationPulseTimer.current = null;
    }, 1200);
  }, []);

  const handleArenaSync = useCallback(
    (
      options: {
        openWindow?: boolean;
        sessionName?: string;
        testVariables?: Record<string, unknown>;
      } = {},
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
    [postToBuilder],
  );

  const openHelpCenter = useCallback(
    (view: HelpModalView = "overview", sectionTitle?: string) => {
      setHelpView(view);
      setHelpOpen(true);
      setRequestedHelpSection(
        view === "overview" ? (sectionTitle ?? null) : null,
      );
    },
    [],
  );

  const handlePracticeProblemChange = useCallback(
    (problem: PracticeProblem) => {
      setActivePracticeProblemId(problem.id);
      setPracticeWorksheetState((previous) =>
        previous?.problemId === problem.id
          ? previous
          : { problemId: problem.id, complete: false },
      );

      const previousId = practiceProblemRef.current;
      if (problem.presetHint && previousId !== problem.id) {
        triggerBuilderAction("load-preset", { preset: problem.presetHint });
      }
      practiceProblemRef.current = problem.id;
    },
    [triggerBuilderAction],
  );

  const handlePracticeWorksheetStatusChange = useCallback(
    (update: { problem: PracticeProblem; complete: boolean }) => {
      setPracticeWorksheetState({
        problemId: update.problem.id,
        complete: update.complete,
      });
      practiceProblemRef.current = update.problem.id;
    },
    [],
  );

  const handlePracticeAction = useCallback(
    (action: PanelAction) => {
      if (action.action === "open-arena") {
        setArenaPanelOpen(true);
        handleArenaSync({ openWindow: false, sessionName: "Builder Hand-off" });
        return;
      }
      if (action.action === "practice-help") {
        openHelpCenter("practice");
        return;
      }
      if (action.action === "generate-practice") {
        triggerBuilderAction(action.action, action.data);
        const randomProblem = getRandomPracticeProblem();
        if (randomProblem) {
          practiceProblemRef.current = randomProblem.id;
          setActivePracticeProblemId(randomProblem.id);
          setPracticeWorksheetState({
            problemId: randomProblem.id,
            complete: false,
          });
          if (randomProblem.presetHint) {
            triggerBuilderAction("load-preset", {
              preset: randomProblem.presetHint,
            });
          }
          setPracticePanelOpen(true);
        }
        return;
      }
      triggerBuilderAction(action.action, action.data);
    },
    [handleArenaSync, openHelpCenter, setArenaPanelOpen, triggerBuilderAction],
  );

  const openLastArenaSession = useCallback(() => {
    if (!lastArenaExport?.sessionId) {
      return;
    }
    setArenaPanelOpen(true);
  }, [lastArenaExport, setArenaPanelOpen]);

  const updateLogoSetting = useCallback(
    (key: LogoNumericSettingKey, value: number) => {
      setLogoSettings((previous) => {
        const nextValue = (() => {
          switch (key) {
            case "speed":
              return clamp(value, 6, 60);
            case "travelX":
            case "travelY":
              return clamp(value, 10, 100);
            case "opacity":
              return clamp(value, 0, 100);
            case "bounce":
            default:
              return clamp(value, 0, 120);
          }
        })();

        if (previous[key] === nextValue) {
          return previous;
        }

        return { ...previous, [key]: nextValue };
      });
    },
    [],
  );

  const setLogoVisibility = useCallback((visible: boolean) => {
    setLogoSettings((previous) => {
      if (previous.isVisible === visible) {
        return previous;
      }

      return { ...previous, isVisible: visible };
    });
  }, []);

  const resetLogoSettings = useCallback(() => {
    setLogoSettings((previous) => {
      const defaults = { ...DEFAULT_LOGO_SETTINGS };
      if (
        previous.speed === defaults.speed &&
        previous.travelX === defaults.travelX &&
        previous.travelY === defaults.travelY &&
        previous.bounce === defaults.bounce &&
        previous.opacity === defaults.opacity &&
        previous.isVisible === defaults.isVisible
      ) {
        return previous;
      }

      return defaults;
    });
  }, []);

  const toggleLogoSettingsPanel = useCallback(() => {
    setLogoSettingsOpen((open) => !open);
  }, []);

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
    [postToBuilder],
  );

  const handleQuickAction = useCallback(
    (quickAction: QuickAction) => {
      triggerBuilderAction(quickAction.action, quickAction.data);

      if (quickAction.kind === "tool" && quickAction.tool) {
        setActiveQuickTool(quickAction.tool);
      }

      if (quickAction.id === "simulate") {
        triggerSimulationPulse();
      }
    },
    [triggerBuilderAction, triggerSimulationPulse],
  );

  const handleClearWorkspace = useCallback(() => {
    triggerBuilderAction("clear-workspace");
  }, [triggerBuilderAction]);

  const handleRunSimulationClick = useCallback(() => {
    triggerBuilderAction("run-simulation");
    triggerSimulationPulse();
  }, [triggerBuilderAction, triggerSimulationPulse]);

  const arenaStatusMessage = useMemo(() => {
    switch (arenaExportStatus) {
      case "exporting":
        return "Exporting current build to Component Arena...";
      case "ready": {
        if (!lastArenaExport) {
          return "Component Arena export is ready.";
        }
        const exportedTime = lastArenaExport.exportedAt
          ? new Date(lastArenaExport.exportedAt)
          : null;
        const formattedTime =
          exportedTime && !Number.isNaN(exportedTime.getTime())
            ? exportedTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;
        const componentLabel =
          typeof lastArenaExport.componentCount === "number"
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

  const practiceWorksheetMessage = useMemo(() => {
    const currentId =
      activePracticeProblemId ?? DEFAULT_PRACTICE_PROBLEM?.id ?? null;
    if (!currentId) {
      return "Select a practice problem to start the guided worksheet.";
    }

    const problem = findPracticeProblemById(currentId);
    if (!problem) {
      return "Select a practice problem to start the guided worksheet.";
    }

    if (
      practiceWorksheetState?.problemId === problem.id &&
      practiceWorksheetState.complete
    ) {
      return `Worksheet complete for ${problem.title}. Tap Next Problem to load the next circuit.`;
    }

    return `Complete the worksheet for ${problem.title} to unlock the next challenge.`;
  }, [activePracticeProblemId, practiceWorksheetState]);

  const schematicStandardLabel = useMemo(
    () =>
      SYMBOL_STANDARD_OPTIONS.find((option) => option.key === schematicStandard)
        ?.label ?? "ANSI/IEEE",
    [schematicStandard],
  );

  const isArenaSyncing = arenaExportStatus === "exporting";
  const canOpenLastArena = Boolean(lastArenaExport?.sessionId);

  const leftFloatingOffset =
    "calc(clamp(16px, 4vw, 48px) + env(safe-area-inset-left, 0px))";
  const rightFloatingOffset =
    "calc(clamp(16px, 4vw, 48px) + env(safe-area-inset-right, 0px))";

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled
    ? "Workspace is still loading"
    : undefined;
  const builderFrameSrc = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}legacy.html?embed=builder`;
  }, []);
  const activeHelpContent = HELP_VIEW_CONTENT[helpView];
  const layoutModeNames: Record<string, string> = {
    free: "Free",
    square: "Square",
    linear: "Linear",
  };
  const wireRoutingNames: Record<string, string> = {
    freeform: "Freeform",
    manhattan: "Schematic 90deg",
    simple: "Simple",
    perimeter: "Perimeter",
    astar: "A* Auto",
  };
  const normalizedLayoutKey =
    typeof modeState.layoutMode === "string"
      ? modeState.layoutMode.toLowerCase()
      : "";
  const normalizedRoutingKey =
    typeof modeState.wireRoutingMode === "string"
      ? modeState.wireRoutingMode.toLowerCase()
      : "";
  const layoutModeLabel =
    layoutModeNames[normalizedLayoutKey] ?? modeState.layoutMode ?? "Unknown";
  const wireRoutingLabel =
    wireRoutingNames[normalizedRoutingKey] ??
    modeState.wireRoutingMode ??
    "Unknown";
  const currentFlowLabel =
    modeState.currentFlowStyle === "solid" ? "Current Flow" : "Electron Flow";
  const isWireToolActive = modeState.isWireMode;
  const isCurrentFlowSolid = modeState.currentFlowStyle === "solid";
  const wireRoutingTitle = isWireToolActive
    ? `Wire tool active - routing style set to ${wireRoutingLabel}.`
    : `Wire tool inactive - routing preset is ${wireRoutingLabel}.`;
  const currentFlowTitle = isCurrentFlowSolid
    ? "Current flow visualisation active."
    : "Electron flow visualisation active.";

  const renderHelpParagraph = (paragraph: string, key: string) => {
    const trimmed = paragraph.trim();
    if (
      trimmed.startsWith("```") &&
      trimmed.endsWith("```") &&
      trimmed.length >= 6
    ) {
      const content = trimmed.slice(3, -3).trimEnd();
      return (
        <pre key={key} className="help-code">
          {content}
        </pre>
      );
    }

    const lines = paragraph.split("\n");
    return (
      <p key={key}>
        {lines.map((line, lineIndex) => (
          <Fragment key={`${key}-line-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    );
  };

  return (
    <div className="builder-shell">
      <div className="builder-logo-header">
        <div className="builder-logo-text" aria-label="CircuiTry3D">
          <span className="builder-logo-circui">Circui</span>
          <span className="builder-logo-try">Try</span>
          <span className="builder-logo-3d">3D</span>
        </div>
      </div>

      <div
        className={`builder-menu-stage builder-menu-stage-left${isLeftMenuOpen ? " open" : ""}`}
      >
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-left"
          onClick={() => setLeftMenuOpen((open) => !open)}
          aria-expanded={isLeftMenuOpen}
          aria-label={
            isLeftMenuOpen
              ? "Collapse component library"
              : "Expand component library"
          }
          title={
            isLeftMenuOpen
              ? "Collapse component library"
              : "Expand component library"
          }
        >
          <span className="toggle-icon">{isLeftMenuOpen ? "<" : ">"}</span>
          <span className="toggle-text">Library</span>
        </button>
        <nav
          className="builder-menu builder-menu-left"
          role="navigation"
          aria-label="Component and wiring controls"
        >
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
                    title={
                      controlsDisabled ? controlDisabledTitle : component.label
                    }
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
                  const isActive =
                    action.kind === "tool" && action.tool === activeQuickTool;
                  const isSimulation = action.id === "simulate";
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() => handleQuickAction(action)}
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      aria-pressed={
                        action.kind === "tool" ? isActive : undefined
                      }
                      data-active={
                        action.kind === "tool" && isActive ? "true" : undefined
                      }
                      data-pulse={
                        isSimulation && isSimulatePulsing ? "true" : undefined
                      }
                      title={
                        controlsDisabled
                          ? controlDisabledTitle
                          : action.description
                      }
                    >
                      <span className="slider-label">{action.label}</span>
                      <span className="slider-description">
                        {action.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Schematic Mode</span>
              <div className="slider-stack">
                <button
                  type="button"
                  className="slider-btn slider-btn-stacked"
                  onClick={() => setSchematicPanelOpen(true)}
                  title="Open the 3D schematic workspace"
                >
                  <span className="slider-label">Launch Builder</span>
                  <span className="slider-description">
                    Place ANSI/IEC symbols on the snap grid
                  </span>
                </button>
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Wire Modes</span>
              <div className="slider-stack">
                {WIRE_TOOL_ACTIONS.map((action) => {
                  const isWireToggle = action.action === "toggle-wire-mode";
                  const isRotateToggle = action.action === "toggle-rotate-mode";
                  const isActionActive =
                    (isWireToggle && modeState.isWireMode) ||
                    (isRotateToggle && modeState.isRotateMode);
                  const description = (() => {
                    if (isWireToggle) {
                      return modeState.isWireMode
                        ? "Wire tool active"
                        : "Activate wire mode to sketch connections";
                    }
                    if (isRotateToggle) {
                      return modeState.isRotateMode
                        ? "Rotate mode active"
                        : "Rotate the active component";
                    }
                    return action.description;
                  })();

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() =>
                        triggerBuilderAction(action.action, action.data)
                      }
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      title={
                        controlsDisabled
                          ? controlDisabledTitle
                          : action.description
                      }
                      data-active={isActionActive ? "true" : undefined}
                      aria-pressed={
                        isWireToggle || isRotateToggle
                          ? isActionActive
                          : undefined
                      }
                    >
                      <span className="slider-label">{action.label}</span>
                      <span className="slider-description">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div
        className={`builder-menu-stage builder-menu-stage-right${isRightMenuOpen ? " open" : ""}`}
      >
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-right"
          onClick={() => setRightMenuOpen((open) => !open)}
          aria-expanded={isRightMenuOpen}
          aria-label={
            isRightMenuOpen
              ? "Collapse mode and view controls"
              : "Expand mode and view controls"
          }
          title={
            isRightMenuOpen
              ? "Collapse mode and view controls"
              : "Expand mode and view controls"
          }
        >
          <span className="toggle-icon">{isRightMenuOpen ? ">" : "<"}</span>
          <span className="toggle-text">Controls</span>
        </button>
        <nav
          className="builder-menu builder-menu-right"
          role="complementary"
          aria-label="Mode and view controls"
        >
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
                {CURRENT_MODE_ACTIONS.map((action) => {
                  const isFlowToggle = action.action === "toggle-current-flow";
                  const isPolarityToggle = action.action === "toggle-polarity";
                  const isLayoutCycle = action.action === "cycle-layout";
                  const isActionActive = isFlowToggle
                    ? modeState.currentFlowStyle === "solid"
                    : isPolarityToggle
                      ? modeState.showPolarityIndicators
                      : false;

                  const description = (() => {
                    if (isFlowToggle) {
                      return `${currentFlowLabel} visualisation active`;
                    }
                    if (isPolarityToggle) {
                      return modeState.showPolarityIndicators
                        ? "Polarity markers visible"
                        : "Polarity markers hidden";
                    }
                    if (isLayoutCycle) {
                      return `Current layout: ${layoutModeLabel}`;
                    }
                    return action.description;
                  })();

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() =>
                        triggerBuilderAction(action.action, action.data)
                      }
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      title={
                        controlsDisabled
                          ? controlDisabledTitle
                          : action.description
                      }
                      data-active={isActionActive ? "true" : undefined}
                      aria-pressed={
                        isFlowToggle || isPolarityToggle
                          ? isActionActive
                          : undefined
                      }
                    >
                      <span className="slider-label">{action.label}</span>
                      <span className="slider-description">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">View</span>
              <div className="slider-stack">
                {VIEW_CONTROL_ACTIONS.map((action) => {
                  const isGridToggle = action.action === "toggle-grid";
                  const isLabelToggle = action.action === "toggle-labels";
                  const isActionActive =
                    (isGridToggle && modeState.showGrid) ||
                    (isLabelToggle && modeState.showLabels);
                  const description = (() => {
                    if (isGridToggle) {
                      return modeState.showGrid
                        ? "Grid visible"
                        : "Grid hidden";
                    }
                    if (isLabelToggle) {
                      return modeState.showLabels
                        ? "Labels shown"
                        : "Labels hidden";
                    }
                    return action.description;
                  })();

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() =>
                        triggerBuilderAction(action.action, action.data)
                      }
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      title={
                        controlsDisabled
                          ? controlDisabledTitle
                          : action.description
                      }
                      data-active={isActionActive ? "true" : undefined}
                      aria-pressed={
                        isGridToggle || isLabelToggle
                          ? isActionActive
                          : undefined
                      }
                    >
                      <span className="slider-label">{action.label}</span>
                      <span className="slider-description">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div
        className={`builder-menu-stage builder-menu-stage-bottom${isBottomMenuOpen ? " open" : ""}`}
      >
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-bottom"
          onClick={() => setBottomMenuOpen((open) => !open)}
          aria-expanded={isBottomMenuOpen}
          aria-label={
            isBottomMenuOpen
              ? "Collapse analysis and guidance"
              : "Expand analysis and guidance"
          }
          title={
            isBottomMenuOpen
              ? "Collapse analysis and guidance"
              : "Expand analysis and guidance"
          }
        >
          <span className="toggle-icon">{isBottomMenuOpen ? "v" : "^"}</span>
          <span className="toggle-text">Insights</span>
        </button>
        <nav
          className="builder-menu builder-menu-bottom"
          role="navigation"
          aria-label="Analysis, practice, and guides"
        >
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
                <div
                  role="status"
                  style={{
                    fontSize: "11px",
                    color: "rgba(200, 236, 255, 0.8)",
                    textAlign: "center",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(136, 204, 255, 0.22)",
                    background: "rgba(18, 36, 66, 0.48)",
                  }}
                >
                  {practiceWorksheetMessage}
                </div>
                {PRACTICE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => handlePracticeAction(action)}
                    disabled={
                      controlsDisabled ||
                      (action.action === "open-arena" && isArenaSyncing)
                    }
                    aria-disabled={
                      controlsDisabled ||
                      (action.action === "open-arena" && isArenaSyncing)
                    }
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
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => setPracticePanelOpen(true)}
                  title={practiceWorksheetMessage}
                  data-complete={
                    practiceWorksheetState &&
                    activePracticeProblemId &&
                    practiceWorksheetState.problemId ===
                      activePracticeProblemId &&
                    practiceWorksheetState.complete
                      ? "true"
                      : undefined
                  }
                >
                  <span className="slider-chip-label">Practice Worksheets</span>
                </button>
                {PRACTICE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => {
                      triggerBuilderAction("load-preset", {
                        preset: scenario.preset,
                      });
                      const problem = scenario.problemId
                        ? findPracticeProblemById(scenario.problemId)
                        : findPracticeProblemByPreset(scenario.preset);
                      if (problem) {
                        practiceProblemRef.current = problem.id;
                        setActivePracticeProblemId(problem.id);
                        setPracticeWorksheetState({
                          problemId: problem.id,
                          complete: false,
                        });
                      }
                      setPracticePanelOpen(true);
                    }}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : scenario.question
                    }
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
              <span className="slider-heading">Settings</span>
              <div className="slider-stack">
                {SETTINGS_ITEMS.map((setting) => {
                  const description = setting.getDescription(modeState, {
                    currentFlowLabel,
                  });
                  const isActive = setting.isActive?.(modeState) ?? false;
                  return (
                    <button
                      key={setting.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() =>
                        triggerBuilderAction(setting.action, setting.data)
                      }
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      aria-pressed={setting.isActive ? isActive : undefined}
                      data-active={
                        setting.isActive && isActive ? "true" : undefined
                      }
                      title={
                        controlsDisabled ? controlDisabledTitle : description
                      }
                      data-intent="settings"
                    >
                      <span className="slider-label">{setting.label}</span>
                      <span className="slider-description">{description}</span>
                    </button>
                  );
                })}
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

      <div className="builder-status-bar" role="status" aria-live="polite">
        <span className="status-indicator" aria-hidden="true" />
        <span className="status-message">
          {isFrameReady
            ? "Workspace ready: tap and drag to build."
            : "Loading workspace..."}
        </span>
        <div className="status-pill-group" aria-label="Active modes">
          <span
            className="status-pill"
            data-active={isWireToolActive ? "true" : undefined}
            title={wireRoutingTitle}
          >
            Wire: {wireRoutingLabel}
          </span>
          <span
            className="status-pill"
            data-active={isCurrentFlowSolid ? "true" : undefined}
            title={currentFlowTitle}
          >
            Flow: {currentFlowLabel}
          </span>
        </div>
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

      <div
        className="builder-floating-action builder-floating-action--left"
        style={{ left: leftFloatingOffset }}
      >
        <button
          type="button"
          className="builder-floating-button"
          data-variant="clear"
          onClick={handleClearWorkspace}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          aria-label="Clear workspace"
          title={
            controlsDisabled
              ? controlDisabledTitle
              : "Clear all components, wires, and analysis data"
          }
        >
          <IconTrash className="builder-floating-icon" />
        </button>
      </div>
      <div
        className="builder-floating-action builder-floating-action--right"
        style={{ right: rightFloatingOffset }}
      >
        <button
          type="button"
          className="builder-floating-button"
          data-variant="simulate"
          onClick={handleRunSimulationClick}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          data-pulse={isSimulatePulsing ? "true" : undefined}
          aria-label="Run simulation"
          title={
            controlsDisabled
              ? controlDisabledTitle
              : "Run the current circuit simulation"
          }
        >
          <IconPlay className="builder-floating-icon" />
        </button>
      </div>

      <div
        ref={floatingLogoRef}
        className="builder-floating-logo"
        aria-hidden="true"
      >
        <span className="builder-logo-circui">Circui</span>
        <span className="builder-logo-try">Try</span>
        <span className="builder-logo-3d">3D</span>
      </div>

      <div
        className={`builder-logo-controls${isLogoSettingsOpen ? " open" : ""}`}
      >
        <button
          type="button"
          className={`logo-controls-toggle${isLogoSettingsOpen ? " active" : ""}`}
          onClick={toggleLogoSettingsPanel}
          aria-expanded={isLogoSettingsOpen}
          aria-controls="builder-logo-motion-panel"
        >
          Logo Motion
        </button>
        <div
          id="builder-logo-motion-panel"
          className="builder-logo-settings-panel"
          aria-hidden={!isLogoSettingsOpen}
        >
          <h3>Logo Motion</h3>
          <p className="builder-logo-settings-description">
            Fine-tune how the logo drifts across the workspace.
          </p>
          <div className="builder-logo-setting">
            <label
              id="builder-logo-visible-label"
              htmlFor="builder-logo-visible"
            >
              Display logo
            </label>
            <div className="setting-input">
              <button
                type="button"
                id="builder-logo-visible"
                className={`setting-switch${logoSettings.isVisible ? " on" : ""}`}
                role="switch"
                aria-checked={logoSettings.isVisible}
                aria-labelledby="builder-logo-visible-label"
                onClick={() => setLogoVisibility(!logoSettings.isVisible)}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
              >
                <span className="setting-switch-handle" aria-hidden="true" />
              </button>
              <span className="setting-value">
                {logoSettings.isVisible ? "On" : "Off"}
              </span>
            </div>
          </div>
          <div className="builder-logo-setting">
            <label htmlFor="builder-logo-opacity">Opacity</label>
            <div className="setting-input">
              <input
                id="builder-logo-opacity"
                type="range"
                min={0}
                max={100}
                step={1}
                value={logoSettings.opacity}
                onChange={(event) =>
                  updateLogoSetting("opacity", Number(event.target.value))
                }
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.opacity)} percent opacity`}
              />
              <span className="setting-value">
                {Math.round(logoSettings.opacity)}%
              </span>
            </div>
          </div>
          <div className="builder-logo-setting">
            <label htmlFor="builder-logo-speed">Orbit duration</label>
            <div className="setting-input">
              <input
                id="builder-logo-speed"
                type="range"
                min={6}
                max={60}
                step={1}
                value={logoSettings.speed}
                onChange={(event) =>
                  updateLogoSetting("speed", Number(event.target.value))
                }
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.speed)} second cycle`}
              />
              <span className="setting-value">
                {Math.round(logoSettings.speed)}s
              </span>
            </div>
          </div>
          <div className="builder-logo-setting">
            <label htmlFor="builder-logo-travel-x">Horizontal travel</label>
            <div className="setting-input">
              <input
                id="builder-logo-travel-x"
                type="range"
                min={10}
                max={100}
                step={1}
                value={logoSettings.travelX}
                onChange={(event) =>
                  updateLogoSetting("travelX", Number(event.target.value))
                }
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.travelX)} percent width`}
              />
              <span className="setting-value">
                {Math.round(logoSettings.travelX)}%
              </span>
            </div>
          </div>
          <div className="builder-logo-setting">
            <label htmlFor="builder-logo-travel-y">Vertical travel</label>
            <div className="setting-input">
              <input
                id="builder-logo-travel-y"
                type="range"
                min={10}
                max={100}
                step={1}
                value={logoSettings.travelY}
                onChange={(event) =>
                  updateLogoSetting("travelY", Number(event.target.value))
                }
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.travelY)} percent height`}
              />
              <span className="setting-value">
                {Math.round(logoSettings.travelY)}%
              </span>
            </div>
          </div>
          <div className="builder-logo-setting">
            <label htmlFor="builder-logo-bounce">Bounce intensity</label>
            <div className="setting-input">
              <input
                id="builder-logo-bounce"
                type="range"
                min={0}
                max={120}
                step={1}
                value={logoSettings.bounce}
                onChange={(event) =>
                  updateLogoSetting("bounce", Number(event.target.value))
                }
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.bounce)} pixel bounce`}
              />
              <span className="setting-value">
                {Math.round(logoSettings.bounce)}px
              </span>
            </div>
          </div>
          {prefersReducedMotion ? (
            <p className="builder-logo-settings-note">
              Motion is paused because your system prefers reduced motion.
            </p>
          ) : null}
          <div className="builder-logo-settings-actions">
            <button
              type="button"
              className="logo-settings-reset"
              onClick={resetLogoSettings}
              tabIndex={isLogoSettingsOpen ? 0 : -1}
            >
              Reset defaults
            </button>
          </div>
        </div>
      </div>

      <div
        className={`builder-panel-overlay builder-panel-overlay--schematic${isSchematicPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isSchematicPanelOpen}
        onClick={() => setSchematicPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--schematic"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setSchematicPanelOpen(false)}
            aria-label="Close schematic builder"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--schematic">
            <div className="schematic-overlay-header">
              <div>
                <h2>3D Schematic Builder</h2>
                <p>
                  Using {schematicStandardLabel} symbol profiles. Toggle
                  standards to match your textbook layout.
                </p>
              </div>
              <div
                className="schematic-standard-control"
                role="group"
                aria-label="Schematic symbol standard"
              >
                <span className="schematic-standard-label">
                  Symbol Standard
                </span>
                <div className="schematic-standard-buttons">
                  {SYMBOL_STANDARD_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={
                        schematicStandard === option.key
                          ? "schematic-standard-button is-active"
                          : "schematic-standard-button"
                      }
                      onClick={() => setSchematicStandard(option.key)}
                      title={option.description}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <BuilderModeView symbolStandard={schematicStandard} />
          </div>
        </div>
      </div>

      <div
        className={`builder-panel-overlay${isPracticePanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isPracticePanelOpen}
        onClick={() => setPracticePanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--practice"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setPracticePanelOpen(false)}
            aria-label="Close practice worksheets"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--practice">
            <Practice
              selectedProblemId={activePracticeProblemId}
              onProblemChange={handlePracticeProblemChange}
              onWorksheetStatusChange={handlePracticeWorksheetStatusChange}
            />
          </div>
        </div>
      </div>

      <div
        className={`builder-panel-overlay builder-panel-overlay--arena${isArenaPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isArenaPanelOpen}
        onClick={() => setArenaPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--arena"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setArenaPanelOpen(false)}
            aria-label="Close component arena"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--arena">
            <ArenaView
              variant="embedded"
              onNavigateBack={() => setArenaPanelOpen(false)}
            />
          </div>
        </div>
      </div>

      <div
        className={`builder-help-modal ${isHelpOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isHelpOpen}
        onClick={() => setHelpOpen(false)}
      >
        <div
          className="builder-help-content"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="help-close"
            onClick={() => setHelpOpen(false)}
            aria-label="Close help"
          >
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
          {activeHelpContent.description && (
            <p className="help-description">{activeHelpContent.description}</p>
          )}
          {helpView === "overview" && (
            <div
              className="help-nav"
              role="navigation"
              aria-label="Help section shortcuts"
            >
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
              ref={
                helpView === "overview"
                  ? (element) => {
                      if (element) {
                        helpSectionRefs.current[section.title] = element;
                      } else {
                        delete helpSectionRefs.current[section.title];
                      }
                    }
                  : undefined
              }
            >
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph, paragraphIndex) =>
                renderHelpParagraph(
                  paragraph,
                  `${section.title}-p-${paragraphIndex}`,
                ),
              )}
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
                <div
                  key={legend.id}
                  className={`legend-item ${legend.letter.toLowerCase()}`}
                >
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
