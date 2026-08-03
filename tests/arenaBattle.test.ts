import { describe, expect, it } from "vitest";
import { buildArenaRoster } from "../src/components/arena/arenaData";
import { coerceArenaPayload } from "../src/components/arena/arenaStorage";
import { AMBIENT_C } from "../src/components/arena/stressTest";

// NOTE: this suite used to test `computeDamage` from `battleMath`, back when the
// arena was a turn-based fight with attack/defense/health. That model was
// removed in d57a0a7 — the arena is now a physical stress bench where parts are
// destroyed by real dissipation (see stressTest.ts and F.U.S.E.), and nothing
// "attacks" anything. The two combat tests are replaced below by the guarantees
// that model actually makes; the storage test is unchanged.

describe("arena roster", () => {
  it("starts every part intact, cool and unfailed", () => {
    const roster = buildArenaRoster({
      sessionName: "Test Session",
      components: [
        {
          id: "r-low",
          name: "Small Resistor",
          type: "resistor",
          properties: { resistance: 12, voltage: 9, current: 0.2, power: 0.3 },
        },
        {
          id: "r-high",
          name: "Large Resistor",
          type: "resistor",
          properties: { resistance: 1200, voltage: 9, current: 0.2, power: 0.3 },
        },
      ],
    });

    expect(roster).toHaveLength(2);
    for (const agent of roster) {
      // A bench run has to start from a known-good part, or the first tick of
      // stress is measured against damage that was already there.
      expect(agent.integrity).toBe(100);
      expect(agent.severity).toBe(0);
      expect(agent.phase).toBe("nominal");
      expect(agent.tempC).toBe(AMBIENT_C);
      expect(agent.failureName).toBeNull();
      // Every part must resolve to a physics family and a set of ratings, or
      // detectFailure has nothing to compare a measurement against.
      expect(agent.family).toBeTruthy();
      expect(agent.ratings.powerRating).toBeGreaterThan(0);
    }
  });

  it("loads a part against its OWN rating, so a bigger part sits cooler", () => {
    // The honest successor to the old "higher resistance defends better" test.
    // Survival here is not a shielding stat — it is headroom: identical
    // dissipation in a part rated for eight times the power is a fraction of
    // the load, and that ratio is what the bench ramps against.
    const [small, large] = buildArenaRoster({
      components: [
        {
          id: "r-quarter-watt",
          name: "Quarter Watt",
          type: "resistor",
          properties: { resistance: 100, voltage: 5, current: 0.05, power: 0.25, powerRating: 0.25 },
        },
        {
          id: "r-two-watt",
          name: "Two Watt",
          type: "resistor",
          properties: { resistance: 100, voltage: 5, current: 0.05, power: 0.25, powerRating: 2 },
        },
      ],
    });

    expect(large!.loadPercent).toBeLessThan(small!.loadPercent);
    // The quarter-watt part is dissipating exactly its rating: 100% of it.
    expect(small!.loadPercent).toBeCloseTo(100, 5);
  });

  it("coerces legacy storage payloads into arena session payloads", () => {
    const payload = coerceArenaPayload({
      label: "Legacy Export",
      metrics: {
        voltage: 12,
        current: 1,
        resistance: 24,
        power: 12,
      },
      state: {
        components: [{ id: "c-1", name: "Cap", type: "capacitor", properties: {} }],
      },
    });

    expect(payload?.sessionName).toBe("Legacy Export");
    expect(payload?.components).toHaveLength(1);
    expect(payload?.analysis?.basic?.resistance).toBe(24);
  });
});
