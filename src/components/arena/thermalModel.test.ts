import { describe, expect, it } from "vitest";
import {
  REFERENCE_C,
  deratedPowerW,
  deratingFraction,
  resistanceAt,
  selfHeatingRiseC,
  tempCoefficientPpm,
  thermalReportFor,
} from "./thermalModel";
import { ARENA_SCENARIOS } from "./scenarios";
import type { ArenaBattleAgent } from "./types";

function agent(overrides: Partial<ArenaBattleAgent> = {}): ArenaBattleAgent {
  return {
    id: "a1",
    name: "R1 100 Ω",
    componentType: "resistor",
    renderType: "resistor",
    family: "resistor",
    stressSignature: "thermal",
    accent: "#38bdf8",
    spawnAngle: 0,
    metrics: { voltage: 5, current: 0.05, resistance: 100, power: 0.25 },
    properties: {},
    ratings: {
      powerRating: 0.25,
      maxCurrent: 1,
      maxVoltage: 250,
      junctionLimitC: 155,
      absoluteMaxTempC: 200,
      thermalResistanceCPerW: 120,
    },
    integrity: 100,
    maxIntegrity: 100,
    severity: 0,
    tempC: REFERENCE_C,
    loadPercent: 100,
    phase: "nominal",
    failureName: null,
    failureVisual: null,
    failureDescription: null,
    failureFamily: null,
    peakTempC: REFERENCE_C,
    peakLoadPercent: 100,
    energyJ: 0,
    survivedLoad: 1,
    failedAtMs: null,
    failedAtLoad: null,
    score: 0,
    rank: 0,
    ...overrides,
  };
}

describe("derating", () => {
  it("leaves the rating alone at 25 °C", () => {
    expect(deratingFraction(REFERENCE_C, 155)).toBeCloseTo(1, 6);
    expect(deratedPowerW(0.25, REFERENCE_C, 155)).toBeCloseTo(0.25, 6);
  });

  it("derates linearly to zero at the junction limit", () => {
    // Halfway between 25 and 155 is 90 °C.
    expect(deratingFraction(90, 155)).toBeCloseTo(0.5, 6);
    expect(deratedPowerW(0.25, 90, 155)).toBeCloseTo(0.125, 6);
    expect(deratingFraction(155, 155)).toBe(0);
  });

  it("does not go negative above the limit", () => {
    expect(deratingFraction(200, 155)).toBe(0);
    expect(deratedPowerW(0.25, 200, 155)).toBe(0);
  });

  it("treats a missing temperature span as no derating", () => {
    expect(deratingFraction(90, 25)).toBe(1);
  });
});

describe("temperature coefficient", () => {
  it("reports copper for an inductor and nothing for a MOSFET", () => {
    expect(tempCoefficientPpm("inductor")).toBe(3930);
    expect(tempCoefficientPpm("mosfet")).toBeNull();
  });

  it("prefers a declared coefficient over the family default", () => {
    expect(tempCoefficientPpm("resistor", { tempCoefficientPpm: -200 })).toBe(-200);
  });

  it("moves resistance by alpha x delta T", () => {
    // 1000 Ω of copper at 125 °C is 1000 x (1 + 0.00393 x 100) = 1393 Ω.
    expect(resistanceAt(1000, 3930, 125)).toBeCloseTo(1393, 1);
    // 100 Ω metal film, +100 ppm, 25 °C warmer = +0.25 Ω.
    expect(resistanceAt(100, 100, 50)).toBeCloseTo(100.25, 3);
  });

  it("leaves resistance alone when the family has no coefficient", () => {
    expect(resistanceAt(47, null, 140)).toBe(47);
  });
});

describe("self heating", () => {
  it("is power times thermal resistance", () => {
    expect(selfHeatingRiseC(0.5, 120)).toBeCloseTo(60, 6);
  });
});

describe("thermalReportFor", () => {
  it("compares actual power against the DERATED rating, not the nameplate", () => {
    const bench = ARENA_SCENARIOS.find((s) => s.id === "desert")!;
    const report = thermalReportFor(agent(), bench, 1)!;
    expect(report.ratedW).toBeCloseTo(0.25, 6);
    // 55 °C ambient on a 155 °C limit leaves (155-55)/130 of the rating.
    expect(report.deratedW).toBeCloseTo(0.25 * (100 / 130), 6);
    expect(report.utilisationPct).toBeCloseTo(130, 4);
    expect(report.state).toBe("over");
  });

  it("is comfortable at reference conditions", () => {
    const bench = ARENA_SCENARIOS[0];
    const report = thermalReportFor(agent({ metrics: { voltage: 5, current: 0.02, resistance: 250, power: 0.1 } }), bench, 1)!;
    expect(report.utilisationPct).toBeCloseTo(40, 4);
    expect(report.marginC).toBeCloseTo(130, 6);
    expect(report.state).toBe("ok");
  });

  it("scales with the square of the load multiple", () => {
    const bench = ARENA_SCENARIOS[0];
    const report = thermalReportFor(agent(), bench, 2)!;
    expect(report.actualW).toBeCloseTo(1, 6);
  });

  it("derates to a declared maximum ambient rather than the junction limit", () => {
    const bench = ARENA_SCENARIOS[0];
    const part = agent({ properties: { maxAmbientC: 70 } });
    const report = thermalReportFor(part, bench, 1)!;
    expect(report.deratingCeilingC).toBe(70);
    expect(report.deratingBasis).toBe("ambient");
    // At 25 °C it is still fully rated: the curve starts at the reference.
    expect(report.deratedW).toBeCloseTo(0.25, 6);
  });

  it("clamps a declared maximum ambient to the junction limit", () => {
    const bench = ARENA_SCENARIOS[0];
    const report = thermalReportFor(agent({ properties: { maxAmbientC: 400 } }), bench, 1)!;
    expect(report.deratingCeilingC).toBe(155);
    expect(report.deratingBasis).toBe("junction");
  });

  it("reports over the limit once the junction is past it", () => {
    const bench = ARENA_SCENARIOS[0];
    const report = thermalReportFor(agent({ tempC: 170 }), bench, 0)!;
    expect(report.marginC).toBeCloseTo(-15, 6);
    expect(report.state).toBe("over");
  });
});
