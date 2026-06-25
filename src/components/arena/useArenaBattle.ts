import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RAMP_MS,
  SETTLE_MS,
  STRESS_MAX,
  TICK_MS,
  evaluateStress,
  stressFactorAt,
  thermalFractionAt,
} from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
} from "./types";

type UseArenaBattleOptions = {
  initialAgents: ArenaBattleAgent[];
};

type ArenaBattleState = {
  agents: ArenaBattleAgent[];
  log: ArenaBattleLogEntry[];
  status: ArenaBattleStatus;
  winnerId: string | null;
  elapsedMs: number;
  stressFactor: number;
  highlight: ArenaBattleHighlight | null;
  failOrder: string[];
};

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

function createInitialBattleState(
  initialAgents: ArenaBattleAgent[],
): ArenaBattleState {
  const log: ArenaBattleLogEntry[] = [
    {
      id: "arena-intro",
      kind: "system",
      round: 1,
      message: `Bench armed — F.U.S.E. monitoring ${initialAgents.length} component${
        initialAgents.length === 1 ? "" : "s"
      }. Hit BATTLE to ramp the load and stress them to failure.`,
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
    stressFactor: 1,
    highlight: null,
    failOrder: [],
  };
}

/** Pick the most robust part: best survivor, else the part that failed last. */
function decideWinner(
  agents: ArenaBattleAgent[],
  failOrder: string[],
): string | null {
  const survivors = agents.filter((agent) => agent.phase !== "failed");
  if (survivors.length > 0) {
    const ranked = [...survivors].sort(
      (a, b) => a.severity - b.severity || a.loadPercent - b.loadPercent,
    );
    return ranked[0]?.id ?? null;
  }
  return failOrder.length > 0 ? failOrder[failOrder.length - 1] : null;
}

/** Advance the bench by one tick. Pure state transition (safe inside setState). */
function step(prev: ArenaBattleState): ArenaBattleState {
  if (prev.status !== "battling") {
    return prev;
  }

  const elapsedMs = prev.elapsedMs + TICK_MS;
  const stressFactor = stressFactorAt(elapsedMs);
  const thermalFraction = thermalFractionAt(elapsedMs);
  const newLogs: ArenaBattleLogEntry[] = [];
  const failOrder = [...prev.failOrder];
  let highlight = prev.highlight;
  const sf = stressFactor.toFixed(1);

  const agents = prev.agents.map((agent) => {
    if (agent.phase === "failed") {
      return agent; // a destroyed part stays destroyed
    }

    const out = evaluateStress(agent, stressFactor, thermalFraction);
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
    };

    // prevPhase can never be "failed" here — the map callback returns early for
    // already-destroyed parts — so reaching "failed" is always a fresh transition.
    if (out.phase === "failed") {
      updated.integrity = 0;
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
  const rampMaxed = stressFactor >= STRESS_MAX - 1e-6;
  const settleDone = rampMaxed && elapsedMs >= RAMP_MS + SETTLE_MS;
  // Run the FULL escalation so the user can watch it unfold — only stop early if
  // every component has already failed. Otherwise survivors keep getting pushed
  // up the ramp (and may still fail) right to the top, then we call the verdict.
  const concluded = survivors.length === 0 || settleDone;

  if (!concluded) {
    return {
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

  const winnerId = decideWinner(agents, failOrder);
  const winner = agents.find((agent) => agent.id === winnerId) ?? null;
  const passed = survivors.length;
  const total = agents.length;
  const verdict: ArenaBattleLogEntry = {
    id: `verdict-${elapsedMs}`,
    kind: "verdict",
    round: stressFactor,
    message:
      passed > 0
        ? `🏁 Test complete — ${passed}/${total} survived ${sf}× load. Most robust: ${
            winner?.name ?? "—"
          } (${Math.round(winner?.loadPercent ?? 0)}% of rating used).`
        : `🏁 Test complete — all ${total} components failed. Most robust: ${
            winner?.name ?? "—"
          } (last to fail).`,
  };

  return {
    agents,
    log: capLog([...prev.log, ...newLogs, verdict]),
    status: "complete",
    winnerId,
    elapsedMs,
    stressFactor,
    highlight,
    failOrder,
  };
}

export function useArenaBattle({ initialAgents }: UseArenaBattleOptions) {
  const stableAgents = useMemo(() => initialAgents, [initialAgents]);
  const [state, setState] = useState(() => createInitialBattleState(stableAgents));

  useEffect(() => {
    setState(createInitialBattleState(stableAgents));
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
      const fresh = createInitialBattleState(previous.agents);
      return {
        ...fresh,
        status: "battling",
        log: capLog([
          ...fresh.log,
          {
            id: `arena-start-${Date.now()}`,
            kind: "system",
            round: 1,
            message:
              "⚔ BATTLE — load ramp engaged. Watching every component for the first failure…",
          },
        ]),
      };
    });
  }, []);

  const resetTest = useCallback(() => {
    setState(createInitialBattleState(stableAgents));
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

  const progress = Math.min(state.elapsedMs / (RAMP_MS + SETTLE_MS), 1);

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
    startTest,
    resetTest,
  };
}
