import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_PART_LIBRARY_ACTIONS } from "../src/components/builder/componentLibrary";

/**
 * The nameplate is rendered inside public/legacy.html, which no test can import,
 * so this pins the two halves that come apart silently: the maker and ordering
 * code must reach the workspace in the spawn payload, and the workspace's
 * nameplate must print them above the designator.
 *
 * It came apart exactly once. The card said "Vishay · 0603 · 330Ω · 1%" in the
 * picker, and the part on the board said "R4" — the plate named a position, not
 * a part, so a student could not look it up and a promo shot could not show it.
 */
const LEGACY = readFileSync(resolve(__dirname, "../public/legacy.html"), "utf8");

const nameplateMethod = (() => {
  const start = LEGACY.indexOf("renderNameplateMarkup() {");
  const end = LEGACY.indexOf("getValueTextAndColor() {", start);
  return start >= 0 && end > start ? LEGACY.slice(start, end) : "";
})();

describe("branded parts carry their maker into the workspace", () => {
  it("every branded card sends a manufacturer and a part number", () => {
    expect(REAL_PART_LIBRARY_ACTIONS.length).toBeGreaterThan(0);

    for (const action of REAL_PART_LIBRARY_ACTIONS) {
      const props = action.initialProperties ?? {};
      expect(typeof props.manufacturer, action.id).toBe("string");
      expect(typeof props.partNumber, action.id).toBe("string");
      expect(String(props.manufacturer).trim(), action.id).not.toBe("");
      expect(String(props.partNumber).trim(), action.id).not.toBe("");
    }
  });

  it("the 218 series 250 mA fuse sends Littelfuse and its ordering code", () => {
    const action = REAL_PART_LIBRARY_ACTIONS.find(
      (entry) => entry.initialProperties?.partNumber === "0218.250MXP",
    );

    expect(action).toBeDefined();
    expect(action?.initialProperties?.manufacturer).toBe("Littelfuse");
  });

  it("the workspace prints the maker above the designator and joins the value to it", () => {
    expect(nameplateMethod).not.toBe("");
    expect(nameplateMethod).toContain("props.manufacturer");
    expect(nameplateMethod).toContain("props.partNumber");
    expect(nameplateMethod).toContain("makerText");

    // The maker line comes before the designator line — that is the order the
    // plate reads in, and the order the clip needs.
    expect(nameplateMethod.indexOf("makerText ?")).toBeLessThan(
      nameplateMethod.indexOf("showIdentifier ?"),
    );
  });
});
