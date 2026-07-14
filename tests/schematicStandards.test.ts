import { describe, expect, it } from "vitest";

import { computeAxisMetrics } from "../src/schematic/geometry";
import {
  AXIS_SPECS,
  BATTERY_SPEC,
  CAPACITOR_SPEC,
  RESISTOR_SPEC,
  SCHEMATIC_STANDARD_REFERENCES,
  SYMBOL_DIMENSIONS,
} from "../src/schematic/standards";

describe("schematic standards", () => {
  it("enforces axis metrics lead spacing on long spans", () => {
    const metrics = computeAxisMetrics({ x: 0, z: 0 }, { x: 4, z: 0 }, "horizontal", AXIS_SPECS.resistor);

    expect(metrics.totalLength).toBeCloseTo(4);
    expect(metrics.bodyLength).toBeCloseTo(4 * RESISTOR_SPEC.axis.bodyFraction, 2);
    expect(metrics.leadLength).toBeGreaterThanOrEqual(metrics.totalLength * RESISTOR_SPEC.axis.minLeadFraction - 1e-6);
    expect(metrics.bodyStartCoord).toBeCloseTo(metrics.leadLength, 3);
  });

  it("collapses leads for constrained spans without creating negative lengths", () => {
    const metrics = computeAxisMetrics({ x: 0, z: 0 }, { x: 0.5, z: 0 }, "horizontal", AXIS_SPECS.resistor);

    expect(metrics.totalLength).toBeCloseTo(0.5);
    expect(metrics.leadLength).toBeGreaterThanOrEqual(0);
    expect(metrics.bodyLength).toBeCloseTo(metrics.totalLength);
  });

  it("preserves orientation direction for reversed vertical segments", () => {
    const metrics = computeAxisMetrics({ x: 1, z: 3 }, { x: 1, z: 1 }, "vertical", AXIS_SPECS.resistor);

    expect(metrics.direction).toBe(-1);
    expect(metrics.bodyStartCoord).toBeGreaterThan(metrics.bodyEndCoord);
  });

  it("normalises capacitor section ratios to unity", () => {
    const total = CAPACITOR_SPEC.sectionRatios.gap + CAPACITOR_SPEC.sectionRatios.plate * 2;
    expect(total).toBeCloseTo(1, 6);
  });

  it("keeps battery positive plate longer than negative", () => {
    expect(BATTERY_SPEC.sectionRatios.positive).toBeGreaterThan(BATTERY_SPEC.sectionRatios.negative);
  });

  it("exposes reference metadata for IEEE/IEC/ANSI", () => {
    const standards = SCHEMATIC_STANDARD_REFERENCES.map((ref) => ref.standard);
    expect(new Set(standards)).toEqual(new Set(["ieee", "iec", "ansi"]));
  });

  it("shares stroke dimensions for conductors", () => {
    expect(SYMBOL_DIMENSIONS.strokeRadius).toBeCloseTo(SYMBOL_DIMENSIONS.wireRadius);
  });
});

