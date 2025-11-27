/**
 * Environmental scenarios and modifiers for circuit simulation.
 * Used by both the Component Arena and the main Builder workspace.
 */

export type EnvironmentalScenario = {
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

export const ENVIRONMENTAL_SCENARIOS: EnvironmentalScenario[] = [
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

/**
 * Get a scenario by its ID
 */
export function getScenarioById(id: string): EnvironmentalScenario | undefined {
  return ENVIRONMENTAL_SCENARIOS.find((scenario) => scenario.id === id);
}

/**
 * Get the default (standard) scenario
 */
export function getDefaultScenario(): EnvironmentalScenario {
  return ENVIRONMENTAL_SCENARIOS[0];
}

/**
 * Apply scenario modifiers to base metrics
 */
export function applyScenarioModifiers(
  baseMetrics: {
    watts?: number;
    current?: number;
    resistance?: number;
    voltage?: number;
  },
  scenario: EnvironmentalScenario
): {
  watts: number;
  current: number;
  resistance: number;
  voltage: number;
  efficiency: number;
  thermalRise: number;
} {
  const modifiers = scenario.modifiers;
  const watts = (baseMetrics.watts ?? 0) * (modifiers.power ?? 1);
  const current = (baseMetrics.current ?? 0) * (modifiers.current ?? 1);
  const resistance = (baseMetrics.resistance ?? 0) * (modifiers.resistance ?? 1);
  const voltage = (baseMetrics.voltage ?? 0) * (modifiers.voltage ?? 1);
  const efficiency = (modifiers.efficiency ?? 1) * 100;
  const thermalRise = (scenario.conditions.temperature ?? 25) * (modifiers.temperature ?? 1);

  return {
    watts,
    current,
    resistance,
    voltage,
    efficiency,
    thermalRise
  };
}

/**
 * Format a metric value with appropriate precision and unit
 */
export function formatMetricValue(
  value: number,
  type: "watts" | "current" | "resistance" | "voltage" | "efficiency" | "thermal"
): string {
  switch (type) {
    case "watts":
      return `${value.toFixed(2)} W`;
    case "current":
      return `${value.toFixed(3)} A`;
    case "resistance":
      return `${value.toFixed(1)} Ω`;
    case "voltage":
      return `${value.toFixed(2)} V`;
    case "efficiency":
      return `${value.toFixed(1)}%`;
    case "thermal":
      return `${value.toFixed(1)}°C`;
    default:
      return value.toFixed(2);
  }
}

/**
 * Get status level based on metric value and thresholds
 */
export function getMetricStatus(
  value: number,
  type: "watts" | "current" | "resistance" | "voltage" | "efficiency" | "thermal"
): "normal" | "warning" | "critical" {
  const thresholds: Record<string, { warning: number; critical: number; inverted?: boolean }> = {
    watts: { warning: 50, critical: 150 },
    current: { warning: 5, critical: 15 },
    resistance: { warning: 1000, critical: 10000 },
    voltage: { warning: 24, critical: 60 },
    efficiency: { warning: 70, critical: 50, inverted: true },
    thermal: { warning: 60, critical: 90 }
  };

  const threshold = thresholds[type];
  if (!threshold) return "normal";

  if (threshold.inverted) {
    if (value <= threshold.critical) return "critical";
    if (value <= threshold.warning) return "warning";
    return "normal";
  }

  if (value >= threshold.critical) return "critical";
  if (value >= threshold.warning) return "warning";
  return "normal";
}
