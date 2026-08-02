import { describe, expect, it } from "vitest";
import { solveArenaCircuit } from "../src/components/arena/arenaCircuitSolve";

const geometry = {
  halfX: 6.0,
  halfZ: 2.8,
  batteryHalf: 0.9,
  seats: [
    { x: -2.7, halfZ: 0.5 },
    { x: 0, halfZ: 0.5 },
    { x: 2.7, halfZ: 0.5 },
  ],
};

describe("arena circuit solve", () => {
  it("splits current across parallel branches by Ohm's law", () => {
    const result = solveArenaCircuit({
      geometry,
      branches: [
        { id: "a", ohms: 100, open: false },
        { id: "b", ohms: 200, open: false },
        { id: "c", ohms: 400, open: false },
      ],
      railVolts: 12,
      sourceOhms: 0.0001, // effectively ideal, so we can check exact ratios
      switchClosed: true,
    });

    expect(result.status).toBe("solved");
    // Parallel: each branch sees ~12 V, so I = V/R.
    expect(result.branchAmps[0]).toBeCloseTo(0.12, 2);
    expect(result.branchAmps[1]).toBeCloseTo(0.06, 2);
    expect(result.branchAmps[2]).toBeCloseTo(0.03, 2);
    // The 100 Ω branch must pull 4x the 400 Ω branch.
    expect(result.branchAmps[0] / result.branchAmps[2]).toBeCloseTo(4, 1);
    expect(result.totalAmps).toBeCloseTo(0.21, 2);
    // R_T = 1/(1/100+1/200+1/400) = 57.14 Ω
    expect(result.equivalentOhms).toBeCloseTo(57.14, 0);
  });

  it("leaves surviving branches untouched when one part fails open", () => {
    const withAll = solveArenaCircuit({
      geometry,
      branches: [
        { id: "a", ohms: 100, open: false },
        { id: "b", ohms: 200, open: false },
        { id: "c", ohms: 400, open: false },
      ],
      railVolts: 12,
      sourceOhms: 0.0001,
      switchClosed: true,
    });
    const withFailure = solveArenaCircuit({
      geometry,
      branches: [
        { id: "a", ohms: 100, open: false },
        { id: "b", ohms: 200, open: true }, // failed open
        { id: "c", ohms: 400, open: false },
      ],
      railVolts: 12,
      sourceOhms: 0.0001,
      switchClosed: true,
    });

    expect(withFailure.status).toBe("solved");
    expect(withFailure.branchAmps[1]).toBe(0);
    // That is the whole point of parallel: the others carry on unchanged.
    expect(withFailure.branchAmps[0]).toBeCloseTo(withAll.branchAmps[0], 3);
    expect(withFailure.branchAmps[2]).toBeCloseTo(withAll.branchAmps[2], 3);
    expect(withFailure.totalAmps).toBeLessThan(withAll.totalAmps);
  });

  it("is dead when the switch is open", () => {
    const result = solveArenaCircuit({
      geometry,
      branches: [{ id: "a", ohms: 100, open: false }],
      railVolts: 12,
      sourceOhms: 0.5,
      switchClosed: false,
    });
    expect(result.totalAmps).toBe(0);
    expect(result.branchAmps.every((a) => a === 0)).toBe(true);
  });

  // The cell droops under load: raising internal resistance must reduce total
  // current. Guards against the source being modelled as ideal, where a
  // low-resistance part would draw an unbounded current.
  it("droops as the cell's internal resistance rises", () => {
    const run = (sourceOhms: number) =>
      solveArenaCircuit({
        geometry,
        branches: [
          { id: "a", ohms: 100, open: false },
          { id: "b", ohms: 100, open: false },
        ],
        railVolts: 12,
        sourceOhms,
        switchClosed: true,
      });
    const low = run(0.5);
    const high = run(200);
    expect(low.status).toBe("solved");
    expect(high.status).toBe("solved");
    expect(high.totalAmps).toBeLessThan(low.totalAmps);
  });

  it("scales linearly with supply voltage (the load ramp)", () => {
    const run = (railVolts: number) =>
      solveArenaCircuit({
        geometry,
        branches: [{ id: "a", ohms: 100, open: false }],
        railVolts,
        sourceOhms: 0.0001,
        switchClosed: true,
      });
    const at12 = run(12);
    const at24 = run(24);
    expect(at24.totalAmps / at12.totalAmps).toBeCloseTo(2, 2);
  });
});
