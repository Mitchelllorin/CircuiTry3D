/**
 * Thermal model — per component, then per circuit.
 *
 * The workspace used to report one temperature: `workingC + P × θ`, with θ
 * defaulting to 60 °C/W for every part and no limits anywhere. This module is
 * the single place that physics is worked out, so the readout, the plate and
 * the circuit summary cannot disagree.
 *
 * Per component:
 *
 *   θ_eff   = θ_JA   (or the parallel combination of θ_JA and a heatsink path)
 *   P       = I² · R(T)                     (measured power is preferred)
 *   R(T)    = R₂₅ · (1 + α(T − 25))         (temperature coefficient)
 *   T_j     = T_amb + P · θ_eff
 *
 * With α the last two are implicit, so they are solved in closed form:
 *
 *   T_j = (T_amb + θ·I²·R₂₅·(1 − 25α)) / (1 − θ·I²·R₂₅·α)
 *
 * A denominator at or below zero is thermal runaway — P rises faster with
 * temperature than the part can shed it, and no steady state exists. That is
 * reported, not silently clamped.
 *
 * Junction temperature also settles over time: ΔT(t) = ΔT_ss · (1 − e^(−t/τ)).
 * τ comes from the part when it declares one.
 */

export const AMBIENT_FALLBACK_C = 25;
export const DEFAULT_THETA_JA_C_PER_W = 60;
/** Fraction of the headroom to the limit at which a part is called warning. */
export const WARN_HEADROOM_UTILISATION = 0.75;

export type ThermalStatus = "ok" | "warn" | "over";

export type ThermalInput = {
  id: string;
  /** Printed name for summaries, e.g. "R1". Falls back to the id. */
  label?: string;
  /** Component type/family, used by the caller to pick a junction limit. */
  type?: string;
  /** Dissipation, W. Negative/NaN are treated as 0 (a passive part). */
  powerW: number;
  /** Declared junction-to-ambient thermal resistance, °C/W. */
  thetaCPerW?: number;
  /** A heatsink's thermal resistance to ambient, in parallel with the package. */
  heatsinkThetaCPerW?: number;
  ambientC?: number;
  /** Junction (or case) limit for the part's family, °C. */
  limitC?: number;
  /** Temperature coefficient of resistance, per °C, referenced to 25 °C. */
  alphaPerC?: number;
  /** Resistance at 25 °C, Ω — required for the α correction to mean anything. */
  referenceResistanceOhm?: number;
  /** Current through the part, A — required for the α correction. */
  currentA?: number;
  /** Thermal time constant, s. */
  thermalTimeConstantS?: number;
  /** How long current has been flowing, s. Omit for steady state. */
  secondsEnergised?: number;
};

export type ComponentThermal = {
  id: string;
  label: string;
  powerW: number;
  thetaCPerW: number;
  /** Steady-state rise above ambient, °C. */
  settledRiseC: number;
  /** Rise at `secondsEnergised` (equal to settledRiseC at steady state). */
  riseC: number;
  junctionC: number;
  settledJunctionC: number;
  ambientC: number;
  limitC: number | null;
  headroomC: number | null;
  /** rise / (limit − ambient). 1.0 is at the limit. */
  utilisation: number | null;
  status: ThermalStatus;
  /** The dissipation this part could shed at this ambient before its limit. */
  deratedPowerW: number | null;
  /** True when the α-corrected solve has no steady state. */
  thermalRunaway: boolean;
  /** R(T_j) / R₂₅, when the α correction was applied. */
  resistanceRatio: number | null;
  temperatureCoefficientPerC: number | null;
};

export type CircuitThermal = {
  ambientC: number;
  totalPowerW: number;
  /** Power-weighted thermal resistance — the circuit's effective °C/W. */
  weightedThetaCPerW: number | null;
  hottest: ComponentThermal | null;
  maxJunctionC: number;
  /** Power-weighted mean junction temperature. */
  meanJunctionC: number | null;
  minHeadroomC: number | null;
  overCount: number;
  warnCount: number;
  status: ThermalStatus;
  components: ComponentThermal[];
};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positiveOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Effective junction-to-ambient thermal resistance.
 *
 * A heatsink does not add to θ_JA, it offers a second path to ambient, so the
 * two combine in parallel:
 *
 *   θ_eff = θ_JA · θ_HS / (θ_JA + θ_HS)
 *
 * which is always smaller than either alone — the physical requirement.
 */
export function effectiveThetaCPerW(
  thetaCPerW: number | undefined,
  heatsinkThetaCPerW?: number,
): number {
  const packageTheta = Math.max(finiteOr(thetaCPerW, DEFAULT_THETA_JA_C_PER_W), 0);
  const heatsinkTheta = positiveOrNull(heatsinkThetaCPerW);
  if (heatsinkTheta === null) {
    return packageTheta;
  }
  if (packageTheta <= 0) {
    return heatsinkTheta;
  }
  return (packageTheta * heatsinkTheta) / (packageTheta + heatsinkTheta);
}

/** ΔT(t) = ΔT_ss · (1 − e^(−t/τ)). Steady state when no τ or no elapsed time. */
export function settledFraction(
  secondsEnergised: number | undefined,
  thermalTimeConstantS: number | undefined,
): number {
  const tau = positiveOrNull(thermalTimeConstantS);
  // No declared thermal mass means the part is modelled at steady state, not
  // as instantly cold — the default was silently reading as 0 % of its rise.
  if (tau === null) {
    return 1;
  }
  const seconds = finiteOr(secondsEnergised, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(seconds)) {
    return 1;
  }
  if (seconds <= 0) {
    return 0;
  }
  return 1 - Math.exp(-seconds / tau);
}

/**
 * Steady-state junction temperature, including the temperature coefficient.
 *
 * Without α this is the textbook T_amb + P·θ. With α, resistance (and therefore
 * dissipation) depends on the temperature being solved for, so the linear
 * system is solved directly rather than iterated.
 */
export function steadyJunctionC(input: {
  ambientC: number;
  powerW: number;
  thetaCPerW: number;
  alphaPerC?: number;
  referenceResistanceOhm?: number;
  currentA?: number;
}): { junctionC: number; thermalRunaway: boolean; resistanceRatio: number | null } {
  const ambientC = finiteOr(input.ambientC, AMBIENT_FALLBACK_C);
  const theta = Math.max(finiteOr(input.thetaCPerW, 0), 0);
  const alpha = finiteOr(input.alphaPerC, 0);
  const resistance = positiveOrNull(input.referenceResistanceOhm);
  const current = typeof input.currentA === "number" && Number.isFinite(input.currentA)
    ? Math.abs(input.currentA)
    : null;

  const plainRise = Math.max(finiteOr(input.powerW, 0), 0) * theta;

  if (!alpha || resistance === null || current === null) {
    return { junctionC: ambientC + plainRise, thermalRunaway: false, resistanceRatio: null };
  }

  const i2r = current * current * resistance;
  const denominator = 1 - theta * i2r * alpha;
  if (denominator <= 0) {
    // P grows faster with T than the part can shed. No steady state exists.
    return { junctionC: ambientC + plainRise, thermalRunaway: true, resistanceRatio: null };
  }

  const junctionC = (ambientC + theta * i2r * (1 - 25 * alpha)) / denominator;
  const resistanceRatio = 1 + alpha * (junctionC - 25);
  return {
    junctionC: Math.max(junctionC, ambientC),
    thermalRunaway: false,
    resistanceRatio: resistanceRatio > 0 ? resistanceRatio : null,
  };
}

function statusFor(junctionC: number, ambientC: number, limitC: number | null): {
  status: ThermalStatus;
  utilisation: number | null;
  headroomC: number | null;
} {
  if (limitC === null) {
    return { status: "ok", utilisation: null, headroomC: null };
  }
  const headroomC = limitC - junctionC;
  const span = limitC - ambientC;
  const utilisation = span > 0 ? (junctionC - ambientC) / span : junctionC >= limitC ? 1 : 0;
  const status: ThermalStatus =
    junctionC >= limitC ? "over" : utilisation >= WARN_HEADROOM_UTILISATION ? "warn" : "ok";
  return { status, utilisation, headroomC };
}

export function computeComponentThermal(input: ThermalInput): ComponentThermal {
  const ambientC = finiteOr(input.ambientC, AMBIENT_FALLBACK_C);
  const limitC = positiveOrNull(input.limitC);
  const thetaCPerW = effectiveThetaCPerW(input.thetaCPerW, input.heatsinkThetaCPerW);
  const powerW = Math.max(finiteOr(input.powerW, 0), 0);
  const alphaPerC = typeof input.alphaPerC === "number" && Number.isFinite(input.alphaPerC)
    ? input.alphaPerC
    : null;

  const steady = steadyJunctionC({
    ambientC,
    powerW,
    thetaCPerW,
    alphaPerC: alphaPerC ?? undefined,
    referenceResistanceOhm: input.referenceResistanceOhm,
    currentA: input.currentA,
  });

  const settledRiseC = Math.max(steady.junctionC - ambientC, 0);
  const fraction = settledFraction(input.secondsEnergised, input.thermalTimeConstantS);
  const riseC = settledRiseC * fraction;
  const junctionC = ambientC + riseC;
  const { status, utilisation, headroomC } = statusFor(junctionC, ambientC, limitC);

  return {
    id: input.id,
    label: input.label ?? input.id,
    powerW,
    thetaCPerW,
    settledRiseC,
    riseC,
    junctionC,
    settledJunctionC: steady.junctionC,
    ambientC,
    limitC,
    headroomC,
    utilisation,
    status,
    deratedPowerW:
      limitC !== null && thetaCPerW > 0 ? Math.max(limitC - ambientC, 0) / thetaCPerW : null,
    thermalRunaway: steady.thermalRunaway,
    resistanceRatio: steady.resistanceRatio,
    temperatureCoefficientPerC: alphaPerC,
  };
}

/**
 * Circuit-level thermal summary.
 *
 * There is no single junction temperature for a board, so the honest circuit
 * figures are: how much heat is being made, the effective θ the whole board
 * presents (power-weighted), and which part is closest to its own limit. The
 * hottest part is the one that fails first, which is the number worth showing.
 */
export function summariseCircuitThermal(
  rows: ComponentThermal[],
  ambientC?: number,
): CircuitThermal {
  const ambient = finiteOr(ambientC, rows[0]?.ambientC ?? AMBIENT_FALLBACK_C);
  const totalPowerW = rows.reduce((sum, row) => sum + Math.max(row.powerW, 0), 0);

  let weightedTheta = 0;
  let weightedJunction = 0;
  let hottest: ComponentThermal | null = null;
  let minHeadroomC: number | null = null;
  let overCount = 0;
  let warnCount = 0;

  for (const row of rows) {
    weightedTheta += Math.max(row.powerW, 0) * row.thetaCPerW;
    weightedJunction += Math.max(row.powerW, 0) * row.junctionC;
    if (!hottest || row.junctionC > hottest.junctionC) {
      hottest = row;
    }
    if (row.headroomC !== null && (minHeadroomC === null || row.headroomC < minHeadroomC)) {
      minHeadroomC = row.headroomC;
    }
    if (row.status === "over") overCount += 1;
    else if (row.status === "warn") warnCount += 1;
  }

  const status: ThermalStatus = overCount > 0 ? "over" : warnCount > 0 ? "warn" : "ok";

  return {
    ambientC: ambient,
    totalPowerW,
    weightedThetaCPerW: totalPowerW > 0 ? weightedTheta / totalPowerW : null,
    hottest,
    maxJunctionC: hottest ? hottest.junctionC : ambient,
    meanJunctionC: totalPowerW > 0 ? weightedJunction / totalPowerW : rows.length ? ambient : null,
    minHeadroomC,
    overCount,
    warnCount,
    status,
    components: rows,
  };
}
