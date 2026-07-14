export type TroubleshootingProblem = {
  id: string;
  title: string;
  prompt: string;
  preset: string;
  diagram:
    | "switchOpenRect"
    | "missingWireRect"
    | "shortCircuitRect"
    | "reversedLedRect"
    | "parallelOpenBranch"
    | "comboOpenBranch";
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
      "When the switch is closed, the circuit should allow current to flow.",
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
    title: "Troubleshoot: Open Circuit",
    prompt:
      "The schematic looks almost right, but the circuit is open. Add the missing connection to restore current flow.",
    preset: "troubleshoot_missing_wire",
    diagram: "missingWireRect",
    hints: [
      "A series circuit needs a complete path from battery + back to battery -.",
      "Look for a missing return connection near the battery.",
    ],
    diagnosis: {
      placeholder: "Example: The return wire is missing and the circuit is open.",
      acceptedAnswers: [
        "missing wire",
        "open circuit",
        "broken circuit",
        "missing connection",
        "missing return path",
      ],
      keywordGroups: [
        ["missing", "wire"],
        ["broken", "circuit"],
        ["open", "circuit"],
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
  {
    id: "ts_parallel_open_branch",
    title: "Troubleshoot: Parallel Open Branch",
    prompt:
      "This parallel circuit has two branches (R1 and R2) across a shared voltage source. Current flows only through R1 — R2's branch is open and carries no current. Locate the broken connection and complete R2's branch so both paths carry current.",
    preset: "troubleshoot_parallel_open",
    diagram: "parallelOpenBranch",
    hints: [
      "In a parallel circuit each branch has its own independent path from + to −.",
      "R1 works, so the top rail and battery are fine. Focus on R2's bottom return connection.",
      "A complete parallel branch needs a wire from the resistor all the way back to the − terminal.",
    ],
    diagnosis: {
      placeholder: "Example: R2 branch is open — the return wire is missing.",
      acceptedAnswers: [
        "open branch",
        "open r2 branch",
        "r2 open",
        "missing branch wire",
        "broken branch",
        "open parallel branch",
      ],
      keywordGroups: [
        ["open", "branch"],
        ["r2", "open"],
        ["missing", "wire"],
      ],
    },
    success: { kind: "has-flow" },
  },
  {
    id: "ts_combo_open_branch",
    title: "Troubleshoot: Combination Circuit — Open Parallel Branch",
    prompt:
      "This combination circuit has R1 in series followed by a parallel section (R2 ∥ R3). R3's branch is open — its return path is disconnected. The circuit still passes current through R2, but the total current is lower than expected and R3 dissipates no power. Identify the fault and restore the missing connection.",
    preset: "troubleshoot_combo_open",
    diagram: "comboOpenBranch",
    hints: [
      "Simplify: collapse the parallel section first. R2 carries current, R3 does not — one branch is open.",
      "In a combination circuit, check each parallel branch independently before looking at the series elements.",
      "Restore R3's bottom return wire to complete both parallel paths, then re-solve using the W.I.R.E. method.",
    ],
    diagnosis: {
      placeholder: "Example: R3 branch is open — the parallel return path is disconnected.",
      acceptedAnswers: [
        "open r3 branch",
        "r3 open",
        "r3 disconnected",
        "open parallel branch",
        "missing r3 return",
        "broken r3 branch",
      ],
      keywordGroups: [
        ["r3", "open"],
        ["r3", "disconnected"],
        ["open", "branch"],
        ["parallel", "open"],
      ],
    },
    success: { kind: "has-flow" },
  },
];

export default troubleshootingProblems;

