import { beforeEach, describe, expect, it } from "vitest";
import { buildArenaAgents, arenaSourceFromLibrary } from "./arenaData";
import { entriesFromRun } from "./leaderboardModel";
import { RUN_HISTORY_MAX, runRecordFrom, winnerOf } from "./runHistory";
import { loadArenaRunHistory, saveArenaRunHistory } from "./arenaStorage";
import type { ArenaBattleAgent } from "./types";

/**
 * The history has one job the leaderboard cannot do: say what happened ON ONE
 * RUN, keeping the roster as it stood. The board merges per contender and drops
 * everything else, so if the record builder also lost the roster — or derived
 * its numbers differently from the board — the panel would show a run that
 * never happened next to a board that contradicts it.
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

type Peak = {
  survivedLoad?: number;
  failedAtLoad?: number;
  peakLoadPercent?: number;
  peakTempC?: number;
  failed?: boolean;
  failureName?: string | null;
};

function peak(agent: ArenaBattleAgent, values: Peak): ArenaBattleAgent {
  return {
    ...agent,
    phase: values.failed ? "failed" : agent.phase,
    survivedLoad: values.survivedLoad ?? agent.survivedLoad,
    failedAtLoad: values.failedAtLoad ?? agent.failedAtLoad,
    peakLoadPercent: values.peakLoadPercent ?? agent.peakLoadPercent,
    peakTempC: values.peakTempC ?? agent.peakTempC,
    failureName: values.failureName ?? agent.failureName,
  };
}

function bench(): ArenaBattleAgent[] {
  const [survivor, casualty] = buildArenaAgents(
    [
      arenaSourceFromLibrary(
        {
          id: "viv",
          label: "Vishay CRCW0603 1kΩ",
          builderType: "resistor",
          initialProperties: { resistance: 1000, powerRating: 0.25 },
        },
        0,
      ),
      arenaSourceFromLibrary(
        {
          id: "yag",
          label: "Yageo CFR-25JB-52-1K",
          builderType: "resistor",
          initialProperties: { resistance: 1000, powerRating: 0.25 },
        },
        1,
      ),
    ],
    null,
  );
  return [
    peak(survivor, { survivedLoad: 3.2, peakLoadPercent: 60, peakTempC: 90 }),
    peak(casualty, {
      failed: true,
      failedAtLoad: 1.8,
      peakLoadPercent: 240,
      peakTempC: 240,
      failureName: "Thermal runaway",
    }),
  ];
}

describe("run record", () => {
  it("keeps the roster as it stood, in order", () => {
    const record = runRecordFrom({
      agents: bench(),
      scenarioName: "Resistor Ramp",
      runIndex: 7,
      mode: "battle",
      at: 1_700_000_000_000,
    });

    expect(record.parts.map((part) => part.name)).toEqual([
      "Vishay CRCW0603 1kΩ",
      "Yageo CFR-25JB-52-1K",
    ]);
    expect(record.runIndex).toBe(7);
    expect(record.scenarioName).toBe("Resistor Ramp");
    expect(record.mode).toBe("battle");
    expect(record.totalCount).toBe(2);
    expect(record.survivorCount).toBe(1);
    expect(record.parts[1].failureName).toBe("Thermal runaway");
  });

  it("reports the same figures the leaderboard files for the same run", () => {
    const agents = bench();
    const record = runRecordFrom({
      agents,
      scenarioName: "Resistor Ramp",
      runIndex: 1,
      mode: "bench",
    });
    const board = entriesFromRun(agents, "Resistor Ramp", 1);

    for (const [index, part] of record.parts.entries()) {
      expect(part.heldToLoad).toBe(board[index].heldToLoad);
      expect(part.peakW).toBeCloseTo(board[index].peakW, 10);
      expect(part.peakTempC).toBe(board[index].peakTempC);
      expect(part.limitC).toBe(board[index].limitC);
    }
  });

  it("names the survivor the winner, and how far it held", () => {
    const record = runRecordFrom({
      agents: bench(),
      scenarioName: "Resistor Ramp",
      runIndex: 2,
      mode: "bench",
    });

    expect(record.winnerName).toBe("Vishay CRCW0603 1kΩ");
    expect(record.winnerLoad).toBeCloseTo(3.2, 10);
  });

  it("prefers the run's declared winner over a derived one", () => {
    const agents = bench();
    const record = runRecordFrom({
      agents,
      scenarioName: "Resistor Ramp",
      runIndex: 3,
      mode: "battle",
      winnerId: agents[1].id,
    });

    expect(record.winnerName).toBe("Yageo CFR-25JB-52-1K");
    expect(record.winnerLoad).toBeCloseTo(1.8, 10);
  });

  it("ranks a survivor above a casualty, whatever the load", () => {
    const [survivor, casualty] = bench();
    expect(winnerOf([casualty, survivor])?.name).toBe("Vishay CRCW0603 1kΩ");
  });

  it("survives an empty roster without inventing a winner", () => {
    const record = runRecordFrom({
      agents: [],
      scenarioName: "Resistor Ramp",
      runIndex: 4,
      mode: "bench",
    });

    expect(record.totalCount).toBe(0);
    expect(record.winnerName).toBeNull();
    expect(record.winnerLoad).toBeNull();
  });
});

describe("run history storage", () => {
  it("reads back exactly the runs it saved", () => {
    const record = runRecordFrom({
      agents: bench(),
      scenarioName: "Resistor Ramp",
      runIndex: 1,
      mode: "bench",
      at: 1_700_000_000_000,
    });
    saveArenaRunHistory([record]);

    const loaded = loadArenaRunHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(record.id);
    expect(loaded[0].parts).toHaveLength(2);
    expect(loaded[0].parts[0].heldToLoad).toBeCloseTo(3.2, 10);
  });

  it("keeps newest first and drops the tail past the cap", () => {
    const runs = Array.from({ length: RUN_HISTORY_MAX + 5 }, (_, index) =>
      runRecordFrom({
        agents: bench(),
        scenarioName: "Resistor Ramp",
        runIndex: index + 1,
        mode: "bench",
        at: 1_700_000_000_000 + index * 1000,
      }),
    );
    saveArenaRunHistory(runs);

    const loaded = loadArenaRunHistory();
    expect(loaded).toHaveLength(RUN_HISTORY_MAX);
    expect(loaded[0].runIndex).toBe(1);
  });

  it("ignores a payload that is not a run list", () => {
    fakeStorage.setItem("circuitry:arena-runs:v1", JSON.stringify({ nope: true }));
    expect(loadArenaRunHistory()).toEqual([]);
  });
});
