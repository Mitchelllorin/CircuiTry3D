export type ArenaViewVariant = "page" | "embedded" | "workspace";

export type ArenaViewTransitionPhase = "entering" | "active" | "exiting";

export type ArenaViewProps = {
  variant?: ArenaViewVariant;
  onNavigateBack?: () => void;
  onOpenBuilder?: () => void;
  /**
   * Workspace variant only: whether the params/metrics panel is expanded.
   * When the panel collapses the camera cinematically sweeps into the arena
   * and full orbit control is handed to the user.
   */
  panelOpen?: boolean;
  /** Workspace variant only: toggle the params panel (the collapse arrow). */
  onTogglePanel?: () => void;
};

export type ArenaSourceComponent = {
  id?: string;
  name?: string;
  type?: string;
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
