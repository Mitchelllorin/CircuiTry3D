import { describe, expect, it } from "vitest";
import {
  ARENA_SCENARIOS,
  environmentFor,
  getScenario,
} from "../src/components/arena/scenarios";
import { runFuseAnalysis, riskScore2Level } from "../src/components/arena/fuseEngine";
import { buildArenaRoster } from "../src/components/arena/arenaData";

/**
 * F.U.S.E.'s risk model was a complete module wired to nothing. These cover the
 * connection itself — that a scenario really does reach the engine as an
 * environment, and that the engine answers differently when the environment
 * differs, which is the only thing that makes the reading worth showing.
 */
describe("F.U.S.E. pre-run risk", () => {
  const roster = buildArenaRoster(null);

  it("gives every scenario the humidity the engine needs", () => {
    for (const scenario of ARENA_SCENARIOS) {
      expect(scenario.humidityPercent, `${scenario.id} humidity`).toBeGreaterThanOrEqual(0);
      expect(scenario.humidityPercent, `${scenario.id} humidity`).toBeLessThanOrEqual(100);
    }
    // Vacuum has no atmosphere, so it cannot have humidity — if this ever
    // drifts off zero the scenario has stopped meaning what it says.
    expect(getScenario("vacuum").humidityPercent).toBe(0);
  });

  it("carries the scenario's real conditions into the environment", () => {
    const engineBay = getScenario("enginebay");
    const environment = environmentFor(engineBay);
    expect(environment.temperatureC).toBe(engineBay.ambientC);
    expect(environment.humidityPercent).toBe(engineBay.humidityPercent);
    // Nominal by default — the forecast must not silently analyse at the
    // overload the run is about to apply, or it reports the outcome.
    expect(environment.voltageStressMultiplier).toBe(1);
    expect(environmentFor(engineBay, 3).voltageStressMultiplier).toBe(3);
  });

  it("rates the same part as more at risk in a hotter environment", () => {
    const part = roster[0];
    expect(part).toBeDefined();
    const onTheBench = runFuseAnalysis(part, environmentFor(getScenario("bench")));
    const inAnEngineBay = runFuseAnalysis(part, environmentFor(getScenario("enginebay")));
    // 90°C ambient eats thermal headroom the 25°C bench leaves intact. If these
    // ever come out equal, the environment is not reaching the engine.
    expect(inAnEngineBay.junctionTemperature).toBeGreaterThan(
      onTheBench.junctionTemperature,
    );
    expect(inAnEngineBay.riskScore).toBeGreaterThan(onTheBench.riskScore);
  });

  it("always produces a reading a human can act on", () => {
    for (const scenario of ARENA_SCENARIOS) {
      for (const part of roster) {
        const result = runFuseAnalysis(part, environmentFor(scenario));
        expect(Number.isFinite(result.riskScore)).toBe(true);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
        expect(result.riskLevel).toBe(riskScore2Level(result.riskScore));
        // A risk score with no sentence attached is a number with no reference.
        expect(result.recommendation.length).toBeGreaterThan(0);
        expect(result.recommendation).toContain(part.name);
        expect(result.agentId).toBe(part.id);
      }
    }
  });
});
