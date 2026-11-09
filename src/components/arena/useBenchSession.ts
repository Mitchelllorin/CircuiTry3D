import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArenaScenario } from "./scenarios";
import { DEFAULT_SCENARIO, getScenario } from "./scenarios";
import {
  AMBIENT_C,
  TICK_MS,
  elapsedMsForStressFactor,
  evaluateStress,
  overdriveCeiling,
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
  /**
   * Load the ramp is being HELD at, or null while it climbs on its own.
   *
   * Hold is the difference between "drive it harder" and "leave it there and
   * let the heat build": the load stops moving, the bench clock does not, so a
   * part can be parked at a number and watched until it gives up.
   */
  heldFactor: number | null;
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

/** How each axis is named in a sentence, for the log. */
export const STRESSOR_LABEL: Record<BenchStressor, string> = {
  current: "current",
  voltage: "voltage",
  temperature: "ambient temperature",
  time: "soak time",
};

/**
 * Ambient rise the temperature ramp adds by the time it reaches the rated peak.
 *
 * 150 °C across the rated ramp, so a 25 °C bench ramps to 175 °C at the peak
 * and keeps going into overdrive — past every junction limit the bench holds,
 * which is what makes it a fair test rather than a demonstration of nothing.
 */
export const TEMPERATURE_RAMP_SPAN_C = 150;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function capLog(entries: ArenaBattleLogEntry[]): ArenaBattleLogEntry[] {
  return entries.slice(-22);
}

/** One value on an axis, formatted with its unit. Always a unit: no bare numbers. */
export function formatAxisValue(value: number, stressor: BenchStressor): string {
  if (!Number.isFinite(value)) return "—";
  switch (stressor) {
    case "voltage":
      return `${value.toFixed(2)} ${STRESSOR_UNIT.voltage}`;
    case "temperature":
      // Whole degrees: a junction limit is not meaningful to a tenth of one.
      return `${value.toFixed(0)} ${STRESSOR_UNIT.temperature}`;
    case "time":
      return `${value.toFixed(1)} ${STRESSOR_UNIT.time}`;
    case "current":
    default:
      return value >= 1
        ? `${value.toFixed(2)} ${STRESSOR_UNIT.current}`
        : `${Math.round(value * 1000)} mA`;
  }
}

/** The part's nominal operating point on the chosen axis (the ramp's 1× value). */
function nominalFor(
  agent: ArenaBattleAgent,
  stressor: BenchStressor,
  scenario: ArenaScenario,
): number {
  switch (stressor) {
    case "voltage":
      return agent.metrics.voltage;
    case "temperature":
      // The part starts the run soaked at the bench's ambient, not at 25 °C.
      return scenario.ambientC;
    case "time":
      return 0;
    case "current":
    default:
      return agent.metrics.current;
  }
}

/**
 * Ambient at a point on the ramp, °C.
 *
 * Linear between the scenario's soak temperature and +150 °C at the rated peak,
 * then on past it with the ramp — the same shape the load ramp has, because it
 * is the same experiment with a different knob.
 */
export function ambientAt(
  stressFactor: number,
  scenario: ArenaScenario,
): number {
  const span = Math.max(scenario.stressMax - 1, 1e-6);
  return (
    scenario.ambientC +
    Math.max(0, stressFactor - 1) * (TEMPERATURE_RAMP_SPAN_C / span)
  );
}

/**
 * A value on the chosen axis, at a point in the run.
 *
 * The one place the axis vocabulary lives. The scene, the envelope and the
 * safe-operating-area marker all read this, so the axis a result is drawn on is
 * the axis the run was actually driven along.
 */
export function stressorValueAt(
  agent: ArenaBattleAgent,
  stressFactor: number,
  stressor: BenchStressor,
  scenario: ArenaScenario,
  elapsedMs: number,
): number {
  switch (stressor) {
    case "voltage":
      return agent.metrics.voltage * stressFactor;
    case "temperature":
      return ambientAt(stressFactor, scenario);
    case "time":
      return Math.max(0, elapsedMs) / 1000;
    case "current":
    default:
      return agent.metrics.current * stressFactor;
  }
}

/** The far end of the axis — what the ramp reaches at the overdrive ceiling. */
function axisCeilingFor(
  agent: ArenaBattleAgent,
  scenario: ArenaScenario,
  stressor: BenchStressor,
): number {
  if (stressor === "time") {
    return scenario.rampMs / 1000;
  }
  return stressorValueAt(
    agent,
    overdriveCeiling(scenario),
    stressor,
    scenario,
    0,
  );
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
    failureDescription: null,
    failureFamily: null,
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
          } on the ${scenario.icon} ${scenario.name} bench. Ramping ${STRESSOR_LABEL[stressor]} to find where it leaves its safe zone and fails.`,
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
    heldFactor: null,
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
  // A soak holds the rated load and lets heat build on the part's own thermal
  // constant; every other axis climbs the ramp.
  const isSoak = stressor === "time";
  const stressFactor =
    prev.heldFactor != null
      ? prev.heldFactor
      : isSoak
        ? 1
        : stressFactorAt(elapsedMs, scenario);
  const thermalFraction = thermalFractionAt(elapsedMs);
  const dtSeconds = TICK_MS / 1000;
  const agent = prev.agent;

  // What the drive actually does. A temperature ramp raises the ROOM and holds
  // the load at rated — the part fails because its junction limit got closer,
  // not because it was overdriven, and conflating the two would report the
  // wrong cause on a bench whose job is to report the cause.
  const driveFactor =
    stressor === "current" || stressor === "voltage" ? stressFactor : 1;
  const ambientOverride =
    stressor === "temperature" ? ambientAt(stressFactor, scenario) : undefined;

  // The SAME physics battle mode runs — the real F.U.S.E. failure model.
  const out = evaluateStress(
    agent,
    driveFactor,
    thermalFraction,
    scenario,
    ambientOverride,
  );
  const value = stressorValueAt(agent, stressFactor, stressor, scenario, elapsedMs);
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
    peakTempC: Math.max(agent.peakTempC, out.tempC),
    peakLoadPercent: Math.max(agent.peakLoadPercent, out.loadPercent),
    energyJ: agent.energyJ + out.powerW * dtSeconds,
    survivedLoad: Math.max(agent.survivedLoad, driveFactor),
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
        nominal: nominalFor(agent, stressor, scenario),
        safeMax: null,
        degradeAt: null,
        failAt: null,
        failTempC: null,
        failureName: null,
        rampMax: axisCeilingFor(agent, scenario, stressor),
        survived: false,
      };

  // Grow the SOA axis to track the overdrive extent so the fail marker stays in
  // range even when the part is pushed well past its rated peak.
  envelope.rampMax = Math.max(envelope.rampMax, value);

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
      message: `⚠ Left safe zone at ${formatAxisValue(value, stressor)} — ${Math.round(
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
      message: `💥 FAILED at ${formatAxisValue(value, stressor)} — ${
        out.failureName ?? "destroyed"
      } · ${Math.round(out.tempC)}°C · ${Math.round(out.loadPercent)}% of rating.`,
    });
  } else {
    // Survived this tick — keep ramping past the rated peak into overdrive until
    // the part fails. Only conclude as a PASS if it rides all the way to the
    // overdrive ceiling (genuinely indestructible on this bench).
    const hitCeiling = isSoak
      ? elapsedMs >= scenario.rampMs
      : stressFactor >= overdriveCeiling(scenario) - 1e-6;
    if (hitCeiling) {
      envelope.survived = true;
      envelope.failAt = null;
      status = "complete";
      // What it did depends on what was being ramped: a soak is a duration, a
      // load ramp is a multiple. One sentence, but it has to be the right one.
      const rode = isSoak
        ? `soaked at rated load for ${formatAxisValue(value, stressor)}`
        : `rode past ${formatAxisValue(value, stressor)} (${stressFactor.toFixed(
            1,
          )}× rated)`;
      newLogs.push({
        id: `bench-survived-${elapsedMs}`,
        kind: "verdict",
        round: stressFactor,
        message: `🏁 Indestructible on this bench — ${rode} without failing, peaking ${Math.round(
          updated.peakTempC,
        )}°C.`,
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
            message: `▶ Ramping ${
              STRESSOR_LABEL[previous.stressor]
            } — pushing ${
              previous.agent.componentNumber ?? previous.agent.name
            } until it leaves its safe zone…`,
          },
        ]),
      };
    });
  }, []);

  /** The load dial — scrubs the ramp, same as the battle bench. */
  const setLoad = useCallback((factor: number) => {
    setState((previous) => {
      // The dial scrubs a LOAD ramp. A soak holds rated load and a temperature
      // ramp holds it while the room heats, so there is nothing here for the
      // handle to scrub — dragging it would silently change the load those
      // experiments are defined as holding steady.
      if (previous.stressor !== "current" && previous.stressor !== "voltage") {
        return previous;
      }
      const elapsedMs = elapsedMsForStressFactor(factor, previous.scenario);
      const stressFactor = stressFactorAt(elapsedMs, previous.scenario);
      // Dragging the ramp takes the hold off: the handle is the load again.
      if (Math.abs(stressFactor - previous.stressFactor) < 1e-4 && previous.heldFactor == null) {
        return previous;
      }
      return { ...previous, elapsedMs, stressFactor, heldFactor: null };
    });
  }, []);

  /**
   * Park the load at a factor and keep the clock running.
   *
   * Used by Break It's presets and its Hold button: the part sits at exactly the
   * number on the dial while heat accumulates on its own thermal constant —
   * which is how a real part fails, and how a preset proves it breaks.
   */
  const holdAt = useCallback((factor: number) => {
    setState((previous) => {
      if (previous.status !== "battling") {
        return previous;
      }
      return { ...previous, heldFactor: factor, stressFactor: factor };
    });
  }, []);

  const releaseHold = useCallback(() => {
    setState((previous) => {
      if (previous.heldFactor == null) {
        return previous;
      }
      // Resume the ramp from the point the hold was at, not from where the
      // clock had got to — otherwise letting go jumps the load forward by
      // however long the part was parked.
      const elapsedMs = elapsedMsForStressFactor(previous.heldFactor, previous.scenario);
      return { ...previous, heldFactor: null, elapsedMs };
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

  // Fill toward the overdrive ceiling so the gauge tracks the full ramp-to-fail;
  // a soak's extent is its clock, not its load.
  const progress =
    state.stressor === "time"
      ? Math.min(state.elapsedMs / Math.max(state.scenario.rampMs, 1), 1)
      : Math.min(
          (state.stressFactor - 1) / (overdriveCeiling(state.scenario) - 1),
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
    heldFactor: state.heldFactor,
    startTest,
    resetTest,
    selectScenario,
    setLoad,
    holdAt,
    releaseHold,
  };
}
