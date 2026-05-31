/**
 * FUSE™ — Failure Understanding Simulation Engine
 *
 * Simulates component failure risk based on real electrical/thermal physics.
 * Factors in ambient temperature, humidity, voltage stress, and rated thresholds
 * to compute a risk score and identify specific failure modes per component.
 */

import type {
  ArenaBattleAgent,
  ArenaEnvironment,
  FuseAnalysisResult,
  FuseFailureMode,
  FuseRiskLevel,
} from "./types";

// ── Derating curves ──────────────────────────────────────────────────────────

/**
 * Compute a voltage derating multiplier (0–1) based on junction temperature.
 * Most components derate linearly above 70 % of their max junction temperature.
 */
function voltageDerating(junctionTempC: number, maxTempC: number): number {
  if (maxTempC <= 0) return 1;
  const t = junctionTempC / maxTempC;
  if (t <= 0.7) return 1;
  // Linear derate from 1.0 at 70 % → 0 at 100 %
  return Math.max(0, 1 - (t - 0.7) / 0.3);
}

/**
 * Humidity derating multiplier (0.8–1.0).
 * High humidity degrades insulation resistance and leads to leakage / corrosion.
 */
function humidityDeratingMultiplier(humidityPercent: number): number {
  if (humidityPercent <= 70) return 1;
  // Derate by up to 20 % at 100 % RH
  return Math.max(0.8, 1 - ((humidityPercent - 70) / 100) * 0.2);
}

/**
 * Thermal resistance (°C/W) estimate when not explicitly provided in component
 * thresholds. Based on typical package types by component category.
 */
function estimateThermalResistance(componentType: string, powerW: number): number {
  if (powerW <= 0) return 100;
  switch (componentType) {
    case "resistor":
      return 300;
    case "capacitor":
    case "capacitor-ceramic":
      return 60;
    case "inductor":
      return 80;
    case "led":
      return 120;
    case "diode":
      return 80;
    case "transistor-bjt-npn":
    case "bjt":
      return 125;
    case "mosfet":
      return 60;
    case "battery":
      return 15;
    case "fuse":
      return 50;
    case "switch":
    case "potentiometer":
      return 40;
    default:
      return 150;
  }
}

// ── Risk level helpers ────────────────────────────────────────────────────────

export function riskScore2Level(score: number): FuseRiskLevel {
  if (score >= 95) return "failed";
  if (score >= 80) return "critical";
  if (score >= 60) return "warning";
  if (score >= 35) return "stressed";
  return "safe";
}

// ── Failure mode detection ────────────────────────────────────────────────────

function detectFailureModes(
  agent: ArenaBattleAgent,
  junctionTempC: number,
  powerUtilization: number,
  voltageDerate: number,
  env: ArenaEnvironment,
): FuseFailureMode[] {
  const modes: FuseFailureMode[] = [];
  const thresholds = agent.ratedThresholds ?? {};
  const maxTempC = thresholds.maxTempC ?? 125;
  const minTempC = thresholds.minTempC ?? -40;
  const maxVoltageV = thresholds.maxVoltageV ?? null;
  const maxPowerW = thresholds.maxPowerW ?? null;

  // Thermal runaway
  if (junctionTempC > maxTempC * 0.95) {
    modes.push({
      id: "thermal-runaway",
      name: "Thermal Runaway",
      description: `Junction temperature ${junctionTempC.toFixed(0)} °C exceeds max rating ${maxTempC} °C. Catastrophic failure imminent.`,
      severity: junctionTempC > maxTempC ? "failed" : "critical",
    });
  } else if (junctionTempC > maxTempC * 0.80) {
    modes.push({
      id: "thermal-stress",
      name: "Thermal Stress",
      description: `Junction temperature ${junctionTempC.toFixed(0)} °C approaching limit (${maxTempC} °C). Performance degraded.`,
      severity: "warning",
    });
  }

  // Cold temperature
  if (env.temperatureC < minTempC + 5) {
    modes.push({
      id: "cold-startup",
      name: "Cold-Start Anomaly",
      description: `Ambient ${env.temperatureC} °C near minimum operating limit ${minTempC} °C. Reduced ionic mobility expected.`,
      severity: env.temperatureC < minTempC ? "critical" : "stressed",
    });
  }

  // Overvoltage / voltage derating
  if (maxVoltageV !== null) {
    const appliedV = agent.metrics.voltage * env.voltageStressMultiplier;
    if (appliedV > maxVoltageV * 1.2) {
      modes.push({
        id: "dielectric-breakdown",
        name: "Dielectric Breakdown",
        description: `Applied voltage ${appliedV.toFixed(1)} V exceeds rated ${maxVoltageV} V by >20 %. Insulation failure likely.`,
        severity: "failed",
      });
    } else if (appliedV > maxVoltageV) {
      modes.push({
        id: "overvoltage",
        name: "Overvoltage",
        description: `Applied voltage ${appliedV.toFixed(1)} V exceeds rated ${maxVoltageV} V. Component derating insufficient.`,
        severity: "critical",
      });
    } else if (voltageDerate < 0.6) {
      modes.push({
        id: "voltage-derating",
        name: "Voltage Derating",
        description: `Voltage derating factor ${(voltageDerate * 100).toFixed(0)} % due to high junction temperature.`,
        severity: "warning",
      });
    }
  }

  // Power overload
  if (maxPowerW !== null && powerUtilization > 1.15) {
    modes.push({
      id: "power-overload",
      name: "Power Overload",
      description: `Power dissipation ${(powerUtilization * 100).toFixed(0)} % of rating. Open-circuit failure expected.`,
      severity: powerUtilization > 1.5 ? "failed" : "critical",
    });
  } else if (maxPowerW !== null && powerUtilization > 0.85) {
    modes.push({
      id: "power-stress",
      name: "Power Stress",
      description: `Running at ${(powerUtilization * 100).toFixed(0)} % power rating. Derating recommended.`,
      severity: "stressed",
    });
  }

  // Humidity-induced corrosion
  if (env.humidityPercent > 85) {
    modes.push({
      id: "corrosion",
      name: "Humidity Corrosion",
      description: `${env.humidityPercent} % RH exceeds IPC J-STD-033 Class 3 limit. Moisture ingress and lead corrosion risk elevated.`,
      severity: env.humidityPercent > 95 ? "critical" : "warning",
    });
  }

  return modes;
}

// ── Recommendation generator ──────────────────────────────────────────────────

function buildRecommendation(
  riskLevel: FuseRiskLevel,
  failureModes: FuseFailureMode[],
  agent: ArenaBattleAgent,
  junctionTempC: number,
): string {
  if (riskLevel === "failed") {
    return `${agent.name} has exceeded its rated operating envelope. Replace immediately and review circuit design.`;
  }
  if (riskLevel === "critical") {
    const primaryMode = failureModes[0]?.name ?? "thermal/electrical stress";
    return `${agent.name} is at critical risk of ${primaryMode}. Reduce operating conditions immediately.`;
  }
  if (riskLevel === "warning") {
    return `${agent.name} is operating outside recommended derating guidelines. Monitor thermal budget. ΔT = ${junctionTempC.toFixed(0)} °C.`;
  }
  if (riskLevel === "stressed") {
    return `${agent.name} is within limits but operating with reduced margin. Consider upgrading to higher-rated component.`;
  }
  return `${agent.name} is operating within safe limits. No action required.`;
}

// ── Main FUSE run ─────────────────────────────────────────────────────────────

export function runFuseAnalysis(
  agent: ArenaBattleAgent,
  env: ArenaEnvironment,
): FuseAnalysisResult {
  const thresholds = agent.ratedThresholds ?? {};
  const maxTempC = thresholds.maxTempC ?? 125;
  const maxPowerW = thresholds.maxPowerW ?? null;

  // Effective power factoring in voltage stress multiplier and humidity derating
  const humidityFactor = humidityDeratingMultiplier(env.humidityPercent);
  const effectivePower =
    agent.metrics.voltage * env.voltageStressMultiplier * agent.metrics.current * humidityFactor;

  // Thermal rise: ΔT = P × θ_JA
  const thermalResistanceCA =
    thresholds.thermalResistanceCA ??
    estimateThermalResistance(agent.componentType, effectivePower);
  const thermalRise = effectivePower * thermalResistanceCA;
  const junctionTempC = env.temperatureC + thermalRise;

  // Voltage derating
  const voltageDerate = voltageDerating(junctionTempC, maxTempC);

  // Power utilization (ratio to rated max)
  const powerUtilization =
    maxPowerW !== null && maxPowerW > 0 ? effectivePower / maxPowerW : effectivePower / 1.0;

  // Failure modes
  const failureModes = detectFailureModes(
    agent,
    junctionTempC,
    powerUtilization,
    voltageDerate,
    env,
  );

  // Risk score: composite of thermal, voltage, power, and humidity factors
  const thermalScore = Math.min(100, ((junctionTempC - 25) / Math.max(maxTempC - 25, 1)) * 100);
  const voltageScore = (1 - voltageDerate) * 100;
  const powerScore = Math.min(100, powerUtilization * 80);
  const humidityScore = env.humidityPercent > 70 ? ((env.humidityPercent - 70) / 30) * 20 : 0;

  // Weighted composite
  const rawScore =
    thermalScore * 0.45 + voltageScore * 0.25 + powerScore * 0.2 + humidityScore * 0.1;
  const riskScore = Math.min(100, Math.max(0, rawScore));
  const riskLevel = riskScore2Level(riskScore);

  const recommendation = buildRecommendation(riskLevel, failureModes, agent, junctionTempC);

  return {
    agentId: agent.id,
    riskScore,
    riskLevel,
    thermalRise,
    junctionTemperature: junctionTempC,
    voltageDerating: voltageDerate,
    powerUtilization,
    failureModes,
    recommendation,
  };
}

/**
 * Compute a stress multiplier (0.6–1.4) to apply to battle damage based on
 * how close a component is to its rated limits. Components under extreme stress
 * can either deal more damage (desperation output) or take more (reduced resilience).
 */
export function computeStressModifier(fuseResult: FuseAnalysisResult): {
  attackMod: number;
  defenseMod: number;
} {
  const score = fuseResult.riskScore;
  if (score >= 95) return { attackMod: 0.5, defenseMod: 0.3 };
  if (score >= 80) return { attackMod: 0.75, defenseMod: 0.55 };
  if (score >= 60) return { attackMod: 0.9, defenseMod: 0.78 };
  if (score >= 35) return { attackMod: 1.0, defenseMod: 0.92 };
  return { attackMod: 1.0, defenseMod: 1.0 };
}
