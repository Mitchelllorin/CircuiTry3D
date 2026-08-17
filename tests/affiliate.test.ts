import { describe, expect, it, beforeEach } from "vitest";
import {
  amazonTagFor,
  buildBuyLink,
  buildPartQuery,
  isAffiliateActive,
  looksLikePartNumber,
  parseTagMap,
  resolveAffiliateConfig,
} from "../src/affiliate";
import {
  clearAffiliateClicks,
  readAffiliateClicks,
  recordAffiliateClick,
  summariseClicks,
} from "../src/affiliate/clickLog";

const TAGGED = resolveAffiliateConfig({
  VITE_AMAZON_ASSOCIATES_TAG: "circuitry3d-20",
});
const UNTAGGED = resolveAffiliateConfig({});

describe("affiliate config", () => {
  it("has no tag until one is configured", () => {
    expect(amazonTagFor(UNTAGGED)).toBeNull();
    expect(isAffiliateActive(UNTAGGED, "amazon")).toBe(false);
  });

  it("uses the single-tag variable for the default marketplace", () => {
    expect(amazonTagFor(TAGGED)).toBe("circuitry3d-20");
    expect(isAffiliateActive(TAGGED, "amazon")).toBe(true);
  });

  it("keeps a separate tag per marketplace", () => {
    const config = resolveAffiliateConfig({
      VITE_AMAZON_ASSOCIATES_TAG: "circuitry3d-20",
      VITE_AMAZON_ASSOCIATES_TAGS: "www.amazon.co.uk=circuitry3d-21",
    });
    expect(amazonTagFor(config, "www.amazon.com")).toBe("circuitry3d-20");
    expect(amazonTagFor(config, "www.amazon.co.uk")).toBe("circuitry3d-21");
    // A marketplace we were never approved for earns nothing, so it gets no tag.
    expect(amazonTagFor(config, "www.amazon.de")).toBeNull();
  });

  it("can be switched off even with a tag present", () => {
    const config = resolveAffiliateConfig({
      VITE_AMAZON_ASSOCIATES_TAG: "circuitry3d-20",
      VITE_AFFILIATE_ENABLED: "false",
    });
    expect(amazonTagFor(config)).toBeNull();
    expect(isAffiliateActive(config, "amazon")).toBe(false);
  });

  it("survives a hand-edited tag map", () => {
    expect(parseTagMap(" www.amazon.ca = ct3d-ca , ,bad-entry, ")).toEqual({
      "www.amazon.ca": "ct3d-ca",
    });
  });
});

describe("part queries", () => {
  it("treats a schematic designator as unbuyable", () => {
    expect(looksLikePartNumber("R1")).toBe(false);
    expect(looksLikePartNumber("C12")).toBe(false);
    expect(looksLikePartNumber("Q104")).toBe(false);
  });

  it("recognises a real part number", () => {
    expect(looksLikePartNumber("2N3904")).toBe(true);
    expect(looksLikePartNumber("IRF540N")).toBe(true);
    expect(looksLikePartNumber("1N4148")).toBe(true);
  });

  it("searches by spec when all it has is a designator", () => {
    const query = buildPartQuery({
      name: "Resistor",
      family: "resistor",
      componentNumber: "R1",
      properties: { resistance: 470, powerRating: 0.25 },
    });
    expect(query.terms).toContain("470");
    expect(query.terms).toContain("ohm");
    expect(query.terms).toContain("resistor");
    // The designator must not leak into the search — it finds nothing.
    expect(query.terms).not.toContain("R1");
  });

  it("prefers a part number over the spec", () => {
    const query = buildPartQuery({
      name: "Transistor",
      family: "bjt",
      componentNumber: "2N3904",
      properties: { resistance: 470 },
    });
    expect(query.terms).toBe("2N3904 transistor");
  });

  it("uses the manufacturer and part number for a branded part", () => {
    const query = buildPartQuery({
      name: "1N4148 switching diode",
      family: "diode",
      manufacturer: "Vishay",
    });
    expect(query.terms).toBe("Vishay 1N4148 diode");
  });

  it("always produces something searchable", () => {
    const query = buildPartQuery({ name: "Mystery", family: "unknown-family" });
    expect(query.terms.length).toBeGreaterThan(0);
  });
});

describe("buy links", () => {
  const query = buildPartQuery({
    name: "470 ohm resistor",
    family: "resistor",
    properties: { resistance: 470, powerRating: 0.25 },
  });

  it("is not marked sponsored when it earns nothing", () => {
    const link = buildBuyLink(query, { placement: "leaderboard", config: UNTAGGED });
    expect(link.affiliate).toBe(false);
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.href).not.toContain("tag=");
    expect(link.href).not.toContain("ascsubtag");
  });

  it("carries the tag, the sub-tag and rel=sponsored once configured", () => {
    const link = buildBuyLink(query, { placement: "leaderboard", config: TAGGED });
    expect(link.affiliate).toBe(true);
    expect(link.rel).toContain("sponsored");
    expect(link.href).toContain("tag=circuitry3d-20");
    expect(link.href).toContain("ascsubtag=ct3d-leaderboard");
  });

  it("always opens the merchant, tagged or not", () => {
    for (const config of [TAGGED, UNTAGGED]) {
      const link = buildBuyLink(query, { placement: "part-editor", config });
      expect(link.href.startsWith("https://www.amazon.com/s?")).toBe(true);
      expect(link.href).toContain("k=470");
      expect(link.rel).toContain("noopener");
    }
  });

  it("does not tag a merchant we have no programme with", () => {
    const link = buildBuyLink(query, {
      placement: "library",
      merchant: "digikey",
      config: TAGGED,
    });
    expect(link.affiliate).toBe(false);
    expect(link.href).toContain("digikey.com");
    expect(link.rel).not.toContain("sponsored");
  });
});

describe("click log", () => {
  // The suite runs in the node environment, which has no localStorage. The
  // module is written to survive that (a missing store means no log, never a
  // thrown click), so exercising the LOGIC needs a store stood up by hand.
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    clearAffiliateClicks();
  });

  it("is inert, not broken, where storage is unavailable", () => {
    (globalThis as { localStorage?: unknown }).localStorage = undefined;
    expect(() =>
      recordAffiliateClick({ at: 1, merchant: "amazon", placement: "roster", part: "A" }),
    ).not.toThrow();
    expect(readAffiliateClicks()).toEqual([]);
  });

  it("records clicks newest first and summarises by placement", () => {
    recordAffiliateClick({ at: 1, merchant: "amazon", placement: "leaderboard", part: "A" });
    recordAffiliateClick({ at: 2, merchant: "amazon", placement: "leaderboard", part: "B" });
    recordAffiliateClick({ at: 3, merchant: "amazon", placement: "part-editor", part: "C" });

    const clicks = readAffiliateClicks();
    expect(clicks).toHaveLength(3);
    expect(clicks[0].part).toBe("C");
    expect(summariseClicks(clicks)).toEqual({ leaderboard: 2, "part-editor": 1 });
  });

  it("drops the oldest rather than refusing new ones", () => {
    for (let i = 0; i < 240; i += 1) {
      recordAffiliateClick({
        at: i,
        merchant: "amazon",
        placement: "roster",
        part: `part-${i}`,
      });
    }
    const clicks = readAffiliateClicks();
    expect(clicks).toHaveLength(200);
    expect(clicks[0].part).toBe("part-239");
  });
});
