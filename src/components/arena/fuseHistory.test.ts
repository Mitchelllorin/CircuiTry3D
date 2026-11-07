import { describe, expect, it } from "vitest";
import { makeRecord, type FuseRecord } from "../../lib/fuseRecord";
import {
  bundleFilename,
  buildFamilyBundle,
  countByLevel,
  importFamilyBundle,
  loadFamilyLog,
} from "./fuseHistory";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } as Storage;
}

const AT = 1_700_000_000_000;

function rows(app: string, subjects: string[]): FuseRecord[] {
  return subjects.map((subject, index) =>
    makeRecord({
      app,
      subject,
      level: "critical",
      at: AT + index,
      metrics: [{ key: "power", rated: 0.1, actual: 0.2, unit: "W" }],
    }),
  );
}

describe("family bundle", () => {
  it("writes the shared format, newest first, with a dated filename", () => {
    const records = rows("circuitry3d", ["R1", "R2"]);
    const { json, count } = buildFamilyBundle(records, AT);
    const bundle = JSON.parse(json);

    expect(count).toBe(2);
    expect(bundle.format).toBe("fuse-log");
    expect(bundle.app).toBe("circuitry3d");
    expect(bundle.records[0].subject).toBe("R2");
    expect(bundleFilename(AT)).toMatch(/^fuse-log-circuitry3d-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("lands in an empty record", () => {
    const storage = memoryStorage();
    const { json } = buildFamilyBundle(rows("circuitry3d", ["R1", "R2"]), AT);

    const result = importFamilyBundle(storage, json);

    expect(result.added).toBe(2);
    expect(result.total).toBe(2);
    expect(loadFamilyLog(storage)).toHaveLength(2);
  });

  it("is safe to repeat: the same bundle twice adds nothing the second time", () => {
    const storage = memoryStorage();
    const { json } = buildFamilyBundle(rows("anyplanet3d", ["Crust", "Mantle"]), AT);

    importFamilyBundle(storage, json);
    const again = importFamilyBundle(storage, json);

    expect(again.added).toBe(0);
    expect(again.total).toBe(2);
    expect(loadFamilyLog(storage)).toHaveLength(2);
  });

  it("keeps another app's rows beside this one's instead of replacing them", () => {
    const storage = memoryStorage();
    importFamilyBundle(storage, buildFamilyBundle(rows("circuitry3d", ["R1"]), AT).json);

    const incoming = buildFamilyBundle(rows("theocean3d", ["Ping-pong ball"]), AT + 10);
    const result = importFamilyBundle(storage, incoming.json);

    expect(result.added).toBe(1);
    expect(result.total).toBe(2);
    expect(result.apps).toEqual(["theocean3d"]);
    // Both rows carry their own `at`, and the bundle's timestamp is not theirs —
    // so this asserts WHICH apps survived the merge, not the order two rows stamp
    // the same millisecond land in.
    expect(
      [...new Set(loadFamilyLog(storage).map((record) => record.app))].sort(),
    ).toEqual(["circuitry3d", "theocean3d"]);
  });

  it("reports rows it refused rather than dropping them silently", () => {
    const storage = memoryStorage();
    const json = JSON.stringify({
      format: "fuse-log",
      records: [{ id: "not-a-record" }, ...rows("thecell3d", ["Membrane"])],
    });

    const result = importFamilyBundle(storage, json);

    expect(result.added).toBe(1);
    expect(result.rejected).toBe(1);
  });

  it("survives a file that is not a bundle at all", () => {
    const storage = memoryStorage();
    const result = importFamilyBundle(storage, "this is not json");

    expect(result.added).toBe(0);
    expect(result.total).toBe(0);
    expect(loadFamilyLog(storage)).toEqual([]);
  });
});

describe("level counts", () => {
  it("counts each level and nothing else", () => {
    const records = [
      makeRecord({ app: "circuitry3d", subject: "R1", level: "failed", at: AT }),
      makeRecord({ app: "circuitry3d", subject: "R2", level: "failed", at: AT + 1 }),
      makeRecord({ app: "circuitry3d", subject: "R3", level: "warning", at: AT + 2 }),
      makeRecord({ app: "circuitry3d", subject: "R4", level: "safe", at: AT + 3 }),
    ];

    const counts = countByLevel(records);

    expect(counts.failed).toBe(2);
    expect(counts.warning).toBe(1);
    expect(counts.safe).toBe(1);
    expect(counts.critical).toBe(0);
    expect(counts.stressed).toBe(0);
  });

  it("is all zeroes for an empty record", () => {
    expect(countByLevel([])).toEqual({
      safe: 0,
      stressed: 0,
      warning: 0,
      critical: 0,
      failed: 0,
    });
  });
});
