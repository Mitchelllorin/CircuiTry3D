import type { PartialWireMetrics, WireMetricKey, WireMetrics } from "../utils/electrical";

export type PracticeDifficulty = "intro" | "standard" | "challenge";

export type PracticeTopology = "series" | "parallel" | "combination";

export type ComponentRole = "source" | "load";

export type PracticeDiagramId = "seriesRect" | "parallelRect" | "comboRect";

export type PracticeComponent = {
  id: string;
  label: string;
  /** Optional component type key for 3D previews (e.g. 'battery', 'resistor', 'led'). */
  type?: string;
  role: ComponentRole;
  givens?: PartialWireMetrics;
  values?: PartialWireMetrics;
  notes?: string;
};

export type CircuitNode =
  | { kind: "component"; componentId: string }
  | { kind: "series"; id: string; label?: string; children: CircuitNode[] }
  | { kind: "parallel"; id: string; label?: string; children: CircuitNode[] };

export type TargetMetricDescriptor = {
  componentId: string;
  key: WireMetricKey;
};

export type PracticeStepContext = {
  totals: WireMetrics;
  components: Record<string, WireMetrics>;
  source: WireMetrics;
};

export type PracticeStepPresentation = {
  title: string;
  detail: string;
  formula?: string;
};

export type PracticeStepDefinition = (context: PracticeStepContext) => PracticeStepPresentation;

export type PracticeHint = {
  text: string;
  formula?: string;
};

export type PracticeProblemGamification = {
  /** Base XP earned when this problem is completed */
  xpReward: number;
  /** Tags that contribute to mastery/achievement progress */
  masteryTags: string[];
  /** Optional badge highlighted within the UI for this problem */
  featuredBadgeId?: string;
  /** Components unlocked by mastering this problem */
  unlocks?: string[];
};

export type PracticeProblem = {
  id: string;
  title: string;
  topology: PracticeTopology;
  difficulty: PracticeDifficulty;
  prompt: string;
  targetQuestion: string;
  targetMetric: TargetMetricDescriptor;
  conceptTags: string[];
  source: PracticeComponent;
  components: PracticeComponent[];
  network: CircuitNode;
  totalsGivens?: PartialWireMetrics;
  steps: PracticeStepDefinition[];
  presetHint?: string;
  diagram?: PracticeDiagramId;
  /** Curriculum-aligned learning objective */
  learningObjective?: string;
  /** Helpful hints for solving the problem */
  hints?: PracticeHint[];
  /** Quick tips for this problem type */
  tips?: string[];
  /** Interesting facts related to the concepts */
  facts?: string[];
  /** Real-world application examples */
  realWorldExample?: string;
  /** Gamification metadata (XP rewards, mastery tags, unlock hooks) */
  gamification?: PracticeProblemGamification;
};

