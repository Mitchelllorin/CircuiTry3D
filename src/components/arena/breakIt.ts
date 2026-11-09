import type { ArenaScenario } from "./scenarios";
import { DEFAULT_SCENARIO } from "./scenarios";
import { evaluateStress, overdriveCeiling } from "./stressTest";
import type { ArenaBattleAgent, ArenaTestPhase, FuseRiskLevel } from "./types";

/**
 * BREAK IT — the deliberate-failure end of the arena.
 *
 * The battle and the bench both ramp a part until it lets go, which is the right
 * experiment and the wrong headline: nobody watching learns anything from "it
 * broke somewhere up there". Break It is the same physics with the question
 * turned round — WHERE does it break, and is that number the maker's or ours?
 *
 * Everything in here is pure. The view drives the ramp; this module answers what
 * a given load does to a part, which preset will break which part, and what the
 * record of a finished run says. That separation is what lets the presets be
 * tested without a browser: a preset that does not break its part is not a
 * preset, it is a button.
 */

/** Whose number set the limit a part is being judged against. */
export type LimitSource = "maker" | "app";

/** F.U.S.E.'s five levels, worst last. Order is the display order too. */
export const STRESS_BANDS: FuseRiskLevel[] = [
  "safe",
  "stressed",
  "warning",
  "critical",
  "failed",
];

const BAND_LABEL: Record<FuseRiskLevel, string> = {
  safe: "Safe",
  stressed: "Stressed",
  warning: "Warning",
  critical: "Critical",
  failed: "Failed",
};

export function stressBandLabel(band: FuseRiskLevel): string {
  return BAND_LABEL[band];
}

/**
 * Which of the five bands a part is in right now.
 *
 * Read from the LIVE phase and severity the tick produced, not re-derived from
 * load: a part can fail at low load in a hot room, and a bar that only counted
 * watts would still be painting it green while it was on fire.
 */
export function stressBandFor(
  severity: number,
  phase: ArenaTestPhase,
): FuseRiskLevel {
  if (phase === "failed" || severity >= 2) return "failed";
  if (phase === "critical" || severity >= 1.2) return "critical";
  if (severity >= 0.8) return "warning";
  if (phase === "stressed" || severity >= 0.45) return "stressed";
  return "safe";
}

/**
 * Whether the limit came from the maker's sheet or from CircuiTry3D's model.
 *
 * This is the distinction the whole verification pass exists for, and on a
 * stress bar it is the difference between "Littelfuse says 0.25 A" and "we
 * assumed 0.25 A". A part only counts as the maker's when it carries a real
 * identity AND imported rated thresholds — a branded-looking name with no
 * sheet behind it is still our number.
 */
export function limitSourceFor(agent: ArenaBattleAgent): LimitSource {
  const named =
    typeof agent.manufacturer === "string" && agent.manufacturer.trim().length > 0;
  const identified = Boolean(agent.partNumber || agent.componentNumber);
  const rated =
    agent.ratedThresholds?.maxPowerW != null ||
    agent.ratedThresholds?.maxTempC != null ||
    agent.ratedThresholds?.maxCurrentA != null;
  return named && identified && rated ? "maker" : "app";
}

/** "0.25 A · maker's" or "1.2 W · app's model" — always with its owner. */
export function limitLabelFor(agent: ArenaBattleAgent): string {
  const source = limitSourceFor(agent);
  const owner = source === "maker" ? "maker's" : "app's model";
  const current = agent.ratedThresholds?.maxCurrentA;
  const power = agent.ratedThresholds?.maxPowerW;
  if (typeof current === "number" && Number.isFinite(current)) {
    return `${formatAmps(current)} · ${owner}`;
  }
  if (typeof power === "number" && Number.isFinite(power)) {
    return `${formatWatts(power)} · ${owner}`;
  }
  return `${Math.round(agent.ratings.junctionLimitC)} °C · ${owner}`;
}

function formatAmps(amps: number): string {
  return amps >= 1 ? `${amps.toFixed(2)} A` : `${Math.round(amps * 1000)} mA`;
}

function formatWatts(watts: number): string {
  return watts >= 1 ? `${watts.toFixed(2)} W` : `${Math.round(watts * 1000)} mW`;
}

/** Axis a Break It run ramps. Both are what actually kills these parts. */
export type BreakAxis = "current" | "voltage";

/**
 * The lowest load multiple at which a part is destroyed, at steady state.
 *
 * Steady state (`thermalFraction = 1`) on purpose: a preset has to break its
 * part from cold, on the first run, with no warm-up — otherwise the button
 * works or not depending on how long the last run was left sitting.
 *
 * Returns null when the part rides the whole overdrive ramp, which means it has
 * no preset and the dashboard must not pretend it does.
 */
export function breakingLoadFor(
  agent: ArenaBattleAgent,
  scenario: ArenaScenario = DEFAULT_SCENARIO,
  step = 0.02,
): number | null {
  const ceiling = overdriveCeiling(scenario);
  for (let factor = 1; factor <= ceiling + 1e-9; factor += step) {
    const out = evaluateStress(agent, factor, 1, scenario);
    if (out.phase === "failed") {
      return Math.round(factor * 100) / 100;
    }
  }
  return null;
}

/**
 * The highest load below `factor` the part survives.
 *
 * This is the "holds just under the limit" half of a preset, and it is computed
 * from the same model that breaks it rather than typed in — a hand-written
 * near-miss drifts the moment a rating is corrected.
 */
export function safeLoadUnder(
  agent: ArenaBattleAgent,
  factor: number,
  scenario: ArenaScenario = DEFAULT_SCENARIO,
  step = 0.02,
): number | null {
  let safe: number | null = null;
  for (let probe = 1; probe < factor; probe += step) {
    if (evaluateStress(agent, probe, 1, scenario).phase === "failed") {
      break;
    }
    safe = Math.round(probe * 100) / 100;
  }
  // Null, not 1: a part that is already over its limit at rated load has no
  // "just under" to show, and claiming one would be the bluff this exists to
  // avoid.
  return safe;
}

export type BreakPreset = {
  id: string;
  agentId: string;
  /** What the button says: what happens to the part, never whose it is. */
  label: string;
  /** The load multiple that destroys it. */
  loadFactor: number;
  /**
   * The highest multiple it survives — the "holds just under" proof. Null when
   * the part is already past its limit at rated load.
   */
  safeFactor: number | null;
  failureName: string;
  /** Whose limit the break is measured against. */
  limitSource: LimitSource;
  limitLabel: string;
};

/**
 * What each kind of part does when it goes, in the trade's words.
 *
 * The preset is a demonstration, not a catalogue entry: we do not have the
 * makers' permission to put their names on our buttons, so a button says what
 * happens — "Overload the fuse" — and the identity of the part that breaks is
 * read off the part and its failure card, where identification is all it is.
 */
const BREAK_ACTION: Record<string, string> = {
  fuse: "Overload the fuse",
  resistor: "Burn the resistor",
  capacitor: "Blow the capacitor",
  diode: "Burn the diode",
  led: "Burn the LED",
  inductor: "Cook the coil",
  transistor: "Fry the transistor",
  mosfet: "Crack the die",
  ic: "Fry the chip",
  relay: "Weld the contacts",
  battery: "Vent the cell",
};

/**
 * The preset's caption. Generic by construction — it never reads a maker.
 *
 * Two fuses on the bench therefore share a button title; the load multiple and
 * the bar underneath are what tell them apart, and that is the honest split:
 * the action is the same, the part is not.
 */
export function presetLabel(agent: ArenaBattleAgent): string {
  const kind = (agent.componentType || agent.family || "part").toLowerCase();
  return BREAK_ACTION[kind] ?? `Break the ${kind}`;
}

/**
 * One preset per part that can actually be broken, branded parts first.
 *
 * Branded first is the order the orders ask for and the right order anyway: a
 * named part breaking at a rated limit is the claim that can be checked, and it
 * is the one worth putting at the top of a list. The button still does not name
 * it — see `presetLabel`.
 */
export function presetsFor(
  agents: ArenaBattleAgent[],
  scenario: ArenaScenario = DEFAULT_SCENARIO,
  limit = 4,
): BreakPreset[] {
  const presets: BreakPreset[] = [];
  for (const agent of agents) {
    const loadFactor = breakingLoadFor(agent, scenario);
    if (loadFactor == null) continue;
    const probe = evaluateStress(agent, loadFactor, 1, scenario);
    presets.push({
      id: `preset-${agent.id}`,
      agentId: agent.id,
      label: presetLabel(agent),
      loadFactor,
      safeFactor: safeLoadUnder(agent, loadFactor, scenario),
      failureName: probe.failureName ?? "destroyed",
      limitSource: limitSourceFor(agent),
      limitLabel: limitLabelFor(agent),
    });
  }
  presets.sort((a, b) => {
    if (a.limitSource !== b.limitSource) return a.limitSource === "maker" ? -1 : 1;
    return a.loadFactor - b.loadFactor;
  });
  return presets.slice(0, limit);
}

/** One gauge reading: the factor being ramped and what it is doing to the part. */
export type BreakGauge = {
  factor: number;
  /** Percent of the binding rating, as the tick reports it. */
  loadPercent: number;
  tempC: number;
  limitC: number;
  band: FuseRiskLevel;
  limitLabel: string;
};

export function gaugeFor(
  agent: ArenaBattleAgent | null,
  factor: number,
  scenario: ArenaScenario = DEFAULT_SCENARIO,
): BreakGauge | null {
  if (!agent) return null;
  const out = evaluateStress(agent, factor, 1, scenario);
  return {
    factor,
    loadPercent: out.loadPercent,
    tempC: out.tempC,
    limitC: agent.ratings.junctionLimitC,
    band: stressBandFor(out.severity, out.phase),
    limitLabel: limitLabelFor(agent),
  };
}

/**
 * A failed part's temperature, as a readout.
 *
 * A blown part does not cool to ambient, and it certainly does not report the
 * 25 °C it started at — a dead fuse showing "T 25.0°C" reads as cold and safe at
 * the exact moment it is neither. Failure is its own state, so it gets its own
 * word, with the temperature it actually reached.
 */
export function formatPartTemp(agent: ArenaBattleAgent): string {
  if (agent.phase === "failed") {
    return `FAILED · peaked ${Math.round(agent.peakTempC)}°C`;
  }
  return `${Math.round(agent.tempC)}°C`;
}

/** What the failure card says happened, in one line. */
export function failureHeadline(agent: ArenaBattleAgent): string {
  const name = agent.failureName ?? "Destroyed";
  const at =
    agent.failedAtLoad != null ? ` at ${agent.failedAtLoad.toFixed(2)}× rated load` : "";
  return `${name}${at}`;
}
