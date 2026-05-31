export type ArenaViewVariant = "page" | "embedded" | "workspace";

export type ArenaViewTransitionPhase = "entering" | "active" | "exiting";

export type ArenaViewProps = {
  variant?: ArenaViewVariant;
  onNavigateBack?: () => void;
  onOpenBuilder?: () => void;
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

export type ArenaBattleAgentMetrics = {
  voltage: number;
  current: number;
  resistance: number;
  power: number;
};

export type ArenaBattleAgent = {
  id: string;
  name: string;
  manufacturer?: string | null;
  componentType: string;
  renderType: string;
  abilityName: string;
  accent: string;
  attack: number;
  defense: number;
  health: number;
  maxHealth: number;
  spawnAngle: number;
  metrics: ArenaBattleAgentMetrics;
  componentNumber?: string | null;
  ratedThresholds?: {
    maxVoltageV?: number;
    maxCurrentA?: number;
    maxPowerW?: number;
    maxTempC?: number;
    minTempC?: number;
    thermalResistanceCA?: number;
  };
};

export type ArenaBattleLogEntry = {
  id: string;
  kind: "system" | "attack" | "result";
  round: number;
  message: string;
  actorId?: string;
  targetId?: string;
  damage?: number;
  abilityName?: string;
};

export type ArenaBattleStatus = "ready" | "battling" | "complete";

export type ArenaBattleHighlight = {
  actorId: string;
  targetId: string;
  damage: number;
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

export type CatalogComponent = {
  id: string;
  manufacturer: string;
  name: string;
  spec: string;
  type: string;
  featured?: boolean;
  properties: Record<string, number>;
  ratedThresholds?: {
    maxVoltageV?: number;
    maxCurrentA?: number;
    maxPowerW?: number;
    maxTempC?: number;
    minTempC?: number;
    thermalResistanceCA?: number;
  };
};
