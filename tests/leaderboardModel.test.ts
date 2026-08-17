import { describe, expect, it } from "vitest";
import {
  compareEntries,
  entriesFromRun,
  keyFor,
  marginC,
  mergeEntries,
  type LeaderboardEntry,
} from "../src/components/arena/leaderboardModel";
import { buildArenaAgents } from "../src/components/arena/arenaData";
import type { ArenaBattleAgent, ArenaSourceComponent } from "../src/components/arena/types";

const entry = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  key: "k",
  name: "Part",
  family: "resistor",
  survived: false,
  heldToLoad: 2,
  peakW: 0.3,
  ratedW: 0.25,
  peakTempC: 150,
  limitC: 155,
  scenarioName: "Lab Bench",
  runIndex: 1,
  ...over,
});

describe("leaderboard ranking", () => {
  it("ranks a survivor above any casualty", () => {
    // A part that came through the whole ramp has not been beaten, whatever
    // numbers a casualty put up on its way down.
    const survivor = entry({ survived: true, heldToLoad: 2 });
    const casualty = entry({ survived: false, heldToLoad: 6 });
    expect(compareEntries(survivor, casualty)).toBeLessThan(0);
  });

  it("ranks by how far up the ramp it got", () => {
    const far = entry({ heldToLoad: 4.2 });
    const near = entry({ heldToLoad: 2.1 });
    expect(compareEntries(far, near)).toBeLessThan(0);
  });

  it("breaks ties on thermal headroom", () => {
    // Of two parts that both held to 4x, the one with more margin left is the
    // better part — that is the tie-break an engineer would actually use.
    const cool = entry({ heldToLoad: 4, peakTempC: 100, limitC: 155 });
    const hot = entry({ heldToLoad: 4, peakTempC: 154, limitC: 155 });
    expect(marginC(cool)).toBeGreaterThan(marginC(hot));
    expect(compareEntries(cool, hot)).toBeLessThan(0);
  });

  it("treats the same part at a different rating as a different contender", () => {
    // This is the whole point of the part editor: run it at 0.25 W, raise it to
    // 0.5 W, and see the two side by side. Keying on name alone would merge
    // them and destroy the comparison.
    const build = (powerRating: number): ArenaBattleAgent => {
      const source: ArenaSourceComponent = {
        id: "r1",
        name: "Champion Resistor",
        type: "resistor",
        properties: { resistance: 470, voltage: 9, powerRating },
      };
      return buildArenaAgents([source], null)[0];
    };
    expect(keyFor(build(0.25))).not.toBe(keyFor(build(0.5)));
    // ...but the SAME part re-run is the same contender.
    expect(keyFor(build(0.25))).toBe(keyFor(build(0.25)));
  });

  it("keeps a contender's best showing, not its latest", () => {
    // A run you abandoned, or one cut short, says nothing about the part.
    const good = entry({ key: "a", heldToLoad: 5, runIndex: 1 });
    const worse = entry({ key: "a", heldToLoad: 1.2, runIndex: 2 });
    const board = mergeEntries(mergeEntries([], [good]), [worse]);
    expect(board).toHaveLength(1);
    expect(board[0].heldToLoad).toBe(5);
    expect(board[0].runIndex).toBe(1);
  });

  it("records what a finished run actually did", () => {
    const agents = buildArenaAgents(
      [
        {
          id: "r1",
          name: "Test Resistor",
          type: "resistor",
          properties: { resistance: 470, voltage: 9, powerRating: 0.25 },
        },
      ],
      null,
    ).map((agent) => ({
      ...agent,
      phase: "failed" as const,
      failedAtLoad: 3.4,
      peakLoadPercent: 180,
      peakTempC: 210,
    }));

    const [result] = entriesFromRun(agents, "Engine Bay", 2);
    expect(result.survived).toBe(false);
    expect(result.heldToLoad).toBe(3.4);
    // 180% of a 0.25 W rating is 0.45 W — the figure that explains the failure.
    expect(result.peakW).toBeCloseTo(0.45, 5);
    expect(result.ratedW).toBe(0.25);
    // Went past its limit, so headroom is negative.
    expect(marginC(result)).toBeLessThan(0);
    expect(result.scenarioName).toBe("Engine Bay");
    expect(result.runIndex).toBe(2);
  });

  it("credits a survivor with the load it came through", () => {
    const agents = buildArenaAgents(
      [{ id: "r1", name: "Tough", type: "resistor", properties: { resistance: 470 } }],
      null,
    ).map((agent) => ({ ...agent, phase: "nominal" as const, survivedLoad: 4 }));
    const [result] = entriesFromRun(agents, "Lab Bench", 1);
    expect(result.survived).toBe(true);
    expect(result.heldToLoad).toBe(4);
  });
});
