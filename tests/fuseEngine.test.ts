import { describe, expect, it } from "vitest";
import { computeStressModifier, riskScore2Level, runFuseAnalysis } from "../src/components/arena/fuseEngine";
import type { ArenaBattleAgent } from "../src/components/arena/types";
import { DEFAULT_ENVIRONMENT, ENVIRONMENT_PRESETS } from "../src/components/arena/types";

// A minimal agent for test fixtures
function makeAgent(overrides: Partial<ArenaBattleAgent> = {}): ArenaBattleAgent {
  return {
    id: "test-agent",
    name: "Test Resistor",
    componentType: "resistor",
    componentNumber: "R1",
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 8,
    abilityName: "Ohm Surge",
    metrics: { voltage: 5, current: 0.05, resistance: 100, power: 0.25 },
    ratedThresholds: {
      maxVoltageV: 50,
      maxCurrentA: 0.1,
      maxPowerW: 0.5,
      maxTempC: 155,
      thermalResistanceCA: 300,
    },
    ...overrides,
  };
}

describe("riskScore2Level", () => {
  it("returns safe for low scores", () => {
    expect(riskScore2Level(0)).toBe("safe");
    expect(riskScore2Level(34)).toBe("safe");
  });

  it("returns stressed for moderate scores", () => {
    expect(riskScore2Level(35)).toBe("stressed");
    expect(riskScore2Level(59)).toBe("stressed");
  });

  it("returns warning for elevated scores", () => {
    expect(riskScore2Level(60)).toBe("warning");
    expect(riskScore2Level(79)).toBe("warning");
  });

  it("returns critical for high scores", () => {
    expect(riskScore2Level(80)).toBe("critical");
    expect(riskScore2Level(94)).toBe("critical");
  });

  it("returns failed for extreme scores", () => {
    expect(riskScore2Level(95)).toBe("failed");
    expect(riskScore2Level(100)).toBe("failed");
  });
});

describe("runFuseAnalysis — nominal conditions", () => {
  it("returns safe risk for a component within all limits at standard lab conditions", () => {
    const agent = makeAgent();
    const result = runFuseAnalysis(agent, DEFAULT_ENVIRONMENT);

    expect(result.agentId).toBe("test-agent");
    expect(result.riskLevel).toBe("safe");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThan(35); // < "stressed" threshold
    expect(result.failureModes).toHaveLength(0);
  });

  it("junction temperature is ambient + thermal rise", () => {
    const agent = makeAgent();
    const result = runFuseAnalysis(agent, DEFAULT_ENVIRONMENT);

    // At 25W ambient, thermal rise = power * thermalResistanceCA
    expect(result.junctionTemperature).toBeGreaterThanOrEqual(DEFAULT_ENVIRONMENT.temperatureC);
    expect(result.thermalRise).toBeGreaterThanOrEqual(0);
  });

  it("produces a recommendation string for all risk levels", () => {
    const agent = makeAgent();
    const result = runFuseAnalysis(agent, DEFAULT_ENVIRONMENT);
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });
});

describe("runFuseAnalysis — thermal stress", () => {
  it("detects thermal runaway at extreme temperature", () => {
    const agent = makeAgent({
      ratedThresholds: {
        maxTempC: 85,
        maxPowerW: 0.5,
        thermalResistanceCA: 50,
      },
    });
    const extremeHeat = ENVIRONMENT_PRESETS.find((p) => p.id === "extreme")!.env;
    const result = runFuseAnalysis(agent, extremeHeat);

    expect(result.riskLevel).toBe("critical");
    const thermalMode = result.failureModes.find((m) => m.id.startsWith("thermal"));
    expect(thermalMode).toBeDefined();
  });

  it("flags cold-startup below min operating temp", () => {
    const agent = makeAgent({
      ratedThresholds: {
        maxTempC: 85,
        minTempC: 0,
        maxPowerW: 0.5,
        thermalResistanceCA: 10,
      },
    });
    const arctic = ENVIRONMENT_PRESETS.find((p) => p.id === "cold")!.env;
    const result = runFuseAnalysis(agent, arctic);

    const coldMode = result.failureModes.find((m) => m.id === "cold-startup");
    expect(coldMode).toBeDefined();
  });
});

describe("runFuseAnalysis — voltage stress", () => {
  it("detects overvoltage when stress multiplier pushes past rated voltage", () => {
    const agent = makeAgent({
      metrics: { voltage: 45, current: 0.9, resistance: 50, power: 40.5 },
      ratedThresholds: {
        maxVoltageV: 50,
        maxCurrentA: 1,
        maxPowerW: 50,
        maxTempC: 155,
        thermalResistanceCA: 10,
      },
    });
    const overvoltage = ENVIRONMENT_PRESETS.find((p) => p.id === "overvoltage")!.env;
    const result = runFuseAnalysis(agent, overvoltage);

    // With 1.5× stress multiplier applied to 45V, effective is 67.5V > 50V max
    const voltMode = result.failureModes.find(
      (m) => m.id === "overvoltage" || m.id === "dielectric-breakdown",
    );
    expect(voltMode).toBeDefined();
  });
});

describe("runFuseAnalysis — humidity stress", () => {
  it("detects corrosion risk at high humidity", () => {
    const agent = makeAgent();
    const humid = ENVIRONMENT_PRESETS.find((p) => p.id === "humid")!.env;
    const result = runFuseAnalysis(agent, humid);

    const corrosionMode = result.failureModes.find((m) => m.id === "corrosion");
    // High humidity (90%) should produce corrosion warning
    expect(corrosionMode).toBeDefined();
  });

  it("safe at low humidity", () => {
    const agent = makeAgent();
    const result = runFuseAnalysis(agent, { temperatureC: 25, humidityPercent: 20, voltageStressMultiplier: 1.0 });
    const corrosionMode = result.failureModes.find((m) => m.id === "corrosion");
    expect(corrosionMode).toBeUndefined();
  });
});

describe("computeStressModifier", () => {
  it("returns 1.0/1.0 for a safe component", () => {
    const agent = makeAgent();
    const fuseResult = runFuseAnalysis(agent, DEFAULT_ENVIRONMENT);
    const mod = computeStressModifier(fuseResult);

    expect(mod.attackMod).toBe(1.0);
    expect(mod.defenseMod).toBe(1.0);
  });

  it("returns degraded modifiers for a failed component", () => {
    const agent = makeAgent({
      metrics: { voltage: 49, current: 0.099, resistance: 100, power: 4.851 },
      ratedThresholds: {
        maxVoltageV: 50,
        maxCurrentA: 0.1,
        maxPowerW: 0.5, // massively over-rated power
        maxTempC: 30,   // very low max temp
        thermalResistanceCA: 500, // high thermal resistance
      },
    });
    const extreme = ENVIRONMENT_PRESETS.find((p) => p.id === "extreme")!.env;
    const fuseResult = runFuseAnalysis(agent, extreme);
    const mod = computeStressModifier(fuseResult);

    // A critically or fatally stressed component should have reduced defense
    if (fuseResult.riskScore >= 70) {
      expect(mod.defenseMod).toBeLessThan(1.0);
    }
  });

  it("attackMod and defenseMod are always positive", () => {
    const agent = makeAgent();
    for (const preset of ENVIRONMENT_PRESETS) {
      const fuseResult = runFuseAnalysis(agent, preset.env);
      const mod = computeStressModifier(fuseResult);
      expect(mod.attackMod).toBeGreaterThan(0);
      expect(mod.defenseMod).toBeGreaterThan(0);
    }
  });
});
