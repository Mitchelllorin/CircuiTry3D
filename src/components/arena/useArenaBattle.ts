import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArenaScenario } from "./scenarios";
import { DEFAULT_SCENARIO, getScenario } from "./scenarios";
import {
  TICK_MS,
  elapsedMsForStressFactor,
  evaluateStress,
  overdriveCeiling,
  stressFactorAt,
  thermalFractionAt,
} from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaBattleSummary,
} from "./types";

type UseArenaBattleOptions = {
  initialAgents: ArenaBattleAgent[];
};

type ArenaBattleState = {
  agents: ArenaBattleAgent[];
  log: ArenaBattleLogEntry[];
  status: ArenaBattleStatus;
  winnerId: string | null;
  /** The bench's own clock. Always advances while running; drives thermals. */
  elapsedMs: number;
  /**
   * Position on the LOAD ramp. Normally tracks elapsedMs; in free mode it is
   * frozen wherever the supply faders put it, so the load is exactly what you
   * asked for while the physics keeps running underneath.
   */
  rampAt: number;
  /** No timed ramp and no auto-finish: the bench holds until you stop it. */
  freeRun: boolean;
  stressFactor: number;
  highlight: ArenaBattleHighlight | null;
  failOrder: string[];
  scenario: ArenaScenario;
  summary: ArenaBattleSummary | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCurrent(amps: number): string {
  if (!Number.isFinite(amps)) return "—";
  return amps >= 1 ? `${amps.toFixed(2)} A` : `${Math.round(amps * 1000)} mA`;
}

function formatPower(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  return watts >= 1 ? `${watts.toFixed(2)} W` : `${Math.round(watts * 1000)} mW`;
}

function ratingSummary(agent: ArenaBattleAgent): string {
  const parts = [`${formatPower(agent.ratings.powerRating)} rated`];
  if (Number.isFinite(agent.ratings.maxCurrent)) {
    parts.push(`${formatCurrent(agent.ratings.maxCurrent)} max`);
  }
  parts.push(`Tj ${Math.round(agent.ratings.junctionLimitC)}°C`);
  return parts.join(" · ");
}

function capLog(entries: ArenaBattleLogEntry[]): ArenaBattleLogEntry[] {
  return entries.slice(-22);
}

/**
 * Composite robustness score, 0–100. Rewards a part for climbing high up the
 * load ramp (endurance), finishing intact (survival + integrity), and doing it
 * with margin to spare (electrical headroom + thermal margin). Survivors always
 * out-score casualties; among survivors the coolest, least-loaded part wins.
 */
function scoreAgent(agent: ArenaBattleAgent, scenario: ArenaScenario): number {
  const span = Math.max(scenario.stressMax - 1, 0.001);
  const endurance = clamp((agent.survivedLoad - 1) / span, 0, 1);
  const integrity = clamp(agent.integrity / 100, 0, 1);
  const headroom = clamp(1 - agent.peakLoadPercent / 200, 0, 1);
  const tempSpan = Math.max(agent.ratings.absoluteMaxTempC - scenario.ambientC, 1);
  const thermalMargin = clamp(
    1 - (agent.peakTempC - scenario.ambientC) / tempSpan,
    0,
    1,
  );
  const survived = agent.phase !== "failed" ? 1 : 0;
  const raw =
    0.42 * endurance +
    0.18 * survived +
    0.18 * integrity +
    0.12 * headroom +
    0.1 * thermalMargin;
  return Math.round(clamp(raw, 0, 1) * 1000) / 10;
}

function createInitialBattleState(
  initialAgents: ArenaBattleAgent[],
  scenario: ArenaScenario,
): ArenaBattleState {
  const log: ArenaBattleLogEntry[] = [
    {
      id: "arena-intro",
      kind: "system",
      round: 1,
      message: `Stress test ready — F.U.S.E. watching ${initialAgents.length} part${
        initialAgents.length === 1 ? "" : "s"
      } for failure in ${scenario.icon} ${scenario.name} (${Math.round(
        scenario.ambientC,
      )}°C). Hit BATTLE to ramp past ${scenario.stressMax}× into overdrive until every part fails.`,
    },
    ...initialAgents.map((agent) => ({
      id: `spawn-${agent.id}`,
      kind: "system" as const,
      round: 1,
      message: `${agent.componentNumber ?? agent.name} — ${ratingSummary(agent)}.`,
    })),
  ];

  return {
    agents: initialAgents,
    log,
    status: "ready",
    winnerId: null,
    elapsedMs: 0,
    rampAt: 0,
    freeRun: false,
    stressFactor: 1,
    highlight: null,
    failOrder: [],
    scenario,
    summary: null,
  };
}

/** Rank every agent by score and stamp `score`/`rank`; return ordered ids. */
function finalizeStandings(
  agents: ArenaBattleAgent[],
  scenario: ArenaScenario,
): { agents: ArenaBattleAgent[]; ranking: string[] } {
  const scored = agents.map((agent) => ({
    ...agent,
    score: scoreAgent(agent, scenario),
  }));
  const order = [...scored].sort(
    (a, b) =>
      b.score - a.score ||
      b.survivedLoad - a.survivedLoad ||
      a.peakLoadPercent - b.peakLoadPercent,
  );
  const rankById = new Map(order.map((agent, index) => [agent.id, index + 1]));
  return {
    agents: scored.map((agent) => ({
      ...agent,
      rank: rankById.get(agent.id) ?? 0,
    })),
    ranking: order.map((agent) => agent.id),
  };
}

/** Advance the bench by one tick. Pure state transition (safe inside setState). */
function step(prev: ArenaBattleState): ArenaBattleState {
  if (prev.status !== "battling") {
    return prev;
  }

  const scenario = prev.scenario;
  // TWO clocks, and separating them is what makes free mode possible.
  //
  // `elapsedMs` is the bench's own clock: it always advances, and the thermal
  // model rides it, because a part goes on heating whether or not the load is
  // changing. `rampAt` is a POSITION on the load ramp — normally the same
  // number, but in free mode it is frozen wherever the faders put it.
  //
  // Sharing one clock, as this did, means freezing the ramp also freezes the
  // physics: nothing warms, so nothing ever fails, and free mode would be a
  // bench that cannot break anything.
  const elapsedMs = prev.elapsedMs + TICK_MS;
  const rampAt = prev.freeRun ? prev.rampAt : elapsedMs;
  const stressFactor = stressFactorAt(rampAt, scenario);
  const thermalFraction = thermalFractionAt(elapsedMs);
  const dtSeconds = TICK_MS / 1000;
  const newLogs: ArenaBattleLogEntry[] = [];
  const failOrder = [...prev.failOrder];
  let highlight = prev.highlight;
  const sf = stressFactor.toFixed(1);

  const agents = prev.agents.map((agent) => {
    if (agent.phase === "failed") {
      return agent; // a destroyed part stays destroyed
    }

    const out = evaluateStress(agent, stressFactor, thermalFraction, scenario);
    const prevPhase = agent.phase;
    const updated: ArenaBattleAgent = {
      ...agent,
      severity: out.severity,
      tempC: out.tempC,
      loadPercent: out.loadPercent,
      integrity: out.integrity,
      phase: out.phase,
      failureName: out.failureName ?? agent.failureName,
      failureVisual: out.failureVisual ?? agent.failureVisual,
      failureDescription: out.failureDescription ?? agent.failureDescription,
      failureFamily: out.failureFamily ?? agent.failureFamily,
      // accumulate performance metrics across the run
      peakTempC: Math.max(agent.peakTempC, out.tempC),
      peakLoadPercent: Math.max(agent.peakLoadPercent, out.loadPercent),
      energyJ: agent.energyJ + out.powerW * dtSeconds,
      survivedLoad: Math.max(agent.survivedLoad, stressFactor),
    };

    // prevPhase can never be "failed" here — the map callback returns early for
    // already-destroyed parts — so reaching "failed" is always a fresh transition.
    if (out.phase === "failed") {
      updated.integrity = 0;
      updated.failedAtMs = elapsedMs;
      updated.failedAtLoad = stressFactor;
      failOrder.push(agent.id);
      newLogs.push({
        id: `fail-${agent.id}-${elapsedMs}`,
        kind: "failure",
        round: stressFactor,
        actorId: agent.id,
        message: `💥 ${agent.name} FAILED — ${
          out.failureName ?? "destroyed"
        } at ${sf}× load · ${Math.round(out.tempC)}°C · ${Math.round(
          out.loadPercent,
        )}% of rating.`,
      });
      highlight = { agentId: agent.id, kind: "fail", token: elapsedMs };
    } else if (out.phase === "critical" && prevPhase !== "critical") {
      newLogs.push({
        id: `crit-${agent.id}-${elapsedMs}`,
        kind: "warning",
        round: stressFactor,
        actorId: agent.id,
        message: `⚠ ${agent.name} critical — ${Math.round(
          out.loadPercent,
        )}% of rating, ${Math.round(out.tempC)}°C and climbing.`,
      });
      highlight = { agentId: agent.id, kind: "stress", token: elapsedMs };
    } else if (out.phase === "stressed" && prevPhase === "nominal") {
      newLogs.push({
        id: `stress-${agent.id}-${elapsedMs}`,
        kind: "stress",
        round: stressFactor,
        actorId: agent.id,
        message: `${agent.name} under stress — ${Math.round(
          out.loadPercent,
        )}% of rated dissipation.`,
      });
    }

    return updated;
  });

  const survivors = agents.filter((agent) => agent.phase !== "failed");
  // Ramp until EVERY part fails. Survivors keep getting pushed past the rated
  // peak into overdrive; we only stop early once the whole field is down, or if
  // a part rides all the way to the overdrive ceiling (proven indestructible).
  const hitCeiling = stressFactor >= overdriveCeiling(scenario) - 1e-6;
  const concluded = survivors.length === 0 || hitCeiling;

  if (!concluded) {
    return {
      ...prev,
      agents,
      log: capLog([...prev.log, ...newLogs]),
      status: "battling",
      winnerId: null,
      elapsedMs,
      stressFactor,
      highlight,
      failOrder,
    };
  }

  // Test over — score the field, rank it, and crown a winner.
  const { agents: ranked, ranking } = finalizeStandings(agents, scenario);
  const winnerId = ranking[0] ?? null;
  const winner = ranked.find((agent) => agent.id === winnerId) ?? null;
  const passed = survivors.length;
  const total = ranked.length;
  const totalEnergyJ = ranked.reduce((sum, agent) => sum + agent.energyJ, 0);

  const verdict: ArenaBattleLogEntry = {
    id: `verdict-${elapsedMs}`,
    kind: "verdict",
    round: stressFactor,
    message:
      passed > 0
        ? `🏁 ${scenario.name} complete — ${passed}/${total} survived ${sf}× load. 🏆 Winner: ${
            winner?.name ?? "—"
          } (score ${winner?.score ?? 0} · ${Math.round(
            winner?.peakLoadPercent ?? 0,
          )}% peak load).`
        : `🏁 ${scenario.name} complete — all ${total} failed. 🏆 Most robust: ${
            winner?.name ?? "—"
          } (score ${winner?.score ?? 0} · held to ${(
            winner?.failedAtLoad ?? 0
          ).toFixed(1)}×).`,
  };

  const summary: ArenaBattleSummary = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    survivorCount: passed,
    totalCount: total,
    peakLoad: stressFactor,
    totalEnergyJ,
    ranking,
  };

  return {
    ...prev,
    agents: ranked,
    log: capLog([...prev.log, ...newLogs, verdict]),
    status: "complete",
    winnerId,
    elapsedMs,
    stressFactor,
    highlight,
    failOrder,
    summary,
  };
}

export function useArenaBattle({ initialAgents }: UseArenaBattleOptions) {
  const stableAgents = useMemo(() => initialAgents, [initialAgents]);
  const [scenario, setScenarioState] = useState<ArenaScenario>(DEFAULT_SCENARIO);
  const [state, setState] = useState(() =>
    createInitialBattleState(stableAgents, DEFAULT_SCENARIO),
  );

  useEffect(() => {
    setState(createInitialBattleState(stableAgents, scenario));
    // Re-arm the bench whenever the roster changes. Scenario changes are handled
    // by setScenario so a mid-thought scenario swap doesn't wipe a running test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableAgents]);

  // The bench loop runs only while a test is in progress.
  useEffect(() => {
    if (state.status !== "battling") {
      return;
    }
    const timerId = window.setInterval(() => setState(step), TICK_MS);
    return () => window.clearInterval(timerId);
  }, [state.status]);

  const startTest = useCallback(() => {
    setState((previous) => {
      if (previous.status === "battling") {
        return previous;
      }
      // Re-run from a cool, intact roster each time BATTLE is pressed.
      //
      // This must be `stableAgents` (the pristine roster from props), NOT
      // `previous.agents`. createInitialBattleState passes its agents straight
      // through — it only rebuilds the log, status, timer and stress factor —
      // and after a battle `previous.agents` are the post-mortem parts:
      // phase "failed", integrity 0, peak temps retained. step() short-circuits
      // failed parts, so the re-run concluded on its very first tick with the
      // identical result and no visible run at all. resetTest always used
      // stableAgents, which is why Reset worked while re-run did nothing.
      const fresh = createInitialBattleState(stableAgents, previous.scenario);
      return {
        ...fresh,
        status: "battling",
        log: capLog([
          ...fresh.log,
          {
            id: `arena-start-${Date.now()}`,
            kind: "system",
            round: 1,
            message: `⚔ BATTLE — ${previous.scenario.icon} ${previous.scenario.name} load ramp engaged. Watching every component for the first failure…`,
          },
        ]),
      };
    });
  }, [stableAgents]);

  /**
   * The load dial. Scrubs the ramp rather than overriding it, so `stressFactor`
   * keeps exactly one definition and a running test carries on from wherever
   * the dial was left.
   */
  const setLoad = useCallback((factor: number) => {
    setState((previous) => {
      const elapsedMs = elapsedMsForStressFactor(factor, previous.scenario);
      const stressFactor = stressFactorAt(elapsedMs, previous.scenario);
      if (Math.abs(stressFactor - previous.stressFactor) < 1e-4) {
        return previous;
      }
      return { ...previous, elapsedMs, stressFactor };
    });
  }, []);

  /**
   * Open the bench without the protocol: no timed ramp, no automatic finish.
   * The supply is whatever the faders say and the parts respond to it — the
   * same physics, driven by hand instead of by a script.
   */
  const startFreeRun = useCallback(() => {
    setState((previous) => {
      const fresh = createInitialBattleState(stableAgents, previous.scenario);
      return {
        ...fresh,
        status: "battling",
        freeRun: true,
        // Starts at nominal and stays there until a fader is moved, rather
        // than beginning a climb nobody asked for.
        rampAt: 0,
        stressFactor: 1,
        log: capLog([
          ...fresh.log,
          {
            id: `free-${Date.now()}`,
            kind: "system",
            round: 1,
            message:
              "🔧 Free run — no ramp. The supply is yours; F.U.S.E. is still watching every part.",
          },
        ]),
      };
    });
  }, [stableAgents]);

  const resetTest = useCallback(() => {
    setState((previous) =>
      createInitialBattleState(stableAgents, previous.scenario),
    );
  }, [stableAgents]);

  const selectScenario = useCallback((id: string) => {
    setScenarioState(getScenario(id));
    setState((previous) => {
      if (previous.status === "battling") {
        return previous; // don't yank the bench out from under a running test
      }
      // Same reason as startTest: a scenario swap after a battle must re-arm
      // from the intact roster, not the burned-out one.
      return createInitialBattleState(stableAgents, getScenario(id));
    });
  }, [stableAgents]);

  const mostStressedId = useMemo(() => {
    let id: string | null = null;
    let worst = -1;
    for (const agent of state.agents) {
      if (agent.phase !== "failed" && agent.severity > worst) {
        worst = agent.severity;
        id = agent.id;
      }
    }
    return id;
  }, [state.agents]);

  // Fill toward the overdrive ceiling so the gauge tracks the full ramp-to-fail.
  const progress = Math.min(
    (state.stressFactor - 1) / (overdriveCeiling(state.scenario) - 1),
    1,
  );

  return {
    agents: state.agents,
    log: state.log,
    status: state.status,
    winnerId: state.winnerId,
    stressFactor: state.stressFactor,
    elapsedMs: state.elapsedMs,
    progress,
    highlight: state.highlight,
    mostStressedId,
    scenario: state.scenario,
    summary: state.summary,
    startTest,
    startFreeRun,
    freeRun: state.freeRun,
    resetTest,
    selectScenario,
    setLoad,
  };
}
