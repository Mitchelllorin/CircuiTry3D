/**
 * Electrical Visualization Utilities
 *
 * Physics-based visualization helpers for realistic electrical behavior display.
 * These utilities convert electrical quantities (voltage, current, power) into
 * visual properties (colors, intensities, sizes) that accurately represent
 * electrical phenomena in an educational context.
 *
 * Core principles:
 * - Higher voltage = higher potential energy (height/color gradient)
 * - Higher current = faster particle flow + more particles
 * - Higher power = brighter glow/heat visualization (P = I²R)
 */

import type { Vec2 } from "./types";

/**
 * Voltage potential visualization configuration
 * Maps voltage levels to visual properties for intuitive understanding
 */
export const VOLTAGE_VISUALIZATION = {
  /**
   * Color gradient for voltage potential (low to high)
   * Blue (cold/low) -> Green -> Yellow -> Red (hot/high)
   */
  POTENTIAL_COLORS: {
    negative: 0x3b82f6,  // Blue - below ground reference
    ground: 0x6b7280,    // Gray - 0V reference
    low: 0x22c55e,       // Green - 0-3V
    medium: 0xeab308,    // Yellow - 3-9V
    high: 0xf97316,      // Orange - 9-24V
    veryHigh: 0xef4444,  // Red - 24V+
  },

  /**
   * Visual height offset based on voltage (for 3D representation)
   * Higher voltage = higher visual position to represent potential energy
   */
  HEIGHT_PER_VOLT: 0.02,  // 2cm visual height per volt

  /**
   * Maximum visual height offset to prevent extreme positions
   */
  MAX_HEIGHT_OFFSET: 0.5,

  /**
   * Glow intensity for voltage indicators
   */
  BASE_GLOW_INTENSITY: 0.3,
  MAX_GLOW_INTENSITY: 1.2,
} as const;

/**
 * Calculate visual color based on voltage level
 * Uses a gradient from blue (negative/low) through green to red (high)
 *
 * @param volts - Voltage in volts (can be negative)
 * @param referenceVoltage - The maximum expected voltage for scaling (default 12V)
 * @returns Hex color value
 */
export function getVoltageColor(volts: number, referenceVoltage: number = 12): number {
  const { POTENTIAL_COLORS } = VOLTAGE_VISUALIZATION;

  // Handle negative voltages (below ground)
  if (volts < -0.1) {
    return POTENTIAL_COLORS.negative;
  }

  // Near ground (0V)
  if (Math.abs(volts) < 0.1) {
    return POTENTIAL_COLORS.ground;
  }

  // Positive voltage gradient
  const normalizedVoltage = volts / referenceVoltage;

  if (normalizedVoltage < 0.25) {
    return POTENTIAL_COLORS.low;
  } else if (normalizedVoltage < 0.5) {
    return POTENTIAL_COLORS.medium;
  } else if (normalizedVoltage < 0.75) {
    return POTENTIAL_COLORS.high;
  } else {
    return POTENTIAL_COLORS.veryHigh;
  }
}

/**
 * Calculate visual height offset based on voltage (potential energy representation)
 * Higher voltage = higher position to intuitively show potential energy
 *
 * @param volts - Voltage in volts
 * @param _referenceVoltage - Maximum expected voltage for scaling (reserved for future use)
 * @returns Height offset in 3D units
 */
export function getVoltageHeightOffset(volts: number, _referenceVoltage: number = 12): number {
  const { HEIGHT_PER_VOLT, MAX_HEIGHT_OFFSET } = VOLTAGE_VISUALIZATION;

  const heightOffset = volts * HEIGHT_PER_VOLT;
  return Math.max(-MAX_HEIGHT_OFFSET, Math.min(MAX_HEIGHT_OFFSET, heightOffset));
}

/**
 * Calculate glow intensity for voltage indicator
 * Higher voltage magnitude = brighter glow
 *
 * @param volts - Voltage in volts (absolute value used)
 * @param referenceVoltage - Maximum expected voltage for scaling
 * @returns Glow intensity value (0 to MAX_GLOW_INTENSITY)
 */
export function getVoltageGlowIntensity(volts: number, referenceVoltage: number = 12): number {
  const { BASE_GLOW_INTENSITY, MAX_GLOW_INTENSITY } = VOLTAGE_VISUALIZATION;

  const absVolts = Math.abs(volts);
  const normalizedVoltage = Math.min(1, absVolts / referenceVoltage);

  return BASE_GLOW_INTENSITY + normalizedVoltage * (MAX_GLOW_INTENSITY - BASE_GLOW_INTENSITY);
}

/**
 * Node voltage marker configuration
 * Represents electrical potential at a point in the circuit
 */
export type VoltageMarker = {
  position: Vec2;
  voltage: number;
  label: string;
  color: number;
  heightOffset: number;
  glowIntensity: number;
};

/**
 * Create voltage markers for circuit nodes from solver results
 *
 * @param nodeVoltages - Map of node ID to voltage from DC solver
 * @param nodePositions - Map of node ID to Vec2 position
 * @param referenceVoltage - Maximum expected voltage for scaling
 * @returns Array of voltage markers for visualization
 */
export function createVoltageMarkers(
  nodeVoltages: Map<string, number>,
  nodePositions: Map<string, Vec2>,
  referenceVoltage: number = 12
): VoltageMarker[] {
  const markers: VoltageMarker[] = [];

  for (const [nodeId, voltage] of nodeVoltages) {
    const position = nodePositions.get(nodeId);
    if (!position) continue;

    markers.push({
      position,
      voltage,
      label: formatVoltageLabel(voltage),
      color: getVoltageColor(voltage, referenceVoltage),
      heightOffset: getVoltageHeightOffset(voltage, referenceVoltage),
      glowIntensity: getVoltageGlowIntensity(voltage, referenceVoltage),
    });
  }

  return markers;
}

/**
 * Format voltage for display label
 *
 * @param volts - Voltage in volts
 * @returns Formatted string (e.g., "9.0V", "0V", "-3.2V")
 */
export function formatVoltageLabel(volts: number): string {
  if (Math.abs(volts) < 0.01) {
    return "0V";
  }

  const absVolts = Math.abs(volts);
  if (absVolts >= 100) {
    return `${volts.toFixed(0)}V`;
  } else if (absVolts >= 10) {
    return `${volts.toFixed(1)}V`;
  } else {
    return `${volts.toFixed(2)}V`;
  }
}

/**
 * Current flow visualization parameters
 * Converts amperage to particle behavior
 */
export type CurrentFlowParams = {
  /** Particle speed (units per second) */
  speed: number;
  /** Number of particles for visualization */
  particleCount: number;
  /** Intensity level for color coding */
  intensity: "off" | "low" | "medium" | "high" | "critical";
  /** Particle size multiplier */
  sizeMultiplier: number;
};

/**
 * Calculate current flow visualization parameters from amperage
 *
 * This maps real electrical current to visual properties that
 * intuitively represent the amount of charge flowing:
 * - More current = faster particles (drift velocity)
 * - More current = more particles (charge density)
 * - More current = larger/brighter particles
 *
 * @param amps - Current in amperes
 * @param pathLength - Length of the flow path in units
 * @returns Visualization parameters
 */
export function calculateCurrentFlowParams(amps: number, pathLength: number = 5): CurrentFlowParams {
  const absAmps = Math.abs(amps);

  // Determine intensity level
  let intensity: CurrentFlowParams["intensity"];
  if (absAmps < 0.001) {
    intensity = "off";
  } else if (absAmps < 0.1) {
    intensity = "low";
  } else if (absAmps < 0.5) {
    intensity = "medium";
  } else if (absAmps < 2.0) {
    intensity = "high";
  } else {
    intensity = "critical";
  }

  // Calculate speed using logarithmic scaling for wide current range
  // log10(0.001) = -3, log10(1) = 0, log10(10) = 1
  let speed = 0;
  if (absAmps >= 0.000001) {
    const logCurrent = Math.log10(absAmps + 0.001);
    const normalizedCurrent = (logCurrent + 3) / 4;
    speed = 0.15 + normalizedCurrent * (1.5 - 0.15);
    speed = Math.min(1.5, Math.max(0.15, speed));
  }

  // Calculate particle count based on current and path length
  let particleCount = 0;
  if (absAmps >= 0.000001) {
    const densityFactor = Math.sqrt(absAmps) * 0.8;
    particleCount = Math.round(pathLength * densityFactor);
    particleCount = Math.min(15, Math.max(2, particleCount));
  }

  // Size multiplier based on current (subtle effect)
  const sizeMultiplier = 0.8 + Math.min(0.4, absAmps * 0.2);

  return {
    speed,
    particleCount,
    intensity,
    sizeMultiplier,
  };
}

/**
 * Power dissipation visualization for resistive elements
 * Based on P = I²R (Joule heating)
 */
export type PowerDissipationParams = {
  /** Power in watts */
  watts: number;
  /** Glow color (cool to hot gradient) */
  glowColor: number;
  /** Emissive intensity for 3D materials */
  emissiveIntensity: number;
  /** Heat level description */
  heatLevel: "none" | "warm" | "hot" | "glowing" | "critical";
};

/**
 * Calculate power dissipation visualization from current and resistance
 *
 * @param currentAmps - Current through component in amperes
 * @param resistanceOhms - Component resistance in ohms
 * @returns Power dissipation visualization parameters
 */
export function calculatePowerDissipation(
  currentAmps: number,
  resistanceOhms: number
): PowerDissipationParams {
  // P = I²R (Joule's law)
  const watts = currentAmps * currentAmps * resistanceOhms;

  // Determine heat level
  let heatLevel: PowerDissipationParams["heatLevel"];
  let glowColor: number;

  if (watts < 0.001) {
    heatLevel = "none";
    glowColor = 0x4b5563; // Gray
  } else if (watts < 0.01) {
    heatLevel = "warm";
    glowColor = 0x6b7280; // Slight warm
  } else if (watts < 0.1) {
    heatLevel = "hot";
    glowColor = 0xf59e0b; // Orange glow
  } else if (watts < 0.5) {
    heatLevel = "glowing";
    glowColor = 0xf97316; // Orange-red
  } else if (watts < 2.0) {
    heatLevel = "glowing";
    glowColor = 0xef4444; // Red
  } else {
    heatLevel = "critical";
    glowColor = 0xff6b6b; // Bright red-white
  }

  // Calculate emissive intensity using logarithmic scaling
  let emissiveIntensity = 0;
  if (watts >= 0.001) {
    const logPower = Math.log10(watts + 0.001);
    const normalizedPower = (logPower + 3) / 4;
    emissiveIntensity = Math.min(2.0, Math.max(0.1, normalizedPower * 1.5));
  }

  return {
    watts,
    glowColor,
    emissiveIntensity,
    heatLevel,
  };
}

/**
 * Calculate voltage drop across a resistive element
 * V = IR (Ohm's law)
 *
 * @param currentAmps - Current through component
 * @param resistanceOhms - Component resistance
 * @returns Voltage drop in volts
 */
export function calculateVoltageDrop(currentAmps: number, resistanceOhms: number): number {
  return Math.abs(currentAmps) * resistanceOhms;
}

/**
 * Wire segment current visualization
 * Represents current flow through a single wire segment
 */
export type WireSegmentVisualization = {
  wireId: string;
  segmentIndex: number;
  startPoint: Vec2;
  endPoint: Vec2;
  currentAmps: number;
  flowsForward: boolean;  // true = start -> end direction
  flowParams: CurrentFlowParams;
};

/**
 * Create wire segment visualizations from DC solver results
 *
 * @param wireSegmentCurrents - Per-segment currents from solveDCCircuit()
 * @param wirePathMap - Map of wire ID to path points
 * @returns Array of segment visualization configs
 */
export function createWireSegmentVisualizations(
  wireSegmentCurrents: Array<{ wireId: string; segmentIndex: number; amps: number }>,
  wirePathMap: Map<string, Vec2[]>
): WireSegmentVisualization[] {
  const visualizations: WireSegmentVisualization[] = [];

  for (const segment of wireSegmentCurrents) {
    const wirePath = wirePathMap.get(segment.wireId);
    if (!wirePath || segment.segmentIndex >= wirePath.length - 1) continue;

    const startPoint = wirePath[segment.segmentIndex];
    const endPoint = wirePath[segment.segmentIndex + 1];

    // Calculate segment length
    const dx = endPoint.x - startPoint.x;
    const dz = endPoint.z - startPoint.z;
    const segmentLength = Math.sqrt(dx * dx + dz * dz);

    visualizations.push({
      wireId: segment.wireId,
      segmentIndex: segment.segmentIndex,
      startPoint,
      endPoint,
      currentAmps: Math.abs(segment.amps),
      flowsForward: segment.amps >= 0,
      flowParams: calculateCurrentFlowParams(segment.amps, segmentLength),
    });
  }

  return visualizations;
}
