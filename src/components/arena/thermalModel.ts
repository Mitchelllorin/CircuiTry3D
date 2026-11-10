import type { ArenaScenario } from "./scenarios";
import type { ArenaBattleAgent } from "./types";

/**
 * The temperature every datasheet rating is quoted at, °C.
 *
 * A 0.25 W resistor is 0.25 W *at 25 °C*. Nothing in the app said so before this
 * module, and on a 90 °C engine bay that number is already wrong by more than
 * half — which is exactly the thing an apprentice gets caught by.
 */
export const REFERENCE_C = 25;

/**
 * Resistance temperature coefficient, ppm/°C.
 *
 * Only the families where the coefficient is a real, stated number get one.
 * Semiconductors are deliberately absent: their temperature behaviour is a
 * forward-voltage drift of about −2 mV/°C, not a resistance change, and putting
 * a made-up ppm on a MOSFET would teach the wrong physics on the one screen
 * that exists to teach the right physics. A null here means "not specified",
 * and the console simply does not show that line.
 *
 * Copper is 3930 ppm/°C, which is why a motor winding's resistance climbs by
 * roughly 40 % between 25 °C and 125 °C. That is not a rounding error, it is
 * the reason a hot motor draws less current than a cold one.
 */
const TEMPCO_PPM: Record<string, number> = {
  resistor: 100,
  resistive: 100,
  inductor: 3930,
  coil: 3930,
  fuse: 3930,
  conductor: 3930,
  wire: 3930,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The part's coefficient, or null when the family has none to state.
 *
 * An explicitly declared `tempCoefficientPpm` property wins, so a part edited or
 * imported with a real datasheet value reports the real one rather than the
 * family default.
 */
export function tempCoefficientPpm(
  family: string,
  properties: Record<string, unknown> = {},
): number | null {
  const declared = properties.tempCoefficientPpm;
  if (typeof declared === "number" && Number.isFinite(declared)) {
    return declared;
  }
  const fallback = TEMPCO_PPM[family];
  return typeof fallback === "number" ? fallback : null;
}

/**
 * What is left of a power rating at a given ambient.
 *
 * The standard linear derating curve every datasheet prints: full rating at
 * 25 °C, zero at the junction limit, straight line between. Clamped at both
 * ends, because a part above its junction limit does not have a negative
 * rating — it has no rating at all.
 */
export function deratingFraction(
  ambientC: number,
  limitC: number,
  referenceC: number = REFERENCE_C,
): number {
  const span = limitC - referenceC;
  if (!Number.isFinite(span) || span <= 0) {
    return 1;
  }
  return clamp((limitC - ambientC) / span, 0, 1);
}

/**
 * The temperature the derating curve runs out at.
 *
 * Two conventions exist and a datasheet uses whichever it states:
 *
 *   - derate to zero at the JUNCTION limit (what a resistor's curve does), or
 *   - derate to zero at the part's rated MAXIMUM AMBIENT (what a lot of
 *     package-level and industrial parts do, and what `maxAmbientC` declares).
 *
 * A declared maximum ambient wins, because it is the number the manufacturer
 * actually committed to; it is clamped to the junction limit so a mistyped
 * value cannot claim the part runs cooler than its silicon allows.
 */
export function deratingCeilingFor(
  agent: Pick<ArenaBattleAgent, "ratings" | "properties">,
): number {
  const declared = agent.properties.maxAmbientC;
  if (typeof declared === "number" && Number.isFinite(declared)) {
    return Math.min(
      Math.max(declared, REFERENCE_C + 1),
      agent.ratings.junctionLimitC,
    );
  }
  return agent.ratings.junctionLimitC;
}

/** Rated dissipation, corrected to the ambient the bench is actually at. */
export function deratedPowerW(
  ratedW: number,
  ambientC: number,
  limitC: number,
): number {
  if (!Number.isFinite(ratedW)) {
    return Number.POSITIVE_INFINITY;
  }
  return ratedW * deratingFraction(ambientC, limitC);
}

/**
 * Resistance at a temperature: R = R₀ × (1 + α·(T − 25)).
 *
 * The linear form, which is what a tempco is defined against. It is only valid
 * near the reference — a thermistor's curve is exponential — but for a metal
 * film resistor or a copper winding over a bench's temperature range it is the
 * right model, and it is the one the datasheet's number means.
 */
export function resistanceAt(
  ohms: number,
  ppmPerC: number | null,
  tempC: number,
  referenceC: number = REFERENCE_C,
): number {
  if (!Number.isFinite(ohms) || ppmPerC == null) {
    return ohms;
  }
  const factor = 1 + (ppmPerC / 1_000_000) * (tempC - referenceC);
  // A part cannot go to zero or negative resistance without something else
  // having gone wrong first; this is a display guard, not physics.
  return ohms * Math.max(factor, 0.01);
}

/** Steady-state rise above ambient for a given dissipation: ΔT = P × θ. */
export function selfHeatingRiseC(powerW: number, thetaCPerW: number): number {
  if (!Number.isFinite(powerW) || !Number.isFinite(thetaCPerW)) {
    return 0;
  }
  return Math.max(0, powerW) * thetaCPerW;
}

export type ThermalState = "ok" | "warn" | "over";

/**
 * Everything the console needs to answer "how much margin is left?".
 *
 * `deratedW` is the number that matters and the one nothing on screen showed:
 * the part's rating adjusted to the conditions it is standing in. Comparing the
 * live wattage against the NAMEPLATE rating — which is what a bare "% of rated"
 * does — flatters a part by however much the environment has already eaten.
 */
export type ThermalReport = {
  name: string;
  family: string;
  /** Rated dissipation at 25 °C, W. */
  ratedW: number;
  /** What that rating becomes at this ambient, W. */
  deratedW: number;
  /** What the part is dissipating right now, W. */
  actualW: number;
  /** actualW / deratedW, as a percentage. Capped for display at 999. */
  utilisationPct: number;
  /** True when the percentage hit the display cap. */
  saturated: boolean;
  ambientC: number;
  tempC: number;
  limitC: number;
  /** Where the derating curve reaches zero — see deratingCeilingFor. */
  deratingCeilingC: number;
  /** Whether that ceiling is the declared max ambient or the junction limit. */
  deratingBasis: "ambient" | "junction";
  /** limitC − tempC. Negative means it is already past its limit. */
  marginC: number;
  /** tempC − ambientC: how much of the temperature the part made itself. */
  riseC: number;
  /** Thermal resistance in use, °C/W, already multiplied by the scenario. */
  thetaCPerW: number;
  /** Resistance temperature coefficient, ppm/°C, or null when unspecified. */
  tempcoPpm: number | null;
  ohmsNominal: number;
  /** Resistance at the part's CURRENT temperature. Equals nominal when no tempco. */
  ohmsHot: number;
  state: ThermalState;
  /** The load multiple the report was computed at. */
  powerFactor: number;
};

/**
 * Build the console's reading for one part.
 *
 * `powerFactor` is the load multiple the bench is driving at — the parent passes
 * the factor the physics is actually using, not the ramp's clock, because a
 * temperature or soak run holds the load at rated while the ramp climbs and the
 * two numbers are not the same thing.
 */
export function thermalReportFor(
  agent: ArenaBattleAgent | null,
  scenario: ArenaScenario,
  powerFactor: number,
): ThermalReport | null {
  if (!agent) {
    return null;
  }

  const ratedW = agent.ratings.powerRating;
  const limitC = agent.ratings.junctionLimitC;
  const ambientC = scenario.ambientC;
  const deratingCeilingC = deratingCeilingFor(agent);
  const deratedW = deratedPowerW(ratedW, ambientC, deratingCeilingC);
  const actualW = agent.metrics.power * powerFactor * powerFactor;
  const rawUtilisation =
    deratedW > 0
      ? (actualW / deratedW) * 100
      : actualW > 0
        ? Number.POSITIVE_INFINITY
        : 0;
  const tempC = agent.tempC;
  const marginC = limitC - tempC;
  const tempcoPpm = tempCoefficientPpm(agent.family, agent.properties);

  let state: ThermalState = "ok";
  if (
    agent.phase === "failed" ||
    marginC <= 0 ||
    rawUtilisation >= 100
  ) {
    state = "over";
  } else if (rawUtilisation >= 80 || marginC <= (limitC - ambientC) * 0.2) {
    state = "warn";
  }

  return {
    name: agent.name,
    family: agent.family,
    ratedW,
    deratedW,
    actualW,
    utilisationPct: Number.isFinite(rawUtilisation)
      ? Math.min(rawUtilisation, 999)
      : 999,
    saturated: !Number.isFinite(rawUtilisation),
    ambientC,
    tempC,
    limitC,
    deratingCeilingC,
    deratingBasis:
      deratingCeilingC < limitC ? "ambient" : "junction",
    marginC,
    riseC: tempC - ambientC,
    thetaCPerW: agent.ratings.thermalResistanceCPerW * scenario.convectionMul,
    tempcoPpm,
    ohmsNominal: agent.metrics.resistance,
    ohmsHot: resistanceAt(agent.metrics.resistance, tempcoPpm, tempC),
    state,
    powerFactor,
  };
}
