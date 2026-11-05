import { describe, expect, it } from "vitest";

import {
  AMBIENT_FALLBACK_C,
  DEFAULT_THETA_JA_C_PER_W,
  computeComponentThermal,
  effectiveThetaCPerW,
  settledFraction,
  steadyJunctionC,
  summariseCircuitThermal,
} from "./thermal";

describe("effectiveThetaCPerW", () => {
  it("uses the declared θ_JA when there is no heatsink", () => {
    expect(effectiveThetaCPerW(35)).toBe(35);
  });

  it("falls back to the 60 °C/W default when nothing is declared", () => {
    expect(effectiveThetaCPerW(undefined)).toBe(DEFAULT_THETA_JA_C_PER_W);
  });

  it("combines a heatsink in parallel, which must be lower than either path", () => {
    const theta = effectiveThetaCPerW(60, 20);
    expect(theta).toBeCloseTo(15, 10);
    expect(theta).toBeLessThan(20);
    expect(theta).toBeLessThan(60);
  });

  it("never returns a negative resistance for a negative declaration", () => {
    expect(effectiveThetaCPerW(-40)).toBe(0);
  });
});

describe("steadyJunctionC", () => {
  it("is the ambient at zero dissipation", () => {
    expect(steadyJunctionC({ ambientC: 25, powerW: 0, thetaCPerW: 60 }).junctionC).toBe(25);
  });

  it("is T_amb + P·θ without a temperature coefficient", () => {
    const result = steadyJunctionC({ ambientC: 25, powerW: 1, thetaCPerW: 60 });
    expect(result.junctionC).toBeCloseTo(85, 10);
    expect(result.resistanceRatio).toBeNull();
    expect(result.thermalRunaway).toBe(false);
  });

  it("solves the implicit α equation rather than the uncorrected rise", () => {
    // I²R₂₅ = 1 A² × 100 Ω = 100 W; θ = 0.1 °C/W; α = 0.004/°C.
    // T = (25 + 0.1·100·(1 − 0.1)) / (1 − 0.1·100·0.004) = 34 / 0.96
    const result = steadyJunctionC({
      ambientC: 25,
      powerW: 100,
      thetaCPerW: 0.1,
      alphaPerC: 0.004,
      referenceResistanceOhm: 100,
      currentA: 1,
    });
    expect(result.junctionC).toBeCloseTo(34 / 0.96, 10);
    // Uncorrected would be 25 + 10 = 35 °C. The coefficient pushes it *up*: R at
    // the solved temperature is 90 Ω × 1.0417, so the part is making more heat
    // than the 25 °C resistance predicted.
    expect(result.junctionC).toBeGreaterThan(35);
    expect(result.resistanceRatio).toBeCloseTo(1 + 0.004 * (34 / 0.96 - 25), 10);
  });

  it("reports thermal runaway when the coefficient outruns the heatsink", () => {
    const result = steadyJunctionC({
      ambientC: 25,
      powerW: 100,
      thetaCPerW: 1,
      alphaPerC: 0.05,
      referenceResistanceOhm: 100,
      currentA: 1,
    });
    expect(result.thermalRunaway).toBe(true);
  });
});

describe("settledFraction", () => {
  it("is 1 at steady state", () => {
    expect(settledFraction(undefined, 5)).toBe(1);
  });

  it("reaches 63.2% after one time constant", () => {
    expect(settledFraction(5, 5)).toBeCloseTo(1 - Math.exp(-1), 10);
  });

  it("is 0 before any current has flowed", () => {
    expect(settledFraction(0, 5)).toBe(0);
  });

  it("is 1 when the part declares no time constant", () => {
    expect(settledFraction(0.1, undefined)).toBe(1);
  });
});

describe("computeComponentThermal", () => {
  it("puts an idle part exactly at ambient", () => {
    const row = computeComponentThermal({ id: "r1", label: "R1", powerW: 0, ambientC: 25 });
    expect(row.junctionC).toBe(25);
    expect(row.riseC).toBe(0);
    expect(row.status).toBe("ok");
  });

  it("uses the default ambient when none is given", () => {
    const row = computeComponentThermal({ id: "r1", powerW: 0 });
    expect(row.ambientC).toBe(AMBIENT_FALLBACK_C);
  });

  it("computes headroom and derated power from the part's own limit", () => {
    const row = computeComponentThermal({
      id: "r1",
      powerW: 1,
      thetaCPerW: 60,
      ambientC: 25,
      limitC: 155,
    });
    expect(row.junctionC).toBeCloseTo(85, 10);
    expect(row.headroomC).toBeCloseTo(70, 10);
    expect(row.utilisation).toBeCloseTo(60 / 130, 10);
    expect(row.deratedPowerW).toBeCloseTo(130 / 60, 10);
    expect(row.status).toBe("ok");
  });

  it("warns at 75% of the available headroom and trips over the limit", () => {
    const warm = computeComponentThermal({
      id: "r1", powerW: 2, thetaCPerW: 60, ambientC: 25, limitC: 155,
    });
    expect(warm.junctionC).toBeCloseTo(145, 10);
    expect(warm.status).toBe("warn");

    const over = computeComponentThermal({
      id: "r1", powerW: 2.5, thetaCPerW: 60, ambientC: 25, limitC: 155,
    });
    expect(over.status).toBe("over");
    expect(over.headroomC).toBeLessThan(0);
  });

  it("applies the heatsink to the rise", () => {
    const bare = computeComponentThermal({ id: "q1", powerW: 2, thetaCPerW: 60, ambientC: 25 });
    const cooled = computeComponentThermal({
      id: "q1", powerW: 2, thetaCPerW: 60, heatsinkThetaCPerW: 20, ambientC: 25,
    });
    expect(bare.junctionC).toBeCloseTo(145, 10);
    expect(cooled.junctionC).toBeCloseTo(55, 10);
  });

  it("only reaches part of its steady rise while warming up", () => {
    const warming = computeComponentThermal({
      id: "r1", powerW: 1, thetaCPerW: 60, ambientC: 25, thermalTimeConstantS: 5, secondsEnergised: 5,
    });
    expect(warming.settledRiseC).toBeCloseTo(60, 10);
    expect(warming.riseC).toBeCloseTo(60 * (1 - Math.exp(-1)), 10);
    expect(warming.junctionC).toBeLessThan(warming.settledJunctionC);
  });
});

describe("summariseCircuitThermal", () => {
  const rows = [
    computeComponentThermal({ id: "r1", label: "R1", powerW: 1, thetaCPerW: 60, ambientC: 25, limitC: 155 }),
    computeComponentThermal({ id: "l1", label: "L1", powerW: 0.2, thetaCPerW: 120, ambientC: 25, limitC: 125 }),
    computeComponentThermal({ id: "sw1", label: "SW1", powerW: 0, thetaCPerW: 40, ambientC: 25, limitC: 125 }),
  ];

  it("adds the dissipation up", () => {
    expect(summariseCircuitThermal(rows).totalPowerW).toBeCloseTo(1.2, 10);
  });

  it("reports the effective θ as the power-weighted resistance", () => {
    const summary = summariseCircuitThermal(rows);
    expect(summary.weightedThetaCPerW).toBeCloseTo((1 * 60 + 0.2 * 120) / 1.2, 10);
  });

  it("names the hottest part, which is the one that fails first", () => {
    const summary = summariseCircuitThermal(rows);
    // R1 is at 85 °C, L1 at 49 °C — hotter, not more stressed, is the question
    // this figure answers; stress is what `status` and headroom carry.
    expect(summary.hottest?.id).toBe("r1");
    expect(summary.maxJunctionC).toBeCloseTo(85, 10);
    expect(summary.meanJunctionC).toBeCloseTo((1 * 85 + 0.2 * 49) / 1.2, 10);
  });

  it("carries the worst state up to the circuit", () => {
    const hot = computeComponentThermal({
      id: "r9", powerW: 3, thetaCPerW: 60, ambientC: 25, limitC: 100,
    });
    const summary = summariseCircuitThermal([...rows, hot]);
    expect(summary.overCount).toBe(1);
    expect(summary.status).toBe("over");
    expect(summary.minHeadroomC).toBeLessThan(0);
  });

  it("falls back to ambient on an empty board", () => {
    const summary = summariseCircuitThermal([], 30);
    expect(summary.totalPowerW).toBe(0);
    expect(summary.weightedThetaCPerW).toBeNull();
    expect(summary.hottest).toBeNull();
    expect(summary.maxJunctionC).toBe(30);
    expect(summary.status).toBe("ok");
  });
});
