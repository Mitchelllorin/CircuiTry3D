import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArenaScenario } from "./scenarios";
import { DEFAULT_SCENARIO, getScenario } from "./scenarios";
import {
  AMBIENT_C,
  SETTLE_MS,
  TICK_MS,
  evaluateStress,
  stressFactorAt,
  thermalFractionAt,
} from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
  ArenaTestPhase,
} from "./types";

/**
 * SOLO performance bench — stress ONE component until it leaves its safe zone and
 * fails, then report the operating ENVELOPE the user just discovered ("playable
 * datasheet"). This is a thin single-component orchestration around the SAME
 * physics battle mode uses: it reuses `evaluateStress` (which runs the real
 * F.U.S.E. `detectFailure` thermal + I²t model) verbatim — no new failure physics,
 * no duplicated simulation. Battle mode (`useArenaBattle`) is untouched.
 */

/** Which axis the ramp drives. v1 wires `current`; the rest are reserved for v2. */
export type BenchStressor = "current" | "voltage" | "temperature" | "time";

/** One tick of the run — the points that draw the safe-operating-area curve. */
export type BenchSample = {
  /** Stressor value at this tick (amps for the current ramp). */
  value: number;
  loadPercent: number;
  tempC: number;
  severity: number;
  phase: ArenaTestPhase;
};

/** The operating envelope the user discovered by pushing the part to failure. */
export type BenchEnvelope = {
  stressor: BenchStressor;
  /** Display unit for the stressor axis (e.g. "A"). */
  unit: string;
  /** The part's rated/nominal operating point on this axis. */
  nominal: number;
  /** Highest stressor value still fully inside the safe (nominal) zone. */
  safeMax: number | null;
  /** Value where the part first left its safe zone (began to degrade). */
  degradeAt: number | null;
  /** Value at which it failed (null if it survived the whole ramp). */
  failAt: number | null;
  failTempC: number | null;
  failureName: string | null;
  /** Max value the ramp reaches — the x-axis extent of the SOA chart. */
  rampMax: number;
  /** True if the part rode the full ramp without failing. */
  survived: boolean;
};

type BenchState = {
  agent: ArenaBattleAgent | null;
  status: ArenaBattleStatus;
  elapsedMs: number;
  stressFactor: number;
  scenario: ArenaScenario;
  stressor: BenchStressor;
  samples: BenchSample[];
  envelope: BenchEnvelope | null;
  /** Internal: last stressor value seen while still in the safe (nominal) zone. */
  lastSafeValue: number | null;
  log: ArenaBattleLogEntry[];
};

type UseBenchSessionOptions = {
  /** The single component to test, already built into an arena agent, or null. */
  component: ArenaBattleAgent | null;
  /** Which axis to ramp. v1 only honours "current". */
  stressor?: BenchStressor;
};

const STRESSOR_UNIT: Record<BenchStressor, string> = {
  current: "A",
  voltage: "V",
  temperature: "°C",
  time: "s",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function capLog(entries: ArenaBattleLogEntry[]): ArenaBattleLogEntry[] {
  return entries.slice(-22);
}

function formatValue(value: number, stressor: BenchStressor): string {
  if (!Number.isFinite(value)) return "—";
  if (stressor === "current") {
    return value >= 1 ? `${value.toFixed(2)} A` : `${Math.round(value * 1000)} mA`;
  }
  return `${value.toFixed(2)} ${STRESSOR_UNIT[stressor]}`;
}

/** The part's nominal operating point on the chosen axis (the ramp's 1× value). */
function nominalFor(agent: ArenaBattleAgent, stressor: BenchStressor): number {
  switch (stressor) {
    case "voltage":
      return agent.metrics.voltage;
    case "temperature":
      return AMBIENT_C;
    case "time":
      return 0;
    case "current":
    default:
      return agent.metrics.current;
  }
}

/** Map the current ramp multiple to a value on the chosen stressor axis. */
function stressorValueAt(
  agent: ArenaBattleAgent,
  stressFactor: number,
  stressor: BenchStressor,
): number {
  // v1: only `current` is wired. Voltage scales identically; temperature/time
  // need their own ramp shapes and are handled when those stressors are wired.
  switch (stressor) {
    case "voltage":
      return agent.metrics.voltage * stressFactor;
    case "current":
    default:
      return agent.metrics.current * stressFactor;
  }
}

/** Reset a part's live telemetry to a cool, intact starting state. */
function freshAgent(agent: ArenaBattleAgent): ArenaBattleAgent {
  return {
    ...agent,
    integrity: 100,
    maxIntegrity: 100,
    severity: 0,
    tempC: AMBIENT_C,
    loadPercent: clamp(
      agent.ratings.powerRating > 0
        ? (agent.metrics.power / agent.ratings.powerRating) * 100
        : 0,
      0,
      999,
    ),
    phase: "nominal",
    failureName: null,
    failureVisual: null,
    peakTempC: AMBIENT_C,
    peakLoadPercent: 0,
    energyJ: 0,
    survivedLoad: 1,
    failedAtMs: null,
    failedAtLoad: null,
    score: 0,
    rank: 0,
  };
}

function createInitialState(
  component: ArenaBattleAgent | null,
  scenario: ArenaScenario,
  stressor: BenchStressor,
): BenchState {
  const agent = component ? freshAgent(component) : null;
  const log: ArenaBattleLogEntry[] = agent
    ? [
        {
          id: "bench-intro",
          kind: "system",
          round: 1,
          message: `Bench ready — ${
            agent.componentNumber ?? agent.name
          } on the ${scenario.icon} ${scenario.name} bench. Ramping ${stressor} to find where it leaves its safe zone and fails.`,
        },
      ]
    : [];
  return {
    agent,
    status: "ready",
    elapsedMs: 0,
    stressFactor: 1,
    scenario,
    stressor,
    samples: [],
    envelope: null,
    lastSafeValue: null,
    log,
  };
}

/** Advance the bench one tick. Pure transition (safe inside setState). */
function step(prev: BenchState): BenchState {
  if (prev.status !== "battling" || !prev.agent) {
    return prev;
  }

  const { scenario, stressor } = prev;
  const elapsedMs = prev.elapsedMs + TICK_MS;
  const stressFactor = stressFactorAt(elapsedMs, scenario);
  const thermalFraction = thermalFractionAt(elapsedMs);
  const dtSeconds = TICK_MS / 1000;
  const agent = prev.agent;

  // The SAME physics battle mode runs — the real F.U.S.E. failure model.
  const out = evaluateStress(agent, stressFactor, thermalFraction, scenario);
  const value = stressorValueAt(agent, stressFactor, stressor);
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
    peakTempC: Math.max(agent.peakTempC, out.tempC),
    peakLoadPercent: Math.max(agent.peakLoadPercent, out.loadPercent),
    energyJ: agent.energyJ + out.powerW * dtSeconds,
    survivedLoad: Math.max(agent.survivedLoad, stressFactor),
  };

  const samples = [
    ...prev.samples,
    {
      value,
      loadPercent: out.loadPercent,
      tempC: out.tempC,
      severity: out.severity,
      phase: out.phase,
    },
  ];

  const envelope: BenchEnvelope = prev.envelope
    ? { ...prev.envelope }
    : {
        stressor,
        unit: STRESSOR_UNIT[stressor],
        nominal: nominalFor(agent, stressor),
        safeMax: null,
        degradeAt: null,
        failAt: null,
        failTempC: null,
        failureName: null,
        rampMax: stressorValueAt(agent, scenario.stressMax, stressor),
        survived: false,
      };

  const newLogs: ArenaBattleLogEntry[] = [];
  let lastSafeValue = prev.lastSafeValue;
  let status: ArenaBattleStatus = prev.status;

  // ── Envelope capture: the moment it leaves the safe zone ──
  if (out.phase === "nominal") {
    lastSafeValue = value;
  } else if (prevPhase === "nominal" && envelope.degradeAt === null) {
    envelope.degradeAt = value;
    envelope.safeMax = lastSafeValue ?? value;
    newLogs.push({
      id: `bench-degrade-${elapsedMs}`,
      kind: "warning",
      round: stressFactor,
      actorId: agent.id,
      message: `⚠ Left safe zone at ${formatValue(value, stressor)} — ${Math.round(
        out.loadPercent,
      )}% of rating, ${Math.round(out.tempC)}°C.`,
    });
  }

  // ── Envelope capture: the failure point ──
  if (out.phase === "failed") {
    updated.integrity = 0;
    updated.failedAtMs = elapsedMs;
    updated.failedAtLoad = stressFactor;
    envelope.failAt = value;
    envelope.failTempC = out.tempC;
    envelope.failureName = out.failureName;
    envelope.survived = false;
    status = "complete";
    newLogs.push({
      id: `bench-fail-${elapsedMs}`,
      kind: "failure",
      round: stressFactor,
      actorId: agent.id,
      message: `💥 FAILED at ${formatValue(value, stressor)} — ${
        out.failureName ?? "destroyed"
      } · ${Math.round(out.tempC)}°C · ${Math.round(out.loadPercent)}% of rating.`,
    });
  } else {
    // Survived this tick — conclude only once the ramp has maxed out and settled.
    const rampMaxed = stressFactor >= scenario.stressMax - 1e-6;
    if (rampMaxed && elapsedMs >= scenario.rampMs + SETTLE_MS) {
      envelope.survived = true;
      envelope.failAt = null;
      status = "complete";
      newLogs.push({
        id: `bench-survived-${elapsedMs}`,
        kind: "verdict",
        round: stressFactor,
        message: `🏁 Survived the full ramp to ${formatValue(
          value,
          stressor,
        )} without failing — peaked ${Math.round(updated.peakTempC)}°C.`,
      });
    }
  }

  return {
    ...prev,
    agent: updated,
    elapsedMs,
    stressFactor,
    samples,
    envelope,
    lastSafeValue,
    log: capLog([...prev.log, ...newLogs]),
    status,
  };
}

export function useBenchSession({
  component,
  stressor = "current",
}: UseBenchSessionOptions) {
  const [scenario, setScenarioState] = useState<ArenaScenario>(DEFAULT_SCENARIO);
  const [state, setState] = useState<BenchState>(() =>
    createInitialState(component, DEFAULT_SCENARIO, stressor),
  );

  // Re-arm the bench whenever the component or stressor changes.
  useEffect(() => {
    setState(createInitialState(component, scenario, stressor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component, stressor]);

  // The ramp loop runs only while a test is in progress.
  useEffect(() => {
    if (state.status !== "battling") {
      return;
    }
    const timerId = window.setInterval(() => setState(step), TICK_MS);
    return () => window.clearInterval(timerId);
  }, [state.status]);

  const startTest = useCallback(() => {
    setState((previous) => {
      if (previous.status === "battling" || !previous.agent) {
        return previous;
      }
      const fresh = createInitialState(
        previous.agent,
        previous.scenario,
        previous.stressor,
      );
      return {
        ...fresh,
        status: "battling",
        log: capLog([
          ...fresh.log,
          {
            id: `bench-start-${Date.now()}`,
            kind: "system",
            round: 1,
            message: `▶ Ramping ${previous.stressor} — pushing ${
              previous.agent.componentNumber ?? previous.agent.name
            } until it leaves its safe zone…`,
          },
        ]),
      };
    });
  }, []);

  const resetTest = useCallback(() => {
    setState((previous) =>
      createInitialState(previous.agent, previous.scenario, previous.stressor),
    );
  }, []);

  const selectScenario = useCallback((id: string) => {
    const next = getScenario(id);
    setScenarioState(next);
    setState((previous) => {
      if (previous.status === "battling") {
        return previous; // don't yank a running test
      }
      return createInitialState(previous.agent, next, previous.stressor);
    });
  }, []);

  const progress = Math.min(
    state.elapsedMs / (state.scenario.rampMs + SETTLE_MS),
    1,
  );

  const agents = useMemo(
    () => (state.agent ? [state.agent] : []),
    [state.agent],
  );

  return {
    agent: state.agent,
    /** Single-element array for feeding the existing 3D scene / cards. */
    agents,
    status: state.status,
    stressFactor: state.stressFactor,
    elapsedMs: state.elapsedMs,
    progress,
    scenario: state.scenario,
    stressor: state.stressor,
    samples: state.samples,
    envelope: state.envelope,
    log: state.log,
    startTest,
    resetTest,
    selectScenario,
  };
}
