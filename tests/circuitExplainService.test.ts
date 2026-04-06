import { describe, it, expect } from "vitest";
import { explainCircuit } from "../src/services/circuitExplainService";
import type { LegacyCircuitState } from "../src/components/builder/types";

// ── Helper factories ──────────────────────────────────────────────────────────

function makeState(
  metricsOverrides: Partial<LegacyCircuitState["metrics"]> = {},
  countsOverrides: Partial<LegacyCircuitState["counts"]> & {
    byType?: Record<string, number>;
  } = {},
): LegacyCircuitState {
  return {
    updatedAt: new Date().toISOString(),
    counts: {
      components: 2,
      wires: 1,
      junctions: 0,
      byType: {},
      ...countsOverrides,
    },
    metrics: {
      voltage: 9,
      current: 0.045,
      resistance: 200,
      power: 0.405,
      isComplete: true,
      ...metricsOverrides,
    },
  };
}

// ── ExplainResult shape ───────────────────────────────────────────────────────

describe("explainCircuit — result shape", () => {
  it("returns an object with all required fields", async () => {
    const result = await explainCircuit(makeState());
    expect(typeof result.summary).toBe("string");
    expect(typeof result.currentFlow).toBe("string");
    expect(Array.isArray(result.componentRoles)).toBe(true);
    expect(typeof result.expectedBehavior).toBe("string");
    expect(Array.isArray(result.commonMistakes)).toBe(true);
    expect(["ai", "local", "unavailable"]).toContain(result.source);
  });

  it("source is 'local' when no AI endpoint is configured", async () => {
    const result = await explainCircuit(makeState());
    expect(result.source).toBe("local");
  });

  it("commonMistakes is never empty", async () => {
    const result = await explainCircuit(makeState());
    expect(result.commonMistakes.length).toBeGreaterThan(0);
  });
});

// ── Empty workspace ───────────────────────────────────────────────────────────

describe("explainCircuit — empty workspace", () => {
  it("summary mentions empty workspace", async () => {
    const state = makeState({ isComplete: false }, { components: 0, wires: 0, junctions: 0, byType: {} });
    const result = await explainCircuit(state);
    expect(result.summary.toLowerCase()).toContain("empty");
  });

  it("currentFlow indicates no current", async () => {
    const state = makeState({ isComplete: false }, { components: 0, wires: 0, junctions: 0, byType: {} });
    const result = await explainCircuit(state);
    expect(result.currentFlow.toLowerCase()).toMatch(/no current|empty/i);
  });

  it("expectedBehavior indicates no observable behavior", async () => {
    const state = makeState({ isComplete: false }, { components: 0, wires: 0, junctions: 0, byType: {} });
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toContain("incomplete");
  });
});

// ── Open circuit ──────────────────────────────────────────────────────────────

describe("explainCircuit — open circuit", () => {
  it("summary mentions 'open' when circuit is incomplete", async () => {
    const state = makeState(
      { isComplete: false, reason: "incomplete wiring" },
      { components: 2, wires: 1, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.summary.toLowerCase()).toContain("open");
  });

  it("currentFlow explains that a closed loop is needed", async () => {
    const state = makeState(
      { isComplete: false },
      { components: 2, wires: 1, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.currentFlow.toLowerCase()).toMatch(/no current|not closed|incomplete/i);
  });

  it("mentions 'no-battery' reason when battery is absent", async () => {
    const state = makeState(
      { isComplete: false, reason: "no-battery" },
      { components: 1, wires: 1, junctions: 0, byType: { resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.currentFlow.toLowerCase()).toMatch(/battery|voltage source/i);
  });
});

// ── Series topology ───────────────────────────────────────────────────────────

describe("explainCircuit — series circuit", () => {
  it("summary identifies series topology", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.045, resistance: 200, power: 0.405 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.summary.toLowerCase()).toContain("series");
  });

  it("currentFlow includes measured current when simulation has run", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.045 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.currentFlow).toMatch(/0\.045|current/i);
  });

  it("currentFlow asks to run simulation when current is 0", async () => {
    const state = makeState(
      { isComplete: true, voltage: 0, current: 0, resistance: 0, power: 0 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.currentFlow.toLowerCase()).toMatch(/run|simulat/i);
  });
});

// ── Parallel topology ─────────────────────────────────────────────────────────

describe("explainCircuit — parallel circuit", () => {
  it("summary mentions junctions / parallel branches", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.09, resistance: 100, power: 0.81 },
      { components: 3, wires: 4, junctions: 2, byType: { battery: 1, resistor: 2 } },
    );
    const result = await explainCircuit(state);
    expect(result.summary.toLowerCase()).toMatch(/junction|parallel/i);
  });
});

// ── Component roles ───────────────────────────────────────────────────────────

describe("explainCircuit — componentRoles", () => {
  it("includes battery role when battery is present", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    const batteryRole = result.componentRoles.find((r) => r.component.toLowerCase().includes("battery"));
    expect(batteryRole).toBeDefined();
    expect(batteryRole?.role.toLowerCase()).toMatch(/emf|voltage|source/i);
  });

  it("includes resistor role", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    const resistorRole = result.componentRoles.find((r) => r.component.toLowerCase().includes("resistor"));
    expect(resistorRole).toBeDefined();
    expect(resistorRole?.role.toLowerCase()).toMatch(/limit|resist|current/i);
  });

  it("includes relay role when relay is present", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, resistor: 1, relay: 1 } },
    );
    const result = await explainCircuit(state);
    const relayRole = result.componentRoles.find((r) => r.component.toLowerCase().includes("relay"));
    expect(relayRole).toBeDefined();
    expect(relayRole?.role.toLowerCase()).toMatch(/coil|contact|switch|electromagnetic/i);
  });

  it("includes voltage-regulator role when present", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, resistor: 1, "voltage-regulator": 1 } },
    );
    const result = await explainCircuit(state);
    const regRole = result.componentRoles.find((r) => r.component.toLowerCase().includes("voltage"));
    expect(regRole).toBeDefined();
    expect(regRole?.role.toLowerCase()).toMatch(/regul|stable|voltage/i);
  });

  it("uses plural label for multiple identical components", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, resistor: 2 } },
    );
    const result = await explainCircuit(state);
    const resistorRole = result.componentRoles.find((r) => r.component.startsWith("2×"));
    expect(resistorRole).toBeDefined();
  });

  it("returns empty componentRoles array for an empty circuit", async () => {
    const state = makeState(
      { isComplete: false },
      { components: 0, wires: 0, junctions: 0, byType: {} },
    );
    const result = await explainCircuit(state);
    expect(result.componentRoles).toEqual([]);
  });
});

// ── Expected behavior ─────────────────────────────────────────────────────────

describe("explainCircuit — expectedBehavior", () => {
  it("includes voltage when simulation ran", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.045 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior).toMatch(/9/);
  });

  it("mentions LED illumination when LED is present and circuit is running", async () => {
    const state = makeState(
      { isComplete: true, voltage: 5, current: 0.02, resistance: 200, power: 0.1 },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, resistor: 1, led: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toMatch(/light|illuminat/i);
  });

  it("mentions motor behavior when motor is present and circuit is running", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.5, resistance: 18, power: 4.5 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, motor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toMatch(/motor|spin/i);
  });

  it("mentions relay behavior when relay is present and circuit is running", async () => {
    const state = makeState(
      { isComplete: true, voltage: 12, current: 0.1, resistance: 120, power: 1.2 },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, resistor: 1, relay: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toMatch(/relay|coil|contact/i);
  });

  it("mentions voltage regulator behavior when present and circuit is running", async () => {
    const state = makeState(
      { isComplete: true, voltage: 12, current: 0.2, resistance: 60, power: 2.4 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, "voltage-regulator": 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toMatch(/regul|stable|voltage/i);
  });

  it("mentions wire warning when present", async () => {
    const state = makeState(
      { isComplete: true, voltage: 12, current: 5, resistance: 2.4, power: 60, wireWarning: "Exceeds 3A ampacity" },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.expectedBehavior.toLowerCase()).toMatch(/wire|warning|ampacity/i);
  });
});

// ── Common mistakes ───────────────────────────────────────────────────────────

describe("explainCircuit — commonMistakes", () => {
  it("warns about LED without current-limiting resistor", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, led: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("led") && m.toLowerCase().includes("resistor"),
    );
    expect(hasMistake).toBe(true);
  });

  it("warns about capacitor without series resistor", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, capacitor: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("capacitor") && m.toLowerCase().includes("resistor"),
    );
    expect(hasMistake).toBe(true);
  });

  it("warns about relay without flyback diode", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, relay: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("relay") && m.toLowerCase().match(/diode|flyback/),
    );
    expect(hasMistake).toBe(true);
  });

  it("does NOT warn about relay flyback if a diode is present", async () => {
    const state = makeState(
      { isComplete: true },
      { components: 3, wires: 3, junctions: 0, byType: { battery: 1, relay: 1, diode: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("relay") && m.toLowerCase().includes("flyback"),
    );
    expect(hasMistake).toBe(false);
  });

  it("warns about voltage regulator without a battery", async () => {
    const state = makeState(
      { isComplete: false },
      { components: 1, wires: 0, junctions: 0, byType: { "voltage-regulator": 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("regulator") && m.toLowerCase().match(/battery|voltage source/),
    );
    expect(hasMistake).toBe(true);
  });

  it("warns about missing voltage source", async () => {
    const state = makeState(
      { isComplete: false },
      { components: 1, wires: 0, junctions: 0, byType: { resistor: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().match(/battery|voltage source/),
    );
    expect(hasMistake).toBe(true);
  });

  it("warns about wire rating exceeded when wireWarning is set", async () => {
    const state = makeState(
      { isComplete: true, wireWarning: "Exceeds 3A ampacity", voltage: 12, current: 5, resistance: 2.4, power: 60 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    const hasMistake = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("wire"),
    );
    expect(hasMistake).toBe(true);
  });

  it("returns 'no obvious mistakes' fallback for a clean circuit", async () => {
    const state = makeState(
      { isComplete: true, voltage: 9, current: 0.045, resistance: 200, power: 0.405 },
      { components: 2, wires: 2, junctions: 0, byType: { battery: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    // No lint mistakes expected for a clean battery+resistor circuit
    const hasFallback = result.commonMistakes.some((m) =>
      m.toLowerCase().includes("no obvious"),
    );
    expect(hasFallback).toBe(true);
  });
});

// ── AC source ─────────────────────────────────────────────────────────────────

describe("explainCircuit — AC source", () => {
  it("currentFlow notes alternating direction when AC source is present", async () => {
    const state = makeState(
      { isComplete: true, voltage: 5, current: 0.05, resistance: 100, power: 0.25 },
      { components: 2, wires: 2, junctions: 0, byType: { ac_source: 1, resistor: 1 } },
    );
    const result = await explainCircuit(state);
    expect(result.currentFlow.toLowerCase()).toMatch(/ac|alternating|half.cycle/i);
  });
});
