export type ArenaViewVariant = "page" | "embedded" | "workspace";

export type ArenaViewTransitionPhase = "entering" | "active" | "exiting";

export type ArenaViewProps = {
  variant?: ArenaViewVariant;
  onNavigateBack?: () => void;
  onOpenBuilder?: () => void;
  sessionId?: string | null;
};

export type ArenaSourceComponent = {
  id?: string;
  name?: string;
  type?: string;
  manufacturer?: string | null;
  componentNumber?: string;
  partNumber?: string;
  properties?: Record<string, unknown>;
};

export type ArenaSessionPayload = {
  version?: string;
  sessionName?: string;
  exportedAt?: string;
  source?: {
    name?: string;
    type?: string;
    environment?: string;
    bridgeVersion?: string;
  };
  components?: ArenaSourceComponent[];
  analysis?: {
    basic?: {
      voltage?: number | null;
      current?: number | null;
      resistance?: number | null;
      power?: number | null;
    };
    advanced?: Record<string, unknown>;
  };
  testVariables?: Record<string, unknown>;
  metadata?: {
    componentCount?: number;
    wireCount?: number;
    junctionCount?: number;
  };
};

/** Nominal operating point of a component, taken from circuit analysis. */
export type ArenaBattleAgentMetrics = {
  voltage: number;
  current: number;
  resistance: number;
  power: number;
};

/** Manufacturer-style ratings the stress test pushes a component against. */
export type ArenaComponentRatings = {
  /** Rated continuous power dissipation, W. */
  powerRating: number;
  /** Maximum continuous current, A (Infinity when the part is not current-bound). */
  maxCurrent: number;
  /** Maximum working voltage, V (Infinity when not voltage-bound). */
  maxVoltage: number;
  /** Continuous junction/body temperature limit, °C. */
  junctionLimitC: number;
  /** Absolute maximum temperature before destruction, °C. */
  absoluteMaxTempC: number;
  /** Body temperature rise per watt dissipated, °C/W. */
  thermalResistanceCPerW: number;
};

/** Live state of a component during a performance test. */
export type ArenaTestPhase = "nominal" | "stressed" | "critical" | "failed";

export type ArenaBattleAgent = {
  id: string;
  name: string;
  manufacturer?: string | null;
  componentType: string;
  renderType: string;
  /** Canonical physics family resolved by F.U.S.E. (e.g. "resistor"). */
  family: string;
  /** Characteristic failure mode this part is being tested against. */
  stressSignature: string;
  accent: string;
  spawnAngle: number;
  /** Nominal operating point (V/I/R/P) from the imported circuit. */
  metrics: ArenaBattleAgentMetrics;
  /** Normalised properties handed to F.U.S.E. detectFailure. */
  properties: Record<string, unknown>;
  ratings: ArenaComponentRatings;
  componentNumber?: string | null;

  // ── live telemetry, updated every test tick ──
  /** Structural integrity 100 → 0 (0 = failed). Replaces the old HP bar. */
  integrity: number;
  maxIntegrity: number;
  /** F.U.S.E. severity 0 (OK) → 3 (destroyed). */
  severity: number;
  /** Estimated body temperature, °C. */
  tempC: number;
  /** Percent of the binding rating currently in use (power or current). */
  loadPercent: number;
  phase: ArenaTestPhase;
  failureName: string | null;
  /** F.U.S.E. visual key for the failure effect (char/melt/arc/burst/…). */
  failureVisual: string | null;

  // ── accumulated performance metrics, carried across the whole run ──
  /** Hottest body temperature reached, °C. */
  peakTempC: number;
  /** Highest fraction of rating reached, %. */
  peakLoadPercent: number;
  /** Total energy dissipated over the run, joules. */
  energyJ: number;
  /** Highest load multiple the part withstood (× nominal). */
  survivedLoad: number;
  /** Elapsed time at failure, ms (null while alive). */
  failedAtMs: number | null;
  /** Load multiple at the moment of failure (null while alive). */
  failedAtLoad: number | null;
  /** Composite robustness score 0–100, assigned when the test concludes. */
  score: number;
  /** Final placement, 1 = winner (0 until the test concludes). */
  rank: number;
  /** Rated limits imported with the part, used by F.U.S.E. thresholds. */
  ratedThresholds?: {
    maxVoltageV?: number;
    maxCurrentA?: number;
    maxPowerW?: number;
    maxTempC?: number;
    minTempC?: number;
    thermalResistanceCA?: number;
  };
};

/** End-of-run roll-up shown on the verdict / podium. */
export type ArenaBattleSummary = {
  scenarioId: string;
  scenarioName: string;
  survivorCount: number;
  totalCount: number;
  peakLoad: number;
  totalEnergyJ: number;
  /** Agent ids ordered best → worst by score. */
  ranking: string[];
};

export type ArenaBattleLogEntry = {
  id: string;
  kind: "system" | "stress" | "warning" | "failure" | "verdict";
  /** Stress factor (× nominal load) at the moment this entry was logged. */
  round: number;
  message: string;
  actorId?: string;
};

export type ArenaBattleStatus = "ready" | "battling" | "complete";

/** A short-lived event used by the 3D scene to flash a component. */
export type ArenaBattleHighlight = {
  agentId: string;
  kind: "stress" | "fail";
  token: number;
};

// ── Environmental Scenario ────────────────────────────────────────────────────

export type ArenaEnvironment = {
  name?: string;
  temperatureC: number;
  humidityPercent: number;
  voltageStressMultiplier: number;
};

export const DEFAULT_ENVIRONMENT: ArenaEnvironment = {
  temperatureC: 25,
  humidityPercent: 45,
  voltageStressMultiplier: 1.0,
};

export type ArenaEnvironmentPreset = {
  id: string;
  label: string;
  icon: string;
  env: ArenaEnvironment;
};

export const ENVIRONMENT_PRESETS: ArenaEnvironmentPreset[] = [
  {
    id: "standard",
    label: "Standard Lab",
    icon: "🧪",
    env: { temperatureC: 25, humidityPercent: 45, voltageStressMultiplier: 1.0 },
  },
  {
    id: "cold",
    label: "Arctic Cold",
    icon: "🧊",
    env: { temperatureC: -20, humidityPercent: 30, voltageStressMultiplier: 1.0 },
  },
  {
    id: "hot",
    label: "Desert Heat",
    icon: "☀️",
    env: { temperatureC: 85, humidityPercent: 20, voltageStressMultiplier: 1.0 },
  },
  {
    id: "humid",
    label: "Tropical Humid",
    icon: "🌴",
    env: { temperatureC: 40, humidityPercent: 90, voltageStressMultiplier: 1.0 },
  },
  {
    id: "overvoltage",
    label: "Overvoltage Surge",
    icon: "⚡",
    env: { temperatureC: 35, humidityPercent: 45, voltageStressMultiplier: 1.5 },
  },
  {
    id: "extreme",
    label: "Extreme Stress",
    icon: "🔥",
    env: { temperatureC: 125, humidityPercent: 85, voltageStressMultiplier: 1.8 },
  },
];

// ── FUSE™ Failure Understanding Simulation Engine ─────────────────────────────

export type FuseRiskLevel = "safe" | "stressed" | "warning" | "critical" | "failed";

export type FuseFailureMode = {
  id: string;
  name: string;
  description: string;
  severity: FuseRiskLevel;
};

export type FuseAnalysisResult = {
  agentId: string;
  riskScore: number;
  riskLevel: FuseRiskLevel;
  thermalRise: number;
  junctionTemperature: number;
  voltageDerating: number;
  powerUtilization: number;
  failureModes: FuseFailureMode[];
  recommendation: string;
};

// ── Component Catalog ─────────────────────────────────────────────────────────

// Defined in the app-neutral catalog so the Builder and the Arena share one
// shape. Re-exported here for the Arena's existing `./types` import paths.
export type { CatalogComponent } from "../../data/componentCatalog";
