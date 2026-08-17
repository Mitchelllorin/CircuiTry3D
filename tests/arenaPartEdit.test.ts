import { describe, expect, it } from "vitest";
import { buildArenaAgents, arenaSourcesFrom } from "../src/components/arena/arenaData";
import type { ArenaSourceComponent } from "../src/components/arena/types";

/**
 * Editing a part has to change the SIMULATION, not just a number on screen.
 *
 * The editor writes into the roster's `properties` and the agent is rebuilt
 * through `buildArenaAgents`, so these assert the whole path: property in →
 * derived metric / F.U.S.E.-checked rating out. If a field ever stops being
 * read by `deriveMetrics`/`deriveRatings`, the box for it becomes a control
 * that does nothing, which is worse than not offering it.
 */
describe("editing a part under test", () => {
  const base = (): ArenaSourceComponent[] => [
    {
      id: "part-1",
      name: "Test Resistor",
      type: "resistor",
      properties: { resistance: 470, voltage: 9, powerRating: 0.25 },
    },
  ];

  const build = (sources: ArenaSourceComponent[]) => buildArenaAgents(sources, null)[0];

  const edit = (patch: Record<string, number | null>) => {
    const sources = base();
    const properties = { ...(sources[0].properties ?? {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete properties[key];
      else properties[key] = value;
    }
    return build([{ ...sources[0], properties }]);
  };

  it("moves the rated power the bench tests against", () => {
    expect(build(base()).ratings.powerRating).toBe(0.25);
    // The whole question a stress bench answers: would a half-watt part have
    // survived that?
    expect(edit({ powerRating: 0.5 }).ratings.powerRating).toBe(0.5);
  });

  it("re-derives current from Ohm's law when resistance changes", () => {
    const before = build(base());
    expect(before.metrics.current).toBeCloseTo(9 / 470, 6);
    const after = edit({ resistance: 100 });
    expect(after.metrics.current).toBeCloseTo(9 / 100, 6);
    // Power follows, because power is E x I and not a stored number.
    expect(after.metrics.power).toBeGreaterThan(before.metrics.power);
  });

  it("lets a pinned current be handed back to Ohm's law", () => {
    // Pinning it wins over the derivation...
    const pinned = edit({ current: 2 });
    expect(pinned.metrics.current).toBeCloseTo(2, 6);
    // ...and clearing it (the editor's blank field) returns to E / R.
    const released = edit({ current: null });
    expect(released.metrics.current).toBeCloseTo(9 / 470, 6);
  });

  it("carries max current and max voltage through as real limits", () => {
    const unlimited = build(base());
    expect(unlimited.ratings.maxCurrent).toBe(Number.POSITIVE_INFINITY);
    expect(unlimited.ratings.maxVoltage).toBe(Number.POSITIVE_INFINITY);
    const limited = edit({ maxCurrent: 0.5, maxVoltage: 12 });
    expect(limited.ratings.maxCurrent).toBe(0.5);
    expect(limited.ratings.maxVoltage).toBe(12);
  });

  it("changes how fast the part cooks via thermal resistance", () => {
    // Unset, this comes from the FAMILY profile (F.U.S.E.'s, or the local
    // mirror of it) rather than from deriveRatings' own fallback — the part's
    // properties are merged OVER those defaults. Asserted loosely on purpose:
    // the number belongs to the engine, and pinning it here would make this
    // test fail the day the engine improves it.
    const unset = build(base()).ratings.thermalResistanceCPerW;
    expect(unset).toBeGreaterThan(0);
    // What matters is that an explicit value wins over the profile's.
    const edited = edit({ thermalResistance: 300 }).ratings.thermalResistanceCPerW;
    expect(edited).toBe(300);
    expect(edited).not.toBe(unset);
  });

  it("leaves every other part on the bench untouched", () => {
    const sources = arenaSourcesFrom(null);
    expect(sources.length).toBeGreaterThan(1);
    const edited = sources.map((source, index) =>
      index === 0
        ? { ...source, properties: { ...source.properties, powerRating: 5 } }
        : source,
    );
    const before = buildArenaAgents(sources, null);
    const after = buildArenaAgents(edited, null);
    expect(after[0].ratings.powerRating).toBe(5);
    for (let index = 1; index < before.length; index += 1) {
      expect(after[index].ratings.powerRating).toBe(before[index].ratings.powerRating);
      expect(after[index].metrics.current).toBe(before[index].metrics.current);
    }
  });
});
