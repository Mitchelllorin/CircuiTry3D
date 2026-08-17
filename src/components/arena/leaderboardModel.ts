import type { ArenaBattleAgent } from "./types";

/**
 * One part's result from one completed run.
 *
 * The three figures are the ones an engineer, an electrician or a student
 * would actually reach for, and each is stored WITH its reference so nothing
 * is a bare number:
 *
 *   heldToLoad     the load multiple it survived to — what the ramp reached
 *                  before it failed, or the top of the ramp if it never did.
 *                  This is the headline: "it held to 3.4x".
 *   peakW / ratedW how much power it was actually dissipating at its worst
 *                  against what it is rated for. 0.41 W in a 0.25 W part is
 *                  the whole story of why it died.
 *   peakTempC /    how hot it got against the junction limit F.U.S.E. holds
 *   limitC         for its family. Negative margin = it went over.
 */
export type LeaderboardEntry = {
  /** Stable across runs for the SAME part at the SAME ratings — see keyFor. */
  key: string;
  name: string;
  family: string;
  survived: boolean;
  heldToLoad: number;
  peakW: number;
  ratedW: number;
  peakTempC: number;
  limitC: number;
  scenarioName: string;
  /** Which run produced this, counting from 1 in this session. */
  runIndex: number;
};

/**
 * What makes two results the SAME contender.
 *
 * Deliberately not the agent id: ids are regenerated whenever the roster is
 * edited, so a part you tweaked and re-ran would appear as a stranger. But it
 * cannot be the name alone either — the entire point of the part editor is to
 * run "this resistor at 0.25 W" against "the same resistor at 0.5 W", and those
 * two must stand as separate contenders or the comparison is destroyed by
 * being averaged together.
 *
 * So: what it IS, plus what it is RATED for.
 */
export function keyFor(agent: ArenaBattleAgent): string {
  return [
    agent.name.trim().toLowerCase(),
    agent.family,
    agent.ratings.powerRating.toFixed(3),
    Number.isFinite(agent.ratings.maxCurrent)
      ? agent.ratings.maxCurrent.toFixed(3)
      : "inf",
    Number.isFinite(agent.ratings.maxVoltage)
      ? agent.ratings.maxVoltage.toFixed(2)
      : "inf",
  ].join("|");
}

/** Turn a finished run's agents into leaderboard entries. */
export function entriesFromRun(
  agents: ArenaBattleAgent[],
  scenarioName: string,
  runIndex: number,
): LeaderboardEntry[] {
  return agents.map((agent) => {
    const survived = agent.phase !== "failed";
    return {
      key: keyFor(agent),
      name: agent.name,
      family: agent.family,
      survived,
      // A survivor held to the highest load the ramp reached; a casualty held
      // to the load that killed it. Both answer the same question.
      heldToLoad: survived
        ? Math.max(agent.survivedLoad, 1)
        : (agent.failedAtLoad ?? agent.survivedLoad),
      peakW: (agent.peakLoadPercent / 100) * agent.ratings.powerRating,
      ratedW: agent.ratings.powerRating,
      peakTempC: agent.peakTempC,
      limitC: agent.ratings.junctionLimitC,
      scenarioName,
      runIndex,
    };
  });
}

/**
 * Merge a run's results into the board, keeping each contender's BEST showing.
 *
 * Best, not latest, and not an average: a part has one true breaking point, and
 * a run that was stopped early or reset says nothing about it. Averaging would
 * also punish a part for a run you abandoned.
 */
export function mergeEntries(
  board: LeaderboardEntry[],
  incoming: LeaderboardEntry[],
): LeaderboardEntry[] {
  const byKey = new Map(board.map((entry) => [entry.key, entry]));
  for (const entry of incoming) {
    const existing = byKey.get(entry.key);
    if (!existing || compareEntries(entry, existing) < 0) {
      byKey.set(entry.key, entry);
    }
  }
  return [...byKey.values()].sort(compareEntries);
}

/**
 * Ranking order. Negative means `a` ranks higher.
 *
 * Surviving beats failing outright — a part that came through the whole ramp
 * has not been beaten, whatever numbers a casualty put up on the way down.
 * After that it is how far up the ramp it got, and only then temperature
 * margin, which is the tie-breaker an engineer would use: of two parts that
 * both held to 4x, the one with more thermal headroom left is the better part.
 */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.survived !== b.survived) {
    return a.survived ? -1 : 1;
  }
  if (Math.abs(a.heldToLoad - b.heldToLoad) > 0.001) {
    return b.heldToLoad - a.heldToLoad;
  }
  return marginC(b) - marginC(a);
}

/** Degrees of headroom left at its worst moment. Negative = went over. */
export function marginC(entry: LeaderboardEntry): number {
  return entry.limitC - entry.peakTempC;
}

/** How hard it was driven, as a fraction of its rating. 1 = exactly at rating. */
export function ratedFraction(entry: LeaderboardEntry): number {
  return entry.ratedW > 0 ? entry.peakW / entry.ratedW : 0;
}
