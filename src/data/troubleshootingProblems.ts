export type TroubleshootingProblem = {
  id: string;
  title: string;
  prompt: string;
  preset: string;
  diagram:
    | "switchOpenRect"
    | "missingWireRect"
    | "shortCircuitRect"
    | "reversedLedRect";
  hints?: string[];
  diagnosis?: {
    placeholder?: string;
    acceptedAnswers: string[];
    keywordGroups?: string[][];
  };
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

const normalizeTroubleshootingAnswer = (answer: string): string =>
  answer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTokenList = (value: string): string[] =>
  normalizeTroubleshootingAnswer(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

export function isTroubleshootingDiagnosisCorrect(
  problem: TroubleshootingProblem,
  answer: string,
): boolean {
  const diagnosis = problem.diagnosis;
  if (!diagnosis) return false;
  const normalizedAnswer = normalizeTroubleshootingAnswer(answer);
  if (!normalizedAnswer) return false;

  const answerTokens = new Set(toTokenList(normalizedAnswer));
  const hasAllTokens = (tokens: string[]) =>
    tokens.length > 0 && tokens.every((token) => answerTokens.has(token));

  const acceptedAnswers = diagnosis.acceptedAnswers
    .map((candidate) => normalizeTroubleshootingAnswer(candidate))
    .filter(Boolean);

  if (
    acceptedAnswers.some(
      (candidate) => normalizedAnswer === candidate || hasAllTokens(toTokenList(candidate)),
    )
  ) {
    return true;
  }

  if (diagnosis.keywordGroups?.length) {
    return diagnosis.keywordGroups.some((group) => hasAllTokens(group.map((token) => token.toLowerCase())));
  }

  return false;
}

const troubleshootingProblems: TroubleshootingProblem[] = [
  {
    id: "ts_switch_off",
    title: "Troubleshoot: Open Switch",
    prompt:
      "This circuit has power, wiring, and a load — but no current is flowing. Find the fault and fix it.",
    preset: "troubleshoot_switch_off",
    diagram: "switchOpenRect",
    hints: [
      "Try interacting with the switch (SW1).",
      "When the switch is closed, the loop should allow current to flow.",
    ],
    diagnosis: {
      placeholder: "Example: SW1 is open, so current cannot flow.",
      acceptedAnswers: [
        "open switch",
        "switch is open",
        "switch left open",
        "sw1 open",
        "switch off",
      ],
      keywordGroups: [
        ["switch", "open"],
        ["sw1", "open"],
      ],
    },
    success: { kind: "has-flow" },
  },
  {
    id: "ts_missing_wire",
    title: "Troubleshoot: Broken Loop",
    prompt:
      "The schematic looks almost right, but the loop is open. Add the missing connection to restore current flow.",
    preset: "troubleshoot_missing_wire",
    diagram: "missingWireRect",
    hints: [
      "A series circuit needs a complete loop from battery + back to battery -.",
      "Look for a missing return connection near the battery.",
    ],
    diagnosis: {
      placeholder: "Example: The return wire is missing and the loop is open.",
      acceptedAnswers: [
        "missing wire",
        "broken loop",
        "open loop",
        "missing connection",
        "missing return path",
      ],
      keywordGroups: [
        ["missing", "wire"],
        ["broken", "loop"],
        ["open", "loop"],
      ],
    },
    success: { kind: "has-flow" },
  },
  {
    id: "ts_short_circuit",
    title: "Troubleshoot: Short Circuit",
    prompt:
      "This circuit has current flow, but it’s dangerously shorted. Fix it so current still flows without a short-circuit warning.",
    preset: "troubleshoot_short_circuit",
    diagram: "shortCircuitRect",
    hints: [
      "A direct wire from battery + to battery - is a short.",
      "Add resistance (e.g., a resistor) into the path or remove the direct connection.",
    ],
    diagnosis: {
      placeholder: "Example: There is a direct short path bypassing the load.",
      acceptedAnswers: [
        "short circuit",
        "direct short",
        "battery short",
        "short path",
        "shorted circuit",
      ],
      keywordGroups: [
        ["short", "circuit"],
        ["direct", "short"],
      ],
    },
    success: { kind: "has-flow-no-short" },
  },
  {
    id: "ts_led_polarity",
    title: "Troubleshoot: Reversed LED",
    prompt:
      "The circuit is wired, but polarity is wrong and current won’t pass the LED. Fix the orientation/wiring so current can flow.",
    preset: "troubleshoot_led_reverse",
    diagram: "reversedLedRect",
    hints: [
      "Try swapping which side of the LED is connected toward the battery positive terminal.",
      "If you still see a polarity mismatch, reverse the LED connections.",
    ],
    diagnosis: {
      placeholder: "Example: LED polarity is reversed.",
      acceptedAnswers: [
        "reversed led",
        "led reversed",
        "led backwards",
        "wrong led polarity",
        "polarity mismatch",
      ],
      keywordGroups: [
        ["led", "reversed"],
        ["led", "backwards"],
        ["polarity", "mismatch"],
      ],
    },
    success: { kind: "has-flow" },
  },
];

export default troubleshootingProblems;

