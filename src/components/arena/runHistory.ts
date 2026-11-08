import { partResult } from "./leaderboardModel";
import type { ArenaBattleAgent } from "./types";

/**
 * Every finished run, kept so the bench has a past.
 *
 * The leaderboard answers "which part is best" by keeping each contender's BEST
 * showing and nothing else. That is the right shape for a comparison and the
 * wrong shape for a history: it cannot tell you what you ran yesterday, which
 * parts were on the bench together, or what order they died in — merge drops all
 * of that on purpose.
 *
 * So this is the other half. One record per finished run, appended, never
 * merged, keeping the roster as it stood and what each part did on that
 * particular run. Where the board answers "best", this answers "then what
 * happened" — and the two are read side by side in the same panel.
 */
export const RUN_HISTORY_MAX = 40;

/** One part, as it performed on one run. */
export type ArenaRunPart = {
  name: string;
  family: string;
  survived: boolean;
  heldToLoad: number;
  peakW: number;
  ratedW: number;
  peakTempC: number;
  limitC: number;
  /** F.U.S.E.'s name for how it died — null if it came through the ramp. */
  failureName: string | null;
};

export type ArenaRunRecord = {
  /** Unique per record, so two runs numbered the same after a clear stay distinct. */
  id: string;
  /** Matches the `runIndex` the same run filed on the leaderboard. */
  runIndex: number;
  /** When it finished, epoch ms. */
  at: number;
  /** Which bench ran it. A solo bench and a battle are different experiments. */
  mode: "bench" | "battle";
  scenarioName: string;
  winnerName: string | null;
  /** The load multiple the winner reached. */
  winnerLoad: number | null;
  survivorCount: number;
  totalCount: number;
  /** In roster order, so the history reads as the bench looked. */
  parts: ArenaRunPart[];
};

/**
 * The best showing in a set of agents, using the board's own ordering.
 *
 * Deliberately the same rules as `compareEntries`: surviving beats failing,
 * then how far up the ramp, then thermal margin. A bench run has no `winnerId`
 * to consult — nothing declares a victor there — so the winner is derived, and
 * it must be derived the same way the board would rank them or the two surfaces
 * name different winners for the same run.
 */
export function winnerOf(agents: ArenaBattleAgent[]): ArenaBattleAgent | null {
  let best: ArenaBattleAgent | null = null;
  let bestResult: ReturnType<typeof partResult> | null = null;
  for (const agent of agents) {
    const result = partResult(agent);
    if (!best || !bestResult) {
      best = agent;
      bestResult = result;
      continue;
    }
    if (result.survived !== bestResult.survived) {
      if (result.survived) {
        best = agent;
        bestResult = result;
      }
      continue;
    }
    if (Math.abs(result.heldToLoad - bestResult.heldToLoad) > 0.001) {
      if (result.heldToLoad > bestResult.heldToLoad) {
        best = agent;
        bestResult = result;
      }
      continue;
    }
    const margin = result.limitC - result.peakTempC;
    const bestMargin = bestResult.limitC - bestResult.peakTempC;
    if (margin > bestMargin) {
      best = agent;
      bestResult = result;
    }
  }
  return best;
}

export type RunRecordInput = {
  agents: ArenaBattleAgent[];
  scenarioName: string;
  runIndex: number;
  mode: "bench" | "battle";
  /** The run's declared winner, when the engine names one. */
  winnerId?: string | null;
  /** Injectable for tests; defaults to now. */
  at?: number;
};

export function runRecordFrom({
  agents,
  scenarioName,
  runIndex,
  mode,
  winnerId = null,
  at = Date.now(),
}: RunRecordInput): ArenaRunRecord {
  const parts: ArenaRunPart[] = agents.map((agent) => ({
    name: agent.name,
    family: agent.family,
    failureName: agent.failureName ?? null,
    ...partResult(agent),
  }));

  const declared = winnerId ? (agents.find((agent) => agent.id === winnerId) ?? null) : null;
  const winner = declared ?? winnerOf(agents);
  const winnerResult = winner ? partResult(winner) : null;

  return {
    id: `${at.toString(36)}-${runIndex}-${Math.random().toString(36).slice(2, 8)}`,
    runIndex,
    at,
    mode,
    scenarioName,
    winnerName: winner?.name ?? null,
    winnerLoad: winnerResult ? winnerResult.heldToLoad : null,
    survivorCount: parts.filter((part) => part.survived).length,
    totalCount: parts.length,
    parts,
  };
}
