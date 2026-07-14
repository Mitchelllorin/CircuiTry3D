import { describe, expect, it } from "vitest";
import { isLifetimeTester } from "../src/utils/lifetimeTesterEmails";

describe("lifetime tester email recognition", () => {
  it("recognizes built-in tester accounts used in the app", () => {
    expect(isLifetimeTester("builder@circuitry3d.dev")).toBe(true);
    expect(isLifetimeTester("mentor@circuitry3d.dev")).toBe(true);
  });

  it("normalizes email casing and surrounding whitespace", () => {
    expect(isLifetimeTester("  BUILDER@CIRCUITRY3D.DEV  ")).toBe(true);
  });

  it("does not match non-tester addresses", () => {
    expect(isLifetimeTester("not-a-tester@example.com")).toBe(false);
  });
});
