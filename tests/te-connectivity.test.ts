import { describe, expect, it } from "vitest";
import { CATALOG_COMPONENTS, provenanceFor } from "../src/data/componentCatalog";

/**
 * TE Connectivity, checked against TE's own sheets (9 Nov 2026).
 *
 * Two of the twelve TE entries are `modeled`, and only those may claim the
 * engine represents them; the rest are connectors, sensors, a contactor and a
 * PPTC, and the queue's rule is that they stay reference-only until the engine
 * can actually represent the device. That distinction is the thing this file
 * guards — a part promoted without the physics behind it is worse than a part
 * honestly filed.
 *
 * Figures below are transcribed from:
 *  - T9A series, DC coil 30 A PCB relay sheet (TE, Rev 2 Jun 2022): coil code D,
 *    12 VDC rated, 144 Ω ±10 %, operate 9 VDC, release 1.2 VDC, UL class F
 *    insulation with max coil temperature 155 °C, 1 form A (NO), 30 A rated and
 *    limiting continuous current, 277 VAC rated switching voltage, 75 mΩ initial
 *    contact resistance, 15/15 ms operate/release, and the 10 A / 28 VDC DC
 *    contact rating.
 *  - Micro Relay A / V23074 sheet (TE, Rev 1119): 12 VDC coil, 1 form C, 30 A
 *    maximum switching current at 14 VDC maximum switching voltage, resistor
 *    suppressed coil for the -A1001- ordering code.
 */

const te = CATALOG_COMPONENTS.filter((part) => part.manufacturer === "TE Connectivity");
const byId = new Map(te.map((part) => [part.id, part]));

describe("TE Connectivity catalog", () => {
  it("carries the seed set, every entry sourced to TE's own site", () => {
    // Pinned, not a floor: a seed entry that disappears silently is the thing
    // this file exists to notice.
    expect(te.length).toBe(11);
    for (const part of te) {
      expect(part.source?.publisher, part.id).toBe("TE Connectivity");
      expect(part.source?.url, part.id).toMatch(/^https:\/\/www\.te\.com\//);
    }
  });

  it("models only the relays, and files everything else reference-only", () => {
    const modeled = te.filter((part) => provenanceFor(part).status === "modeled");
    expect(modeled.map((part) => part.id).sort()).toEqual([
      "te-t9as1d22-12",
      "te-v23074-a1001-a403",
    ]);
    for (const part of te) {
      if (modeled.includes(part)) continue;
      expect(provenanceFor(part).status, part.id).toBe("reference-only");
    }
  });

  it("T9AS1D22-12 sits on the sheet's coil and contact numbers", () => {
    const part = byId.get("te-t9as1d22-12");
    expect(part).toBeDefined();
    expect(part?.properties).toMatchObject({
      coilVoltage: 12,
      coilResistance: 144,
      coilPower: 1,
      mustOperateV: 9,
      mustReleaseV: 1.2,
      maxCurrent: 30,
      maxVoltage: 277,
      contactResistance: 0.075,
      operateMs: 15,
      releaseMs: 15,
    });
    expect(part?.ratedThresholds).toMatchObject({
      maxCurrentA: 30,
      maxVoltageV: 277,
      // TE's UL class F coil limit, not the app's 125 °C default.
      maxTempC: 155,
    });
  });

  it("V23074-A1001-A403 is the changeover, 14 VDC coil-class part", () => {
    const part = byId.get("te-v23074-a1001-a403");
    expect(part).toBeDefined();
    expect(part?.properties).toMatchObject({ coilVoltage: 12, maxCurrent: 30, maxVoltage: 14 });
    // 1 form C = changeover, which is what the name and spec both say.
    expect(part?.spec).toMatch(/changeover/i);
    expect(part?.ratedThresholds).toMatchObject({ maxCurrentA: 30, maxVoltageV: 14 });
  });

  it("says out loud that the DC contact rating is the smaller one", () => {
    const detail = byId.get("te-t9as1d22-12")?.simulation?.detail ?? "";
    expect(detail).toMatch(/10 A on 28 VDC/);
    expect(detail).toMatch(/30 A on 277 VAC/);
  });
});
