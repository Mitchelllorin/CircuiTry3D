import { describe, it, expect, beforeAll } from "vitest";
import type { FailureEngineExport } from "./failure-engine.types";

// Load the shared failure engine (it exports to module.exports in CJS mode)
const FailureEngine = (await import("../public/js/component-failure-engine.js")) as unknown as FailureEngineExport;

const {
  resolveComponentFamily,
  detectFailure,
  registerComponentType,
  registerFailureProfile,
  COMPONENT_PROFILES,
  COMPONENT_FAILURE_PROFILES,
  COMPONENT_FAMILY_MAP,
} = FailureEngine;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function safeMetrics(overrides: Record<string, number> = {}) {
  return {
    powerDissipation: 0,
    currentRms: 0,
    operatingVoltage: 0,
    thermalRise: 0,
    impedance: 0,
    storedEnergy: 0,
    energyDelivered: 0,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// resolveComponentFamily
// ────────────────────────────────────────────────────────────────────────────

describe("resolveComponentFamily — exact matches", () => {
  it("resolves known profile keys directly", () => {
    expect(resolveComponentFamily("resistor")).toBe("resistor");
    expect(resolveComponentFamily("capacitor")).toBe("capacitor");
    expect(resolveComponentFamily("mosfet")).toBe("mosfet");
    expect(resolveComponentFamily("bjt")).toBe("bjt");
    expect(resolveComponentFamily("diode")).toBe("diode");
    expect(resolveComponentFamily("opamp")).toBe("opamp");
    expect(resolveComponentFamily("ic")).toBe("ic");
    expect(resolveComponentFamily("relay")).toBe("relay");
    expect(resolveComponentFamily("fuse")).toBe("fuse");
    expect(resolveComponentFamily("lamp")).toBe("lamp");
    expect(resolveComponentFamily("motor")).toBe("motor");
    expect(resolveComponentFamily("thermistor")).toBe("thermistor");
    expect(resolveComponentFamily("generic")).toBe("generic");
  });

  it("resolves family-map aliases", () => {
    expect(resolveComponentFamily("bjt-npn")).toBe("bjt");
    expect(resolveComponentFamily("bjt-pnp")).toBe("bjt");
    expect(resolveComponentFamily("zener-diode")).toBe("zener_diode");
    expect(resolveComponentFamily("op-amp")).toBe("opamp");
    expect(resolveComponentFamily("voltage-regulator")).toBe("voltage_regulator");
    expect(resolveComponentFamily("voltage_regulator")).toBe("voltage_regulator");
  });

  it("resolves case-insensitive", () => {
    expect(resolveComponentFamily("RESISTOR")).toBe("resistor");
    expect(resolveComponentFamily("Mosfet")).toBe("mosfet");
  });
});

describe("resolveComponentFamily — branded part numbers", () => {
  it("resolves IRF840 → mosfet (starts with 'irf')", () => {
    expect(resolveComponentFamily("irf840")).toBe("mosfet");
  });

  it("resolves 2N2222 → bjt (starts with '2n')", () => {
    expect(resolveComponentFamily("2n2222")).toBe("bjt");
  });

  it("resolves BC547 → bjt (starts with 'bc')", () => {
    expect(resolveComponentFamily("bc547")).toBe("bjt");
  });

  it("resolves LM741 → opamp (exact match in map)", () => {
    expect(resolveComponentFamily("lm741")).toBe("opamp");
  });

  it("resolves LM7805 → voltage_regulator (exact match in map)", () => {
    expect(resolveComponentFamily("lm7805")).toBe("voltage_regulator");
  });

  it("resolves NE555 → ic (exact match in map)", () => {
    expect(resolveComponentFamily("ne555")).toBe("ic");
  });

  it("resolves ATmega328 → ic (starts with 'atmega')", () => {
    expect(resolveComponentFamily("atmega328")).toBe("ic");
  });

  it("resolves 1N4007 → diode via property heuristic if not in map", () => {
    // "1n" is not in the map, so property heuristic should fire
    const result = resolveComponentFamily("1n4007", { forwardVoltage: 0.7 });
    expect(result).toBe("diode");
  });
});

describe("resolveComponentFamily — property heuristic", () => {
  it("resolves via inductance property", () => {
    expect(resolveComponentFamily("unknown-coil", { inductance: 0.001 })).toBe("inductor");
  });

  it("resolves via capacitance property", () => {
    expect(resolveComponentFamily("my-cap", { capacitance: 1e-6 })).toBe("capacitor");
  });

  it("resolves via rds_on property → mosfet", () => {
    // Use a type with no keyword match so the property heuristic fires
    expect(resolveComponentFamily("high-speed-driver", { rds_on: 0.05 })).toBe("mosfet");
  });

  it("resolves via hfe property → bjt", () => {
    expect(resolveComponentFamily("transistor-x", { hfe: 150 })).toBe("bjt");
  });

  it("resolves via coilVoltage → relay", () => {
    expect(resolveComponentFamily("solid-state-relay", { coilVoltage: 5 })).toBe("relay");
  });

  it("resolves via turnsRatio → transformer", () => {
    expect(resolveComponentFamily("power-xfmr", { turnsRatio: 10 })).toBe("transformer");
  });

  it("falls back to generic for truly unknown types", () => {
    expect(resolveComponentFamily("photonic-synth-device")).toBe("generic");
    expect(resolveComponentFamily("")).toBe("generic");
    // @ts-expect-error intentional bad input
    expect(resolveComponentFamily(null)).toBe("generic");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT_PROFILES
// ────────────────────────────────────────────────────────────────────────────

describe("COMPONENT_PROFILES", () => {
  it("contains all expected families", () => {
    const required = ["battery","resistor","led","switch","capacitor","inductor",
                      "mosfet","heatsink","bjt","diode","zener_diode","opamp",
                      "voltage_regulator","ic","relay","fuse","lamp","motor",
                      "thermistor","transformer","crystal","generic"];
    for (const fam of required) {
      expect(COMPONENT_PROFILES[fam], `Missing profile for ${fam}`).toBeDefined();
      expect(COMPONENT_PROFILES[fam].defaultProperties).toBeDefined();
    }
  });

  it("bjt has required electrical properties", () => {
    const p = COMPONENT_PROFILES.bjt.defaultProperties;
    expect(typeof p.vce_max).toBe("number");
    expect(typeof p.ic_max).toBe("number");
    expect(typeof p.hfe).toBe("number");
    expect(typeof p.thermalResistance).toBe("number");
  });

  it("diode has required properties", () => {
    const p = COMPONENT_PROFILES.diode.defaultProperties;
    expect(typeof p.forwardVoltage).toBe("number");
    expect(typeof p.maxCurrent).toBe("number");
    expect(typeof p.reverseVoltage).toBe("number");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT_FAILURE_PROFILES — structural checks
// ────────────────────────────────────────────────────────────────────────────

describe("COMPONENT_FAILURE_PROFILES", () => {
  it("every profile has at least one mode", () => {
    for (const [type, profile] of Object.entries(COMPONENT_FAILURE_PROFILES)) {
      expect(Object.keys(profile.modes).length, `${type} has no modes`).toBeGreaterThan(0);
    }
  });

  it("every mode has required fields", () => {
    for (const [type, profile] of Object.entries(COMPONENT_FAILURE_PROFILES)) {
      for (const [mode, data] of Object.entries(profile.modes as Record<string, any>)) {
        expect(data.name, `${type}.${mode} missing name`).toBeTruthy();
        expect(data.visual, `${type}.${mode} missing visual`).toBeTruthy();
        expect(data.physicalDescription, `${type}.${mode} missing physicalDescription`).toBeTruthy();
        expect(typeof data.trigger, `${type}.${mode} trigger not function`).toBe("function");
        expect(typeof data.severity, `${type}.${mode} severity not function`).toBe("function");
      }
    }
  });

  it("generic profile exists as universal fallback", () => {
    expect(COMPONENT_FAILURE_PROFILES.generic).toBeDefined();
    expect(COMPONENT_FAILURE_PROFILES.generic.modes.overtemp).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// detectFailure — no failure cases
// ────────────────────────────────────────────────────────────────────────────

describe("detectFailure — no failure (safe operating conditions)", () => {
  it("returns failed=false for a safe resistor", () => {
    const comp = { id: "r1", type: "resistor", properties: { resistance: 100, powerRating: 0.25 } };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 0.1 }));
    expect(result.failed).toBe(false);
    expect(result.severity).toBe(0);
  });

  it("returns failed=false for a safe MOSFET", () => {
    const comp = { id: "q1", type: "mosfet", properties: { id_max: 33, vds_max: 100 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 5, operatingVoltage: 12 }));
    expect(result.failed).toBe(false);
  });

  it("handles null component gracefully", () => {
    const result = detectFailure(null as any, safeMetrics());
    expect(result.failed).toBe(false);
    expect(result.severity).toBe(0);
  });

  it("handles null metrics gracefully", () => {
    const comp = { id: "r1", type: "resistor", properties: {} };
    const result = detectFailure(comp, null as any);
    expect(result.failed).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// detectFailure — stress / failure cases
// ────────────────────────────────────────────────────────────────────────────

describe("detectFailure — stress conditions", () => {
  it("detects resistor overpower at 2× rating", () => {
    const comp = { id: "r1", type: "resistor", properties: { powerRating: 0.25 } };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 0.5 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.name).toBeTruthy();
  });

  it("detects capacitor overvoltage", () => {
    const comp = { id: "c1", type: "capacitor", properties: { maxVoltage: 50 } };
    const result = detectFailure(comp, safeMetrics({ operatingVoltage: 65 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("burst");
  });

  it("detects MOSFET drain overcurrent", () => {
    const comp = { id: "q1", type: "mosfet", properties: { id_max: 10, vds_max: 60 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 14 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.failed).toBe(true);
  });

  it("detects BJT thermal runaway", () => {
    const comp = { id: "q2", type: "bjt", properties: { maxTempC: 150 } };
    const result = detectFailure(comp, safeMetrics({ thermalRise: 140 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.name).toMatch(/thermal/i);
  });

  it("detects diode overcurrent burnout", () => {
    const comp = { id: "d1", type: "diode", properties: { maxCurrent: 1 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 2 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("blowout");
  });

  it("detects fuse element melt at 110% rated current", () => {
    const comp = { id: "f1", type: "fuse", properties: { ratedCurrentA: 1 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 1.15 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("blowout");
  });

  it("fuse respects ratedCurrentA property — does not blow below threshold", () => {
    const comp = { id: "f2", type: "fuse", properties: { ratedCurrentA: 5 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 4.9 }));
    expect(result.severity).toBe(0);
    expect(result.failed).toBe(false);
  });

  it("fuse with ratedCurrentA=5 blows at 5.6A (112% of rating)", () => {
    const comp = { id: "f3", type: "fuse", properties: { ratedCurrentA: 5 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 5.6 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("blowout");
  });

  it("fuse blows and marks failed=true at extreme overcurrent (e.g. 10000V scenario)", () => {
    // Simulates a 10000V battery through a fuse rated 1A — current would be enormous
    const comp = { id: "f4", type: "fuse", properties: { ratedCurrentA: 1 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 200000 }));
    expect(result.failed).toBe(true);
    expect(result.severity).toBeGreaterThanOrEqual(2);
    expect(result.visual).toBe("blowout");
  });

  it("detects motor winding burnout", () => {
    const comp = { id: "m1", type: "motor", properties: { ratedCurrentA: 0.5 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 1.5 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("smoke");
  });

  it("detects lamp filament burnout", () => {
    const comp = { id: "l1", type: "lamp", properties: { ratedWatts: 5 } };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 7 }));
    expect(result.severity).toBeGreaterThan(0);
  });

  it("detects LED junction burnout at high current", () => {
    const comp = { id: "led1", type: "led", properties: { maxCurrent: 0.02 } };
    const result = detectFailure(comp, safeMetrics({ currentRms: 0.04 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.visual).toBe("blowout");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// detectFailure — family resolution for unknown/branded types
// ────────────────────────────────────────────────────────────────────────────

describe("detectFailure — branded / unknown component types", () => {
  it("resolves 'bjt-npn' and detects thermal runaway", () => {
    const comp = { id: "q3", type: "bjt-npn", properties: { maxTempC: 150 } };
    const result = detectFailure(comp, safeMetrics({ thermalRise: 140 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.family).toBe("bjt");
  });

  it("resolves 'zener-diode' and detects power burnout", () => {
    const comp = { id: "z1", type: "zener-diode", properties: { powerRating: 0.5 } };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 1 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.family).toBe("zener_diode");
  });

  it("resolves unknown type with ic_ prefix → ic family", () => {
    const comp = { id: "u99", type: "ic-custom-timer", properties: { supplyVoltage: 5 } };
    const result = detectFailure(comp, safeMetrics({ operatingVoltage: 8 }));
    expect(result.family).toBe("ic");
    expect(result.severity).toBeGreaterThan(0);
  });

  it("falls back to generic profile for completely unknown type", () => {
    const comp = { id: "x1", type: "quantum-sensor", properties: { powerRating: 0.1 } };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 1, thermalRise: 120 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.family).toBe("generic");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Runtime registration API
// ────────────────────────────────────────────────────────────────────────────

describe("registerComponentType — runtime registration", () => {
  it("registers a new type with defaultProperties", () => {
    registerComponentType("test-sensor", {
      defaultProperties: { resistance: 5000, thermalResistance: 80, powerRating: 0.1 },
    });
    expect(COMPONENT_PROFILES["test-sensor"]).toBeDefined();
    expect(COMPONENT_PROFILES["test-sensor"].defaultProperties.resistance).toBe(5000);
  });

  it("registers failure modes for a new type", () => {
    registerComponentType("test-sensor", {
      failureModes: {
        overload: {
          name: "Overload",
          visual: "smoke",
          physicalDescription: "Sensor element chars",
          trigger: (m: any) => m.powerDissipation > 0.5,
          severity: (m: any) => m.powerDissipation / 0.5 * 3,
        },
      },
    });
    const comp = { id: "s1", type: "test-sensor", properties: {} };
    const result = detectFailure(comp, safeMetrics({ powerDissipation: 0.8 }));
    expect(result.severity).toBeGreaterThan(0);
    expect(result.name).toBe("Overload");
  });

  it("maps new type to a family via family key", () => {
    registerComponentType("my-opamp", { family: "opamp" });
    expect(resolveComponentFamily("my-opamp")).toBe("opamp");
  });

  it("ignores invalid arguments without throwing", () => {
    expect(() => registerComponentType("", {})).not.toThrow();
    expect(() => registerComponentType(null as any, {})).not.toThrow();
    expect(() => registerComponentType("valid", null as any)).not.toThrow();
  });
});

describe("registerFailureProfile — merge modes", () => {
  it("merges new modes into existing profile", () => {
    registerFailureProfile("resistor", {
      radioactive: {
        name: "Test Mode",
        visual: "glow",
        physicalDescription: "Test",
        trigger: (m: any) => m.thermalRise > 9999,
        severity: () => 1,
      },
    });
    expect((COMPONENT_FAILURE_PROFILES.resistor.modes as any).radioactive).toBeDefined();
    // Original modes still intact
    expect((COMPONENT_FAILURE_PROFILES.resistor.modes as any).overpower).toBeDefined();
  });

  it("creates new profile entry for unknown type", () => {
    registerFailureProfile("brand-new-component", {
      meltdown: {
        name: "Meltdown",
        visual: "melt",
        physicalDescription: "It melts",
        trigger: () => true,
        severity: () => 3,
      },
    });
    const comp = { id: "bn1", type: "brand-new-component", properties: {} };
    const result = detectFailure(comp, safeMetrics());
    expect(result.severity).toBe(3);
    expect(result.name).toBe("Meltdown");
  });

  it("ignores invalid arguments without throwing", () => {
    expect(() => registerFailureProfile("", {})).not.toThrow();
    expect(() => registerFailureProfile(null as any, {})).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Wire failure detection
// FUSE™ wire overcurrent and insulation burnthrough modes
// ────────────────────────────────────────────────────────────────────────────

describe("COMPONENT_PROFILES — wire family", () => {
  it("wire profile has expected default properties", () => {
    const profile = COMPONENT_PROFILES["wire"];
    expect(profile).toBeDefined();
    const p = profile.defaultProperties;
    expect(typeof p.ampacityA).toBe("number");
    expect(typeof p.insulationMaxTempC).toBe("number");
    expect(typeof p.thermalResistance).toBe("number");
    expect(p.ampacityA).toBeGreaterThan(0);
    expect(p.insulationMaxTempC).toBeGreaterThan(0);
  });
});

describe("resolveComponentFamily — wire aliases", () => {
  it("resolves 'wire' → wire", () => {
    expect(resolveComponentFamily("wire")).toBe("wire");
  });

  it("resolves 'conductor' → wire", () => {
    expect(resolveComponentFamily("conductor")).toBe("wire");
  });

  it("resolves 'cable' → wire", () => {
    expect(resolveComponentFamily("cable")).toBe("wire");
  });

  it("resolves via ampacityA property → wire", () => {
    expect(resolveComponentFamily("unknown-conductor", { ampacityA: 15 })).toBe("wire");
  });

  it("resolves via insulationMaxTempC property → wire", () => {
    expect(resolveComponentFamily("mystery-line", { insulationMaxTempC: 80 })).toBe("wire");
  });
});

describe("detectFailure — wire overcurrent", () => {
  it("returns failed=false when current is below rated ampacity", () => {
    const wire = { id: "w1", type: "wire", properties: { ampacityA: 15, insulationMaxTempC: 80, thermalResistance: 12 } };
    const result = detectFailure(wire, safeMetrics({ currentRms: 10 }));
    expect(result.failed).toBe(false);
    expect(result.severity).toBe(0);
  });

  it("detects overcurrent when current just exceeds rated ampacity", () => {
    const wire = { id: "w1", type: "wire", properties: { ampacityA: 15, insulationMaxTempC: 80, thermalResistance: 12 } };
    // At 16A (107% of 15A), severity = (16/15 - 1) * 3 ≈ 0.2 — stressed but not failed.
    const stressed = detectFailure(wire, safeMetrics({ currentRms: 16 }));
    expect(stressed.severity).toBeGreaterThan(0);
    expect(stressed.name).toMatch(/overcurrent/i);
    expect(stressed.family).toBe("wire");
    // At 25A (167% of 15A), severity = (25/15 - 1)*3 = 2.0 — failed.
    const failed = detectFailure(wire, safeMetrics({ currentRms: 25 }));
    expect(failed.severity).toBeGreaterThanOrEqual(2);
    expect(failed.failed).toBe(true);
  });

  it("severity scales with overcurrent ratio", () => {
    const wire = { id: "w1", type: "wire", properties: { ampacityA: 10 } };
    const at110pct = detectFailure(wire, safeMetrics({ currentRms: 11 }));
    const at150pct = detectFailure(wire, safeMetrics({ currentRms: 15 }));
    const at200pct = detectFailure(wire, safeMetrics({ currentRms: 20 }));
    expect(at110pct.severity).toBeGreaterThan(0);
    expect(at150pct.severity).toBeGreaterThan(at110pct.severity);
    expect(at200pct.severity).toBeGreaterThan(at150pct.severity);
  });

  it("severity is capped at 3 for extreme overcurrent", () => {
    const wire = { id: "w1", type: "wire", properties: { ampacityA: 5 } };
    const result = detectFailure(wire, safeMetrics({ currentRms: 100 }));
    expect(result.severity).toBeLessThanOrEqual(3);
  });
});

describe("detectFailure — insulation burnthrough", () => {
  it("detects insulation burnthrough when thermalRise exceeds insulation class limit", () => {
    // PVC 80°C: trigger fires when 25 + thermalRise > 80, i.e. thermalRise > 55.
    // For failed=true we need severity>=2: (temp - limitC)/60 >= 2 → temp >= 200 → thermalRise >= 175.
    const wire = { id: "w2", type: "wire", properties: { ampacityA: 15, insulationMaxTempC: 80, thermalResistance: 12 } };
    // thermalRise=70 → temp=95°C → severity=(95-80)/60≈0.25 → stressed not failed.
    const stressed = detectFailure(wire, safeMetrics({ thermalRise: 70 }));
    expect(stressed.severity).toBeGreaterThan(0);
    expect(stressed.name).toMatch(/insulation/i);
    expect(stressed.visual).toBe("arc");
    // thermalRise=175 → temp=200°C → severity=(200-80)/60=2.0 → failed=true.
    const failed = detectFailure(wire, safeMetrics({ thermalRise: 175 }));
    expect(failed.failed).toBe(true);
    expect(failed.severity).toBeGreaterThanOrEqual(2);
  });

  it("does NOT trigger burnthrough for XLPE 125°C wire at same thermalRise", () => {
    // XLPE rated 125°C — at thermalRise=70 conductor temp = 95°C, still below 125°C
    const wire = { id: "w3", type: "wire", properties: { ampacityA: 20, insulationMaxTempC: 125, thermalResistance: 12 } };
    const result = detectFailure(wire, safeMetrics({ thermalRise: 70 }));
    // 25 + 70 = 95°C < 125°C — should not trigger
    expect(result.severity).toBe(0);
    expect(result.failed).toBe(false);
  });

  it("detects burnthrough for XLPE wire when conductor temp exceeds 125°C", () => {
    const wire = { id: "w4", type: "wire", properties: { ampacityA: 20, insulationMaxTempC: 125, thermalResistance: 12 } };
    // thermalRise=110 → temp=135°C — above 125°C limit → severity=(135-125)/60≈0.17 → stressed
    const stressed = detectFailure(wire, safeMetrics({ thermalRise: 110 }));
    expect(stressed.severity).toBeGreaterThan(0);
    expect(stressed.name).toMatch(/insulation/i);
    // thermalRise=220 → temp=245°C → severity=(245-125)/60=2.0 → failed=true
    const failed = detectFailure(wire, safeMetrics({ thermalRise: 220 }));
    expect(failed.failed).toBe(true);
    expect(failed.severity).toBeGreaterThanOrEqual(2);
  });

  it("higher-temp insulation class (silicone 200°C) survives higher thermalRise", () => {
    const wire = { id: "w5", type: "wire", properties: { ampacityA: 5, insulationMaxTempC: 200, thermalResistance: 12 } };
    // thermalRise = 150 → conductor temp = 175°C — below 200°C silicone limit
    const result = detectFailure(wire, safeMetrics({ thermalRise: 150 }));
    expect(result.failed).toBe(false);
  });

  it("bare wire (bare1200 / no jacket) has no insulation burnthrough risk", () => {
    // Set insulationMaxTempC to 1200 simulating bare resistance wire
    const wire = { id: "w6", type: "wire", properties: { ampacityA: 6, insulationMaxTempC: 1200, thermalResistance: 0 } };
    // Very high thermalRise — conductor is hot but there's no insulation to burn
    const result = detectFailure(wire, safeMetrics({ thermalRise: 800 }));
    // 25+800=825°C < 1200°C — burnthrough should not fire
    expect(result.severity).toBe(0);
  });
});

describe("detectFailure — wire family resolution for unlabelled type strings", () => {
  it("resolves 'hook-up-wire' and detects overcurrent", () => {
    const wire = { id: "w7", type: "hook-up-wire", properties: { ampacityA: 3, insulationMaxTempC: 80 } };
    const result = detectFailure(wire, safeMetrics({ currentRms: 6 }));
    expect(result.family).toBe("wire");
    expect(result.severity).toBeGreaterThan(0);
  });

  it("detects wire overcurrent using default ampacityA fallback when no properties given", () => {
    // With empty properties FUSE falls back to wire defaults (ampacityA: 15)
    const wire = { id: "w8", type: "wire", properties: {} };
    const result = detectFailure(wire, safeMetrics({ currentRms: 20 }));
    expect(result.family).toBe("wire");
    expect(result.severity).toBeGreaterThan(0);
    expect(result.name).toMatch(/overcurrent/i);
  });
});
