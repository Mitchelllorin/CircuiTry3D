import { describe, it, expect } from "vitest";
import { createNode } from "../src/model/node";
import { createWire } from "../src/model/wire";
import { areNodesConnected, checkCircuitCompletion } from "../src/sim/connectivity";
import { solveDCCircuit } from "../src/sim/dcSolver";
import {
  formatFrequency,
  formatMetricValue,
  solveACCircuit,
  solveWireMetrics,
  validateACInput,
} from "../src/utils/electrical";
import type { SchematicElement } from "../src/schematic/types";

describe("System functionality checks", () => {
  describe("circuit completion", () => {
    it("marks a powered loop as complete and closed", () => {
      const negative = createNode("componentPin", { x: 0, y: 0 }, "neg");
      const rightBottom = createNode("junction", { x: 10, y: 0 }, "rb");
      const positive = createNode("componentPin", { x: 10, y: 10 }, "pos");
      const leftTop = createNode("junction", { x: 0, y: 10 }, "lt");

      const wires = [
        createWire([{ x: 0, y: 0 }, { x: 10, y: 0 }], "w1"),
        createWire([{ x: 10, y: 0 }, { x: 10, y: 10 }], "w2"),
        createWire([{ x: 10, y: 10 }, { x: 0, y: 10 }], "w3"),
        createWire([{ x: 0, y: 10 }, { x: 0, y: 0 }], "w4"),
      ];

      const result = checkCircuitCompletion(wires, [negative, rightBottom, positive, leftTop], [
        { positive: "pos", negative: "neg" },
      ]);

      expect(result.isClosed).toBe(true);
      expect(result.hasLoop).toBe(true);
      expect(result.powerSourceConnected).toBe(true);
      expect(result.componentCount).toBe(2);
      expect(result.openEndpoints).toHaveLength(0);
      expect(result.message).toBe("Circuit is complete and closed");
    });

    it("flags dangling endpoints even when a loop exists", () => {
      const negative = createNode("componentPin", { x: 0, y: 0 }, "neg");
      const rightBottom = createNode("junction", { x: 10, y: 0 }, "rb");
      const positive = createNode("componentPin", { x: 10, y: 10 }, "pos");
      const leftTop = createNode("junction", { x: 0, y: 10 }, "lt");
      const dangling = createNode("wireAnchor", { x: 15, y: 0 }, "dangling");

      const wires = [
        createWire([{ x: 0, y: 0 }, { x: 10, y: 0 }], "w1"),
        createWire([{ x: 10, y: 0 }, { x: 10, y: 10 }], "w2"),
        createWire([{ x: 10, y: 10 }, { x: 0, y: 10 }], "w3"),
        createWire([{ x: 0, y: 10 }, { x: 0, y: 0 }], "w4"),
        createWire([{ x: 10, y: 0 }, { x: 15, y: 0 }], "w5"),
      ];

      const result = checkCircuitCompletion(wires, [negative, rightBottom, positive, leftTop, dangling], [
        { positive: "pos", negative: "neg" },
      ]);

      expect(result.powerSourceConnected).toBe(true);
      expect(result.hasLoop).toBe(true);
      expect(result.isClosed).toBe(false);
      expect(result.openEndpoints).toEqual(["dangling"]);
      expect(result.message).toBe("Open circuit: 1 unconnected wire endpoint(s)");
    });

    it("checks connectivity between separate circuit islands", () => {
      const a = createNode("wireAnchor", { x: 0, y: 0 }, "a");
      const b = createNode("wireAnchor", { x: 10, y: 0 }, "b");
      const c = createNode("wireAnchor", { x: 100, y: 100 }, "c");
      const d = createNode("wireAnchor", { x: 110, y: 100 }, "d");

      const wires = [
        createWire([{ x: 0, y: 0 }, { x: 10, y: 0 }], "left"),
        createWire([{ x: 100, y: 100 }, { x: 110, y: 100 }], "right"),
      ];

      expect(areNodesConnected("a", "b", wires, [a, b, c, d])).toBe(true);
      expect(areNodesConnected("a", "c", wires, [a, b, c, d])).toBe(false);
    });
  });

  describe("current flow solver", () => {
    it("reports ideal-short faults across a battery", () => {
      const elements: SchematicElement[] = [
        {
          id: "bat1",
          kind: "battery",
          label: "9V",
          start: { x: 0, z: 0 },
          end: { x: 0, z: 2 },
          orientation: "vertical",
        },
        {
          id: "shortWire",
          kind: "wire",
          path: [{ x: 0, z: 0 }, { x: 0, z: 2 }],
        },
        {
          id: "gnd",
          kind: "ground",
          position: { x: 0, z: 0 },
          orientation: "horizontal",
        },
      ];

      const solution = solveDCCircuit(elements);
      expect(solution.status).toBe("invalid_ideal_short");
      expect(solution.reason).toMatch(/ideal short/i);
    });
  });

  describe("metrics", () => {
    it("solves complete W.I.R.E metrics from partial inputs", () => {
      const solved = solveWireMetrics({ voltage: 12, resistance: 6 });
      expect(solved.current).toBeCloseTo(2, 9);
      expect(solved.watts).toBeCloseTo(24, 9);
      expect(formatMetricValue(solved.current, "current")).toBe("2.000 A");
    });

    it("solves alternate metric combinations with square-root formulas", () => {
      const solved = solveWireMetrics({ watts: 36, resistance: 9 });
      expect(solved.current).toBeCloseTo(2, 9);
      expect(solved.voltage).toBeCloseTo(18, 9);
    });

    it("rejects incomplete metric input", () => {
      expect(() => solveWireMetrics({ voltage: 5 })).toThrow(/Unable to resolve/);
    });

    it("computes AC metrics for a purely resistive circuit", () => {
      const ac = solveACCircuit({
        voltage: 120,
        frequencyHz: 60,
        resistance: 20,
      });

      expect(ac.impedance).toBeCloseTo(20, 6);
      expect(ac.current).toBeCloseTo(6, 6);
      expect(ac.phaseAngle).toBeCloseTo(0, 6);
      expect(ac.powerFactor).toBeCloseTo(1, 6);
      expect(ac.reactivePower).toBeCloseTo(0, 6);
      expect(formatFrequency(ac.frequencyHz)).toBe("60.0 Hz");
    });

    it("validates AC input bounds", () => {
      const validation = validateACInput({
        voltage: -1,
        frequencyHz: 0,
        resistance: -5,
        inductance: -0.1,
        capacitance: -1e-6,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Voltage must be non-negative");
      expect(validation.errors).toContain("Frequency must be positive");
      expect(validation.errors).toContain("Resistance must be non-negative");
      expect(validation.errors).toContain("Inductance must be non-negative");
      expect(validation.errors).toContain("Capacitance must be non-negative");
    });
  });
});
