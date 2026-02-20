import { describe, expect, it } from "vitest";
import { shouldEnableCurrentFlow } from "../src/sim/circuitValidator";
import type { SchematicElement } from "../src/schematic/types";

describe("current flow enablement gate", () => {
  it("enables animation for a complete closed loop with measurable current", () => {
    const elements: SchematicElement[] = [
      { id: "bat1", kind: "battery", label: "10V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      { id: "r1", kind: "resistor", label: "5Ω", start: { x: 2, z: 2 }, end: { x: 2, z: 0 }, orientation: "vertical" },
      { id: "wTop", kind: "wire", path: [{ x: 0, z: 2 }, { x: 2, z: 2 }] },
      { id: "wBot", kind: "wire", path: [{ x: 2, z: 0 }, { x: 0, z: 0 }] },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },
    ];

    const result = shouldEnableCurrentFlow(elements);
    expect(result.shouldAnimate).toBe(true);
    expect(result.currentAmps).toBeCloseTo(2, 6);
  });

  it("disables animation for open circuits", () => {
    const elements: SchematicElement[] = [
      { id: "bat1", kind: "battery", label: "9V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      { id: "r1", kind: "resistor", label: "100Ω", start: { x: 5, z: 5 }, end: { x: 6, z: 5 }, orientation: "horizontal" },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },
    ];

    const result = shouldEnableCurrentFlow(elements);
    expect(result.shouldAnimate).toBe(false);
    expect(result.currentAmps).toBe(0);
  });

  it("disables animation for ideal source shorts", () => {
    const elements: SchematicElement[] = [
      { id: "bat1", kind: "battery", label: "9V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      { id: "short", kind: "wire", path: [{ x: 0, z: 0 }, { x: 0, z: 2 }] },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },
    ];

    const result = shouldEnableCurrentFlow(elements);
    expect(result.shouldAnimate).toBe(false);
    expect(result.currentAmps).toBe(0);
    expect(result.reason.toLowerCase()).toContain("short");
  });
});
