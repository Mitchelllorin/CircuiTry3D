import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/builder-ui.css";
import "../styles/schematic.css";
import ArenaView from "../components/arena/ArenaView";
import Practice from "./Practice";
import BuilderWorkspace from "../components/schematic/BuilderWorkspace";
import { DEFAULT_SYMBOL_STANDARD, SYMBOL_STANDARD_OPTIONS, SymbolStandard } from "../schematic/standards";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useBuilderFrame } from "../hooks/builder/useBuilderFrame";
import { useLogoAnimation } from "../hooks/builder/useLogoAnimation";
import { useHelpModal } from "../hooks/builder/useHelpModal";
import { useResponsiveLayout } from "../hooks/builder/useResponsiveLayout";
import { useWorkspaceBackground } from "../hooks/builder/useWorkspaceBackground";
import { useDraggablePanel } from "../hooks/builder/useDraggablePanel";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import "../styles/builder-ui.css";
import "../styles/schematic.css";
import "../styles/interactive-tutorial.css";
import "../styles/draggable-panels.css";
import { getSchematicSymbol, type ComponentSymbol } from "../components/circuit/SchematicSymbols";
import BrandMark from "../components/BrandMark";
import WordMark from "../components/WordMark";
import { CompactWorksheetPanel } from "../components/builder/panels/CompactWorksheetPanel";
import { CompactTroubleshootPanel } from "../components/builder/panels/CompactTroubleshootPanel";
import { CompactGuidesPanel } from "../components/builder/panels/CompactGuidesPanel";
import { WorkspaceModePanel } from "../components/builder/panels/WorkspaceModePanel";
import { EnvironmentalPanel } from "../components/builder/panels/EnvironmentalPanel";
import { MeasurementToolsPanel } from "../components/builder/panels/MeasurementToolsPanel";
import { WireLibraryPanel } from "../components/builder/panels/WireLibraryPanel";
import { TroubleshootPanel } from "../components/builder/panels/TroubleshootPanel";
import {
  type EnvironmentalScenario,
  getDefaultScenario,
} from "../data/environmentalScenarios";
import ArenaView from "../components/arena/ArenaView";
import ArcadePage from "./Arcade";
import ClassroomPage from "./Classroom";
import CommunityPage from "./Community";
import AccountPage from "./Account";
import PricingPage from "./Pricing";
import { CircuitSaveModal } from "../components/builder/modals/CircuitSaveModal";
import { CircuitLoadModal } from "../components/builder/modals/CircuitLoadModal";
import { CircuitRecoveryBanner } from "../components/builder/modals/CircuitRecoveryBanner";
import { BuilderInteractiveTutorial } from "../components/builder/tutorial/BuilderInteractiveTutorial";
import { BuilderGuidedTour } from "../components/builder/tutorial/BuilderGuidedTour";
import { BuilderBuildAlong } from "../components/builder/tutorial/BuilderBuildAlong";
import { WorkspaceLogo3D } from "../components/builder/branding/WorkspaceLogo3D";
import {
  CompactSettingsPanel,
  type SettingsPanelTab,
} from "../components/builder/panels/CompactSettingsPanel";
import { useCircuitStorage } from "../context/CircuitStorageContext";
import "../styles/circuit-storage.css";
import { TutorialTip, TutorialControls } from "../components/tutorial";
import { useTutorial } from "../context/TutorialContext";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
  getRandomPracticeProblem,
} from "../data/practiceProblems";
import { WIRE_LIBRARY, WIRE_MATERIALS, type WireMaterialId } from "../data/wireLibrary";
import troubleshootingProblems, {
  type TroubleshootingProblem,
  getAnalyzeCircuitResult,
  isTroubleshootingDiagnosisCorrect,
  isTroubleshootingSolved,
  type TroubleshootingProblem,
} from "../data/troubleshootingProblems";
import type { WireSpec } from "../data/wireLibrary";
import type { PracticeProblem } from "../model/practice";
import type {
  ComponentAction,
  BuilderToolId,
  WorkspaceMode,
  GuideWorkflowId,
  LegacyModeState,
  MeterMode,
  QuickAction,
  HelpSection,
  HelpModalView,
  PracticeWorksheetStatus,
  PanelAction,
} from "../components/builder/types";
import {
  DEFAULT_SYMBOL_STANDARD,
  SYMBOL_STANDARD_OPTIONS,
  type SymbolStandard,
} from "../schematic/standards";
import { COMPONENT_CATALOG } from "../schematic/catalog";
import type { CatalogEntry } from "../schematic/types";

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
    title: "Welcome to CircuiTry3D Help",
    paragraphs: [
      "This Help Center provides quick access to support resources, documentation, and answers to common questions.",
      "Use the navigation buttons below to jump to specific topics, or scroll through for a complete overview.",
    ],
    bullets: [
      "Getting Started - First steps with the circuit builder",
      "W.I.R.E. Guide - Understand electrical fundamentals",
      "Schematic Standards - Professional circuit layout practices",
      "Keyboard & Gestures - Complete controls reference",
      "Troubleshooting - Solutions to common issues",
      "FAQ - Frequently asked questions",
    ],
  },
  {
    title: "Quick Start",
    paragraphs: [
      "Open the Component Library from the left panel, select a component, and place it in the 3D workspace.",
      "Use the Wire Tool to connect component terminals. Choose from multiple routing modes: Freeform, Manhattan (90°), Simple, Perimeter, or A* pathfinding.",
    ],
    bullets: [
      "One-tap actions for adding, rotating, duplicating, or deleting components.",
      "Click existing wires to create junctions and branch into parallel paths.",
      "Monitor circuit health via the W.I.R.E. analysis panel at the bottom.",
      "Save circuits locally or to cloud storage for later access.",
    ],
  },
  {
    title: "Workspace Navigation",
    paragraphs: [
      "Orbit the view with left-click drag, pan with Shift+scroll or right-click, and zoom with scroll wheel or pinch gestures.",
      "Collapse panels when you need more canvas space - toggle buttons remain visible for quick access.",
    ],
    bullets: [
      "Double-click any component to center the camera on it.",
      "Hold Shift while wiring for precision snapping.",
      "Press H to reset the camera view at any time.",
    ],
  },
  {
    title: "Need More Help?",
    paragraphs: [
      "For detailed guidance, use the navigation buttons above to access specific help topics.",
      "The Classroom section (coming soon) will include interactive tutorials and guided lessons for structured learning.",
    ],
    bullets: [
      "Contact support: info@circuitry3d.net",
      "Report issues: github.com/Mitchelllorin/CircuiTry3D",
      "Documentation and updates: circuitry3d.net",
    ],
  },
];

const getNextPracticeProblem = (currentId: string | null) => {
  if (!practiceProblems.length) {
    return null;
  }

  const current = currentId ? findPracticeProblemById(currentId) : null;
  const currentTopology = current?.topology;

  const bucket =
    currentTopology != null
      ? practiceProblems.filter((problem) => problem.topology === currentTopology)
      : practiceProblems;

  const pool = bucket.length ? bucket : practiceProblems;
  if (!pool.length) {
    return null;
  }

  if (!current) {
    return pool[0] ?? null;
  }

  const index = pool.findIndex((problem) => problem.id === current.id);
  if (index === -1) {
    return pool[0] ?? null;
  }

  return pool[(index + 1) % pool.length] ?? null;
};

type BeginnerSeriesPreset = {
  id: string;
  label: string;
  description: string;
  preset: string;
};

const BEGINNER_SERIES_PRESETS: BeginnerSeriesPreset[] = [
  {
    id: "starter-loop",
    label: "Starter Loop",
    description: "Battery + resistor loop for first-time wiring practice.",
    preset: "series_basic",
  },
  {
    id: "voltage-drop-chain",
    label: "Voltage Drop Chain",
    description: "Two resistors in series to compare how voltage divides.",
    preset: "series_voltage_drop",
  },
  {
    id: "led-resistor-starter",
    label: "LED + Resistor Starter",
    description: "Classic LED current-limiter build using a simple series path.",
    preset: "series_led_resistor",
  },
];

const TUTORIAL_SECTIONS: HelpSection[] = [
  {
    title: "Your First Circuit",
    paragraphs: [
      "Building a circuit in CircuiTry3D follows a straightforward workflow: add components, connect them with wires, and run the simulation to see results.",
      "Start by adding a battery (voltage source) from the Components menu, then add a resistor or LED as your load.",
    ],
    bullets: [
      "Quick keys: B (battery), R (resistor), L (LED), S (switch), J (junction).",
      "Need build ideas? Use Library -> Beginner Series Starters to load a preset and remix it.",
      "Wire tool supports freeform, Manhattan (90-deg), simple, perimeter, and A* auto-routing modes.",
      "Analysis panels include W.I.R.E., EIR triangle, power, worksheet, and solve tabs.",
    ],
  },
  {
    title: "Connecting Components",
    paragraphs: [
      "Use the Wire Tool (W key) to connect component terminals. Click a terminal to start a wire, then click the destination terminal to complete the connection.",
      "Choose from multiple routing modes based on your needs: Freeform for quick connections, Manhattan for professional 90° layouts, or A* for automatic pathfinding.",
    ],
    bullets: [
      "Freeform: Direct point-to-point connections",
      "Manhattan (90°): Professional schematic-style right-angle routing",
      "Simple: Minimal path connections",
      "Perimeter: Routes along component edges",
      "A* Auto-routing: Intelligent pathfinding around obstacles",
    ],
  },
  {
    title: "Running Simulations",
    paragraphs: [
      "Once your circuit forms a complete loop, the simulation runs automatically. Watch the W.I.R.E. analysis panel update in real time as current flows through your circuit.",
    ],
    bullets: [
      "Green indicators show optimal performance.",
      "Orange or red highlights identify potential issues.",
      "Hover over metrics for detailed explanations and tips.",
      "Use Electron Flow or Conventional Current visualization modes.",
    ],
  },
  {
    title: "Settings",
    paragraphs: [
      "Save your circuits locally or to cloud storage at any time. Circuits are automatically backed up to prevent data loss.",
    ],
    bullets: [
      "Ctrl+S / Cmd+S: Save current circuit",
      "Ctrl+O / Cmd+O: Open saved circuit",
      "Ctrl+N / Cmd+N: Start a new circuit",
      "Export options available for sharing and documentation",
    ],
  },
  {
    title: "View Settings & Tips",
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
      "The W.I.R.E. method keeps four core electrical values front and centre while you build or solve circuits. Each value has a dedicated color so you can spot it instantly in any panel or worksheet.",
      "Use this solve method: capture known values, choose one unknown, pick the matching formula, then verify with simulation.",
    ],
    bullets: [
      "W - Watts (Power) — color: Blue",
      "I - Current (Amps) — color: Yellow-Orange",
      "R - Resistance (Ohms) — color: Green",
      "E - EMF / Voltage (Volts) — color: Red",
    ],
  },
  {
    title: "Two Separate Color Systems",
    paragraphs: [
      "The app uses two distinct color-coding systems that each serve a different purpose — they do not interfere with each other.",
      "W.I.R.E. label colors (blue/yellow-orange/green/red) identify which electrical quantity you are looking at in the UI panels, worksheets, and legends.",
      "Current flow animation colors are the moving particles in the 3D workspace. Their color shows how much current is flowing and how much resistance a segment has — ranging from dull red (slow/resistive) through orange and yellow to cyan and white (fast/free wire). The particle colors are not related to the W.I.R.E. label colors.",
    ],
    bullets: [
      "W.I.R.E. colors = 'What quantity am I looking at?' (labels only).",
      "Particle animation colors = 'How fast is current flowing through this wire?' (physics visualization only).",
      "Both systems intentionally use a blue/orange/green palette but serve completely different purposes.",
    ],
  },
  {
    title: "W - Watts (Power) — Blue",
    paragraphs: ["Watts describe how much energy a circuit uses each second. Shown in blue throughout the app."],
    bullets: [
      "Formula: W = E × I or W = I^2 × R.",
      "Watch for power changes as you adjust voltage or current.",
      "Higher power means brighter lights and increased heat generation.",
    ],
  },
  {
    title: "I - Current (Amps) — Yellow-Orange",
    paragraphs: ["Current is the flow rate of electrons through the circuit. Shown in yellow-orange throughout the app."],
    bullets: [
      "Formula: I = E / R (Ohm's Law).",
      "Compare electron flow and conventional current visualisations inside the workspace.",
      "Measured in amperes; increasing resistance lowers current for a fixed voltage.",
    ],
  },
  {
    title: "R - Resistance (Ohms) — Green",
    paragraphs: [
      "Resistance opposes current flow and is set by components like resistors and LEDs. Shown in green throughout the app.",
    ],
    bullets: [
      "Formula: R = E / I.",
      "Higher resistance reduces current under the same voltage.",
      "Use resistors to protect LEDs and control current draw.",
    ],
  },
  {
    title: "E - EMF / Voltage (Volts) — Red",
    paragraphs: ["Voltage is the electrical pressure supplied by your source. Shown in red throughout the app."],
    bullets: [
      "Formula: E = I × R.",
      "Raising voltage increases current if resistance stays the same.",
      "Battery components provide the EMF that drives the circuit.",
    ],
  },
  {
    title: "Key Formulas",
    paragraphs: ["Keep the classic triangles in mind when solving problems."],
    bullets: [
      "Ohm's Law triangle (E over I and R) helps rearrange for voltage, current, or resistance.",
      "Power triangle (W over E and I) ties wattage to voltage and current.",
      "Remember: adjusting one value affects the others across the circuit.",
    ],
  },
  {
    title: "Practice Tips",
    paragraphs: [
      "Build small circuits and watch the analysis panel respond in real time.",
    ],
    bullets: [
      "Start by writing known W (blue), I (yellow-orange), R (green), and E (red) values before solving anything.",
      "Solve one unknown at a time and record units to avoid table mistakes.",
      "Add or remove resistors to see how total resistance changes.",
      "Swap battery voltages to explore how EMF affects the rest of the system.",
      "Parallel paths lower total resistance; use Practice mode for guided checks.",
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

const TROUBLESHOOTING_SECTIONS: HelpSection[] = [
  {
    title: "Common Issues",
    paragraphs: [
      "Most circuit problems fall into a few categories. Here are solutions to the most frequently encountered issues.",
    ],
  },
  {
    title: "Circuit Not Running",
    paragraphs: [
      "If your circuit simulation is not running, check for an incomplete loop.",
    ],
    bullets: [
      "Verify all components are connected - look for disconnected terminals.",
      "Ensure there is a complete path from battery positive through components back to battery negative.",
      "Check for broken or missing wire segments.",
      "Use the Wire Tool to reconnect any gaps in the circuit.",
    ],
  },
  {
    title: "No Current Flow Displayed",
    paragraphs: [
      "If you don't see current flow animation but the circuit appears connected:",
    ],
    bullets: [
      "Verify the simulation is running (check the play/pause button).",
      "Ensure Flow Visualization is enabled in View settings.",
      "Check that your battery has a non-zero voltage value.",
      "Confirm resistors have appropriate values (not infinite or zero).",
    ],
  },
  {
    title: "Components Not Connecting",
    paragraphs: [
      "Wire connections require clicking directly on component terminals.",
    ],
    bullets: [
      "Zoom in for better precision when connecting small terminals.",
      "Look for the terminal highlight indicator before clicking.",
      "Try different routing modes if wires are not reaching terminals.",
      "Use junctions (J key) to create connection points for complex layouts.",
    ],
  },
  {
    title: "Performance Issues",
    paragraphs: [
      "If the application runs slowly or is unresponsive:",
    ],
    bullets: [
      "Reduce the number of components in complex circuits.",
      "Disable flow visualization for large circuits.",
      "Close unnecessary browser tabs.",
      "Try refreshing the page if issues persist.",
      "Use a modern browser (Chrome, Firefox, Edge, Safari) for best performance.",
    ],
  },
  {
    title: "Data Recovery",
    paragraphs: [
      "CircuiTry3D automatically saves backup data. If you lose work:",
    ],
    bullets: [
      "Check for auto-recovery prompts when reopening the application.",
      "Look in the Load menu for recently saved circuits.",
      "Browser storage may contain backup data if you didn't clear it.",
    ],
  },
];

const FAQ_SECTIONS: HelpSection[] = [
  {
    title: "General Questions",
    paragraphs: [],
  },
  {
    title: "What is CircuiTry3D?",
    paragraphs: [
      "CircuiTry3D is a browser-based, mobile-first circuit simulator designed for education. It allows students, teachers, and STEM enthusiasts to build and test electronic circuits in real time using an intuitive 3D interface.",
    ],
  },
  {
    title: "Is CircuiTry3D free to use?",
    paragraphs: [
      "CircuiTry3D offers free access to core features. Premium features and educator licenses are available for classrooms and institutions that need additional capabilities.",
    ],
  },
  {
    title: "What devices are supported?",
    paragraphs: [
      "CircuiTry3D works on any modern web browser. It is optimized for both desktop computers (with mouse and keyboard) and mobile devices (with touch controls).",
    ],
    bullets: [
      "Desktop: Chrome, Firefox, Edge, Safari",
      "Mobile: iOS Safari, Android Chrome",
      "Tablet: Full touch support with gesture controls",
    ],
  },
  {
    title: "Do I need to install anything?",
    paragraphs: [
      "No installation required. CircuiTry3D runs entirely in your web browser. Simply visit circuitry3d.net to start building circuits immediately.",
    ],
  },
  {
    title: "Features & Capabilities",
    paragraphs: [],
  },
  {
    title: "What components are available?",
    paragraphs: [
      "CircuiTry3D includes essential circuit components for learning electrical fundamentals:",
    ],
    bullets: [
      "Batteries (voltage sources) with adjustable voltage",
      "Resistors with configurable resistance values",
      "LEDs with forward voltage characteristics",
      "Switches for circuit control",
      "Junctions for branching wire paths",
    ],
  },
  {
    title: "Does it simulate real physics?",
    paragraphs: [
      "CircuiTry3D provides real-time feedback on Watts, Current, Resistance, and Voltage (W.I.R.E.) based on Ohm's Law and power calculations. The simulation is designed for educational clarity rather than professional-grade circuit analysis.",
    ],
  },
  {
    title: "Can I save my circuits?",
    paragraphs: [
      "Yes. Circuits can be saved locally in your browser storage. Cloud storage options are available for users who need to access their work across multiple devices.",
    ],
  },
  {
    title: "For Educators",
    paragraphs: [],
  },
  {
    title: "Can I use this in my classroom?",
    paragraphs: [
      "Absolutely. CircuiTry3D was designed with educators in mind. The visual W.I.R.E. system helps students understand abstract electrical concepts through immediate feedback and color-coded metrics.",
    ],
  },
  {
    title: "Are school licenses available?",
    paragraphs: [
      "Yes. We offer educator and school license tiers with additional features for classroom use. Contact info@circuitry3d.net for licensing information.",
    ],
  },
  {
    title: "Getting Help",
    paragraphs: [],
  },
  {
    title: "How do I report a bug or request a feature?",
    paragraphs: [
      "Visit github.com/Mitchelllorin/CircuiTry3D to report issues or suggest features. You can also email info@circuitry3d.net for direct support.",
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
    paragraphs: [],
    bullets: [
      "W - toggle wire mode",
      "T - toggle rotate mode",
      "Space - toggle the builder menu",
      "Esc - close menus or cancel the active mode",
    ],
  },
  {
    title: "Editing & Files",
    paragraphs: [],
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
    paragraphs: [],
    bullets: ["H - reset camera", "F - fit to screen", "G - toggle grid"],
  },
  {
    title: "Mouse Actions",
    paragraphs: [],
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
    paragraphs: [],
    bullets: [
      "Tap to select, drag to move, and long-press to edit.",
      "Pinch to zoom; two-finger drag to pan the workspace.",
      "Rotate with two fingers to adjust the view on supported devices.",
      "Tap terminals in wire mode to connect and long-press wires to manage branches.",
    ],
  },
  {
    title: "Pro Tips",
    paragraphs: [],
    bullets: [
      "Hold Shift while dragging to temporarily disable grid snapping.",
      "Use arrow keys for fine component positioning.",
      "Scroll wheel zooms by default; hold Shift+scroll to pan.",
      "Double-click (or double-tap) for quick edits, then Space to reveal menus again.",
      "Try this quick sequence: B (battery), R (resistor), W (wire), connect, Space to review.",
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
    paragraphs: [],
    bullets: [
      "Interactive 3D workspace with colour-coded W.I.R.E. metrics.",
      "Components auto-label as B1, R1, LED1, SW1 for quick reference.",
      "Grid snapping can be toggled for freeform placement versus precise layouts.",
    ],
  },
  {
    title: "Visualization",
    paragraphs: [],
    bullets: [
      "Electron flow and conventional current particle systems show movement through wires.",
      "Polarity indicators mark positive and negative terminals at a glance.",
      "Branding overlay can be toggled inside the interface.",
    ],
  },
  {
    title: "Flexible Wiring & Layouts",
    paragraphs: [],
    bullets: [
      "Free-form, Manhattan, square outside, simple, perimeter, and A* routing styles.",
      "Smart junction placement with long-press editing for parallel branches.",
      "Auto-arrange plus free, square, and linear layout modes for presentation-ready circuits.",
    ],
  },
  {
    title: "Educational Tools",
    paragraphs: [],
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
    paragraphs: [],
    bullets: [
      "Desktop: full keyboard and mouse support with high-performance rendering.",
      "Mobile and tablet: touch-optimised gestures, pinch-to-zoom, long-press editing, responsive layout.",
    ],
  },
  {
    title: "Technical Details",
    paragraphs: [],
    bullets: [
      "Built with Three.js, JavaScript, HTML5 Canvas, and CSS3.",
      "Features real-time simulation, graph-based topology detection, multiple routing algorithms, and persistent storage.",
    ],
  },
  {
    title: "For Students & Educators",
    paragraphs: [],
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
      "Support resources, documentation, and answers to common questions.",
    sections: HELP_SECTIONS,
    showLegend: true,
  },
  "getting-started": {
    title: "Getting Started",
    description:
      "Learn the basics of building circuits in CircuiTry3D.",
    sections: GETTING_STARTED_SECTIONS,
  },
  "wire-guide": {
    title: "W.I.R.E. Guide",
    description:
      "W = Watts (blue) · I = Current/Amps (yellow-orange) · R = Resistance/Ohms (green) · E = Voltage (red). Use these four values and their color codes to design, analyze, and solve circuits.",
    sections: WIRE_GUIDE_SECTIONS,
  },
  schematic: {
    title: "Schematic Layout Guide",
    description:
      "Apply industry schematic standards while wiring inside the Builder.",
    sections: SCHEMATIC_SECTIONS,
  },
  shortcuts: {
    title: "Keyboard & Gesture Shortcuts",
    description:
      "Complete controls reference for desktop and mobile.",
    sections: SHORTCUT_SECTIONS,
  },
  troubleshooting: {
    title: "Troubleshooting",
    description:
      "Solutions to common issues and problems.",
    sections: TROUBLESHOOTING_SECTIONS,
  },
  faq: {
    title: "Frequently Asked Questions",
    description:
      "Answers to common questions about CircuiTry3D.",
    sections: FAQ_SECTIONS,
  },
  about: {
    title: "About CircuiTry3D",
    description:
      "Feature highlights, learning goals, and support resources.",
    sections: ABOUT_SECTIONS,
  },
};

type IconProps = {
  className?: string;
};

type ChevronDirection = "left" | "right" | "up" | "down";

const IconChevron = ({
  direction,
  className,
}: { direction: ChevronDirection } & IconProps) => {
  const d = (() => {
    switch (direction) {
      case "left":
        return "M13 5 L7 10 L13 15";
      case "right":
        return "M7 5 L13 10 L7 15";
      case "up":
        return "M5 13 L10 7 L15 13";
      case "down":
      default:
        return "M5 7 L10 13 L15 7";
    }
  })();

  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

const IconChevronLeft = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M10 12L6 8l4-4" />
  </svg>
);

const IconChevronRight = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

const IconChevronUp = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 10L8 6l-4 4" />
  </svg>
);

const IconChevronDown = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 6l4 4 4-4" />
  </svg>
);

export default function Builder() {
  const navigate = useNavigate();
  const practiceProblemRef = useRef<string | null>(
    DEFAULT_PRACTICE_PROBLEM?.id ?? null,
  );
  const pendingPayoffRef = useRef(false);
  const currentFlowPayoffTimersRef = useRef<number[]>([]);
  const appBasePath = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }, []);
  const activeWorkspaceSection = useMemo<WorkspaceSectionId | null>(() => {
    const sectionParam = new URLSearchParams(location.search).get("section");
    return isWorkspaceSectionId(sectionParam) ? sectionParam : null;
  }, [location.search]);

  const [modeState, setModeState] = useState<LegacyModeState>({
    isWireMode: false,
    isRotateMode: false,
    isMeasureMode: false,
    currentFlowStyle: "misty",
    showPolarityIndicators: true,
    layoutMode: "free",
    wireRoutingMode: "manhattan",
    showGrid: true,
    showLabels: true,
    labelVisibilityLevel: 3,
    gridBrightness: 100,
    gridLineWidth: 1,
    gridHue: 240,
  });
  const [activeBuilderTool, setActiveBuilderTool] =
    useState<BuilderToolId>("select");
  const [isSimulatePulsing, setSimulatePulsing] = useState(false);
  const [arenaExportStatus, setArenaExportStatus] = useState<ArenaExportStatus>("idle");
  const [arenaExportError, setArenaExportError] = useState<string | null>(null);
  const [lastArenaExport, setLastArenaExport] = useState<ArenaExportSummary | null>(null);
  const [isArenaPanelOpen, setArenaPanelOpen] = useState(false);
  const [isPracticePanelOpen, setPracticePanelOpen] = useState(false);
  const [isSchematicPanelOpen, setSchematicPanelOpen] = useState(false);
  const [schematicSymbolStandard, setSchematicSymbolStandard] = useState<SymbolStandard>(DEFAULT_SYMBOL_STANDARD);
  const [activePracticeProblemId, setActivePracticeProblemId] = useState<string | null>(
    DEFAULT_PRACTICE_PROBLEM?.id ?? null
  );
  const [troubleshootSolvedIds, setTroubleshootSolvedIds] = useState<string[]>(
    () => {
      try {
        const raw = window.localStorage.getItem(
          "circuitry3d.troubleshoot.solved",
        );
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.filter((id) => typeof id === "string")
          : [];
      } catch {
        return [];
      }
    },
  );
  const [troubleshootAnswerByProblemId, setTroubleshootAnswerByProblemId] =
    useState<Record<string, string>>({});
  const [troubleshootDiagnosedIds, setTroubleshootDiagnosedIds] = useState<string[]>(
    [],
  );
  const [troubleshootStatus, setTroubleshootStatus] = useState<string | null>(
    null,
  );
  const [troubleshootPendingCheckProblemId, setTroubleshootPendingCheckProblemId] =
    useState<string | null>(null);
  const [isTroubleshootCheckPending, setTroubleshootCheckPending] =
    useState(false);
  const [activePracticeProblemId, setActivePracticeProblemId] = useState<
    string | null
  >(DEFAULT_PRACTICE_PROBLEM?.id ?? null);
  const [, setPracticeWorksheetState] =
    useState<PracticeWorksheetStatus | null>(null);
  const [isCompactWorksheetOpen, setCompactWorksheetOpen] = useState(false);
  const [isPracticeWorkspaceMode, setPracticeWorkspaceMode] = useState(false);
  const [isTroubleshootWorkspaceMode, setTroubleshootWorkspaceMode] =
    useState(false);
  const [isGuidesWorkspaceMode, setGuidesWorkspaceMode] = useState(false);
  const [isGuidesPanelOpen, setGuidesPanelOpen] = useState(false);
  const [activeGuideWorkflow, setActiveGuideWorkflow] =
    useState<GuideWorkflowId>("tutorial");
  const [isCircuitLocked, setCircuitLocked] = useState(false);
  // Showcase/payoff edit-lock: keeps the demo circuit view-only (camera still free)
  // until the user taps to edit. Declared here so the lock-sync effect can use it.
  const [isShowcaseLocked, setShowcaseLocked] = useState(false);
  // Tracks whether the circuit is locked specifically for the onboarding payoff
  // sequence. Used to distinguish onboarding lock from practice/troubleshoot lock
  // and to show a "tap to edit" chip after the payoff banner is dismissed.
  const [isOnboardingLocked, setOnboardingLocked] = useState(false);
  const [isEnvironmentalPanelOpen, setEnvironmentalPanelOpen] = useState(false);
  const [isMeasurementPanelOpen, setMeasurementPanelOpen] = useState(false);
  const [isWireLibraryPanelOpen, setWireLibraryPanelOpen] = useState(false);
  const [, setModeBarScrollState] = useState<{
    canScrollLeft: boolean;
    canScrollRight: boolean;
  }>({ canScrollLeft: false, canScrollRight: false });
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentalScenario>(
    getDefaultScenario()
  );
  const [activeWireProfile, setActiveWireProfile] = useState<WireSpec | null>(
    null,
  );
  const [circuitBaseMetrics, setCircuitBaseMetrics] = useState({
    watts: 0,
    current: 0,
    resistance: 0,
    voltage: 0,
  });
  const [isInteractiveTutorialOpen, setInteractiveTutorialOpen] =
    useState(false);
  const [isClassroomPanelOpen, setClassroomPanelOpen] = useState(false);
  const [isPricingPanelOpen, setPricingPanelOpen] = useState(false);
  const [isCommunityPanelOpen, setCommunityPanelOpen] = useState(false);

  // Global workspace mode context - sync with local state
  const globalModeContext = useWorkspaceMode();
  const pendingModeChangeRef = useRef<WorkspaceMode | null>(null);

  // Sync local workspaceMode with global context on mount and when global changes
  useEffect(() => {
    // Notify global context that we're in the workspace
    globalModeContext.setIsInWorkspace(true);
    return () => {
      globalModeContext.setIsInWorkspace(false);
    };
  }, []);

  // On Android, reload the app when the user completes the in-app
  // purchase so IS_DEMO_MODE (module-level constant) re-evaluates to false
  // and the full component library is immediately available.
  useEffect(() => {
    if (!IS_DEMO_MODE || !isAndroidApp()) return;
    const onUnlocked = () => window.location.reload();
    window.addEventListener("circuitry3d:premiumUnlocked", onUnlocked);
    return () => window.removeEventListener("circuitry3d:premiumUnlocked", onUnlocked);
  }, []);

  // Track global mode changes for later processing
  useEffect(() => {
    if (globalModeContext.workspaceMode !== workspaceMode) {
      pendingModeChangeRef.current = globalModeContext.workspaceMode;
    }
  }, [globalModeContext.workspaceMode, workspaceMode]);

  // Update global context when local mode changes (from Builder-internal actions)
  const setWorkspaceModeWithGlobalSync = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    if (globalModeContext.workspaceMode !== mode) {
      globalModeContext.setWorkspaceMode(mode);
    }
  }, [globalModeContext]);

  const handleModeStateChange = useCallback((next: Partial<LegacyModeState>) => {
    const nextLabelVisibilityLevel =
      typeof next.labelVisibilityLevel === "number"
        ? clampLabelVisibilityLevel(next.labelVisibilityLevel)
        : null;

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
        typeof nextLabelVisibilityLevel === "number"
          ? nextLabelVisibilityLevel > 0
          : typeof next.showLabels === "boolean"
          ? next.showLabels
          : previous.showLabels,
      labelVisibilityLevel:
        typeof nextLabelVisibilityLevel === "number"
          ? nextLabelVisibilityLevel
          : typeof next.showLabels === "boolean"
            ? deriveLabelVisibilityFromShowLabels(
                next.showLabels,
                previous.labelVisibilityLevel,
              )
            : previous.labelVisibilityLevel,
      gridBrightness:
        typeof next.gridBrightness === "number"
          ? next.gridBrightness
          : previous.gridBrightness,
      gridLineWidth:
        typeof next.gridLineWidth === "number"
          ? next.gridLineWidth
          : previous.gridLineWidth,
      gridHue:
        typeof next.gridHue === "number"
          ? next.gridHue
          : previous.gridHue,
    }));
  }, []);

  const handleSimulationPulse = useCallback(() => {
    setSimulatePulsing(true);
    setTimeout(() => {
      setSimulatePulsing(false);
    }, 1400);
  }, []);

  const { addItem: addGalleryItem } = useGallery();

  const handleCinematicFrame = useCallback(
    (payload: CinematicFramePayload) => {
      addGalleryItem({
        type: "image",
        dataUrl: payload.dataUrl,
        circuitName: payload.circuitName,
        title: `${payload.circuitName} — Frame`,
        description: "",
      });
    },
    [addGalleryItem],
  );

  const handleCinematicVideo = useCallback(
    (payload: CinematicVideoPayload) => {
      addGalleryItem({
        type: "video",
        dataUrl: payload.dataUrl,
        circuitName: payload.circuitName,
        title: `${payload.circuitName} — Clip`,
        description: "",
      });
      setCinematicIsRecording(false);
      // Show "View in Gallery" toast
      if (galleryToastTimerRef.current !== null) {
        clearTimeout(galleryToastTimerRef.current);
      }
      setShowGalleryToast(true);
      galleryToastTimerRef.current = window.setTimeout(() => {
        setShowGalleryToast(false);
        galleryToastTimerRef.current = null;
      }, GALLERY_TOAST_DURATION_MS);
    },
    [addGalleryItem],
  );

  const {
    iframeRef,
    isFrameReady,
    arenaExportStatus,
    circuitState,
    lastSimulationAt,
    lastSimulation,
    meterState,
    postToBuilder,
    triggerBuilderAction,
    handleArenaSync,
  } = useBuilderFrame({
    appBasePath,
    onModeStateChange: handleModeStateChange,
    onToolChange: setActiveBuilderTool,
    onSimulationPulse: handleSimulationPulse,
    onCinematicFrame: handleCinematicFrame,
    onCinematicVideo: handleCinematicVideo,
  });

  const wireLibraryPayload = useMemo(
    () =>
      WIRE_LIBRARY.map((spec) => {
        const material = WIRE_MATERIALS[spec.material as WireMaterialId];
        return {
          id: spec.id,
          label: spec.gaugeLabel,
          materialId: spec.material,
          materialLabel: spec.materialLabel,
          insulationLabel: spec.insulationLabel,
          resistanceOhmPerMeter: spec.resistanceOhmPerMeter,
          ampacityChassisA: spec.ampacityChassisA,
          ampacityBundleA: spec.ampacityBundleA,
          maxVoltageV: spec.maxVoltageV,
          category: material?.category ?? "conductor",
        };
      }),
    [],
  );

  useEffect(() => {
    if (!isFrameReady || wireLibraryPayload.length === 0 || !selectedWireId) {
      return;
    }
    triggerBuilderAction("set-wire-library", {
      library: wireLibraryPayload,
      defaultWireId: selectedWireId,
    });
    triggerBuilderAction("set-wire-type", { wireId: selectedWireId });
  }, [isFrameReady, wireLibraryPayload, selectedWireId, triggerBuilderAction]);

  useEffect(() => {
    if (!circuitState) {
      return;
    }
    setCircuitBaseMetrics({
      watts: Number.isFinite(circuitState.metrics.power)
        ? circuitState.metrics.power
        : 0,
      current: Number.isFinite(circuitState.metrics.current)
        ? circuitState.metrics.current
        : 0,
      resistance:
        typeof circuitState.metrics.resistance === "number" &&
        Number.isFinite(circuitState.metrics.resistance)
          ? circuitState.metrics.resistance
          : 0,
      voltage: Number.isFinite(circuitState.metrics.voltage)
        ? circuitState.metrics.voltage
        : 0,
    });
  }, [circuitState]);

  const {
    logoSettings,
    prefersReducedMotion,
    handleLogoSettingChange,
    toggleLogoVisibility,
  } = useLogoAnimation();
  const {
    workspaceSkinOptions,
    workspaceSkinStyle,
    activeWorkspaceSkinId,
    customWorkspaceSkinName,
    customWorkspaceSkinOpacity,
    hasCustomWorkspaceSkin,
    workspaceSkinError,
    selectWorkspaceSkin,
    importWorkspaceSkinFromFile,
    setCustomWorkspaceSkinOpacity,
    clearCustomWorkspaceSkin,
    resetWorkspaceSkin,
  } = useWorkspaceBackground();
  const [isSettingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [activeSettingsPanelTab, setActiveSettingsPanelTab] =
    useState<SettingsPanelTab>("workspace-skins");

  const {
    helpSectionRefs,
    isHelpOpen,
    setHelpOpen,
    requestedHelpSection: _requestedHelpSection,
    setRequestedHelpSection: _setRequestedHelpSection,
    helpView,
    setHelpView: _setHelpView,
    openHelpWithSection,
    openHelpWithView,
  } = useHelpModal();

  const {
    isLeftMenuOpen,
    setLeftMenuOpen,
    isRightMenuOpen,
    setRightMenuOpen,
    isBottomMenuOpen,
    setBottomMenuOpen,
  } = useResponsiveLayout();

  const leftPanelDrag = useDraggablePanel("panel-left");
  const rightPanelDrag = useDraggablePanel("panel-right");
  const bottomPanelDrag = useDraggablePanel("panel-bottom");
  const zoomDrag = useDraggablePanel("zoom-controls");

  const isCoarsePointer = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    if (typeof window.matchMedia === "function") {
      const coarsePointer = window.matchMedia("(pointer: coarse)");
      if (coarsePointer.matches) {
        return true;
      }
    }

    return (
      typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0
    );
  }, []);
  const shouldAnimateLibraryThumbnails = isLeftMenuOpen && !isCoarsePointer;

  // Action bar visibility mode — persisted to localStorage
  const [actionBarMode, setActionBarMode] = useState<ActionBarMode>(() => {
    try {
      const stored = localStorage.getItem(ACTION_BAR_MODE_STORAGE_KEY);
      if (stored === "full" || stored === "tools" || stored === "hidden") {
        return stored;
      }
    } catch { /* ignore */ }
    // Default to hidden — the quick-action buttons start tucked away; the
    // user reveals them via the action-bar toggle (Hide / Tools / All).
    return "hidden";
  });

  // Persist whenever mode changes
  useEffect(() => {
    try {
      localStorage.setItem(ACTION_BAR_MODE_STORAGE_KEY, actionBarMode);
    } catch { /* ignore */ }
  }, [actionBarMode]);

  // Show plain-language descriptors under component thumbnails — persisted.
  // Helps newcomers who may not recognise a part by name (e.g. "resistor").
  const [showThumbDescriptors, setShowThumbDescriptors] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THUMB_DESCRIPTORS_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        THUMB_DESCRIPTORS_STORAGE_KEY,
        showThumbDescriptors ? "true" : "false",
      );
    } catch { /* ignore */ }
  }, [showThumbDescriptors]);

  // Circuit storage for save/load functionality
  const circuitStorage = useCircuitStorage();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isAIHelperOpen, setIsAIHelperOpen] = useState(false);
  const [isExplainPanelOpen, setIsExplainPanelOpen] = useState(false);
  const [isMeasureWidgetOpen, setMeasureWidgetOpen] = useState(false);
  const [isCinematicOpen, setIsCinematicOpen] = useState(false);
  const [cinematicIsPlaying, setCinematicIsPlaying] = useState(false);
  const [cinematicIsRecording, setCinematicIsRecording] = useState(false);
  const [cinematicWaypointCount, setCinematicWaypointCount] = useState(0);
  const [cinematicRecordError, setCinematicRecordError] = useState<string | null>(null);
  const [showGalleryToast, setShowGalleryToast] = useState(false);
  const galleryToastTimerRef = useRef<number | null>(null);

  // Demo/Full mode feature gating
  const { isDemoMode, isFeatureLocked, showUpgradePrompt } = useDemoMode();

  // Create a mock circuit state for demo (in production, extract from iframe)
  const currentCircuitState = useMemo(() => ({
    nodes: [],
    wires: [],
    components: [],
    junctions: [],
  }), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isFrameReady) {
      return;
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      // Keep multi-touch gestures from triggering browser zoom/scroll.
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    // Use passive: false to allow preventDefault() for multi-touch gestures.
    iframe.addEventListener("touchmove", handleTouchMove, { passive: false });
    iframe.addEventListener("touchstart", handleTouchStart, { passive: false });

    return () => {
      iframe.removeEventListener("touchmove", handleTouchMove);
      iframe.removeEventListener("touchstart", handleTouchStart);
    };
  }, [isFrameReady]);

  useEffect(() => {
    document.body.classList.add("builder-body");
    return () => {
      document.body.classList.remove("builder-body");
    };
  }, []);

  // Global keyboard shortcuts for save/load
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Ignore if in input field
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

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
    if (!isArenaPanelOpen && !isPracticePanelOpen && !isSchematicPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isArenaPanelOpen) {
          setArenaPanelOpen(false);
        }
        if (circuitStorage.currentCircuit) {
          // Quick save if circuit already exists
          circuitStorage.updateCurrentCircuit(currentCircuitState);
        } else {
          setIsSaveModalOpen(true);
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
        staticSecondary
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
      angle = (angle + (deltaSeconds * (Math.PI * 2)) / orbitDuration) % (Math.PI * 2);

      const viewportWidth = window.innerWidth || 1440;
      const viewportHeight = window.innerHeight || 900;

      const horizontalMargin = 160;
      const verticalMargin = 200;

      const maxHorizontal = Math.max(0, (viewportWidth - horizontalMargin * 2) / 2);
      const maxVertical = Math.max(0, (viewportHeight - verticalMargin * 2) / 2);

      const amplitudeX = maxHorizontal * (clamp(logoSettings.travelX, 10, 100) / 100);
      const amplitudeY = maxVertical * (clamp(logoSettings.travelY, 10, 100) / 100);

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
        1
      )}px)) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      const glowPrimary = (0.34 + Math.sin(angle * 1.7) * 0.12) * normalizedOpacity;
      const glowSecondary = (0.2 + Math.sin(angle * 2.3 + Math.PI / 4) * 0.08) * normalizedOpacity;
      element.style.textShadow = `0 0 44px rgba(0, 255, 136, ${Math.max(0, glowPrimary).toFixed(2)}), 0 0 68px rgba(136, 204, 255, ${Math.max(
        0,
        glowSecondary
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
    [isFrameReady]
  );

  // Sync circuit lock state to the iframe
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    triggerBuilderAction(isCircuitLocked ? "lock-circuit" : "unlock-circuit");
  }, [isCircuitLocked, isFrameReady, triggerBuilderAction]);

  const triggerSimulationPulse = useCallback(() => {
    setSimulatePulsing(true);
    const timer = window.setTimeout(() => {
      setSimulatePulsing(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const openHelpCenter = useCallback(
    (view: HelpModalView = "overview", sectionTitle?: string) => {
      if (view === "overview" && sectionTitle) {
        openHelpWithSection(sectionTitle);
      } else {
        openHelpWithView(view);
      }
    },
    [openHelpWithSection, openHelpWithView],
  );

  const assignPracticeProblem = useCallback(
    (problem: PracticeProblem, presetOverride?: string) => {
      setActivePracticeProblemId(problem.id);
      setPracticeWorksheetState({
        problemId: problem.id,
        complete: false,
      });
      practiceProblemRef.current = problem.id;

  const openPracticePanel = useCallback(() => {
    setSchematicPanelOpen(false);
    setPracticePanelOpen(true);
  }, []);

  const openSchematicPanel = useCallback(() => {
    setPracticePanelOpen(false);
    setSchematicPanelOpen(true);
  }, []);

  const handlePracticeAction = useCallback(
    (action: PanelAction) => {
      if (action.action === "open-arena") {
        setArenaPanelOpen(true);
        handleArenaSync({ openWindow: false, sessionName: "Builder Hand-off" });
        return;
      }
      if (action.action === "practice-help") {
        openHelpCenter("overview");
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
          openPracticePanel();
        }
        return;
      }
      triggerBuilderAction(action.action, action.data);
    },
    [handleArenaSync, openHelpCenter, triggerBuilderAction, openPracticePanel]
  );

  // Deep link support: open practice problem from URL (used by Classroom student view)
  useEffect(() => {
    const pendingMode = pendingModeChangeRef.current;
    if (pendingMode && pendingMode !== workspaceMode) {
      pendingModeChangeRef.current = null;

      if (pendingMode === "build") {
        setWorkspaceMode("build");
        setPracticeWorkspaceMode(false);
        setCompactWorksheetOpen(false);
        setCircuitLocked(false);
        setArenaPanelOpen(false);
        setTroubleshootPanelOpen(false);
      } else if (pendingMode === "practice") {
        setTroubleshootPanelOpen(false);
        setTroubleshootStatus(null);
        openPracticeWorkspace();
      } else if (pendingMode === "arena") {
        setWorkspaceMode("arena");
        setTroubleshootPanelOpen(false);
        setArenaPanelOpen(true);
        if (arenaExportStatus !== "ready") {
          handleArenaSync({ openWindow: false });
        }
      } else if (pendingMode === "help") {
        setWorkspaceMode("help");
        setTroubleshootPanelOpen(false);
        openHelpCenter("overview");
      } else if (pendingMode === "troubleshoot") {
        setWorkspaceMode("troubleshoot");
        setTroubleshootPanelOpen(true);
        setTroubleshootStatus(null);
        setTroubleshootCheckPending(false);
        setTroubleshootPendingCheckProblemId(null);
        setCircuitLocked(true);
        const nextProblem =
          troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
          troubleshootingProblems[0] ??
          null;
        if (nextProblem) {
          if (nextProblem.id !== activeTroubleshootId) {
            setActiveTroubleshootId(nextProblem.id);
          }
          triggerBuilderAction("load-preset", { preset: nextProblem.preset });
        }
      }

      // Sync back to global context
      globalModeContext.setWorkspaceMode(pendingMode);
    }
  }, [
    globalModeContext.workspaceMode,
    workspaceMode,
    openPracticeWorkspace,
    handleArenaSync,
    openHelpCenter,
    arenaExportStatus,
    enterTroubleshootMode,
    globalModeContext,
  ]);

  const closeWorkspaceSectionOverlay = useCallback(() => {
    navigate("/app");
  }, [navigate]);

  useEffect(() => {
    if (!activeWorkspaceSection) {
      return;
    }

    if (workspaceMode !== "build") {
      setWorkspaceModeWithGlobalSync("build");
    }

    setPracticeWorkspaceMode(false);
    setCompactWorksheetOpen(false);
    setTroubleshootWorkspaceMode(false);
    setTroubleshootPanelOpen(false);
    setGuidesWorkspaceMode(false);
    setGuidesPanelOpen(false);
    setArenaPanelOpen(false);
    setEnvironmentalPanelOpen(false);
    setWireLibraryPanelOpen(false);
    setTroubleshootStatus(null);
    setTroubleshootCheckPending(false);
    setTroubleshootPendingCheckProblemId(null);
    setCircuitLocked(false);
    setHelpOpen(false);
  }, [
    activeWorkspaceSection,
    setWorkspaceModeWithGlobalSync,
    workspaceMode,
  ]);

  const activeWorkspaceSectionTitle = activeWorkspaceSection
    ? WORKSPACE_SECTION_TITLE[activeWorkspaceSection]
    : null;
  const activeWorkspaceSectionContent = useMemo(() => {
    switch (activeWorkspaceSection) {
      case "arcade":
        return <ArcadePage />;
      case "classroom":
        return <ClassroomPage />;
      case "community":
        return <CommunityPage />;
      case "account":
        return <AccountPage />;
      case "pricing":
        return <PricingPage />;
      default:
        return null;
    }
  }, [activeWorkspaceSection]);

  const handleEnvironmentChange = useCallback((scenario: EnvironmentalScenario) => {
    setActiveEnvironment(scenario);
  }, []);

  const resetLogoSettings = useCallback(() => {
    // Reset to defaults by setting each property
    handleLogoSettingChange("speed", 14);
    handleLogoSettingChange("travelX", 50);
    handleLogoSettingChange("travelY", 40);
    handleLogoSettingChange("bounce", 22);
    handleLogoSettingChange("opacity", 52);
  }, [handleLogoSettingChange]);

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

  const handleCatalogComponent = useCallback(
    (entry: CatalogEntry) => {
      if (!entry) {
        return;
      }

      if (entry.kind === "ground") {
        postToBuilder({ type: "builder:add-junction" });
        return;
      }

      postToBuilder({
        type: "builder:add-component",
        payload: { componentType: entry.kind },
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

  const handleLoadBeginnerSeriesPreset = useCallback(
    (preset: string) => {
      triggerBuilderAction("load-preset", { preset });
    },
    [triggerBuilderAction],
  );

  const handleAdvancePracticeProblem = useCallback((currentProblemId?: string) => {
    const currentId =
      currentProblemId ??
      practiceProblemRef.current ??
      activePracticeProblemId ??
      DEFAULT_PRACTICE_PROBLEM?.id ??
      null;
    const nextProblem = getNextPracticeProblem(currentId);
    if (!nextProblem) {
      return;
    }
    openPracticeWorkspace(nextProblem);
  }, [activePracticeProblemId, openPracticeWorkspace]);

  const handleSelectTroubleshootProblem = useCallback(
    (problemId: string) => {
      const nextProblem =
        troubleshootingProblems.find((problem) => problem.id === problemId) ?? null;
      if (!nextProblem) {
        return;
      }
      setActiveTroubleshootId(nextProblem.id);
      openTroubleshootWorkspace(nextProblem);
    },
    [openTroubleshootWorkspace],
  );

  const handleResetTroubleshootProblem = useCallback(() => {
    const activeProblem =
      troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
      troubleshootingProblems[0] ??
      null;
    if (!activeProblem) {
      return;
    }
    openTroubleshootWorkspace(activeProblem);
    setTroubleshootStatus(
      "Reset loaded. Diagnose the fault, apply the fix in 3D, then tap Check Fix.",
    );
  }, [activeTroubleshootId, openTroubleshootWorkspace]);

  const handleTroubleshootAnswerChange = useCallback(
    (value: string) => {
      const problemId = activeTroubleshootId;
      if (!problemId) return;
      setTroubleshootAnswerByProblemId((previous) => ({
        ...previous,
        [problemId]: value,
      }));
    },
    [activeTroubleshootId],
  );

  const handleSubmitTroubleshootAnswer = useCallback(() => {
    const activeProblem =
      troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
      troubleshootingProblems[0] ??
      null;
    if (!activeProblem) {
      return;
    }

    const answer = (troubleshootAnswerByProblemId[activeProblem.id] ?? "").trim();
    if (!answer) {
      setTroubleshootStatus("Enter your diagnosis in the answer field before submitting.");
      return;
    }

    if (isTroubleshootingDiagnosisCorrect(activeProblem, answer)) {
      setTroubleshootDiagnosedIds((previous) => {
        if (previous.includes(activeProblem.id)) return previous;
        return [...previous, activeProblem.id];
      });
      setTroubleshootStatus(
        "Diagnosis accepted. Interact with the 3D circuit to apply your fix, then click Check Fix.",
      );
      return;
    }

    setTroubleshootStatus(
      "Diagnosis not recognized yet. Try naming the fault directly (open switch, missing wire, short circuit, reversed LED).",
    );
  }, [activeTroubleshootId, troubleshootAnswerByProblemId]);

  const handleCheckTroubleshootFix = useCallback(() => {
    const activeProblem =
      troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
      troubleshootingProblems[0] ??
      null;
    if (!activeProblem) {
      return;
    }
    setWorkspaceModeWithGlobalSync("troubleshoot");
    setTroubleshootWorkspaceMode(true);
    setTroubleshootPanelOpen(true);
    setTroubleshootStatus("Checking...");
    setTroubleshootPendingCheckProblemId(activeProblem.id);
    setTroubleshootCheckPending(true);
    triggerBuilderAction("run-simulation");
  }, [activeTroubleshootId, setWorkspaceModeWithGlobalSync, triggerBuilderAction]);

  const handleAdvanceTroubleshootProblem = useCallback(() => {
    if (!troubleshootingProblems.length) {
      return;
    }
    const index = activeTroubleshootId
      ? troubleshootingProblems.findIndex(
          (problem) => problem.id === activeTroubleshootId,
        )
      : -1;
    const nextProblem =
      troubleshootingProblems[
        (index + 1 + troubleshootingProblems.length) % troubleshootingProblems.length
      ] ??
      troubleshootingProblems[0] ??
      null;
    if (!nextProblem) {
      return;
    }
    setActiveTroubleshootId(nextProblem.id);
    openTroubleshootWorkspace(nextProblem);
  }, [activeTroubleshootId, openTroubleshootWorkspace]);

  const handleUnlockTroubleshootEditing = useCallback(() => {
    setCircuitLocked(false);
    setTroubleshootStatus("Fix verified. Editing unlocked for this circuit.");
  }, []);

  const handleClearWorkspace = useCallback(() => {
    triggerBuilderAction("clear-workspace");
  }, [triggerBuilderAction]);

  const handleRunSimulationClick = useCallback(() => {
    triggerBuilderAction("run-simulation");
    triggerSimulationPulse();
  }, [triggerBuilderAction, triggerSimulationPulse]);

  const isWorksheetVisible = isPracticeWorkspaceMode && isCompactWorksheetOpen;
  const isTroubleshootVisible =
    isTroubleshootWorkspaceMode && isTroubleshootPanelOpen;
  const isGuidesVisible = isGuidesWorkspaceMode && isGuidesPanelOpen;
  const isWorkspacePanelVisible =
    activeWorkspacePanelMode !== null && isWorkspacePanelOpen;
  const isOverlayActive =
    activeWorkspaceSection !== null ||
    isArenaPanelOpen ||
    isEnvironmentalPanelOpen ||
    isHelpOpen ||
    isSaveModalOpen ||
    isLoadModalOpen ||
    isClassroomPanelOpen ||
    isPricingPanelOpen ||
    isCommunityPanelOpen;
  const isActiveCircuitBuildMode =
    workspaceMode === "build" ||
    workspaceMode === "practice" ||
    workspaceMode === "troubleshoot";
  // The Settings panel is a short bottom sheet — keep the zoom controls live and
  // lifted above it so the workspace can be framed while sliders are dragged.
  const isSettingsPanelLifted =
    activeWorkspacePanelMode === "settings" && isWorkspacePanelOpen;
  const shouldShowEdgeActions =
    isActiveCircuitBuildMode &&
    !isWorksheetVisible &&
    !isTroubleshootVisible &&
    !isGuidesVisible &&
    !isSettingsPanelOpen &&
    !isOverlayActive;

  useEffect(() => {
    if (
      !isActiveCircuitBuildMode ||
      isWorksheetVisible ||
      isTroubleshootVisible ||
      isGuidesVisible
    ) {
      setSettingsPanelOpen(false);
    }
  }, [
    isActiveCircuitBuildMode,
    isGuidesVisible,
    isTroubleshootVisible,
    isWorksheetVisible,
  ]);

  const controlsDisabled = !isFrameReady || isCircuitLocked;
  const controlDisabledTitle = !isFrameReady
    ? "Workspace is still loading"
    : isOnboardingLocked
      ? "Tap '✏️ Start Editing' to begin editing the circuit"
      : isCircuitLocked
        ? "Complete the active challenge to unlock editing"
        : undefined;

    const problem = findPracticeProblemById(currentId);
    if (!problem) {
      return "Select a practice problem to start the guided worksheet.";
    }

    if (practiceWorksheetState?.problemId === problem.id && practiceWorksheetState.complete) {
      return `Worksheet complete for ${problem.title}. Tap Next Problem to load the next circuit.`;
    }

    return `Complete the worksheet for ${problem.title} to unlock the next challenge.`;
  }, [activePracticeProblemId, practiceWorksheetState]);

  const isArenaSyncing = arenaExportStatus === "exporting";
  const canOpenLastArena = Boolean(lastArenaExport?.sessionId);

  const floatingControlsTop = useMemo(
    () => "calc(84px + var(--builder-safe-area-top) + 12px)",
    []
  );

  const controlsDisabled = !isFrameReady;
  const controlDisabledTitle = controlsDisabled ? "Workspace is still loading" : undefined;
  const builderFrameSrc = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const demoParam = IS_DEMO_MODE ? "&demo=true" : "";
    return `${normalizedBase}legacy.html?embed=builder${demoParam}`;
  }, []);
  const activeHelpContent = HELP_VIEW_CONTENT[helpView];
  const layoutModeNames: Record<string, string> = {
    free: "Free",
    square: "Square",
    linear: "Linear",
  };
  const wireRoutingNames: Record<string, string> = {
    freeform: "Freeform",
    manhattan: "Manhattan (90-deg)",
    simple: "Simple",
    perimeter: "Perimeter",
    astar: "A* Auto",
    diagonal: "Diagonal (45°)",
    stepped: "Stepped",
    scurve: "S-Curve",
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
  const wireMetrics = useMemo(() => {
    const volts = liveWireMetricsSnapshot.voltage;
    const amps = liveWireMetricsSnapshot.current;
    const watts = liveWireMetricsSnapshot.power;
    const resistanceValue = liveWireMetricsSnapshot.resistance;
    const resistanceDigits = activeWireProfile ? 3 : 1;
    const resistanceDisplay = liveWireMetricsSnapshot.isOpenCircuit
      ? "∞ Ω"
      : `${Number.isFinite(resistanceValue) ? resistanceValue.toFixed(resistanceDigits) : "0.0"} Ω`;

    return [
      {
        id: "watts",
        letter: "W",
        label: "Watts",
        value: `${Number.isFinite(watts) ? watts.toFixed(activeWireProfile ? 3 : 2) : "0.00"} W`,
      },
      {
        id: "current",
        letter: "I",
        label: "Current",
        value: `${Number.isFinite(amps) ? amps.toFixed(activeWireProfile ? 4 : 3) : "0.000"} A`,
      },
      {
        id: "resistance",
        letter: "R",
        label: "Resistance",
        value: resistanceDisplay,
      },
      {
        id: "voltage",
        letter: "E",
        label: "Voltage",
        value: `${Number.isFinite(volts) ? volts.toFixed(1) : "0.0"} V`,
      },
    ];
  }, [activeWireProfile, liveWireMetricsSnapshot]);
  const shouldShowCurrentFlowPayoffBanner =
    isCurrentFlowPayoffVisible &&
    shouldShowEdgeActions &&
    !isInteractiveTutorialOpen;

  // While the current-flow payoff demo is playing (sequence running OR banner
  // showing) the preset circuit must be view-only: a transparent guard sits over
  // the workspace so an accidental tap can't grab and drag a component. It clears
  // the moment the demo auto-dismisses or the user taps Edit/×. This is needed
  // because the returning-user payoff path doesn't lock the iframe, and even the
  // first-run lock can be reset when load-payoff rebuilds the circuit.
  const isCurrentFlowPayoffLocking =
    isCurrentFlowPayoffRunning || shouldShowCurrentFlowPayoffBanner;

  // (isShowcaseLocked is declared earlier, near isCircuitLocked, so the lock-sync
  // effect can depend on it.) Latch it on once the payoff is loaded/showing.
  useEffect(() => {
    if (isCurrentFlowPayoffLocking) setShowcaseLocked(true);
  }, [isCurrentFlowPayoffLocking]);

  // Plain-language insights that cycle through the payoff banner. Each one names
  // something the user can actually see happening on screen, so the showcase
  // teaches instead of just dazzling. Kept short — one idea per card.
  const currentFlowPayoffTips = useMemo(
    () => [
      "⚡ Those crackling bolts of light ARE the electric current — the real flow of energy, invisible in life, shown here in 3D.",
      "This is a series circuit: one loop, so the SAME current flows through every part. The battery pushes it round and round.",
      "The colour shows speed: dull red = slow (held back by resistance), through orange and yellow, up to blue-white = ludicrously fast.",
      "🔍 Pinch or scroll to ZOOM IN — keep going and the current dissolves into electrons, then a copper-atom lattice, then a quantum cloud.",
      "More resistance → less current. That's Ohm's Law (I = V ÷ R) — the heart of every circuit.",
      "New to circuits? Tap any part to see what it is and does, or tap the ? Help button anytime.",
    ],
    [],
  );
  const currentFlowPayoffTip =
    currentFlowPayoffTips[currentFlowPayoffTipIndex % currentFlowPayoffTips.length];

  // Advance the insight every few seconds while the banner is open; reset to the
  // first tip whenever it re-appears so each showcase starts from the top.
  useEffect(() => {
    if (!shouldShowCurrentFlowPayoffBanner) {
      setCurrentFlowPayoffTipIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setCurrentFlowPayoffTipIndex((index) => index + 1);
    }, 9000);
    return () => window.clearInterval(intervalId);
  }, [shouldShowCurrentFlowPayoffBanner]);

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

  const workspacePanelMeta = useMemo(() => {
    switch (activeWorkspacePanelMode) {
      case "arena":
        return {
          title: "Component Arena",
        };
      case "wire-guide":
        return {
          title: "Wire Guide",
          subtitle: activeWireProfile
            ? `Active profile: ${activeWireProfile.gaugeLabel} (${activeWireSegmentResistance.toFixed(4)} Ω/m)`
            : "Filter, select, and apply a wire profile to see live W.I.R.E. changes.",
        };
      case "community":
        return {
          title: "Community",
          subtitle: "Lab chat, gallery, feedback, and member profiles",
        };
      case "gallery":
        return {
          title: "Gallery",
          subtitle: "Cinematic shots and fly-through clips you've captured",
        };
      case "account":
        return {
          title: "Account",
          subtitle: "Sign-in, profile, and account preferences",
        };
      case "pricing":
        return {
          title: "Pricing",
          subtitle: "Plans, subscriptions, and rollout options",
        };
      case "classroom":
        return {
          title: "Classroom",
          subtitle: "Assignments, roster management, and analytics",
        };
      case "arcade":
        return {
          title: "Arcade",
          subtitle: "XP progression, missions, and leaderboards",
        };
      case "textbook":
        return {
          title: "Textbook",
          subtitle: "Year 1 & Year 2 Electrical Studies — formulas, rules, and safety",
        };
      case "settings":
        return {
          title: "Settings",
          subtitle: "Logo, graphics, workspace, simulation & accessibility",
        };
      default:
        return null;
    }
  }, [activeWireProfile, activeWireSegmentResistance, activeWorkspacePanelMode]);

  const workspacePanelContent = useMemo(() => {
    switch (activeWorkspacePanelMode) {
      case "arena":
        return (
          <ArenaView
            variant="embedded"
            onNavigateBack={closeArenaWorkspace}
            sessionId={lastArenaExport?.sessionId ?? null}
          />
        );
      case "wire-guide":
        return (
          <WireLibrary
            activeWireId={activeWireProfile?.id ?? null}
            onApplyWire={handleApplyWireProfile}
            onClearAppliedWire={handleClearWireProfile}
            liveMetrics={{
              voltage: liveWireMetricsSnapshot.voltage,
              current: liveWireMetricsSnapshot.current,
              resistance: liveWireMetricsSnapshot.isOpenCircuit
                ? null
                : liveWireMetricsSnapshot.resistance,
              power: liveWireMetricsSnapshot.power,
              wireCount: liveWireMetricsSnapshot.wireCount,
              wirePathResistance: liveWireMetricsSnapshot.wirePathResistance,
              wireLengthMeters: liveWireMetricsSnapshot.wireLengthMeters,
              wireResistanceReferenceMeters:
                liveWireMetricsSnapshot.wireResistanceReferenceMeters,
              wireAmpacityLimitA: liveWireMetricsSnapshot.wireAmpacityLimitA,
              wireAmpacityUtilization:
                liveWireMetricsSnapshot.wireAmpacityUtilization,
              wireVoltageLimitV: liveWireMetricsSnapshot.wireVoltageLimitV,
              wireVoltageUtilization:
                liveWireMetricsSnapshot.wireVoltageUtilization,
              wireWarning: liveWireMetricsSnapshot.wireWarning,
            }}
          />
        );
      case "community":
        return <Community />;
      case "gallery":
        return <Gallery />;
      case "account":
        return <Account />;
      case "settings":
        return <Settings embedded />;
      case "pricing":
        return (
          <>
            <PricingSection />
            <SubscriptionSection />
          </>
        );
      case "classroom":
        return <Classroom />;
      case "arcade":
        return <Arcade />;
      case "textbook":
        return <Textbook />;
      default:
        return null;
    }
  }, [
    activeWireProfile,
    activeWorkspacePanelMode,
    closeArenaWorkspace,
    handleApplyWireProfile,
    handleClearWireProfile,
    lastArenaExport?.sessionId,
    liveWireMetricsSnapshot.current,
    liveWireMetricsSnapshot.isOpenCircuit,
    liveWireMetricsSnapshot.power,
    liveWireMetricsSnapshot.resistance,
    liveWireMetricsSnapshot.voltage,
    liveWireMetricsSnapshot.wireCount,
  ]);

  return (
    <div className="builder-shell">
      <div className="workspace-mode-bar">
        <div className="mode-bar-brand" aria-label="CircuiTry3D">
          <WordMark size="sm" decorative />
        </div>
        <div className="mode-bar-divider" aria-hidden="true" />
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "build" ? "true" : undefined}
          onClick={() => {
            setWorkspaceMode("build");
            setPracticeWorkspaceMode(false);
            setCompactWorksheetOpen(false);
            setCircuitLocked(false);
            setArenaPanelOpen(false);
          }}
          aria-label="Build mode"
          title="Component builder and circuit designer"
        >
          <span className="mode-icon" aria-hidden="true">🔧</span>
          <span className="mode-label">Build</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "practice" ? "true" : undefined}
          onClick={() => {
            if (workspaceMode === "practice") {
              setCompactWorksheetOpen(true);
              return;
            }
            openPracticeWorkspace();
          }}
          aria-label="Practice mode"
          title="Guided worksheets and W.I.R.E. problems"
        >
          <span className="mode-icon" aria-hidden="true">📝</span>
          <span className="mode-label">Practice</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "arena" ? "true" : undefined}
          onClick={() => {
            setWorkspaceMode("arena");
            setArenaPanelOpen(true);
            if (arenaExportStatus !== "ready") {
              handleArenaSync({ openWindow: false });
            }
          }}
          aria-label="Arena mode"
          title="Component testing and advanced simulation"
        >
          <span className="mode-icon" aria-hidden="true">⚡</span>
          <span className="mode-label">Arena</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "learn" ? "true" : undefined}
          onClick={() => {
            setWorkspaceMode("learn");
            openHelpCenter("overview");
          }}
          aria-label="Learn mode"
          title="Tutorials, guides, and help resources"
        >
          <span className="mode-icon" aria-hidden="true">🎓</span>
          <span className="mode-label">Tutorial</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          onClick={() => {
            navigate("/pricing");
          }}
          aria-label="Pricing"
          title="View pricing plans and subscriptions"
        >
          <span className="mode-icon" aria-hidden="true">💰</span>
          <span className="mode-label">Pricing</span>
        </button>
      </div>
      <div className="builder-logo-header">
        <div className="builder-logo-text" aria-label="CircuiTry3D">
          <span className="builder-logo-circui">Circui</span>
          <span className="builder-logo-try">Try</span>
          <span className="builder-logo-3d">3D</span>
        </div>
      )}

      {shouldShowCurrentFlowPayoffBanner && (
        <section className="current-flow-payoff-banner" role="status" aria-live="polite">
          <div className="current-flow-payoff-kicker">⚡ Welcome to CircuiTry3D — Electricity Illuminated</div>
          <h2 className="current-flow-payoff-title">
            {currentFlowPayoffHasFlow
              ? "Live current is flowing through your circuit right now."
              : "Close the loop to watch current come alive in 3D."}
          </h2>
          <p className="current-flow-payoff-text">
            The battery is the electron pump — it creates a voltage difference that pushes current through the switch, resistor, and LED.{" "}
            {currentFlowPayoffVolts > 0 && currentFlowPayoffAmps > 0
              ? `At ${currentFlowPayoffVolts.toFixed(0)} V with ${(currentFlowPayoffVolts / currentFlowPayoffAmps).toFixed(0)} Ω total resistance, Ohm's Law gives I = V ÷ R ≈ ${currentFlowPayoffAmps.toFixed(3)} A.`
              : "Apply Ohm's Law (I = V ÷ R) to find the current, then watch it animate in real time."}{" "}
            Orbit with left-drag, pan with right-drag, and zoom with the scroll wheel.
          </p>
          <div className="current-flow-payoff-explainer">
            <div className="payoff-explainer-item">
              <span className="payoff-explainer-label">⚡ Current (I)</span>
              <span className="payoff-explainer-value">
                Flow of electric charge through the circuit.{" "}
                {currentFlowPayoffAmps > 0
                  ? `${currentFlowPayoffAmps.toFixed(activeWireProfile ? 4 : 3)} A flowing now.`
                  : "Complete the circuit to start flow."}
              </span>
            </div>
            <div className="payoff-explainer-item">
              <span className="payoff-explainer-label">🔋 Voltage (E)</span>
              <span className="payoff-explainer-value">
                Electrical pressure pushing charge around the circuit.{" "}
                {currentFlowPayoffVolts > 0
                  ? `${currentFlowPayoffVolts.toFixed(1)} V supplied by the battery.`
                  : "Add a battery to supply voltage."}
              </span>
            </div>
            <div className="payoff-explainer-item">
              <span className="payoff-explainer-label">🟢 Resistance (R)</span>
              <span className="payoff-explainer-value">
                Opposition to current. Higher resistance → less current.
                Ohm's Law: <strong>E = I × R</strong>.
              </span>
            </div>
            <div className="payoff-explainer-item">
              <span className="payoff-explainer-label">🔵 Power (W)</span>
              <span className="payoff-explainer-value">
                Energy used per second.{" "}
                <strong>P = E × I</strong>.{" "}
                {currentFlowPayoffWatts > 0
                  ? `${currentFlowPayoffWatts.toFixed(activeWireProfile ? 3 : 2)} W consumed now.`
                  : "Appears once current flows."}
              </span>
            </div>
          </div>
          <div className="current-flow-payoff-metrics">
            <span className="current-flow-payoff-metric">
              <strong>I</strong>{" "}
              <span>{currentFlowPayoffAmps.toFixed(activeWireProfile ? 4 : 3)} A</span>
            </span>
            <span className="current-flow-payoff-metric">
              <strong>E</strong> <span>{currentFlowPayoffVolts.toFixed(1)} V</span>
            </span>
            <span className="current-flow-payoff-metric">
              <strong>W</strong>{" "}
              <span>{currentFlowPayoffWatts.toFixed(activeWireProfile ? 3 : 2)} W</span>
            </span>
          </div>
          <div className="current-flow-payoff-actions">
            <button
              type="button"
              className="builder-intro-dialog-close"
              aria-label="Close introduction"
              onClick={handleDismissIntroDialog}
            >
              ×
            </button>

            <div className="builder-intro-dialog-kicker">
              CircuiTry3D
            </div>

            <div
              className="builder-intro-dialog-step-icon"
              aria-hidden="true"
            >
              {INTRO_WELCOME.icon}
            </div>
            <h2
              className="builder-intro-dialog-title"
              id="intro-dialog-title"
            >
              {INTRO_WELCOME.title}
            </h2>
            <p className="builder-intro-dialog-body">
              {INTRO_WELCOME.body}
            </p>

            <div className="builder-intro-dialog-actions">
              <button
                type="button"
                className="builder-intro-dialog-btn builder-intro-dialog-btn--primary"
                onClick={handleDismissIntroDialog}
              >
                Start Building →
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowCurrentFlowPayoffBanner && (
        <section
          className="current-flow-payoff-strip"
          role="status"
          aria-live="polite"
        >
          <span className="current-flow-payoff-strip__badge" aria-hidden="true">
            ⚡
          </span>
          <p
            className="current-flow-payoff-strip__tip"
            key={currentFlowPayoffTipIndex}
          >
            {currentFlowPayoffTip}
          </p>
          <div className="current-flow-payoff-strip__actions">
            <button
              type="button"
              className="current-flow-payoff-strip__btn current-flow-payoff-strip__btn--primary"
              onClick={() => {
                setCurrentFlowPayoffVisible(false);
                setOnboardingLocked(false);
                setCircuitLocked(false);
                setShowcaseLocked(false);
              }}
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              className="current-flow-payoff-strip__btn"
              onClick={handleReplayCurrentFlowPayoff}
              disabled={controlsDisabled || isCurrentFlowPayoffRunning}
              aria-disabled={controlsDisabled || isCurrentFlowPayoffRunning}
              aria-label="Replay the current-flow demo"
              title="Replay the current-flow demo"
            >
              {isCurrentFlowPayoffRunning ? "…" : "↺"}
            </button>
            <button
              type="button"
              className="current-flow-payoff-strip__close"
              aria-label="Dismiss"
              onClick={() => {
                setCurrentFlowPayoffVisible(false);
                setOnboardingLocked(false);
                setCircuitLocked(false);
                setShowcaseLocked(false);
              }}
            >
              ×
            </button>
          </div>
        </section>
      )}

      <div
        className={`builder-menu-stage builder-menu-stage-left${isLeftMenuOpen ? " open" : ""}`}
        data-draggable-stage=""
        data-floating={leftPanelDrag.isFloating ? "true" : undefined}
        style={leftPanelDrag.containerStyle}
      >
        <nav
          className="builder-menu builder-menu-left"
          role="navigation"
          aria-label="Component and wiring controls"
        >
          {!leftPanelDrag.isFloating && (
            <PanelDragHandle
              dragHandleProps={leftPanelDrag.dragHandleProps}
              onReset={leftPanelDrag.resetLayout}
            />
          )}
          <div className="builder-menu-scroll">
            {ENABLE_SCROLLER_MENU ? (
              <ScrollerMenu
                components={UNIFIED_COMPONENT_ACTIONS}
                onSelect={handleComponentAction}
                disabled={controlsDisabled}
                isOpen={isLeftMenuOpen}
              />
            ) : (
            <div className="slider-section">
              <span className="slider-heading">Components</span>
              <div className="slider-stack">
                {COMPONENT_CATALOG.filter((entry) => entry.kind !== "wire").map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="slider-btn slider-btn-compact"
                    onClick={() => handleCatalogComponent(entry)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled ? controlDisabledTitle : entry.description
                    }
                    data-component-catalog={entry.kind}
                  >
                    <span className="slider-icon" aria-hidden="true">
                      {entry.icon}
                    </span>
                    <span className="slider-label">{entry.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Legacy 3D Parts</span>
              <div className="slider-stack">
                {COMPONENT_ACTIONS.map((component) => (
                  <button
                    key={component.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => handleComponentAction(component)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled ? controlDisabledTitle : component.description || component.label
                    }
                    data-component-action={component.action}
                    data-tutorial-id={
                      component.id === "battery"
                        ? "tutorial-add-battery"
                        : component.id === "resistor"
                          ? "tutorial-add-resistor"
                          : component.id === "lamp"
                            ? "tutorial-add-lamp"
                            : component.id === "switch"
                              ? "tutorial-add-switch"
                          : undefined
                    }
                  >
                    <ComponentLibraryCard
                      component={component}
                      thumbnailsEnabled={isLeftMenuOpen}
                      animateThumbnails={shouldAnimateLibraryThumbnails}
                    />
                  </button>
                ))}
              </div>
              {IS_DEMO_MODE && (
                <a
                  href="https://play.google.com/store/apps/details?id=com.circuitry3d.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    marginTop: "10px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(136,204,255,0.28)",
                    background: "rgba(136,204,255,0.07)",
                    color: "rgba(170,210,255,0.85)",
                    fontSize: "0.72rem",
                    textAlign: "center",
                    textDecoration: "none",
                    lineHeight: 1.4,
                  }}
                >
                  🚀 Get the full native experience
                  <br />
                  <span style={{ opacity: 0.7 }}>Download on Play Store →</span>
                </a>
              )}
            </div>
            <div
              className="slider-section"
              data-tutorial-id="tutorial-beginner-series-presets"
            >
              <span className="slider-heading">Beginner Series Starters</span>
              <div className="slider-stack">
                {BEGINNER_SERIES_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="slider-btn slider-btn-stacked"
                    onClick={() => handleLoadBeginnerSeriesPreset(preset.preset)}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled
                        ? controlDisabledTitle
                        : `Load preset: ${preset.label}`
                    }
                  >
                    <span className="slider-label">{preset.label}</span>
                    <span className="slider-description">
                      {preset.description}
                    </span>
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
              <span className="slider-heading">3D Schematic Workspace</span>
              <div className="slider-stack">
                <button
                  type="button"
                  className="slider-btn slider-btn-stacked"
                  onClick={() => setSchematicPanelOpen(true)}
                  title="Open dedicated 3D schematic grid workspace with advanced placement tools"
                >
                  <span className="slider-label">Open Grid Workspace</span>
                  <span className="slider-description">
                    Snap-to-grid placement with IEEE/ANSI/IEC symbols
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
                  const isCycleRouting = action.action === "cycle-wire-routing";
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
                    if (isCycleRouting) {
                      return `Current routing: ${wireRoutingLabel}`;
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
        data-draggable-stage=""
        data-floating={rightPanelDrag.isFloating ? "true" : undefined}
        style={rightPanelDrag.containerStyle}
      >
        <PanelResizeHandles getProps={rightPanelDrag.getResizeHandleProps} />
        {rightPanelDrag.isFloating && (
          <PanelDragHandle
            dragHandleProps={rightPanelDrag.dragHandleProps}
            onReset={rightPanelDrag.resetLayout}
          />
        )}
        <button
          type="button"
          className="builder-menu-toggle builder-menu-toggle-right"
          onClick={() => setRightMenuOpen((open) => !open)}
          aria-expanded={isRightMenuOpen}
          aria-label={
            isRightMenuOpen
              ? "Collapse settings"
              : "Expand settings"
          }
          title={
            isRightMenuOpen
              ? "Collapse settings"
              : "Expand settings"
          }
        >
          <span className="toggle-icon">{isRightMenuOpen ? "▶" : "◀"}</span>
          <span className="toggle-text">Settings</span>
        </button>
        <nav
          className="builder-menu builder-menu-right"
          role="complementary"
          aria-label="Settings"
        >
          {!rightPanelDrag.isFloating && (
            <PanelDragHandle
              dragHandleProps={rightPanelDrag.dragHandleProps}
              onReset={rightPanelDrag.resetLayout}
            />
          )}
          <div className="builder-menu-scroll">
            <div className="slider-section">
              <span className="slider-heading">Visualization</span>
              <div className="slider-stack">
                {CURRENT_MODE_ACTIONS.map((action) => {
                  const isFlowToggle = action.action === "toggle-current-flow";
                  const isPolarityToggle = action.action === "toggle-polarity";
                  const isLayoutCycle = action.action === "cycle-layout";
                  const isMeasurementToggle =
                    action.action === "open-measurement-tools";
                  const isActionActive = isFlowToggle
                    ? modeState.currentFlowStyle === "solid"
                    : isPolarityToggle
                      ? modeState.showPolarityIndicators
                      : isMeasurementToggle
                        ? isMeasurementPanelOpen
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
                    if (isMeasurementToggle) {
                      return isMeasurementPanelOpen
                        ? "Measurement tools open"
                        : action.description;
                    }
                    return action.description;
                  })();

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() => handleModeAction(action)}
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      title={
                        controlsDisabled
                          ? controlDisabledTitle
                          : action.description
                      }
                      data-active={isActionActive ? "true" : undefined}
                      aria-pressed={
                        isFlowToggle || isPolarityToggle || isMeasurementToggle
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
                    (isLabelToggle && labelVisibilityLevel > 0);
                  const description = (() => {
                    if (isGridToggle) {
                      return modeState.showGrid
                        ? "Grid visible"
                        : "Grid hidden";
                    }
                    if (isLabelToggle) {
                      return labelVisibilityDescription;
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
              <div className="slider-section">
                <span className="slider-heading">Grid Style</span>
                <div className="builder-logo-setting">
                  <label htmlFor="grid-brightness-slider">Brightness</label>
                  <div className="setting-input">
                    <input
                      id="grid-brightness-slider"
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={modeState.gridBrightness}
                      onChange={(e) => {
                        const brightness = Number(e.target.value);
                        setModeState((prev) => ({ ...prev, gridBrightness: brightness }));
                        triggerBuilderAction("set-grid-style", {
                          brightness,
                          lineWidth: modeState.gridLineWidth,
                          hue: modeState.gridHue,
                        });
                      }}
                      disabled={controlsDisabled}
                      aria-valuetext={`${modeState.gridBrightness}% brightness`}
                    />
                    <span className="setting-value">{modeState.gridBrightness}%</span>
                  </div>
                </div>
                <div className="builder-logo-setting">
                  <label htmlFor="grid-linewidth-slider">Line Width</label>
                  <div className="setting-input">
                    <input
                      id="grid-linewidth-slider"
                      type="range"
                      min={1}
                      max={3}
                      step={0.5}
                      value={modeState.gridLineWidth}
                      onChange={(e) => {
                        const lineWidth = Number(e.target.value);
                        setModeState((prev) => ({ ...prev, gridLineWidth: lineWidth }));
                        triggerBuilderAction("set-grid-style", {
                          brightness: modeState.gridBrightness,
                          lineWidth,
                          hue: modeState.gridHue,
                        });
                      }}
                      disabled={controlsDisabled}
                      aria-valuetext={`${modeState.gridLineWidth}px line width`}
                    />
                    <span className="setting-value">{modeState.gridLineWidth}px</span>
                  </div>
                </div>
                <div className="builder-logo-setting">
                  <label htmlFor="grid-hue-slider">Color</label>
                  <div className="setting-input">
                    <input
                      id="grid-hue-slider"
                      type="range"
                      min={0}
                      max={359}
                      step={1}
                      value={modeState.gridHue}
                      className="grid-hue-slider"
                      onChange={(e) => {
                        const hue = Number(e.target.value);
                        setModeState((prev) => ({ ...prev, gridHue: hue }));
                        triggerBuilderAction("set-grid-style", {
                          brightness: modeState.gridBrightness,
                          lineWidth: modeState.gridLineWidth,
                          hue,
                        });
                      }}
                      disabled={controlsDisabled}
                      aria-valuetext={`${modeState.gridHue}° hue`}
                    />
                    <span
                      className="setting-value"
                      style={{ color: `hsl(${modeState.gridHue},80%,70%)` }}
                    >
                      {modeState.gridHue}°
                    </span>
                  </div>
                </div>
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
                      onClick={() => {
                        if (setting.action === "open-logo-settings") {
                          setLogoSettingsOpen(!isLogoSettingsOpen);
                        } else {
                          triggerBuilderAction(setting.action, setting.data);
                        }
                      }}
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
          </div>
        </nav>
      </div>

      <div
        className={`builder-menu-stage builder-menu-stage-bottom${isBottomMenuOpen ? " open" : ""}`}
        data-draggable-stage=""
        data-floating={bottomPanelDrag.isFloating ? "true" : undefined}
        style={bottomPanelDrag.containerStyle}
      >
        <PanelResizeHandles getProps={bottomPanelDrag.getResizeHandleProps} />
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
          <span className="toggle-icon">{isBottomMenuOpen ? <IconChevronDown className="toggle-chevron" /> : <IconChevronUp className="toggle-chevron" />}</span>
          <span className="toggle-text">Analysis & Guides</span>
        </button>
        <nav
          className="builder-menu builder-menu-bottom"
          role="navigation"
          aria-label="Analysis, practice, and guides"
        >
          <PanelDragHandle
            dragHandleProps={bottomPanelDrag.dragHandleProps}
            onReset={bottomPanelDrag.resetLayout}
          />
          <div className="builder-menu-scroll builder-menu-scroll-bottom">
            <div className="slider-section">
              <span className="slider-heading">Analysis</span>
              <div className="menu-track menu-track-metrics">
                {wireMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="slider-metric"
                    title={`${metric.label}: ${metric.value} — Click to open the W.I.R.E. guide`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openHelpCenter("wire-guide")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openHelpCenter("wire-guide");
                      }
                    }}
                  >
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
                  {practiceWorksheetMessage}
                </div>
                {PRACTICE_ACTIONS.map((action) => {
                  const isOpenArenaAction = action.action === "open-arena";
                  const actionDisabled =
                    controlsDisabled ||
                    (isOpenArenaAction && isArenaSyncing);
                  const actionTitle = controlsDisabled
                    ? controlDisabledTitle
                    : isOpenArenaAction && isArenaSyncing
                      ? "Preparing Component Arena export…"
                      : action.description;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="slider-chip"
                      onClick={() => handlePracticeAction(action)}
                      disabled={actionDisabled}
                      aria-disabled={actionDisabled}
                      title={actionTitle}
                    >
                      <span className="slider-chip-label">{action.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="slider-chip"
                  onClick={openPracticePanel}
                  title={practiceWorksheetMessage}
                  data-complete={isPracticeWorksheetComplete ? "true" : undefined}
                >
                  <span className="slider-chip-label">Practice Worksheets</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={openSchematicPanel}
                  disabled={controlsDisabled}
                  aria-disabled={controlsDisabled}
                  title={
                    controlsDisabled
                      ? controlDisabledTitle
                      : "Open the 3D schematic builder overlay"
                  }
                >
                  <span className="slider-chip-label">3D Schematic Builder</span>
                </button>
                {PRACTICE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => {
                      triggerBuilderAction("load-preset", { preset: scenario.preset });
                      const problem = scenario.problemId
                        ? findPracticeProblemById(scenario.problemId)
                        : findPracticeProblemByPreset(scenario.preset);
                      if (problem) {
                        practiceProblemRef.current = problem.id;
                        setActivePracticeProblemId(problem.id);
                        setPracticeWorksheetState({ problemId: problem.id, complete: false });
                      }
                      openPracticePanel();
                    }}
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
              <span className="slider-heading">Environmental Conditions</span>
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{activeEnvironment.icon}</span>
                  <span>Active: {activeEnvironment.name}</span>
                </div>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => {
                    if (isFeatureLocked("environmental-panel")) {
                      showUpgradePrompt("environmental-panel");
                    } else {
                      setEnvironmentalPanelOpen(true);
                    }
                  }}
                  title={isDemoMode ? "Environmental Conditions — Full Version" : "Open Environmental Conditions panel to simulate different operating environments"}
                  data-active={activeEnvironment.id !== "standard" ? "true" : undefined}
                >
                  <span className="slider-chip-label">Configure Environment</span>
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
                      onClick={() => {
                        if (setting.action === "open-logo-settings") {
                          setLogoSettingsOpen(!isLogoSettingsOpen);
                        } else {
                          triggerBuilderAction(setting.action, setting.data);
                        }
                      }}
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
              <span className="slider-heading">Symbol Standard</span>
              <div className="slider-stack">
                <div className="schematic-standard-control" role="group" aria-label="Schematic symbol standard">
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
                <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem", lineHeight: "1.4" }}>
                  {schematicStandard === "ansi" 
                    ? "IEEE/ANSI standard (North American textbooks and trades)"
                    : "IEC standard (International/European convention)"}
                </p>
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Guides</span>
              <div className="menu-track menu-track-chips">
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => openGuidesWorkspace("tutorial")}
                  data-active={
                    isGuidesWorkspaceMode && activeGuideWorkflow === "tutorial"
                      ? "true"
                      : undefined
                  }
                  title="Open the Tutorial guide with sequenced build steps."
                >
                  <span className="slider-chip-label">Tutorial Guide</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => openGuidesWorkspace("wire-guide")}
                  data-active={
                    isGuidesWorkspaceMode && activeGuideWorkflow === "wire-guide"
                      ? "true"
                      : undefined
                  }
                  title="Open the W.I.R.E. guide for worksheet-first solving."
                >
                  <span className="slider-chip-label">W.I.R.E. Guide</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => {
                    openGuidesWorkspace("tutorial");
                    setInteractiveTutorialOpen(true);
                  }}
                  title="Start the interactive tutorial (battery -> resistor -> wire -> simulate)"
                >
                  <span className="slider-chip-label">
                    Launch Interactive Tutorial
                  </span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => {
                    setBuildAlongOpen(false);
                    triggerBuilderAction("load-payoff");
                    setShowcaseLocked(true);
                    setGuidedTourOpen(true);
                  }}
                  title="Replay the guided tour of the showcase circuit."
                >
                  <span className="slider-chip-label">Take the Tour</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => {
                    setGuidedTourOpen(false);
                    setShowcaseLocked(false);
                    setCircuitLocked(false);
                    triggerBuilderAction("clear-workspace");
                    setBuildAlongOpen(true);
                  }}
                  title="Build a circuit yourself, step by step."
                >
                  <span className="slider-chip-label">Build it with me</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => openHelpCenter("shortcuts")}
                  title="Open the keyboard and gesture shortcuts reference."
                >
                  <span className="slider-chip-label">Keyboard Shortcuts</span>
                </button>
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => openHelpCenter("about")}
                  title="Open feature notes and platform details."
                >
                  <span className="slider-chip-label">About CircuiTry3D</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>


      <div className="builder-ticker-feed" role="status" aria-live="polite">
        <div className="ticker-wire-fixed" role="group" aria-label="W.I.R.E. live metrics">
          {wireMetrics.map((metric) => (
            <span
              key={`ticker-wire-fixed-${metric.id}`}
              className={`ticker-wire-metric ticker-wire-metric--${metric.id}`}
              title={`${metric.label}: ${metric.value}`}
            >
              <span className="ticker-wire-letter" aria-hidden="true">
                {metric.letter}
              </span>
              <span className="ticker-wire-value">{metric.value}</span>
            </span>
          ))}
        </div>
        <div className="ticker-wrapper">
          <div className="ticker-content">
            <span className="ticker-item">
              {isFrameReady
                ? "Workspace ready: tap and drag to build"
                : "Loading workspace..."}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Wire: {wireRoutingLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item ticker-item-wire-profile">
              Wire Profile:{" "}
              {activeWireProfile
                ? `${activeWireProfile.gaugeLabel} (${activeWireSegmentResistance.toFixed(4)} Ω/m)`
                : "Default model"}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Flow: {currentFlowLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Layout: {layoutModeLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              {modeState.showGrid ? "Grid visible" : "Grid hidden"}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              {labelVisibilityDescription}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              {isFrameReady
                ? "Workspace ready: tap and drag to build"
                : "Loading workspace..."}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Wire: {wireRoutingLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item ticker-item-wire-profile">
              Wire Profile:{" "}
              {activeWireProfile
                ? `${activeWireProfile.gaugeLabel} (${activeWireSegmentResistance.toFixed(4)} Ω/m)`
                : "Default model"}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Flow: {currentFlowLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              Layout: {layoutModeLabel}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              {modeState.showGrid ? "Grid visible" : "Grid hidden"}
            </span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">
              {labelVisibilityDescription}
            </span>
          </div>
        </div>
      </div>

      <div className="builder-workspace" aria-busy={!isFrameReady}>
        <iframe
          ref={iframeRef}
          className="builder-iframe"
          title="CircuiTry3D Builder"
          src={builderFrameSrc}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <div
        className="builder-floating-controls"
        style={{ top: floatingControlsTop }}
        data-left-open={isLeftMenuOpen ? "true" : undefined}
        data-right-open={isRightMenuOpen ? "true" : undefined}
        role="group"
        aria-label="Workspace actions"
      >
        <button
          type="button"
          className="builder-floating-button"
          data-variant="clear"
          onClick={handleClearWorkspace}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          title={controlsDisabled ? controlDisabledTitle : "Clear all components, wires, and analysis data"}
        >
          Clear Workspace
        </button>
        <button
          type="button"
          className="builder-floating-button"
          data-variant="simulate"
          onClick={handleRunSimulationClick}
          disabled={controlsDisabled}
          aria-disabled={controlsDisabled}
          data-pulse={isSimulatePulsing ? "true" : undefined}
          title={controlsDisabled ? controlDisabledTitle : "Run the current circuit simulation"}
        >
          Run Simulation
        </button>
      </div>

      <div ref={floatingLogoRef} className="builder-floating-logo" aria-hidden="true">
        <span className="builder-logo-circui">Circui</span>
        <span className="builder-logo-try">Try</span>
        <span className="builder-logo-3d">3D</span>
      </div>

      <div className={`builder-logo-controls${isLogoSettingsOpen ? " open" : ""}`}>
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
          <p className="builder-logo-settings-description">Fine-tune how the logo drifts across the workspace.</p>
          <div className="builder-logo-setting">
            <label id="builder-logo-visible-label" htmlFor="builder-logo-visible">
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
              <span className="setting-value">{logoSettings.isVisible ? "On" : "Off"}</span>
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
                onChange={(event) => updateLogoSetting("opacity", Number(event.target.value))}
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.opacity)} percent opacity`}
              />
              <span className="setting-value">{Math.round(logoSettings.opacity)}%</span>
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
                onChange={(event) => updateLogoSetting("speed", Number(event.target.value))}
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.speed)} second cycle`}
              />
              <span className="setting-value">{Math.round(logoSettings.speed)}s</span>
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
                onChange={(event) => updateLogoSetting("travelX", Number(event.target.value))}
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.travelX)} percent width`}
              />
              <span className="setting-value">{Math.round(logoSettings.travelX)}%</span>
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
                onChange={(event) => updateLogoSetting("travelY", Number(event.target.value))}
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.travelY)} percent height`}
              />
              <span className="setting-value">{Math.round(logoSettings.travelY)}%</span>
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
                onChange={(event) => updateLogoSetting("bounce", Number(event.target.value))}
                disabled={prefersReducedMotion}
                tabIndex={isLogoSettingsOpen ? 0 : -1}
                aria-valuetext={`${Math.round(logoSettings.bounce)} pixel bounce`}
              />
              <span className="setting-value">{Math.round(logoSettings.bounce)}px</span>
            </div>
          </div>
          {prefersReducedMotion ? (
            <p className="builder-logo-settings-note">Motion is paused because your system prefers reduced motion.</p>
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
            <div
              className="schematic-standard-control"
              role="group"
              aria-label="Schematic symbol standard"
            >
              <span className="schematic-standard-label">Symbol Standard</span>
              <div className="schematic-standard-buttons">
                {SYMBOL_STANDARD_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={
                      schematicSymbolStandard === option.key
                        ? "schematic-standard-button is-active"
                        : "schematic-standard-button"
                    }
                    onClick={() => setSchematicSymbolStandard(option.key)}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <BuilderWorkspace symbolStandard={schematicSymbolStandard} />
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
        <div className="builder-panel-shell builder-panel-shell--practice" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="builder-payoff-guard"
            aria-label="Showcase circuit is locked — tap to start editing"
            title="Tap to edit this circuit"
            onClick={() => setShowcaseLocked(false)}
          >
            <span className="builder-payoff-guard__hint">🔒 Demo circuit — tap to edit</span>
          </button>
        )}
      </div>

      {/* Perimeter bar background — visual base for the bottom navigation strip
          containing zoom controls (left), Insights toggle (centre) and AI button (right).
          pointer-events:none so the workspace iframe receives touch events in blank areas. */}
      {isActiveCircuitBuildMode && !isOverlayActive && (
        <div className="builder-perimeter-bar" aria-hidden="true" />
      )}

      {isActiveCircuitBuildMode && !isOverlayActive && (
        <div className="circuit-zoom-controls" aria-label="Zoom controls">
          <button
            type="button"
            className="circuit-zoom-btn"
            onClick={() => triggerBuilderAction("zoom-in")}
            disabled={controlsDisabled}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="circuit-zoom-btn"
            onClick={() => triggerBuilderAction("fit-screen")}
            disabled={controlsDisabled}
            aria-label="Fit circuit to screen"
            title="Fit to screen"
          >
            ⊡
          </button>
          <button
            type="button"
            className="circuit-zoom-btn"
            onClick={() => triggerBuilderAction("zoom-out")}
            disabled={controlsDisabled}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
        </div>
      )}

      {activeWorkspacePanelMode && workspacePanelMeta && workspacePanelContent && (
        <WorkspaceModePanel
          title={workspacePanelMeta.title}
          subtitle={workspacePanelMeta.subtitle ?? ""}
          isOpen={isWorkspacePanelOpen}
          onToggle={() => setWorkspacePanelOpen((open) => !open)}
          className={
            activeWorkspacePanelMode === "arena"
              ? "workspace-mode-panel--arena"
              : activeWorkspacePanelMode === "settings"
                ? "workspace-mode-panel--settings"
                : undefined
          }
        >
          {workspacePanelContent}
        </WorkspaceModePanel>
      )}

      <div
        className={`builder-panel-overlay builder-panel-overlay--workspace-section${activeWorkspaceSection ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isArenaPanelOpen}
      >
        <div
          className="builder-panel-shell builder-panel-shell--workspace-section"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="builder-panel-body builder-panel-body--arena">
            <ArenaView variant="embedded" />
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
              {(section.paragraphs ?? []).map((paragraph, paragraphIndex) =>
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

      {/* Troubleshoot Panel - Compact floating panel following Practice pattern */}
      {workspaceMode === "troubleshoot" && (
        <TroubleshootPanel
          isOpen={isTroubleshootPanelOpen}
          onToggle={() => setTroubleshootPanelOpen(!isTroubleshootPanelOpen)}
          activeProblemId={activeTroubleshootId}
          onProblemChange={(nextId) => {
            setTroubleshootCheckPending(false);
            setTroubleshootPendingCheckProblemId(null);
            setActiveTroubleshootId(nextId);
            setTroubleshootStatus(null);
            const next = troubleshootingProblems.find((p) => p.id === nextId) ?? null;
            if (next) {
              triggerBuilderAction("load-preset", { preset: next.preset });
              setWorkspaceModeWithGlobalSync("troubleshoot");
              setTroubleshootPanelOpen(true);
              setCircuitLocked(true);
            }
          }}
          solvedIds={troubleshootSolvedIds}
          status={troubleshootStatus}
          isChecking={isTroubleshootCheckPending}
          onReset={() => {
            if (!activeTroubleshootProblem) return;
            setWorkspaceModeWithGlobalSync("troubleshoot");
            setTroubleshootPanelOpen(true);
            setTroubleshootCheckPending(false);
            setTroubleshootPendingCheckProblemId(null);
            triggerBuilderAction("load-preset", { preset: activeTroubleshootProblem.preset });
            setCircuitLocked(true);
            setTroubleshootStatus("Circuit reset. Study the schematic, then click Start Fixing.");
          }}
          onCheck={() => {
            if (!activeTroubleshootProblem) return;
            setWorkspaceModeWithGlobalSync("troubleshoot");
            setTroubleshootPanelOpen(true);
            setTroubleshootStatus("Checking…");
            setTroubleshootPendingCheckProblemId(activeTroubleshootProblem.id);
            setTroubleshootCheckPending(true);
            triggerBuilderAction("run-simulation");
          }}
          onNext={() => {
            if (!troubleshootingProblems.length) return;
            const index = activeTroubleshootProblem
              ? troubleshootingProblems.findIndex((p) => p.id === activeTroubleshootProblem.id)
              : -1;
            const next =
              troubleshootingProblems[(index + 1 + troubleshootingProblems.length) % troubleshootingProblems.length] ??
              troubleshootingProblems[0] ??
              null;
            if (!next) return;
            setWorkspaceModeWithGlobalSync("troubleshoot");
            setTroubleshootPanelOpen(true);
            setTroubleshootCheckPending(false);
            setTroubleshootPendingCheckProblemId(null);
            setActiveTroubleshootId(next.id);
            setTroubleshootStatus(null);
            triggerBuilderAction("load-preset", { preset: next.preset });
            setCircuitLocked(true);
          }}
          onClose={exitTroubleshootMode}
          isFrameReady={isFrameReady}
          isCircuitLocked={isCircuitLocked}
          onUnlockCircuit={() => {
            setCircuitLocked(false);
            setTroubleshootStatus("Circuit unlocked! Fix the fault, then tap Check Fix.");
          }}
        />
      )}

      <div
        className={`builder-panel-overlay builder-panel-overlay--logo-settings${isLogoSettingsOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isLogoSettingsOpen}
        onClick={() => setLogoSettingsOpen(false)}
      >
        <div
          className="builder-panel builder-panel--logo-settings"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="builder-panel-brand" aria-hidden="true">
            <BrandMark size="sm" decorative />
          </div>
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setLogoSettingsOpen(false)}
            aria-label="Close logo motion settings"
          >
            ×
          </button>
          <LogoSettingsModal
            isOpen={isLogoSettingsOpen}
            onToggle={() => setLogoSettingsOpen(!isLogoSettingsOpen)}
            logoSettings={logoSettings}
            prefersReducedMotion={prefersReducedMotion}
            onLogoSettingChange={handleLogoSettingChange}
            onToggleLogoVisibility={toggleLogoVisibility}
            onResetLogoSettings={resetLogoSettings}
          />
        </div>
      </div>

      <div
        className={`measurement-panel-float${isMeasurementPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label="Measurement tools"
        aria-hidden={!isMeasurementPanelOpen}
      >
        <div className="builder-panel-shell builder-panel-shell--measurement">
          <div className="builder-panel-brand" aria-hidden="true">
            <BrandMark size="sm" decorative />
          </div>
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setMeasurementPanelOpen(false)}
            aria-label="Close measurement tools"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--measurement">
            <MeasurementToolsPanel
              meterState={meterState}
              controlsDisabled={controlsDisabled}
              controlDisabledTitle={controlDisabledTitle}
              onSetMode={handleMeterModeChange}
              onToggleArmed={handleMeterToggle}
              onClear={handleMeterClear}
            />
          </div>
        </div>
      </div>

      {isPracticeWorkspaceMode && activePracticeProblemId && (
        <CompactWorksheetPanel
          problem={findPracticeProblemById(activePracticeProblemId) || DEFAULT_PRACTICE_PROBLEM!}
          isOpen={isCompactWorksheetOpen}
          onToggle={() => setCompactWorksheetOpen(!isCompactWorksheetOpen)}
          onComplete={(complete) => {
            setPracticeWorksheetState({
              problemId: activePracticeProblemId,
              complete,
            });
            if (!complete) {
              setCircuitLocked(true);
            }
          }}
          onRequestUnlock={() => {
            setCircuitLocked(false);
            setCompactWorksheetOpen(false);
          }}
          onAdvance={handleAdvancePracticeProblem}
        />
      )}

      {isTroubleshootWorkspaceMode && (
        <CompactTroubleshootPanel
          problems={troubleshootingProblems}
          activeProblemId={activeTroubleshootId}
          solvedIds={troubleshootSolvedIds}
          answerValue={activeTroubleshootAnswer}
          isDiagnosisAccepted={isActiveTroubleshootDiagnosisAccepted}
          isFixVerified={isCurrentTroubleshootFixVerified}
          status={troubleshootStatus}
          isOpen={isTroubleshootPanelOpen}
          isChecking={isTroubleshootCheckPending}
          isFrameReady={isFrameReady}
          isCircuitLocked={isCircuitLocked}
          onToggle={() => setTroubleshootPanelOpen(!isTroubleshootPanelOpen)}
          onSelectProblem={handleSelectTroubleshootProblem}
          onAnswerChange={handleTroubleshootAnswerChange}
          onSubmitAnswer={handleSubmitTroubleshootAnswer}
          onResetCircuit={handleResetTroubleshootProblem}
          onCheckFix={handleCheckTroubleshootFix}
          onNextProblem={handleAdvanceTroubleshootProblem}
          onUnlockEditing={
            isActiveTroubleshootSolved && isCurrentTroubleshootFixVerified
              ? handleUnlockTroubleshootEditing
              : undefined
          }
        />
      )}

      {isGuidesWorkspaceMode && (
        <CompactGuidesPanel
          isOpen={isGuidesPanelOpen}
          activeGuide={activeGuideWorkflow}
          onToggle={() => setGuidesPanelOpen(!isGuidesPanelOpen)}
          onSelectGuide={(guide) => {
            setActiveGuideWorkflow(guide);
            setWorkspaceModeWithGlobalSync("help");
            setGuidesWorkspaceMode(true);
            setGuidesPanelOpen(true);
          }}
          onLaunchInteractiveTutorial={() => {
            setActiveGuideWorkflow("tutorial");
            setInteractiveTutorialOpen(true);
          }}
          onOpenPracticeWorksheet={() => openPracticeWorkspace()}
          onOpenShortcutsReference={() => openHelpCenter("shortcuts")}
          onOpenAboutReference={() => openHelpCenter("about")}
        />
      )}

      <div
        className={`builder-panel-overlay builder-panel-overlay--environment${isEnvironmentalPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isEnvironmentalPanelOpen}
        onClick={() => setEnvironmentalPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--environment"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="builder-panel-brand" aria-hidden="true">
            <BrandMark size="sm" decorative />
          </div>
          <div className="builder-panel-body builder-panel-body--environment">
            <EnvironmentalPanel
              baseMetrics={circuitBaseMetrics}
              onScenarioChange={handleEnvironmentChange}
            />
          </div>
        </div>
      </div>

      {/* Wire Library Panel */}
      <WireLibraryPanel
        isOpen={isWireLibraryPanelOpen}
        onClose={() => setWireLibraryPanelOpen(false)}
        onSelectWire={setSelectedWireId}
        selectedWireId={selectedWireId}
      />

      {/* Circuit Save Modal */}
      <CircuitSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={(name, description, tags) => {
          return circuitStorage.saveCurrentCircuit(name, currentCircuitState, {
            description,
            tags,
          });
        }}
        currentCircuit={circuitStorage.currentCircuit}
        circuitState={currentCircuitState}
      />

      {/* Circuit Load Modal */}
      <CircuitLoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={(id) => circuitStorage.loadCircuitById(id)}
        onDelete={(id) => circuitStorage.deleteCircuitById(id)}
        onDuplicate={(id) => circuitStorage.duplicateCircuitById(id)}
        onRename={(id, newName) => circuitStorage.renameCircuitById(id, newName)}
        onExport={(format) => {
          if (isFeatureLocked("export")) {
            showUpgradePrompt("export");
            return { success: false, error: "Feature locked in Demo Mode" } as any;
          }
          return circuitStorage.exportCurrentCircuit(format);
        }}
        onImport={(file) => {
          if (isFeatureLocked("import")) {
            showUpgradePrompt("import");
            return { success: false, error: "Feature locked in Demo Mode" } as any;
          }
          return circuitStorage.importCircuitFile(file);
        }}
        onNewCircuit={() => {
          circuitStorage.clearCurrentCircuit();
          triggerBuilderAction("clear-workspace");
        }}
        savedCircuits={circuitStorage.savedCircuits}
        currentCircuitId={circuitStorage.currentCircuit?.metadata.id}
        hasUnsavedChanges={circuitStorage.hasUnsavedChanges}
      />

      {/* Recovery Banner */}
      {circuitStorage.recoveryData && (
        <CircuitRecoveryBanner
          recoveryData={circuitStorage.recoveryData}
          onRecover={() => circuitStorage.recoverCircuit()}
          onDismiss={() => circuitStorage.dismissRecovery()}
        />
      )}

      {/* Classroom Panel Overlay */}
      <div
        className={`builder-panel-overlay builder-panel-overlay--classroom${isClassroomPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isClassroomPanelOpen}
        onClick={() => setClassroomPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--classroom"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setClassroomPanelOpen(false)}
            aria-label="Close classroom panel"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--classroom">
            <ClassroomPage />
          </div>
        </div>
      </div>

      {/* Pricing Panel Overlay */}
      <div
        className={`builder-panel-overlay builder-panel-overlay--pricing${isPricingPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isPricingPanelOpen}
        onClick={() => setPricingPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--pricing"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setPricingPanelOpen(false)}
            aria-label="Close pricing panel"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--pricing">
            <PricingSection />
          </div>
        </div>
      </div>

      {/* Community Panel Overlay */}
      <div
        className={`builder-panel-overlay builder-panel-overlay--community${isCommunityPanelOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isCommunityPanelOpen}
        onClick={() => setCommunityPanelOpen(false)}
      >
        <div
          className="builder-panel-shell builder-panel-shell--community"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setCommunityPanelOpen(false)}
            aria-label="Close community panel"
          >
            X
          </button>
          <div className="builder-panel-body builder-panel-body--community">
            <CommunityPage />
          </div>
        </div>
      </div>

      <BuilderInteractiveTutorial
        isOpen={isInteractiveTutorialOpen}
        onClose={() => setInteractiveTutorialOpen(false)}
        modeState={modeState}
        circuitState={circuitState}
        lastSimulationAt={lastSimulationAt}
        isLeftMenuOpen={isLeftMenuOpen}
        onRequestOpenLeftMenu={() => setLeftMenuOpen(true)}
      />
    </div>
  );
}
