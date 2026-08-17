import type { ArenaBattleAgent } from "./types";

/** Top of the series-resistance fader's travel. */
export const SERIES_OHMS_MAX = 1000;
/**
 * The supply's own internal resistance. Small, but not zero — a real bench
 * supply droops under load, and without this a shorted bench would solve to
 * infinite current.
 */
export const ARENA_SOURCE_OHMS = 0.5;

/**
 * Total resistance of the LIVE branches in parallel — the load the supply is
 * actually driving.
 *
 * Failed parts are open branches and contribute nothing, which is why the
 * bank's resistance RISES as parts die, and why the survivors get hit harder
 * as the run goes on.
 */
export function parallelOhms(agents: ArenaBattleAgent[]): number {
  let conductance = 0;
  for (const agent of agents) {
    if (agent.phase === "failed") continue;
    const ohms = agent.metrics.resistance;
    if (ohms > 0) conductance += 1 / ohms;
  }
  return conductance > 0 ? 1 / conductance : Number.POSITIVE_INFINITY;
}

/**
 * The load the two supply controls jointly produce, as a multiple of nominal.
 *
 * The series resistance forms a divider with the parallel bank, so turning it
 * up genuinely starves the parts rather than merely relabelling the number —
 * the same answer the MNA solver gets, computed here because the stress engine
 * needs it before the next solve.
 *
 * Lifted out of ArenaScene when the dashboard stopped being a 3D object: the
 * faders are DOM now, so the maths that turns their positions into a load has
 * to live somewhere both the controls and the scene can reach. Keeping one
 * implementation matters more than where it sits — two would drift, and the
 * bench would disagree with itself about what load it is applying.
 */
export function loadFromSupply(
  agents: ArenaBattleAgent[],
  voltsMultiple: number,
  seriesOhms: number,
): number {
  return voltsMultiple * supplyDivider(agents, seriesOhms);
}

/**
 * The fraction of the supply's volts that actually reaches the parts.
 *
 * Exposed separately because the reverse trip matters too: while a test runs
 * the RAMP owns the load, so the volts fader has to be driven FROM the live
 * load rather than the other way round — otherwise the handle sits wherever it
 * was last dropped while the bench quietly climbs past it, and the control is
 * lying about the thing it controls.
 */
export function supplyDivider(
  agents: ArenaBattleAgent[],
  seriesOhms: number,
): number {
  const bank = parallelOhms(agents);
  return Number.isFinite(bank) ? bank / (bank + seriesOhms + ARENA_SOURCE_OHMS) : 1;
}

/**
 * The series fader's position (0–1) as an actual resistance.
 *
 * Squared, so the low end — where a few tens of ohms actually matter against a
 * bank of hundreds — gets most of the travel. Linear, every useful value would
 * sit in the first millimetre of the track.
 */
export function seriesOhmsFor(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped * clamped * SERIES_OHMS_MAX;
}

/** The inverse, for placing the handle from a resistance. */
export function seriesTFor(ohms: number): number {
  return Math.sqrt(Math.min(Math.max(ohms, 0), SERIES_OHMS_MAX) / SERIES_OHMS_MAX);
}
