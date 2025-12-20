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
  | "set-tool"
  | "undo"
  | "redo"
  | "clear-workspace"
  | "run-simulation";

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

export type ComponentAction = {
  id: string;
  icon: string;
  label: string;
  action: "component" | "junction";
  builderType?: "battery" | "resistor" | "capacitor" | "inductor" | "lamp" | "diode" | "led" | "bjt" | "mosfet" | "switch" | "fuse" | "potentiometer" | "ground";
  description?: string;
};

export type BuilderToolId = "select" | "wire" | "measure";

export type WorkspaceMode = "build" | "practice" | "arena";

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
  paragraphs: string[];
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
