import { describe, expect, it } from "vitest";
import type { ComponentAction } from "../builder/types";
import { pickRandomParts } from "./rosterRandom";

/** A library of `n` pretend cards, named so a repeat is visible. */
function library(n: number): ComponentAction[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `part-${index}`,
    icon: "─",
    label: `Part ${index}`,
    action: "component" as const,
  })) as unknown as ComponentAction[];
}

/** Deterministic generator, so a shuffle can be asserted rather than sampled. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("pickRandomParts", () => {
  it("draws the number asked for", () => {
    expect(pickRandomParts(library(40), 5, { random: seeded(1) })).toHaveLength(5);
  });

  it("never draws the same card twice in one draw", () => {
    // The failure this guards against is independent draws, which repeat fast
    // once the count approaches the size of the pool.
    for (const seed of [1, 7, 99, 12345]) {
      const picked = pickRandomParts(library(8), 6, { random: seeded(seed) });
      expect(new Set(picked.map((part) => part.id)).size).toBe(picked.length);
    }
  });

  it("skips parts already on the bench", () => {
    const onBench = ["Part 0", "Part 1", "Part 2"];
    for (const seed of [2, 3, 4, 5]) {
      const picked = pickRandomParts(library(20), 4, {
        avoid: onBench,
        random: seeded(seed),
      });
      expect(picked.map((part) => part.label).filter((label) => onBench.includes(label))).toEqual([]);
    }
  });

  it("falls back to the whole library when the bench leaves too few cards", () => {
    const everything = library(3).map((part) => part.label);
    const picked = pickRandomParts(library(3), 2, { avoid: everything, random: seeded(9) });
    expect(picked).toHaveLength(2);
  });

  it("draws nothing when nothing is asked for", () => {
    expect(pickRandomParts(library(10), 0)).toEqual([]);
    expect(pickRandomParts([], 5)).toEqual([]);
  });
});
