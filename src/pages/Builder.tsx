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
import { getSchematicSymbol } from "../components/circuit/SchematicSymbols";
import BrandMark from "../components/BrandMark";
import { CompactWorksheetPanel } from "../components/builder/panels/CompactWorksheetPanel";
import { CompactTroubleshootPanel } from "../components/builder/panels/CompactTroubleshootPanel";
import { EnvironmentalPanel } from "../components/builder/panels/EnvironmentalPanel";
import { WireLibraryPanel } from "../components/builder/panels/WireLibraryPanel";
import {
  type EnvironmentalScenario,
  getDefaultScenario,
} from "../data/environmentalScenarios";
import ArenaView from "../components/arena/ArenaView";
import { CircuitSaveModal } from "../components/builder/modals/CircuitSaveModal";
import { CircuitLoadModal } from "../components/builder/modals/CircuitLoadModal";
import { CircuitRecoveryBanner } from "../components/builder/modals/CircuitRecoveryBanner";
import { BuilderInteractiveTutorial } from "../components/builder/tutorial/BuilderInteractiveTutorial";
import {
  CompactSettingsPanel,
  type SettingsPanelTab,
} from "../components/builder/panels/CompactSettingsPanel";
import { useCircuitStorage } from "../context/CircuitStorageContext";
import "../styles/circuit-storage.css";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
  findPracticeProblemByPreset,
  getRandomPracticeProblem,
} from "../data/practiceProblems";
import troubleshootingProblems, {
  getAnalyzeCircuitResult,
  isTroubleshootingSolved,
  type TroubleshootingProblem,
} from "../data/troubleshootingProblems";
import type { PracticeProblem } from "../model/practice";
import type {
  BuilderInvokeAction,
  ComponentAction,
  BuilderToolId,
  WorkspaceMode,
  LegacyModeState,
  QuickAction,
  HelpSection,
  HelpLegendItem,
  HelpModalView,
  HelpEntry,
  PanelAction,
  SettingsItem,
  LogoNumericSettingKey,
  PracticeScenario,
  PracticeWorksheetStatus,
} from "../components/builder/types";
import {
  COMPONENT_ACTIONS,
  QUICK_ACTIONS,
  WIRE_TOOL_ACTIONS,
  CURRENT_MODE_ACTIONS,
  VIEW_CONTROL_ACTIONS,
  SETTINGS_ITEMS,
  PRACTICE_SCENARIOS,
  PRACTICE_ACTIONS,
  WIRE_LEGEND,
  HELP_ENTRIES,
  DEFAULT_LOGO_SETTINGS,
} from "../components/builder/constants";
import { useComponent3DThumbnail } from "../components/builder/toolbars/useComponent3DThumbnail";
import wireStrippersIcon from "../assets/wire-strippers-icon.svg";

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    paragraphs: [
      "Pull out the Component Library, tap a device, then place it directly into the 3D workspace.",
      "Use the Wire Tool to drag intelligent routes between pins - swap between Freeform, Manhattan (90-deg), Simple, Perimeter, or A* routing modes from the left panel.",
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
      "Use the Wire tool to connect terminals and close the circuit loop so current can flow.",
      "Open the analysis panels on the right to watch live calculations while you build.",
    ],
    bullets: [
      "Quick keys: B (battery), R (resistor), L (LED), S (switch), J (junction).",
      "Wire tool supports freeform, Manhattan (90-deg), simple, perimeter, and A* auto-routing modes.",
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
      "Scroll wheel zooms by default; hold Shift+scroll to pan.",
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
            <Symbol x={0} y={0} scale={1} showLabel={false} />
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

export default function Builder() {
  const practiceProblemRef = useRef<string | null>(
    DEFAULT_PRACTICE_PROBLEM?.id ?? null,
  );
  const appBasePath = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? "/";
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }, []);

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
  const [isArenaPanelOpen, setArenaPanelOpen] = useState(false);
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
  const [isCircuitLocked, setCircuitLocked] = useState(false);
  const [isEnvironmentalPanelOpen, setEnvironmentalPanelOpen] = useState(false);
  const [isWireLibraryPanelOpen, setWireLibraryPanelOpen] = useState(false);
  const [modeBarScrollState, setModeBarScrollState] = useState<{
    canScrollLeft: boolean;
    canScrollRight: boolean;
  }>({ canScrollLeft: false, canScrollRight: false });
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentalScenario>(
    getDefaultScenario()
  );
  const [circuitBaseMetrics, setCircuitBaseMetrics] = useState({
    watts: 0,
    current: 0,
    resistance: 0,
    voltage: 0,
  });
  const [isInteractiveTutorialOpen, setInteractiveTutorialOpen] =
    useState(false);

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

  // Track global mode changes for later processing
  useEffect(() => {
    if (globalModeContext.workspaceMode !== workspaceMode) {
      pendingModeChangeRef.current = globalModeContext.workspaceMode;
    }
  }, [globalModeContext.workspaceMode, workspaceMode]);

  // Sync global isWireLibraryPanelOpen with local state
  useEffect(() => {
    if (globalModeContext.isWireLibraryPanelOpen && !isWireLibraryPanelOpen) {
      setWireLibraryPanelOpen(true);
      // Reset global flag after consuming it
      globalModeContext.setWireLibraryPanelOpen(false);
    }
  }, [globalModeContext.isWireLibraryPanelOpen, isWireLibraryPanelOpen]);

  // Update global context when local mode changes (from Builder-internal actions)
  const setWorkspaceModeWithGlobalSync = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    if (globalModeContext.workspaceMode !== mode) {
      globalModeContext.setWorkspaceMode(mode);
    }
  }, [globalModeContext]);

  const exitTroubleshootMode = useCallback(() => {
    setTroubleshootPanelOpen(false);
    setTroubleshootWorkspaceMode(false);
    setTroubleshootStatus(null);
    setTroubleshootCheckPending(false);
    setTroubleshootPendingCheckProblemId(null);
    setCircuitLocked(false);
    // Ensure global mode bar stays consistent and the panel can be reopened.
    if (
      workspaceMode === "troubleshoot" ||
      globalModeContext.workspaceMode === "troubleshoot"
    ) {
      setWorkspaceModeWithGlobalSync("build");
    }
  }, [
    globalModeContext.workspaceMode,
    setWorkspaceModeWithGlobalSync,
    workspaceMode,
  ]);

  const handleModeStateChange = useCallback((next: Partial<LegacyModeState>) => {
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
  }, []);

  const handleSimulationPulse = useCallback(() => {
    setSimulatePulsing(true);
    setTimeout(() => {
      setSimulatePulsing(false);
    }, 1400);
  }, []);

  const {
    iframeRef,
    isFrameReady,
    arenaExportStatus,
    arenaExportError,
    lastArenaExport,
    circuitState,
    lastSimulationAt,
    lastSimulation,
    postToBuilder,
    triggerBuilderAction,
    handleArenaSync,
  } = useBuilderFrame({
    appBasePath,
    onModeStateChange: handleModeStateChange,
    onToolChange: setActiveQuickTool,
    onSimulationPulse: handleSimulationPulse,
  });

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
    requestedHelpSection,
    setRequestedHelpSection,
    helpView,
    setHelpView,
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

  // Circuit storage for save/load functionality
  const circuitStorage = useCircuitStorage();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

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

  // Track mode bar scroll state for scroll indicators
  useEffect(() => {
    const modeBar = modeBarRef.current;
    if (!modeBar) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = modeBar;
      const canScrollLeft = scrollLeft > 5;
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
      setModeBarScrollState({ canScrollLeft, canScrollRight });
    };

    // Initial check
    updateScrollState();

    // Listen for scroll events
    modeBar.addEventListener("scroll", updateScrollState, { passive: true });

    // Resize observer to detect layout changes
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(modeBar);

    return () => {
      modeBar.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
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

  useEffect(() => {
    if (!isArenaPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isArenaPanelOpen) {
        setArenaPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isArenaPanelOpen]);

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
      setPracticeWorkspaceMode(true);
      setCompactWorksheetOpen(true);
      setTroubleshootWorkspaceMode(false);
      setTroubleshootPanelOpen(false);
      setCircuitLocked(true);
      setArenaPanelOpen(false);
    },
    [
      activePracticeProblemId,
      assignPracticeProblem,
      setArenaPanelOpen,
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
      setTroubleshootWorkspaceMode(true);
      setTroubleshootPanelOpen(true);
      setPracticeWorkspaceMode(false);
      setCompactWorksheetOpen(false);
      setArenaPanelOpen(false);
      setTroubleshootStatus(null);
      setTroubleshootCheckPending(false);
      setTroubleshootPendingCheckProblemId(null);
      setCircuitLocked(true);
      triggerBuilderAction("load-preset", { preset: nextProblem.preset });
    },
    [
      activeTroubleshootId,
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
        setPracticeWorkspaceMode(false);
        setTroubleshootWorkspaceMode(false);
        setCompactWorksheetOpen(false);
        setCircuitLocked(false);
        setArenaPanelOpen(false);
        setTroubleshootPanelOpen(false);
        setTroubleshootStatus(null);
      } else if (pendingMode === "practice") {
        openPracticeWorkspace();
      } else if (pendingMode === "arena") {
        setWorkspaceMode("arena");
        setTroubleshootWorkspaceMode(false);
        setTroubleshootPanelOpen(false);
        setCircuitLocked(false);
        setArenaPanelOpen(true);
        if (arenaExportStatus !== "ready") {
          handleArenaSync({ openWindow: false });
        }
      } else if (pendingMode === "learn") {
        setWorkspaceMode("learn");
        setTroubleshootWorkspaceMode(false);
        setTroubleshootPanelOpen(false);
        setCircuitLocked(false);
        openHelpCenter("overview");
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
    handleArenaSync,
    openHelpCenter,
    arenaExportStatus,
    globalModeContext,
  ]);

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
          openPracticeWorkspace(randomProblem);
        }
        return;
      }
      triggerBuilderAction(action.action, action.data);
    },
    [
      handleArenaSync,
      openHelpCenter,
      openPracticeWorkspace,
      setArenaPanelOpen,
      triggerBuilderAction,
    ],
  );

  const openLastArenaSession = useCallback(() => {
    if (!lastArenaExport?.sessionId) {
      return;
    }
    setArenaPanelOpen(true);
  }, [lastArenaExport, setArenaPanelOpen]);

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

  const handleAdvancePracticeProblem = useCallback(() => {
    const currentId =
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
    setTroubleshootStatus("Reset loaded. Fix the fault, then tap Check Fix.");
  }, [activeTroubleshootId, openTroubleshootWorkspace]);

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
  const isPracticeWorksheetComplete =
    Boolean(
      practiceWorksheetState &&
        activePracticeProblemId &&
        practiceWorksheetState.problemId === activePracticeProblemId &&
        practiceWorksheetState.complete,
    );
  const isArenaSyncing = arenaExportStatus === "exporting";
  const canOpenLastArena = Boolean(lastArenaExport?.sessionId);

  const isWorksheetVisible = isPracticeWorkspaceMode && isCompactWorksheetOpen;
  const isTroubleshootVisible =
    isTroubleshootWorkspaceMode && isTroubleshootPanelOpen;
  const isOverlayActive =
    isArenaPanelOpen ||
    isEnvironmentalPanelOpen ||
    isHelpOpen ||
    isSaveModalOpen ||
    isLoadModalOpen;
  const isActiveCircuitBuildMode =
    workspaceMode === "build" ||
    workspaceMode === "practice" ||
    workspaceMode === "troubleshoot";
  const shouldShowEdgeActions =
    isActiveCircuitBuildMode &&
    !isWorksheetVisible &&
    !isTroubleshootVisible &&
    !isSettingsPanelOpen &&
    !isOverlayActive;

  useEffect(() => {
    if (!isActiveCircuitBuildMode || isWorksheetVisible || isTroubleshootVisible) {
      setSettingsPanelOpen(false);
    }
  }, [isActiveCircuitBuildMode, isTroubleshootVisible, isWorksheetVisible]);

  const controlsDisabled = !isFrameReady || isCircuitLocked;
  const controlDisabledTitle = !isFrameReady
    ? "Workspace is still loading"
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
  const isActiveTroubleshootSolved = Boolean(
    activeTroubleshootProblem &&
      troubleshootSolvedIds.includes(activeTroubleshootProblem.id),
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
      setTroubleshootStatus("Solved! Current is flowing.");
      setTroubleshootSolvedIds((previous) => {
        if (previous.includes(activeTroubleshootProblem.id)) return previous;
        return [...previous, activeTroubleshootProblem.id];
      });
      return;
    }

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
    manhattan: "Manhattan (90-deg)",
    offset: "Offset",
    arc: "Arc",
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

  const wireMetrics = useMemo(() => {
    const volts = circuitState?.metrics.voltage ?? circuitBaseMetrics.voltage;
    const amps = circuitState?.metrics.current ?? circuitBaseMetrics.current;
    const watts = circuitState?.metrics.power ?? circuitBaseMetrics.watts;
    const resistanceValue =
      circuitState?.metrics.resistance ?? circuitBaseMetrics.resistance;
    const resistanceDisplay =
      circuitState?.metrics.resistance === null
        ? "∞ Ω"
        : `${Number.isFinite(resistanceValue) ? resistanceValue.toFixed(1) : "0.0"} Ω`;

    return [
      {
        id: "watts",
        letter: "W",
        label: "Watts",
        value: `${Number.isFinite(watts) ? watts.toFixed(2) : "0.00"} W`,
      },
      {
        id: "current",
        letter: "I",
        label: "Current",
        value: `${Number.isFinite(amps) ? amps.toFixed(3) : "0.000"} A`,
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
  }, [circuitBaseMetrics, circuitState]);

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
    <div
      className="builder-shell"
      data-left-menu-open={isLeftMenuOpen ? "true" : "false"}
      data-right-menu-open={isRightMenuOpen ? "true" : "false"}
      data-bottom-menu-open={isBottomMenuOpen ? "true" : "false"}
    >
      {/* Mode bar is now rendered globally in AppLayout */}

      {shouldShowEdgeActions && (
        <Fragment>
          {/* Workspace Quick Action Buttons - History/File actions on right edge */}
          <div className="workspace-edge-actions workspace-edge-actions--right" aria-label="History and file actions">
            <button
              type="button"
              className="edge-action-btn edge-action-btn--simulate"
              onClick={handleRunSimulationClick}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              data-pulse={isSimulatePulsing ? "true" : undefined}
              aria-label="Run simulation"
              title="Run the current circuit simulation"
            >
              <IconPlay className="edge-action-icon-svg" />
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
              <span className="edge-action-icon" aria-hidden="true">↺</span>
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
              <span className="edge-action-icon" aria-hidden="true">↻</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => setIsLoadModalOpen(true)}
              aria-label="Open circuit"
              title="Open saved circuit (Ctrl+O)"
            >
              <span className="edge-action-icon" aria-hidden="true">📂</span>
            </button>
            <button
              type="button"
              className="edge-action-btn"
              onClick={() => setIsSaveModalOpen(true)}
              aria-label="Save circuit"
              title="Save circuit (Ctrl+S)"
            >
              <span className="edge-action-icon" aria-hidden="true">💾</span>
              {circuitStorage.hasUnsavedChanges && (
                <span className="unsaved-dot" aria-label="Unsaved changes" />
              )}
            </button>
          </div>

          {/* Workspace Quick Action Buttons - Tool actions on left edge */}
          <div className="workspace-edge-actions workspace-edge-actions--left" aria-label="Tool quick actions">
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
            >
              <img src={wireStrippersIcon} alt="" className="edge-action-icon edge-action-icon-svg" aria-hidden="true" />
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
              <span className="edge-action-icon" aria-hidden="true">🔄</span>
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
              <span className="edge-action-icon" aria-hidden="true">✏️</span>
            </button>
          </div>
        </Fragment>
      )}

      <div className="builder-logo-header" aria-hidden="true">
        <div className="builder-logo-mark">
          <BrandMark size="lg" decorative />
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
            <div className="slider-section">
              <span className="slider-heading">Components Library</span>
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
                      data-tutorial-id={
                        action.id === "simulate"
                          ? "tutorial-run-simulation"
                          : undefined
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
                      data-tutorial-id={
                        action.action === "toggle-wire-mode"
                          ? "tutorial-enable-wire"
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
          <div className="builder-menu-scroll builder-menu-scroll-bottom">
            <div className="slider-section">
              <span className="slider-heading">Analysis</span>
              <div className="menu-track menu-track-metrics">
                {wireMetrics.map((metric) => (
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
                  onClick={() => openPracticeWorkspace()}
                  title={practiceWorksheetMessage}
                  data-complete={isPracticeWorksheetComplete ? "true" : undefined}
                >
                  <span className="slider-chip-label">Practice Worksheets</span>
                </button>
                {PRACTICE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className="slider-chip"
                    onClick={() => {
                      const problem = scenario.problemId
                        ? findPracticeProblemById(scenario.problemId)
                        : findPracticeProblemByPreset(scenario.preset);
                      openPracticeWorkspace(problem, scenario.preset);
                    }}
                    disabled={controlsDisabled}
                    aria-disabled={controlsDisabled}
                    title={
                      controlsDisabled ? controlDisabledTitle : scenario.question
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
              </div>
            </div>
            <div className="slider-section">
              <span className="slider-heading">Guides</span>
              <div className="menu-track menu-track-chips">
                <button
                  type="button"
                  className="slider-chip"
                  onClick={() => setInteractiveTutorialOpen(true)}
                  title="Start the interactive tutorial (battery → resistor → wire → simulate)"
                >
                  <span className="slider-chip-label">Interactive Tutorial</span>
                </button>
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
              {modeState.showLabels ? "Labels shown" : "Labels hidden"}
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
              {modeState.showLabels ? "Labels shown" : "Labels hidden"}
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
      </div>

      <div
        ref={floatingLogoRef}
        className="builder-floating-logo"
        aria-hidden="true"
      >
        <span className="builder-logo-text" aria-hidden="true">
          <span className="builder-logo-circui">Circui</span>
          <span className="builder-logo-try">Try</span>
          <span className="builder-logo-3d">3D</span>
        </span>
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
          status={troubleshootStatus}
          isOpen={isTroubleshootPanelOpen}
          isChecking={isTroubleshootCheckPending}
          isFrameReady={isFrameReady}
          isCircuitLocked={isCircuitLocked}
          onToggle={() => setTroubleshootPanelOpen(!isTroubleshootPanelOpen)}
          onExitMode={exitTroubleshootMode}
          onSelectProblem={handleSelectTroubleshootProblem}
          onResetCircuit={handleResetTroubleshootProblem}
          onCheckFix={handleCheckTroubleshootFix}
          onNextProblem={handleAdvanceTroubleshootProblem}
          onUnlockEditing={
            isActiveTroubleshootSolved ? handleUnlockTroubleshootEditing : undefined
          }
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
          <button
            type="button"
            className="builder-panel-close"
            onClick={() => setEnvironmentalPanelOpen(false)}
            aria-label="Close environmental conditions"
          >
            X
          </button>
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
      />
    </div>
  );
}
