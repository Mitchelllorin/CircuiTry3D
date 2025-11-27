import type {
  ComponentAction,
  QuickAction,
  PanelAction,
  SettingsItem,
  HelpSection,
  HelpEntry,
  HelpLegendItem,
  HelpModalView,
  PracticeScenario,
  BuilderLogoSettings,
} from "./types";

export const LOGO_SETTINGS_STORAGE_KEY = "builder:logo-motion";

export const DEFAULT_LOGO_SETTINGS: BuilderLogoSettings = {
  speed: 28,
  travelX: 70,
  travelY: 55,
  bounce: 28,
  opacity: 15,
  isVisible: true,
};

export const COMPONENT_ACTIONS: ComponentAction[] = [
  {
    id: "battery",
    icon: "B",
    label: "Battery",
    action: "component",
    builderType: "battery",
    description: "Add power source - drives current through the circuit",
  },
  {
    id: "resistor",
    icon: "R",
    label: "Resistor",
    action: "component",
    builderType: "resistor",
    description: "Add resistor - controls current flow and voltage drop",
  },
  {
    id: "capacitor",
    icon: "C",
    label: "Capacitor",
    action: "component",
    builderType: "capacitor",
    description: "Add capacitor - stores electrical energy temporarily",
  },
  {
    id: "inductor",
    icon: "L",
    label: "Inductor",
    action: "component",
    builderType: "inductor",
    description: "Add inductor - stores energy in magnetic field",
  },
  {
    id: "diode",
    icon: "D",
    label: "Diode",
    action: "component",
    builderType: "diode",
    description: "Add diode - one-way current flow control",
  },
  {
    id: "led",
    icon: "LED",
    label: "LED",
    action: "component",
    builderType: "led",
    description: "Add LED - light emitting diode indicator",
  },
  {
    id: "bjt",
    icon: "Q",
    label: "BJT",
    action: "component",
    builderType: "bjt",
    description: "Add transistor - amplification and switching control",
  },
  {
    id: "mosfet",
    icon: "M",
    label: "MOSFET",
    action: "component",
    builderType: "mosfet",
    description: "Add MOSFET - power switching transistor",
  },
  {
    id: "switch",
    icon: "SW",
    label: "Switch",
    action: "component",
    builderType: "switch",
    description: "Add switch - open/close circuit path on demand",
  },
  {
    id: "fuse",
    icon: "F",
    label: "Fuse",
    action: "component",
    builderType: "fuse",
    description: "Add fuse - overcurrent protection device",
  },
  {
    id: "potentiometer",
    icon: "POT",
    label: "Potentiometer",
    action: "component",
    builderType: "potentiometer",
    description: "Add variable resistor - adjustable resistance",
  },
  {
    id: "lamp",
    icon: "LA",
    label: "Lamp",
    action: "component",
    builderType: "lamp",
    description: "Add lamp - visual load indicator with glow effect",
  },
  {
    id: "ground",
    icon: "GND",
    label: "Ground",
    action: "component",
    builderType: "ground",
    description: "Add ground reference - circuit return path",
  },
  { 
    id: "junction", 
    icon: "J", 
    label: "Junction", 
    action: "junction",
    description: "Add junction - branch wires for parallel paths",
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
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

export const WIRE_TOOL_ACTIONS: PanelAction[] = [
  {
    id: "wire-mode",
    label: "Wire Mode",
    description:
      "Switch into wiring mode to pick freeform, schematic (90 deg), star, or auto-routing paths.",
    action: "toggle-wire-mode",
  },
  {
    id: "cycle-routing",
    label: "Cycle Wire Routing",
    description: "Switch between freeform, schematic 90deg, simple, perimeter, and A* routing modes.",
    action: "cycle-wire-routing",
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

export const CURRENT_MODE_ACTIONS: PanelAction[] = [
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

export const VIEW_CONTROL_ACTIONS: PanelAction[] = [
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

export const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: "logo-motion",
    label: "Logo Motion",
    action: "open-logo-settings",
    getDescription: () => "Configure floating logo animation",
    isActive: () => false,
  },
];

export const PRACTICE_SCENARIOS: PracticeScenario[] = [
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

export const PRACTICE_ACTIONS: PanelAction[] = [
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

export const WIRE_METRICS = [
  { id: "watts", letter: "W", label: "Watts", value: "0.0" },
  { id: "current", letter: "I", label: "Current", value: "0.00 A" },
  { id: "resistance", letter: "R", label: "Resistance", value: "0.0 Ohm" },
  { id: "voltage", letter: "E", label: "Voltage", value: "0.0 V" },
];

export const WIRE_LEGEND: HelpLegendItem[] = [
  { id: "watts", letter: "W", label: "Wattage" },
  { id: "current", letter: "I", label: "Current" },
  { id: "resistance", letter: "R", label: "Resistance" },
  { id: "voltage", letter: "E", label: "Voltage" },
];

export const HELP_ENTRIES: HelpEntry[] = [
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
