import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, CSSProperties } from "react";
import WordMark from "../WordMark";
import "../../styles/arena.css";
import { Component3DViewer } from "./Component3DViewer";

type ArenaViewProps = {
  variant?: "page" | "embedded" | "workspace";
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
  formula?: string;
  derivedFrom?: string[];
};

type ComponentShowdownProfile = {
  uid: string;
  name: string;
  type: string;
  componentNumber: string | null;
  summary: string | null;
  metrics: ComponentMetricEntry[];
};

type TelemetryPreset = {
  id: string;
  label: string;
  tokens: string[];
  icon: string;
  thresholds: {
    warning: number;
    critical: number;
  };
  direction?: "higher" | "lower";
};

type ComponentTelemetryEntry = {
  id: string;
  label: string;
  icon: string;
  displayValue: string;
  severity: "normal" | "warning" | "critical";
  metric: ComponentMetricEntry | null;
};

type NameplateMetricTrend = "up" | "down" | "steady";

type NameplateMetric = {
  id: string;
  label: string;
  icon: string;
  displayValue: string;
  severity: "normal" | "warning" | "critical";
  trend: NameplateMetricTrend;
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
  bjt: "BJT",
  mosfet: "MOS",
  fuse: "FUS",
  potentiometer: "POT",
  lamp: "LMP",
  ground: "GND",
  generic: "CMP"
};

const TELEMETRY_PRESETS: TelemetryPreset[] = [
  {
    id: "power",
    label: "Power Output",
    tokens: ["power", "powerdissipation", "energydelivered", "energy"],
    icon: "⚡",
    thresholds: { warning: 50, critical: 150 }
  },
  {
    id: "current",
    label: "Current Draw",
    tokens: ["current", "currentpeak", "currentrms", "maxdischargecurrent"],
    icon: "🔌",
    thresholds: { warning: 5, critical: 15 }
  },
  {
    id: "voltage",
    label: "Voltage",
    tokens: ["voltage", "forwardvoltage", "operatingvoltage"],
    icon: "🔋",
    thresholds: { warning: 24, critical: 60 }
  },
  {
    id: "temperature",
    label: "Thermal Load",
    tokens: ["temperature", "operatingtemperature", "thermalrise"],
    icon: "🔥",
    thresholds: { warning: 60, critical: 90 }
  },
  {
    id: "efficiency",
    label: "Efficiency",
    tokens: ["efficiency"],
    icon: "🎯",
    thresholds: { warning: 0.6, critical: 0.4 },
    direction: "lower"
  }
];

type EnvironmentalScenario = {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditions: {
    temperature?: number;
    humidity?: number;
    voltage?: number;
    load?: number;
  };
  modifiers: {
    power?: number;
    current?: number;
    voltage?: number;
    temperature?: number;
    efficiency?: number;
    resistance?: number;
  };
};

const ENVIRONMENTAL_SCENARIOS: EnvironmentalScenario[] = [
  {
    id: "standard",
    name: "Standard Conditions",
    description: "Room temperature, nominal voltage, standard load",
    icon: "🌡️",
    conditions: {
      temperature: 25,
      humidity: 50,
      voltage: 100,
      load: 100
    },
    modifiers: {
      power: 1.0,
      current: 1.0,
      voltage: 1.0,
      temperature: 1.0,
      efficiency: 1.0,
      resistance: 1.0
    }
  },
  {
    id: "high-temp",
    name: "High Temperature",
    description: "Elevated ambient temperature (50°C), increased thermal stress",
    icon: "🔥",
    conditions: {
      temperature: 50,
      humidity: 40,
      voltage: 100,
      load: 100
    },
    modifiers: {
      power: 0.92,
      current: 1.05,
      voltage: 0.98,
      temperature: 1.65,
      efficiency: 0.88,
      resistance: 1.08
    }
  },
  {
    id: "low-temp",
    name: "Cold Environment",
    description: "Below freezing conditions (-10°C), reduced efficiency",
    icon: "❄️",
    conditions: {
      temperature: -10,
      humidity: 30,
      voltage: 100,
      load: 100
    },
    modifiers: {
      power: 0.85,
      current: 0.90,
      voltage: 0.95,
      temperature: 0.50,
      efficiency: 0.80,
      resistance: 1.15
    }
  },
  {
    id: "overvoltage",
    name: "Overvoltage Stress",
    description: "120% nominal voltage, stress testing conditions",
    icon: "⚡",
    conditions: {
      temperature: 25,
      humidity: 50,
      voltage: 120,
      load: 100
    },
    modifiers: {
      power: 1.44,
      current: 1.20,
      voltage: 1.20,
      temperature: 1.30,
      efficiency: 0.92,
      resistance: 1.0
    }
  },
  {
    id: "undervoltage",
    name: "Undervoltage",
    description: "80% nominal voltage, brownout conditions",
    icon: "🔋",
    conditions: {
      temperature: 25,
      humidity: 50,
      voltage: 80,
      load: 100
    },
    modifiers: {
      power: 0.64,
      current: 0.80,
      voltage: 0.80,
      temperature: 0.85,
      efficiency: 0.85,
      resistance: 1.0
    }
  },
  {
    id: "heavy-load",
    name: "Heavy Load",
    description: "150% load capacity, maximum performance demand",
    icon: "💪",
    conditions: {
      temperature: 25,
      humidity: 50,
      voltage: 100,
      load: 150
    },
    modifiers: {
      power: 1.50,
      current: 1.50,
      voltage: 0.95,
      temperature: 1.85,
      efficiency: 0.75,
      resistance: 1.0
    }
  },
  {
    id: "light-load",
    name: "Light Load",
    description: "25% load capacity, minimal power consumption",
    icon: "🪶",
    conditions: {
      temperature: 25,
      humidity: 50,
      voltage: 100,
      load: 25
    },
    modifiers: {
      power: 0.25,
      current: 0.25,
      voltage: 1.02,
      temperature: 0.60,
      efficiency: 0.95,
      resistance: 1.0
    }
  },
  {
    id: "humid",
    name: "High Humidity",
    description: "90% humidity, moisture stress conditions",
    icon: "💧",
    conditions: {
      temperature: 30,
      humidity: 90,
      voltage: 100,
      load: 100
    },
    modifiers: {
      power: 0.94,
      current: 0.97,
      voltage: 0.98,
      temperature: 1.15,
      efficiency: 0.90,
      resistance: 1.12
    }
  },
  {
    id: "extreme",
    name: "Extreme Conditions",
    description: "Combined stress: high temp, overvoltage, heavy load",
    icon: "⚠️",
    conditions: {
      temperature: 60,
      humidity: 80,
      voltage: 125,
      load: 180
    },
    modifiers: {
      power: 1.85,
      current: 1.75,
      voltage: 1.10,
      temperature: 2.40,
      efficiency: 0.60,
      resistance: 1.25
    }
  }
];


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
    // Many datasets express efficiency / power factor as a 0..1 ratio. Display those as 0..100%.
    const shouldScaleRatioPercent =
      (normalisedKey.includes("efficiency") || normalisedKey.includes("powerfactor")) && Math.abs(value) <= 1.2;
    const scaledValue = shouldScaleRatioPercent ? value * 100 : value;
    const decimals = Math.abs(scaledValue) < 10 ? 1 : 0;
    return { display: `${scaledValue.toFixed(decimals)} %`, unit };
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

function evaluateSeverity(value: number | null, preset: TelemetryPreset): "normal" | "warning" | "critical" {
  if (value === null || !Number.isFinite(value)) {
    return "normal";
  }

  const direction = preset.direction ?? "higher";
  if (direction === "higher") {
    const magnitude = Math.abs(value);
    if (magnitude >= preset.thresholds.critical) {
      return "critical";
    }
    if (magnitude >= preset.thresholds.warning) {
      return "warning";
    }
    return "normal";
  }

  if (value <= preset.thresholds.critical) {
    return "critical";
  }
  if (value <= preset.thresholds.warning) {
    return "warning";
  }
  return "normal";
}

function findMetricByTokens(profile: ComponentShowdownProfile | null, tokens: string[]): ComponentMetricEntry | null {
  if (!profile) {
    return null;
  }

  return (
    profile.metrics.find((metric) => tokens.some((token) => metric.key.includes(token))) ?? null
  );
}

function buildComponentTelemetry(profile: ComponentShowdownProfile | null): ComponentTelemetryEntry[] {
  return TELEMETRY_PRESETS.map((preset) => {
    const metric = findMetricByTokens(profile, preset.tokens);
    const displayValue = metric?.displayValue ?? "—";
    const severity = evaluateSeverity(metric?.numericValue ?? null, preset);

    return {
      id: preset.id,
      label: preset.label,
      icon: preset.icon,
      displayValue,
      severity,
      metric
    };
  }).filter((entry) => profile !== null || entry.metric !== null);
}

function hashStringToUnitInterval(value: string): number {
  if (!value) {
    return 0.5;
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function formatNameplateLiveValue(entry: ComponentTelemetryEntry, nextValue: number): string {
  if (!entry.metric) {
    return entry.displayValue;
  }
  const metricKey = entry.metric.key || entry.id;
  return formatNumericForProperty(metricKey, nextValue).display;
}

function buildNameplateMetrics(
  telemetry: ComponentTelemetryEntry[],
  options: { componentSeed: string; tick: number; isLive: boolean }
): NameplateMetric[] {
  const numericTelemetry = telemetry.filter((entry) => (
    typeof entry.metric?.numericValue === "number" && Number.isFinite(entry.metric.numericValue)
  ));
  const source = (numericTelemetry.length ? numericTelemetry : telemetry).slice(0, 3);

  return source.map((entry, index) => {
    const baseValue = entry.metric?.numericValue;
    if (!options.isLive || typeof baseValue !== "number" || !Number.isFinite(baseValue)) {
      return {
        id: entry.id,
        label: entry.label,
        icon: entry.icon,
        displayValue: entry.displayValue,
        severity: entry.severity,
        trend: "steady" as const
      };
    }

    const seed = hashStringToUnitInterval(`${options.componentSeed}:${entry.id}`);
    const amplitude = entry.severity === "critical" ? 0.04 : entry.severity === "warning" ? 0.028 : 0.018;
    const phase = options.tick * 0.58 + seed * Math.PI * 2 + index * 0.45;
    const waveform = (Math.sin(phase) * 0.7) + (Math.sin(phase * 0.37 + seed * Math.PI) * 0.3);
    const relativeDelta = waveform * amplitude;
    const liveValue = Math.abs(baseValue) < 1e-9 ? baseValue : baseValue * (1 + relativeDelta);
    const derivative = (Math.cos(phase) * 0.7) + (Math.cos(phase * 0.37 + seed * Math.PI) * 0.3);
    const trend: NameplateMetricTrend = derivative > 0.22 ? "up" : derivative < -0.22 ? "down" : "steady";

    return {
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      displayValue: formatNameplateLiveValue(entry, liveValue),
      severity: entry.severity,
      trend
    };
  });
}

function resolveGlyphKey(type?: string | null): string {
  if (!type) {
    return "generic";
  }

  const normalised = normaliseTypeForClass(type).split("-")[0];
  if (!normalised || normalised.trim().length === 0) {
    return "generic";
  }
  return normalised;
}

type ComponentGlyphProps = {
  type?: string | null;
};

function ComponentGlyph({ type }: ComponentGlyphProps) {
  const glyphKey = resolveGlyphKey(type);
  const ariaLabel = type ? `${type} visual` : "Component visual";

  const renderShape = () => {
    switch (glyphKey) {
      case "resistor":
        return (
          <g stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="30" x2="26" y2="30" />
            <polyline points="26,30 36,18 46,42 56,18 66,42 76,18 86,30" />
            <line x1="86" y1="30" x2="114" y2="30" />
          </g>
        );
      case "capacitor":
        return (
          <g stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round">
            <line x1="10" y1="30" x2="46" y2="30" />
            <line x1="46" y1="12" x2="46" y2="48" />
            <line x1="74" y1="12" x2="74" y2="48" />
            <line x1="74" y1="30" x2="110" y2="30" />
          </g>
        );
      case "battery":
        return (
          <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round">
            <rect x="20" y="14" width="24" height="32" rx="6" />
            <rect x="52" y="18" width="24" height="24" rx="4" />
            <line x1="84" y1="24" x2="84" y2="36" />
            <line x1="96" y1="18" x2="96" y2="42" />
          </g>
        );
      case "led":
        return (
          <g stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="34,12 74,30 34,48" fill="currentColor" opacity="0.2" />
            <line x1="10" y1="30" x2="34" y2="30" />
            <line x1="74" y1="30" x2="110" y2="30" />
            <polyline points="58,16 72,4 80,10" />
            <polyline points="62,42 76,30 84,36" />
          </g>
        );
      case "inductor":
        return (
          <g stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round">
            <line x1="6" y1="30" x2="18" y2="30" />
            <path d="M18,30 C30,10 42,50 54,30 C66,10 78,50 90,30 C102,10 114,50 126,30" transform="translate(-12 0)" />
            <line x1="90" y1="30" x2="108" y2="30" />
          </g>
        );
      case "switch":
        return (
          <g stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round">
            <line x1="10" y1="36" x2="46" y2="36" />
            <line x1="46" y1="36" x2="86" y2="16" />
            <line x1="86" y1="16" x2="110" y2="16" />
            <circle cx="46" cy="36" r="6" fill="currentColor" />
          </g>
        );
      case "transistor":
        return (
          <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round">
            <circle cx="46" cy="30" r="18" />
            <line x1="64" y1="30" x2="104" y2="30" />
            <line x1="30" y1="12" x2="18" y2="6" />
            <line x1="30" y1="48" x2="18" y2="54" />
            <polyline points="44,12 70,12 70,26" />
            <polyline points="44,48 70,48 70,34" />
          </g>
        );
      case "sensor":
        return (
          <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round">
            <circle cx="46" cy="30" r="16" />
            <path d="M62,18 C78,10 92,10 106,18" />
            <path d="M62,42 C78,50 92,50 106,42" />
            <line x1="18" y1="30" x2="30" y2="30" />
          </g>
        );
      case "diode":
        return (
          <g stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="30" x2="40" y2="30" />
            <polygon points="40,18 40,42 60,30" fill="currentColor" opacity="0.3" />
            <line x1="60" y1="18" x2="60" y2="42" />
            <line x1="60" y1="30" x2="110" y2="30" />
          </g>
        );
      case "motor":
        return (
          <g stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="46" cy="30" r="20" />
            <line x1="10" y1="12" x2="22" y2="24" />
            <line x1="10" y1="48" x2="22" y2="36" />
            <line x1="66" y1="30" x2="110" y2="30" />
            <polyline points="78,18 94,18 94,42 78,42" />
          </g>
        );
      default:
        return (
          <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="18" y="14" width="64" height="32" rx="10" />
            <circle cx="38" cy="30" r="6" />
            <circle cx="62" cy="30" r="6" />
            <line x1="10" y1="30" x2="18" y2="30" />
            <line x1="82" y1="30" x2="110" y2="30" />
          </g>
        );
    }
  };

  return (
    <div className={`arena-component-glyph arena-glyph-${glyphKey}`}>
      <svg viewBox="0 0 120 60" role="img" aria-label={ariaLabel} focusable="false">
        {renderShape()}
      </svg>
    </div>
  );
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
  const componentNumber = component.componentNumber ?? null;
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
    componentNumber,
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
      deltaLabel: formatDeltaLabel(metricA.key, metricA.unit ?? metricB.unit ?? null, metricA.numericValue, metricB.numericValue),
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

// ── FUSE™ severity levels ─────────────────────────────────────────────────────

type FuseSeverityLevel = "safe" | "stressed" | "warning" | "critical" | "destroyed";

const FUSE_SEVERITY_LEVELS: { level: FuseSeverityLevel; emoji: string; label: string; color: string; description: string }[] = [
  { level: "safe",      emoji: "🟢", label: "Safe",      color: "#34d399", description: "Operating within all ratings. No risk detected." },
  { level: "stressed",  emoji: "🟡", label: "Stressed",  color: "#fbbf24", description: "Exceeding comfortable operating margins. Consider derating." },
  { level: "warning",   emoji: "🟠", label: "Warning",   color: "#fb923c", description: "Significant overstress. Risk of accelerated degradation." },
  { level: "critical",  emoji: "🔴", label: "Critical",  color: "#f87171", description: "Severe overstress. Failure imminent or in progress." },
  { level: "destroyed", emoji: "💀", label: "Destroyed", color: "#fef2f2", description: "Component has been simulated to failure. Replace it." },
];

function telemetryToFuseSeverity(severity: "normal" | "warning" | "critical", telemetry: ComponentTelemetryEntry[]): FuseSeverityLevel {
  if (severity === "critical") {
    // Check if any value is extremely over threshold → destroyed
    const hasExtreme = telemetry.some((e) => {
      const preset = TELEMETRY_PRESETS.find((p) => p.id === e.id);
      if (!preset || e.metric?.numericValue == null) return false;
      const magnitude = Math.abs(e.metric.numericValue);
      return magnitude >= preset.thresholds.critical * 1.8;
    });
    return hasExtreme ? "destroyed" : "critical";
  }
  if (severity === "warning") {
    const hasStressed = telemetry.some((e) => {
      const preset = TELEMETRY_PRESETS.find((p) => p.id === e.id);
      if (!preset || e.metric?.numericValue == null) return false;
      const magnitude = Math.abs(e.metric.numericValue);
      return magnitude >= preset.thresholds.warning * 0.75 && magnitude < preset.thresholds.warning;
    });
    return hasStressed ? "stressed" : "warning";
  }
  return "safe";
}

function getWorstFuseSeverity(telemetry: ComponentTelemetryEntry[]): FuseSeverityLevel {
  if (telemetry.length === 0) return "safe";
  const severities = telemetry.map((e) => e.severity);
  if (severities.includes("critical")) return telemetryToFuseSeverity("critical", telemetry);
  if (severities.includes("warning")) return telemetryToFuseSeverity("warning", telemetry);
  return "safe";
}

// ── Component Library catalog ─────────────────────────────────────────────────

type CatalogEntry = {
  id: string;
  name: string;
  type: string;
  partNumber?: string;
  vendor?: string;
  properties: Record<string, number | string | boolean>;
};

const MANUFACTURER_CATALOG: CatalogEntry[] = [
  { id: "r-100", name: "Resistor 100 Ω", type: "resistor", properties: { resistance: 100, tempCoeff: 0.0005, tolerance: 0.05, thermalResistance: 70 } },
  { id: "r-330", name: "Resistor 330 Ω", type: "resistor", properties: { resistance: 330, tempCoeff: 0.0005, tolerance: 0.05, thermalResistance: 80 } },
  { id: "r-1k",  name: "Resistor 1 kΩ",  type: "resistor", properties: { resistance: 1000, tempCoeff: 0.0004, tolerance: 0.01, thermalResistance: 90 } },
  { id: "r-10k", name: "Resistor 10 kΩ", type: "resistor", properties: { resistance: 10000, tempCoeff: 0.0003, tolerance: 0.01, thermalResistance: 95 } },
  { id: "c-100n", name: "Capacitor 100 nF", type: "capacitor", properties: { capacitance: 1e-7, esr: 0.5, tempCoeff: 0.0003 } },
  { id: "c-1u",   name: "Capacitor 1 µF",  type: "capacitor", properties: { capacitance: 1e-6, esr: 0.12, tempCoeff: 0.0002, thermalResistance: 45 } },
  { id: "c-100u", name: "Capacitor 100 µF", type: "capacitor", properties: { capacitance: 1e-4, esr: 0.05, tempCoeff: 0.0001, thermalResistance: 35 } },
  { id: "led-red",   name: "LED Red 2 V",    type: "led", properties: { forwardVoltage: 2,   seriesResistance: 120, efficiency: 0.32, thermalResistance: 110 } },
  { id: "led-green", name: "LED Green 2.1 V", type: "led", properties: { forwardVoltage: 2.1, seriesResistance: 100, efficiency: 0.38, thermalResistance: 105 } },
  { id: "led-blue",  name: "LED Blue 3.2 V",  type: "led", properties: { forwardVoltage: 3.2, seriesResistance: 68,  efficiency: 0.44, thermalResistance: 95 } },
  { id: "bat-9v",   name: "Battery 9 V",    type: "battery", properties: { voltage: 9,   internalResistance: 0.18, capacityMah: 1200, thermalResistance: 35 } },
  { id: "bat-3v7",  name: "Li-Ion 3.7 V",   type: "battery", properties: { voltage: 3.7, internalResistance: 0.09, capacityMah: 2000, maxDischargeCurrent: 2, thermalResistance: 28 } },
  { id: "bat-12v",  name: "Lead-Acid 12 V", type: "battery", properties: { voltage: 12,  internalResistance: 0.05, capacityMah: 7000, thermalResistance: 22 } },
  { id: "sw-basic",   name: "Toggle Switch",  type: "switch", properties: { onResistance: 0.05, offResistance: 1000000, transitionTimeMs: 1.5 } },
  { id: "q-irf540",   name: "MOSFET IRF540N", type: "mosfet", partNumber: "IRF540N",   vendor: "Vishay",          properties: { vth: 4, rds_on: 0.044, id_max: 33,  vds_max: 100, powerRating: 130, thermalResistance: 0.92 } },
  { id: "q-2n7000",   name: "MOSFET 2N7000",  type: "mosfet", partNumber: "2N7000",    vendor: "Various",         properties: { vth: 2.1, rds_on: 5,   id_max: 0.2, vds_max: 60,  powerRating: 0.4, thermalResistance: 62.5 } },
  { id: "q-2n2222a",  name: "NPN BJT 2N2222A", type: "bjt",   partNumber: "2N2222A",   vendor: "ON Semiconductor", properties: { vce_max: 40, ic_max: 0.6,  hfe: 100, vbe: 0.7, powerRating: 0.625, thermalResistance: 200 } },
  { id: "q-bc547",    name: "NPN BJT BC547",   type: "bjt",   partNumber: "BC547",     vendor: "Various",          properties: { vce_max: 45, ic_max: 0.1,  hfe: 110, vbe: 0.7, powerRating: 0.5,   thermalResistance: 250 } },
  { id: "q-2n3904",   name: "NPN BJT 2N3904",  type: "bjt",   partNumber: "2N3904",    vendor: "Various",          properties: { vce_max: 40, ic_max: 0.2,  hfe: 100, vbe: 0.65, powerRating: 0.625, thermalResistance: 200 } },
  { id: "d-1n4007",   name: "Rectifier 1N4007", type: "diode", partNumber: "1N4007",   vendor: "Various",          properties: { forwardVoltage: 0.7, maxCurrent: 1,   reverseVoltage: 1000, thermalResistance: 60, powerRating: 3 } },
  { id: "d-1n4148",   name: "Signal Diode 1N4148", type: "diode", partNumber: "1N4148", vendor: "Various",         properties: { forwardVoltage: 0.72, maxCurrent: 0.3, reverseVoltage: 75,   thermalResistance: 150, powerRating: 0.5 } },
  { id: "u-lm741",    name: "Op-Amp LM741",     type: "opamp",  partNumber: "LM741",    vendor: "Texas Instruments", properties: { supplyVoltage: 15, slewRate: 0.5, gainBandwidth: 1e6, powerRating: 0.5, thermalResistance: 100 } },
  { id: "u-lm7805",   name: "5 V Reg LM7805",   type: "voltage_regulator", partNumber: "LM7805", vendor: "Texas Instruments", properties: { outputVoltage: 5, dropoutVoltage: 2, maxCurrent: 1.5, powerRating: 15, thermalResistance: 5 } },
  { id: "u-ne555",    name: "Timer NE555",       type: "ic",     partNumber: "NE555",    vendor: "Various",           properties: { supplyVoltage: 5, maxCurrent: 0.2, powerRating: 0.6, thermalResistance: 70 } },
  { id: "f-1a",       name: "Fuse 1 A",          type: "fuse",   properties: { ratedCurrentA: 1,   meltingI2t: 1, resistance: 0.02, thermalResistance: 40 } },
  { id: "f-5a",       name: "Fuse 5 A",          type: "fuse",   properties: { ratedCurrentA: 5,   meltingI2t: 25, resistance: 0.01, thermalResistance: 35 } },
  { id: "f-10a",      name: "Fuse 10 A",         type: "fuse",   properties: { ratedCurrentA: 10,  meltingI2t: 100, resistance: 0.008, thermalResistance: 30 } },
  { id: "ind-10u",    name: "Inductor 10 µH",    type: "inductor", properties: { inductance: 1e-5, resistance: 0.08, currentRating: 1.2, thermalResistance: 55 } },
  { id: "ind-100u",   name: "Inductor 100 µH",   type: "inductor", properties: { inductance: 1e-4, resistance: 0.25, currentRating: 0.6, thermalResistance: 65 } },
  { id: "rly-5v",     name: "Relay 5 V",         type: "relay",  properties: { coilVoltage: 5, coilResistance: 72, maxSwitchCurrent: 5, maxSwitchVoltage: 250, thermalResistance: 80 } },
  { id: "pot-10k",    name: "Potentiometer 10 kΩ", type: "potentiometer", properties: { resistance: 10000, tolerance: 0.1, thermalResistance: 90 } },
  { id: "lamp-12v",   name: "Lamp 12 V / 5 W",   type: "lamp",   properties: { voltage: 12, power: 5, thermalResistance: 20 } },
];

const CATALOG_TYPES = [...new Set(MANUFACTURER_CATALOG.map((e) => e.type))].sort();



export default function ArenaView({ variant = "page", onNavigateBack, onOpenBuilder }: ArenaViewProps) {
  const isEmbedded = variant === "embedded";
  const isWorkspace = variant === "workspace";
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
  const showOpenBuilderButton =
    typeof onOpenBuilder === "function" && !isWorkspace;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sampleFallbackAppliedRef = useRef(false);

  const [importPayload, setImportPayload] = useState<ArenaPayload | null>(null);
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
  const [battleState, setBattleState] = useState<"idle" | "battling" | "complete">("idle");
  const [battleWinner, setBattleWinner] = useState<"left" | "right" | "tie" | null>(null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [beforeMetrics, setBeforeMetrics] = useState<{ left: ComponentTelemetryEntry[] | null; right: ComponentTelemetryEntry[] | null }>({
    left: null,
    right: null
  });
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [varianceEnabled, setVarianceEnabled] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(["all"]));
  const [afterMetrics, setAfterMetrics] = useState<{ left: ComponentTelemetryEntry[] | null; right: ComponentTelemetryEntry[] | null }>({
    left: null,
    right: null
  });
  const [selectedScenario, setSelectedScenario] = useState<string>("standard");
  const [battleScore, setBattleScore] = useState<{ leftWins: number; rightWins: number; ties: number; totalRounds: number } | null>(null);
  const [nameplateTick, setNameplateTick] = useState(0);
  const battleSeedRef = useRef<number>(0);

  // FUSE™ Sizing Calculator state
  const [fuseSizingLoad, setFuseSizingLoad] = useState<string>("1");
  const [fuseSizingInrush, setFuseSizingInrush] = useState<string>("3");
  const [fuseSizingResult, setFuseSizingResult] = useState<string | null>(null);

  // Component Library catalog state
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNameplateTick((previous) => (previous + 1) % 1000000);
    }, 900);
    return () => {
      window.clearInterval(intervalId);
    };
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
    },
    []
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

  const handleClipboardImport = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
      setImportError("Clipboard import is not supported in this browser. Paste JSON instead.");
      setBridgeStatus("Clipboard import unavailable on this device.");
      return;
    }

    setImportPending(true);
    setImportError(null);
    setBridgeStatus("Reading clipboard...");

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setImportError("Clipboard was empty. Copy JSON from the builder first.");
        setBridgeStatus("Clipboard empty.");
        return;
      }

      const parsed = JSON.parse(clipboardText);
      const success = handleExternalImport(parsed, {
        source: "clipboard",
        label: "Clipboard Import",
        statusMessage: "Imported components from clipboard snapshot.",
        persist: true
      });

      if (!success) {
        setImportError("Clipboard data did not contain any components.");
      }
    } catch (error) {
      console.warn("Arena: clipboard import failed", error);
      setImportError("Clipboard contents were not valid JSON. Try copying again from the builder.");
      setBridgeStatus("Import failed. Invalid clipboard dataset.");
    } finally {
      setImportPending(false);
    }
  }, [handleExternalImport]);

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

  const sampleImports = useMemo(() => SAMPLE_IMPORTS, []);

  useEffect(() => {
    if (sampleFallbackAppliedRef.current) {
      return;
    }

    const componentCount = importPayload?.state?.components?.length ?? 0;
    if (importPayload && componentCount > 0) {
      sampleFallbackAppliedRef.current = true;
      return;
    }

    if (!importPayload && sampleImports.length > 0) {
      sampleFallbackAppliedRef.current = true;
      const fallbackPayload = {
        ...sampleImports[0].payload,
        generatedAt: Date.now()
      };
      applyResolvedPayload(fallbackPayload, {
        sourceOverride: fallbackPayload.source ?? "sample",
        statusMessage: `Loaded ${fallbackPayload.label ?? "sample"}.`,
        persist: false
      });
    }
  }, [importPayload, sampleImports, applyResolvedPayload]);

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

  const componentATelemetry = useMemo(() => buildComponentTelemetry(componentAProfile), [componentAProfile]);
  const componentBTelemetry = useMemo(() => buildComponentTelemetry(componentBProfile), [componentBProfile]);

  const componentAWarnings = useMemo(
    () => componentATelemetry.filter((entry) => entry.severity !== "normal" && entry.metric !== null),
    [componentATelemetry]
  );

  const componentBWarnings = useMemo(
    () => componentBTelemetry.filter((entry) => entry.severity !== "normal" && entry.metric !== null),
    [componentBTelemetry]
  );

  const battleFlow = useMemo(() => {
    const currentA = componentATelemetry.find((entry) => entry.id === "current")?.metric?.numericValue ?? null;
    const currentB = componentBTelemetry.find((entry) => entry.id === "current")?.metric?.numericValue ?? null;

    if ((currentA === null || !Number.isFinite(currentA)) && (currentB === null || !Number.isFinite(currentB))) {
      return { direction: "none" as const, strength: 0, label: "Flow idle" };
    }

    const safeA = Number.isFinite(currentA as number) ? (currentA as number) : 0;
    const safeB = Number.isFinite(currentB as number) ? (currentB as number) : 0;
    const base = Math.max(Math.abs(safeA), Math.abs(safeB), 1e-6);
    const diff = safeA - safeB;

    if (Math.abs(diff) < 1e-6) {
      return { direction: "none" as const, strength: Math.min(base / 10, 0.35), label: "Flow balanced" };
    }

    const direction = diff > 0 ? ("right" as const) : ("left" as const);
    const strength = Math.min(Math.abs(diff) / base, 1);
    const label = direction === "right" ? "Flow favoring Component A" : "Flow favoring Component B";

    return { direction, strength, label };
  }, [componentATelemetry, componentBTelemetry]);

  const flowStyles = useMemo(() => ({ "--flow-strength": battleFlow.strength } as CSSProperties), [battleFlow.strength]);

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
        const deltaLabel = metricA && metricB ? formatDeltaLabel(key, metricA.unit ?? metricB.unit ?? null, metricA.numericValue, metricB.numericValue) : null;

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
    const spotlightRounds = useMemo(() => showdownScore.rounds.slice(0, 4), [showdownScore.rounds]);
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

  // Fuse Sizing Calculator handler
  const handleFuseSizingCalculate = useCallback(() => {
    const loadA = parseFloat(fuseSizingLoad);
    const inrush = parseFloat(fuseSizingInrush);
    if (!Number.isFinite(loadA) || loadA <= 0) {
      setFuseSizingResult("⚠ Enter a valid load current > 0 A.");
      return;
    }
    if (!Number.isFinite(inrush) || inrush < 1) {
      setFuseSizingResult("⚠ Inrush factor must be ≥ 1.");
      return;
    }
    const peakCurrent = loadA * inrush;
    // Standard fuse ratings (A): 0.5, 1, 1.5, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30
    const STANDARD_RATINGS = [0.5, 1, 1.5, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30];
    // Fuse should be rated at ≥125% of load but handle inrush without opening
    const minRating = loadA * 1.25;
    const recommended = STANDARD_RATINGS.find((r) => r >= minRating && r >= peakCurrent * 0.85) ?? STANDARD_RATINGS[STANDARD_RATINGS.length - 1];
    const wireNote = recommended <= 1 ? "28 AWG or heavier" : recommended <= 5 ? "24 AWG or heavier" : recommended <= 15 ? "18 AWG or heavier" : "14 AWG or heavier";
    setFuseSizingResult(`Recommended: ${recommended} A fuse · Min wire: ${wireNote}`);
  }, [fuseSizingLoad, fuseSizingInrush]);

  // Load a catalog entry as component A or B
  const handleCatalogLoad = useCallback((entry: CatalogEntry, slot: "left" | "right") => {
    const component: ArenaComponent = {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      componentNumber: entry.partNumber,
      properties: entry.properties as Record<string, unknown>
    };
    const payload: ArenaPayload = {
      source: entry.vendor ?? "Catalog",
      label: entry.name,
      generatedAt: Date.now(),
      state: { components: [component] }
    };
    // Merge with existing import payload instead of replacing all components
    setImportPayload((prev) => {
      const existingComponents = prev?.state?.components ?? [];
      // Replace/add the catalog entry at the appropriate slot index
      const slotIndex = slot === "left" ? 0 : 1;
      const components = [...existingComponents];
      components[slotIndex] = component;
      const merged: ArenaPayload = {
        ...(prev ?? payload),
        source: "Catalog",
        label: prev?.label ?? entry.name,
        generatedAt: Date.now(),
        state: { ...prev?.state, components }
      };
      // Persist
      try { window.localStorage?.setItem(ARENA_STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    });
    setShowdownSelection((prev) => ({
      left: slot === "left" ? entry.id : prev.left,
      right: slot === "right" ? entry.id : prev.right
    }));
    setBridgeStatus(`Loaded ${entry.name} into slot ${slot === "left" ? "A" : "B"}.`);
    setImportError(null);
    setRecentImportSource(`Catalog · ${entry.name}`);
  }, []);

  const applyScenarioModifiers = useCallback((telemetry: ComponentTelemetryEntry[], scenarioId: string): ComponentTelemetryEntry[] => {
    const scenario = ENVIRONMENTAL_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario || scenarioId === "standard") {
      return telemetry;
    }

    return telemetry.map(entry => {
      const baseValue = entry.metric?.numericValue ?? null;
      if (baseValue === null || !Number.isFinite(baseValue)) {
        return entry;
      }

      const modifierKey = entry.id as keyof typeof scenario.modifiers;
      const modifier = scenario.modifiers[modifierKey] ?? 1.0;
      const modifiedValue = baseValue * modifier;
      const formattedValue = formatNumericForProperty(entry.id, modifiedValue);

      return {
        ...entry,
        displayValue: formattedValue.display,
        metric: entry.metric ? {
          ...entry.metric,
          numericValue: modifiedValue,
          displayValue: formattedValue.display
        } : null
      };
    });
  }, []);

  const getBattlePreference = useCallback((metricId: string): "higher" | "lower" => {
    switch (metricId) {
      case "temperature":
        return "lower";
      case "current":
        // "Current draw" is typically better when lower (less waste / stress).
        return "lower";
      case "efficiency":
        return "higher";
      case "power":
        return "higher";
      case "voltage":
        return "higher";
      default:
        return "higher";
    }
  }, []);

  const mulberry32 = useCallback((seed: number) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  const applyVariance = useCallback((telemetry: ComponentTelemetryEntry[], seed: number, varianceFraction: number): ComponentTelemetryEntry[] => {
    if (!varianceEnabled || varianceFraction <= 0) {
      return telemetry;
    }

    const rng = mulberry32(seed);
    return telemetry.map((entry) => {
      const numeric = entry.metric?.numericValue ?? null;
      if (numeric === null || !Number.isFinite(numeric)) {
        return entry;
      }

      const jitter = (rng() * 2 - 1) * varianceFraction;
      const nextValue = numeric * (1 + jitter);
      const formatted = formatNumericForProperty(entry.id, nextValue);

      return {
        ...entry,
        displayValue: formatted.display,
        metric: entry.metric
          ? {
              ...entry.metric,
              numericValue: nextValue,
              displayValue: formatted.display
            }
          : null
      };
    });
  }, [mulberry32, varianceEnabled]);

  const computeBattleScore = useCallback(
    (left: ComponentTelemetryEntry[], right: ComponentTelemetryEntry[]) => {
      const rightById = new Map(right.map((entry) => [entry.id, entry]));
      const isAll = selectedMetrics.has("all");
      const ids = isAll ? TELEMETRY_PRESETS.map((preset) => preset.id) : Array.from(selectedMetrics);

      let leftWins = 0;
      let rightWins = 0;
      let ties = 0;
      let totalRounds = 0;

      ids.forEach((id) => {
        if (id === "all") {
          return;
        }

        const entryL = left.find((entry) => entry.id === id) ?? null;
        const entryR = rightById.get(id) ?? null;

        const a = entryL?.metric?.numericValue ?? null;
        const b = entryR?.metric?.numericValue ?? null;
        if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) {
          return;
        }

        const preference = getBattlePreference(id);
        const diff = a - b;
        const base = Math.max(Math.abs(a), Math.abs(b), 1e-9);
        const relative = Math.abs(diff) / base;
        const tieThreshold = 0.015;

        totalRounds += 1;

        if (relative < tieThreshold) {
          ties += 1;
          return;
        }

        const advantage = preference === "higher" ? diff : -diff;
        if (advantage > 0) {
          leftWins += 1;
        } else {
          rightWins += 1;
        }
      });

      return { leftWins, rightWins, ties, totalRounds };
    },
    [getBattlePreference, selectedMetrics]
  );

  const handleBattle = useCallback(() => {
    if (battleState === "battling") {
      return;
    }

    setBeforeMetrics({
      left: componentATelemetry,
      right: componentBTelemetry
    });
    setBattleState("battling");
    setBattleWinner(null);
    setBattleScore(null);
    setAfterMetrics({ left: null, right: null });

    setTimeout(() => {
      // Use a stable per-battle seed so the "after" results and winner match what the user sees.
      const seed = Date.now();
      battleSeedRef.current = seed;

      const modifiedLeftTelemetry = applyScenarioModifiers(componentATelemetry, selectedScenario);
      const modifiedRightTelemetry = applyScenarioModifiers(componentBTelemetry, selectedScenario);

      const varianceFraction = 0.05;
      const variedLeft = applyVariance(modifiedLeftTelemetry, seed ^ 0xA5A5A5A5, varianceFraction);
      const variedRight = applyVariance(modifiedRightTelemetry, seed ^ 0x5A5A5A5A, varianceFraction);

      setAfterMetrics({ left: variedLeft, right: variedRight });

      const score = computeBattleScore(variedLeft, variedRight);
      setBattleScore(score);

      if (score.totalRounds === 0) {
        setBattleWinner(null);
      } else if (score.leftWins > score.rightWins) {
        setBattleWinner("left");
      } else if (score.rightWins > score.leftWins) {
        setBattleWinner("right");
      } else {
        setBattleWinner("tie");
      }
      setBattleState("complete");
    }, 3000);
  }, [battleState, componentATelemetry, componentBTelemetry, applyScenarioModifiers, selectedScenario, applyVariance, computeBattleScore]);

  const handleResetBattle = useCallback(() => {
    setBattleState("idle");
    setBattleWinner(null);
    setBattleScore(null);
    setBeforeMetrics({ left: null, right: null });
    setAfterMetrics({ left: null, right: null });
    setWinnerDismissed(false);
  }, []);

  // Auto-dismiss the winner banner after 4 seconds
  useEffect(() => {
    if (battleState !== "complete") return;
    // Reset dismissed flag then schedule auto-dismiss
    setWinnerDismissed(false);
    const timer = window.setTimeout(() => setWinnerDismissed(true), 4000);
    return () => window.clearTimeout(timer);
  }, [battleState]);

  const handleMetricToggle = useCallback((metricId: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (metricId === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      if (next.size === 0) {
        return new Set(["all"]);
      }
      return next;
    });
  }, []);

  const getFilteredTelemetry = useCallback((telemetry: ComponentTelemetryEntry[]) => {
    if (selectedMetrics.has("all")) {
      return telemetry;
    }
    return telemetry.filter(entry => selectedMetrics.has(entry.id));
  }, [selectedMetrics]);

  const currentScenario = useMemo(() => {
    return ENVIRONMENTAL_SCENARIOS.find(s => s.id === selectedScenario) ?? ENVIRONMENTAL_SCENARIOS[0];
  }, [selectedScenario]);

  // ── FUSE™ Analysis derived state ────────────────────────────────────────────

  const fuseAnalysisA = useMemo(() => {
    if (!componentAProfile || componentATelemetry.length === 0) return null;
    const worst = getWorstFuseSeverity(componentATelemetry);
    const level = FUSE_SEVERITY_LEVELS.find((l) => l.level === worst) ?? FUSE_SEVERITY_LEVELS[0];
    const hotEntries = componentATelemetry.filter((e) => e.severity !== "normal");
    return { level, hotEntries, profile: componentAProfile };
  }, [componentAProfile, componentATelemetry]);

  const fuseAnalysisB = useMemo(() => {
    if (!componentBProfile || componentBTelemetry.length === 0) return null;
    const worst = getWorstFuseSeverity(componentBTelemetry);
    const level = FUSE_SEVERITY_LEVELS.find((l) => l.level === worst) ?? FUSE_SEVERITY_LEVELS[0];
    const hotEntries = componentBTelemetry.filter((e) => e.severity !== "normal");
    return { level, hotEntries, profile: componentBProfile };
  }, [componentBProfile, componentBTelemetry]);

  const handleFuseReportExport = useCallback(() => {
    const report = {
      version: "2.0",
      generatedAt: new Date().toISOString(),
      scenario: selectedScenario,
      components: [fuseAnalysisA, fuseAnalysisB].filter(Boolean).map((a) => ({
        name: a!.profile.name,
        type: a!.profile.type,
        severity: a!.level.level,
        hotMetrics: a!.hotEntries.map((e) => ({ id: e.id, label: e.label, value: e.displayValue, severity: e.severity }))
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuse-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fuseAnalysisA, fuseAnalysisB, selectedScenario]);

  // ── Component Library filtered catalog ──────────────────────────────────────

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return MANUFACTURER_CATALOG.filter((entry) => {
      if (catalogTypeFilter && entry.type !== catalogTypeFilter) return false;
      if (!query) return true;
      return (
        entry.name.toLowerCase().includes(query) ||
        entry.type.toLowerCase().includes(query) ||
        (entry.partNumber?.toLowerCase().includes(query) ?? false) ||
        (entry.vendor?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [catalogSearch, catalogTypeFilter]);

  const renderBattlePanel = (
    side: "left" | "right",
    {
      profile,
      telemetry,
      warnings,
      highlightMetrics,
      opponentMetricMap,
      record,
      isChampion,
      isTie,
      tag
    }: {
      profile: ComponentShowdownProfile | null;
      telemetry: ComponentTelemetryEntry[];
      warnings: ComponentTelemetryEntry[];
      highlightMetrics: ComponentMetricEntry[];
      opponentMetricMap: Map<string, ComponentMetricEntry>;
      record: string | null;
      isChampion: boolean;
      isTie: boolean;
      tag: string;
    }
  ) => {
    const beforeData = side === "left" ? beforeMetrics.left : beforeMetrics.right;
    const afterData = side === "left" ? afterMetrics.left : afterMetrics.right;
    const opponentAfterData = side === "left" ? afterMetrics.right : afterMetrics.left;
    const showBefore = battleState !== "idle" && beforeData;
    const showAfter = battleState === "complete" && afterData;
    const panelTelemetry = (showAfter ? afterData : null) ?? (battleState === "battling" ? beforeData : null) ?? telemetry;
    const filteredTelemetry = getFilteredTelemetry(panelTelemetry);

    // Determine actual battle result for this panel
    const battleIsWinner = battleState === "complete" && battleWinner !== null && battleWinner !== "tie" &&
      ((side === "left" && battleWinner === "left") || (side === "right" && battleWinner === "right"));
    const battleIsLoser = battleState === "complete" && battleWinner !== null && battleWinner !== "tie" && !battleIsWinner;
    const battleIsTied = battleState === "complete" && battleWinner === "tie";

    // Per-metric result indicator for AFTER section
    const FALLBACK_METRIC_ICON = "📊";
    const getMetricResult = (entryId: string, myValue: number | null): "win" | "loss" | "tie" | null => {
      if (battleState !== "complete" || !opponentAfterData) return null;
      const opponentEntry = opponentAfterData.find((e) => e.id === entryId);
      const opponentValue = opponentEntry?.metric?.numericValue ?? null;
      if (!Number.isFinite(myValue) || !Number.isFinite(opponentValue)) return null;
      const preference = getBattlePreference(entryId);
      const diff = (myValue as number) - (opponentValue as number);
      const base = Math.max(Math.abs(myValue as number), Math.abs(opponentValue as number), 1e-9);
      const relative = Math.abs(diff) / base;
      if (relative < 0.015) return "tie";
      const advantage = preference === "higher" ? diff : -diff;
      return advantage > 0 ? "win" : "loss";
    };

    const nameplateMetrics = buildNameplateMetrics(filteredTelemetry, {
      componentSeed: `${profile?.uid ?? side}:${profile?.componentNumber ?? "na"}`,
      tick: nameplateTick,
      isLive: battleState !== "complete"
    });

    // Fallback: show profile.metrics when telemetry presets don't match this component type
    const hasRealTelemetry = nameplateMetrics.some((m) => m.displayValue !== "—");
    const displayMetrics: NameplateMetric[] = hasRealTelemetry ? nameplateMetrics : (
      profile ? profile.metrics.slice(0, 3).map((m) => ({
        id: m.key,
        label: m.label,
        icon: FALLBACK_METRIC_ICON,
        displayValue: m.displayValue,
        severity: "normal" as const,
        trend: "steady" as const
      })) : []
    );

    const showNameplateLiveIndicator = battleState !== "complete" && displayMetrics.length > 0;
    const panelResultClass = battleIsWinner ? " battle-winner" : battleIsLoser ? " battle-loser" : "";
    const afterResultLabel = battleIsWinner ? "🏆 WON" : battleIsLoser ? "📉 RESULT" : battleIsTied ? "🤝 TIED" : "📈 AFTER";

    return (
      <div className={`arena-battle-panel arena-battle-panel-${side}${panelResultClass}`}>
        <div className="arena-component-info">
          {/* Before Metrics - Above Component */}
          {showBefore && (
            <div className="arena-metrics-section arena-metrics-before">
              <div className="arena-metrics-label">📊 BEFORE</div>
              <div className="arena-metrics-compact">
                {getFilteredTelemetry(beforeData).map((entry) => (
                  <div key={`before-${side}-${entry.id}`} className="arena-metric-compact">
                    <span className="metric-compact-icon">{entry.icon}</span>
                    <span className="metric-compact-label">{entry.label}</span>
                    <span className="metric-compact-value">{entry.displayValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3D Component on Rotating Platform */}
          <div className={`arena-component-stage${rotationEnabled ? " rotating" : ""}${battleState === "battling" ? " battling" : ""}`}>
            <div className="arena-component-dais">
              <div className="arena-dais-platform arena-3d-platform">
                <Component3DViewer
                  componentType={profile?.type || 'generic'}
                  isRotating={rotationEnabled}
                />
              </div>
              <div className="arena-dais-base" />
            </div>
          </div>

          {/* Component Nameplate + Live Metrics */}
          <div className={`arena-component-nameplate${isChampion ? " is-champion" : ""}${isTie ? " is-tie" : ""}${battleIsWinner ? " battle-winner" : ""}${battleIsLoser ? " battle-loser" : ""}`}>
            <div className="arena-nameplate-header">
              <span className="arena-nameplate-tag">{tag}</span>
              {showNameplateLiveIndicator && (
                <span className="arena-nameplate-live" aria-label="Real-time metrics active">
                  <span className="arena-nameplate-live-dot" aria-hidden="true" />
                  LIVE
                </span>
              )}
            </div>
            <h3 className="arena-nameplate-name">{profile?.name ?? "No component"}</h3>
            <div className="arena-nameplate-subtitle">
              <span className="arena-nameplate-type">{profile?.type ?? "—"}</span>
              {profile?.componentNumber ? (
                <span className="arena-nameplate-component-number">{profile.componentNumber}</span>
              ) : null}
            </div>
            {displayMetrics.length > 0 ? (
              <div className="arena-nameplate-metrics" role="list" aria-label={`${profile?.name ?? "Component"} real-time metrics`}>
                {displayMetrics.map((metric) => (
                  <div
                    key={`${side}-nameplate-${metric.id}`}
                    className={`arena-nameplate-metric ${metric.severity}`}
                    role="listitem"
                  >
                    <span className="nameplate-metric-icon" aria-hidden="true">{metric.icon}</span>
                    <span className="nameplate-metric-label">{metric.label}</span>
                    <span className="nameplate-metric-value">{metric.displayValue}</span>
                    <span
                      className={`nameplate-metric-trend nameplate-metric-trend-${metric.trend}`}
                      aria-hidden="true"
                    >
                      {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="arena-nameplate-empty">No telemetry available yet.</p>
            )}
            {battleState === "complete" ? (
              battleIsTied ? <div className="arena-nameplate-badge neutral">🤝 Tied</div>
              : battleIsWinner ? <div className="arena-nameplate-badge battle-winner">🏆 Winner</div>
              : <div className="arena-nameplate-badge runner-up">Runner-Up</div>
            ) : isChampion ? <div className="arena-nameplate-badge">🏆 Champion</div>
              : isTie ? <div className="arena-nameplate-badge neutral">Even Match</div>
              : null}
          </div>

          {/* After Metrics - Below Component */}
          {showAfter && afterData && (
            <div className="arena-metrics-section arena-metrics-after">
              <div className="arena-metrics-label">{afterResultLabel}</div>
              <div className="arena-metrics-compact">
                {(() => {
                  const entries = getFilteredTelemetry(afterData).filter((e) => e.displayValue !== "—");
                  if (entries.length > 0) {
                    return entries.map((entry) => {
                      const result = getMetricResult(entry.id, entry.metric?.numericValue ?? null);
                      return (
                        <div key={`after-${side}-${entry.id}`} className={`arena-metric-compact${result ? ` result-${result}` : ""}`}>
                          <span className="metric-compact-icon">{entry.icon}</span>
                          <span className="metric-compact-label">{entry.label}</span>
                          <span className="metric-compact-value">{entry.displayValue}</span>
                          {result && <span className="metric-compact-result">{result === "win" ? "✅" : result === "loss" ? "❌" : "→"}</span>}
                        </div>
                      );
                    });
                  }
                  // Fallback: show component's actual spec metrics when presets don't match
                  return profile ? profile.metrics.slice(0, 4).map((m) => (
                    <div key={`after-spec-${side}-${m.key}`} className="arena-metric-compact">
                      <span className="metric-compact-icon">{FALLBACK_METRIC_ICON}</span>
                      <span className="metric-compact-label">{m.label}</span>
                      <span className="metric-compact-value">{m.displayValue}</span>
                    </div>
                  )) : null;
                })()}
              </div>
            </div>
          )}

          {/* Current Telemetry (when not in battle) */}
          {battleState === "idle" && filteredTelemetry.length > 0 && (
            <div className="arena-telemetry-grid" style={{width: '100%', marginTop: '16px'}}>
              {filteredTelemetry.map((entry) => (
                <div
                  key={`${side}-telemetry-${entry.id}`}
                  className={`arena-telemetry-card${entry.severity !== "normal" ? ` ${entry.severity}` : ""}`}
                >
                  <span className="telemetry-icon">{entry.icon}</span>
                  <span className="telemetry-label">{entry.label}</span>
                  <span className="telemetry-value">{entry.displayValue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`arena-page${isEmbedded ? " arena-page--embedded" : ""}${isWorkspace ? " arena-page--workspace" : ""}`}
    >
      {!isEmbedded && (
        <header className="arena-header">
          <div className="arena-header-left">
            {!isWorkspace && (
              <button className="arena-btn ghost" type="button" onClick={handleBackClick}>
                ← Back
              </button>
            )}
            <WordMark size="md" decorative />
            <div className="arena-title-group">
              <h1>Component Arena</h1>
            </div>
          </div>
          <div className="arena-header-right">
            {showOpenBuilderButton ? (
              <button className="arena-btn outline" type="button" onClick={handleOpenBuilderClick}>
                Open Builder
              </button>
            ) : null}
          </div>
        </header>
      )}
      <div className={`arena-body${isWorkspace ? " arena-body--workspace-split" : ""}`}>

        <section className="arena-import-section">
          <div className={`arena-card arena-import-card${isDragActive ? " drag-active" : ""}`}>
            <div className="arena-card-header">
              <h2>Import Components</h2>
              {recentImportSource && (
                <span className="arena-sync-source">{recentImportSource}</span>
              )}
            </div>
            {importPayload?.generatedAt ? (
              <p className="arena-import-intro">Last sync: {formatTimestamp(importPayload.generatedAt)}</p>
            ) : null}
            <div className="arena-import-grid">
              <div className="arena-import-column">
                <div className="arena-import-actions">
                  <button className="arena-btn solid" type="button" onClick={handleSyncFromStorage} disabled={importPending}>
                    <span aria-hidden="true">⬇</span> Pull from Builder
                  </button>
                  <button className="arena-btn outline" type="button" onClick={handleClipboardImport} disabled={importPending}>
                    <span aria-hidden="true">📋</span> Paste from Clipboard
                  </button>
                </div>
                <div
                  className={`arena-import-dropzone${isDragActive ? " is-active" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="arena-import-dropcopy">
                    <strong>{isDragActive ? "Drop to import" : "Drag & drop JSON"}</strong>
                    <span className="arena-import-hint">
                      or{" "}
                      <button
                        type="button"
                        className="arena-import-browse"
                        aria-label="Browse and upload a JSON file"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importPending}
                      >
                        Browse file
                      </button>
                    </span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{ display: "none" }}
                  onChange={handleFileInputChange}
                />
              </div>
              <div className="arena-import-column">
                <div className="arena-import-samples">
                  <span className="arena-import-subheading">Sample Datasets</span>
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
              </div>
            </div>
            <div className="arena-import-textlabel" style={{ marginTop: "16px" }}>
              <label className="arena-import-textlabel-heading" htmlFor="arena-json-paste">
                Or paste JSON directly:
              </label>
              <textarea
                  id="arena-json-paste"
                  placeholder='{ "components": [...] }'
                  value={manualImportText}
                  onChange={(e) => setManualImportText(e.target.value)}
                  rows={4}
                />
              <div className="arena-import-submit">
                <button
                  className="arena-btn outline"
                  type="button"
                  onClick={handleManualImportSubmit}
                  disabled={importPending || !manualImportText.trim()}
                >
                  Import JSON
                </button>
              </div>
            </div>
            {importError && (
              <p className="arena-status-text arena-status-error" style={{ marginTop: "12px" }}>{importError}</p>
            )}
            {!importError && bridgeStatus !== DEFAULT_STATUS && (
              <p className="arena-status-text" style={{ marginTop: "12px", fontSize: "0.8rem" }}>{bridgeStatus}</p>
            )}
          </div>
        </section>

        {importPayload && (componentProfiles.length > 0 || circuitTotals.length > 0) && (
          <section className="arena-summary-section">
            <div className="arena-card">
              <div className="arena-card-header">
                <h2>Circuit Snapshot</h2>
              </div>
              {circuitTotals.length > 0 && (
                <div className="arena-total-grid" style={{ marginBottom: "18px" }}>
                  {circuitTotals.map((total) => (
                    <div key={total.label} className="arena-total">
                      <span className="arena-total-label">{total.label}</span>
                      <span className="arena-total-value">{total.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {roster.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(148, 163, 184, 0.85)", margin: "0 0 10px" }}>
                      Component Roster
                    </h3>
                    <ul className="arena-roster">
                      {roster.map((item) => (
                        <li key={item.id}>
                          <span className="roster-name">{item.name}</span>
                          <span className="roster-type">{item.type}</span>
                          {item.details ? (
                            <span className="roster-detail">{item.details}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {typeBreakdown.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(148, 163, 184, 0.85)", margin: "0 0 10px" }}>
                      By Type
                    </h3>
                    <ul className="arena-breakdown">
                      {typeBreakdown.map(([type, count]) => (
                        <li key={type}>
                          <span className="breakdown-type">{type}</span>
                          <span className="breakdown-count">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="arena-library-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>⚡ Component Library</h2>
              <span style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.7)" }}>Real-world specs</span>
            </div>
            <div className="arena-library-search-row">
              <input
                type="search"
                className="arena-library-search"
                placeholder="Search parts, type, or manufacturer…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                aria-label="Search component library"
              />
            </div>
            <div className="arena-library-type-filters" role="group" aria-label="Filter by type">
              <button
                className={`arena-type-pill${catalogTypeFilter === null ? " active" : ""}`}
                type="button"
                onClick={() => setCatalogTypeFilter(null)}
              >All</button>
              {CATALOG_TYPES.map((type) => (
                <button
                  key={type}
                  className={`arena-type-pill${catalogTypeFilter === type ? " active" : ""}`}
                  type="button"
                  onClick={() => setCatalogTypeFilter(type === catalogTypeFilter ? null : type)}
                >{type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}</button>
              ))}
            </div>
            <div className="arena-library-list" role="list">
              {filteredCatalog.length === 0 ? (
                <p className="arena-empty">No parts match your search.</p>
              ) : filteredCatalog.map((entry) => (
                <div key={entry.id} className="arena-library-item" role="listitem">
                  <div className="arena-library-item-info">
                    <span className="arena-library-item-name">{entry.name}</span>
                    {entry.partNumber && <span className="arena-library-item-part">{entry.partNumber}</span>}
                    {entry.vendor && <span className="arena-library-item-vendor">{entry.vendor}</span>}
                  </div>
                  <div className="arena-library-item-actions">
                    <button
                      className="arena-library-slot-btn slot-a"
                      type="button"
                      title={`Load as Component A`}
                      onClick={() => handleCatalogLoad(entry, "left")}
                    >A</button>
                    <button
                      className="arena-library-slot-btn slot-b"
                      type="button"
                      title={`Load as Component B`}
                      onClick={() => handleCatalogLoad(entry, "right")}
                    >B</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="arena-selectors-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>Select Components for Testing</h2>
            </div>
            {componentProfiles.length > 0 ? (
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
            ) : (
              <p className="arena-empty">No components loaded. Use the import section above to load components.</p>
            )}
          </div>
        </section>

        <section className="arena-metrics-selector-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>⚔️ Battle Metrics Selection</h2>
              <p style={{fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.85)', margin: '8px 0 0 0'}}>
                Choose which metrics to test in battle
              </p>
            </div>
            <div className="arena-metric-toggles">
              <button
                className={`arena-metric-toggle${selectedMetrics.has("all") ? " active" : ""}`}
                onClick={() => handleMetricToggle("all")}
                type="button"
              >
                <span className="toggle-icon">✨</span>
                <span className="toggle-label">ALL METRICS</span>
              </button>
              {TELEMETRY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`arena-metric-toggle${selectedMetrics.has(preset.id) ? " active" : ""}`}
                  onClick={() => handleMetricToggle(preset.id)}
                  type="button"
                >
                  <span className="toggle-icon">{preset.icon}</span>
                  <span className="toggle-label">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="arena-scenario-selector-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>🌍 Environmental Test Scenario</h2>
              <p style={{fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.85)', margin: '8px 0 0 0'}}>
                Select environmental conditions to test components under different operating scenarios
              </p>
            </div>
            <div className="arena-scenario-grid">
              {ENVIRONMENTAL_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  className={`arena-scenario-card${selectedScenario === scenario.id ? " active" : ""}`}
                  onClick={() => setSelectedScenario(scenario.id)}
                  type="button"
                >
                  <div className="scenario-icon">{scenario.icon}</div>
                  <div className="scenario-name">{scenario.name}</div>
                  <div className="scenario-description">{scenario.description}</div>
                  <div className="scenario-conditions">
                    {scenario.conditions.temperature !== undefined && (
                      <span className="condition-badge">🌡️ {scenario.conditions.temperature}°C</span>
                    )}
                    {scenario.conditions.voltage !== undefined && (
                      <span className="condition-badge">⚡ {scenario.conditions.voltage}%</span>
                    )}
                    {scenario.conditions.load !== undefined && (
                      <span className="condition-badge">💪 {scenario.conditions.load}%</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {selectedScenario !== "standard" && (
              <div className="arena-scenario-active-notice">
                <div className="notice-icon">{currentScenario.icon}</div>
                <div className="notice-content">
                  <div className="notice-title">Active Scenario: {currentScenario.name}</div>
                  <div className="notice-description">{currentScenario.description}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="arena-battle-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>Battle Stats</h2>
            </div>
            {(battleState === "complete" && battleScore && battleScore.totalRounds > 0) ? (
              <div className="arena-showdown-scoreboard" style={{ marginBottom: 0 }}>
                <div className="arena-scoreboard-totals">
                  <div className={`score-chip team-a${battleScore.leftWins > battleScore.rightWins ? " leading" : ""}`}>
                    <span className="score-name">{componentAProfile?.name ?? "Component A"}</span>
                    <span className="score-value">{battleScore.leftWins}</span>
                    <span className="score-record">{formatShowdownRecord(battleScore.leftWins, battleScore.rightWins, battleScore.ties)}</span>
                  </div>
                  <div className="score-divider">
                    <span className="score-vs">VS</span>
                    <span className="score-rounds">{battleScore.totalRounds} round{battleScore.totalRounds !== 1 ? "s" : ""}</span>
                    {battleScore.ties > 0 && <span className="score-ties">{battleScore.ties} tied</span>}
                  </div>
                  <div className={`score-chip team-b${battleScore.rightWins > battleScore.leftWins ? " leading" : ""}`}>
                    <span className="score-name">{componentBProfile?.name ?? "Component B"}</span>
                    <span className="score-value">{battleScore.rightWins}</span>
                    <span className="score-record">{formatShowdownRecord(battleScore.rightWins, battleScore.leftWins, battleScore.ties)}</span>
                  </div>
                </div>
              </div>
            ) : hasShowdown ? (
              <div className="arena-showdown-scoreboard" style={{ marginBottom: 0 }}>
                <div className="arena-scoreboard-totals">
                  <div className={`score-chip team-a${showdownScore.leftWins > showdownScore.rightWins ? " leading" : ""}`}>
                    <span className="score-name">{componentAProfile?.name ?? "Component A"}</span>
                    <span className="score-value">{showdownScore.leftWins}</span>
                    <span className="score-record">{leftRecord}</span>
                  </div>
                  <div className="score-divider">
                    <span className="score-vs">VS</span>
                    <span className="score-rounds">{showdownScore.totalRounds} round{showdownScore.totalRounds !== 1 ? "s" : ""}</span>
                    {showdownScore.ties > 0 && <span className="score-ties">{showdownScore.ties} tied</span>}
                    {showdownScore.dominantMetric && (
                      <span className="score-dominant">Key: {showdownScore.dominantMetric}</span>
                    )}
                  </div>
                  <div className={`score-chip team-b${showdownScore.rightWins > showdownScore.leftWins ? " leading" : ""}`}>
                    <span className="score-name">{componentBProfile?.name ?? "Component B"}</span>
                    <span className="score-value">{showdownScore.rightWins}</span>
                    <span className="score-record">{rightRecord}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="arena-empty">Select two components above to see battle stats</p>
            )}
          </div>

          <div className={`arena-battle-stage${battleState === "battling" ? " battling" : ""}${battleState === "complete" ? " battle-complete" : ""}`}>
            {/* Battle Effects Overlay - Lightning, Sparks, Energy Waves */}
            <div className="arena-battle-effects">
              {/* Lightning Bolts */}
              <div className="arena-lightning-container">
                <svg className="arena-lightning-bolt bolt-1" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M45 5 L42 25 L48 28 L35 50 L43 52 L25 95" />
                </svg>
                <svg className="arena-lightning-bolt bolt-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M55 10 L58 30 L52 33 L65 55 L57 58 L75 90" />
                </svg>
                <svg className="arena-lightning-bolt bolt-3" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M50 0 L47 20 L53 22 L45 45 L52 47 L48 70 L55 72 L50 100" />
                </svg>
              </div>

              {/* Electrical Arc along center divider */}
              <div className="arena-electrical-arc" />

              {/* Spark Particles */}
              <div className="arena-sparks-container">
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
              </div>

              {/* Energy Wave Pulses */}
              <div className="arena-energy-waves">
                <div className="arena-energy-wave" />
                <div className="arena-energy-wave" />
                <div className="arena-energy-wave" />
              </div>

              {/* Screen Flash */}
              <div className="arena-battle-flash" />

              {/* Electric Crackle at top and bottom */}
              <div className="arena-electric-crackle top">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M30 0 L35 15 L45 10 L50 25 L55 15 L65 20 L70 0" />
                </svg>
              </div>
              <div className="arena-electric-crackle bottom">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M30 0 L35 15 L45 10 L50 25 L55 15 L65 20 L70 0" />
                </svg>
              </div>
            </div>

            {renderBattlePanel("left", {
              profile: componentAProfile,
              telemetry: componentATelemetry,
              warnings: componentAWarnings,
              highlightMetrics: leftHighlightMetrics,
              opponentMetricMap: componentBMetricMap,
              record: hasShowdown ? leftRecord : null,
              isChampion: teamAChampion,
              isTie: showdownTie,
              tag: "Component A"
            })}

            <div className="arena-battle-overlay">
              <div className="arena-battle-overlay-controls" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  className="arena-btn ghost small"
                  type="button"
                  onClick={() => setRotationEnabled((prev) => !prev)}
                  title={rotationEnabled ? "Stop component rotation" : "Enable component rotation"}
                >
                  {rotationEnabled ? "Rotation: On" : "Rotation: Off"}
                </button>
                <button
                  className="arena-btn ghost small"
                  type="button"
                  onClick={() => setVarianceEnabled((prev) => !prev)}
                  title={varianceEnabled ? "Disable randomness (more repeatable)" : "Enable variance (more realistic)"}
                >
                  {varianceEnabled ? "Variance: On" : "Variance: Off"}
                </button>
              </div>
              <button 
                className={`arena-battle-btn${battleState === "battling" ? " battling" : ""}${battleState === "complete" ? " complete" : ""}`}
                onClick={handleBattle}
                disabled={battleState === "battling" || !componentAProfile || !componentBProfile}
                type="button"
              >
                {battleState === "idle" ? "⚔️ BATTLE" : battleState === "battling" ? "TESTING..." : "BATTLE COMPLETE"}
              </button>
              
              {battleState === "complete" && battleWinner && (
                <div className={`arena-winner-banner${winnerDismissed ? " arena-winner-banner--dismissed" : ""}`}>
                  <div className="winner-label">🏆 WINNER 🏆</div>
                  <div className="winner-name">
                    {battleWinner === "left" ? componentAProfile?.name : battleWinner === "right" ? componentBProfile?.name : "TIE"}
                  </div>
                  {battleScore && battleScore.totalRounds > 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "rgba(226, 232, 240, 0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {battleScore.leftWins}-{battleScore.rightWins}{battleScore.ties > 0 ? `-${battleScore.ties}` : ""} · {battleScore.totalRounds} metric{battleScore.totalRounds === 1 ? "" : "s"}
                    </div>
                  ) : null}
                  {!winnerDismissed && (
                    <button className="arena-btn ghost small" onClick={handleResetBattle} type="button">Reset Battle</button>
                  )}
                </div>
              )}
            </div>

            {renderBattlePanel("right", {
              profile: componentBProfile,
              telemetry: componentBTelemetry,
              warnings: componentBWarnings,
              highlightMetrics: rightHighlightMetrics,
              opponentMetricMap: componentAMetricMap,
              record: hasShowdown ? rightRecord : null,
              isChampion: teamBChampion,
              isTie: showdownTie,
              tag: "Component B"
            })}
          </div>
        </section>

        {hasShowdown && (
          <section className="arena-analysis-section">
            <div className="arena-card">
              <div className="arena-card-header">
                <h2><span aria-hidden="true">⚡</span> Metric Analysis</h2>
              </div>
              {battleState === "complete" && !winnerDismissed && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                  <button className="arena-btn ghost small" onClick={handleResetBattle} type="button">
                    Reset Battle
                  </button>
                </div>
              )}
              {spotlightRounds.length > 0 && (
                <ul className="arena-score-rounds">
                  {spotlightRounds.map((round) => (
                    <li key={round.key} className={`score-round win-${round.winner}`}>
                      <span className="round-value round-value-a">{round.leftValue}</span>
                      <div className="round-label">
                        <span>{round.label}</span>
                        {round.deltaLabel && <div className="round-delta">{round.deltaLabel}</div>}
                        {round.shortSummary && (
                          <div style={{ fontSize: "0.68rem", color: "rgba(148, 163, 184, 0.65)", marginTop: "2px" }}>{round.shortSummary}</div>
                        )}
                      </div>
                      <span className="round-value round-value-b">{round.rightValue}</span>
                    </li>
                  ))}
                </ul>
              )}
              {comparisonRows.length > 0 && (
                <>
                  <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(148, 163, 184, 0.85)", margin: "18px 0 10px" }}>
                    Full Comparison
                  </h3>
                  <ul className="arena-showdown-table">
                    {comparisonRows.map((row) => {
                      const round = showdownRoundByKey.get(row.key);
                      return (
                        <li key={row.key}>
                          <span className="arena-showdown-value value-a">{row.aValue}</span>
                          <div className="arena-showdown-metric">
                            <span className="metric-name">{row.label}</span>
                            {row.deltaLabel && <span className="arena-showdown-delta">{row.deltaLabel}</span>}
                            {round && (
                              <span style={{ fontSize: "0.64rem", color: round.winner === "left" ? "rgba(59,130,246,0.85)" : round.winner === "right" ? "rgba(52,211,153,0.85)" : "rgba(148,163,184,0.65)", marginTop: "2px" }}>
                                {round.winner === "tie" ? "↔ Even" : round.winner === "left" ? "◀ A leads" : "▶ B leads"}
                              </span>
                            )}
                          </div>
                          <span className="arena-showdown-value value-b">{row.bValue}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {spotlightRounds.length === 0 && comparisonRows.length === 0 && (
                <p className="arena-empty">No comparable metrics found between the two components.</p>
              )}
            </div>
          </section>
        )}

        {/* ── FUSE™ Analysis ───────────────────────────────────────────────── */}
        <section className="arena-fuse-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>🔥 FUSE™ Analysis <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(251,146,60,0.9)", marginLeft: 6 }}>Failure Understanding Simulation Engine</span></h2>
            </div>

            {/* Severity legend */}
            <div className="arena-fuse-legend" role="note" aria-label="FUSE severity levels">
              {FUSE_SEVERITY_LEVELS.map((lv) => (
                <div key={lv.level} className={`arena-fuse-legend-item fuse-${lv.level}`} title={lv.description}>
                  <span>{lv.emoji}</span>
                  <span className="fuse-legend-label">{lv.label}</span>
                </div>
              ))}
            </div>

            {/* Per-component analysis */}
            {!fuseAnalysisA && !fuseAnalysisB ? (
              <div className="arena-fuse-empty">
                <span className="arena-fuse-empty-icon">🔬</span>
                <p className="arena-fuse-empty-text">Load components and run a battle to see FUSE™ failure analysis.</p>
              </div>
            ) : (
              <div className="arena-fuse-results">
                {[fuseAnalysisA, fuseAnalysisB].filter(Boolean).map((analysis, idx) => (
                  <div key={idx} className={`arena-fuse-result-card fuse-card-${analysis!.level.level}`}>
                    <div className="arena-fuse-result-header">
                      <span className="arena-fuse-result-slot">{idx === 0 ? "A" : "B"}</span>
                      <span className="arena-fuse-result-name">{analysis!.profile.name}</span>
                      <span className="arena-fuse-result-badge" style={{ color: analysis!.level.color }}>
                        {analysis!.level.emoji} {analysis!.level.label}
                      </span>
                    </div>
                    {analysis!.hotEntries.length > 0 ? (
                      <ul className="arena-fuse-hot-list">
                        {analysis!.hotEntries.map((entry) => (
                          <li key={entry.id} className={`arena-fuse-hot-entry severity-${entry.severity}`}>
                            <span className="fuse-hot-icon">{entry.icon}</span>
                            <span className="fuse-hot-label">{entry.label}</span>
                            <span className="fuse-hot-value">{entry.displayValue}</span>
                            <span className={`fuse-hot-badge fuse-${entry.severity}`}>{entry.severity}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="arena-fuse-result-ok">✅ All metrics within safe operating limits.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FUSE Report export */}
            {(fuseAnalysisA || fuseAnalysisB) && (
              <div style={{ marginTop: "16px" }}>
                <button className="arena-btn outline" type="button" onClick={handleFuseReportExport}>
                  ⬇ Export FUSE™ Report
                </button>
                <p style={{ marginTop: 6, fontSize: "0.75rem", color: "rgba(148,163,184,0.7)" }}>
                  Exports a structured JSON report with failure modes and severity levels.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Fuse Sizing Calculator ──────────────────────────────────────── */}
        <section className="arena-fuse-calc-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>⚡ Fuse Sizing Calculator</h2>
            </div>
            <div className="arena-fuse-calc-grid">
              <label className="arena-fuse-calc-label">
                <span>Load Current (A)</span>
                <input
                  type="number"
                  className="arena-fuse-calc-input"
                  value={fuseSizingLoad}
                  min="0"
                  step="0.1"
                  aria-label="Load current for fuse sizing"
                  onChange={(e) => { setFuseSizingLoad(e.target.value); setFuseSizingResult(null); }}
                />
              </label>
              <label className="arena-fuse-calc-label">
                <span>Inrush Factor (×)</span>
                <input
                  type="number"
                  className="arena-fuse-calc-input"
                  value={fuseSizingInrush}
                  min="1"
                  step="0.5"
                  aria-label="Inrush current factor"
                  onChange={(e) => { setFuseSizingInrush(e.target.value); setFuseSizingResult(null); }}
                />
              </label>
            </div>
            <button className="arena-btn solid" type="button" onClick={handleFuseSizingCalculate} style={{ marginTop: "12px" }}>
              Calculate
            </button>
            {fuseSizingResult && (
              <p className="arena-fuse-calc-result" aria-live="polite">{fuseSizingResult}</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
