export type WireMetricKey = "watts" | "current" | "resistance" | "voltage";

export type WireMetrics = {
  watts: number;
  current: number;
  resistance: number;
  voltage: number;
};

export type PartialWireMetrics = Partial<Record<WireMetricKey, number>>;

const DEFAULT_METRIC_VALUES: WireMetrics = {
  watts: 0,
  current: 0,
  resistance: 0,
  voltage: 0,
};

const METRIC_UNITS: Record<WireMetricKey, string> = {
  watts: "W",
  current: "A",
  resistance: "Ω",
  voltage: "V",
};

const METRIC_PRECISION: Record<WireMetricKey, number> = {
  watts: 2,
  current: 3,
  resistance: 2,
  voltage: 2,
};

const EPSILON = 1e-9;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const nearlyEqual = (a: number | null | undefined, b: number | null | undefined): boolean => {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
    return false;
  }

  return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
};

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function sanitiseMetric(metrics: PartialWireMetrics): PartialWireMetrics {
  const result: PartialWireMetrics = {};

  (Object.keys(metrics) as WireMetricKey[]).forEach((key) => {
    const raw = metrics[key];
    if (isFiniteNumber(raw)) {
      result[key] = raw;
    }
  });

  return result;
}

export function roundTo(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, digits = 2): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const magnitude = Math.abs(value);

  const appliedDigits = (() => {
    if (magnitude >= 1000) return 1;
    if (magnitude >= 100) return Math.min(digits, 1);
    if (magnitude >= 10) return Math.min(digits, 2);
    return digits;
  })();

  return value.toFixed(appliedDigits);
}

export function formatMetricValue(value: number | null | undefined, key: WireMetricKey): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const digits = METRIC_PRECISION[key] ?? 2;
  return `${formatNumber(value, digits)} ${METRIC_UNITS[key]}`;
}

export type SolveWireMetricsOptions = {
  tolerance?: number;
  maxIterations?: number;
};

export type SolvedWireMetrics = WireMetrics & {
  derived: Partial<Record<WireMetricKey, { formula: string; inputs: WireMetricKey[] }>>;
};

export function solveWireMetrics(
  input: PartialWireMetrics,
  options: SolveWireMetricsOptions = {}
): SolvedWireMetrics {
  const tolerance = options.tolerance ?? EPSILON;
  const maxIterations = options.maxIterations ?? 16;

  let watts = isFiniteNumber(input.watts) ? input.watts : undefined;
  let current = isFiniteNumber(input.current) ? input.current : undefined;
  let resistance = isFiniteNumber(input.resistance) ? input.resistance : undefined;
  let voltage = isFiniteNumber(input.voltage) ? input.voltage : undefined;

  const derived: Partial<Record<WireMetricKey, { formula: string; inputs: WireMetricKey[] }>> = {};

  const compute = (key: WireMetricKey, value: number, formula: string, inputs: WireMetricKey[]) => {
    if (!isFiniteNumber(value)) {
      return false;
    }

    switch (key) {
      case "watts":
        if (!isFiniteNumber(watts) || !nearlyEqual(watts, value)) {
          watts = value;
          derived.watts = { formula, inputs };
          return true;
        }
        return false;
      case "current":
        if (!isFiniteNumber(current) || !nearlyEqual(current, value)) {
          current = value;
          derived.current = { formula, inputs };
          return true;
        }
        return false;
      case "resistance":
        if (!isFiniteNumber(resistance) || !nearlyEqual(resistance, value)) {
          resistance = value;
          derived.resistance = { formula, inputs };
          return true;
        }
        return false;
      case "voltage":
        if (!isFiniteNumber(voltage) || !nearlyEqual(voltage, value)) {
          voltage = value;
          derived.voltage = { formula, inputs };
          return true;
        }
        return false;
      default:
        return false;
    }
  };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    if (!isFiniteNumber(voltage) && isFiniteNumber(current) && isFiniteNumber(resistance)) {
      changed = compute("voltage", current * resistance, "E = I × R", ["current", "resistance"]) || changed;
    }

    if (!isFiniteNumber(current) && isFiniteNumber(voltage) && isFiniteNumber(resistance) && Math.abs(resistance) > tolerance) {
      changed = compute("current", voltage / resistance, "I = E / R", ["voltage", "resistance"]) || changed;
    }

    if (!isFiniteNumber(resistance) && isFiniteNumber(voltage) && isFiniteNumber(current) && Math.abs(current) > tolerance) {
      changed = compute("resistance", voltage / current, "R = E / I", ["voltage", "current"]) || changed;
    }

    if (!isFiniteNumber(watts) && isFiniteNumber(voltage) && isFiniteNumber(current)) {
      changed = compute("watts", voltage * current, "P = E × I", ["voltage", "current"]) || changed;
    }

    if (!isFiniteNumber(watts) && isFiniteNumber(current) && isFiniteNumber(resistance)) {
      changed = compute("watts", current * current * resistance, "P = I² × R", ["current", "resistance"]) || changed;
    }

    if (!isFiniteNumber(watts) && isFiniteNumber(voltage) && isFiniteNumber(resistance) && Math.abs(resistance) > tolerance) {
      changed = compute("watts", (voltage * voltage) / resistance, "P = E² / R", ["voltage", "resistance"]) || changed;
    }

    if (!isFiniteNumber(voltage) && isFiniteNumber(watts) && isFiniteNumber(current) && Math.abs(current) > tolerance) {
      changed = compute("voltage", watts / current, "E = P / I", ["watts", "current"]) || changed;
    }

    if (!isFiniteNumber(voltage) && isFiniteNumber(watts) && isFiniteNumber(resistance) && watts >= 0 && resistance >= 0) {
      const candidate = Math.sqrt(watts * resistance);
      if (candidate >= 0) {
        changed = compute("voltage", candidate, "E = √(P × R)", ["watts", "resistance"]) || changed;
      }
    }

    if (!isFiniteNumber(current) && isFiniteNumber(watts) && isFiniteNumber(voltage) && Math.abs(voltage) > tolerance) {
      changed = compute("current", watts / voltage, "I = P / E", ["watts", "voltage"]) || changed;
    }

    if (!isFiniteNumber(current) && isFiniteNumber(watts) && isFiniteNumber(resistance) && resistance >= tolerance) {
      const candidate = Math.sqrt(watts / resistance);
      if (candidate >= 0) {
        changed = compute("current", candidate, "I = √(P / R)", ["watts", "resistance"]) || changed;
      }
    }

    if (!isFiniteNumber(resistance) && isFiniteNumber(watts) && isFiniteNumber(current) && Math.abs(current) > tolerance) {
      changed = compute("resistance", watts / (current * current), "R = P / I²", ["watts", "current"]) || changed;
    }

    if (!isFiniteNumber(resistance) && isFiniteNumber(watts) && isFiniteNumber(voltage) && Math.abs(voltage) > tolerance) {
      changed = compute("resistance", (voltage * voltage) / watts, "R = E² / P", ["voltage", "watts"]) || changed;
    }

    if (!changed) {
      break;
    }
  }

  if (!isFiniteNumber(voltage) || !isFiniteNumber(current) || !isFiniteNumber(resistance) || !isFiniteNumber(watts)) {
    throw new Error("Unable to resolve all W.I.R.E. metrics from provided values");
  }

  return {
    watts,
    current,
    resistance,
    voltage,
    derived,
  };
}

export function mergeMetrics(base: PartialWireMetrics | undefined, overrides: PartialWireMetrics | undefined): PartialWireMetrics {
  return {
    ...sanitiseMetric(base ?? {}),
    ...sanitiseMetric(overrides ?? {}),
  };
}

export function emptyWireMetrics(): WireMetrics {
  return { ...DEFAULT_METRIC_VALUES };
}

