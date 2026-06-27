/**
 * The physics of the Arena bench. Each tick we drive every component past its
 * nominal operating point by a global "stress factor" (the load ramp), let heat
 * build with a first-order thermal model, and ask F.U.S.E. — the SAME engine the
 * 3D builder uses — whether the part is stressed, critical, or destroyed.
 *
 * This is what turns the Arena from a cosmetic light-show into a real-time
 * performance test: parts fail for real reasons (over-power, over-current,
 * over-temperature) and in the order their physical ratings dictate.
 */
import { detectFailure } from "./fuse";
import type { ArenaScenario } from "./scenarios";
import { DEFAULT_SCENARIO } from "./scenarios";
import type { ArenaBattleAgent, ArenaTestPhase } from "./types";

/** Default soak temperature for a part shown before any test runs. */
export const AMBIENT_C = DEFAULT_SCENARIO.ambientC;

/** Peak load the default-scenario ramp reaches (× nominal). Scenario-tunable. */
export const STRESS_MAX = DEFAULT_SCENARIO.stressMax;
/** Default ramp duration (ms). Each scenario overrides this. */
export const RAMP_MS = DEFAULT_SCENARIO.rampMs;
/** Thermal time constant (ms): how fast a part approaches its steady temperature.
 *  Deliberately slow so heat (and the shake/glow that track it) visibly builds
 *  over several seconds before a part lets go — you watch it strain, then fail. */
export const THERMAL_TAU_MS = 8500;
/** Test loop period (ms). */
export const TICK_MS = 120;
/** Once the ramp is maxed, hold this long before calling survivors a PASS. */
export const SETTLE_MS = 1600;

export type StressOutcome = {
  severity: number;
  tempC: number;
  loadPercent: number;
  integrity: number;
  phase: ArenaTestPhase;
  failed: boolean;
  failureName: string | null;
  failureVisual: string | null;
  /** Instantaneous dissipation at this tick, W — used to integrate energy. */
  powerW: number;
};

/** Load factor (× nominal) at a given elapsed time, clamped to the scenario peak. */
export function stressFactorAt(
  elapsedMs: number,
  scenario: ArenaScenario = DEFAULT_SCENARIO,
): number {
  const t = Math.max(0, elapsedMs) / scenario.rampMs;
  return 1 + Math.min(t, 1) * (scenario.stressMax - 1);
}

/** Fraction of steady-state heat accumulated so far (0 → 1). */
export function thermalFractionAt(elapsedMs: number): number {
  return 1 - Math.exp(-Math.max(0, elapsedMs) / THERMAL_TAU_MS);
}

function phaseForSeverity(severity: number): ArenaTestPhase {
  if (severity >= 2) return "failed";
  if (severity >= 1.2) return "critical";
  if (severity >= 0.45) return "stressed";
  return "nominal";
}

/**
 * Evaluate one component at the current ramp + thermal state.
 *
 * @param agent           the component under test (nominal metrics + ratings)
 * @param stressFactor    current load multiple (from stressFactorAt)
 * @param thermalFraction current heat fraction (from thermalFractionAt)
 */
export function evaluateStress(
  agent: ArenaBattleAgent,
  stressFactor: number,
  thermalFraction: number,
  scenario: ArenaScenario = DEFAULT_SCENARIO,
): StressOutcome {
  const { metrics, ratings } = agent;
  const ambientC = scenario.ambientC;

  // Drive the operating point up the ramp. Voltage and current scale linearly;
  // power follows V·I, so it scales with the square of the load.
  const voltage = metrics.voltage * stressFactor;
  const current = metrics.current * stressFactor;
  const instantaneousPower = metrics.power * stressFactor * stressFactor;

  // Effective (thermally-scaled) dissipation — what F.U.S.E.'s overpower model
  // compares against the rating, mirroring the builder's buildFailureMetrics.
  const effectivePower = instantaneousPower * thermalFraction;

  // Convection: the scenario scales the part's thermal resistance. Vacuum/still
  // air trap heat (>1, hotter), a cold plate or forced air pulls it away (<1).
  const thermalResistance = ratings.thermalResistanceCPerW * scenario.convectionMul;

  // Real body-temperature rise (no fudge factor) so the °C gauge is believable,
  // referenced to the scenario's ambient soak temperature.
  const thermalRise = instantaneousPower * thermalResistance * thermalFraction;
  const tempC = ambientC + thermalRise;

  const result = detectFailure(
    { type: agent.componentType, properties: agent.properties },
    {
      powerDissipation: effectivePower,
      currentRms: current,
      operatingVoltage: voltage,
      thermalRise,
      ambientTemperature: ambientC,
      impedance: metrics.resistance,
    },
  );

  // Mechanical stress (vibration) adds wear that scales with how hard the part is
  // being pushed — solder-joint / lead fatigue the engine's electrical model
  // doesn't see. It nudges severity up so vibration-heavy scenarios fail sooner.
  const vibrationSeverity =
    scenario.vibration * Math.max(0, stressFactor - 1) * 0.45;

  const severity = Math.max(0, Math.min(3, result.severity + vibrationSeverity));

  // Headroom used against the binding rating (power or current, whichever is
  // tighter) — drives the "% of rating" gauge.
  const powerPercent =
    ratings.powerRating > 0 ? (effectivePower / ratings.powerRating) * 100 : 0;
  const currentPercent = Number.isFinite(ratings.maxCurrent)
    ? (current / ratings.maxCurrent) * 100
    : 0;
  const loadPercent = Math.max(powerPercent, currentPercent);

  // Integrity falls to zero at severity 2 (the failure threshold).
  const integrity = Math.max(0, Math.min(100, 100 * (1 - severity / 2)));

  return {
    severity,
    tempC,
    loadPercent,
    integrity,
    phase: phaseForSeverity(severity),
    failed: severity >= 2,
    failureName: result.name,
    failureVisual: result.visual,
    powerW: instantaneousPower,
  };
}
