import type { PartialWireMetrics, WireMetricKey, WireMetrics } from "../utils/electrical";

export type PracticeDifficulty = "intro" | "standard" | "challenge";

export type PracticeTopology = "series" | "parallel" | "combination";

export type ComponentRole = "source" | "load";

export type PracticeComponent = {
  id: string;
  label: string;
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
};

