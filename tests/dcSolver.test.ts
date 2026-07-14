import { describe, it, expect } from "vitest";
import { solveDCCircuit } from "../src/sim/dcSolver";
import type { SchematicElement } from "../src/schematic/types";

describe("DC solver (Kirchhoff + Ohm)", () => {
  it("solves a simple series circuit and returns consistent direction", () => {
    const elements: SchematicElement[] = [
      // Battery: start = negative, end = positive (per threeFactory battery build)
      { id: "bat1", kind: "battery", label: "10V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      { id: "r1", kind: "resistor", label: "5Ω", start: { x: 2, z: 2 }, end: { x: 2, z: 0 }, orientation: "vertical" },
      { id: "wTop", kind: "wire", path: [{ x: 0, z: 2 }, { x: 2, z: 2 }] },
      { id: "wBot", kind: "wire", path: [{ x: 2, z: 0 }, { x: 0, z: 0 }] },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },
    ];

    const solution = solveDCCircuit(elements);
    expect(solution.status).toBe("solved");

    const rCurrent = solution.elementCurrents.get("r1");
    expect(rCurrent).toBeTruthy();
    // 10V / 5Ω = 2A. Resistor is defined start=(2,2) -> end=(2,0) so current should be +2A downward.
    expect(Math.abs((rCurrent!.amps) - 2)).toBeLessThan(1e-6);
    expect(rCurrent!.direction).toBe("start->end");

    // Wire segment currents should all have magnitude ~2A (sign depends on path orientation)
    const top = solution.wireSegmentCurrents.find((c) => c.wireId === "wTop" && c.segmentIndex === 0);
    const bot = solution.wireSegmentCurrents.find((c) => c.wireId === "wBot" && c.segmentIndex === 0);
    expect(top).toBeTruthy();
    expect(bot).toBeTruthy();
    expect(Math.abs(Math.abs(top!.amps) - 2)).toBeLessThan(1e-6);
    expect(Math.abs(Math.abs(bot!.amps) - 2)).toBeLessThan(1e-6);
  });

  it("returns ~0A for an open circuit (no complete conductive path)", () => {
    const elements: SchematicElement[] = [
      { id: "bat1", kind: "battery", label: "9V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      // Resistor not connected back to battery
      { id: "r1", kind: "resistor", label: "100Ω", start: { x: 5, z: 5 }, end: { x: 6, z: 5 }, orientation: "horizontal" },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },
    ];

    const solution = solveDCCircuit(elements);
    expect(solution.status).toBe("solved");

    const bat = solution.elementCurrents.get("bat1");
    const r = solution.elementCurrents.get("r1");
    expect(bat?.amps ?? 0).toBeCloseTo(0, 9);
    expect(r?.amps ?? 0).toBeCloseTo(0, 9);
  });

  it("splits current correctly for a simple parallel network", () => {
    // Battery 10V feeding two 10Ω resistors in parallel => 1A each, 2A total.
    const elements: SchematicElement[] = [
      { id: "bat1", kind: "battery", label: "10V", start: { x: 0, z: 0 }, end: { x: 0, z: 2 }, orientation: "vertical" },
      { id: "gnd", kind: "ground", position: { x: 0, z: 0 }, orientation: "horizontal" },

      // Top bus and bottom bus (explicit junction points at x=2 and x=4)
      { id: "wTop1", kind: "wire", path: [{ x: 0, z: 2 }, { x: 2, z: 2 }] },
      { id: "wTop2", kind: "wire", path: [{ x: 2, z: 2 }, { x: 4, z: 2 }] },
      { id: "wBot1", kind: "wire", path: [{ x: 0, z: 0 }, { x: 2, z: 0 }] },
      { id: "wBot2", kind: "wire", path: [{ x: 2, z: 0 }, { x: 4, z: 0 }] },

      // Two branches
      { id: "r1", kind: "resistor", label: "10Ω", start: { x: 2, z: 2 }, end: { x: 2, z: 0 }, orientation: "vertical" },
      { id: "r2", kind: "resistor", label: "10Ω", start: { x: 4, z: 2 }, end: { x: 4, z: 0 }, orientation: "vertical" },
    ];

    const solution = solveDCCircuit(elements);
    expect(solution.status).toBe("solved");

    const i1 = solution.elementCurrents.get("r1")!.amps;
    const i2 = solution.elementCurrents.get("r2")!.amps;
    expect(i1).toBeCloseTo(1, 6);
    expect(i2).toBeCloseTo(1, 6);
  });
});

