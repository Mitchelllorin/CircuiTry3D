export type TroubleshootingProblem = {
  id: string;
  title: string;
  prompt: string;
  preset: string;
  hints?: string[];
  success: {
    kind: "has-flow" | "has-flow-no-short";
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
    case "has-flow-no-short": {
      const hasFlow = result.isComplete === true || result.flow?.hasFlow === true;
      if (!hasFlow) return false;
      if (result.flow?.warning === "short") return false;
      if (result.flow?.reason === "short") return false;
      return true;
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
  {
    id: "ts_short_circuit",
    title: "Troubleshoot: Short Circuit",
    prompt:
      "This circuit has current flow, but it’s dangerously shorted. Fix it so current still flows without a short-circuit warning.",
    preset: "troubleshoot_short_circuit",
    hints: [
      "A direct wire from battery + to battery - is a short.",
      "Add resistance (e.g., a resistor) into the path or remove the direct connection.",
    ],
    success: { kind: "has-flow-no-short" },
  },
  {
    id: "ts_led_polarity",
    title: "Troubleshoot: Reversed LED",
    prompt:
      "The circuit is wired, but polarity is wrong and current won’t pass the LED. Fix the orientation/wiring so current can flow.",
    preset: "troubleshoot_led_reverse",
    hints: [
      "Try swapping which side of the LED is connected toward the battery positive terminal.",
      "If you still see a polarity mismatch, reverse the LED connections.",
    ],
    success: { kind: "has-flow" },
  },
];

export default troubleshootingProblems;

