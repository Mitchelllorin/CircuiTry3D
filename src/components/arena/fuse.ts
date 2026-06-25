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
 * Evaluate a component against its failure profile. Prefers the real engine and
 * falls back to a compact local model when the global is unavailable.
 */
export function detectFailure(
  component: FuseComponent,
  metrics: FuseMetrics,
): FuseResult {
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
  generic: { junctionLimitC: 125, absoluteMaxTempC: 125 },
};

const LOCAL_FAMILY_KEYWORDS: Array<[RegExp, string]> = [
  [/^(res|resistor|r\d)/, "resistor"],
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
