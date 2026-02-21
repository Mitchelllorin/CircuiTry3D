import troubleshootingProblems, {
  isTroubleshootingDiagnosisCorrect,
} from "../src/data/troubleshootingProblems";

const getProblem = (id: string) => {
  const problem = troubleshootingProblems.find((candidate) => candidate.id === id);
  if (!problem) {
    throw new Error(`Missing troubleshooting problem for id "${id}"`);
  }
  return problem;
};

describe("isTroubleshootingDiagnosisCorrect", () => {
  it("accepts open-switch diagnoses with varied phrasing", () => {
    const problem = getProblem("ts_switch_off");
    expect(
      isTroubleshootingDiagnosisCorrect(problem, "I think SW1 is still OPEN."),
    ).toBe(true);
  });

  it("accepts missing-wire diagnoses", () => {
    const problem = getProblem("ts_missing_wire");
    expect(
      isTroubleshootingDiagnosisCorrect(problem, "The loop has a missing wire return path."),
    ).toBe(true);
  });

  it("accepts short-circuit diagnoses", () => {
    const problem = getProblem("ts_short_circuit");
    expect(isTroubleshootingDiagnosisCorrect(problem, "This has a direct short.")).toBe(
      true,
    );
  });

  it("accepts reversed-led polarity diagnoses", () => {
    const problem = getProblem("ts_led_polarity");
    expect(
      isTroubleshootingDiagnosisCorrect(problem, "LED polarity mismatch - the LED is reversed."),
    ).toBe(true);
  });

  it("rejects unrelated diagnoses", () => {
    const problem = getProblem("ts_short_circuit");
    expect(
      isTroubleshootingDiagnosisCorrect(problem, "The battery voltage is just too low."),
    ).toBe(false);
  });
});
