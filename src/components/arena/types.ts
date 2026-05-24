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
