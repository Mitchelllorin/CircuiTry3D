import { familyDefaults, familyThermal, resolveFamily } from "./fuse";
import { AMBIENT_C } from "./stressTest";
import { findCatalogComponent } from "./catalogData";
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

/**
 * Types the bench does not put on a rung.
 *
 * The battery IS the supply — it stands off the left of the board and what it
 * delivers is the volts fader. The switch IS the Battle button on the supply
 * panel. Neither is a part under test, so giving either a bay both invents an
 * empty-looking slot and, worse, scores a power source and a control as if they
 * were loads being stressed to failure.
 *
 * Importing the builder's showcase circuit (battery, resistor, lamp, switch) is
 * the common case, and it was producing four bays for two testable parts.
 */
const NON_TESTABLE_TYPES = new Set([
  "battery",
  "switch",
  "ground",
  "wire",
  "junction",
  "node",
  "source",
  "voltage-source",
  "vsource",
  "probe",
  "meter",
  "multimeter",
]);

/**
 * The bench when nothing has been imported from the builder.
 *
 * Named for WHAT THEY ARE. They used to be "Champion Resistor", "Pulse
 * Capacitor" and "Nova LED" — invented gladiator names from the arena's
 * fighting-game phase, and nobody can tell what any of them is. A part's name
 * is the only thing carrying its identity in the roster, the leaderboard and
 * the affiliate search, and an invented one carries nothing: you cannot look
 * it up, cannot buy it, and cannot tell whether it is the thing you are
 * holding. The value and the rating ARE the name of a passive component, which
 * is exactly how they are labelled in a shop, a datasheet and a parts drawer.
 */
const FALLBACK_COMPONENTS: ArenaSourceComponent[] = [
  {
    id: "fallback-resistor",
    name: "470 Ω · ¼ W resistor",
    type: "resistor",
    componentNumber: "R1",
    properties: { resistance: 470, voltage: 9, power: 0.5, powerRating: 0.25 },
  },
  {
    id: "fallback-capacitor",
    name: "470 µF · 25 V capacitor",
    type: "capacitor",
    componentNumber: "C1",
    properties: { capacitance: 0.00047, voltage: 16, current: 0.4, maxVoltage: 25 },
  },
  {
    id: "fallback-led",
    name: "5 mm LED · 20 mA",
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

/** The most parts one bench can hold — the board turns each into a rung. */
export const ARENA_ROSTER_MAX = 6;

/**
 * A card from the app's component library, as a part on the bench.
 *
 * The library is the SAME one the workspace builds from
 * (`components/builder/componentLibrary`), which is the point: a part you can
 * build with and a part you can stress-test have to be the same part, or the
 * two surfaces drift and "add a MOSFET" means something different depending on
 * which screen you are standing on.
 *
 * Branded catalog cards already carry their datasheet values in
 * `initialProperties` (that is what `toWorkspaceProperties` produced), so a real
 * part arrives on the bench with its real ratings and F.U.S.E. tests it against
 * those rather than against a family default.
 */
export function arenaSourceFromLibrary(
  action: {
    id: string;
    label: string;
    builderType?: string;
    description?: string;
    initialProperties?: Record<string, number>;
  },
  index: number,
): ArenaSourceComponent {
  const catalogEntry = findCatalogComponent(action.id);
  return {
    // Unique per bench slot: the same library card can legitimately be tested
    // against itself (two of one resistor is a real experiment), and agents are
    // keyed by id everywhere downstream — a duplicate would make two rungs
    // share one selection, one nameplate and one failure.
    id: `${action.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: action.label,
    type: action.builderType ?? catalogEntry?.type ?? "resistor",
    manufacturer: catalogEntry?.manufacturer ?? null,
    properties: { ...(catalogEntry?.properties ?? {}), ...(action.initialProperties ?? {}) },
  };
}

/**
 * The parts a saved session puts on the bench, before they become agents.
 *
 * Split out from `buildArenaRoster` so the roster can be EDITED. The arena used
 * to be able to test only whatever the builder last had open: the roster was
 * derived from the session payload and nothing else, so "try a different
 * component" meant leaving the arena, building a circuit around that part, and
 * coming back. Handing the source list out lets the arena's own picker add and
 * swap parts without any of that.
 */
export function arenaSourcesFrom(
  payload: ArenaSessionPayload | null,
): ArenaSourceComponent[] {
  const payloadComponents =
    payload?.components
      ?.filter((component) => component && typeof component === "object")
      // Drop the supply and the controls before anything is counted, so the
      // roster length — which is what the 3D board turns into bays — only ever
      // reflects parts that are genuinely under test.
      .filter((component) => !NON_TESTABLE_TYPES.has(normaliseType(component.type))) ?? [];
  return payloadComponents.length >= 2
    ? payloadComponents.slice(0, ARENA_ROSTER_MAX)
    : FALLBACK_COMPONENTS;
}

export function buildArenaRoster(
  payload: ArenaSessionPayload | null,
): ArenaBattleAgent[] {
  return buildArenaAgents(arenaSourcesFrom(payload), payload);
}

/**
 * Turn an explicit list of parts into bench agents. Same work
 * `buildArenaRoster` always did; it just no longer insists on sourcing the list
 * from a saved session.
 */
export function buildArenaAgents(
  sourceComponents: ArenaSourceComponent[],
  payload: ArenaSessionPayload | null,
): ArenaBattleAgent[] {
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

    // Pull rated thresholds from catalog if available, then from component properties
    const catalogEntry = component.id ? findCatalogComponent(component.id) : null;
    const ratedThresholds = catalogEntry?.ratedThresholds ?? {
      maxVoltageV: readNumeric(component.properties, ["maxVoltage", "vds_max", "vce_max", "reverseVoltage"]) ?? undefined,
      maxCurrentA: readNumeric(component.properties, ["maxCurrent", "ic_max", "id_max", "ratedCurrentA"]) ?? undefined,
      maxPowerW: readNumeric(component.properties, ["powerRating", "powerDissipation"]) ?? undefined,
      maxTempC: readNumeric(component.properties, ["maxTempC"]) ?? 125,
      minTempC: readNumeric(component.properties, ["minTempC"]) ?? -40,
      thermalResistanceCA: readNumeric(component.properties, ["thermalResistance"]) ?? undefined,
    };

    const manufacturer =
      catalogEntry?.manufacturer ??
      (typeof component.properties?.["manufacturer"] === "string"
        ? component.properties["manufacturer"]
        : null);

    return {
      id: component.id ?? `arena-agent-${index + 1}`,
      name: component.name?.trim() || `${toTitleCase(componentType)} ${index + 1}`,
      manufacturer,
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
      failureDescription: null,
      failureFamily: null,

      // accumulated metrics — reset at the start of every run
      peakTempC: AMBIENT_C,
      peakLoadPercent: 0,
      energyJ: 0,
      survivedLoad: 1,
      failedAtMs: null,
      failedAtLoad: null,
      score: 0,
      rank: 0,
      ratedThresholds,
    };
  });
}
