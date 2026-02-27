export type BuilderInvokeAction =
  | "toggle-wire-mode"
  | "toggle-rotate-mode"
  | "add-junction"
  | "auto-arrange"
  | "reset-camera"
  | "fit-screen"
  | "toggle-current-flow"
  | "toggle-polarity"
  | "cycle-layout"
  | "open-measurement-tools"
  | "cycle-wire-routing"
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
  | "export-arena"
  | "open-logo-settings"
  | "open-workspace-skins"
  | "set-tool"
  | "undo"
  | "redo"
  | "clear-workspace"
  | "run-simulation"
  | "set-wire-profile"
  | "lock-circuit"
  | "unlock-circuit";

export type BuilderMessage =
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

export type LegacyCircuitState = {
  /**
   * ISO timestamp produced by the legacy builder when the snapshot was sent.
   * This is used for tutorial step validation (e.g., "did the user run a sim?").
   */
  updatedAt: string;
  counts: {
    components: number;
    wires: number;
    junctions: number;
    byType: Record<string, number>;
  };
  metrics: {
    voltage: number;
    current: number;
    /** null when open/infinite resistance */
    resistance: number | null;
    power: number;
    /** True when the legacy flow engine reports a complete closed circuit. */
    isComplete: boolean;
    /** Diagnostic reason when incomplete (e.g. 'no-battery', 'no-wires'). */
    reason?: string;
    flow?: {
      hasFlow?: boolean;
      reason?: string;
      warning?: string;
    };
  };
};

/**
 * Component metadata for scalable integration of real-world components.
 * This structure supports schematic symbols, preview images, manufacturer data,
 * and other metadata needed for educational and professional use.
 */
export type ComponentMetadata = {
  /** Schematic symbol identifier (e.g., 'ANSI_RESISTOR', 'IEC_CAPACITOR') */
  schematicSymbol?: string;
  /** Path to schematic symbol SVG/PNG for display in library */
  schematicSymbolPath?: string;
  /** Path to component preview image (3D render or photo) */
  previewImagePath?: string;
  /** ASCII/Unicode schematic symbol representation (e.g., '─/\\/\\/─' for resistor) */
  symbolText?: string;
  /** Short description for easy ID (e.g., 'Ohms', 'DC V', 'Farad') */
  symbolDesc?: string;
  /** Unit of measurement (e.g., 'Ω', 'V', 'F', 'H') */
  symbolUnit?: string;
  /** Reference designator (e.g., 'R1', 'C1', 'V1') */
  symbolRef?: string;
  /** Component category for filtering/organization */
  category?: ComponentCategory;
  /** Real-world component data for future integration */
  realWorld?: RealWorldComponentData;
  /** Educational tags for curriculum alignment */
  educationalTags?: string[];
};

export type ComponentCategory =
  | "power"
  | "passive"
  | "semiconductor"
  | "electromechanical"
  | "integrated"
  | "connector"
  | "sensor"
  | "display";

/**
 * Real-world component data structure for future manufacturer/distributor integration.
 * This enables linking simulation components to purchasable real-world parts.
 */
export type RealWorldComponentData = {
  /** Manufacturer part number */
  partNumber?: string;
  /** Manufacturer name */
  manufacturer?: string;
  /** Datasheet URL */
  datasheetUrl?: string;
  /** Typical package types (e.g., 'DIP-8', 'SMD-0805', 'TO-220') */
  packages?: string[];
  /** Price range estimate */
  priceRange?: { min: number; max: number; currency: string };
  /** Common distributor links */
  distributors?: Array<{ name: string; url: string; sku?: string }>;
};

export type ComponentAction = {
  id: string;
  icon: string;
  label: string;
  action: "component" | "junction";
  builderType?: "battery" | "ac_source" | "resistor" | "capacitor" | "capacitor-ceramic" | "inductor" | "lamp" | "motor" | "speaker" | "diode" | "zener-diode" | "photodiode" | "led" | "thermistor" | "crystal" | "bjt" | "bjt-npn" | "bjt-pnp" | "darlington" | "mosfet" | "switch" | "fuse" | "potentiometer" | "opamp" | "transformer" | "ground";
  description?: string;
  /** Extended metadata for scalable component integration */
  metadata?: ComponentMetadata;
};

export type BuilderToolId = "select" | "wire" | "measure";

export type WorkspaceMode =
  | "build"
  | "practice"
  | "troubleshoot"
  | "arena"
  | "help"
  | "wire-guide"
  | "arcade"
  | "classroom"
  | "community"
  | "account"
  | "pricing";

export type GuideWorkflowId = "help" | "tutorial" | "wire-guide";

export type LegacyModeState = {
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

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  kind: "tool" | "action";
  action: BuilderInvokeAction;
  data?: Record<string, unknown>;
  tool?: BuilderToolId;
};

export type HelpSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type HelpLegendItem = {
  id: string;
  letter: string;
  label: string;
};

export type HelpModalView =
  | "overview"
  | "tutorial"
  | "wire-guide"
  | "schematic"
  | "practice"
  | "shortcuts"
  | "about";

export type HelpEntry = {
  id: string;
  label: string;
  description: string;
  view: HelpModalView;
};

export type PanelAction = {
  id: string;
  label: string;
  description: string;
  action: BuilderInvokeAction;
  data?: Record<string, unknown>;
};

export type SettingsItem = {
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

export type ArenaExportSummary = {
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

export type ArenaExportStatus = "idle" | "exporting" | "ready" | "error";

export type BuilderLogoSettings = {
  speed: number;
  travelX: number;
  travelY: number;
  bounce: number;
  opacity: number;
  isVisible: boolean;
};

export type LogoNumericSettingKey =
  | "speed"
  | "travelX"
  | "travelY"
  | "bounce"
  | "opacity";

export type PracticeScenario = {
  id: string;
  label: string;
  question: string;
  description: string;
  preset: string;
  problemId?: string;
};

export type PracticeWorksheetStatus = {
  problemId: string;
  complete: boolean;
};
