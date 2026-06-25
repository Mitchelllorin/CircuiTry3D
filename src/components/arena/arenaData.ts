import { familyDefaults, familyThermal, resolveFamily } from "./fuse";
import { AMBIENT_C } from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaComponentRatings,
  ArenaSessionPayload,
  ArenaSourceComponent,
} from "./types";

const ARENA_ACCENTS = ["#60a5fa", "#f97316", "#38bdf8", "#fb923c", "#22d3ee", "#fdba74"];

const TYPE_ALIASES: Record<string, string> = {
  "capacitor-ceramic": "capacitor-ceramic",
  bjt: "transistor-bjt-npn",
  transistor: "transistor-bjt-npn",
  mosfet: "mosfet",
  diode: "diode",
  led: "led",
  resistor: "resistor",
  capacitor: "capacitor",
  inductor: "inductor",
  battery: "battery",
  fuse: "fuse",
  lamp: "lamp",
  switch: "switch",
  potentiometer: "potentiometer",
};

/** The characteristic failure mode each family is being tested against. */
const STRESS_SIGNATURE_BY_FAMILY: Record<string, string> = {
  resistor: "Thermal Overload",
  capacitor: "Dielectric Breakdown",
  led: "Junction Burnout",
  diode: "Forward Burnout",
  inductor: "Winding Burnout",
  battery: "Thermal Venting",
  fuse: "Element Melt",
  lamp: "Filament Burnout",
  mosfet: "Drain Burnout",
  bjt: "Collector Burnout",
  switch: "Contact Arcing",
  relay: "Contact Welding",
  generic: "Thermal Overload",
};

const FALLBACK_COMPONENTS: ArenaSourceComponent[] = [
  {
    id: "fallback-resistor",
    name: "Champion Resistor",
    type: "resistor",
    componentNumber: "R1",
    properties: { resistance: 470, voltage: 9, power: 0.5, powerRating: 0.25 },
  },
  {
    id: "fallback-capacitor",
    name: "Pulse Capacitor",
    type: "capacitor",
    componentNumber: "C1",
    properties: { capacitance: 0.00047, voltage: 16, current: 0.4, maxVoltage: 25 },
  },
  {
    id: "fallback-led",
    name: "Nova LED",
    type: "led",
    componentNumber: "D1",
    properties: { forwardVoltage: 2.2, current: 0.025, power: 0.08, maxCurrent: 0.02 },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normaliseType(type?: string | null): string {
  const cleaned = type?.trim().toLowerCase() ?? "";
  if (!cleaned) {
    return "resistor";
  }
  return cleaned;
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function readNumeric(
  properties: Record<string, unknown> | undefined,
  keys: string[],
): number | null {
  if (!properties) {
    return null;
  }

  for (const key of keys) {
    const rawValue = properties[key];
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      return rawValue;
    }
  }

  return null;
}

function deriveMetrics(
  component: ArenaSourceComponent,
  payload: ArenaSessionPayload | null,
): ArenaBattleAgent["metrics"] {
  const basic = payload?.analysis?.basic;
  const properties = component.properties;

  const voltage =
    readNumeric(properties, ["voltage", "forwardVoltage", "supplyVoltage", "outputVoltage"]) ??
    (typeof basic?.voltage === "number" ? basic.voltage : null) ??
    6;
  const safeVoltage = Math.max(voltage, 0.1);

  const resistance =
    readNumeric(properties, [
      "resistance",
      "internalResistance",
      "coilResistance",
      "onResistance",
      "offResistance",
    ]) ??
    (typeof basic?.resistance === "number" ? Math.max(basic.resistance / 2, 0.25) : null) ??
    12;

  // Operating current — the point of the whole test depends on this being a
  // SANE starting load, not a rating. Priority:
  //   1. an explicit operating current,
  //   2. Ohm's law I = V/R using the part's OWN resistance (not internal/contact
  //      R), so a resistive load starts at a believable draw,
  //   3. the circuit's measured current,
  //   4. a small default.
  // maxCurrent / ratedCurrentA are RATINGS — they live in deriveRatings, and
  // must never seed the operating point (that made every part start over-rated
  // and fail in the first second, before the user could see anything).
  const loadResistance = readNumeric(properties, ["resistance"]);
  let current = readNumeric(properties, ["current"]);
  if (current == null && loadResistance != null && loadResistance > 0) {
    current = safeVoltage / loadResistance;
  }
  if (current == null) {
    current =
      typeof basic?.current === "number" ? Math.max(basic.current / 2, 0.01) : 0.05;
  }
  const safeCurrent = Math.min(Math.max(current, 0.001), 100);

  // Operating power is the REAL dissipation at this point (V·I), not a rating —
  // the rating lives in `ratings.powerRating`. The bench ramps this up.
  const operatingPower = Math.max(safeVoltage * safeCurrent, 0.02);

  return {
    voltage: safeVoltage,
    current: safeCurrent,
    resistance: Math.max(resistance, 0.01),
    power: operatingPower,
  };
}

/** Pull real ratings from the merged F.U.S.E. profile + the part's own props. */
function deriveRatings(
  family: string,
  properties: Record<string, unknown>,
): ArenaComponentRatings {
  const thermal = familyThermal(family);
  const powerRating =
    readNumeric(properties, ["powerRating", "maxPower", "ratedWatts"]) ??
    (family === "resistor" ? 0.25 : 0.5);
  const maxCurrent =
    readNumeric(properties, ["maxCurrent", "id_max", "ic_max", "ratedCurrentA", "maxDischargeCurrent"]) ??
    Number.POSITIVE_INFINITY;
  const maxVoltage =
    readNumeric(properties, ["maxVoltage", "maxVoltageV", "reverseVoltage", "vds_max", "vce_max"]) ??
    Number.POSITIVE_INFINITY;
  const thermalResistanceCPerW = readNumeric(properties, ["thermalResistance"]) ?? 60;

  return {
    powerRating: Math.max(powerRating, 0.01),
    maxCurrent: maxCurrent > 0 ? maxCurrent : Number.POSITIVE_INFINITY,
    maxVoltage: maxVoltage > 0 ? maxVoltage : Number.POSITIVE_INFINITY,
    junctionLimitC: thermal.junctionLimitC,
    absoluteMaxTempC: thermal.absoluteMaxTempC,
    thermalResistanceCPerW: Math.max(thermalResistanceCPerW, 0.1),
  };
}

export function buildArenaRoster(
  payload: ArenaSessionPayload | null,
): ArenaBattleAgent[] {
  const payloadComponents =
    payload?.components?.filter((component) => component && typeof component === "object") ?? [];
  const sourceComponents =
    payloadComponents.length >= 2 ? payloadComponents.slice(0, 6) : FALLBACK_COMPONENTS;

  return sourceComponents.map((component, index, list) => {
    const componentType = normaliseType(component.type);
    const renderType = TYPE_ALIASES[componentType] ?? componentType;
    const ownProps = component.properties ?? {};
    const family = resolveFamily(componentType, ownProps);
    // Merge engine defaults under the part's own props so detectFailure always
    // has a rating to compare against, even for sparsely-specified imports.
    const properties: Record<string, unknown> = {
      ...familyDefaults(family),
      ...ownProps,
    };
    const metrics = deriveMetrics(component, payload);
    const ratings = deriveRatings(family, properties);

    return {
      id: component.id ?? `arena-agent-${index + 1}`,
      name: component.name?.trim() || `${toTitleCase(componentType)} ${index + 1}`,
      componentType,
      renderType,
      family,
      stressSignature:
        STRESS_SIGNATURE_BY_FAMILY[family] ?? STRESS_SIGNATURE_BY_FAMILY.generic,
      accent: ARENA_ACCENTS[index % ARENA_ACCENTS.length] ?? "#60a5fa",
      spawnAngle: (Math.PI * 2 * index) / list.length,
      metrics,
      properties,
      ratings,
      componentNumber:
        component.componentNumber?.trim() || component.partNumber?.trim() || null,

      // fresh telemetry — a part starts the bench cool and intact
      integrity: 100,
      maxIntegrity: 100,
      severity: 0,
      tempC: AMBIENT_C,
      loadPercent: clamp(
        ratings.powerRating > 0 ? (metrics.power / ratings.powerRating) * 100 : 0,
        0,
        999,
      ),
      phase: "nominal",
      failureName: null,
      failureVisual: null,
    };
  });
}
