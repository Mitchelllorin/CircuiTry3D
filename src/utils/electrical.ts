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

// ============================================================================
// AC CIRCUIT SUPPORT
// ============================================================================

/**
 * AC circuit mode type - determines whether simulation uses DC or AC analysis
 */
export type CircuitMode = "dc" | "ac";

/**
 * AC metric keys for reactance, impedance, and phase calculations
 */
export type ACMetricKey =
  | "inductiveReactance"
  | "capacitiveReactance"
  | "netReactance"
  | "impedance"
  | "phaseAngle"
  | "apparentPower"
  | "reactivePower"
  | "powerFactor";

/**
 * Complete AC circuit metrics
 */
export type ACMetrics = {
  frequencyHz: number;
  inductiveReactance: number;  // XL = 2πfL (ohms)
  capacitiveReactance: number; // XC = 1/(2πfC) (ohms)
  netReactance: number;        // X = XL - XC (ohms)
  impedance: number;           // Z = √(R² + X²) (ohms)
  phaseAngle: number;          // φ = arctan(X/R) (degrees)
  current: number;             // I = V/Z (amps RMS)
  apparentPower: number;       // S = V × I (VA)
  reactivePower: number;       // Q = V × I × sin(φ) (VAR)
  realPower: number;           // P = V × I × cos(φ) (watts)
  powerFactor: number;         // PF = cos(φ)
};

/**
 * Input parameters for AC circuit analysis
 */
export type ACCircuitInput = {
  voltage: number;             // RMS voltage (V)
  frequencyHz: number;         // Frequency in Hz
  resistance: number;          // Total resistance (Ω)
  inductance?: number;         // Total inductance (H)
  capacitance?: number;        // Total capacitance (F)
};

/**
 * Partial AC metrics for input
 */
export type PartialACMetrics = Partial<ACCircuitInput>;

const AC_METRIC_UNITS: Record<ACMetricKey, string> = {
  inductiveReactance: "Ω",
  capacitiveReactance: "Ω",
  netReactance: "Ω",
  impedance: "Ω",
  phaseAngle: "°",
  apparentPower: "VA",
  reactivePower: "VAR",
  powerFactor: "",
};

const AC_METRIC_PRECISION: Record<ACMetricKey, number> = {
  inductiveReactance: 2,
  capacitiveReactance: 2,
  netReactance: 2,
  impedance: 2,
  phaseAngle: 1,
  apparentPower: 2,
  reactivePower: 2,
  powerFactor: 3,
};

/**
 * Common AC frequencies used in education and real-world applications
 */
export const COMMON_AC_FREQUENCIES = {
  northAmerica: 60,    // 60 Hz (US, Canada, Mexico)
  europe: 50,          // 50 Hz (Europe, most of Asia, Africa)
  aircraft400Hz: 400,  // 400 Hz (aircraft electrical systems)
  audio1kHz: 1000,     // 1 kHz (audio reference)
  radio1MHz: 1000000,  // 1 MHz (RF applications)
} as const;

/**
 * Default AC frequency (North American standard)
 */
export const DEFAULT_AC_FREQUENCY = COMMON_AC_FREQUENCIES.northAmerica;

/**
 * Calculate inductive reactance: XL = 2πfL
 * @param frequencyHz - Frequency in Hz
 * @param inductance - Inductance in Henries
 * @returns Inductive reactance in ohms
 */
export function calculateInductiveReactance(frequencyHz: number, inductance: number): number {
  if (!isFiniteNumber(frequencyHz) || !isFiniteNumber(inductance)) {
    return 0;
  }
  return 2 * Math.PI * frequencyHz * inductance;
}

/**
 * Calculate capacitive reactance: XC = 1/(2πfC)
 * @param frequencyHz - Frequency in Hz
 * @param capacitance - Capacitance in Farads
 * @returns Capacitive reactance in ohms
 */
export function calculateCapacitiveReactance(frequencyHz: number, capacitance: number): number {
  if (!isFiniteNumber(frequencyHz) || !isFiniteNumber(capacitance) || capacitance === 0 || frequencyHz === 0) {
    return 0;
  }
  return 1 / (2 * Math.PI * frequencyHz * capacitance);
}

/**
 * Calculate net reactance: X = XL - XC
 * Positive value indicates inductive circuit, negative indicates capacitive
 * @param inductiveReactance - XL in ohms
 * @param capacitiveReactance - XC in ohms
 * @returns Net reactance in ohms
 */
export function calculateNetReactance(inductiveReactance: number, capacitiveReactance: number): number {
  return inductiveReactance - capacitiveReactance;
}

/**
 * Calculate impedance: Z = √(R² + X²)
 * @param resistance - Resistance in ohms
 * @param netReactance - Net reactance in ohms
 * @returns Impedance in ohms
 */
export function calculateImpedance(resistance: number, netReactance: number): number {
  if (!isFiniteNumber(resistance) || !isFiniteNumber(netReactance)) {
    return 0;
  }
  return Math.sqrt(resistance * resistance + netReactance * netReactance);
}

/**
 * Calculate phase angle: φ = arctan(X/R)
 * @param netReactance - Net reactance in ohms
 * @param resistance - Resistance in ohms
 * @returns Phase angle in degrees
 */
export function calculatePhaseAngle(netReactance: number, resistance: number): number {
  if (!isFiniteNumber(netReactance) || !isFiniteNumber(resistance)) {
    return 0;
  }
  if (resistance === 0) {
    // Pure reactive circuit
    return netReactance > 0 ? 90 : netReactance < 0 ? -90 : 0;
  }
  return (Math.atan(netReactance / resistance) * 180) / Math.PI;
}

/**
 * Calculate power factor: PF = cos(φ) = R/Z
 * @param phaseAngleDegrees - Phase angle in degrees
 * @returns Power factor (0 to 1)
 */
export function calculatePowerFactor(phaseAngleDegrees: number): number {
  if (!isFiniteNumber(phaseAngleDegrees)) {
    return 1;
  }
  return Math.cos((phaseAngleDegrees * Math.PI) / 180);
}

/**
 * Determine if circuit is leading (capacitive) or lagging (inductive)
 * @param phaseAngle - Phase angle in degrees
 * @returns Circuit phase characteristic
 */
export function getPhaseCharacteristic(phaseAngle: number): "leading" | "lagging" | "unity" {
  if (Math.abs(phaseAngle) < 0.1) {
    return "unity";
  }
  return phaseAngle > 0 ? "lagging" : "leading";
}

/**
 * Calculate resonant frequency: f₀ = 1/(2π√(LC))
 * @param inductance - Inductance in Henries
 * @param capacitance - Capacitance in Farads
 * @returns Resonant frequency in Hz, or null if invalid inputs
 */
export function calculateResonantFrequency(inductance: number, capacitance: number): number | null {
  if (!isFiniteNumber(inductance) || !isFiniteNumber(capacitance) || inductance <= 0 || capacitance <= 0) {
    return null;
  }
  return 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance));
}

/**
 * Solve complete AC circuit metrics from given inputs
 * @param input - AC circuit input parameters
 * @returns Complete AC metrics
 */
export function solveACCircuit(input: ACCircuitInput): ACMetrics {
  const { voltage, frequencyHz, resistance, inductance = 0, capacitance = 0 } = input;

  // Calculate reactances
  const inductiveReactance = calculateInductiveReactance(frequencyHz, inductance);
  const capacitiveReactance = calculateCapacitiveReactance(frequencyHz, capacitance);
  const netReactance = calculateNetReactance(inductiveReactance, capacitiveReactance);

  // Calculate impedance and phase
  const impedance = calculateImpedance(resistance, netReactance);
  const phaseAngle = calculatePhaseAngle(netReactance, resistance);
  const powerFactor = calculatePowerFactor(phaseAngle);

  // Calculate current (Ohm's law for AC: I = V/Z)
  const current = impedance > EPSILON ? voltage / impedance : 0;

  // Calculate power values
  const apparentPower = voltage * current;                                    // S = VI (VA)
  const realPower = apparentPower * powerFactor;                              // P = S × PF (W)
  const reactivePower = apparentPower * Math.sin((phaseAngle * Math.PI) / 180); // Q = S × sin(φ) (VAR)

  return {
    frequencyHz,
    inductiveReactance: roundTo(inductiveReactance, 4),
    capacitiveReactance: roundTo(capacitiveReactance, 4),
    netReactance: roundTo(netReactance, 4),
    impedance: roundTo(impedance, 4),
    phaseAngle: roundTo(phaseAngle, 2),
    current: roundTo(current, 6),
    apparentPower: roundTo(apparentPower, 4),
    reactivePower: roundTo(reactivePower, 4),
    realPower: roundTo(realPower, 4),
    powerFactor: roundTo(powerFactor, 4),
  };
}

/**
 * Format an AC metric value with appropriate units
 * @param value - The metric value
 * @param key - The AC metric key
 * @returns Formatted string with value and units
 */
export function formatACMetricValue(value: number | null | undefined, key: ACMetricKey): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const digits = AC_METRIC_PRECISION[key] ?? 2;
  const unit = AC_METRIC_UNITS[key];
  return unit ? `${formatNumber(value, digits)} ${unit}` : formatNumber(value, digits);
}

/**
 * Create empty AC metrics with default values
 * @param frequencyHz - Optional frequency (defaults to 60 Hz)
 * @returns Empty AC metrics object
 */
export function emptyACMetrics(frequencyHz: number = DEFAULT_AC_FREQUENCY): ACMetrics {
  return {
    frequencyHz,
    inductiveReactance: 0,
    capacitiveReactance: 0,
    netReactance: 0,
    impedance: 0,
    phaseAngle: 0,
    current: 0,
    apparentPower: 0,
    reactivePower: 0,
    realPower: 0,
    powerFactor: 1,
  };
}

/**
 * Validate AC circuit input parameters
 * @param input - Partial AC circuit input
 * @returns Validation result with any error messages
 */
export function validateACInput(input: PartialACMetrics): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (input.voltage !== undefined && input.voltage < 0) {
    errors.push("Voltage must be non-negative");
  }

  if (input.frequencyHz !== undefined && input.frequencyHz <= 0) {
    errors.push("Frequency must be positive");
  }

  if (input.resistance !== undefined && input.resistance < 0) {
    errors.push("Resistance must be non-negative");
  }

  if (input.inductance !== undefined && input.inductance < 0) {
    errors.push("Inductance must be non-negative");
  }

  if (input.capacitance !== undefined && input.capacitance < 0) {
    errors.push("Capacitance must be non-negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert capacitance from common units to Farads
 */
export const capacitanceToFarads = {
  fromMicrofarads: (uF: number): number => uF * 1e-6,
  fromNanofarads: (nF: number): number => nF * 1e-9,
  fromPicofarads: (pF: number): number => pF * 1e-12,
};

/**
 * Convert inductance from common units to Henries
 */
export const inductanceToHenries = {
  fromMillihenries: (mH: number): number => mH * 1e-3,
  fromMicrohenries: (uH: number): number => uH * 1e-6,
};

/**
 * Format frequency with appropriate SI prefix
 * @param frequencyHz - Frequency in Hz
 * @returns Formatted frequency string
 */
export function formatFrequency(frequencyHz: number): string {
  if (!isFiniteNumber(frequencyHz)) {
    return "— Hz";
  }

  if (frequencyHz >= 1e9) {
    return `${formatNumber(frequencyHz / 1e9, 2)} GHz`;
  }
  if (frequencyHz >= 1e6) {
    return `${formatNumber(frequencyHz / 1e6, 2)} MHz`;
  }
  if (frequencyHz >= 1e3) {
    return `${formatNumber(frequencyHz / 1e3, 2)} kHz`;
  }
  return `${formatNumber(frequencyHz, 1)} Hz`;
}

