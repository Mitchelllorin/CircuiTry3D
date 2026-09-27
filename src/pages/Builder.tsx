import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBuilderFrame } from "../hooks/builder/useBuilderFrame";
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
import { CircuitSweep } from "../components/builder/tutorial/CircuitSweep";
import { BuilderBuildAlong } from "../components/builder/tutorial/BuilderBuildAlong";
import { CompactSettingsPanel } from "../components/builder/panels/CompactSettingsPanel";
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
  HelpModalView,
  SettingsItem,
  PracticeWorksheetStatus,
  PanelAction,
} from "../components/builder/types";
import {
  COMPONENT_ACTIONS,
  QUICK_ADD_COMPONENTS,
  WIRE_TOOL_ACTIONS,
  SETTINGS_ITEMS,
  ENABLE_SCROLLER_MENU,
} from "../components/builder/constants";
import {
  REAL_PART_LIBRARY_ACTIONS,
  UNIFIED_COMPONENT_ACTIONS,
} from "../components/builder/componentLibrary";
import { CATALOG_DISCLAIMER } from "../data/componentCatalog";
import {
  DEFAULT_LABEL_LEVEL,
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
import { ExplodeControl } from "../components/builder/ExplodeControl";
import { HelpSheet } from "../components/builder/HelpSheet";
import { AnalysisSheet } from "../components/builder/AnalysisSheet";
import { formatEngineering } from "../utils/electrical";
import CurrentFlowAnimation from '../components/CurrentFlowAnimation';

type WorkspacePanelMode =
  | "arena"
  | "learn"
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
// Set once the user dismisses the guided tour "for good" — after that it no longer
// auto-opens on launch (still re-launchable from the Guides menu).
// Bumped v1 → v2 deliberately. Closing the tour writes this key and NOTHING ever
// clears it, so a single tap on ✕ retired the guided tour permanently — on every
// device that had already dismissed it, the app simply had no walkthrough any more,
// which read as the tour having been deleted. Bumping the key hands it back to
// everyone once. It is still re-launchable from Help → Take the Tour.
const CIRCUIT_SWEEP_DISMISSED_KEY = "circuitry3d:circuit-sweep:dismissed:v1";
// v2: the three tiers changed shape (tier 1 now keeps Help reachable), so the
// key is bumped — a device holding an old value gets the new middle default
// once, then persists its own choice again from there.
const ACTION_BAR_MODE_STORAGE_KEY = "ct3d.actionbar.mode.v2";
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

const GALLERY_TOAST_DURATION_MS = 6000;

// The unified component library now lives in its own module, because the Arena
// picks from the SAME list — see src/components/builder/componentLibrary.ts for
// why. Re-exported here so nothing that already imported it from this page
// breaks.
export { REAL_PART_LIBRARY_ACTIONS, UNIFIED_COMPONENT_ACTIONS };

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
    // Open on REFERENCES-ONLY (level 1 → SW1, R1, B1, LED1) so a newcomer isn't
    // hit with a wall of volts/ohms on first sight. The W.I.R.E. metrics (level 3)
    // get introduced deliberately in the next tutorial. Must match legacy.html's
    // own default (search `labelVisibilityLevel = 1`) or the legacy sync overrides it.
    labelVisibilityLevel: DEFAULT_LABEL_LEVEL,
    gridBrightness: 100,
    gridLineWidth: 1,
    gridHue: 240,
  });
  // The value is write-only now that the quick-add row no longer highlights the
  // active tool — legacy.html still reports tool changes, and the setter is
  // wired to that, so keep the channel open rather than tearing it out.
  // Readable again: Junction is a real one-tap button once more (on the left
  // rail now, not the top bar), so it still needs its active/pulsing state.
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
    useState<GuideWorkflowId>("wire-guide");
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
  const [isGuidedTourOpen, setGuidedTourOpen] = useState(false);
  const [isBuildAlongOpen, setBuildAlongOpen] = useState(false);
  const [isCurrentFlowPayoffRunning, setCurrentFlowPayoffRunning] =
    useState(false);
  // Junction tip starts hidden — it is shown the first time the user
  // explicitly uses the Junction button, not automatically on page load,
  // so that it never blocks the 3D canvas or grid on first visit.
  // Session-level guard: once the tip has been triggered (or suppressed) this
  // session, never trigger it again regardless of localStorage availability.

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
    frameHandshakeOk,
    frameDiag,
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

  // The 3D workspace is the only surface that lives in an iframe, and when that
  // frame dies it dies quietly: useBuilderFrame forces isFrameReady true after
  // 4 s so the UI never locks, so a dead workspace and a live one look identical
  // to every consumer. On a device there is no console to check either. Nine
  // seconds is well past a slow cold start on Android but short enough to still
  // be on screen when someone is looking at an empty grid wondering why.
  const [frameSilent, setFrameSilent] = useState(false);
  useEffect(() => {
    if (frameHandshakeOk) {
      setFrameSilent(false);
      return;
    }
    const timerId = window.setTimeout(() => setFrameSilent(true), 9_000);
    return () => window.clearTimeout(timerId);
  }, [frameHandshakeOk]);

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

  const {
    isHelpOpen,
    setHelpOpen,
    helpView,
    openHelpWithView,
  } = useHelpModal();

  const {
    isLeftMenuOpen,
    setLeftMenuOpen,
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

  // The Library opens beside the build rail, not over it. The rail wraps into a
  // second column on short screens, so its right edge is measured, not assumed
  // (read by .builder-menu-stage-left.open in builder-ui.css).
  useEffect(() => {
    const rail = document.querySelector<HTMLElement>(".unified-action-bar");
    if (!rail) return;
    const publish = () => {
      let right = 0;
      rail.querySelectorAll<HTMLElement>(":scope > *").forEach((child) => {
        const r = child.getBoundingClientRect();
        if (r.width > 0) right = Math.max(right, r.right);
      });
      if (right > 0) {
        document.documentElement.style.setProperty("--builder-rail-right", `${Math.round(right)}px`);
      }
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(rail);
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
    };
  }, [isLeftMenuOpen]);

  // Action bar visibility mode — persisted to localStorage
  const [actionBarMode, setActionBarMode] = useState<ActionBarMode>(() => {
    try {
      const stored = localStorage.getItem(ACTION_BAR_MODE_STORAGE_KEY);
      if (stored === "full" || stored === "tools" || stored === "hidden") {
        return stored;
      }
    } catch { /* ignore */ }
    // Default to 'tools' — the tool row (Wire, Run, Undo, Save, Measure…) is on
    // from the first run; only the component quick-adds stay tucked away, since
    // the Library panel already covers those.
    //
    // This used to default to 'hidden', which puts display:none on EVERY child of
    // the bar — Wire Mode included — and the bar is the only place Wire Mode
    // lives (LeftToolbar's "Wire Modes" section is never mounted). So a fresh
    // install had no reachable way into wiring at all: it worked only in the
    // tutorial and Practice, which toggle wire mode programmatically.
    return "tools";
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
  // Explode is a view, not a mode: the amount lives here, out of the iframe, so
  // it survives rotation, selection, panels opening and the frame reloading. It
  // only goes back to zero when the user takes it there.
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [isExplodeOpen, setExplodeOpen] = useState(false);
  // The W.I.R.E. readout is the control now; this is what it opens.
  const [isAnalysisOpen, setAnalysisOpen] = useState(false);
  const [isCinematicOpen, setIsCinematicOpen] = useState(false);
  const [cinematicIsPlaying, setCinematicIsPlaying] = useState(false);
  const [cinematicIsRecording, setCinematicIsRecording] = useState(false);
  const [cinematicWaypointCount, setCinematicWaypointCount] = useState(0);
  const [cinematicRecordError, setCinematicRecordError] = useState<string | null>(null);
  const [showGalleryToast, setShowGalleryToast] = useState(false);
  const galleryToastTimerRef = useRef<number | null>(null);

  // Hand the explode amount to the scene — again whenever the frame comes (back)
  // up, so a reloaded workspace picks up where the slider was left.
  useEffect(() => {
    if (!isFrameReady) return;
    triggerBuilderAction("set-explode", { amount: explodeAmount });
  }, [isFrameReady, explodeAmount, triggerBuilderAction]);

  // Reaching for the model puts the explode slider away. The canvas is inside the
  // iframe, so the scene reports the press (legacy:canvas-press).
  useEffect(() => {
    if (!isExplodeOpen) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === "object" && event.data.type === "legacy:canvas-press") {
        setExplodeOpen(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isExplodeOpen]);

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

  // The workspace's idle turntable (legacy.html: updateIdleOrbit) must not start
  // drifting while any of the host's UI owns the screen — those panels, modals and
  // tutorials render out here in React, so the iframe cannot see them for itself.
  // NOTE: this list is enumerated by hand. A new panel that isn't added here will
  // still suppress the drift while it's being touched, but not once it sits open
  // and idle.
  const isHostUiBusy =
    isWorkspacePanelOpen ||
    isTroubleshootPanelOpen ||
    isGuidesPanelOpen ||
    isEnvironmentalPanelOpen ||
    isSettingsPanelOpen ||
    isExplainPanelOpen ||
    isCompactWorksheetOpen ||
    isSaveModalOpen ||
    isLoadModalOpen ||
    isAIHelperOpen ||
    isMeasureWidgetOpen ||
    isCinematicOpen ||
    isExplodeOpen;
  // NOT in that list, deliberately: isGuidedTourOpen / isBuildAlongOpen. Effect 1
  // opens the guided tour on EVERY launch, so counting it as "a panel is open"
  // meant the turntable was blocked from the moment the app started and never
  // recovered until the user closed the tour — which reads as the feature simply
  // not working. The reason it's safe to leave out: the tour's camera sweeps run
  // through the CinematicController (tourFocusCamera → _cinematicCtrl.start), and
  // idleOrbitBlocked() already holds on _cinematicCtrl.isPlaying. So the drift
  // still yields whenever the tour is actually MOVING the camera, and only turns
  // while the tour is sitting idle waiting for the user to read a step.
  useEffect(() => {
    if (!isFrameReady) {
      return;
    }
    triggerBuilderAction("set-ui-busy", { busy: isHostUiBusy });
  }, [isFrameReady, isHostUiBusy, triggerBuilderAction]);

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

  // The two immersive walkthroughs, hoisted out of the side-menu chips that used
  // to own them inline. Both are reachable from the Guides/Help panel now, and
  // both have to come back to BUILD mode first: the overlay layer only makes sense
  // over the 3D workspace, and the "leaving build mode closes the walkthroughs"
  // effect would otherwise shut them again on the very next render.
  const startGuidedTour = useCallback(() => {
    resetWorkspaceSurfaces();
    setWorkspaceModeWithGlobalSync("build");
    setBuildAlongOpen(false);
    triggerBuilderAction("load-payoff");
    setShowcaseLocked(true);
    setGuidedTourOpen(true);
  }, [resetWorkspaceSurfaces, setWorkspaceModeWithGlobalSync, triggerBuilderAction]);

  const startBuildAlong = useCallback(() => {
    resetWorkspaceSurfaces();
    setWorkspaceModeWithGlobalSync("build");
    setGuidedTourOpen(false);
    setShowcaseLocked(false);
    setCircuitLocked(false);
    triggerBuilderAction("clear-workspace");
    setBuildAlongOpen(true);
  }, [resetWorkspaceSurfaces, setWorkspaceModeWithGlobalSync, triggerBuilderAction]);
  const openGuidesWorkspace = useCallback(
    (workflow: GuideWorkflowId = "wire-guide") => {
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
      // Help does not open the tour. The first-run tutorial (CT3D-TUTORIAL-1/2)
      // has exactly one way back in — Learn → Take the Tour — and the sheet
      // points there instead of becoming a second door.
      if (view === "wire-guide") {
        // The W.I.R.E. guide is a workspace panel, not part of the sheet.
        setHelpOpen(false);
        openGuidesWorkspace("wire-guide");
        return;
      }
      openHelpWithView(view);
    },
    [openGuidesWorkspace, openHelpWithView, setHelpOpen],
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
      } else if (pendingMode === "learn") {
        openWorkspacePanelMode("learn");
      } else if (pendingMode === "help") {
        // The nav's Help tab is the one door to Help now that the workspace bar
        // no longer carries a Help button. The W.I.R.E. guide has its own tab.
        setHelpOpen(true);
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

  const handleComponentAction = useCallback(
    (component: ComponentAction) => {
      console.log("[CT3D-REACT] handleComponentAction:", component?.id, component?.builderType, "locked:", isCircuitLocked, "frameReady:", isFrameReady);
      if (!component) {
        return;
      }

      if (component.action === "junction") {
        postToBuilder({ type: "builder:add-junction" });
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

  // Clear is out front on the bottom bar now, under a thumb, and it empties
  // the board. So it asks: the first tap arms it and the button says so, the
  // second clears, and it disarms itself after a few seconds. A dialog would
  // block the webview; this does not.
  const [isClearArmed, setClearArmed] = useState(false);
  const clearArmTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (clearArmTimerRef.current !== null) window.clearTimeout(clearArmTimerRef.current);
    },
    [],
  );
  const handleClearWorkspace = useCallback(() => {
    if (clearArmTimerRef.current !== null) window.clearTimeout(clearArmTimerRef.current);
    if (!isClearArmed) {
      setClearArmed(true);
      clearArmTimerRef.current = window.setTimeout(() => setClearArmed(false), 4000);
      return;
    }
    setClearArmed(false);
    triggerBuilderAction("clear-workspace");
  }, [isClearArmed, triggerBuilderAction]);

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
    () => {
      if (!isFrameReady) {
        // Iframe not ready yet — mark as pending so Effect 2 picks it up.
        pendingPayoffRef.current = true;
        return;
      }

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
        // The payoff BANNER is gone for good — it was a second narrating card
        // that popped the instant any walkthrough closed. The payoff SEQUENCE
        // stays: load-payoff is what builds the showcase circuit, and removing
        // that would empty the workspace on first run.
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
  // Two separate questions, and merging them broke the tour:
  //
  //   1. SHOULD the tour run?  Decided ON MOUNT. If it is decided later — when
  //      the iframe reports ready, which on a real phone is many seconds after
  //      the screen is usable — the tour lands on top of someone already
  //      building, takes the workspace read-only (setShowcaseLocked) and hides
  //      the whole action bar (data-tour-active puts `display:none !important`
  //      on it). From the user's seat: "for no reason I'm kicked out of
  //      building and back to the beginning", taps stop selecting, long-press
  //      edit is gone. Deciding at mount means the workspace is locked from the
  //      first frame and is never live-then-suddenly-locked.
  //
  //   2. WHEN does it start?  On frame-ready, NOT at mount. The tour is a timed
  //      cinematic: every step past the first calls tour-focus to sweep the
  //      camera. Those are postMessages into the workspace iframe, so starting
  //      before the frame is listening drops every one of them — the cards tick
  //      by on their timers and the camera never moves. Opening at mount is how
  //      the camera sweep went missing.
  //
  // So: latch eligibility at mount, open when the frame can actually be swept.
  const tourEligibleRef = useRef(false);
  const tourStartedRef = useRef(false);
  useEffect(() => {
    // Only run the tour for someone who hasn't dismissed it. Closing the tour
    // writes CIRCUIT_SWEEP_DISMISSED_KEY ("dismiss for good"), but nothing ever READ it,
    // so the tour re-opened on every single launch of build mode.
    let tourDismissed = false;
    try {
      tourDismissed =
        window.localStorage.getItem(CIRCUIT_SWEEP_DISMISSED_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (tourDismissed) {
      // Returning user: showcase stays as the backdrop, but the workspace is
      // theirs — unlocked, with the full action bar.
      tourEligibleRef.current = false;
      setShowcaseLocked(false);
      return;
    }

    // The showcase is view-only — lock it NOW, at mount, so there is no window
    // in which the user can start building and then have it taken away.
    tourEligibleRef.current = true;
    setShowcaseLocked(true);
    // Mount only — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 1 — load the showcase circuit on launch: a simple SERIES circuit
  // (battery → resistor → switch → light, switch closed, current flowing, light
  // lit), framed at a dynamic 3/4 angle toward the top of the workspace. This is
  // the backdrop the user lands on and that the point-at-the-parts guided tour
  // walks through. Once it is built, the camera can be swept — so this is also
  // where the tour is allowed to start.
  const showcaseLoadedRef = useRef(false);
  useEffect(() => {
    if (!isFrameReady || showcaseLoadedRef.current) {
      return;
    }
    showcaseLoadedRef.current = true;
    triggerBuilderAction("load-payoff");

    if (tourEligibleRef.current && !tourStartedRef.current) {
      tourStartedRef.current = true;
      setGuidedTourOpen(true);
    }
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

  // Mirror the latest circuit state into a ref so the payoff retry loop below can
  // read the live component count WITHOUT taking `circuitState` as an effect
  // dependency. Depending on it created an infinite loop: firing load-payoff runs
  // analyzeCircuit in legacy.html, which posts a fresh circuit-state, which gives
  // `circuitState` a new object reference, which re-ran the effect, which fired
  // load-payoff again… Each turn tore down and rebuilt the circuit (flashing the
  // nameplates) and snapped the camera home (teleporting mid-tour). Invisible on
  // fast desktop, brutal on Android's slower WebView. (Regression from 015fdff.)
  const latestCircuitStateRef = useRef(circuitState);
  useEffect(() => {
    latestCircuitStateRef.current = circuitState;
  }, [circuitState]);

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
    runCurrentFlowPayoffSequence();

    let attempts = 0;
    const MAX_ATTEMPTS = 6;
    const retryTimer = window.setInterval(() => {
      attempts += 1;
      // Read the CORRECT field (counts.components) from the ref — the old check
      // `circuitState?.components?.length` looked at a field that doesn't exist
      // on LegacyCircuitState, so it was always 0 and never stopped retrying.
      const componentCount =
        latestCircuitStateRef.current?.counts?.components ?? 0;
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
      runCurrentFlowPayoffSequence();
    }, 2500);

    return () => window.clearInterval(retryTimer);
    // NOTE: `circuitState` is deliberately NOT a dependency — see the ref comment
    // above. The interval polls latestCircuitStateRef for fresh counts instead.
  }, [isFrameReady, runCurrentFlowPayoffSequence]);

  // Safety net: never leave the onboarding lock on with nothing on screen that
  // explains it. Nothing narrates the showcase any more, so the only thing the
  // lock can do past the intro is make a live workspace feel broken — hand it
  // over a beat after the intro closes.
  useEffect(() => {
    if (!isOnboardingLocked) {
      return;
    }

    const safetyTimer = window.setTimeout(() => {
      setOnboardingLocked(false);
      setCircuitLocked(false);
    }, 5000);

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, [isOnboardingLocked]);

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
      window.dispatchEvent(new CustomEvent("circuitry3d:meaningfulSuccess"));
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
        // Engineering units, not fixed decimals: toFixed turned 40.5 mW into
        // "0.04 W" and 4.5 mA into "0.004 A" — a tenth low.
        value: formatEngineering(Number.isFinite(watts) ? watts : 0, "W", activeWireProfile ? 4 : 3),
      },
      {
        id: "current",
        letter: "I",
        label: "Current",
        value: formatEngineering(Number.isFinite(amps) ? amps : 0, "A", activeWireProfile ? 4 : 3),
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

  // While the current-flow payoff demo is playing (sequence running OR banner
  // showing) the preset circuit must be view-only: a transparent guard sits over
  // the workspace so an accidental tap can't grab and drag a component. It clears
  // the moment the demo auto-dismisses or the user taps Edit/×. This is needed
  // because the returning-user payoff path doesn't lock the iframe, and even the
  // first-run lock can be reset when load-payoff rebuilds the circuit.
  const isCurrentFlowPayoffLocking = isCurrentFlowPayoffRunning;

  // (isShowcaseLocked is declared earlier, near isCircuitLocked, so the lock-sync
  // effect can depend on it.) Latch it on once the payoff is loaded/showing —
  // but ONLY while the tour (CT3D-TUTORIAL-1) is on screen. Effect 2 runs the
  // payoff on every session, for everyone, to keep the canvas from coming up
  // blank; latching unconditionally locked every returning user's workspace on
  // launch with nothing on screen to unlock it, and a payoff retry landing after
  // the tour's × re-locked a first-time user too. The tour's own lock is set by
  // its own paths (eligibility at mount, startGuidedTour) and released by its ×,
  // so gating here changes nothing for the tour.
  useEffect(() => {
    if (isCurrentFlowPayoffLocking && isGuidedTourOpen) setShowcaseLocked(true);
  }, [isCurrentFlowPayoffLocking, isGuidedTourOpen]);

  // Plain-language insights that cycle through the payoff banner. Each one names
  // something the user can actually see happening on screen, so the showcase
  // teaches instead of just dazzling. Kept short — one idea per card.


  // What the workspace SHOWS — off the old Insights tab, into Settings. The
  // skin row is not here: the panel opens straight onto the skin picker.
  const displaySettings = useMemo(
    () => [
      ...SETTINGS_ITEMS.filter((setting) => setting.action !== "open-workspace-skins").map(
        (setting) => ({
          id: setting.id,
          label: setting.label,
          description: setting.getDescription(modeState, { currentFlowLabel }),
          isActive: setting.isActive?.(modeState) ?? false,
          disabled: controlsDisabled,
          onSelect: () => triggerBuilderAction(setting.action, setting.data),
        }),
      ),
      {
        id: "layout-mode",
        label: "Layout mode",
        description: layoutModeLabel,
        isActive: false,
        disabled: controlsDisabled,
        onSelect: () => triggerBuilderAction("cycle-layout"),
      },
      {
        id: "cinematic-camera",
        label: "Cinematic camera",
        description: "Fly the circuit and record it",
        isActive: isCinematicOpen,
        onSelect: () => setIsCinematicOpen(true),
      },
      {
        id: "component-descriptors",
        label: "Component Descriptors",
        description: showThumbDescriptors
          ? "Descriptions shown under icons"
          : "Descriptions hidden",
        isActive: showThumbDescriptors,
        onSelect: () => setShowThumbDescriptors((v) => !v),
      },
    ],
    [
      modeState,
      currentFlowLabel,
      controlsDisabled,
      triggerBuilderAction,
      showThumbDescriptors,
      layoutModeLabel,
      isCinematicOpen,
    ],
  );

  const workspacePanelMeta = useMemo(() => {
    switch (activeWorkspacePanelMode) {
      case "learn":
        return {
          title: "Learn",
          subtitle: "Watch the circuit explain itself, part by part.",
        };
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
      case "learn":
        return (
          <div className="learn-launcher">
            <button type="button" className="learn-launch-btn" onClick={startGuidedTour}>
              <span className="learn-launch-title">Take the Tour</span>
              <span className="learn-launch-sub">
                The camera walks the circuit and names every part as it goes.
              </span>
            </button>
          </div>
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
    startGuidedTour,
    startBuildAlong,
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
                  // Junction is no longer in this row, so nothing here can be
                  // the active tool; the pulsing-junction state moved out with it.
                  isActive={false}
                  title={component.description || component.label}
                  showDescriptor={showThumbDescriptors}
                />
              ))}
            </div>

            <span className="unified-action-divider" aria-hidden="true" />

            {/* Tool actions (formerly left edge) */}
            <button
              type="button"
              className={`edge-action-btn edge-action-btn--clear${isClearArmed ? " edge-action-btn--armed" : ""}`}
              onClick={handleClearWorkspace}
              disabled={controlsDisabled}
              aria-disabled={controlsDisabled}
              aria-label={isClearArmed ? "Tap again to clear the board" : "Clear the board"}
              title={
                isClearArmed
                  ? "Tap again to clear the board — Undo brings it back"
                  : "Clear the board (asks first)"
              }
            >
              <IconTrash className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">
                {isClearArmed ? "Sure?" : "Clear"}
              </span>
            </button>
            <button
              type="button"
              className={`edge-action-btn edge-action-btn--wire${modeState.isWireMode ? " edge-action-btn--active" : ""}`}
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
              className={`edge-action-btn--secondary edge-action-btn${modeState.isRotateMode ? " edge-action-btn--active" : ""}`}
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
              className="edge-action-btn--secondary edge-action-btn"
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
              className="edge-action-btn--secondary edge-action-btn"
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
              className="edge-action-btn--secondary edge-action-btn"
              onClick={() => setIsLoadModalOpen(true)}
              aria-label="Open circuit"
              title="Open saved circuit (Ctrl+O)"
            >
              <IconFolder className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Load</span>
            </button>
            <button
              type="button"
              className="edge-action-btn--secondary edge-action-btn"
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
              className={`edge-action-btn--secondary edge-action-btn edge-action-btn--ai${isAIHelperOpen ? " edge-action-btn--active" : ""}`}
              onClick={() => setIsAIHelperOpen((prev) => !prev)}
              aria-label={isAIHelperOpen ? "Close Circuit AI" : "Open Circuit AI assistant"}
              aria-expanded={isAIHelperOpen}
              title="Circuit AI — ask anything about circuits or the app"
            >
              <IconBolt className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">AI</span>
            </button>
            {/* "Explain" used to be its own button right here — two buttons
                side by side that both meant "the AI, about this circuit". It is
                now the first chip inside the assistant, which still opens the
                Pro-gated explanation panel. */}
            <button
              type="button"
              className={`edge-action-btn--secondary edge-action-btn${(isMeasureWidgetOpen || meterState.armed) ? " edge-action-btn--active" : ""}`}
              onClick={() => setMeasureWidgetOpen((o) => !o)}
              aria-label={isMeasureWidgetOpen ? "Close measurement tools" : "Open measurement tools"}
              aria-expanded={isMeasureWidgetOpen}
              title="Measurement Tools — Digital Multimeter"
            >
              <IconRuler className="edge-action-icon-svg" />
              <span className="edge-action-label" aria-hidden="true">Measure</span>
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

        </Fragment>
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
            {/* The branded parts sit in that same picker, so the attribution has to
                be reachable from it and not only from the Arena's catalog block.
                Collapsed: the user summons it, it costs no space shut, and it is one
                tap either way — a permanent paragraph of legal text in a component
                picker would be a slab nobody reads. */}
            <details className="builder-brand-note">
              <summary>About the branded parts</summary>
              <p>{CATALOG_DISCLAIMER}</p>
            </details>
          </div>
        </nav>
      </div>


      <div className="builder-ticker-feed" role="status" aria-live="polite">
        <div className="ticker-wire-fixed" role="group" aria-label="W.I.R.E. live metrics">
          {wireMetrics.map((metric) => (
            <button
              type="button"
              key={`ticker-wire-fixed-${metric.id}`}
              className={`ticker-wire-metric ticker-wire-metric--${metric.id}`}
              onClick={() => setAnalysisOpen(true)}
              title={`${metric.label}: ${metric.value} — tap for the working`}
              aria-label={`${metric.label}: ${metric.value}. Open the numbers.`}
            >
              <span className="ticker-wire-letter" aria-hidden="true">
                {metric.letter}
              </span>
              <span className="ticker-wire-value">{metric.value}</span>
            </button>
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
        {frameSilent && (
          <div className="builder-frame-silent" role="alert">
            <strong>3D workspace never started</strong>
            <p>
              The workspace frame never reported in, so the grid and circuit
              cannot be drawn. Everything else on this screen is fine — this is
              the 3D view only.
            </p>
            <code>src: {builderFrameSrc}</code>
            <code>
              last message from workspace:{" "}
              {frameDiag ? `${frameDiag.msg} ${frameDiag.detail}` : "none — it never spoke"}
            </code>
            <p>Screenshot this: the two lines above say exactly what failed.</p>
          </div>
        )}
        <div
          className="builder-workspace-skin-layer"
          aria-hidden="true"
          style={workspaceSkinStyle}
        />
        {/* The "🔒 Demo circuit — tap to edit" pill used to sit here, floating over
            the bottom of the workspace for as long as the showcase was locked.
            Removed: it announced something the circuit already says for itself,
            and its whole purpose was to invite a tap that unlocks the demo —
            which is the one thing the lock exists to prevent. A stray tap there
            let someone drag the showcase apart and lose their bearings.

            The lock stays. What moved is the unlock: it now happens when the tour
            ENDS (see CircuitSweep's onClose below), which is the deliberate
            "I am done watching, the workspace is mine" moment. Nobody is left
            with a read-only workspace and no way out. */}
      </div>

      {activeWorkspacePanelMode === "arena" && (
        <ArenaView
          variant="workspace"
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
            onClick={() => triggerBuilderAction("reset-camera")}
            disabled={controlsDisabled}
            aria-label="Reset the view"
            title="Reset the view"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
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
          {/* Explode — foot of the right edge, the same place ThePrints3D keeps
              it, and the nearest spot in this column to the thumb. */}
          <ExplodeControl
            amount={explodeAmount}
            onAmountChange={setExplodeAmount}
            isOpen={isExplodeOpen}
            onOpenChange={setExplodeOpen}
            disabled={controlsDisabled}
          />
        </div>
      )}

      {/* The drifting 3D logo watermark used to hang here, over the workspace, at
          10% opacity. It was a second live WebGL context — a full r3f <Canvas> with
          antialias, three lights and an animated mesh, rendering every frame — sat
          on top of the builder's own Three.js scene, purely as decoration nobody
          could quite see. Two costs, both real: it competed with the workspace for
          GPU and for the device's WebGL context budget (this app has already had to
          fight for contexts — see the arena/builder blanking fixes), and on mobile
          its transparent clear is not always honoured, which paints it as a faint
          opaque box drifting behind the circuit. Removed. The wordmark still exists
          for headers as <HeaderLogo3D>, where it is actually legible. */}

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

      <AnalysisSheet
        isOpen={isAnalysisOpen}
        onClose={() => setAnalysisOpen(false)}
        metrics={wireMetrics}
        wireProfile={{
          gaugeLabel: activeWireProfile ? activeWireProfile.gaugeLabel : "Default builder wire",
          resistancePer: activeWireProfile
            ? `${activeWireSegmentResistance.toFixed(4)} Ω/m`
            : `${DEFAULT_WIRE_SEGMENT_RESISTANCE_OHM.toFixed(3)} Ω/m`,
          isActive: Boolean(activeWireProfile),
        }}
      />

      <HelpSheet
        isOpen={isHelpOpen}
        section={helpView === "shortcuts" || helpView === "about" ? helpView : "overview"}
        onClose={() => setHelpOpen(false)}
      />

      {isSettingsPanelOpen && (
        <CompactSettingsPanel
          isOpen={isSettingsPanelOpen}
          onToggle={() => setSettingsPanelOpen(false)}
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
          displaySettings={displaySettings}
          gridStyle={
            <>
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
            </>
          }
          environment={{
            icon: activeEnvironment.icon,
            name: activeEnvironment.name,
            onConfigure: () => setEnvironmentalPanelOpen(true),
          }}
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


      <CircuitSweep
        open={isGuidedTourOpen}
        onClose={() => {
          // ✕ means out of everything. The payoff banner used to be gated on
          // `!isGuidedTourOpen && !isBuildAlongOpen`, so closing the tour handed
          // the screen straight to a second cycling card system — from the
          // user's seat, the tutorial that would not die. The banner is gone
          // now; keep this the only narrator on the way out.
          // Dismiss for good — it won't auto-open again (Guides menu re-launches it).
          setGuidedTourOpen(false);
          // Ending the tour hands the workspace over. This used to be the job of
          // the "tap to edit" pill; with the pill gone this is the only unlock on
          // the guided-tour path, so without it the showcase would stay read-only
          // until a reload.
          setShowcaseLocked(false);
          try {
            window.localStorage.setItem(CIRCUIT_SWEEP_DISMISSED_KEY, "1");
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
            window.localStorage.setItem(CIRCUIT_SWEEP_DISMISSED_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      />

      <BuilderBuildAlong
        open={isBuildAlongOpen}
        onClose={() => {
          setBuildAlongOpen(false);
        }}
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
        onExplainCircuit={() => {
          setIsAIHelperOpen(false);
          setIsExplainPanelOpen(true);
        }}
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
