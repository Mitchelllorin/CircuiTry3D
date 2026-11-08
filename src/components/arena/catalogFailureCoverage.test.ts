import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPONENT_ACTIONS } from "../builder/constants";
import { UNIFIED_COMPONENT_ACTIONS } from "../builder/componentLibrary";
import type { ComponentAction } from "../builder/types";
import { arenaSourceFromLibrary, buildArenaAgents } from "./arenaData";
import { BLOWOUT_BY_FAMILY } from "./failureFx";
import { FAIL_SIGNATURE_BY_FAMILY } from "./deathSignatures";

/**
 * Every card the picker can hand you must be able to die.
 *
 * `deathSignatures.test.ts` checks the two death tables against the list of
 * families the FAILURE ENGINE can name. That is the wrong end of the pipe: it
 * proves the tables are complete for families the engine knows, and says nothing
 * about whether a card in the picker ever REACHES one of those families.
 *
 * The path is: library card → `builderType` → `arenaSourceFromLibrary` (which
 * makes it the agent's `type`) → `resolveFamily()` → a key in both tables. A
 * card whose type misses every keyword in the resolver lands on `generic`, and
 * `generic` exists, so nothing throws and nothing warns — the part simply dies
 * like an anonymous blob. That is how a transformer used to cook like a 5 mm
 * bead, and it is the same failure waiting for any card whose builderType does
 * not happen to contain the word the resolver was looking for.
 *
 * So this walks the real pipeline, for every card in the library, branded ones
 * included, and asserts each one arrives at a family with a blowout AND a death
 * signature. Branded parts get one extra assertion: they must resolve to the
 * SAME family as the generic part of the same type, because a Nexperia BC847B is
 * an NPN transistor and has to die like one.
 */

/** Parts the bench never puts on a rung — see NON_TESTABLE_TYPES in arenaData. */
const NON_TESTABLE = new Set(["ground", "junction", "wire"]);

/**
 * The four that are not physics. They are resolved by the engine's easter-egg
 * table ahead of any keyword, they have no failure path at all, and
 * `deathSignatures.test.ts` asserts that absence on purpose.
 */
const NO_FAILURE_PATH = new Set(["flux", "transfunctioner", "warp", "dilithium"]);

type Coverage = {
  action: ComponentAction;
  family: string;
  branded: boolean;
};

const COVERAGE: Coverage[] = UNIFIED_COMPONENT_ACTIONS.filter(
  (action) => action.builderType && !NON_TESTABLE.has(action.builderType),
).map((action, index) => {
  const [agent] = buildArenaAgents([arenaSourceFromLibrary(action, index)], null);
  return {
    action,
    family: agent.family,
    branded: Boolean(action.metadata?.realWorld),
  };
});

const TESTABLE = COVERAGE.filter((entry) => !NO_FAILURE_PATH.has(entry.family));

describe("every card in the picker resolves to a family the bench can kill", () => {
  it("has something to test", () => {
    expect(TESTABLE.length).toBeGreaterThan(40);
    expect(COVERAGE.some((entry) => entry.branded)).toBe(true);
  });

  it.each(TESTABLE.map((entry) => [entry.action.label, entry] as const))(
    "%s",
    (_label, entry) => {
      // A generic fallback is not coverage: it is the absence of an answer that
      // still renders. Name the card in the message, because the fix is always
      // in the resolver's keyword table or a missing family, never here.
      expect(
        entry.family,
        `${entry.action.label} (builderType "${entry.action.builderType}") falls through to the generic death`,
      ).not.toBe("generic");

      expect(
        BLOWOUT_BY_FAMILY[entry.family],
        `${entry.action.label} resolves to "${entry.family}", which has no blowout profile`,
      ).toBeTruthy();

      expect(
        FAIL_SIGNATURE_BY_FAMILY[entry.family],
        `${entry.action.label} resolves to "${entry.family}", which has no death signature`,
      ).toBeTruthy();
    },
  );
});

describe("branded parts die like the part they are", () => {
  const branded = COVERAGE.filter((entry) => entry.branded);
  const familyByBuilderType = new Map<string, string>();
  for (const entry of COVERAGE) {
    if (!entry.branded && entry.action.builderType) {
      familyByBuilderType.set(entry.action.builderType, entry.family);
    }
  }

  it("found the branded cards", () => {
    expect(branded.length).toBeGreaterThan(0);
  });

  it.each(branded.map((entry) => [entry.action.label, entry] as const))(
    "%s inherits its family's failure",
    (_label, entry) => {
      const sibling = familyByBuilderType.get(entry.action.builderType ?? "");
      if (sibling) {
        expect(
          entry.family,
          `${entry.action.label} is a "${entry.action.builderType}" but resolves to "${entry.family}" while the generic one resolves to "${sibling}"`,
        ).toBe(sibling);
      }
    },
  );
});


/**
 * The working surface's own death table.
 *
 * `public/legacy.html` is the Builder's 3D workspace, and it carries a second
 * death table keyed by the same component type the picker hands it. A type
 * missing here does not error and does not warn — it falls through to
 * WORKSPACE_FAIL_DEFAULT, so every part nobody named dies the same generic
 * slump. That is the workspace's version of the "generic family" bug the test
 * above exists to catch, and it survived because a default always renders.
 */
describe("every part the workspace can place has its own death", () => {
  const legacy = readFileSync(
    new URL("../../../public/legacy.html", import.meta.url),
    "utf8",
  );
  const table = legacy.slice(
    legacy.indexOf("const WORKSPACE_FAIL_SIGNATURE = {"),
    legacy.indexOf("const WORKSPACE_FAIL_DEFAULT"),
  );
  const signed = new Set(
    [...table.matchAll(/^\s*'?([a-z0-9_-]+)'?\s*:\s*\{\s*motion:/gm)].map(
      (match) => match[1],
    ),
  );

  /** The four that are not physics — the same set the arena test excludes. */
  const NO_FAILURE_PATH = new Set([
    "flux-capacitor",
    "continuum-transfunctioner",
    "warp-drive",
    "dilithium-crystal",
  ]);

  it("found the table", () => {
    expect(table.length).toBeGreaterThan(500);
    expect(signed.size).toBeGreaterThan(10);
  });

  const placedTypes = COMPONENT_ACTIONS.flatMap((action) =>
    action.builderType && !NO_FAILURE_PATH.has(action.builderType)
      ? [action.builderType]
      : [],
  );

  it.each(placedTypes)("%s has a signature of its own", (builderType) => {
    expect(
      signed.has(builderType),
      `"${builderType}" falls through to WORKSPACE_FAIL_DEFAULT`,
    ).toBe(true);
  });
});
