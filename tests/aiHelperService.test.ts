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
});
