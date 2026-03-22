import { describe, it, expect } from "vitest";
import {
  getAIResponse,
  buildGreeting,
  KNOWLEDGE_BASE,
  SUGGESTED_QUESTIONS,
} from "../src/services/aiHelperService";
import type { LegacyCircuitState } from "../src/components/builder/types";

// ── Helper factories ──────────────────────────────────────────────────────────

function makeCircuitState(
  overrides: Partial<LegacyCircuitState["metrics"]> = {},
  counts: Partial<LegacyCircuitState["counts"]> = {},
): LegacyCircuitState {
  return {
    updatedAt: new Date().toISOString(),
    counts: {
      components: 2,
      wires: 1,
      junctions: 0,
      byType: {},
      ...counts,
    },
    metrics: {
      voltage: 9,
      current: 0.045,
      resistance: 200,
      power: 0.405,
      isComplete: true,
      ...overrides,
    },
  };
}

// ── Knowledge base integrity ──────────────────────────────────────────────────

describe("KNOWLEDGE_BASE", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(KNOWLEDGE_BASE)).toBe(true);
    expect(KNOWLEDGE_BASE.length).toBeGreaterThan(0);
  });

  it("every entry has a unique id", () => {
    const ids = KNOWLEDGE_BASE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has at least one keyword and a non-empty answer", () => {
    for (const entry of KNOWLEDGE_BASE) {
      expect(entry.keywords.length).toBeGreaterThan(0);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });
});

// ── Suggested questions ───────────────────────────────────────────────────────

describe("SUGGESTED_QUESTIONS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(SUGGESTED_QUESTIONS)).toBe(true);
    expect(SUGGESTED_QUESTIONS.length).toBeGreaterThan(0);
    for (const q of SUGGESTED_QUESTIONS) {
      expect(typeof q).toBe("string");
      expect(q.length).toBeGreaterThan(0);
    }
  });
});

// ── buildGreeting ─────────────────────────────────────────────────────────────

describe("buildGreeting", () => {
  it("returns a non-empty string with no circuit state", () => {
    const result = buildGreeting(null);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("mentions 'workspace is empty' when component count is zero", () => {
    const state = makeCircuitState({}, { components: 0, wires: 0, junctions: 0, byType: {} });
    const result = buildGreeting(state);
    expect(result.toLowerCase()).toContain("workspace is empty");
  });

  it("mentions voltage and current when circuit is complete", () => {
    const state = makeCircuitState();
    const result = buildGreeting(state);
    // Should include some numeric value
    expect(result).toMatch(/\d/);
  });

  it("mentions 'no power source' when reason is no-battery", () => {
    const state = makeCircuitState({ isComplete: false, reason: "no-battery" });
    const result = buildGreeting(state);
    expect(result.toLowerCase()).toMatch(/battery|power source/i);
  });

  it("mentions wires when reason is no-wires", () => {
    const state = makeCircuitState({ isComplete: false, reason: "no-wires" });
    const result = buildGreeting(state);
    expect(result.toLowerCase()).toContain("wire");
  });
});

// ── getAIResponse ─────────────────────────────────────────────────────────────

describe("getAIResponse", () => {
  it("returns a non-empty string for any input", () => {
    const result = getAIResponse("random xyz 123");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("responds to greetings without circuit state", () => {
    const result = getAIResponse("hello");
    expect(result.toLowerCase()).toMatch(/hi|hello|circuit|ask/i);
  });

  it("mentions Ohm's Law for ohm queries", () => {
    const result = getAIResponse("what is ohm's law?");
    expect(result.toLowerCase()).toContain("v = i");
  });

  it("explains series circuits for 'series' queries", () => {
    const result = getAIResponse("explain series circuit");
    expect(result.toLowerCase()).toContain("series");
  });

  it("explains parallel circuits for 'parallel' queries", () => {
    const result = getAIResponse("how does a parallel circuit work?");
    expect(result.toLowerCase()).toContain("parallel");
  });

  it("gives power formula for power questions", () => {
    const result = getAIResponse("what is the power formula?");
    expect(result).toMatch(/P = V × I|watts|watt/i);
  });

  it("explains how to run a simulation", () => {
    const result = getAIResponse("how do I run the simulation?");
    expect(result.toLowerCase()).toMatch(/simulat|play/i);
  });

  it("explains wiring for wire mode query", () => {
    const result = getAIResponse("how do I wire components?");
    expect(result.toLowerCase()).toContain("wire");
  });

  it("includes circuit context when state is provided and circuit is complete", () => {
    const state = makeCircuitState();
    const result = getAIResponse("what is the voltage?", state);
    // Should reference the voltage value in the response
    expect(result).toMatch(/9|voltage/i);
  });

  it("mentions open circuit when resistance is null", () => {
    const state = makeCircuitState({ isComplete: true, resistance: null });
    const result = getAIResponse("what is the resistance?", state);
    expect(result.toLowerCase()).toContain("open circuit");
  });

  it("handles greeting with complete circuit state", () => {
    const state = makeCircuitState();
    const result = getAIResponse("hi", state);
    expect(result.toLowerCase()).toMatch(/circuit|ask/i);
  });

  it("provides a fallback for unrecognised questions", () => {
    const result = getAIResponse("flux capacitor banana quantum foam");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(10);
  });

  it("handles empty string input gracefully", () => {
    const result = getAIResponse("");
    expect(typeof result).toBe("string");
  });

  it("is case-insensitive in keyword matching", () => {
    const lower = getAIResponse("ohm's law");
    const upper = getAIResponse("OHM'S LAW");
    // Both should mention V = I or similar
    expect(lower.toLowerCase()).toContain("v = i");
    expect(upper.toLowerCase()).toContain("v = i");
  });

  // ── New entries ─────────────────────────────────────────────────────────────

  it("answers relay questions", () => {
    const result = getAIResponse("how does a relay work?");
    expect(result.toLowerCase()).toMatch(/relay|coil|contact/i);
  });

  it("answers voltage regulator questions", () => {
    const result = getAIResponse("what is a voltage regulator?");
    expect(result.toLowerCase()).toMatch(/regulator|ldo|regulated/i);
  });

  it("answers potentiometer questions", () => {
    const result = getAIResponse("what is a potentiometer?");
    expect(result.toLowerCase()).toMatch(/potentiometer|wiper|variable/i);
  });

  it("answers RC filter questions", () => {
    const result = getAIResponse("how does an rc filter work?");
    expect(result.toLowerCase()).toMatch(/rc|time constant|cutoff/i);
  });

  it("answers wire gauge / AWG questions", () => {
    const result = getAIResponse("what wire gauge should I use?");
    expect(result.toLowerCase()).toMatch(/awg|gauge|ampacity/i);
  });

  it("answers wire insulation questions", () => {
    const result = getAIResponse("what wire insulation should I use?");
    expect(result.toLowerCase()).toMatch(/insulation|pvc|ptfe|silicone/i);
  });

  it("answers FUSE engine questions", () => {
    const result = getAIResponse("what is the FUSE engine?");
    expect(result.toLowerCase()).toMatch(/fuse|failure|thermal/i);
  });

  it("answers Norton's theorem questions", () => {
    const result = getAIResponse("explain norton's theorem");
    expect(result.toLowerCase()).toMatch(/norton|current source/i);
  });

  it("answers impedance questions", () => {
    const result = getAIResponse("what is impedance?");
    expect(result.toLowerCase()).toMatch(/impedance|reactance/i);
  });

  it("answers Darlington pair questions", () => {
    const result = getAIResponse("what is a darlington pair?");
    expect(result.toLowerCase()).toMatch(/darlington|gain|beta/i);
  });

  it("answers thermal management questions", () => {
    const result = getAIResponse("how do I manage heat in my circuit?");
    expect(result.toLowerCase()).toMatch(/heat|thermal|heatsink|derat/i);
  });

  it("answers 3D navigation questions", () => {
    const result = getAIResponse("how do I rotate the 3d view?");
    expect(result.toLowerCase()).toMatch(/3d|rotate|orbit|zoom/i);
  });

  it("answers protection circuit questions", () => {
    const result = getAIResponse("how do I add flyback diode protection?");
    expect(result.toLowerCase()).toMatch(/flyback|protection|diode|transient/i);
  });

  it("answers maximum power transfer questions", () => {
    const result = getAIResponse("explain maximum power transfer");
    expect(result.toLowerCase()).toMatch(/maximum power|load resistance|source resistance/i);
  });

  // ── Enhanced detection ───────────────────────────────────────────────────────

  it("surfaces wire warning when wireWarning is set and user asks about wire", () => {
    const state = makeCircuitState({ wireWarning: "Wire overcurrent: current exceeds ampacity limit", isComplete: true });
    const result = getAIResponse("is my wire ampacity ok?", state);
    expect(result.toLowerCase()).toMatch(/warning|wire|ampacity|gauge/i);
  });

  it("includes wire ampacity utilization in greeting when available", () => {
    const state = makeCircuitState({ wireAmpacityUtilization: 0.85, isComplete: true });
    const result = buildGreeting(state);
    expect(result).toMatch(/85%|ampacity/i);
  });

  it("greeting warns about wire when wireWarning is set", () => {
    const state = makeCircuitState({ wireWarning: "Ampacity exceeded", isComplete: true });
    const result = buildGreeting(state);
    expect(result.toLowerCase()).toMatch(/warning|wire|ampacity/i);
  });

  it("includes component type breakdown in context when byType is populated", () => {
    const state = makeCircuitState(
      { isComplete: true },
      { components: 3, wires: 2, byType: { battery: 1, resistor: 2 } },
    );
    const result = getAIResponse("what is ohm's law?", state);
    // The context note should mention the component types
    expect(result).toMatch(/battery|resistor/i);
  });

  it("gives LED-specific advice when circuit has LED and user asks about LED", () => {
    const state = makeCircuitState(
      { isComplete: true },
      { components: 2, byType: { led: 1, resistor: 1 } },
    );
    const result = getAIResponse("how does the led work?", state);
    expect(result.toLowerCase()).toMatch(/led|current.limiting|forward/i);
  });

  it("gives motor-specific advice when circuit has motor and user asks about motor", () => {
    const state = makeCircuitState(
      { isComplete: true },
      { components: 2, byType: { motor: 1, battery: 1 } },
    );
    const result = getAIResponse("tell me about my motor", state);
    expect(result.toLowerCase()).toMatch(/motor|mosfet|flyback|back.emf/i);
  });

  it("length-weighted scoring prefers longer specific keyword over short generic one", () => {
    // "ohm's law" (9 chars) should score higher than bare "ohm" (3 chars)
    // so a question containing "ohm's law" should match the ohm-law entry
    const result = getAIResponse("explain ohm's law please");
    expect(result.toLowerCase()).toContain("v = i");
  });

  it("SUGGESTED_QUESTIONS now has at least 8 items", () => {
    expect(SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(8);
  });
});
