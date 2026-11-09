import { describe, expect, it } from "vitest";
import {
  breakingLoadFor,
  formatPartTemp,
  gaugeFor,
  limitLabelFor,
  limitSourceFor,
  presetsFor,
  safeLoadUnder,
  stressBandFor,
} from "./breakIt";
import { DEFAULT_SCENARIO } from "./scenarios";
import { evaluateStress, overdriveCeiling } from "./stressTest";
import type { ArenaBattleAgent } from "./types";

function makeAgent(overrides: Partial<ArenaBattleAgent> = {}): ArenaBattleAgent {
  return {
    id: "fuse-1",
    name: "F1 · 0.25A",
    manufacturer: "Littelfuse",
    partNumber: "0218.250MXP",
    componentNumber: "F1",
    componentType: "fuse",
    renderType: "fuse",
    family: "fuse",
    stressSignature: "overload",
    accent: "#ff8844",
    spawnAngle: 0,
    metrics: { voltage: 0.5, current: 0.05, resistance: 10, power: 0.025 },
    properties: { manufacturer: "Littelfuse", partNumber: "0218.250MXP" },
    ratings: {
      powerRating: 0.25,
      maxCurrent: 0.25,
      maxVoltage: 250,
      junctionLimitC: 155,
      absoluteMaxTempC: 200,
      thermalResistanceCPerW: 200,
    },
    ratedThresholds: { maxPowerW: 0.25, maxTempC: 155, maxCurrentA: 0.25 },
    integrity: 100,
    maxIntegrity: 100,
    severity: 0,
    tempC: 25,
    loadPercent: 0,
    phase: "nominal",
    failureName: null,
    failureVisual: null,
    failureDescription: null,
    failureFamily: null,
    peakTempC: 25,
    peakLoadPercent: 0,
    energyJ: 0,
    survivedLoad: 1,
    failedAtMs: null,
    failedAtLoad: null,
    score: 0,
    rank: 0,
    ...overrides,
  };
}

describe("Break It bands", () => {
  it("moves safe → stressed → warning → critical → failed without gaps", () => {
    expect(stressBandFor(0, "nominal")).toBe("safe");
    expect(stressBandFor(0.5, "stressed")).toBe("stressed");
    expect(stressBandFor(0.9, "stressed")).toBe("warning");
    expect(stressBandFor(1.3, "critical")).toBe("critical");
    expect(stressBandFor(2, "failed")).toBe("failed");
    // A part that has failed stays failed however cool the model says it is.
    expect(stressBandFor(0, "failed")).toBe("failed");
  });
});

describe("limit provenance", () => {
  it("credits a branded part with imported thresholds to its maker", () => {
    expect(limitSourceFor(makeAgent())).toBe("maker");
    expect(limitLabelFor(makeAgent())).toContain("maker's");
  });

  it("does not credit a part with a name but no sheet behind it", () => {
    const anonymous = makeAgent({
      manufacturer: null,
      partNumber: null,
      componentNumber: null,
      ratedThresholds: undefined,
    });
    expect(limitSourceFor(anonymous)).toBe("app");
    expect(limitLabelFor(anonymous)).toContain("app's model");
  });
});

describe("Break It presets", () => {
  it("finds the load that destroys the part, and a load just under it that holds", () => {
    const agent = makeAgent();
    const breaking = breakingLoadFor(agent);
    expect(breaking).not.toBeNull();
    expect(evaluateStress(agent, breaking!, 1, DEFAULT_SCENARIO).phase).toBe("failed");

    const safe = safeLoadUnder(agent, breaking!);
    expect(safe).not.toBeNull();
    expect(safe!).toBeLessThan(breaking!);
    expect(evaluateStress(agent, safe!, 1, DEFAULT_SCENARIO).phase).not.toBe("failed");
  });

  it("admits when a part is already past its limit at rated load", () => {
    const overrated = makeAgent({
      metrics: { voltage: 5, current: 0.25, resistance: 20, power: 1.25 },
    });
    const breaking = breakingLoadFor(overrated)!;
    expect(breaking).toBeLessThanOrEqual(1);
    expect(safeLoadUnder(overrated, breaking)).toBeNull();
  });

  it("has no preset for a part that survives the whole overdrive ramp", () => {
    const indestructible = makeAgent({
      ratings: {
        powerRating: 1000,
        maxCurrent: Infinity,
        maxVoltage: Infinity,
        junctionLimitC: 3000,
        absoluteMaxTempC: 3000,
        thermalResistanceCPerW: 0,
      },
      ratedThresholds: { maxPowerW: 1000, maxTempC: 3000 },
      metrics: { voltage: 1, current: 0.001, resistance: 1000, power: 0.001 },
    });
    expect(breakingLoadFor(indestructible)).toBeNull();
    expect(presetsFor([indestructible])).toHaveLength(0);
  });

  it("puts branded parts first without putting a maker's name on the button", () => {
    const generic = makeAgent({
      id: "res-1",
      name: "R1 · 100Ω",
      manufacturer: null,
      partNumber: null,
      componentNumber: "R1",
      componentType: "resistor",
      family: "resistor",
      ratedThresholds: undefined,
      metrics: { voltage: 5, current: 0.05, resistance: 100, power: 0.25 },
      ratings: {
        powerRating: 0.25,
        maxCurrent: Infinity,
        maxVoltage: 200,
        junctionLimitC: 155,
        absoluteMaxTempC: 200,
        thermalResistanceCPerW: 300,
      },
    });

    const presets = presetsFor([generic, makeAgent()]);
    expect(presets).toHaveLength(2);
    // The branded part leads — it is the checkable claim — but the caption says
    // what happens, because we have no permission to put the maker on it.
    expect(presets[0].limitSource).toBe("maker");
    expect(presets[0].label).toBe("Overload the fuse");
    expect(presets[0].label).not.toContain("Littelfuse");
    expect(presets[0].label).not.toContain("0218");
    expect(presets[1].limitSource).toBe("app");
    expect(presets[1].label).toBe("Burn the resistor");
  });

  it("gives every preset a failure and a hold, so the button is not a bluff", () => {
    const presets = presetsFor([makeAgent()]);
    for (const preset of presets) {
      const agent = makeAgent();
      const at = evaluateStress(agent, preset.loadFactor, 1, DEFAULT_SCENARIO);
      expect(at.phase).toBe("failed");
      if (preset.safeFactor != null) {
        const under = evaluateStress(agent, preset.safeFactor, 1, DEFAULT_SCENARIO);
        expect(under.phase).not.toBe("failed");
      }
      expect(preset.failureName.length).toBeGreaterThan(0);
    }
  });
});

describe("Break It gauges", () => {
  it("marks the limit with its owner and stops at the ramp ceiling", () => {
    const gauge = gaugeFor(makeAgent(), 2, DEFAULT_SCENARIO)!;
    expect(gauge.factor).toBe(2);
    expect(gauge.limitC).toBe(155);
    expect(gauge.limitLabel).toContain("maker's");
    expect(overdriveCeiling(DEFAULT_SCENARIO)).toBeGreaterThan(2);
  });
});

describe("failure readouts and run history", () => {
  it("reads a failed part as FAILED at its peak, never as a cold 25 °C", () => {
    const failed = makeAgent({ phase: "failed", tempC: 25, peakTempC: 412 });
    const label = formatPartTemp(failed);
    expect(label).toContain("FAILED");
    expect(label).toContain("412");
    expect(label).not.toContain("25");
    // A live part still reports its own temperature.
    expect(formatPartTemp(makeAgent({ tempC: 88 }))).toBe("88°C");
  });

});
