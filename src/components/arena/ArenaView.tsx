import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import "../../styles/arena.css";

type ArenaViewProps = {
  variant?: "page" | "embedded";
  onNavigateBack?: () => void;
  onOpenBuilder?: () => void;
};

const ARENA_STORAGE_KEY = "circuiTry3d.arena.import";
const DEFAULT_STATUS = "Bring in your latest circuit to drill components.";

type ArenaMetrics = {
  voltage: number | null;
  current: number | null;
  resistance: number | null;
  power: number | null;
};

type ArenaSummary = {
  totalComponents: number;
  totalWires: number;
  totalJunctions: number;
  byType: Record<string, number>;
};

type ArenaComponent = {
  id?: string;
  name?: string;
  type?: string;
  componentNumber?: string;
  properties?: Record<string, unknown>;
};

type ArenaState = {
  components?: ArenaComponent[];
  wires?: unknown[];
  junctions?: unknown[];
};

type ArenaPayload = {
  version?: string;
  source?: string;
  label?: string;
  generatedAt?: number;
  metrics?: Partial<ArenaMetrics>;
  summary?: Partial<ArenaSummary>;
  state?: ArenaState;
};

type ArenaBridgeMessage =
  | { type: "arena:import"; payload: ArenaPayload }
  | { type: "arena:command"; payload: { command: string } };

function parseArenaPayload(value: string | null): ArenaPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ArenaPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Arena payload parse failed", error);
    return null;
  }
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const magnitude = Math.abs(value);
  let digits: number;

  if (magnitude >= 1000) {
    digits = 0;
  } else if (magnitude >= 100) {
    digits = 1;
  } else if (magnitude >= 10) {
    digits = 2;
  } else {
    digits = 3;
  }

  return `${value.toFixed(digits)} ${unit}`;
}

function buildSummaryFromComponents(components?: ArenaComponent[]): ArenaSummary {
  const safeComponents = Array.isArray(components) ? components : [];
  const byType = safeComponents.reduce<Record<string, number>>((acc, component) => {
    const type = (component?.type || "unknown").toString();
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalComponents: safeComponents.length,
    totalWires: 0,
    totalJunctions: 0,
    byType
  };
}

function summariseProperties(properties?: Record<string, unknown>): string | null {
  if (!properties) {
    return null;
  }

  if (typeof properties.value !== "undefined") {
    return `Value: ${properties.value}`;
  }

  const numericEntry = Object.entries(properties).find(([, propValue]) => typeof propValue === "number");
  if (numericEntry) {
    return `${numericEntry[0]}: ${numericEntry[1]}`;
  }

  const stringEntry = Object.entries(properties).find(([, propValue]) => typeof propValue === "string");
  if (stringEntry) {
    return `${stringEntry[0]}: ${stringEntry[1]}`;
  }

  return null;
}

type ComponentMetricEntry = {
  key: string;
  label: string;
  displayValue: string;
  numericValue: number | null;
  unit: string | null;
};

type ComponentShowdownProfile = {
  uid: string;
  name: string;
  type: string;
  summary: string | null;
  metrics: ComponentMetricEntry[];
};

const METRIC_UNIT_MAP: Record<string, string> = {
  ambienthumiditypercent: "%",
  ambienttemperature: "C",
  capacitance: "F",
  capacitymah: "mAh",
  current: "A",
  currentpeak: "A",
  currentrms: "A",
  dutycyclepercent: "%",
  efficiency: "%",
  energydelivered: "J",
  energy: "J",
  forwardvoltage: "V",
  frequencyhz: "Hz",
  impedance: "Ω",
  inductance: "H",
  internalresistance: "Ω",
  loadimpedanceohms: "Ω",
  maxdischargecurrent: "A",
  operatingvoltage: "V",
  onresistance: "Ω",
  offresistance: "Ω",
  power: "W",
  powerdissipation: "W",
  reactance: "Ω",
  resistance: "Ω",
  seriesresistance: "Ω",
  storedenergy: "J",
  temperature: "C",
  thermalresistance: "C/W",
  thermalrise: "C",
  transitiontimems: "ms",
  voltage: "V",
  operatingtemperature: "C"
};

const COMPONENT_BADGE_LABELS: Record<string, string> = {
  battery: "BAT",
  capacitor: "CAP",
  controller: "CTL",
  diode: "DIO",
  inductor: "IND",
  led: "LED",
  module: "MOD",
  motor: "MTR",
  resistor: "RES",
  sensor: "SNS",
  switch: "SW",
  transistor: "TRN",
  generic: "CMP"
};

function normalisePropertyKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function normaliseTypeForClass(type?: string | null): string {
  if (!type) {
    return "generic";
  }
  const normalised = type.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return normalised.length > 0 ? normalised : "generic";
}

function getComponentBadgeLabel(type?: string | null): string {
  const key = normaliseTypeForClass(type);
  if (COMPONENT_BADGE_LABELS[key]) {
    return COMPONENT_BADGE_LABELS[key];
  }
  if (type && type.trim().length > 0) {
    const trimmed = type.trim().toUpperCase();
    if (trimmed.length <= 3) {
      return trimmed;
    }
    return trimmed.slice(0, 3);
  }
  return COMPONENT_BADGE_LABELS.generic;
}

function scaleNumber(value: number): { scaled: number; prefix: string } {
  const abs = Math.abs(value);
  if (abs >= 1e6) {
    return { scaled: value / 1e6, prefix: "M" };
  }
  if (abs >= 1e3) {
    return { scaled: value / 1e3, prefix: "k" };
  }
  if (abs > 0 && abs < 1e-3) {
    return { scaled: value * 1e6, prefix: "u" };
  }
  if (abs > 0 && abs < 1) {
    return { scaled: value * 1e3, prefix: "m" };
  }
  return { scaled: value, prefix: "" };
}

function formatPropertyLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) {
    return "Metric";
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatNumericForProperty(key: string, value: number): { display: string; unit: string | null } {
  const normalisedKey = normalisePropertyKey(key);
  const unit = METRIC_UNIT_MAP[normalisedKey] ?? null;

  if (unit === "%") {
    const decimals = Math.abs(value) < 10 ? 1 : 0;
    return { display: `${value.toFixed(decimals)} %`, unit };
  }

  if (unit === "ms" || unit === "mAh" || unit === "s") {
    const decimals = Math.abs(value) < 10 ? 2 : Math.abs(value) < 100 ? 1 : 0;
    return { display: `${value.toFixed(decimals)} ${unit}`, unit };
  }

  const { scaled, prefix } = scaleNumber(value);
  const decimals = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
  const combinedUnit = unit ? `${prefix}${unit}` : prefix;
  const suffix = combinedUnit ? ` ${combinedUnit}` : "";

  return { display: `${scaled.toFixed(decimals)}${suffix}`, unit };
}

function truncate(value: string, maxLength = 60): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function formatPropertyValue(key: string, value: unknown): {
  displayValue: string;
  numericValue: number | null;
  unit: string | null;
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = formatNumericForProperty(key, value);
    return { displayValue: formatted.display, numericValue: value, unit: formatted.unit };
  }

  if (typeof value === "boolean") {
    return { displayValue: value ? "Yes" : "No", numericValue: null, unit: null };
  }

  if (typeof value === "string") {
    return { displayValue: value, numericValue: null, unit: null };
  }

  if (Array.isArray(value)) {
    return {
      displayValue: `${value.length} item${value.length === 1 ? "" : "s"}`,
      numericValue: null,
      unit: null
    };
  }

  if (value && typeof value === "object") {
    return { displayValue: truncate(JSON.stringify(value)), numericValue: null, unit: null };
  }

  return { displayValue: "—", numericValue: null, unit: null };
}

function sanitiseComponent(raw: unknown, index: number): ArenaComponent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  const typeCandidates = [candidate.type, candidate.category, candidate.kind, candidate.family];
  const resolvedType = typeCandidates.find((entry) => typeof entry === "string" && entry.trim().length > 0);

  const componentNumberCandidates = [candidate.componentNumber, candidate.partNumber, candidate.partNum, candidate.part, candidate.sku];
  const resolvedComponentNumber = componentNumberCandidates.find((entry) => typeof entry === "string" && entry.trim().length > 0);

  const nameCandidates = [candidate.name, candidate.label, candidate.title, candidate.displayName, resolvedComponentNumber];
  const resolvedName = nameCandidates.find((entry) => typeof entry === "string" && entry.trim().length > 0);

  const idCandidates = [candidate.id, candidate.uid, candidate.identifier, candidate.slug, resolvedComponentNumber, resolvedName];
  const resolvedId = idCandidates.find((entry) => typeof entry === "string" && entry.trim().length > 0);

  const propertiesCandidates = [candidate.properties, candidate.props, candidate.spec, candidate.values, candidate.attributes, candidate.data];
  const resolvedPropertiesSource = propertiesCandidates.find((entry) => entry && typeof entry === "object") as Record<string, unknown> | undefined;

  const properties = resolvedPropertiesSource ? { ...resolvedPropertiesSource } : undefined;

  if (properties && typeof candidate.value !== "undefined" && typeof properties.value === "undefined") {
    properties.value = candidate.value;
  }

  if (!resolvedType && !resolvedName && !resolvedId && !properties) {
    return null;
  }

  return {
    id: typeof resolvedId === "string" ? resolvedId : undefined,
    name: typeof resolvedName === "string" ? resolvedName : undefined,
    type: typeof resolvedType === "string" ? resolvedType : undefined,
    componentNumber: typeof resolvedComponentNumber === "string" ? resolvedComponentNumber : undefined,
    properties
  };
}

function coerceSummary(summary: Partial<ArenaSummary> | undefined, components: ArenaComponent[]): ArenaSummary {
  const fallback = buildSummaryFromComponents(components);
  if (!summary || typeof summary !== "object") {
    return fallback;
  }

  const byType = summary.byType && typeof summary.byType === "object" ? summary.byType : fallback.byType;

  return {
    totalComponents: typeof summary.totalComponents === "number" && Number.isFinite(summary.totalComponents) ? summary.totalComponents : fallback.totalComponents,
    totalWires: typeof summary.totalWires === "number" && Number.isFinite(summary.totalWires) ? summary.totalWires : fallback.totalWires,
    totalJunctions: typeof summary.totalJunctions === "number" && Number.isFinite(summary.totalJunctions) ? summary.totalJunctions : fallback.totalJunctions,
    byType: byType as Record<string, number>
  };
}

function scrubMetrics(metrics?: Partial<ArenaMetrics> | null): Partial<ArenaMetrics> | undefined {
  if (!metrics || typeof metrics !== "object") {
    return undefined;
  }

  const result: Partial<ArenaMetrics> = {};
  (Object.keys(metrics) as (keyof ArenaMetrics)[]).forEach((key) => {
    const value = metrics[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = value;
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function normaliseImportPayload(raw: unknown, defaults: { source: string; label?: string }): ArenaPayload | null {
  if (raw === null || typeof raw === "undefined") {
    return null;
  }

  let candidate: unknown = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (candidate && typeof candidate === "object" && "payload" in (candidate as Record<string, unknown>)) {
      const next = (candidate as Record<string, unknown>).payload;
      if (next && typeof next === "object") {
        candidate = next;
        continue;
      }
    }
    break;
  }

  const envelope = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : null;

  const componentSources: unknown[] = [];
  const collectComponents = (value: unknown) => {
    if (!value || typeof value !== "object") {
      return;
    }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.components)) {
      componentSources.push(record.components);
    }
    if (record.state && typeof record.state === "object" && Array.isArray((record.state as Record<string, unknown>).components)) {
      componentSources.push((record.state as Record<string, unknown>).components as unknown[]);
    }
    if (Array.isArray((record as Record<string, unknown>).library)) {
      componentSources.push((record as Record<string, unknown>).library as unknown[]);
    }
    if (Array.isArray((record as Record<string, unknown>).items)) {
      componentSources.push((record as Record<string, unknown>).items as unknown[]);
    }
  };

  if (Array.isArray(raw)) {
    componentSources.push(raw);
  }
  if (envelope) {
    collectComponents(envelope);
  }
  if (raw && typeof raw === "object" && raw !== envelope) {
    collectComponents(raw);
  }

  const componentsRaw = componentSources.find((entry) => Array.isArray(entry) && entry.length > 0) as unknown[] | undefined;
  if (!componentsRaw || componentsRaw.length === 0) {
    return null;
  }

  const components = componentsRaw
    .map((entry, index) => sanitiseComponent(entry, index))
    .filter((entry): entry is ArenaComponent => Boolean(entry));

  if (!components.length) {
    return null;
  }

  const wiresCandidate = envelope && Array.isArray(envelope.wires)
    ? (envelope.wires as unknown[])
    : envelope && envelope.state && typeof envelope.state === "object" && Array.isArray((envelope.state as Record<string, unknown>).wires)
    ? ((envelope.state as Record<string, unknown>).wires as unknown[])
    : undefined;

  const junctionsCandidate = envelope && Array.isArray(envelope.junctions)
    ? (envelope.junctions as unknown[])
    : envelope && envelope.state && typeof envelope.state === "object" && Array.isArray((envelope.state as Record<string, unknown>).junctions)
    ? ((envelope.state as Record<string, unknown>).junctions as unknown[])
    : undefined;

  const summaryCandidate = envelope && typeof envelope.summary === "object" && envelope.summary !== null ? (envelope.summary as Partial<ArenaSummary>) : undefined;
  const metricsCandidate = envelope && typeof envelope.metrics === "object" && envelope.metrics !== null ? (envelope.metrics as Partial<ArenaMetrics>) : undefined;

  const labelCandidateRaw = envelope && (envelope.label || envelope.sessionName || envelope.name);
  const labelCandidate = typeof labelCandidateRaw === "string" && labelCandidateRaw.trim().length > 0 ? labelCandidateRaw : undefined;

  const sourceCandidate = envelope?.source;
  let source = defaults.source;
  if (typeof sourceCandidate === "string" && sourceCandidate.trim().length > 0) {
    source = sourceCandidate;
  } else if (sourceCandidate && typeof sourceCandidate === "object") {
    const sourceName = (sourceCandidate as Record<string, unknown>).name;
    if (typeof sourceName === "string" && sourceName.trim().length > 0) {
      source = sourceName;
    }
  }

  const generatedAtCandidateRaw = envelope && (envelope.generatedAt ?? envelope.timestamp ?? envelope.updatedAt);
  let generatedAt: number | undefined;
  if (typeof generatedAtCandidateRaw === "number" && Number.isFinite(generatedAtCandidateRaw)) {
    generatedAt = generatedAtCandidateRaw;
  } else if (typeof generatedAtCandidateRaw === "string") {
    const parsed = Date.parse(generatedAtCandidateRaw);
    if (!Number.isNaN(parsed)) {
      generatedAt = parsed;
    }
  }

  if (!generatedAt && envelope && typeof envelope.exportedAt === "string") {
    const parsed = Date.parse(envelope.exportedAt);
    if (!Number.isNaN(parsed)) {
      generatedAt = parsed;
    }
  }

  if (!generatedAt) {
    generatedAt = Date.now();
  }

  const versionCandidate = envelope && typeof envelope.version === "string" ? envelope.version : undefined;

  return {
    version: versionCandidate,
    source,
    label: labelCandidate ?? defaults.label,
    generatedAt,
    metrics: scrubMetrics(metricsCandidate),
    summary: coerceSummary(summaryCandidate, components),
    state: {
      components,
      wires: wiresCandidate,
      junctions: junctionsCandidate
    }
  };
}

function buildComponentProfile(component: ArenaComponent, index: number, uid: string): ComponentShowdownProfile {
  const name = component.name || component.componentNumber || component.type || `Component ${index + 1}`;
  const type = component.type ?? "Unknown";
  const summary = summariseProperties(component.properties) ?? null;
  const properties = component.properties && typeof component.properties === "object" ? component.properties : {};

  const seen = new Set<string>();
  const metrics: ComponentMetricEntry[] = [];

  Object.entries(properties).forEach(([key, rawValue]) => {
    const normalisedKey = normalisePropertyKey(key);
    if (!normalisedKey || seen.has(normalisedKey)) {
      return;
    }

    const { displayValue, numericValue, unit } = formatPropertyValue(key, rawValue);
    if (displayValue === "—") {
      return;
    }

    metrics.push({
      key: normalisedKey,
      label: formatPropertyLabel(key),
      displayValue,
      numericValue,
      unit
    });
    seen.add(normalisedKey);
  });

  const numericMetrics = metrics
    .filter((entry) => entry.numericValue !== null)
    .sort((a, b) => {
      const priority = getMetricPriority(a.key) - getMetricPriority(b.key);
      if (priority !== 0) {
        return priority;
      }
      return Math.abs((b.numericValue as number)) - Math.abs((a.numericValue as number));
    });

  const descriptiveMetrics = metrics.filter((entry) => entry.numericValue === null);

  const orderedMetrics = [...numericMetrics, ...descriptiveMetrics].slice(0, 12);

  return {
    uid,
    name,
    type,
    summary,
    metrics: orderedMetrics
  };
}

function getMetricPriority(key: string): number {
  const priorities = [
    "power",
    "current",
    "voltage",
    "impedance",
    "resistance",
    "capacitance",
    "inductance",
    "efficiency",
    "thermal",
    "temperature",
    "duty",
    "frequency"
  ];

  const index = priorities.findIndex((token) => key.includes(token));
  return index === -1 ? priorities.length : index;
}

type ComparisonRow = {
  key: string;
  label: string;
  aValue: string;
  bValue: string;
  deltaLabel: string | null;
};

type ShowdownRound = {
  key: string;
  label: string;
  leftValue: string;
  rightValue: string;
  deltaLabel: string | null;
  winner: "left" | "right" | "tie";
  preference: "higher" | "lower";
  advantageScore: number;
  shortSummary: string | null;
};

type ShowdownScore = {
  totalRounds: number;
  leftWins: number;
  rightWins: number;
  ties: number;
  rounds: ShowdownRound[];
  winner: "left" | "right" | "tie" | null;
  dominantMetric: string | null;
};

const HIGHER_IS_BETTER_TOKENS = ["power", "current", "voltage", "efficiency", "energy", "capacity", "inductance", "capacitance", "gain", "frequency", "duty", "conductance", "throughput"];
const LOWER_IS_BETTER_TOKENS = ["resistance", "impedance", "thermal", "temperature", "dissipation", "loss", "drop", "delay", "reactance", "onresistance", "offresistance", "rise", "transition"];

function getMetricPreference(key: string): "higher" | "lower" {
  const normalised = key.toLowerCase();
  if (LOWER_IS_BETTER_TOKENS.some((token) => normalised.includes(token))) {
    return "lower";
  }
  if (HIGHER_IS_BETTER_TOKENS.some((token) => normalised.includes(token))) {
    return "higher";
  }
  return "higher";
}

function formatShowdownRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatDeltaLabel(metricKey: string, unitHint: string | null, numericA: number | null, numericB: number | null): string | null {
  if (numericA === null || numericB === null) {
    return null;
  }

  const difference = numericA - numericB;
  if (!Number.isFinite(difference) || Math.abs(difference) < 1e-9) {
    return null;
  }

  const normalisedKey = normalisePropertyKey(metricKey);
  const unit = unitHint ?? METRIC_UNIT_MAP[normalisedKey] ?? null;

  if (unit === "%") {
    const decimals = Math.abs(difference) < 10 ? 1 : 0;
    return `Δ ${difference > 0 ? "+" : ""}${difference.toFixed(decimals)} %`;
  }

  const baseline = Math.max(Math.abs(numericB), 1e-9);
  const percentDelta = ((numericA - numericB) / baseline) * 100;
  const percentLabel = `${percentDelta > 0 ? "+" : ""}${percentDelta.toFixed(Math.abs(percentDelta) < 10 ? 1 : 0)}%`;
  const formatted = formatNumericForProperty(metricKey, difference).display;
  return `Δ ${difference > 0 ? "+" : ""}${formatted.trim()} (${percentLabel})`;
}

function computeShowdownScore(componentA: ComponentShowdownProfile | null, componentB: ComponentShowdownProfile | null): ShowdownScore {
  if (!componentA || !componentB) {
    return { totalRounds: 0, leftWins: 0, rightWins: 0, ties: 0, rounds: [], winner: null, dominantMetric: null };
  }

  const mapA = new Map(componentA.metrics.map((metric) => [metric.key, metric]));
  const rounds: ShowdownRound[] = [];
  let leftWins = 0;
  let rightWins = 0;
  let ties = 0;

  componentB.metrics.forEach((metricB) => {
    const metricA = mapA.get(metricB.key);
    if (!metricA || metricA.numericValue === null || metricB.numericValue === null) {
      return;
    }

    const preference = getMetricPreference(metricA.key);
    const diff = (metricA.numericValue as number) - (metricB.numericValue as number);
    const base = Math.max(Math.abs(metricA.numericValue as number), Math.abs(metricB.numericValue as number), 1e-9);
    const advantage = preference === "higher" ? diff : -diff;
    const relative = Math.abs(diff) / base;
    const threshold = 0.02;

    let winner: "left" | "right" | "tie";
    if (relative < threshold) {
      winner = "tie";
      ties += 1;
    } else if (advantage > 0) {
      winner = "left";
      leftWins += 1;
    } else {
      winner = "right";
      rightWins += 1;
    }

    const percentDelta = base > 1e-9 ? ((metricA.numericValue as number - metricB.numericValue as number) / base) * 100 : null;
    const percentLabel = percentDelta !== null && Number.isFinite(percentDelta)
      ? `${percentDelta > 0 ? "+" : ""}${percentDelta.toFixed(Math.abs(percentDelta) < 10 ? 1 : 0)}%`
      : null;
    const shortSummary = winner === "tie" ? "Neck and neck" : `${winner === "left" ? "A" : "B"} advantage${percentLabel ? ` ${percentLabel}` : ""}`;

    rounds.push({
      key: metricA.key,
      label: metricA.label,
      leftValue: metricA.displayValue,
      rightValue: metricB.displayValue,
      deltaLabel: formatDeltaLabel(metricA.label, metricA.unit ?? metricB.unit ?? null, metricA.numericValue, metricB.numericValue),
      winner,
      preference,
      advantageScore: relative,
      shortSummary
    });
  });

  rounds.sort((a, b) => b.advantageScore - a.advantageScore);

  const totalRounds = rounds.length;
  const winner = totalRounds === 0 ? null : leftWins > rightWins ? "left" : rightWins > leftWins ? "right" : "tie";

  return {
    totalRounds,
    leftWins,
    rightWins,
    ties,
    rounds,
    winner,
    dominantMetric: rounds[0]?.label ?? null
  };
}

const SAMPLE_IMPORTS: { id: string; label: string; description: string; payload: ArenaPayload }[] = (() => {
  const ledShowdown: ArenaComponent[] = [
    {
      id: "sample-led-photon",
      name: "Photon Burst LED",
      type: "led",
      properties: {
        forwardVoltage: 2.1,
        seriesResistance: 68,
        efficiency: 0.48,
        thermalResistance: 88,
        current: 0.24
      }
    },
    {
      id: "sample-resistor-precision",
      name: "Precision Resistor 100Ω",
      type: "resistor",
      properties: {
        resistance: 100,
        tolerance: 0.01,
        thermalResistance: 55,
        tempCoeff: 0.0002
      }
    },
    {
      id: "sample-switch-mosfet",
      name: "MOSFET Driver Switch",
      type: "switch",
      properties: {
        onResistance: 0.012,
        offResistance: 500000,
        transitionTimeMs: 0.8,
        efficiency: 0.91
      }
    }
  ];

  const energyClash: ArenaComponent[] = [
    {
      id: "sample-battery-max",
      name: "MaxCharge Li-Ion Pack",
      type: "battery",
      properties: {
        voltage: 11.1,
        internalResistance: 0.09,
        capacityMah: 5200,
        maxDischargeCurrent: 4.2,
        thermalResistance: 32
      }
    },
    {
      id: "sample-capacitor-ultra",
      name: "UltraCap 20F",
      type: "capacitor",
      properties: {
        capacitance: 20,
        esr: 0.035,
        tempCoeff: 0.00015,
        thermalResistance: 28
      }
    }
  ];

  return [
    {
      id: "led-showdown",
      label: "Photon Arena Starter",
      description: "LED drive train versus precision resistor and MOSFET support crew.",
      payload: {
        source: "sample",
        label: "Photon Arena Starter",
        generatedAt: Date.now(),
        summary: buildSummaryFromComponents(ledShowdown),
        state: { components: ledShowdown }
      }
    },
    {
      id: "energy-clash",
      label: "Energy Storage Clash",
      description: "Li-ion pack against an ultracapacitor for burst delivery duels.",
      payload: {
        source: "sample",
        label: "Energy Storage Clash",
        generatedAt: Date.now(),
        summary: buildSummaryFromComponents(energyClash),
        state: { components: energyClash }
      }
    }
  ];
})();

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return "No sync yet";
  }

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "No sync yet";
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "No sync yet";
  }
}

export default function ArenaView({ variant = "page", onNavigateBack, onOpenBuilder }: ArenaViewProps) {
  const isEmbedded = variant === "embedded";
  const handleBackClick = useCallback(() => {
    if (typeof onNavigateBack === "function") {
      onNavigateBack();
    }
  }, [onNavigateBack]);
  const handleOpenBuilderClick = useCallback(() => {
    if (typeof onOpenBuilder === "function") {
      onOpenBuilder();
    }
  }, [onOpenBuilder]);
  const showOpenBuilderButton = typeof onOpenBuilder === "function";
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importPayload, setImportPayload] = useState<ArenaPayload | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(DEFAULT_STATUS);
  const [manualImportText, setManualImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [recentImportSource, setRecentImportSource] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [showdownSelection, setShowdownSelection] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });

  const sendArenaMessage = useCallback((message: ArenaBridgeMessage) => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) {
      return false;
    }

    try {
      frameWindow.postMessage(message, "*");
      return true;
    } catch (error) {
      console.warn("Arena bridge message failed", error);
      return false;
    }
  }, []);

  const applyResolvedPayload = useCallback(
    (payload: ArenaPayload, meta: { statusMessage?: string; sourceOverride?: string; persist?: boolean } = {}) => {
      const enriched: ArenaPayload = {
        ...payload,
        source: meta.sourceOverride ?? payload.source ?? "external",
        generatedAt: payload.generatedAt ?? Date.now(),
        summary: payload.summary ?? buildSummaryFromComponents(payload.state?.components)
      };

      setImportPayload(enriched);
      setBridgeStatus(meta.statusMessage ?? `Loaded ${enriched.label ?? "component import"}.`);
      setImportError(null);
      const sourceBadgeParts = [enriched.source, enriched.label].filter(Boolean);
      setRecentImportSource(sourceBadgeParts.length ? sourceBadgeParts.join(" · ") : enriched.source ?? null);

      if (typeof window !== "undefined" && meta.persist !== false) {
        try {
          window.localStorage?.setItem(ARENA_STORAGE_KEY, JSON.stringify(enriched));
        } catch (error) {
          console.warn("Arena: unable to persist import payload", error);
        }
      }

      if (frameReady) {
        sendArenaMessage({ type: "arena:import", payload: enriched });
      }
    },
    [frameReady, sendArenaMessage]
  );

  const readLatestPayload = useCallback(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }

    return parseArenaPayload(window.localStorage.getItem(ARENA_STORAGE_KEY));
  }, []);

  const handleExternalImport = useCallback(
    (raw: unknown, meta: { label?: string; source: string; statusMessage?: string; persist?: boolean }) => {
      const normalised = normaliseImportPayload(raw, { label: meta.label, source: meta.source });
      if (!normalised) {
        setImportError("We couldn't find any components in that dataset.");
        setBridgeStatus("Import failed. Please verify the dataset format.");
        return false;
      }

      const enriched: ArenaPayload = {
        ...normalised,
        source: meta.source,
        label: normalised.label ?? meta.label,
        generatedAt: normalised.generatedAt ?? Date.now(),
        summary: normalised.summary ?? buildSummaryFromComponents(normalised.state?.components)
      };

      applyResolvedPayload(enriched, {
        sourceOverride: meta.source,
        statusMessage: meta.statusMessage,
        persist: meta.persist
      });
      return true;
    },
    [applyResolvedPayload]
  );

  const processImportFile = useCallback(
    (file: File) => {
      setImportPending(true);
      setImportError(null);
      setBridgeStatus(`Processing ${file.name}...`);

      const reader = new FileReader();
      reader.onload = () => {
        setImportPending(false);
        try {
          const text = typeof reader.result === "string" ? reader.result : new TextDecoder().decode(reader.result as ArrayBuffer);
          const parsed = JSON.parse(text);
          const success = handleExternalImport(parsed, {
            source: "upload",
            label: file.name.replace(/\.[^.]+$/u, ""),
            statusMessage: `Imported components from ${file.name}.`
          });
          if (!success) {
            setImportError("Uploaded file did not contain any components.");
          }
        } catch (error) {
          console.warn("Arena: file import parse failed", error);
          setImportError("Invalid JSON file. Please export from the builder or use the Arena JSON schema.");
          setBridgeStatus("Import failed. Invalid JSON dataset.");
        }
      };
      reader.onerror = () => {
        setImportPending(false);
        setImportError("Couldn't read the selected file. Please try again.");
        setBridgeStatus("Import failed while reading file.");
      };
      reader.onloadend = () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsText(file);
    },
    [handleExternalImport]
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      processImportFile(file);
    },
    [processImportFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
      event.dataTransfer?.clearData();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        processImportFile(file);
      }
    },
    [processImportFile]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsDragActive(false);
  }, []);

  const handleManualImportSubmit = useCallback(() => {
    if (!manualImportText.trim()) {
      setImportError("Paste a JSON payload to import components.");
      return;
    }

    try {
      setImportError(null);
      setBridgeStatus("Processing pasted JSON...");
      const parsed = JSON.parse(manualImportText);
      const success = handleExternalImport(parsed, {
        source: "manual",
        label: "Manual Import",
        statusMessage: "Imported components from pasted JSON.",
        persist: true
      });
      if (success) {
        setImportError(null);
        setManualImportText("");
      }
    } catch (error) {
      console.warn("Arena: manual import parse failed", error);
      setImportError("Invalid JSON. Please fix formatting and try again.");
      setBridgeStatus("Import failed. Invalid JSON dataset.");
    }
  }, [handleExternalImport, manualImportText]);

  const handleSampleImport = useCallback(
    (payload: ArenaPayload) => {
      applyResolvedPayload(
        {
          ...payload,
          generatedAt: Date.now()
        },
        {
          sourceOverride: payload.source ?? "sample",
          statusMessage: `Loaded ${payload.label ?? "sample"}.`
        }
      );
    },
    [applyResolvedPayload]
  );

  useEffect(() => {
    const existingPayload = readLatestPayload();
    if (existingPayload) {
      applyResolvedPayload(existingPayload, {
        statusMessage: "Loaded builder circuit snapshot.",
        sourceOverride: existingPayload.source ?? "builder",
        persist: false
      });
    }
  }, [applyResolvedPayload, readLatestPayload]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ARENA_STORAGE_KEY) {
        return;
      }

      const next = parseArenaPayload(event.newValue);
      if (next) {
        applyResolvedPayload(next, {
          statusMessage: "Synced new build from Builder.",
          sourceOverride: next.source ?? "builder",
          persist: false
        });
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyResolvedPayload]);

  useEffect(() => {
    if (!frameReady || !importPayload) {
      return;
    }

    sendArenaMessage({ type: "arena:import", payload: importPayload });
  }, [frameReady, importPayload, sendArenaMessage]);

  const sampleImports = useMemo(() => SAMPLE_IMPORTS, []);

  const resolvedComponents = useMemo(() => {
    const components = importPayload?.state?.components ?? [];
    return components.map((component, index) => {
      const uid = component.id && component.id.length > 0 ? component.id : `${component.type ?? "component"}-${index}`;
      return { component, uid, index };
    });
  }, [importPayload]);

  const componentProfiles = useMemo<ComponentShowdownProfile[]>(() => {
    return resolvedComponents.map(({ component, uid, index }) => buildComponentProfile(component, index, uid));
  }, [resolvedComponents]);

  useEffect(() => {
    if (componentProfiles.length === 0) {
      setShowdownSelection((prev) => {
        if (prev.left === null && prev.right === null) {
          return prev;
        }
        return { left: null, right: null };
      });
      return;
    }

    setShowdownSelection((prev) => {
      const fallbackLeft = componentProfiles[0]?.uid ?? null;
      const fallbackRight = componentProfiles.length > 1 ? componentProfiles[1]?.uid ?? null : null;

      const left = prev.left && componentProfiles.some((profile) => profile.uid === prev.left) ? prev.left : fallbackLeft;

      let nextRight: string | null;
      if (prev.right && componentProfiles.some((profile) => profile.uid === prev.right)) {
        nextRight = prev.right;
      } else {
        nextRight = fallbackRight && fallbackRight !== left ? fallbackRight : null;
      }

      const updated = {
        left,
        right: nextRight
      };

      if (prev.left === updated.left && prev.right === updated.right) {
        return prev;
      }

      return updated;
    });
  }, [componentProfiles]);

  const componentOptions = useMemo(
    () =>
      componentProfiles.map((profile) => ({
        uid: profile.uid,
        label: `${profile.name} (${profile.type})`
      })),
    [componentProfiles]
  );

  const componentAProfile = useMemo(() => {
    if (!componentProfiles.length) {
      return null;
    }
    if (showdownSelection.left) {
      const match = componentProfiles.find((profile) => profile.uid === showdownSelection.left);
      if (match) {
        return match;
      }
    }
    return componentProfiles[0] ?? null;
  }, [componentProfiles, showdownSelection.left]);

  const componentBProfile = useMemo(() => {
    if (!componentProfiles.length) {
      return null;
    }
    if (showdownSelection.right) {
      const match = componentProfiles.find((profile) => profile.uid === showdownSelection.right);
      if (match) {
        return match;
      }
    }
    return componentProfiles.length > 1 ? componentProfiles[1] : null;
  }, [componentProfiles, showdownSelection.right]);

  const componentAMetricMap = useMemo(
    () => new Map(componentAProfile?.metrics.map((metric) => [metric.key, metric]) ?? []),
    [componentAProfile]
  );

  const componentBMetricMap = useMemo(
    () => new Map(componentBProfile?.metrics.map((metric) => [metric.key, metric]) ?? []),
    [componentBProfile]
  );

  const leftHighlightMetrics = useMemo(() => (componentAProfile ? componentAProfile.metrics.slice(0, 12) : []), [componentAProfile]);

  const rightHighlightMetrics = useMemo(() => (componentBProfile ? componentBProfile.metrics.slice(0, 12) : []), [componentBProfile]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (!componentAProfile && !componentBProfile) {
      return [];
    }

    const orderedKeys: string[] = [];

    const registerKeys = (profile: ComponentShowdownProfile | null) => {
      profile?.metrics.forEach((metric) => {
        if (!orderedKeys.includes(metric.key)) {
          orderedKeys.push(metric.key);
        }
      });
    };

    registerKeys(componentAProfile);
    registerKeys(componentBProfile);

    return orderedKeys
      .map((key) => {
        const metricA = componentAProfile?.metrics.find((metric) => metric.key === key);
        const metricB = componentBProfile?.metrics.find((metric) => metric.key === key);
        if (!metricA && !metricB) {
          return null;
        }

        const label = metricA?.label ?? metricB?.label ?? formatPropertyLabel(key);
        const aValue = metricA?.displayValue ?? "—";
        const bValue = metricB?.displayValue ?? "—";
        const deltaLabel = metricA && metricB ? formatDeltaLabel(label, metricA.unit ?? metricB.unit ?? null, metricA.numericValue, metricB.numericValue) : null;

        return {
          key,
          label,
          aValue,
          bValue,
          deltaLabel
        };
      })
      .filter((row): row is ComparisonRow => row !== null);
  }, [componentAProfile, componentBProfile]);

  const showdownScore = useMemo(() => computeShowdownScore(componentAProfile, componentBProfile), [componentAProfile, componentBProfile]);
  const showdownWinner = showdownScore.winner;
  const teamAChampion = showdownWinner === "left";
  const teamBChampion = showdownWinner === "right";
  const showdownTie = showdownWinner === "tie";
  const showdownRoundByKey = useMemo(() => {
    const map = new Map<string, ShowdownRound>();
    showdownScore.rounds.forEach((round) => {
      map.set(round.key, round);
    });
    return map;
  }, [showdownScore.rounds]);
  const leftRecord = useMemo(() => formatShowdownRecord(showdownScore.leftWins, showdownScore.rightWins, showdownScore.ties), [showdownScore.leftWins, showdownScore.rightWins, showdownScore.ties]);
  const rightRecord = useMemo(() => formatShowdownRecord(showdownScore.rightWins, showdownScore.leftWins, showdownScore.ties), [showdownScore.leftWins, showdownScore.rightWins, showdownScore.ties]);
  const topRounds = useMemo(() => showdownScore.rounds.slice(0, 5), [showdownScore]);
  const hasShowdown = showdownScore.totalRounds > 0;

  const metrics = useMemo(() => {
    const base = importPayload?.metrics ?? {};
    return [
      { id: "power", letter: "W", label: "Watts", value: formatMetric(base.power ?? null, "W") },
      { id: "current", letter: "I", label: "Current", value: formatMetric(base.current ?? null, "A") },
      { id: "resistance", letter: "R", label: "Resistance", value: formatMetric(base.resistance ?? null, "Ω") },
      { id: "voltage", letter: "E", label: "Voltage", value: formatMetric(base.voltage ?? null, "V") }
    ];
  }, [importPayload]);

  const typeBreakdown = useMemo(() => {
    const byType = importPayload?.summary?.byType ?? {};
    return Object.entries(byType).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [importPayload]);

  const roster = useMemo(() => {
    return componentProfiles.slice(0, 6).map((profile) => {
      const fallbackMetric = profile.metrics[0] ? `${profile.metrics[0].label}: ${profile.metrics[0].displayValue}` : null;
      return {
        id: profile.uid,
        name: profile.name,
        type: profile.type,
        details: profile.summary ?? fallbackMetric
      };
    });
  }, [componentProfiles]);

  const circuitTotals = useMemo(() => {
    const summary = importPayload?.summary;
    if (!summary) {
      return [];
    }

    return [
      { label: "Components", value: summary.totalComponents ?? 0 },
      { label: "Wires", value: summary.totalWires ?? 0 },
      { label: "Junctions", value: summary.totalJunctions ?? 0 }
    ];
  }, [importPayload]);

  const handleSyncFromStorage = useCallback(() => {
    const latest = readLatestPayload();
    if (latest) {
      applyResolvedPayload(latest, {
        statusMessage: "Loaded builder circuit snapshot.",
        sourceOverride: latest.source ?? "builder"
      });
    } else {
      setBridgeStatus("No saved builder snapshot yet. Open Builder and choose Component Arena to sync.");
      setImportError("No builder snapshot detected. Open the builder and export to arena first.");
    }
  }, [applyResolvedPayload, readLatestPayload]);

  const handleCommand = useCallback(
    (command: "reset" | "run-test" | "export") => {
      const success = sendArenaMessage({ type: "arena:command", payload: { command } });
      setBridgeStatus(
        success ?
          (command === "reset"
            ? "Arena reset command sent."
            : command === "run-test"
            ? "Triggered quick test inside the arena."
            : "Requested arena export.")
          : "Unable to reach arena frame."
      );
    },
    [sendArenaMessage]
  );

  return (
    <div className="arena-page">
      <header className="arena-header">
        <div className="arena-header-left">
          <button className="arena-btn ghost" type="button" onClick={handleBackClick}>
            {isEmbedded ? "Close" : "← Back"}
          </button>
          <div className="arena-title-group">
            <h1>Component Arena</h1>
            <p>Lightning drills for your W.I.R.E. builds.</p>
          </div>
        </div>
        <div className="arena-header-right">
          <div className="arena-sync-meta">
            <span className="arena-sync-status">{importPending ? "Importing dataset..." : importPayload ? "Arena linked" : "Waiting for builder import"}</span>
            {recentImportSource && <span className="arena-sync-source">{recentImportSource}</span>}
            <span className="arena-sync-timestamp">{formatTimestamp(importPayload?.generatedAt)}</span>
          </div>
          {showOpenBuilderButton ? (
            <button className="arena-btn outline" type="button" onClick={handleOpenBuilderClick}>
              Open Builder
            </button>
          ) : null}
        </div>
      </header>

      <div className="arena-body">
        <aside className="arena-rail">
          <section className="arena-card">
            <div className="arena-card-header">
              <h2>W.I.R.E. Snapshot</h2>
              <button className="arena-btn link" type="button" onClick={handleSyncFromStorage}>
                {importPayload ? "Refresh" : "Sync"}
              </button>
            </div>
            <div className="arena-metric-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className={`arena-metric metric-${metric.letter.toLowerCase()}`}>
                  <div className="metric-letter">{metric.letter}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section
            className={`arena-card arena-import-card${isDragActive ? " drag-active" : ""}`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="arena-card-header">
              <div>
                <h2>Import Hub</h2>
                <p className="arena-import-intro">Drop JSON files, paste data, or pull from the builder to prep for battle testing.</p>
              </div>
              <div className="arena-import-chips">
                {recentImportSource && <span className="arena-import-chip">{recentImportSource}</span>}
                {typeof importPayload?.summary?.totalComponents === "number" && (
                  <span className="arena-import-chip">{importPayload.summary.totalComponents} components</span>
                )}
              </div>
            </div>
            <p className="arena-status-text">{bridgeStatus}</p>
            {importError && <p className="arena-status-text arena-status-error">{importError}</p>}
            <div className="arena-import-grid">
              <div className="arena-import-column">
                <div className="arena-import-actions">
                  <button className="arena-btn solid" type="button" onClick={handleSyncFromStorage} disabled={importPending}>
                    Pull Latest Builder State
                  </button>
                  {showOpenBuilderButton ? (
                    <button className="arena-btn ghost" type="button" onClick={handleOpenBuilderClick}>
                      Open Builder
                    </button>
                  ) : null}
                  <button className="arena-btn outline" type="button" onClick={() => handleCommand("export")}>Export Results</button>
                </div>
                <div className="arena-import-samples">
                  <span className="arena-import-subheading">Quick Samples</span>
                  <div className="arena-import-sample-buttons">
                    {sampleImports.map((sample) => (
                      <button
                        key={sample.id}
                        className="arena-sample-btn"
                        type="button"
                        onClick={() => handleSampleImport(sample.payload)}
                        disabled={importPending}
                      >
                        <span className="sample-title">{sample.label}</span>
                        <span className="sample-desc">{sample.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="arena-btn link"
                  type="button"
                  onClick={() => sampleImports[0] && handleSampleImport(sampleImports[0].payload)}
                  disabled={!sampleImports.length || importPending}
                >
                  Reload default sample library
                </button>
              </div>
              <div className="arena-import-column">
                <div
                  className={`arena-import-dropzone${isDragActive ? " is-active" : ""}`}
                  onDragEnter={handleDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    className="arena-import-file-input"
                    type="file"
                    accept="application/json"
                    onChange={handleFileInputChange}
                    disabled={importPending}
                  />
                  <div className="arena-import-dropcopy">
                    <strong>Drag & Drop JSON</strong>
                    <span>
                      or
                      <button className="arena-import-browse" type="button" onClick={() => fileInputRef.current?.click()} disabled={importPending}>
                        Browse
                      </button>
                    </span>
                    <span className="arena-import-hint">Supports builder exports, Arena exports, and custom component sets.</span>
                  </div>
                </div>
                <label className="arena-import-textlabel">
                  <span className="arena-import-textlabel-heading">Paste JSON</span>
                  <textarea
                    value={manualImportText}
                    onChange={(event) => setManualImportText(event.target.value)}
                    placeholder="Paste components JSON from the builder, lab equipment, or another arena."
                    rows={6}
                  />
                </label>
                <div className="arena-import-submit">
                  <button
                    className="arena-btn solid"
                    type="button"
                    onClick={handleManualImportSubmit}
                    disabled={importPending || manualImportText.trim().length === 0}
                  >
                    Import Pasted JSON
                  </button>
                  <button
                    className="arena-btn ghost"
                    type="button"
                    onClick={() => setManualImportText("")}
                    disabled={manualImportText.trim().length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </section>

          {circuitTotals.length > 0 && (
            <section className="arena-card">
              <div className="arena-card-header">
                <h2>Session Totals</h2>
              </div>
              <div className="arena-total-grid">
                {circuitTotals.map((item) => (
                  <div key={item.label} className="arena-total">
                    <span className="arena-total-label">{item.label}</span>
                    <span className="arena-total-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        <main className="arena-stage" aria-busy={!frameReady}>
          <section className="arena-card arena-showdown-card">
            <div className="arena-card-header">
              <div>
                <h2>Component Showdown</h2>
                <p className="arena-showdown-intro">Pick two components from your import to compare their key metrics side by side.</p>
              </div>
            </div>

            {componentProfiles.length > 0 ? (
              <>
                <div className="arena-showdown-selects">
                  <label className="arena-showdown-select">
                    <span className="arena-showdown-select-label">Component A</span>
                    <select
                      aria-label="Component A selection"
                      value={componentAProfile?.uid ?? showdownSelection.left ?? ""}
                      onChange={(event) =>
                        setShowdownSelection((prev) => ({
                          left: event.target.value || null,
                          right: prev.right
                        }))
                      }
                    >
                      <option value="" disabled>
                        {componentProfiles.length ? "Select component" : "No components"}
                      </option>
                      {componentOptions.map((option) => (
                        <option key={option.uid} value={option.uid}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="arena-showdown-select">
                    <span className="arena-showdown-select-label">Component B</span>
                    <select
                      aria-label="Component B selection"
                      value={showdownSelection.right ?? ""}
                      onChange={(event) =>
                        setShowdownSelection((prev) => ({
                          left: prev.left,
                          right: event.target.value || null
                        }))
                      }
                    >
                      <option value="">Select component</option>
                      {componentOptions.map((option) => (
                        <option key={option.uid} value={option.uid}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="arena-showdown-competitors">
                  <div className={`arena-showdown-team${teamAChampion ? " winner" : showdownTie ? " tie" : ""}`}>
                    {componentAProfile && (
                      <div className={`arena-showdown-avatar arena-avatar-${normaliseTypeForClass(componentAProfile.type)}`}>
                        <span>{getComponentBadgeLabel(componentAProfile.type)}</span>
                      </div>
                    )}
                    <span className="arena-showdown-tag">Component A</span>
                    {teamAChampion && <span className="arena-showdown-badge">Champion</span>}
                    {showdownTie && <span className="arena-showdown-badge neutral">Dead Heat</span>}
                    <h3>{componentAProfile?.name ?? "Select a component"}</h3>
                    <span className="arena-showdown-type">{componentAProfile?.type ?? "—"}</span>
                    {componentAProfile?.summary && <p>{componentAProfile.summary}</p>}
                    {hasShowdown && <span className="arena-showdown-record">Record {leftRecord}</span>}
                    {leftHighlightMetrics.length > 0 && (
                      <ul className="arena-showdown-statlist">
                        {leftHighlightMetrics.map((metric) => {
                          const counterpart = componentBMetricMap.get(metric.key);
                          const counterpartNumeric = counterpart?.numericValue ?? null;
                          const round = showdownRoundByKey.get(metric.key);
                          const hasNumeric = metric.numericValue !== null && counterpartNumeric !== null;
                          const deltaLabel = hasNumeric ? round?.deltaLabel ?? formatDeltaLabel(metric.label, metric.unit ?? counterpart?.unit ?? null, metric.numericValue, counterpartNumeric) : null;
                          let statusClass = "";
                          if (round) {
                            if (round.winner === "left") {
                              statusClass = " win";
                            } else if (round.winner === "right") {
                              statusClass = " loss";
                            } else {
                              statusClass = " tie";
                            }
                          }
                          return (
                            <li key={`left-${metric.key}`} className={`arena-showdown-stat${statusClass}`}>
                              <span className="arena-stat-label">{metric.label}</span>
                              <span className="arena-stat-value">{metric.displayValue}</span>
                              {deltaLabel && <span className="arena-stat-delta">{deltaLabel}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="arena-showdown-versus">VS</div>
                  <div className={`arena-showdown-team${teamBChampion ? " winner" : showdownTie ? " tie" : ""}`}>
                    {componentBProfile && (
                      <div className={`arena-showdown-avatar arena-avatar-${normaliseTypeForClass(componentBProfile.type)}`}>
                        <span>{getComponentBadgeLabel(componentBProfile.type)}</span>
                      </div>
                    )}
                    <span className="arena-showdown-tag">Component B</span>
                    {teamBChampion && <span className="arena-showdown-badge">Champion</span>}
                    {showdownTie && <span className="arena-showdown-badge neutral">Dead Heat</span>}
                    <h3>{componentBProfile?.name ?? "Select a component"}</h3>
                    <span className="arena-showdown-type">{componentBProfile?.type ?? "—"}</span>
                    {componentBProfile?.summary && <p>{componentBProfile.summary}</p>}
                    {hasShowdown && <span className="arena-showdown-record">Record {rightRecord}</span>}
                    {rightHighlightMetrics.length > 0 && (
                      <ul className="arena-showdown-statlist">
                        {rightHighlightMetrics.map((metric) => {
                          const counterpart = componentAMetricMap.get(metric.key);
                          const counterpartNumeric = counterpart?.numericValue ?? null;
                          const round = showdownRoundByKey.get(metric.key);
                          const hasNumeric = metric.numericValue !== null && counterpartNumeric !== null;
                          const deltaLabel = hasNumeric ? formatDeltaLabel(metric.label, metric.unit ?? counterpart?.unit ?? null, metric.numericValue, counterpartNumeric) : null;
                          let statusClass = "";
                          if (round) {
                            if (round.winner === "right") {
                              statusClass = " win";
                            } else if (round.winner === "left") {
                              statusClass = " loss";
                            } else {
                              statusClass = " tie";
                            }
                          }
                          return (
                            <li key={`right-${metric.key}`} className={`arena-showdown-stat${statusClass}`}>
                              <span className="arena-stat-label">{metric.label}</span>
                              <span className="arena-stat-value">{metric.displayValue}</span>
                              {deltaLabel && <span className="arena-stat-delta">{deltaLabel}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {hasShowdown && (
                  <div className="arena-showdown-scoreboard">
                    <div className="arena-scoreboard-totals">
                      <div className={`score-chip team-a${teamAChampion ? " leading" : ""}`}>
                        <span className="score-name">{componentAProfile?.name ?? "Component A"}</span>
                        <span className="score-value">{showdownScore.leftWins}</span>
                        <span className="score-record">{leftRecord}</span>
                      </div>
                      <div className="score-divider">
                        <span className="score-vs">VS</span>
                        <span className="score-rounds">{showdownScore.totalRounds} rounds</span>
                        {showdownScore.ties > 0 && <span className="score-ties">{showdownScore.ties} ties</span>}
                        {showdownScore.dominantMetric && <span className="score-dominant">Highlight · {showdownScore.dominantMetric}</span>}
                      </div>
                      <div className={`score-chip team-b${teamBChampion ? " leading" : ""}`}>
                        <span className="score-name">{componentBProfile?.name ?? "Component B"}</span>
                        <span className="score-value">{showdownScore.rightWins}</span>
                        <span className="score-record">{rightRecord}</span>
                      </div>
                    </div>
                    {topRounds.length > 0 && (
                      <ul className="arena-score-rounds">
                        {topRounds.map((round) => (
                          <li
                            key={round.key}
                            className={`score-round ${round.winner === "left" ? "win-left" : round.winner === "right" ? "win-right" : "tie"}`}
                          >
                            <span className="round-label">{round.label}</span>
                            <div className="round-values">
                              <span className="round-value round-value-a">{round.leftValue}</span>
                              <span className="round-delta">{round.deltaLabel ?? round.shortSummary}</span>
                              <span className="round-value round-value-b">{round.rightValue}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {componentProfiles.length < 2 && (
                  <p className="arena-showdown-hint">Only one component available. Pull another build to compare head-to-head.</p>
                )}

                {comparisonRows.length > 0 ? (
                  <ul className="arena-showdown-table">
                    {comparisonRows.map((row) => (
                      <li key={row.key}>
                        <div className="arena-showdown-value value-a">{row.aValue}</div>
                        <div className="arena-showdown-metric">
                          <span className="metric-name">{row.label}</span>
                          {row.deltaLabel && <span className="arena-showdown-delta">{row.deltaLabel}</span>}
                        </div>
                        <div className="arena-showdown-value value-b">{row.bValue}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="arena-empty">No comparable metrics found for the selected components.</p>
                )}
              </>
            ) : (
              <p className="arena-empty">Sync a builder snapshot to start comparing components.</p>
            )}
          </section>

          <div className="arena-toolbar">
            <button className="arena-btn ghost" type="button" onClick={() => handleCommand("reset")}>
              Reset Stage
            </button>
            <button className="arena-btn solid" type="button" onClick={() => handleCommand("run-test")}>
              Run Quick Test
            </button>
            <button className="arena-btn outline" type="button" onClick={() => handleCommand("export")}>
              Export Results
            </button>
          </div>
          <div className="arena-frame-wrapper">
            <iframe
              ref={iframeRef}
              className="arena-frame"
              title="Component Arena"
              src="arena.html"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onLoad={() => {
                setFrameReady(true);
                if (importPayload) {
                  sendArenaMessage({ type: "arena:import", payload: importPayload });
                }
              }}
            />
          </div>
        </main>

        <aside className="arena-details">
          <section className="arena-card">
            <div className="arena-card-header">
              <h2>Component Roster</h2>
            </div>
            {roster.length > 0 ? (
              <ul className="arena-roster">
                {roster.map((item) => (
                  <li key={item.id}>
                    <span className="roster-name">{item.name}</span>
                    <span className="roster-type">{item.type}</span>
                    {item.details && <span className="roster-detail">{item.details}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="arena-empty">No components imported yet.</p>
            )}
          </section>

          {typeBreakdown.length > 0 && (
            <section className="arena-card">
              <div className="arena-card-header">
                <h2>Type Breakdown</h2>
              </div>
              <ul className="arena-breakdown">
                {typeBreakdown.map(([type, count]) => (
                  <li key={type}>
                    <span className="breakdown-type">{type}</span>
                    <span className="breakdown-count">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
