export type TroubleshootingProblem = {
  id: string;
  title: string;
  prompt: string;
  preset: string;
  hints?: string[];
  success: {
    kind: "has-flow";
  };
};

export type LegacyAnalyzeCircuitResult = {
  isComplete?: boolean;
  flow?: {
    hasFlow?: boolean;
    reason?: string;
    warning?: string;
  };
  voltage?: number;
  current?: number;
  resistance?: number;
  power?: number;
};

export function getAnalyzeCircuitResult(payload: unknown): LegacyAnalyzeCircuitResult | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  return result as LegacyAnalyzeCircuitResult;
}

export function isTroubleshootingSolved(problem: TroubleshootingProblem, simulationPayload: unknown): boolean {
  if (!problem) return false;
  const payload = simulationPayload as { success?: unknown } | null;
  if (!payload || payload.success !== true) return false;
  const result = getAnalyzeCircuitResult(simulationPayload);
  if (!result) return false;

  switch (problem.success.kind) {
    case "has-flow":
    default: {
      if (result.isComplete === true) return true;
      if (result.flow?.hasFlow === true) return true;
      return false;
    }
  }
}

const troubleshootingProblems: TroubleshootingProblem[] = [
  {
    id: "ts_switch_off",
    title: "Troubleshoot: Open Switch",
    prompt:
      "This circuit has power, wiring, and a load — but no current is flowing. Find the fault and fix it.",
    preset: "troubleshoot_switch_off",
    hints: [
      "Try interacting with the switch (SW1).",
      "When the switch is closed, the loop should allow current to flow.",
    ],
    success: { kind: "has-flow" },
  },
  {
    id: "ts_missing_wire",
    title: "Troubleshoot: Broken Loop",
    prompt:
      "The schematic looks almost right, but the loop is open. Add the missing connection to restore current flow.",
    preset: "troubleshoot_missing_wire",
    hints: [
      "A series circuit needs a complete loop from battery + back to battery -.",
      "Look for a missing return connection near the battery.",
    ],
    success: { kind: "has-flow" },
  },
];

export default troubleshootingProblems;

