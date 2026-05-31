import { findCatalogComponent } from "./catalogData";
import type {
  ArenaBattleAgent,
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

const ABILITY_BY_TYPE: Record<string, string> = {
  resistor: "Voltage Surge",
  capacitor: "Capacitor Discharge",
  "capacitor-ceramic": "Ceramic Pulse",
  led: "Photon Burst",
  diode: "Rectifier Lash",
  inductor: "Magnetic Snap",
  battery: "Current Flood",
  fuse: "Short Circuit",
  switch: "Arc Flash",
  lamp: "Thermal Bloom",
  potentiometer: "Tuned Strike",
  bjt: "Bias Cascade",
  transistor: "Bias Cascade",
  mosfet: "Gate Slam",
};

const FALLBACK_COMPONENTS: ArenaSourceComponent[] = [
  {
    id: "fallback-resistor",
    name: "Champion Resistor",
    type: "resistor",
    componentNumber: "R1",
    properties: { resistance: 470, voltage: 9, power: 0.5 },
  },
  {
    id: "fallback-capacitor",
    name: "Pulse Capacitor",
    type: "capacitor",
    componentNumber: "C1",
    properties: { capacitance: 0.00047, voltage: 16, current: 0.4 },
  },
  {
    id: "fallback-led",
    name: "Nova LED",
    type: "led",
    componentNumber: "D1",
    properties: { forwardVoltage: 2.2, current: 0.025, power: 0.08 },
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
  const current =
    readNumeric(properties, ["current", "maxCurrent", "currentRating", "ratedCurrentA"]) ??
    (typeof basic?.current === "number" ? Math.max(basic.current / 2, 0.05) : null) ??
    0.35;
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
  const rawPower =
    readNumeric(properties, ["power", "powerRating", "powerDissipation"]) ??
    (typeof basic?.power === "number" ? Math.max(basic.power / 2, 0.2) : null);
  const power = rawPower ?? Math.max(voltage * current, 0.15);

  return {
    voltage: Math.max(voltage, 0.1),
    current: Math.max(current, 0.01),
    resistance: Math.max(resistance, 0.01),
    power: Math.max(power, 0.05),
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
    const metrics = deriveMetrics(component, payload);
    const resistanceShield = Math.log10(metrics.resistance + 1) * 7;
    const attack = clamp(
      Math.round(12 + metrics.voltage * 0.8 + metrics.current * 12 + Math.sqrt(metrics.power) * 3),
      12,
      58,
    );
    const defense = clamp(Math.round(7 + resistanceShield), 7, 32);
    const maxHealth = clamp(
      Math.round(72 + defense * 4 + metrics.power * 5 + metrics.voltage * 1.7),
      72,
      190,
    );

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
      name:
        component.name?.trim() ||
        `${toTitleCase(componentType)} ${index + 1}`,
      manufacturer,
      componentType,
      renderType,
      abilityName: ABILITY_BY_TYPE[componentType] ?? "Ohm Strike",
      accent: ARENA_ACCENTS[index % ARENA_ACCENTS.length] ?? "#60a5fa",
      attack,
      defense,
      health: maxHealth,
      maxHealth,
      spawnAngle: (Math.PI * 2 * index) / list.length,
      metrics,
      componentNumber:
        component.componentNumber?.trim() || component.partNumber?.trim() || null,
      ratedThresholds,
    };
  });
}
