import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

describe("Arena workspace embedding", () => {
  it("renders the full legacy arena runtime inside workspace iframe", () => {
    const arenaView = readFileSync(
      `${ROOT}/src/components/arena/ArenaView.tsx`,
      "utf8",
    );

    expect(arenaView).toContain("arena.html");
    expect(arenaView).toContain("<iframe");
    expect(arenaView).toContain("loading=\"eager\"");
    expect(arenaView).toContain("Reload Arena");
  });
});
