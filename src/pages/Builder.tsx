import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBuilderFrame } from "../hooks/builder/useBuilderFrame";
import { useLogoAnimation } from "../hooks/builder/useLogoAnimation";
import { useHelpModal } from "../hooks/builder/useHelpModal";
import { useResponsiveLayout } from "../hooks/builder/useResponsiveLayout";
import { useWorkspaceBackground } from "../hooks/builder/useWorkspaceBackground";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import "../styles/builder-ui.css";
import "../styles/schematic.css";
import "../styles/interactive-tutorial.css";
import { getSchematicSymbol, type ComponentSymbol } from "../components/circuit/SchematicSymbols";
import BrandMark from "../components/BrandMark";
import { CompactWorksheetPanel } from "../components/builder/panels/CompactWorksheetPanel";
import { CompactTroubleshootPanel } from "../components/builder/panels/CompactTroubleshootPanel";
import { CompactGuidesPanel } from "../components/builder/panels/CompactGuidesPanel";
import { WorkspaceModePanel } from "../components/builder/panels/WorkspaceModePanel";
import { EnvironmentalPanel } from "../components/builder/panels/EnvironmentalPanel";
import {
  type EnvironmentalScenario,
  getDefaultScenario,
} from "../data/environmentalScenarios";
import ArenaView from "../components/arena/ArenaView";
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
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
  getRandomPracticeProblem,
} from "../data/practiceProblems";
import troubleshootingProblems, {
  getAnalyzeCircuitResult,
  isTroubleshootingDiagnosisCorrect,
  isTroubleshootingSolved,
  type TroubleshootingProblem,
} from "../data/troubleshootingProblems";
import type { WireSpec } from "../data/wireLibrary";
import type { PracticeProblem } from "../model/practice";
import type {
  BuilderInvokeAction,
  ComponentAction,
  BuilderToolId,
  WorkspaceMode,
  GuideWorkflowId,
  LegacyModeState,
  HelpSection,
  HelpModalView,
  SettingsItem,
  LogoNumericSettingKey,
  PracticeWorksheetStatus,
  PanelAction,
} from "../components/builder/types";
import {
  COMPONENT_ACTIONS,
  QUICK_ADD_COMPONENTS,
  WIRE_TOOL_ACTIONS,
  CURRENT_MODE_ACTIONS,
  VIEW_CONTROL_ACTIONS,
  SETTINGS_ITEMS,
  WIRE_LEGEND,
  DEFAULT_LOGO_SETTINGS,
  ENABLE_SCROLLER_MENU,
} from "../components/builder/constants";
import {
  CATALOG_COMPONENTS,
  builderTypeFor,
  toWorkspaceProperties,
} from "../data/componentCatalog";
import {
  clampLabelVisibilityLevel,
  getLabelVisibilityDescription,
  getNextLabelToggleTitle,
  resolveLabelVisibilityLevel,
} from "../components/builder/labelVisibility";
import { IS_DEMO_MODE, DEMO_COMPONENT_IDS } from "../utils/demoMode";
import { isAndroidApp } from "../utils/playStoreBilling";
import { useComponent3DThumbnail } from "../components/builder/toolbars/useComponent3DThumbnail";
import wireStrippersIcon from "../assets/wire-strippers-icon.svg";
import PricingSection from "../components/PricingSection";
import SubscriptionSection from "../components/SubscriptionSection";
import Community from "./Community";
import Gallery from "./Gallery";
import Account from "./Account";
import Classroom from "./Classroom";
import Arcade from "./Arcade";
import Settings from "./Settings";
import Textbook from "./Textbook";
import WireLibrary from "../components/practice/WireLibrary";
import { AIHelperPanel } from "../components/builder/AIHelperPanel";
import { CircuitExplainPanel } from "../components/builder/CircuitExplainPanel";
import { CinematicPanel } from "../components/builder/panels/CinematicPanel";
import type { CinematicPreset } from "../components/builder/panels/CinematicPanel";
import { useGallery } from "../context/GalleryContext";
import { useAppSettings } from "../context/AppSettingsContext";
import type { CinematicFramePayload, CinematicVideoPayload } from "../hooks/builder/useBuilderFrame";
import "../styles/cinematic.css";
import "../styles/circuit-explain.css";
import "../styles/scroller-menu.css";
import { ScrollerMenu } from "../components/builder/ScrollerMenu";
import { InsightsFilmReel } from "../components/builder/InsightsFilmReel";
import CurrentFlowAnimation from '../components/CurrentFlowAnimation';

type WorkspacePanelMode =
  | "arena"
  | "arcade"
  | "classroom"
  | "community"
  | "account"
  | "pricing"
  | "wire-guide"
  | "textbook"
  | "gallery"
  | "settings";

const DEFAULT_WIRE_SEGMENT_RESISTANCE_OHM = 0.01;
const CURRENT_FLOW_PAYOFF_STORAGE_KEY =
  "circuitry3d:onboarding:current-flow-payoff:v2";
const INTRO_DIALOG_STORAGE_KEY = "circuitry3d:onboarding:v1";
const JUNCTION_TIP_STORAGE_KEY = "circuitry3d:junction-tip-dismissed:v1";
// Set once the user dismisses the guided tour "for good" — after that it no longer
// auto-opens on launch (still re-launchable from the Guides menu).
const TOUR_DISMISSED_KEY = "circuitry3d:onboarding:tour-dismissed:v1";
const ACTION_BAR_MODE_STORAGE_KEY = "ct3d.actionbar.mode";
const THUMB_DESCRIPTORS_STORAGE_KEY = "ct3d.actionbar.descriptors";

type ActionBarMode = "full" | "tools" | "hidden";

/**
 * Derive a short, plain-language descriptor for a component palette button.
 * Component descriptions follow the pattern "Name - what it does"; we strip
 * the leading name and any redundant symbol prefixes so newcomers who don't
 * recognise a part by name still get a friendly hint (e.g. "controls current
 * flow"). Falls back to the unit/symbol descriptor, then the label.
 */
function getComponentShortDescriptor(component: ComponentAction): string {
  const raw = (component.description ?? "").trim();
  if (raw) {
    // Split on the first " - " / " — " separator that follows the name.
    const parts = raw.split(/\s[—-]\s/);
    let tail = (parts.length > 1 ? parts.slice(1).join(" - ") : raw).trim();
    // Drop a leading repeat of the component label if present.
    const label = (component.label ?? "").trim();
    if (label && tail.toLowerCase().startsWith(label.toLowerCase())) {
      tail = tail.slice(label.length).replace(/^[\s:–—-]+/, "").trim();
    }
    if (tail) {
      // Keep it short — first clause only, capped length.
      const clause = tail.split(/[.;]/)[0].trim();
      const compact = clause.length > 38 ? `${clause.slice(0, 36).trim()}…` : clause;
      return compact.charAt(0).toUpperCase() + compact.slice(1);
    }
  }
  return component.metadata?.symbolDesc ?? component.label ?? "";
}

// Payoff retry delays: first retry shows the banner and re-triggers the flow
// animation after the 3D scene has rendered its first frame (~480 ms).
// Second retry at 1.2 s covers slow devices and first-load jank where the
// WebGL context initialises later than usual.
// Third retry at 2.8 s is exclusively for Android (Capacitor) where the WebView
// can be slow to stabilise GPU state on first launch; web builds skip this.
const PAYOFF_FIRST_RETRY_MS = 480;
const PAYOFF_SECOND_RETRY_MS = 1200;
const PAYOFF_THIRD_RETRY_MS_ANDROID = 2800;

const toWireProfileBridgePayload = (wireProfile: WireSpec | null) => {
  if (!wireProfile) {
    return null;
  }

  return {
    id: wireProfile.id,
    gaugeLabel: wireProfile.gaugeLabel,
    // Conductor material ID (e.g. "annealedCopper", "nichrome80") — used by FUSE™ for
    // material-aware failure detection (resistance vs. conductor category)
    conductorMaterial: wireProfile.material,
    materialLabel: wireProfile.materialLabel,
    // Conductor thermal conductivity (W/m·K) — used in the FUSE™ thermal model to
    // scale heat retention for low-conductivity resistance alloys vs. copper
    conductorThermalConductivityWPerMK: wireProfile.thermalConductivityWPerMK,
    insulationLabel: wireProfile.insulationLabel,
    // Conductor bare diameter (mm) — drives 3D tube radius scaling
    diameterMm: wireProfile.diameterMm,
    // Insulation class ID (e.g. "pvc80", "xlpe125") — drives jacket color, thickness, FUSE thermal limit
    insulationClass: wireProfile.insulationClass,
    // Max continuous operating temperature from the insulation class (°C)
    insulationMaxTempC: wireProfile.maxTemperatureC,
    maxTemperatureC: wireProfile.maxTemperatureC,
    resistanceOhmPerMeter: wireProfile.resistanceOhmPerMeter,
    ampacityBundleA: wireProfile.ampacityBundleA,
    ampacityChassisA: wireProfile.ampacityChassisA,
    maxVoltageV: wireProfile.maxVoltageV,
  };
};

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    paragraphs: [
      "Pull out the Component Library, tap a device, then place it directly into the 3D workspace.",
      "Use the Wire Tool to drag intelligent routes between pins - swap between Freeform, Manhattan (90-deg), Square (outside), Simple, Perimeter, or A* routing modes from the left panel.",
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
      "Orbit with left-click drag, pan with Shift+scroll or right-click, and scroll or pinch to zoom.",
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
const TUTORIAL_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    paragraphs: [
      "Add components from the Components menu, then place them directly into the 3D workspace.",
      "Use the Wire tool to connect terminals and close the circuit so current can flow.",
      "Open the analysis panels on the right to watch live calculations while you build.",
    ],
    bullets: [
      "Quick keys: B (battery), R (resistor), L (LED), S (switch), J (junction).",
      "Wire tool supports freeform, Manhattan (90-deg), square outside, simple, perimeter, and A* auto-routing modes.",
      "Analysis panels include W.I.R.E., EIR triangle, power, worksheet, and solve tabs.",
    ],
  },
  {
    title: "Junction Nodes: The Key to Complex Circuits",
    paragraphs: [
      "Junctions (amber dots) let you branch wires anywhere along an existing run. Click any point on a wire to drop a junction, then draw new wires from it.",
      "This is critical for parallel and series-parallel circuit problems—think 'squares within squares' layouts where branches contain both series and parallel elements.",
    ],
    bullets: [
      "Hover over a wire to see the pulsing '+' indicator where you can add a junction.",
      "From a junction, draw wires in any direction to create parallel paths.",
      "Use junctions to break complex problems into series sections and parallel sections for step-by-step solving.",
      "Junctions automatically merge nearby nodes and maintain circuit connectivity.",
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
      "Swap between free-form, Manhattan, and Square (outside) routes for textbook wiring.",
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
      "Complete the circuit, use junctions for parallel runs, and experiment with routing modes for tidy builds.",
    ],
  },
];

const WIRE_GUIDE_SECTIONS: HelpSection[] = [
  {
    title: "W.I.R.E. Overview",
    paragraphs: [
      "The W.I.R.E. method keeps four core electrical values front and centre while you build or solve circuits. Each value has a dedicated color so you can spot it instantly in any panel or worksheet.",
      "Use this solve cycle: capture known values, choose one unknown, pick the matching formula, then verify with simulation.",
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
      "5. Check your work with Kirchhoff: sum voltages around each closed path and verify currents at junctions.",
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
      "Free-form, Manhattan, square outside, simple, perimeter, and A* routing styles.",
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
      "W = Watts (blue) · I = Current/Amps (yellow-orange) · R = Resistance/Ohms (green) · E = Voltage (red). Use these four values and their color codes to design, analyze, and solve circuits.",
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

const IconUndo = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M7 6 3.5 9.5 7 13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9.5h6.25a4.25 4.25 0 1 1 0 8.5H9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconRedo = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M13 6 16.5 9.5 13 13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 9.5H9.75a4.25 4.25 0 1 0 0 8.5H11"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconFolder = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2.75 7A1.75 1.75 0 0 1 4.5 5.25h3.2l1.6 1.9h6.2a1.75 1.75 0 0 1 1.75 1.75v5.6a1.75 1.75 0 0 1-1.75 1.75h-11a1.75 1.75 0 0 1-1.75-1.75V7Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.75 8.5h14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSave = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4.5 3.75h9.4l2.35 2.35V15.5a1.75 1.75 0 0 1-1.75 1.75h-10a1.75 1.75 0 0 1-1.75-1.75v-10A1.75 1.75 0 0 1 4.5 3.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.25 3.75V8h6.5V3.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 13.25h7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBolt = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M11.25 1.5L4 11.5h5l-1.25 7L15 8.5h-5l1.25-7Z" />
  </svg>
);

const IconRotate = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M15.75 9.5A5.75 5.75 0 1 0 14 13.8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.75 4.75v4.75H11"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPencil = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="m13.7 4.3 2 2a1.4 1.4 0 0 1 0 2l-7.4 7.4L4.75 16.5l.8-3.55 7.35-7.35a1.4 1.4 0 0 1 2 0Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m11.9 5.9 2.2 2.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCursor = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M5 3.5 15.5 10l-4.5 1.25L9 16.5 5 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRuler = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="2.5" y="7.5" width="15" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5.5 7.5v2m3-2v3m3-3v2m3-2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconSparkle = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M10 2.5 11.2 7.8l5.3 1.2-5.3 1.2L10 15.5l-1.2-5.3L3.5 9l5.3-1.2L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.5 2.5 16.1 4.9l2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Hook to detect when an element is visible in the viewport
 * Used to lazy-load expensive 3D thumbnails only when needed
 */
function useIsVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume visible
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Once visible, stay visible (thumbnails are cached)
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading slightly before visible
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
}

type ComponentLibraryCardProps = {
  component: ComponentAction;
  thumbnailsEnabled: boolean;
  animateThumbnails: boolean;
};

function ComponentLibraryCard({
  component,
  thumbnailsEnabled,
  animateThumbnails,
}: ComponentLibraryCardProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isVisible = useIsVisible(containerRef);
  const [isPreviewActive, setPreviewActive] = useState(false);

  // Only request thumbnails while the library is open and the card is visible.
  const shouldLoadThumbnail = thumbnailsEnabled && isVisible;
  const shouldAnimateThumbnail =
    shouldLoadThumbnail && animateThumbnails && isPreviewActive;

  const thumbSrc = useComponent3DThumbnail(
    shouldLoadThumbnail ? (component.builderType ?? component.id) : undefined,
    { animated: shouldAnimateThumbnail }
  );

  const symbolKey = (() => {
    const type = component.builderType ?? component.id;
    switch (type) {
      case "bjt-npn":
        return "transistor-npn";
      case "bjt-pnp":
        return "transistor-pnp";
      case "bjt":
        return "transistor-npn";
      default:
        return type;
    }
  })();

  const Symbol = getSchematicSymbol(symbolKey as any);
  const symbolRotation = symbolKey === "battery" ? -90 : 0;

  return (
    <span
      className="slider-component-card"
      ref={containerRef}
      onPointerEnter={
        animateThumbnails ? () => setPreviewActive(true) : undefined
      }
      onPointerLeave={
        animateThumbnails ? () => setPreviewActive(false) : undefined
      }
    >
      <span className="slider-component-name">{component.label}</span>

      {component.description ? (
        <span className="slider-component-description">{component.description}</span>
      ) : null}

      <span className="slider-component-symbol" aria-hidden="true">
        {Symbol ? (
          <svg
            className="slider-component-symbol-svg"
            viewBox="-40 -40 80 80"
            width="100%"
            height="100%"
            focusable="false"
          >
            <Symbol x={0} y={0} rotation={symbolRotation} scale={1} showLabel={false} />
          </svg>
        ) : (
          <span className="slider-component-symbol-text">{component.icon}</span>
        )}
      </span>

      <span className="slider-component-thumbnail" aria-hidden="true">
        {thumbSrc ? (
          <img src={thumbSrc} alt="" loading="lazy" />
        ) : (
          <span className="slider-component-thumbnail-placeholder" />
        )}
      </span>
    </span>
  );
}

type QuickAddButtonProps = {
  component: ComponentAction;
  onClick: () => void;
  disabled: boolean;
  title: string;
  isActive?: boolean;
  showDescriptor?: boolean;
};

function QuickAddButton({
  component,
  onClick,
  disabled,
  title,
  isActive = false,
  showDescriptor,
}: QuickAddButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const thumbSrc = useComponent3DThumbnail(
    component.builderType ?? component.id,
    { animated: isHovered }
  );

  const symKey = (() => {
    const t = component.builderType ?? component.id;
    if (t === "bjt-npn" || t === "bjt") return "transistor-npn";
    if (t === "bjt-pnp") return "transistor-pnp";
    return t;
  })() as ComponentSymbol;
  const SymbolComp = getSchematicSymbol(symKey);
  const symRotation = symKey === "battery" ? -90 : 0;

  return (
    <button
      type="button"
      className={`quick-add-btn${component.id === "junction" ? " quick-add-btn--junction" : ""}${isActive ? " quick-add-btn--active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-pressed={isActive}
      title={title}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <span className="quick-add-btn-symbol" aria-hidden="true">
        {thumbSrc ? (
          <img src={thumbSrc} alt="" className="quick-add-btn-thumb-img" aria-hidden="true" />
        ) : SymbolComp ? (
          <svg
            className="quick-add-btn-symbol-svg"
            viewBox="-36 -36 72 72"
            focusable="false"
            aria-hidden="true"
          >
            <SymbolComp x={0} y={0} rotation={symRotation} scale={0.9} showLabel={false} />
          </svg>
        ) : (
          <span className="quick-add-btn-icon-text" aria-hidden="true">{component.icon}</span>
        )}
      </span>
      <span className="quick-add-btn-label">{component.label}</span>
      {showDescriptor && (
        <span className="quick-add-btn-descriptor">
          {getComponentShortDescriptor(component)}
        </span>
      )}
    </button>
  );
}

const INTRO_WELCOME = {
  icon: "⚡",
  title: "Welcome to CircuiTry3D",
  body: "Build real electric circuits in 3D and watch the current actually flow — no experience needed. New to this? Start by tapping a part below (a Battery powers everything), add a Resistor and an LED, connect them with wires, and press Run. Not sure what a part is? Tap it to see what it does, or tap the ? Help button anytime.",
};

const GALLERY_TOAST_DURATION_MS = 6000;

// Unified component library: every branded real-world part becomes a first-class
// card in the SAME picker as the generic components, inheriting that type's icon
// and category tab and carrying its preset spec values. This removes the separate
// "Real Parts Library" section that used to stack beneath the reel (and hide
// behind it on mobile) — there is now one library, one layer, fully filterable.
//
// Derived from the shared catalog rather than a second hand-written list, so a
// branded part is defined once and the Builder and the Arena can never drift.
// Families the 3D workspace can't draw (ICs) yield no builderType and are
// skipped — they used to spawn an unhandled component type.
const REAL_PART_LIBRARY_ACTIONS: ComponentAction[] = CATALOG_COMPONENTS.flatMap(
  (part) => {
    const builderType = builderTypeFor(part);
    if (!builderType) {
      return [];
    }
    const base = COMPONENT_ACTIONS.find((c) => c.builderType === builderType);
    const properties = toWorkspaceProperties(part);
    return [
      {
        id: part.id,
        icon: base?.icon ?? "🔩",
        label: part.name,
        action: "component" as const,
        builderType: builderType as ComponentAction["builderType"],
        // Manufacturer + datasheet spec, shown on the centered card / tooltip.
        description: `${part.manufacturer} · ${part.spec}`,
        initialProperties:
          Object.keys(properties).length > 0 ? properties : undefined,
        // Inherit the base type's metadata so the branded part filters under the
        // same category tab (Power / Passive / Semi / …) as its generic sibling.
        metadata: base?.metadata ? { ...base.metadata } : undefined,
      },
    ];
  },
);

const UNIFIED_COMPONENT_ACTIONS: ComponentAction[] = [
  ...COMPONENT_ACTIONS,
  ...REAL_PART_LIBRARY_ACTIONS,
];

function deriveLabelVisibilityFromShowLabels(
  showLabels: boolean,
  previousLevel: number | undefined,
): number {
  if (showLabels) {
    return typeof previousLevel === "number" && previousLevel > 0
      ? previousLevel
      : 3;
  }
  return 0;
}

export default function Builder() {
  const practiceProblemRef = useRef<string | null>(
    DEFAULT_PRACTICE_PROBLEM?.id ?? null,
  );
  const pendingPayoffRef = useRef(false);
  const currentFlowPayoffTimersRef = useRef<number[]>([]);
  const appBasePath = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }, []);

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
  const [activeWorkspacePanelMode, setActiveWorkspacePanelMode] =
    useState<WorkspacePanelMode | null>(null);
  const [isWorkspacePanelOpen, setWorkspacePanelOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("build");
  const [isTroubleshootPanelOpen, setTroubleshootPanelOpen] = useState(false);
  const [activeTroubleshootId, setActiveTroubleshootId] = useState<string | null>(
    troubleshootingProblems[0]?.id ?? null,
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
  const [practiceWorksheetState, setPracticeWorksheetState] =
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
  const [isGuidedTourOpen, setGuidedTourOpen] = useState(false);
  const [isBuildAlongOpen, setBuildAlongOpen] = useState(false);
  const [isCurrentFlowPayoffVisible, setCurrentFlowPayoffVisible] =
    useState(false);
  const [isCurrentFlowPayoffRunning, setCurrentFlowPayoffRunning] =
    useState(false);
  // Rotating "what am I looking at?" insight shown inside the payoff banner so a
  // first-time user (who may know nothing about electricity) understands that the
  // moving particles ARE the current and how Ohm's law shapes the split.
  const [currentFlowPayoffTipIndex, setCurrentFlowPayoffTipIndex] = useState(0);
  const [isIntroDialogVisible, setIntroDialogVisible] = useState(false);
  // Junction tip starts hidden — it is shown the first time the user
  // explicitly uses the Junction button, not automatically on page load,
  // so that it never blocks the 3D canvas or grid on first visit.
  const [isJunctionTipVisible, setJunctionTipVisible] = useState(false);
  // Session-level guard: once the tip has been triggered (or suppressed) this
  // session, never trigger it again regardless of localStorage availability.
  const junctionTipTriggeredRef = useRef(false);

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
    arenaExportError,
    lastArenaExport,
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

  // Push live scene-appearance settings (background, grid, current-flow speed)
  // from the app Settings page into the 3D builder iframe. Fires whenever the
  // relevant settings change or the iframe (re)becomes ready, so the scene always
  // reflects the user's preferences.
  const { settings: appSettings } = useAppSettings();
  const appWorkspaceSettings = appSettings.workspace;
  const appCurrentFlowSpeed = appSettings.simulation.currentFlowSpeed;
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    triggerBuilderAction("apply-scene-settings", {
      bgBrightness: appWorkspaceSettings.bgBrightness,
      bgHue: appWorkspaceSettings.bgHue,
      gridBrightness: appWorkspaceSettings.gridBrightness,
      gridLineWidth: appWorkspaceSettings.gridLineWidth,
      gridHue: appWorkspaceSettings.gridHue,
      // Map 0–100 → 0.3×–2.0× particle speed (50 = default 1.0×).
      flowSpeedScale: 0.3 + (appCurrentFlowSpeed / 100) * 1.7,
      translucentMenus: appWorkspaceSettings.translucentMenus,
    });
  }, [
    isFrameReady,
    appWorkspaceSettings,
    appCurrentFlowSpeed,
    triggerBuilderAction,
  ]);

  // See-through menus setting drives the React-side coach cards too (the iframe
  // menus are handled via the apply-scene-settings bridge above). A body class
  // keeps the CSS simple and applies regardless of where the card is portalled.
  useEffect(() => {
    document.body.classList.toggle(
      "ct-opaque-menus",
      !appWorkspaceSettings.translucentMenus,
    );
    return () => document.body.classList.remove("ct-opaque-menus");
  }, [appWorkspaceSettings.translucentMenus]);

  // Handle cinematic state updates from legacy.html (playing/recording status, waypoint count)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, payload } = event.data as { type?: string; payload?: Record<string, unknown> };
      if (type !== "legacy:cinematic-state" || !payload) return;
      if (typeof payload.playing === "boolean") setCinematicIsPlaying(payload.playing);
      if (typeof payload.recording === "boolean") setCinematicIsRecording(payload.recording);
      if (typeof payload.keyframes === "number") setCinematicWaypointCount(payload.keyframes);
      if (typeof payload.recordError === "string") {
        setCinematicRecordError(payload.recordError);
        // Auto-clear after 6 s so the error doesn't linger forever
        setTimeout(() => setCinematicRecordError(null), 6000);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const openArenaWorkspace = useCallback(
    (options?: { sessionName?: string; forceSync?: boolean }) => {
      setWorkspaceModeWithGlobalSync("arena");
      setPracticeWorkspaceMode(false);
      setTroubleshootWorkspaceMode(false);
      setTroubleshootPanelOpen(false);
      setCompactWorksheetOpen(false);
      setGuidesWorkspaceMode(false);
      setGuidesPanelOpen(false);
      setTroubleshootStatus(null);
      setTroubleshootCheckPending(false);
      setTroubleshootPendingCheckProblemId(null);
      setCircuitLocked(false);
      setEnvironmentalPanelOpen(false);
      setActiveWorkspacePanelMode("arena");
      setWorkspacePanelOpen(true);

      const shouldSync =
        options?.forceSync === true || arenaExportStatus !== "ready";
      if (shouldSync) {
        handleArenaSync({
          openWindow: false,
          sessionName: options?.sessionName,
        });
      }
    },
    [arenaExportStatus, handleArenaSync, setWorkspaceModeWithGlobalSync],
  );

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
    floatingLogoRef,
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
    helpView,
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

  // "Center circuit in available space": measure the UI that occludes the canvas
  // (top metrics ticker + the bottom-sheet workspace panel) and push CSS-px insets
  // into the iframe so the 3D camera re-aims to keep the circuit centered in what's
  // actually visible, not hidden behind an open panel. Off → send zero insets (the
  // iframe treats all-zero as a no-op, restoring plain centering).
  const centerInView = appWorkspaceSettings.centerInView;
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    if (!centerInView) {
      triggerBuilderAction("set-view-insets", { top: 0, right: 0, bottom: 0, left: 0 });
      return;
    }
    let raf = 0;
    // Panels slide with a ~0.26s CSS transition; re-measure across a short window
    // so the circuit tracks the panel as it animates, then settles.
    const deadline =
      (typeof performance !== "undefined" ? performance.now() : 0) + 500;
    const send = () => {
      const vh = window.innerHeight || 1;
      let top = 0;
      let bottom = 0;
      const ticker = document.querySelector(".ticker-wire-fixed");
      if (ticker) {
        const r = ticker.getBoundingClientRect();
        if (r.height > 0 && r.top < vh * 0.4) {
          top = Math.min(vh * 0.4, Math.max(0, r.bottom));
        }
      }
      // Only the non-modal bottom sheet occludes while you keep building; the
      // full-screen `.builder-panel-overlay` modals cover everything, so there's
      // nothing to re-center behind them.
      document.querySelectorAll(".workspace-mode-panel.open").forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.height > 0 && r.width > 0) {
          bottom = Math.max(bottom, vh - r.top);
        }
      });
      bottom = Math.min(bottom, vh * 0.72);
      triggerBuilderAction("set-view-insets", { top, right: 0, bottom, left: 0 });
      const now = typeof performance !== "undefined" ? performance.now() : deadline;
      if (now < deadline) {
        raf = requestAnimationFrame(send);
      }
    };
    send();
    const onResize = () => send();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [
    isFrameReady,
    centerInView,
    triggerBuilderAction,
    isWorkspacePanelOpen,
    isTroubleshootPanelOpen,
    isGuidesPanelOpen,
    isEnvironmentalPanelOpen,
    isSettingsPanelOpen,
    isExplainPanelOpen,
  ]);
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

      // Ctrl+S or Cmd+S for Save
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (circuitStorage.currentCircuit) {
          // Quick save if circuit already exists
          circuitStorage.updateCurrentCircuit(currentCircuitState);
        } else {
          setIsSaveModalOpen(true);
        }
        return;
      }

      // Ctrl+O or Cmd+O for Open/Load
      if ((event.ctrlKey || event.metaKey) && event.key === "o") {
        event.preventDefault();
        setIsLoadModalOpen(true);
        return;
      }

      // Ctrl+N or Cmd+N for New
      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault();
        if (circuitStorage.hasUnsavedChanges) {
          const proceed = window.confirm(
            "You have unsaved changes. Create a new circuit anyway?"
          );
          if (!proceed) return;
        }
        circuitStorage.clearCurrentCircuit();
        triggerBuilderAction("clear-workspace");
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [circuitStorage, currentCircuitState, triggerBuilderAction]);

  // Forward keyboard events to the iframe when focus is on the parent page.
  // The iframe's own handleKeyDown only fires while the iframe is focused, so
  // any interaction with React UI elements causes shortcuts to stop working.
  // Re-dispatching the event on the iframe's contentDocument restores them.
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }

    const handleKeyboardForward = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Don't forward if the event already originates from inside the iframe.
      const iframe = iframeRef.current;
      if (!iframe) {
        return;
      }
      try {
        if (iframe.contentDocument && iframe.contentDocument.contains(target)) {
          return;
        }
      } catch {
        // Cross-origin access would throw; skip forwarding in that case.
        return;
      }

      // Don't forward when the user is typing in an input control.
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        (target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Don't forward shortcuts that the parent page handles itself
      // (Ctrl/Cmd + S / O / N) to avoid double-processing.
      const ctrl = event.ctrlKey || event.metaKey;
      if (ctrl && ["s", "o", "n"].includes(event.key.toLowerCase())) {
        return;
      }

      try {
        const forwarded = new KeyboardEvent(event.type, {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          bubbles: true,
          cancelable: true,
        });
        iframe.contentDocument?.dispatchEvent(forwarded);
      } catch {
        // Swallow errors from cross-origin or detached documents.
      }
    };

    window.addEventListener("keydown", handleKeyboardForward);
    return () => window.removeEventListener("keydown", handleKeyboardForward);
  }, [isFrameReady, iframeRef]);

  useEffect(() => {
    if (!activeWorkspacePanelMode || !isWorkspacePanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setWorkspacePanelOpen(false);
      setActiveWorkspacePanelMode(null);
      setWorkspaceModeWithGlobalSync("build");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeWorkspacePanelMode,
    isWorkspacePanelOpen,
    setWorkspaceModeWithGlobalSync,
  ]);

  // Sync circuit lock state to the iframe. The showcase/payoff also locks editing
  // (so components can't be dragged/changed) — but via this edit-lock rather than a
  // pointer-blocking overlay, so the camera stays free to zoom and explore it.
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    const lock = isCircuitLocked || isShowcaseLocked;
    triggerBuilderAction(lock ? "lock-circuit" : "unlock-circuit");
  }, [isCircuitLocked, isShowcaseLocked, isFrameReady, triggerBuilderAction]);

  const triggerSimulationPulse = useCallback(() => {
    setSimulatePulsing(true);
    const timer = window.setTimeout(() => {
      setSimulatePulsing(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const resetWorkspaceSurfaces = useCallback(() => {
    setPracticeWorkspaceMode(false);
    setCompactWorksheetOpen(false);
    setTroubleshootWorkspaceMode(false);
    setTroubleshootPanelOpen(false);
    setTroubleshootStatus(null);
    setTroubleshootCheckPending(false);
    setTroubleshootPendingCheckProblemId(null);
    setGuidesWorkspaceMode(false);
    setGuidesPanelOpen(false);
    setActiveWorkspacePanelMode(null);
    setWorkspacePanelOpen(false);
    setCircuitLocked(false);
    setOnboardingLocked(false);
    setEnvironmentalPanelOpen(false);
    setHelpOpen(false);
  }, [setHelpOpen]);

  const closeArenaWorkspace = useCallback(() => {
    resetWorkspaceSurfaces();
    setWorkspaceModeWithGlobalSync("build");
  }, [resetWorkspaceSurfaces, setWorkspaceModeWithGlobalSync]);

  const openWorkspacePanelMode = useCallback(
    (mode: WorkspacePanelMode) => {
      setWorkspaceModeWithGlobalSync(mode);
      resetWorkspaceSurfaces();
      setActiveWorkspacePanelMode(mode);
      setWorkspacePanelOpen(true);

      if (mode === "arena" && arenaExportStatus !== "ready") {
        handleArenaSync({ openWindow: false });
      }
    },
    [
      arenaExportStatus,
      handleArenaSync,
      resetWorkspaceSurfaces,
      setWorkspaceModeWithGlobalSync,
    ],
  );

  const openGuidesWorkspace = useCallback(
    (workflow: GuideWorkflowId = "tutorial") => {
      setActiveGuideWorkflow(workflow);
      setWorkspaceModeWithGlobalSync("help");
      resetWorkspaceSurfaces();
      setGuidesWorkspaceMode(true);
      setGuidesPanelOpen(true);
    },
    [resetWorkspaceSurfaces, setWorkspaceModeWithGlobalSync],
  );

  const openHelpCenter = useCallback(
    (view: HelpModalView = "overview", _sectionTitle?: string) => {
      if (view === "overview" || view === "tutorial" || view === "wire-guide") {
        const workflow: GuideWorkflowId = view === "wire-guide" ? view : "tutorial";
        openGuidesWorkspace(workflow);
        return;
      }
      openHelpWithView(view);
    },
    [openGuidesWorkspace, openHelpWithView],
  );

  const assignPracticeProblem = useCallback(
    (problem: PracticeProblem, presetOverride?: string) => {
      setActivePracticeProblemId(problem.id);
      setPracticeWorksheetState({
        problemId: problem.id,
        complete: false,
      });
      practiceProblemRef.current = problem.id;

      const presetKey = presetOverride ?? problem.presetHint;
      if (presetKey) {
        triggerBuilderAction("load-preset", { preset: presetKey });
      }
    },
    [triggerBuilderAction],
  );

  const openPracticeWorkspace = useCallback(
    (problemOverride?: PracticeProblem | null, presetOverride?: string) => {
      const nextProblem =
        problemOverride ??
        findPracticeProblemById(activePracticeProblemId) ??
        DEFAULT_PRACTICE_PROBLEM ??
        practiceProblems[0] ??
        null;

      if (!nextProblem) {
        return;
      }

      assignPracticeProblem(nextProblem, presetOverride);
      setWorkspaceModeWithGlobalSync("practice");
      resetWorkspaceSurfaces();
      setPracticeWorkspaceMode(true);
      setCompactWorksheetOpen(true);
      setCircuitLocked(true);
    },
    [
      activePracticeProblemId,
      assignPracticeProblem,
      resetWorkspaceSurfaces,
      setWorkspaceModeWithGlobalSync,
    ],
  );

  const openTroubleshootWorkspace = useCallback(
    (problemOverride?: TroubleshootingProblem | null) => {
      const nextProblem =
        problemOverride ??
        troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
        troubleshootingProblems[0] ??
        null;

      if (!nextProblem) {
        return;
      }

      if (nextProblem.id !== activeTroubleshootId) {
        setActiveTroubleshootId(nextProblem.id);
      }

      setWorkspaceModeWithGlobalSync("troubleshoot");
      resetWorkspaceSurfaces();
      setTroubleshootWorkspaceMode(true);
      setTroubleshootPanelOpen(true);
      setTroubleshootStatus(null);
      setTroubleshootCheckPending(false);
      setTroubleshootPendingCheckProblemId(null);
      setCircuitLocked(false);
      triggerBuilderAction("load-preset", { preset: nextProblem.preset });
    },
    [
      activeTroubleshootId,
      resetWorkspaceSurfaces,
      setWorkspaceModeWithGlobalSync,
      triggerBuilderAction,
    ],
  );

  // Process pending global mode changes after all handlers are ready
  useEffect(() => {
    const pendingMode = pendingModeChangeRef.current;
    if (pendingMode && pendingMode !== workspaceMode) {
      pendingModeChangeRef.current = null;

      if (pendingMode === "build") {
        setWorkspaceMode("build");
        resetWorkspaceSurfaces();
      } else if (pendingMode === "practice") {
        openPracticeWorkspace();
      } else if (pendingMode === "arena") {
        openArenaWorkspace({ forceSync: true });
      } else if (pendingMode === "help") {
        openGuidesWorkspace("tutorial");
      } else if (pendingMode === "wire-guide") {
        openWorkspacePanelMode("wire-guide");
      } else if (
        pendingMode === "arcade" ||
        pendingMode === "classroom" ||
        pendingMode === "community" ||
        pendingMode === "gallery" ||
        pendingMode === "account" ||
        pendingMode === "pricing" ||
        pendingMode === "textbook" ||
        pendingMode === "settings"
      ) {
        openWorkspacePanelMode(pendingMode);
      } else if (pendingMode === "troubleshoot") {
        openTroubleshootWorkspace();
      }

      // Sync back to global context
      globalModeContext.setWorkspaceMode(pendingMode);
    }
  }, [
    globalModeContext.workspaceMode,
    workspaceMode,
    openPracticeWorkspace,
    openTroubleshootWorkspace,
    openArenaWorkspace,
    openWorkspacePanelMode,
    openGuidesWorkspace,
    resetWorkspaceSurfaces,
    globalModeContext,
  ]);
  
  const handlePracticeAction = useCallback(
    (action: PanelAction) => {
      if (action.action === "open-arena") {
        openArenaWorkspace({
          sessionName: "Builder Hand-off",
          forceSync: true,
        });
        return;
      }
      if (action.action === "practice-help") {
        openHelpCenter("wire-guide");
        return;
      }
      if (action.action === "generate-practice") {
        triggerBuilderAction(action.action, action.data);
        const randomProblem = getRandomPracticeProblem();
        if (randomProblem) {
          openPracticeWorkspace(randomProblem);
        }
        return;
      }
      triggerBuilderAction(action.action, action.data);
    },
    [
      openHelpCenter,
      openArenaWorkspace,
      openPracticeWorkspace,
      triggerBuilderAction,
    ],
  );

  const openLastArenaSession = useCallback(() => {
    if (!lastArenaExport?.sessionId) {
      return;
    }
    openArenaWorkspace();
  }, [lastArenaExport, openArenaWorkspace]);
  const handleEnvironmentChange = useCallback((scenario: EnvironmentalScenario) => {
    setActiveEnvironment(scenario);
  }, []);

  const resetLogoSettings = useCallback(() => {
    handleLogoSettingChange("speed", DEFAULT_LOGO_SETTINGS.speed);
    handleLogoSettingChange("travelX", DEFAULT_LOGO_SETTINGS.travelX);
    handleLogoSettingChange("travelY", DEFAULT_LOGO_SETTINGS.travelY);
    handleLogoSettingChange("bounce", DEFAULT_LOGO_SETTINGS.bounce);
    handleLogoSettingChange("opacity", DEFAULT_LOGO_SETTINGS.opacity);
  }, [handleLogoSettingChange]);

  const handleComponentAction = useCallback(
    (component: ComponentAction) => {
      console.log("[CT3D-REACT] handleComponentAction:", component?.id, component?.builderType, "locked:", isCircuitLocked, "frameReady:", isFrameReady);
      if (!component) {
        return;
      }

      if (component.action === "junction") {
        postToBuilder({ type: "builder:add-junction" });
        // Show the junction info tip the first time the user places a junction.
        // The ref guards against re-showing within the same session even if
        // localStorage is unavailable, while the storage key prevents it on
        // subsequent visits.
        if (!junctionTipTriggeredRef.current) {
          junctionTipTriggeredRef.current = true;
          try {
            if (window.localStorage.getItem(JUNCTION_TIP_STORAGE_KEY) !== "1") {
              setJunctionTipVisible(true);
              // Auto-dismiss after 12 seconds as safety net
              setTimeout(() => {
                setJunctionTipVisible(false);
                try { window.localStorage.setItem(JUNCTION_TIP_STORAGE_KEY, "1"); } catch {}
              }, 12000);
            }
          } catch {
            // ignore storage read failures — ref prevents repeat triggers
          }
        }
        return;
      }

      if (!component.builderType) {
        console.warn(`Missing builder mapping for component '${component.id}'`);
        console.log("[CT3D-REACT] BLOCKED: no builderType for", component.id);
        return;
      }
      console.log("[CT3D-REACT] Sending add-component:", component.builderType);

      postToBuilder({
        type: "builder:add-component",
        payload: {
          componentType: component.builderType,
          // Branded/real-world cards carry preset spec values (e.g. 9V, 330Ω);
          // generic cards leave this undefined and use the builder defaults.
          initialProperties: component.initialProperties,
        },
      });
    },
    [postToBuilder],
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

  const clearCurrentFlowPayoffTimers = useCallback(() => {
    currentFlowPayoffTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    currentFlowPayoffTimersRef.current = [];
  }, []);

  const runCurrentFlowPayoffSequence = useCallback(
    (
      options: {
        reloadPreset?: boolean;
        revealBanner?: boolean;
      } = {},
    ) => {
      if (!isFrameReady) {
        // Iframe not ready yet — mark as pending so Effect 2 picks it up.
        pendingPayoffRef.current = true;
        return;
      }

      const { revealBanner = true } = options;

      clearCurrentFlowPayoffTimers();
      setCurrentFlowPayoffRunning(true);

      // Step 1: Send load-payoff which builds the series circuit, forces solid
      // flow style, and calls analyzeCircuit() — all in one atomic shot inside
      // legacy.html. No separate toggle-current-flow race condition.
      triggerBuilderAction("load-payoff");

      // Step 2: After the 3D scene has had time to render the first frame,
      // fire run-payoff-flow as a reliability retry to ensure particles are
      // visible even if the first analyzeCircuit() fired before wires were
      // fully in the scene graph.
      const retryTimer = window.setTimeout(() => {
        triggerBuilderAction("run-payoff-flow");
        triggerSimulationPulse();
        if (revealBanner) {
          setCurrentFlowPayoffVisible(true);
        }
      }, PAYOFF_FIRST_RETRY_MS);

      // Step 3: Second retry at 1.2 s catches slow devices / first-load jank.
      const followupTimer = window.setTimeout(() => {
        triggerBuilderAction("run-payoff-flow");
        triggerSimulationPulse();
        setCurrentFlowPayoffRunning(false);
      }, PAYOFF_SECOND_RETRY_MS);

      // Step 4: Third retry only on Android — the Capacitor WebView can be slow
      // to stabilise GPU state on the very first launch, so particles may not
      // appear after the first two retries on cold-start.
      const thirdRetryTimer = isAndroidApp()
        ? window.setTimeout(() => {
            triggerBuilderAction("run-payoff-flow");
          }, PAYOFF_THIRD_RETRY_MS_ANDROID)
        : null;

      currentFlowPayoffTimersRef.current.push(
        retryTimer,
        followupTimer,
        ...(thirdRetryTimer !== null ? [thirdRetryTimer] : []),
      );
    },
    [
      clearCurrentFlowPayoffTimers,
      isFrameReady,
      triggerBuilderAction,
      triggerSimulationPulse,
    ],
  );

  const handleReplayCurrentFlowPayoff = useCallback(() => {
    setBottomMenuOpen(true);
    runCurrentFlowPayoffSequence({ revealBanner: true });
  }, [runCurrentFlowPayoffSequence, setBottomMenuOpen]);

  // Replay the full first-run onboarding on demand: re-show the welcome intro,
  // which auto-dismisses into the current-flow payoff demo (banner + tips).
  // The "seen" flags stay set, so this only fires when the user asks for it.
  const handleReplayOnboarding = useCallback(() => {
    setIntroDialogVisible(true);
    setCircuitLocked(true);
  }, [setCircuitLocked]);

  const handleDismissIntroDialog = useCallback(() => {
    setIntroDialogVisible(false);

    // Mark intro as seen so it doesn't appear again
    try {
      window.localStorage.setItem(INTRO_DIALOG_STORAGE_KEY, "1");
    } catch {
      // ignore storage write failures
    }

    try {
      window.localStorage.setItem(CURRENT_FLOW_PAYOFF_STORAGE_KEY, "seen");
    } catch {
      // ignore storage write failures
    }

    // Launch the current-flow payoff demo immediately after closing the intro.
    // Lock the circuit as onboarding-locked so the preset circuit stays
    // view-only until the user explicitly taps "Edit Circuit".
    // runCurrentFlowPayoffSequence will set pendingPayoffRef if the iframe is
    // not ready yet, and Effect 2 will pick it up when it becomes ready.
    setOnboardingLocked(true);
    runCurrentFlowPayoffSequence({ revealBanner: true });
  }, [runCurrentFlowPayoffSequence]);

  const handleDismissJunctionTip = useCallback(() => {
    setJunctionTipVisible(false);
    try {
      window.localStorage.setItem(JUNCTION_TIP_STORAGE_KEY, "1");
    } catch {
      // ignore storage write failures
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCurrentFlowPayoffTimers();
    };
  }, [clearCurrentFlowPayoffTimers]);

  // Effect 1 — load the showcase circuit on launch: a simple SERIES circuit
  // (battery → resistor → switch → light, switch closed, current flowing, light
  // lit), framed at a dynamic 3/4 angle toward the top of the workspace. This is
  // the backdrop the user lands on and that the point-at-the-parts guided tour
  // walks through. (The old build-it-yourself tutorial is no longer auto-opened;
  // it's being replaced by the tour.)
  const showcaseLoadedRef = useRef(false);
  useEffect(() => {
    if (!isFrameReady || showcaseLoadedRef.current) {
      return;
    }
    showcaseLoadedRef.current = true;
    triggerBuilderAction("load-payoff");
    // The showcase is view-only — lock it so the user can't drag/edit the parts
    // while the guided tour points at them.
    setShowcaseLocked(true);
    setGuidedTourOpen(true);
    // The showcase has junctions; suppress the junction tip so it can't pop over
    // the tour.
    junctionTipTriggeredRef.current = true;
  }, [isFrameReady, triggerBuilderAction]);

  // Both walkthroughs teach the 3D workspace, and their overlay layer (z 1260)
  // paints above every workspace panel. Leaving build mode — into the Arena,
  // Practice, Settings — used to leave the coach card stranded on top of a
  // surface it knows nothing about. Close them when the workspace changes.
  useEffect(() => {
    if (workspaceMode !== "build") {
      setGuidedTourOpen(false);
      setBuildAlongOpen(false);
    }
  }, [workspaceMode]);

  // Effect 1a — showcase load watchdog. On slower devices (Android) the very first
  // load-payoff trigger sometimes races the builder's init and the parts never
  // appear. While the tour is open with an empty workspace, re-fire the load until
  // the parts show (or give up after a few tries) so the circuit reliably renders.
  const showcaseRetriesRef = useRef(0);
  useEffect(() => {
    if (!isGuidedTourOpen) {
      showcaseRetriesRef.current = 0;
      return;
    }
    const componentCount = circuitState?.counts?.components ?? 0;
    if (componentCount > 0 || showcaseRetriesRef.current >= 5) {
      if (componentCount > 0) {
        showcaseRetriesRef.current = 0;
      }
      return;
    }
    const id = window.setTimeout(() => {
      showcaseRetriesRef.current += 1;
      triggerBuilderAction("load-payoff");
    }, 1400);
    return () => window.clearTimeout(id);
  }, [isGuidedTourOpen, circuitState, triggerBuilderAction]);

  // Effect 1b — auto-dismiss the intro dialog after a short display so the
  // user reaches the payoff 3D circuit without needing to tap anything.
  useEffect(() => {
    if (!isIntroDialogVisible) {
      return;
    }
    const timer = window.setTimeout(() => {
      handleDismissIntroDialog();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [isIntroDialogVisible, handleDismissIntroDialog]);

  // Effect 2 — RESTORED + hardened. Auto-load the payoff demo circuit on every
  // session so returning users land on a live, animated 3D circuit instead of a
  // black canvas. First-run visitors ALSO see this circuit — the interactive
  // tutorial (Effect 1) runs on top of it, so newcomers get the "wow" moment
  // AND a guided walk-through simultaneously.
  //
  // Hardened retry policy: fires when `isFrameReady` becomes true, then keeps
  // re-firing every 2.5 s (up to 6 attempts total = ~15 s) until the workspace
  // actually reports at least one component. This survives all the edge cases
  // that used to blank the canvas: `legacy:ready` firing before React's message
  // listener attached, a first payoff message dropped by a slow WebView, service
  // worker serving a stale iframe, etc. As soon as ANY component appears the
  // retries stop.
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    console.log("[CT3D-REACT] Effect 2: firing payoff load (frame ready)");
    runCurrentFlowPayoffSequence({ revealBanner: true });

    let attempts = 0;
    const MAX_ATTEMPTS = 6;
    const retryTimer = window.setInterval(() => {
      attempts += 1;
      const componentCount = circuitState?.components?.length ?? 0;
      if (componentCount > 0) {
        console.log(
          `[CT3D-REACT] Effect 2: payoff visible (${componentCount} components) — retries stopped`,
        );
        window.clearInterval(retryTimer);
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        console.warn(
          "[CT3D-REACT] Effect 2: payoff never appeared after " +
            MAX_ATTEMPTS +
            " tries — user can use the Replay Demo button to try manually",
        );
        window.clearInterval(retryTimer);
        return;
      }
      console.log(
        `[CT3D-REACT] Effect 2: workspace still empty, retrying payoff (attempt ${attempts}/${MAX_ATTEMPTS})`,
      );
      runCurrentFlowPayoffSequence({ revealBanner: true });
    }, 2500);

    return () => window.clearInterval(retryTimer);
  }, [isFrameReady, runCurrentFlowPayoffSequence, circuitState]);

  useEffect(() => {
    if (!isCurrentFlowPayoffVisible) {
      return;
    }

    const timer = window.setTimeout(() => {
      // Hide the payoff banner when it expires. The circuit stays locked
      // (isOnboardingLocked) so the user can't accidentally move components;
      // a "tap to edit" chip appears instead, requiring an explicit tap to
      // begin editing. Long enough to read a few of the slow-rotating tips and
      // act on the "zoom in" prompt.
      setCurrentFlowPayoffVisible(false);
    }, 30000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isCurrentFlowPayoffVisible]);

  // Safety net: auto-unlock if the onboarding lock persists for more than 25s
  // after the payoff banner has been dismissed.  This prevents users from
  // getting permanently stuck if the "Start Editing" chip is not visible or
  // tappable for any reason (CSS conflict, z-index overlap, etc.).
  useEffect(() => {
    if (
      !isOnboardingLocked ||
      isCurrentFlowPayoffVisible ||
      isIntroDialogVisible
    ) {
      return;
    }

    const safetyTimer = window.setTimeout(() => {
      setOnboardingLocked(false);
      setCircuitLocked(false);
    }, 5000);

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, [isOnboardingLocked, isCurrentFlowPayoffVisible, isIntroDialogVisible]);

  const activeWireProfilePayload = useMemo(
    () => toWireProfileBridgePayload(activeWireProfile),
    [activeWireProfile],
  );
  const activeWireSegmentResistance =
    activeWireProfile?.resistanceOhmPerMeter ??
    DEFAULT_WIRE_SEGMENT_RESISTANCE_OHM;
  const applyWireProfileToLegacy = useCallback(
    (
      payload: ReturnType<typeof toWireProfileBridgePayload>,
      options: { runSimulation?: boolean } = {},
    ) => {
      triggerBuilderAction("set-wire-profile", { wireProfile: payload });
      if (options.runSimulation !== false) {
        triggerBuilderAction("run-simulation");
        triggerSimulationPulse();
      }
    },
    [triggerBuilderAction, triggerSimulationPulse],
  );
  const handleApplyWireProfile = useCallback(
    (wireProfile: WireSpec) => {
      setActiveWireProfile(wireProfile);
      applyWireProfileToLegacy(toWireProfileBridgePayload(wireProfile));
    },
    [applyWireProfileToLegacy],
  );
  const handleClearWireProfile = useCallback(() => {
    setActiveWireProfile(null);
    applyWireProfileToLegacy(null);
  }, [applyWireProfileToLegacy]);

  useEffect(() => {
    if (!isFrameReady || !activeWireProfilePayload) {
      return;
    }
    applyWireProfileToLegacy(activeWireProfilePayload, { runSimulation: false });
  }, [activeWireProfilePayload, applyWireProfileToLegacy, isFrameReady]);


  const isWorksheetVisible = isPracticeWorkspaceMode && isCompactWorksheetOpen;
  const isTroubleshootVisible =
    isTroubleshootWorkspaceMode && isTroubleshootPanelOpen;
  const isGuidesVisible = isGuidesWorkspaceMode && isGuidesPanelOpen;
  const isWorkspacePanelVisible =
    activeWorkspacePanelMode !== null && isWorkspacePanelOpen;
  const isOverlayActive =
    isWorkspacePanelVisible ||
    isEnvironmentalPanelOpen ||
    isHelpOpen ||
    isSaveModalOpen ||
    isLoadModalOpen;
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

  const activeTroubleshootProblem = useMemo(() => {
    if (!activeTroubleshootId) return null;
    return (
      troubleshootingProblems.find((problem) => problem.id === activeTroubleshootId) ??
      null
    );
  }, [activeTroubleshootId]);
  const activeTroubleshootAnswer = useMemo(() => {
    if (!activeTroubleshootProblem) return "";
    return troubleshootAnswerByProblemId[activeTroubleshootProblem.id] ?? "";
  }, [activeTroubleshootProblem, troubleshootAnswerByProblemId]);
  const isActiveTroubleshootDiagnosisAccepted = Boolean(
    activeTroubleshootProblem &&
      troubleshootDiagnosedIds.includes(activeTroubleshootProblem.id),
  );
  const isActiveTroubleshootSolved = Boolean(
    activeTroubleshootProblem &&
      troubleshootSolvedIds.includes(activeTroubleshootProblem.id),
  );
  const isCurrentTroubleshootFixVerified = Boolean(
    troubleshootStatus?.trim().toLowerCase().startsWith("solved"),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "circuitry3d.troubleshoot.solved",
        JSON.stringify(troubleshootSolvedIds),
      );
    } catch {
      // ignore write failures (private mode / storage blocked)
    }
  }, [troubleshootSolvedIds]);

  useEffect(() => {
    // If the user changes problems mid-check, cancel the in-flight check so the UI doesn't get stuck.
    if (!isTroubleshootCheckPending) {
      return;
    }
    setTroubleshootCheckPending(false);
    setTroubleshootPendingCheckProblemId(null);
  }, [activeTroubleshootId, isTroubleshootCheckPending]);

  useEffect(() => {
    if (!isTroubleshootCheckPending) return;
    if (!lastSimulation) return;
    if (!activeTroubleshootProblem) {
      setTroubleshootCheckPending(false);
      setTroubleshootPendingCheckProblemId(null);
      return;
    }

    if (
      troubleshootPendingCheckProblemId &&
      troubleshootPendingCheckProblemId !== activeTroubleshootProblem.id
    ) {
      // Problem changed while a sim was running; cancel this check.
      setTroubleshootCheckPending(false);
      setTroubleshootPendingCheckProblemId(null);
      return;
    }

    setTroubleshootCheckPending(false);
    setTroubleshootPendingCheckProblemId(null);

    const solved = isTroubleshootingSolved(
      activeTroubleshootProblem,
      lastSimulation,
    );
    if (solved) {
      setCircuitLocked(false);
      setTroubleshootStatus("Solved! Current is flowing. Circuit unlocked for editing.");
      setTroubleshootSolvedIds((previous) => {
        if (previous.includes(activeTroubleshootProblem.id)) return previous;
        return [...previous, activeTroubleshootProblem.id];
      });
      return;
    }

    setCircuitLocked(false);
    const analyzeResult = getAnalyzeCircuitResult(lastSimulation);
    const reason = analyzeResult?.flow?.reason;
    if (reason === "polarity") {
      setTroubleshootStatus("Not solved yet: polarity mismatch is blocking flow.");
    } else if (reason === "short") {
      setTroubleshootStatus("Not solved yet: there’s a short circuit path.");
    } else if (reason === "no-source") {
      setTroubleshootStatus("Not solved yet: add a power source (battery).");
    } else {
      setTroubleshootStatus("Not solved yet: circuit still has no current flow.");
    }
  }, [
    activeTroubleshootProblem,
    isTroubleshootCheckPending,
    lastSimulation,
    troubleshootPendingCheckProblemId,
  ]);
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
    square: "Square (outside)",
    offset: "Offset",
    arc: "Arc",
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
  const labelVisibilityLevel = resolveLabelVisibilityLevel(modeState);
  const labelVisibilityDescription =
    getLabelVisibilityDescription(labelVisibilityLevel);
  const labelToggleTitle = getNextLabelToggleTitle(labelVisibilityLevel);
  const isWireToolActive = modeState.isWireMode;
  const wireRoutingTitle = isWireToolActive
    ? `Wire tool active - routing style set to ${wireRoutingLabel}.`
    : `Wire tool inactive - routing preset is ${wireRoutingLabel}.`;

  const liveWireMetricsSnapshot = useMemo(
    () => ({
      voltage: circuitState?.metrics.voltage ?? circuitBaseMetrics.voltage,
      current: circuitState?.metrics.current ?? circuitBaseMetrics.current,
      power: circuitState?.metrics.power ?? circuitBaseMetrics.watts,
      resistance:
        circuitState?.metrics.resistance ?? circuitBaseMetrics.resistance,
      isOpenCircuit: circuitState?.metrics.resistance === null,
      wireCount: circuitState?.counts.wires ?? 0,
      wirePathResistance:
        circuitState?.metrics.wirePathResistance ??
        circuitState?.metrics.flow?.wirePathResistance ??
        null,
      wireLengthMeters:
        circuitState?.metrics.wireLengthMeters ??
        circuitState?.metrics.flow?.wirePathLengthMeters ??
        null,
      wireResistanceReferenceMeters:
        circuitState?.metrics.wireResistanceReferenceMeters ??
        circuitState?.metrics.flow?.wireResistanceReferenceMeters ??
        10,
      wireAmpacityLimitA:
        circuitState?.metrics.wireAmpacityLimitA ??
        circuitState?.metrics.flow?.ampacityLimitA ??
        null,
      wireAmpacityUtilization:
        circuitState?.metrics.wireAmpacityUtilization ??
        circuitState?.metrics.flow?.ampacityUtilization ??
        null,
      wireVoltageLimitV:
        circuitState?.metrics.wireVoltageLimitV ??
        circuitState?.metrics.flow?.voltageLimitV ??
        null,
      wireVoltageUtilization:
        circuitState?.metrics.wireVoltageUtilization ??
        circuitState?.metrics.flow?.voltageUtilization ??
        null,
      wireWarning:
        circuitState?.metrics.wireWarning ??
        circuitState?.metrics.flow?.warning ??
        null,
    }),
    [circuitBaseMetrics, circuitState],
  );

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
        // The arena renders full-bleed in the workspace (its own 3D scene behind
        // a translucent control panel — see the arena workspace layer below), so
        // the generic panel renders nothing for this mode. The mode stays flagged
        // as "arena" elsewhere so zoom controls hide and Escape exits.
        return null;
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
    handleApplyWireProfile,
    handleClearWireProfile,
    liveWireMetricsSnapshot.current,
    liveWireMetricsSnapshot.isOpenCircuit,
    liveWireMetricsSnapshot.power,
    liveWireMetricsSnapshot.resistance,
    liveWireMetricsSnapshot.voltage,
    liveWireMetricsSnapshot.wireCount,
  ]);

  return (
    <div
      className="builder-shell"
      data-left-menu-open={isLeftMenuOpen ? "true" : "false"}
      data-right-menu-open={isRightMenuOpen ? "true" : "false"}
      data-bottom-menu-open={isBottomMenuOpen ? "true" : "false"}
      data-tour-active={isGuidedTourOpen ? "true" : "false"}
    >
    <CurrentFlowAnimation />

      {/* Mode bar is now rendered globally in AppLayout */}

      {/* ── Unified top action bar ─────────────────────────────────────────
          Combines the former workspace-edge-actions (left + right) and the
          quick-add-bar into a single horizontal strip below the ticker. */}
      {shouldShowEdgeActions && (
        <Fragment>
          <div
            className="unified-action-bar"
            aria-label="Quick actions"
            data-bar-mode={actionBarMode}
          >
            {/* Quick-add components — hidden when mode is 'tools' or 'hidden' */}
            <div className="quick-add-btn-wrapper" aria-label="Component shortcuts">
              {QUICK_ADD_COMPONENTS.map((component) => (
                <QuickAddButton
                  key={component.id}
                  component={component}
                  onClick={() => handleComponentAction(component)}
                  disabled={controlsDisabled}
                  isActive={
                    component.action === "junction" &&
                    activeBuilderTool === "junction"
                  }
                  title={component.description || component.label}
                  showDescriptor={showThumbDescriptors}
                />
              ))}
            </div>

            <span className="unified-action-divider" aria-hidden="true" />

            {/* Tool actions (formerly left edge) */}
            <button
              type="button"
              className="edge-action-btn edge-action-btn--clear"
              onClick={handleClearWorkspace}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-label="Clear workspace"
              title="Clear all components, wires, and analysis data"
            >
              <IconTrash className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Clear</span>
            </button>
            <button
              type="button"
              className={`edge-action-btn${modeState.isWireMode ? " edge-action-btn--active" : ""}`}
              onClick={() => triggerBuilderAction("toggle-wire-mode")}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-pressed={modeState.isWireMode}
              aria-label={modeState.isWireMode ? "Exit wire mode" : "Enter wire mode"}
              title={modeState.isWireMode ? "Exit Wire Mode (W)" : "Wire Mode (W)"}
              data-tutorial-id="tutorial-enable-wire"
            >
              <img src={wireStrippersIcon} alt="" className="edge-action-icon-svg" aria-hidden="true" />
              <span className="edge-action-label" aria-hidden="true">Wire</span>
            </button>
            <button
              type="button"
              className={`edge-action-btn${modeState.isRotateMode ? " edge-action-btn--active" : ""}`}
              onClick={() => triggerBuilderAction("toggle-rotate-mode")}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-pressed={modeState.isRotateMode}
              aria-label={modeState.isRotateMode ? "Exit rotate mode" : "Enter rotate mode"}
              title={modeState.isRotateMode ? "Exit Rotate Mode (R)" : "Rotate Mode (R)"}
            >
              <IconRotate className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Rotate</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => triggerBuilderAction("set-tool", { tool: "select" })}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-label="Edit selected component"
              title="Edit / Select (E)"
            >
              <IconPencil className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Edit</span>
            </button>

            <span className="unified-action-divider" aria-hidden="true" />

            {/* History / file actions (formerly right edge) */}
            <button
              type="button"
              className="edge-action-btn edge-action-btn--simulate"
              onClick={handleRunSimulationClick}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              data-pulse={isSimulatePulsing ? "true" : undefined}
              aria-label="Run simulation"
              title="Run the current circuit simulation"
              data-tutorial-id="tutorial-run-simulation"
            >
              <IconPlay className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Run</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => triggerBuilderAction("undo")}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-label="Undo last change"
              title="Undo (Ctrl+Z)"
            >
              <IconUndo className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Undo</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => triggerBuilderAction("redo")}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-label="Redo previous change"
              title="Redo (Ctrl+Shift+Z)"
            >
              <IconRedo className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Redo</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => setIsLoadModalOpen(true)}
              aria-label="Open circuit"
              title="Open saved circuit (Ctrl+O)"
            >
              <IconFolder className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Load</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => setIsSaveModalOpen(true)}
              aria-label="Save circuit"
              title="Save circuit (Ctrl+S)"
            >
              <IconSave className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Save</span>
              {circuitStorage.hasUnsavedChanges && (
                <span className="unsaved-dot" aria-label="Unsaved changes" />
              )}
            </button>

            <span className="unified-action-divider" aria-hidden="true" />

            {/* AI & Measurement tools — integrated into action bar */}
            <button
              type="button"
              className={`edge-action-btn edge-action-btn--ai${isAIHelperOpen ? " edge-action-btn--active" : ""}`}
              onClick={() => setIsAIHelperOpen((prev) => !prev)}
              aria-label={isAIHelperOpen ? "Close Circuit AI" : "Open Circuit AI assistant"}
              aria-expanded={isAIHelperOpen}
              title="Circuit AI — ask anything about circuits or the app"
            >
              <IconBolt className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">AI</span>
            </button>
            <button
              type="button"
              className={`edge-action-btn${isExplainPanelOpen ? " edge-action-btn--active" : ""}`}
              onClick={() => setIsExplainPanelOpen((prev) => !prev)}
              aria-label={isExplainPanelOpen ? "Close circuit explanation" : "Explain this circuit"}
              aria-expanded={isExplainPanelOpen}
              title="Explain Circuit — AI-powered circuit analysis (Pro)"
            >
              <IconSparkle className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Explain</span>
            </button>
            <button
              type="button"
              className={`edge-action-btn${(isMeasureWidgetOpen || meterState.armed) ? " edge-action-btn--active" : ""}`}
              onClick={() => setMeasureWidgetOpen((o) => !o)}
              aria-label={isMeasureWidgetOpen ? "Close measurement tools" : "Open measurement tools"}
              aria-expanded={isMeasureWidgetOpen}
              title="Measurement Tools — Digital Multimeter"
            >
              <IconRuler className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Measure</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={handleReplayOnboarding}
              aria-label="Replay the intro tour"
              title="Replay intro — welcome message + live current-flow demo"
            >
              <span className="edge-action-icon-svg edge-action-icon-emoji" aria-hidden="true">
                ▶
              </span>
              <span className="edge-action-label" aria-hidden="true">Tour</span>
            </button>
            <button
              type="button"
              className="edge-action-btn edge-action-btn--help"
              onClick={() => openHelpWithView("overview")}
              aria-label="Open help, guides and tutorials"
              title="Help — guides, tutorials & shortcuts (press ?)"
            >
              <span className="edge-action-icon-svg edge-action-icon-emoji" aria-hidden="true">
                ?
              </span>
              <span className="edge-action-label" aria-hidden="true">Help</span>
            </button>

            {/* Single reveal toggle — cycles hidden → tools (partial) → full → hidden.
                Grid icon = "open the tools / quick actions"; ✕ when fully open = hide.
                (Replaces the old 3-segment All/Tools/Hide bar; the gear moved out to
                the workspace stack as the Settings button.) */}
            <button
              type="button"
              className={`action-bar-cycle action-bar-cycle--${actionBarMode}`}
              onClick={() =>
                setActionBarMode(
                  actionBarMode === "hidden"
                    ? "tools"
                    : actionBarMode === "tools"
                      ? "full"
                      : "hidden",
                )
              }
              aria-label="Toggle quick actions and tools"
              title={
                actionBarMode === "hidden"
                  ? "Show tool buttons"
                  : actionBarMode === "tools"
                    ? "Show all buttons"
                    : "Hide buttons"
              }
            >
              {actionBarMode === "full" ? (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              )}
            </button>
          </div>

          {/* Junction info tip — shown until dismissed, explains the role
              of junctions and how to use them so they are never missed */}
          {isJunctionTipVisible && !isGuidedTourOpen && !isBuildAlongOpen && (
            <div className="junction-info-tip" role="note" aria-label="Junction nodes tip">
              <span className="junction-info-tip-icon" aria-hidden="true">─●─</span>
              <div className="junction-info-tip-body">
                <p className="junction-info-tip-title">Junction Nodes — critical for complex circuits</p>
                <p className="junction-info-tip-text">
                  Drop a <strong>Junction ─●─</strong> anywhere on a wire to instantly branch it.
                  Essential for parallel circuits and combination topologies.
                </p>
                <ul className="junction-info-tip-bullets">
                  <li>Press <kbd>J</kbd> or tap the pulsing <strong>Junction</strong> button in the component bar above</li>
                  <li>In Wire mode, click any wire to split it and branch from that point</li>
                  <li aria-label="KCL applies at every junction: sum of currents in equals sum of currents out">KCL applies at every junction: Σ I<sub>in</sub> = Σ I<sub>out</sub></li>
                </ul>
              </div>
              <button
                type="button"
                className="junction-info-tip-close"
                aria-label="Dismiss junction tip"
                onClick={handleDismissJunctionTip}
              >
                ×
              </button>
            </div>
          )}
        </Fragment>
      )}

      {isIntroDialogVisible && (
        <div
          className="builder-intro-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-dialog-title"
        >
          <div className="builder-intro-dialog-card">
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
          <span className="toggle-icon" aria-hidden="true">
            <IconChevron direction={isLeftMenuOpen ? "left" : "right"} />
          </span>
          <span className="toggle-text">Library</span>
        </button>
        <nav
          className="builder-menu builder-menu-left"
          role="navigation"
          aria-label="Component and wiring controls"
        >
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
              <div className="slider-stack slider-stack--bento">
                {(IS_DEMO_MODE
                  ? COMPONENT_ACTIONS.filter((c) =>
                      DEMO_COMPONENT_IDS.includes(c.id)
                    )
                  : COMPONENT_ACTIONS
                ).map((component) => (
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
                  🔒 More components unlocked in the full version
                  <br />
                  <span style={{ opacity: 0.7 }}>Get it on Play Store →</span>
                </a>
              )}
            </div>
            )}
            {/* The branded "Real Parts" are now unified INTO the picker above
                (UNIFIED_COMPONENT_ACTIONS) and filter under the same category tabs,
                so there is no longer a separate stacked section to hide behind the
                reel. */}
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
          <span className="toggle-icon" aria-hidden="true">
            <IconChevron direction={isRightMenuOpen ? "right" : "left"} />
          </span>
          <span className="toggle-text">Controls</span>
        </button>
        <nav
          className="builder-menu builder-menu-right"
          role="complementary"
          aria-label="Mode and view controls"
        >
          <div className="builder-menu-scroll">
            <div className="slider-section">
              <span className="slider-heading">Visualization</span>
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
          <span className="toggle-icon" aria-hidden="true">
            <IconChevron direction={isBottomMenuOpen ? "down" : "up"} />
          </span>
          <span className="toggle-text">Insights</span>
        </button>
        <nav
          className="builder-menu builder-menu-bottom"
          role="navigation"
          aria-label="Analysis, practice, and guides"
        >
          {isBottomMenuOpen && (
            <button
              type="button"
              className="builder-menu-bottom-close"
              onClick={() => setBottomMenuOpen(false)}
              aria-label="Close insights panel"
              title="Close insights"
            >
              ✕
            </button>
          )}
          <div className="builder-menu-scroll builder-menu-scroll-bottom">
            <div className="slider-section">
              <span className="slider-heading">Analysis</span>
              <InsightsFilmReel
                metrics={wireMetrics}
                wireProfile={{
                  gaugeLabel: activeWireProfile
                    ? activeWireProfile.gaugeLabel
                    : "Default builder wire",
                  resistancePer: activeWireProfile
                    ? `${activeWireSegmentResistance.toFixed(4)} Ω/m`
                    : `${DEFAULT_WIRE_SEGMENT_RESISTANCE_OHM.toFixed(3)} Ω/m`,
                  isActive: Boolean(activeWireProfile),
                }}
              />
            </div>
            <div className="slider-section">
              <span className="slider-heading">Environment</span>
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
                  onClick={() => setEnvironmentalPanelOpen(true)}
                  title="Open Environmental Conditions panel to simulate different operating environments"
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
                  const isSettingPanelTabActive =
                    isSettingsPanelOpen &&
                    ((setting.action === "open-logo-settings" &&
                      activeSettingsPanelTab === "logo-motion") ||
                      (setting.action === "open-workspace-skins" &&
                        activeSettingsPanelTab === "workspace-skins"));
                  const isActive =
                    (setting.isActive?.(modeState) ?? false) || isSettingPanelTabActive;
                  return (
                    <button
                      key={setting.id}
                      type="button"
                      className="slider-btn slider-btn-stacked"
                      onClick={() => {
                        if (setting.action === "open-logo-settings") {
                          setActiveSettingsPanelTab("logo-motion");
                          setSettingsPanelOpen(true);
                          setRightMenuOpen(true);
                        } else if (setting.action === "open-workspace-skins") {
                          setActiveSettingsPanelTab("workspace-skins");
                          setSettingsPanelOpen(true);
                          setRightMenuOpen(true);
                        } else {
                          triggerBuilderAction(setting.action, setting.data);
                        }
                      }}
                      disabled={controlsDisabled}
                      aria-disabled={controlsDisabled}
                      aria-pressed={isActive}
                      data-active={
                        isActive ? "true" : undefined
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
                {/* React-only toggle: plain-language descriptors under the
                    component thumbnails in the quick-add bar. */}
                <button
                  type="button"
                  className="slider-btn slider-btn-stacked"
                  onClick={() => setShowThumbDescriptors((v) => !v)}
                  aria-pressed={showThumbDescriptors}
                  data-active={showThumbDescriptors ? "true" : undefined}
                  title={
                    showThumbDescriptors
                      ? "Hide plain-language descriptions under component icons"
                      : "Show plain-language descriptions under component icons"
                  }
                  data-intent="settings"
                >
                  <span className="slider-label">Component Descriptors</span>
                  <span className="slider-description">
                    {showThumbDescriptors
                      ? "Descriptions shown under icons"
                      : "Descriptions hidden"}
                  </span>
                </button>
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
        <div
          className="builder-workspace-skin-layer"
          aria-hidden="true"
          style={workspaceSkinStyle}
        />
        {(isCurrentFlowPayoffLocking || isShowcaseLocked) && (
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

      {activeWorkspacePanelMode === "arena" && (
        <ArenaView
          variant="workspace"
          panelOpen={isWorkspacePanelOpen}
          onTogglePanel={() => setWorkspacePanelOpen((open) => !open)}
          onNavigateBack={closeArenaWorkspace}
        />
      )}

      {((isActiveCircuitBuildMode && !isOverlayActive) || isSettingsPanelLifted) && (
        <div
          className={`circuit-zoom-controls${isSettingsPanelLifted ? " circuit-zoom-controls--lifted" : ""}`}
          aria-label="Zoom controls"
        >
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
          <button
            type="button"
            className={`circuit-zoom-btn${labelVisibilityLevel > 0 ? "" : " circuit-zoom-btn--inactive"}`}
            onClick={() => triggerBuilderAction("toggle-labels")}
            disabled={controlsDisabled}
            aria-label={`Cycle component label detail (${labelVisibilityDescription})`}
            aria-pressed={labelVisibilityLevel > 0}
            title={labelToggleTitle}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82z" />
              <circle cx="7.5" cy="7.5" r="1.2" />
            </svg>
          </button>
          <button
            type="button"
            className={`cinematic-fab${isCinematicOpen ? " active" : ""}${cinematicIsRecording ? " cinematic-fab--recording" : ""}`}
            onClick={() => setIsCinematicOpen((prev) => !prev)}
            aria-label={isCinematicOpen ? "Close cinematic camera" : "Open cinematic camera"}
            aria-expanded={isCinematicOpen}
            title="Cinematic Camera"
          >
            {cinematicIsRecording ? (
              <><span className="cinematic-rec-dot" aria-hidden="true" />REC</>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 8-6 4 6 4V8z" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
            )}
          </button>
          {/* Settings — the gear lives out in the workspace control stack (below the
              cinematic camera); all settings open from here. */}
          <button
            type="button"
            className={`circuit-zoom-btn${isSettingsPanelOpen ? " circuit-zoom-btn--active" : ""}`}
            onClick={() => setSettingsPanelOpen((open) => !open)}
            aria-label={isSettingsPanelOpen ? "Close settings" : "Open settings"}
            aria-expanded={isSettingsPanelOpen}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      )}

      <div
        ref={floatingLogoRef}
        className="builder-floating-logo builder-floating-logo--3d"
        aria-hidden="true"
      >
        <WorkspaceLogo3D />
      </div>

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

      {isSettingsPanelOpen && (
        <CompactSettingsPanel
          isOpen={isSettingsPanelOpen}
          activeTab={activeSettingsPanelTab}
          onToggle={() => setSettingsPanelOpen(false)}
          onChangeTab={setActiveSettingsPanelTab}
          logoSettings={logoSettings}
          prefersReducedMotion={prefersReducedMotion}
          onLogoSettingChange={handleLogoSettingChange}
          onToggleLogoVisibility={toggleLogoVisibility}
          onResetLogoSettings={resetLogoSettings}
          skinOptions={workspaceSkinOptions}
          activeSkinId={activeWorkspaceSkinId}
          hasCustomSkin={hasCustomWorkspaceSkin}
          customSkinName={customWorkspaceSkinName}
          customSkinOpacity={customWorkspaceSkinOpacity}
          workspaceSkinError={workspaceSkinError}
          onSelectSkin={selectWorkspaceSkin}
          onImportCustomSkin={importWorkspaceSkinFromFile}
          onCustomSkinOpacityChange={setCustomWorkspaceSkinOpacity}
          onClearCustomSkin={clearCustomWorkspaceSkin}
          onResetWorkspaceSkin={resetWorkspaceSkin}
        />
      )}

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
        onExport={(format) => circuitStorage.exportCurrentCircuit(format)}
        onImport={(file) => circuitStorage.importCircuitFile(file)}
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

      <BuilderInteractiveTutorial
        isOpen={isInteractiveTutorialOpen}
        onClose={() => setInteractiveTutorialOpen(false)}
        modeState={modeState}
        circuitState={circuitState}
        lastSimulationAt={lastSimulationAt}
        isLeftMenuOpen={isLeftMenuOpen}
        onRequestOpenLeftMenu={() => setLeftMenuOpen(true)}
        onInvokeAction={triggerBuilderAction}
      />

      <BuilderGuidedTour
        open={isGuidedTourOpen}
        onClose={() => {
          // Dismiss for good — it won't auto-open again (Guides menu re-launches it).
          setGuidedTourOpen(false);
          try {
            window.localStorage.setItem(TOUR_DISMISSED_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        onInvokeAction={triggerBuilderAction}
        onStartBuildAlong={() => {
          // Hand off from the tour into the build-it-yourself walkthrough on a
          // clean, unlocked canvas (and don't auto-show the tour again).
          setGuidedTourOpen(false);
          setShowcaseLocked(false);
          setCircuitLocked(false);
          triggerBuilderAction("clear-workspace");
          setBuildAlongOpen(true);
          try {
            window.localStorage.setItem(TOUR_DISMISSED_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      />

      <BuilderBuildAlong
        open={isBuildAlongOpen}
        onClose={() => setBuildAlongOpen(false)}
        circuitState={circuitState}
        modeState={modeState}
        onInvokeAction={triggerBuilderAction}
        onRequestSetLeftMenu={setLeftMenuOpen}
      />

      {/* Circuit AI helper — floating action button + sliding chat panel */}
      <AIHelperPanel
        isOpen={isAIHelperOpen}
        circuitState={circuitState}
        onClose={() => setIsAIHelperOpen(false)}
      />

      {/* Circuit Explanation Engine — Pro-gated AI-powered analysis panel */}
      <CircuitExplainPanel
        isOpen={isExplainPanelOpen}
        circuitState={circuitState}
        onClose={() => setIsExplainPanelOpen(false)}
        onUpgrade={() => {
          setIsExplainPanelOpen(false);
          openWorkspacePanelMode("pricing");
        }}
      />

      <CinematicPanel
        isOpen={isCinematicOpen}
        onToggle={() => setIsCinematicOpen((prev) => !prev)}
        isPlaying={cinematicIsPlaying}
        isRecording={cinematicIsRecording}
        waypointCount={cinematicWaypointCount}
        recordError={cinematicRecordError}
        onPlayPreset={(preset: CinematicPreset) => triggerBuilderAction("cinematic-play", { preset })}
        onPlayKeyframes={() => triggerBuilderAction("cinematic-play", {})}
        onStop={() => triggerBuilderAction("cinematic-stop")}
        onCaptureFrame={() => triggerBuilderAction("cinematic-capture")}
        onStartRecord={() => triggerBuilderAction("cinematic-record-start")}
        onStopRecord={() => triggerBuilderAction("cinematic-record-stop")}
        onAddWaypoint={() => {
          triggerBuilderAction("cinematic-add-waypoint");
          setCinematicWaypointCount((n) => n + 1);
        }}
        onClearWaypoints={() => {
          triggerBuilderAction("cinematic-clear-waypoints");
          setCinematicWaypointCount(0);
        }}
      />

      {/* Floating Measure Widget — shown when the Measure action button is toggled */}
      {isMeasureWidgetOpen && (
        <div
          className={`measure-widget${meterState.armed ? " measure-widget--armed" : ""}`}
          role="region"
          aria-label="Measurement tools"
        >
          {/* Header */}
          <div className="measure-widget-header">
            <span className="measure-widget-title">MULTIMETER</span>
            <div className="measure-widget-header-actions">
              {meterState.armed && (
                <span className="measure-widget-armed-badge" aria-label="Probes active">LIVE</span>
              )}
              <button
                type="button"
                className="measure-widget-close"
                onClick={() => setMeasureWidgetOpen(false)}
                aria-label="Close measurement tools"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* LCD display */}
          <div className="dmm-display" aria-live="polite">
            <span className="dmm-mode-label">
              {meterState.mode === "voltage"
                ? "VOLTMETER"
                : meterState.mode === "current"
                  ? "AMMETER"
                  : meterState.mode === "resistance"
                    ? "OHMMETER"
                    : "OSCILLOSCOPE"}
            </span>
            <span
              className={`dmm-reading-main${meterState.reading !== "—" && meterState.reading !== "" ? " has-value" : ""}`}
              aria-label={`Reading: ${meterState.reading}`}
            >
              {meterState.reading !== "—" && meterState.reading !== ""
                ? meterState.reading
                : "- - - -"}
            </span>
            {meterState.subreading ? (
              <span className="dmm-subreading">{meterState.subreading}</span>
            ) : null}
          </div>

          {/* Mode selector */}
          <div className="dmm-mode-row" role="group" aria-label="Meter mode">
            {(["voltage", "current", "resistance", "scope"] as const).map((mode) => {
              const modeLabels: Record<string, { symbol: string; name: string }> = {
                voltage:    { symbol: "V",  name: "Voltage" },
                current:    { symbol: "A",  name: "Current" },
                resistance: { symbol: "Ω",  name: "Resistance" },
                scope:      { symbol: "~",  name: "Oscilloscope" },
              };
              const isActive = meterState.mode === mode && meterState.armed;
              return (
                <button
                  key={mode}
                  type="button"
                  className={`dmm-mode-btn${isActive ? " active" : ""}`}
                  aria-pressed={isActive}
                  title={modeLabels[mode].name}
                  disabled={!isFrameReady}
                  onClick={() => {
                    postToBuilder({ type: "builder:set-meter-mode", payload: { mode } });
                  }}
                >
                  <span className="dmm-mode-symbol">{modeLabels[mode].symbol}</span>
                  <span className="dmm-mode-name">{modeLabels[mode].name}</span>
                </button>
              );
            })}
          </div>

          {/* Probe terminals */}
          <div className="dmm-probes" aria-label="Probe terminals">
            <div className={`dmm-probe dmm-probe-red${meterState.probeA !== "—" ? " placed" : ""}`}>
              <span className="dmm-probe-dot" aria-hidden="true">●</span>
              <div className="dmm-probe-info">
                <span className="dmm-probe-port">VΩmA</span>
                <span className="dmm-probe-node" aria-label={`Red probe: ${meterState.probeA}`}>
                  {meterState.probeA !== "—" ? meterState.probeA : "open"}
                </span>
              </div>
            </div>
            <div className={`dmm-probe dmm-probe-black${meterState.probeB !== "—" ? " placed" : ""}`}>
              <span className="dmm-probe-dot" aria-hidden="true">●</span>
              <div className="dmm-probe-info">
                <span className="dmm-probe-port">COM</span>
                <span className="dmm-probe-node" aria-label={`Black probe: ${meterState.probeB}`}>
                  {meterState.probeB !== "—" ? meterState.probeB : "open"}
                </span>
              </div>
            </div>
          </div>

          {/* Arm / clear */}
          <div className="dmm-actions">
            <button
              type="button"
              className={`dmm-arm-btn${meterState.armed ? " armed" : ""}`}
              aria-pressed={meterState.armed}
              title={meterState.armed ? "Probes active — click circuit terminals to measure" : "Activate probes then tap two terminals on the circuit"}
              disabled={!isFrameReady}
              onClick={() => {
                postToBuilder({ type: "builder:toggle-meter-armed" });
              }}
            >
              {meterState.armed ? "⦿ Probes Active" : "○ Place Probes"}
            </button>
            <button
              type="button"
              className="dmm-clear-btn"
              title="Reset probe positions and clear reading"
              disabled={!isFrameReady}
              onClick={() => {
                postToBuilder({ type: "builder:clear-meter" });
              }}
            >
              ✕
            </button>
          </div>

          {/* Contextual hint */}
          {meterState.instructions && (
            <p className="dmm-instructions" aria-live="polite">
              {meterState.instructions}
            </p>
          )}
        </div>
      )}

      {/* Gallery toast — shown when a recording is saved */}
      <div className={`cinematic-toast${showGalleryToast ? " visible" : ""}`} role="status" aria-live="polite">
        <span>🎬 Recording saved to gallery</span>
        <a
          href="#/gallery"
          className="cinematic-toast__link"
          onClick={() => setShowGalleryToast(false)}
        >
          View Gallery
        </a>
        <button
          type="button"
          className="cinematic-toast__dismiss"
          onClick={() => setShowGalleryToast(false)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

    </div>
  );
}
