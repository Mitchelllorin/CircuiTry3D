/**
 * Typed bridge to the F.U.S.E.™ (Failure Understanding Simulation Engine) global.
 *
 * The engine itself lives in `public/js/component-failure-engine.js` and is loaded
 * via a <script> tag in index.html, where it attaches itself to
 * `window.FailureEngine`. It is the SAME zero-dependency physics layer the 3D
 * builder uses, so the Arena stress-test bench reports real, consistent failures.
 *
 * Everything here degrades gracefully: if the global is ever missing (e.g. a unit
 * test or a stripped build), a compact local overpower/overcurrent/overtemp model
 * stands in so the Arena keeps working. The real engine is always preferred.
 */

export type FuseMetrics = {
  /** Effective (thermally-scaled) power dissipation, W. */
  powerDissipation: number;
  /** RMS current through the part, A. */
  currentRms: number;
  /** Voltage across / applied to the part, V. */
  operatingVoltage: number;
  /** Temperature rise above ambient, °C. */
  thermalRise: number;
  /** Ambient temperature, °C (defaults to 25 inside the engine). */
  ambientTemperature?: number;
  /** Part impedance, Ω. */
  impedance?: number;
};

export type FuseResult = {
  /** True once severity ≥ 2 (the part is destroyed / open). */
  failed: boolean;
  /** 0 = OK, 1 = stressed, 2 = critical, 3 = destroyed. */
  severity: number;
  /** Human-readable failure-mode name, e.g. "Thermal Overload". */
  name: string | null;
  /** Renderer effect key: char | blowout | melt | arc | burst | vent | smoke | glow. */
  visual: string | null;
  /** Physics narrative of what is happening inside the part. */
  description: string | null;
  /** Canonical physics family the engine resolved this part to. */
  family: string | null;
};

type FuseComponent = {
  type: string;
  properties: Record<string, unknown>;
};

type FuseGlobal = {
  FUSE_VERSION?: string;
  detectFailure: (component: FuseComponent, metrics: FuseMetrics) => FuseResult;
  resolveComponentFamily: (
    type: string,
    props?: Record<string, unknown>,
  ) => string;
  COMPONENT_PROFILES?: Record<
    string,
    { defaultProperties?: Record<string, unknown> }
  >;
  COMPONENT_PHYSICAL_SPECS?: Record<
    string,
    { junctionLimitC?: number; absoluteMaxTempC?: number }
  >;
};

function getFuse(): FuseGlobal | null {
  if (typeof window === "undefined") {
    return null;
  }
  const engine = (window as unknown as { FailureEngine?: FuseGlobal })
    .FailureEngine;
  return engine && typeof engine.detectFailure === "function" ? engine : null;
}

/** True when the real engine is present (used for a "F.U.S.E. armed" badge). */
export function isFuseAvailable(): boolean {
  return getFuse() !== null;
}

export function fuseVersion(): string | null {
  return getFuse()?.FUSE_VERSION ?? null;
}

/** Resolve any raw type string to a canonical physics family. */
export function resolveFamily(
  type: string,
  props?: Record<string, unknown>,
): string {
  // The easter eggs are resolved HERE, ahead of the engine. The engine is the
  // physics authority and stays the authority for everything else; these parts
  // are not physics, and the engine has no profile for any of them — which is
  // exactly how one ends up on a bench looking like a resistor.
  const egg = easterEggFor(type, props);
  if (egg) {
    return egg.family;
  }
  const engine = getFuse();
  if (engine) {
    try {
      return engine.resolveComponentFamily(type, props);
    } catch {
      /* fall through to the local guess */
    }
  }
  return localResolveFamily(type, props);
}

/** Per-family default electrical/thermal properties (from the engine's profiles). */
export function familyDefaults(family: string): Record<string, unknown> {
  const engine = getFuse();
  const fromEngine = engine?.COMPONENT_PROFILES?.[family]?.defaultProperties;
  if (fromEngine) {
    return { ...fromEngine };
  }
  return { ...(LOCAL_DEFAULTS[family] ?? LOCAL_DEFAULTS.generic) };
}

/** Per-family thermal limits (°C) used for the temperature gauge headroom. */
export function familyThermal(family: string): {
  junctionLimitC: number;
  absoluteMaxTempC: number;
} {
  const engine = getFuse();
  const spec = engine?.COMPONENT_PHYSICAL_SPECS?.[family];
  if (spec && typeof spec.junctionLimitC === "number") {
    return {
      junctionLimitC: spec.junctionLimitC,
      absoluteMaxTempC: spec.absoluteMaxTempC ?? spec.junctionLimitC + 20,
    };
  }
  return LOCAL_THERMAL[family] ?? LOCAL_THERMAL.generic;
}

/**
 * ── The parts that are not on trial ─────────────────────────────────────────
 *
 * The bench is built to destroy whatever is put on it, and these four are the
 * exception: they have no failure path at all, because the joke only works if
 * the one thing you cannot kill is the one thing that is obviously not an
 * electronic component. Each of them answers with a number instead of a
 * failure — and the number is the whole point of the part.
 *
 * Matched on the type string, the builder type, the name AND the label, because
 * one arrives from the catalog as `flux-capacitor`, another from a saved
 * circuit as a `builderType`, and any of them in a spec document as whatever
 * its author happened to call it.
 */
const EASTER_EGGS: Array<{ match: RegExp; family: string; result: FuseResult }> = [
  {
    // Back to the Future. The figure is its discharge rate, and the card that
    // names it is the one the engine would have filled in on any other part:
    // 1.21 GW is the only number that belongs on it.
    match: /flux/i,
    family: "flux",
    result: {
      failed: false,
      severity: 0,
      name: "Flux Discharge — 1.21 GW",
      visual: null,
      description:
        "Time-circuit core holding. No failure path is modelled for this part: " +
        "the cell stores and releases its charge faster than the bench can heat " +
        "it, and it is the only component here that survives an overload by " +
        "design.",
      family: "flux",
    },
  },
  {
    // Dude, Where's My Car?. The transfunctioner does not do anything anyone
    // can name, so neither does its failure: the part reports that it has
    // transfunctioned and declines to elaborate.
    match: /transfunction/i,
    family: "transfunctioner",
    result: {
      failed: false,
      severity: 0,
      name: "Continuum Transfunctioned",
      visual: null,
      description:
        "The mystery of this part is exceeded only by its power. It has " +
        "transfunctioned, whatever that means, and it is not going to explain " +
        "itself — there is nothing in here for F.U.S.E. to model.",
      family: "transfunctioner",
    },
  },
  {
    // Warp drive: it is not cooked, it is engaged.
    match: /warp/i,
    family: "warp",
    result: {
      failed: false,
      severity: 0,
      name: "Warp 9.9 — Dampers Holding",
      visual: null,
      description:
        "Nacelle field stable. The bench cannot overload a warp core by " +
        "dissipating watts in it — every amp you push in comes out as " +
        "velocity, and the inertial dampers report nominal.",
      family: "warp",
    },
  },
  {
    // Dilithium: a crystal that, when it is overdriven, grows back.
    match: /dilithium/i,
    family: "dilithium",
    result: {
      failed: false,
      severity: 0,
      name: "Dilithium Integrity 100%",
      visual: null,
      description:
        "Crystal lattice recrystallised faster than the test could stress " +
        "it. Overdriving dilithium does not fracture it — that is the property " +
        "the whole material was invented for.",
      family: "dilithium",
    },
  },
];

/**
 * The easter egg among these type/property fields, if any.
 *
 * Returns the family AND the canned result together so the two can never drift:
 * the family is what every other table on the bench is keyed by, and the result
 * is what the failure card says instead of a failure.
 */
function easterEggFor(
  type: string | undefined,
  props?: Record<string, unknown>,
): { family: string; result: FuseResult } | null {
  const fields = [type, props?.builderType, props?.name, props?.label].filter(
    (value): value is string => typeof value === "string",
  );
  for (const egg of EASTER_EGGS) {
    if (fields.some((value) => egg.match.test(value))) {
      return { family: egg.family, result: egg.result };
    }
  }
  return null;
}

/**
 * Evaluate a component against its failure profile. Prefers the real engine and
 * falls back to a compact local model when the global is unavailable.
 *
 * Checked before the engine, like the family resolution: an easter egg has no
 * failure path in F.U.S.E. at all — not "it is tough", not "it has a very high
 * rating". On a bench built to destroy whatever you put on it, these are the
 * parts you can drive to 4× rated alongside components that are already on fire,
 * and they sit there glowing.
 */
export function detectFailure(
  component: FuseComponent,
  metrics: FuseMetrics,
): FuseResult {
  const egg = easterEggFor(component.type, component.properties);
  if (egg) {
    return egg.result;
  }
  const engine = getFuse();
  if (engine) {
    try {
      return engine.detectFailure(component, metrics);
    } catch {
      /* fall through to the local model */
    }
  }
  return localDetectFailure(component, metrics);
}

// ───────────────────────────── local fallback ──────────────────────────────
// A deliberately small mirror of the engine: enough overpower / overcurrent /
// overtemp coverage to keep the bench meaningful without the global present.

const LOCAL_DEFAULTS: Record<string, Record<string, unknown>> = {
  resistor: { powerRating: 0.25, thermalResistance: 75 },
  capacitor: { maxVoltage: 50, thermalResistance: 40 },
  led: { maxCurrent: 0.02, thermalResistance: 120 },
  diode: { maxCurrent: 1, powerRating: 1, thermalResistance: 60 },
  inductor: { powerRating: 0.5, thermalResistance: 55 },
  battery: { maxPower: 10, thermalResistance: 35 },
  fuse: { ratedCurrentA: 1, thermalResistance: 40 },
  lamp: { ratedWatts: 5, thermalResistance: 30 },
  mosfet: { id_max: 33, powerRating: 130, thermalResistance: 0.92 },
  bjt: { ic_max: 0.6, powerRating: 0.625, thermalResistance: 200 },
  switch: { maxCurrent: 5, thermalResistance: 50 },
  relay: { coilVoltage: 12, maxCurrent: 10, maxVoltage: 250, thermalResistance: 50 },
  // Nothing here is reachable — detectFailure never gets as far as reading
  // these for this family. They exist so the bench's own arithmetic (load
  // percentage, headroom, the gauge on the plate) has real numbers to work
  // with instead of NaNs, and they are set high enough that every one of those
  // readouts lands at ~0% of rated.
  flux: {
    powerRating: 1.21e9,
    maxVoltage: 1.21e9,
    maxCurrent: 1.21e6,
    thermalResistance: 0.5,
    capacitance: 1.21,
  },
  // Same reasoning as `flux` above: nothing here is reachable, and these exist
  // so the plate's arithmetic lands at ~0% of rated instead of on a NaN.
  transfunctioner: {
    powerRating: 1.21e9,
    maxVoltage: 1.21e9,
    maxCurrent: 1.21e6,
    thermalResistance: 0.5,
  },
  warp: {
    powerRating: 1e12,
    maxVoltage: 1e12,
    maxCurrent: 1e9,
    thermalResistance: 0.2,
  },
  dilithium: {
    powerRating: 1e12,
    maxVoltage: 1e12,
    maxCurrent: 1e9,
    thermalResistance: 0.3,
  },
  generic: { powerRating: 0.25, thermalResistance: 60 },
};

const LOCAL_THERMAL: Record<
  string,
  { junctionLimitC: number; absoluteMaxTempC: number }
> = {
  resistor: { junctionLimitC: 155, absoluteMaxTempC: 175 },
  capacitor: { junctionLimitC: 105, absoluteMaxTempC: 125 },
  led: { junctionLimitC: 125, absoluteMaxTempC: 150 },
  diode: { junctionLimitC: 150, absoluteMaxTempC: 175 },
  battery: { junctionLimitC: 60, absoluteMaxTempC: 75 },
  mosfet: { junctionLimitC: 175, absoluteMaxTempC: 200 },
  bjt: { junctionLimitC: 150, absoluteMaxTempC: 175 },
  relay: { junctionLimitC: 130, absoluteMaxTempC: 150 },
  // Reported as ∞ by the plate rather than as a number — see the temperature
  // readout in ArenaScene. A finite sentinel rather than Infinity so the
  // percentage arithmetic above it stays real.
  flux: { junctionLimitC: 1e9, absoluteMaxTempC: 1e9 },
  transfunctioner: { junctionLimitC: 1e9, absoluteMaxTempC: 1e9 },
  warp: { junctionLimitC: 1e9, absoluteMaxTempC: 1e9 },
  dilithium: { junctionLimitC: 1e9, absoluteMaxTempC: 1e9 },
  generic: { junctionLimitC: 125, absoluteMaxTempC: 125 },
};

const LOCAL_FAMILY_KEYWORDS: Array<[RegExp, string]> = [
  [/^(res|resistor|r\d)/, "resistor"],
  // ── Behind the bench ──────────────────────────────────────────────────────
  // These two are checked FIRST because neither is what the roster thinks it
  // is, and both would otherwise fall through to the generic profile:
  //
  //   flux      the flux capacitor does not fail. It is an easter egg and it
  //             has no failure path (see EASTER_EGGS above, which catches it
  //             even earlier than this table), so it needs a family of its own
  //             rather than the generic thermal model. Kept here as well so
  //             this table stays right on its own terms — it is the fallback
  //             for a bench with no engine loaded, and `transfunctioner`,
  //             `warp` and `dilithium` answer the same way: they never reach
  //             this table either, and are named here only so the list of
  //             families that do not behave like a resistor is complete in one
  //             place.
  //   transformer  two coupled windings on an iron core, which is the thing
  //             the `inductor` family already models — copper on ferrite, with
  //             the insulation as the critical sub-component. Left to the
  //             generic profile it had no interior, no wound, and nothing
  //             happened to it when the load ramp cooked everything else.
  [/flux/, "flux"],
  [/transformer/, "inductor"],
  [/^(cap|capacitor|c\d)/, "capacitor"],
  [/led/, "led"],
  [/(diode|rectifier|schottky|zener)/, "diode"],
  [/(inductor|coil|choke)/, "inductor"],
  [/(battery|cell|source)/, "battery"],
  [/fuse/, "fuse"],
  [/(lamp|bulb)/, "lamp"],
  [/(mosfet|nmos|pmos|irf)/, "mosfet"],
  [/(bjt|transistor|npn|pnp|2n|bc)/, "bjt"],
  [/switch/, "switch"],
  [/relay/, "relay"],
];

function localResolveFamily(
  type: string,
  props?: Record<string, unknown>,
): string {
  const t = (type || "").toLowerCase().trim();
  for (const [pattern, family] of LOCAL_FAMILY_KEYWORDS) {
    if (pattern.test(t)) {
      return family;
    }
  }
  if (props) {
    if (typeof props.capacitance === "number") return "capacitor";
    if (typeof props.inductance === "number") return "inductor";
    if (typeof props.forwardVoltage === "number") return "led";
    if (typeof props.resistance === "number") return "resistor";
  }
  return "generic";
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function localDetectFailure(
  component: FuseComponent,
  metrics: FuseMetrics,
): FuseResult {
  const family = localResolveFamily(component.type, component.properties);
  const props = component.properties || {};
  const empty: FuseResult = {
    failed: false,
    severity: 0,
    name: null,
    visual: null,
    description: null,
    family,
  };

  let severity = 0;
  let name: string | null = null;
  let visual: string | null = null;

  // Overpower (resistive parts)
  const powerRating = num(
    props.powerRating ?? props.maxPower ?? props.ratedWatts,
    family === "resistor" ? 0.25 : 0.5,
  );
  if (metrics.powerDissipation > powerRating) {
    const sev = Math.min((metrics.powerDissipation / powerRating - 1) * 3, 3);
    if (sev > severity) {
      severity = sev;
      name = "Thermal Overload";
      visual = "char";
    }
  }

  // Overcurrent (junction parts)
  const maxCurrent = num(props.maxCurrent ?? props.id_max ?? props.ic_max, NaN);
  if (Number.isFinite(maxCurrent) && metrics.currentRms > maxCurrent * 1.3) {
    const sev = Math.min((metrics.currentRms / (maxCurrent * 1.8)) * 3, 3);
    if (sev > severity) {
      severity = sev;
      name = "Overcurrent Burnout";
      visual = "blowout";
    }
  }

  // Overtemp (everything)
  const limitC = familyThermal(family).junctionLimitC;
  const tempC = (metrics.ambientTemperature ?? 25) + metrics.thermalRise;
  if (tempC > limitC) {
    const sev = Math.min((tempC - (limitC - 25)) / 30, 3);
    if (sev > severity) {
      severity = sev;
      name = "Temperature Limit Exceeded";
      visual = "melt";
    }
  }

  if (severity <= 0) {
    return empty;
  }
  return {
    failed: severity >= 2,
    severity,
    name,
    visual,
    description: null,
    family,
  };
}
