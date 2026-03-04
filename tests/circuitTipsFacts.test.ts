import CIRCUIT_TIPS_FACTS, { TipOrFact } from "../src/data/circuitTipsFacts";

describe("CIRCUIT_TIPS_FACTS", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(CIRCUIT_TIPS_FACTS)).toBe(true);
    expect(CIRCUIT_TIPS_FACTS.length).toBeGreaterThan(0);
  });

  it("contains entries of each kind: tip, fact, and trick", () => {
    const kinds = new Set(CIRCUIT_TIPS_FACTS.map((e) => e.kind));
    expect(kinds.has("tip")).toBe(true);
    expect(kinds.has("fact")).toBe(true);
    expect(kinds.has("trick")).toBe(true);
  });

  it("every entry has a non-empty id and text", () => {
    for (const entry of CIRCUIT_TIPS_FACTS) {
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.text).toBe("string");
      expect(entry.text.length).toBeGreaterThan(0);
    }
  });

  it("every entry kind is one of: tip, fact, trick", () => {
    const validKinds: TipOrFact["kind"][] = ["tip", "fact", "trick"];
    for (const entry of CIRCUIT_TIPS_FACTS) {
      expect(validKinds).toContain(entry.kind);
    }
  });

  it("all entry ids are unique", () => {
    const ids = CIRCUIT_TIPS_FACTS.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
