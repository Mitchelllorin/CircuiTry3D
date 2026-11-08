import { beforeEach, describe, expect, it } from "vitest";
import { arenaSourceFromLibrary, buildArenaAgents } from "./arenaData";
import { fileRunToFuseLog, fuseLevelForPart, recordFromPart } from "./fuseLog";
import { runRecordFrom, type ArenaRunPart, type ArenaRunRecord } from "./runHistory";
import { loadLog } from "../../lib/fuseRecord";

/**
 * The arena writes one row per part into the family log, and that row is the
 * only thing another app will ever see of this bench. So these tests are about
 * the contract, not the bench: the level, the two axes, the run link, and the
 * fact that filing the same run twice does not invent a second death.
 */

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};

beforeEach(() => {
  store.clear();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: fakeStorage,
    sessionStorage: fakeStorage,
  };
});

function part(overrides: Partial<ArenaRunPart> = {}): ArenaRunPart {
  return {
    name: "KEMET T491A106K016AT",
    family: "capacitor",
    survived: true,
    heldToLoad: 2.4,
    peakW: 0.05,
    ratedW: 0.1,
    // Half its rated watts and 48 % of its junction limit — both under the 0.6
    // band, so the default fixture is a part that actually held comfortably.
    peakTempC: 60,
    limitC: 125,
    failureName: null,
    ...overrides,
  };
}

function run(overrides: Partial<ArenaRunRecord> = {}): ArenaRunRecord {
  return {
    id: "circuitry3d:abc:0001",
    runIndex: 4,
    at: 1_700_000_000_000,
    mode: "bench",
    scenarioName: "Capacitor Ramp",
    winnerName: "KEMET T491A106K016AT",
    winnerLoad: 2.4,
    survivorCount: 1,
    totalCount: 1,
    parts: [part()],
    ...overrides,
  };
}

describe("level from a finished run", () => {
  it("grades on the worst of power and temperature", () => {
    expect(fuseLevelForPart(part())).toBe("safe");
    expect(fuseLevelForPart(part({ peakW: 0.07, ratedW: 0.1 }))).toBe("stressed");
    expect(fuseLevelForPart(part({ peakW: 0.09, ratedW: 0.1 }))).toBe("warning");
    expect(fuseLevelForPart(part({ peakTempC: 150 }))).toBe("critical");
  });

  it("calls a part that broke failed whatever its margin says", () => {
    expect(
      fuseLevelForPart(
        part({ survived: false, failureName: "Thermal runaway", peakW: 0.02 }),
      ),
    ).toBe("failed");
  });
});

describe("record from a part", () => {
  it("carries both axes, unrounded, with units and their basis", () => {
    const record = recordFromPart(part(), run(), 0);

    expect(record.app).toBe("circuitry3d");
    expect(record.domain).toBe("electrical");
    expect(record.subject).toBe("KEMET T491A106K016AT");
    expect(record.metrics).toEqual([
      { key: "power", rated: 0.1, actual: 0.05, unit: "W" },
      { key: "temperature", rated: 125, actual: 60, unit: "°C" },
    ]);
    // The verdict is the model's; the ratings it was judged against are not.
    expect(record.basis).toBe("model");
  });

  it("links back to the run it came from", () => {
    const source = run();
    const record = recordFromPart(part(), source, 2);

    expect(record.runId).toBe(source.id);
    expect(record.id).toBe(`${source.id}:p2`);
    expect(record.at).toBe(source.at);
  });

  it("keeps F.U.S.E.'s name for how it died", () => {
    const record = recordFromPart(
      part({ survived: false, failureName: "Dielectric breakdown" }),
      run(),
      0,
    );
    expect(record.failure).toBe("Dielectric breakdown");
    expect(record.note).toContain("failed at");
  });
});

describe("filing a run", () => {
  it("writes one row per part to the family log", () => {
    const source = run({
      parts: [
        part(),
        part({ name: "Vishay CRCW0603", family: "resistor", survived: false, failureName: "Thermal runaway" }),
      ],
      totalCount: 2,
      survivorCount: 1,
    });

    const log = fileRunToFuseLog(source);
    expect(log).toHaveLength(2);
    expect(loadLog(fakeStorage)).toHaveLength(2);
    expect(log.map((row) => row.subject)).toEqual([
      "KEMET T491A106K016AT",
      "Vishay CRCW0603",
    ]);
  });

  it("does not invent a second death when the same run is filed twice", () => {
    const source = run();
    fileRunToFuseLog(source);
    const log = fileRunToFuseLog(source);

    expect(log).toHaveLength(1);
  });

  it("keeps the rows from an earlier run when a later one is filed", () => {
    fileRunToFuseLog(run({ id: "circuitry3d:aaa:0001", at: 1_700_000_000_000 }));
    const log = fileRunToFuseLog(
      run({ id: "circuitry3d:bbb:0002", at: 1_700_000_900_000, parts: [part({ name: "Würth 744031100", family: "inductor" })] }),
    );

    expect(log).toHaveLength(2);
    expect(log[0].subject).toBe("Würth 744031100");
  });
});

describe("a run that really happened", () => {
  it("files rows that match the run's own numbers", () => {
    const agents = buildArenaAgents(
      [
        arenaSourceFromLibrary(
          {
            id: "r1",
            label: "Yageo CFR-25JB-52-1K",
            builderType: "resistor",
            initialProperties: { resistance: 1000, powerRating: 0.25 },
          },
          0,
        ),
      ],
      null,
    );
    const source = runRecordFrom({
      agents,
      scenarioName: "Resistor Ramp",
      runIndex: 1,
      mode: "bench",
    });

    const record = recordFromPart(source.parts[0], source, 0);
    expect(record.metrics[0].rated).toBe(source.parts[0].ratedW);
    expect(record.metrics[0].actual).toBe(source.parts[0].peakW);
    expect(record.metrics[1].actual).toBe(source.parts[0].peakTempC);
  });
});
