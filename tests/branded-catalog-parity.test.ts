import { describe, expect, it } from "vitest";
import {
  CATALOG_COMPONENTS,
  builderTypeFor,
  toWorkspaceProperties,
} from "../src/data/componentCatalog";

/**
 * The Builder used to carry its own hand-written branded-parts list
 * (`REAL_PARTS_CATALOG` in src/pages/Builder.tsx) alongside the Arena's
 * `CATALOG_COMPONENTS`. The two drifted. The Builder now derives its library
 * from the shared catalog, and this test pins that derivation against the
 * values the old list produced — a branded part must still spawn into the 3D
 * workspace with exactly the properties it did before.
 *
 * This is the hazardous seam: the catalog is datasheet-faithful SI (farads,
 * henries, `vth`, `hfe`) while the workspace wants µF, mH, `threshold`, `gain`.
 * A silent conversion slip here turns a 100µF capacitor into 0.0001µF.
 */

/** The workspace defaults, from `getDefaultProperties` in public/legacy.html. */
const WORKSPACE_DEFAULTS: Record<string, Record<string, number>> = {
  led: { resistance: 10 },
  opamp: { gain: 100000 },
};

/** Exactly what the old REAL_PARTS_CATALOG sent as `initialProperties`. */
const OLD_LIBRARY: Record<string, { builderType: string; props: Record<string, number> }> = {
  "energizer-522-9v": { builderType: "battery", props: { voltage: 9 } },
  "panasonic-lr6-aa": { builderType: "battery", props: { voltage: 1.5 } },

  "vishay-crcw0402-100r": { builderType: "resistor", props: { resistance: 100 } },
  "vishay-crcw0603-330r": { builderType: "resistor", props: { resistance: 330 } },
  "vishay-crcw0603-1k": { builderType: "resistor", props: { resistance: 1000 } },
  "vishay-crcw0603-10k": { builderType: "resistor", props: { resistance: 10000 } },
  "yageo-cfr-1k": { builderType: "resistor", props: { resistance: 1000 } },
  "yageo-cfr-10k": { builderType: "resistor", props: { resistance: 10000 } },
  "bourns-cr0603-100k": { builderType: "resistor", props: { resistance: 100000 } },

  // µF in the workspace; farads in the catalog.
  "murata-gcj-1uf": { builderType: "capacitor", props: { capacitance: 1 } },
  "panasonic-eeufm-100uf": { builderType: "capacitor", props: { capacitance: 100 } },
  "nichicon-ufw-470uf": { builderType: "capacitor", props: { capacitance: 470 } },

  // The workspace models an LED by resistance, so these fell back to its default.
  "vishay-tlhr5400-red": { builderType: "led", props: { resistance: 10 } },
  "wurth-led-green": { builderType: "led", props: { resistance: 10 } },
  "osram-lb-d47b-blue": { builderType: "led", props: { resistance: 10 } },

  "on-semi-1n4148": { builderType: "diode", props: { forwardVoltage: 0.72 } },
  "on-semi-1n4007": { builderType: "diode", props: { forwardVoltage: 0.7 } },
  "vishay-1n5819": { builderType: "diode", props: { forwardVoltage: 0.34 } },

  // hfe → gain
  "on-semi-2n2222a": { builderType: "bjt", props: { gain: 100 } },
  "on-semi-2n3904": { builderType: "bjt", props: { gain: 100 } },
  "stmicro-bc547": { builderType: "bjt", props: { gain: 110 } },
  "on-semi-tip31c": { builderType: "bjt", props: { gain: 25 } },
  "on-semi-2n3906": { builderType: "bjt-pnp", props: { gain: 100 } },

  // vth → threshold
  "infineon-irf540n": { builderType: "mosfet", props: { threshold: 4 } },
  "on-semi-2n7000": { builderType: "mosfet", props: { threshold: 2.1 } },

  "ti-lm7805": {
    builderType: "voltage-regulator",
    props: { outputVoltage: 5, maxCurrent: 1.5 },
  },
  "ti-lm7812": {
    builderType: "voltage-regulator",
    props: { outputVoltage: 12, maxCurrent: 1.5 },
  },
  "ti-lm317": {
    builderType: "voltage-regulator",
    props: { outputVoltage: 5, maxCurrent: 1.5 },
  },

  // The catalog carries gain-bandwidth, not open-loop gain → workspace default.
  "ti-lm358": { builderType: "opamp", props: { gain: 100000 } },
  "ti-lm741": { builderType: "opamp", props: { gain: 100000 } },

  // mH in the workspace; henries in the catalog. These two were renamed onto the
  // catalog's datasheet part codes (…-47uh → …-470, …-100uh → …-101y).
  "sumida-cdrh4d28-470": { builderType: "inductor", props: { inductance: 0.047 } },
  "bourns-srr1260-101y": { builderType: "inductor", props: { inductance: 0.1 } },

  "abracon-abls-16mhz": { builderType: "crystal", props: { frequency: 16000000 } },
  "ecs-8mhz": { builderType: "crystal", props: { frequency: 8000000 } },

  "vishay-ntcle100-10k": { builderType: "thermistor", props: { resistance: 10000 } },

  // ratedCurrentA → current
  "littelfuse-251001": { builderType: "fuse", props: { current: 1 } },
  "littelfuse-250500": { builderType: "fuse", props: { current: 0.5 } },
  "schurter-ato-5a": { builderType: "fuse", props: { current: 5 } },
};

const byId = new Map(CATALOG_COMPONENTS.map((p) => [p.id, p]));

describe("branded catalog → Builder library derivation", () => {
  it("every part the old Builder list offered still exists in the shared catalog", () => {
    const missing = Object.keys(OLD_LIBRARY).filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  for (const [id, expected] of Object.entries(OLD_LIBRARY)) {
    it(`${id} spawns the same part with the same properties`, () => {
      const part = byId.get(id);
      expect(part, `${id} missing from catalog`).toBeDefined();

      expect(builderTypeFor(part!)).toBe(expected.builderType);

      // An empty derivation means "use the workspace defaults", which is only
      // correct if those defaults are what the old list was sending.
      const derived = toWorkspaceProperties(part!);
      const effective =
        Object.keys(derived).length > 0
          ? derived
          : (WORKSPACE_DEFAULTS[expected.builderType] ?? {});

      expect(effective).toEqual(expected.props);
    });
  }

  it("ICs are excluded from the Builder library — the workspace cannot draw them", () => {
    const ics = CATALOG_COMPONENTS.filter((p) => p.type === "ic");
    expect(ics.length).toBeGreaterThan(0);
    for (const ic of ics) {
      expect(builderTypeFor(ic)).toBeNull();
    }
  });

  it("no catalog part maps to a workspace type with NaN properties", () => {
    for (const part of CATALOG_COMPONENTS) {
      if (!builderTypeFor(part)) continue;
      for (const [key, value] of Object.entries(toWorkspaceProperties(part))) {
        expect(Number.isFinite(value), `${part.id}.${key}`).toBe(true);
      }
    }
  });

  it("part ids are unique", () => {
    expect(byId.size).toBe(CATALOG_COMPONENTS.length);
  });
});
