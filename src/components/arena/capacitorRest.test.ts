import { describe, expect, it } from "vitest";
import { buildArenaAgents } from "./arenaData";
import { DEFAULT_SCENARIO } from "./scenarios";
import { evaluateStress } from "./stressTest";

/**
 * QC, 9 Nov: "The capacitor fails at 1.00x rated load (peaks 162 °C, 683 % of
 * rating). It is broken before the ramp moves."
 *
 * The cause was arithmetic, not data. A capacitor blocks DC, so the bench's
 * V × I operating power (16 V × 0.4 A = 6.4 W) is the energy it is HOLDING, not
 * heat it is making, and it was being compared against a 0.5 W power rating the
 * part does not have. 6.4 W into a 40 °C/W junction is 256 °C of self-heating on
 * a part sitting at 25 °C ambient.
 *
 * So the bench now models a capacitor's loss the way one actually fails — ESR ×
 * ripple², which is near zero without a declared ESR — and rates it on the one
 * number a capacitor really has, its volts. These tests hold both halves, in
 * the numbers a capacitor is sold by: a 470 µF 25 V can on a 16 V bench.
 */

function capacitor() {
  const [agent] = buildArenaAgents(
    [
      {
        id: "qc-470uf",
        name: "470 µF · 25 V capacitor",
        type: "capacitor",
        componentNumber: "C1",
        properties: {
          capacitance: 0.00047,
          voltage: 16,
          current: 0.4,
          maxVoltage: 25,
        },
      },
    ],
    null,
  );
  return agent;
}

describe("a capacitor at rest on the ramp", () => {
  it("is intact and cold at 1.00x rated load", () => {
    const agent = capacitor();
    const outcome = evaluateStress(agent, 1, 1, DEFAULT_SCENARIO);

    expect(outcome.phase).toBe("nominal");
    expect(outcome.failed).toBe(false);
    // Cold means cold: a part that has not been driven is at ambient, not 162 °C.
    expect(outcome.tempC).toBeLessThan(DEFAULT_SCENARIO.ambientC + 2);
    expect(agent.peakTempC).toBeLessThan(DEFAULT_SCENARIO.ambientC + 2);
  });

  it("does not bill it for V x I as dissipation", () => {
    const agent = capacitor();

    // 16 V x 0.4 A would be 6.4 W — several times the part's entire rating.
    expect(agent.metrics.power).toBeLessThan(0.05);
    expect(agent.ratings.powerRating).toBeGreaterThan(0);
    expect((agent.metrics.power / agent.ratings.powerRating) * 100).toBeLessThan(10);
  });

  it("is measured against its rated volts, the rating it actually has", () => {
    const agent = capacitor();
    const outcome = evaluateStress(agent, 1, 1, DEFAULT_SCENARIO);

    // 16 V of 25 V is 64 % of the way to its limit — not 683 %, and not 0 %.
    expect(outcome.loadPercent).toBeCloseTo(64, 0);
  });

  it("still dies when the ramp takes it past those volts", () => {
    const agent = capacitor();
    const outcome = evaluateStress(agent, 2, 1, DEFAULT_SCENARIO);

    expect(outcome.failed).toBe(true);
    expect(outcome.failureName ?? "").toMatch(/breakdown|overvoltage/i);
  });
});
