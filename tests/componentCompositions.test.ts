import { describe, it, expect } from "vitest";

// ── ComponentCompositions (browser JS version) ───────────────────────────────
const CC = (await import("../public/js/component-compositions.js")) as {
  MATERIAL_LIBRARY: Record<string, {
    name: string;
    density: number;
    thermalConductivity: number;
    specificHeat: number;
    meltingPoint: number;
    electricalResistivity: number;
    thermalExpansion?: number;
  }>;
  COMPONENT_COMPOSITIONS: Array<{
    componentType: string;
    aliases: string[];
    constructionNote: string;
    subComponents: Array<{
      name: string;
      materialKey: string;
      role: string;
      massFraction: number;
      isCritical?: boolean;
      operatingLimitC?: number;
    }>;
    internalLayers: Array<{
      materialKey: string;
      label: string;
      type: string;
      position: number[];
      scale: number[];
      color: string;
      opacity: number;
      rotation?: number[];
    }>;
  }>;
  getComponentComposition: (type: string) => {
    componentType: string;
    subComponents: Array<{ name: string; materialKey: string; isCritical?: boolean; operatingLimitC?: number }>;
    internalLayers: unknown[];
    constructionNote: string;
  } | null;
  getCriticalOperatingLimitC: (type: string) => number | null;
  getComponentMaterials: (type: string) => Array<{ key: string; name: string; thermalConductivity: number; meltingPoint: number; isCritical: boolean }>;
};

// ── FailureEngine with composition integration ────────────────────────────────
const FailureEngine = (await import("../public/js/component-failure-engine.js")) as {
  loadCompositions: (comps: unknown[], mats: Record<string, unknown>) => void;
  getCompositionThresholds: (type: string) => { criticalLimitC: number | null; thermalMass: number | null; criticalMat: unknown; composition: unknown } | null;
  detectFailure: (component: unknown, metrics: unknown) => {
    failed: boolean;
    severity: number;
    name: string | null;
    compositionBased?: boolean;
    criticalLimitC?: number;
  };
};

// Bootstrap composition data into the failure engine (mirrors bootstrap() in arena.html)
FailureEngine.loadCompositions(CC.COMPONENT_COMPOSITIONS, CC.MATERIAL_LIBRARY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function baseMetrics(overrides: Record<string, number> = {}) {
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

// ─────────────────────────────────────────────────────────────────────────────
describe("Material Library", () => {
  it("contains all required materials with physical properties", () => {
    const required = [
      "silicon", "copper", "gold", "aluminum", "alumina", "carbon_film",
      "epoxy_resin", "epoxy_mold_compound", "electrolyte_etg", "gan_semiconductor",
    ];
    for (const key of required) {
      const mat = CC.MATERIAL_LIBRARY[key];
      expect(mat, `Material "${key}" should exist`).toBeDefined();
      expect(mat.density).toBeGreaterThan(0);
      expect(mat.thermalConductivity).toBeGreaterThan(0);
      expect(mat.specificHeat).toBeGreaterThan(0);
      expect(mat.meltingPoint).toBeGreaterThan(0);
    }
  });

  it("silicon has physically correct properties", () => {
    const si = CC.MATERIAL_LIBRARY.silicon;
    expect(si.density).toBeCloseTo(2.33, 1);
    expect(si.meltingPoint).toBe(1414);
    expect(si.thermalConductivity).toBe(149);
  });

  it("copper has physically correct properties", () => {
    const cu = CC.MATERIAL_LIBRARY.copper;
    expect(cu.density).toBeCloseTo(8.96, 1);
    expect(cu.meltingPoint).toBe(1085);
    expect(cu.thermalConductivity).toBe(385);
  });

  it("electrolyte_etg has low meltingPoint (boil onset ~125 °C)", () => {
    expect(CC.MATERIAL_LIBRARY.electrolyte_etg.meltingPoint).toBe(125);
  });

  it("silver_tin_eutectic fuse wire melts at 221 °C", () => {
    expect(CC.MATERIAL_LIBRARY.silver_tin_eutectic.meltingPoint).toBe(221);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Component Compositions", () => {
  it("covers all 14 arena component types", () => {
    const required = [
      "resistor", "capacitor", "led", "diode", "bjt", "mosfet",
      "battery", "switch", "fuse", "heatsink", "opamp", "voltage_regulator", "ic", "relay",
    ];
    for (const type of required) {
      const comp = CC.getComponentComposition(type);
      expect(comp, `Composition for "${type}" should exist`).not.toBeNull();
    }
  });

  it("inductor has a valid composition", () => {
    const comp = CC.getComponentComposition("inductor");
    expect(comp).not.toBeNull();
    expect(comp?.subComponents.length).toBeGreaterThan(0);
    expect(comp?.internalLayers.length).toBeGreaterThan(0);
  });

  it("each composition has sub-components with valid mass fractions summing to ~1", () => {
    for (const comp of CC.COMPONENT_COMPOSITIONS) {
      const total = comp.subComponents.reduce((s, sub) => s + sub.massFraction, 0);
      expect(total, `${comp.componentType} mass fractions should sum close to 1`).toBeCloseTo(1.0, 1);
    }
  });

  it("each composition has at least one critical sub-component", () => {
    for (const comp of CC.COMPONENT_COMPOSITIONS) {
      const hasCritical = comp.subComponents.some((s) => s.isCritical);
      expect(hasCritical, `${comp.componentType} should have a critical sub-component`).toBe(true);
    }
  });

  it("each composition has internal layers for 3D cutaway view", () => {
    for (const comp of CC.COMPONENT_COMPOSITIONS) {
      expect(comp.internalLayers.length, `${comp.componentType} should have internal layers`).toBeGreaterThan(0);
      for (const layer of comp.internalLayers) {
        expect(["box", "cylinder", "sphere", "cone", "torus"]).toContain(layer.type);
        expect(layer.scale).toHaveLength(3);
        expect(layer.position).toHaveLength(3);
        expect(layer.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(layer.opacity).toBeGreaterThan(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("each sub-component materialKey exists in MATERIAL_LIBRARY", () => {
    for (const comp of CC.COMPONENT_COMPOSITIONS) {
      for (const sub of comp.subComponents) {
        expect(
          CC.MATERIAL_LIBRARY[sub.materialKey],
          `"${sub.materialKey}" used by ${comp.componentType}/${sub.name} should exist in MATERIAL_LIBRARY`
        ).toBeDefined();
      }
    }
  });

  it("alias lookups work for common part numbers", () => {
    expect(CC.getComponentComposition("resistor")).not.toBeNull();
    expect(CC.getComponentComposition("res")).not.toBeNull();
    expect(CC.getComponentComposition("led-red")).not.toBeNull();
    expect(CC.getComponentComposition("bjt-npn")).not.toBeNull();
    expect(CC.getComponentComposition("mosfet-irf540")).not.toBeNull();
    expect(CC.getComponentComposition("fuse-1a")).not.toBeNull();
    expect(CC.getComponentComposition("vreg-lm7805")).not.toBeNull();
  });

  it("returns null for unknown type", () => {
    expect(CC.getComponentComposition("unknown-xyz")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getCriticalOperatingLimitC", () => {
  it("resistor critical limit is 155 °C (carbon film)", () => {
    expect(CC.getCriticalOperatingLimitC("resistor")).toBe(155);
  });

  it("capacitor critical limit is 105 °C (electrolyte boil onset)", () => {
    expect(CC.getCriticalOperatingLimitC("capacitor")).toBe(105);
  });

  it("mosfet critical limit is 150 °C (Tjmax)", () => {
    expect(CC.getCriticalOperatingLimitC("mosfet")).toBe(150);
  });

  it("voltage_regulator critical limit is 125 °C (Tjmax for LM7805)", () => {
    expect(CC.getCriticalOperatingLimitC("voltage_regulator")).toBe(125);
  });

  it("ic (NE555) critical limit is 70 °C (commercial Tjmax)", () => {
    expect(CC.getCriticalOperatingLimitC("ic")).toBe(70);
  });

  it("fuse critical limit is 221 °C (Ag-Sn eutectic melt)", () => {
    expect(CC.getCriticalOperatingLimitC("fuse")).toBe(221);
  });

  it("returns null for unknown type", () => {
    expect(CC.getCriticalOperatingLimitC("nonexistent")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getComponentMaterials", () => {
  it("returns an array of materials with key and name for resistor", () => {
    const mats = CC.getComponentMaterials("resistor");
    expect(mats.length).toBeGreaterThan(0);
    const carbonFilm = mats.find((m) => m.key === "carbon_film");
    expect(carbonFilm).toBeDefined();
    expect(carbonFilm?.isCritical).toBe(true);
  });

  it("includes critical flag on critical materials", () => {
    const mosfetMats = CC.getComponentMaterials("mosfet");
    const siliconDie = mosfetMats.find((m) => m.key === "silicon");
    expect(siliconDie?.isCritical).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("FailureEngine — loadCompositions and getCompositionThresholds", () => {
  it("getCompositionThresholds returns data for resistor", () => {
    const th = FailureEngine.getCompositionThresholds("resistor");
    expect(th).not.toBeNull();
    expect(th?.criticalLimitC).toBe(155);
    expect(th?.thermalMass).toBeGreaterThan(0);
  });

  it("getCompositionThresholds returns data for mosfet", () => {
    const th = FailureEngine.getCompositionThresholds("mosfet");
    expect(th?.criticalLimitC).toBe(150);
  });

  it("getCompositionThresholds returns null for unknown type", () => {
    expect(FailureEngine.getCompositionThresholds("unknown-xyz")).toBeNull();
  });

  it("alias lookup works in getCompositionThresholds", () => {
    const th = FailureEngine.getCompositionThresholds("led-red");
    expect(th).not.toBeNull();
    expect(th?.criticalLimitC).toBe(125);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("FailureEngine — composition-based failure detection", () => {
  it("does not trigger composition failure for NE555 at 65 °C (below 70 °C limit)", () => {
    const result = FailureEngine.detectFailure(
      { type: "ic", family: "ic", properties: { powerRating: 0.6 } },
      baseMetrics({ thermalRise: 40 }) // 25 + 40 = 65 °C — below 70 °C IC limit
    );
    // May be 0 or very low — must NOT be composition-triggered failure
    expect(result.compositionBased).not.toBe(true);
  });

  it("triggers composition-based failure for NE555 at 85 °C (above 70 °C limit)", () => {
    const result = FailureEngine.detectFailure(
      { type: "ic", family: "ic", properties: { powerRating: 0.6 } },
      baseMetrics({ thermalRise: 60 }) // 25 + 60 = 85 °C — above 70 °C IC limit
    );
    expect(result.severity).toBeGreaterThan(0);
    expect(result.compositionBased).toBe(true);
    expect(result.name).toBe("Material Thermal Limit Exceeded");
  });

  it("composition-based result includes the correct criticalLimitC annotation", () => {
    const result = FailureEngine.detectFailure(
      { type: "voltage_regulator", family: "voltage_regulator", properties: { powerRating: 15 } },
      baseMetrics({ thermalRise: 110 }) // 25 + 110 = 135 °C — above 125 °C LM7805 limit
    );
    expect(result.criticalLimitC).toBe(125);
  });

  it("standard failure still wins when severity > composition severity", () => {
    // Resistor at 10× rated power → standard thermal overload fires at severity ≈ 3
    // Thermal rise only 20 °C → composition-based is low
    const result = FailureEngine.detectFailure(
      { type: "resistor", family: "resistor", properties: { powerRating: 0.25 } },
      baseMetrics({ powerDissipation: 2.5, thermalRise: 20 }) // 10× rated, but temp only 45 °C
    );
    expect(result.failed).toBe(true);
    expect(result.severity).toBeGreaterThan(2);
    // Should NOT be composition-based since standard failure is more severe
    expect(result.compositionBased).not.toBe(true);
  });
});
