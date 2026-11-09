import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_PART_LIBRARY_ACTIONS } from "../src/components/builder/componentLibrary";
import { arenaSourceFromLibrary, buildArenaAgents } from "../src/components/arena/arenaData";

/**
 * The 218 series fuse has to survive the trip from the picker into the
 * workspace.
 *
 * It did not. The probe found the card, tapped it, and the battery and resistor
 * arrived while the fuse did not — the spawn payload had started carrying
 * `manufacturer` and `partNumber` as STRINGS, and a step that expected numbers
 * choked on them and dropped the part without a word. A card that adds nothing
 * is worse than no card: the bench is a demonstration, and the part that proves
 * the point was the one that never landed.
 *
 * Two halves, because they can come apart independently: the action must carry
 * the rating and the identity, and the workspace's spawn path must merge an
 * object of mixed value types rather than rejecting it.
 */
const LEGACY = readFileSync(resolve(__dirname, "../public/legacy.html"), "utf8");

const spawnMethod = (() => {
  const start = LEGACY.indexOf("function addComponent(type, _retryCount, initialProperties)");
  // The legacy source uses single quotes here; matching on double quotes found
  // nothing and silently sliced an empty string, which proved nothing.
  const end = LEGACY.indexOf("if (initialProperties && typeof initialProperties === 'object')", start);
  return start >= 0 && end > start ? LEGACY.slice(start, end + 400) : "";
})();

const nameplateMethod = (() => {
  const start = LEGACY.indexOf("renderNameplateMarkup() {");
  const end = LEGACY.indexOf("getValueTextAndColor() {", start);
  return start >= 0 && end > start ? LEGACY.slice(start, end) : "";
})();

describe("the 0218 fuse reaches the workspace", () => {
  const action = REAL_PART_LIBRARY_ACTIONS.find(
    (entry) => entry.initialProperties?.partNumber === "0218.250MXP",
  );

  it("exists as a branded card with a 0.25 A rating", () => {
    expect(action).toBeDefined();
    expect(action?.initialProperties?.manufacturer).toBe("Littelfuse");
  });

  it("spawns into the arena with its rating and its maker line intact", () => {
    const source = arenaSourceFromLibrary(action!, 0);
    const [agent] = buildArenaAgents([source], null);

    expect(agent).toBeDefined();
    // The rating the fuse is judged against on the bench.
    expect(agent.ratings.maxCurrent).toBeCloseTo(0.25, 6);
    expect(agent.partNumber).toBe("0218.250MXP");
    expect(agent.manufacturer).toBe("Littelfuse");
    expect(agent.ratedThresholds?.maxCurrentA).toBeCloseTo(0.25, 6);
  });

  it("merges the spawn payload instead of coercing it", () => {
    expect(spawnMethod).not.toBe("");
    // The merge takes the object as it stands: no numeric coercion, no
    // String()/parseFloat over the incoming values, which is what dropped the
    // branded part and left the probe with a battery and a resistor.
    expect(spawnMethod).toContain("component.updateProperties");
    expect(spawnMethod).not.toMatch(/parseFloat\(\s*initialProperties/);
    expect(spawnMethod).not.toMatch(/Number\(\s*initialProperties/);
  });

  it("declares showValueText before the nameplate reads it", () => {
    expect(nameplateMethod).not.toBe("");
    const declared = nameplateMethod.indexOf("const showValueText");
    const firstRead = nameplateMethod.indexOf("${showValueText");
    expect(declared).toBeGreaterThanOrEqual(0);
    // be536db: reading it before the declaration is a temporal-dead-zone throw
    // inside the nameplate, which aborts the part's render.
    expect(declared).toBeLessThan(firstRead);
  });
});
