/**
 * Environmental scenarios for the Arena bench.
 *
 * Real electronics live or die by their environment, not just their ratings. A
 * resistor that shrugs off 4× load on a 25°C bench can cook in a 90°C engine bay,
 * and a part that vents in a desert may hold in vacuum where there's nothing to
 * convect heat away *to* — except that vacuum ALSO removes the convection that
 * normally cools it. Each scenario re-tunes the physics the stress test runs:
 *
 *  - `ambientC`       starting/soak temperature — sets the thermal headroom.
 *  - `convectionMul`  multiplies every part's thermal resistance. >1 = worse
 *                     cooling (still air, vacuum); <1 = forced air / cold plate.
 *  - `stressMax`      peak of the load ramp (× nominal).
 *  - `rampMs`         how fast the ramp climbs to that peak.
 *  - `vibration`      0–1 mechanical-stress factor that derates ratings and
 *                     adds wear, modelling solder-joint / lead fatigue.
 *
 * The scenario is threaded through `stressFactorAt` / `evaluateStress`, so the
 * SAME F.U.S.E. engine reports environment-aware failures.
 */

import type { ArenaEnvironment } from "./types";

export type ArenaScenario = {
  id: string;
  name: string;
  /** One-line environmental description shown under the selector. */
  tagline: string;
  icon: string;
  /** UI accent for the scenario chip and scene tint. */
  accent: string;
  ambientC: number;
  /**
   * Relative humidity, %. Read by F.U.S.E.'s risk analysis, which models
   * moisture ingress and lead corrosion against the IPC J-STD-033 Class 3
   * limit — a real failure mechanism that had nothing feeding it, so every
   * scenario looked equally dry no matter what it was meant to be.
   */
  humidityPercent: number;
  convectionMul: number;
  stressMax: number;
  rampMs: number;
  vibration: number;
  /** Subtle 3D-scene environment tint so the arena *looks* like the scenario. */
  scene: { fog: string; floor: string };
};

export const ARENA_SCENARIOS: ArenaScenario[] = [
  {
    id: "bench",
    name: "Lab Bench",
    tagline: "25°C still air — the reference run every datasheet is written for.",
    icon: "🔬",
    accent: "#38bdf8",
    ambientC: 25,
    humidityPercent: 45,
    convectionMul: 1,
    stressMax: 4,
    rampMs: 18000,
    vibration: 0,
    scene: { fog: "#0b1220", floor: "#0e1726" },
  },
  {
    id: "desert",
    name: "Desert Heat",
    tagline: "55°C ambient — half the thermal headroom is gone before you start.",
    icon: "🏜️",
    accent: "#f59e0b",
    ambientC: 55,
    humidityPercent: 15,
    convectionMul: 1.12,
    stressMax: 4,
    rampMs: 16000,
    vibration: 0.04,
    scene: { fog: "#1a1206", floor: "#241803" },
  },
  {
    id: "arctic",
    name: "Arctic Cold",
    tagline: "−20°C — huge thermal margin, but brittle leads and a harder push.",
    icon: "❄️",
    accent: "#7dd3fc",
    ambientC: -20,
    humidityPercent: 65,
    convectionMul: 0.88,
    stressMax: 4.5,
    rampMs: 16000,
    vibration: 0.08,
    scene: { fog: "#06141f", floor: "#0a1c2b" },
  },
  {
    id: "vacuum",
    name: "Orbit / Vacuum",
    tagline: "No air to convect — heat has nowhere to go and parts soak hot.",
    icon: "🛰️",
    accent: "#a78bfa",
    ambientC: 30,
    humidityPercent: 0,
    convectionMul: 1.85,
    stressMax: 4,
    rampMs: 20000,
    vibration: 0,
    scene: { fog: "#080612", floor: "#120a22" },
  },
  {
    id: "enginebay",
    name: "Engine Bay",
    tagline: "90°C and constant vibration — thermal soak meets mechanical fatigue.",
    icon: "🔥",
    accent: "#ef4444",
    ambientC: 90,
    humidityPercent: 35,
    convectionMul: 1.18,
    stressMax: 4,
    rampMs: 15000,
    vibration: 0.28,
    scene: { fog: "#1c0a06", floor: "#260c05" },
  },
  {
    id: "surge",
    name: "Overvolt Surge",
    tagline: "Fast ramp to 6× — a brutal transient that finds the weakest part first.",
    icon: "⚡",
    accent: "#fde047",
    ambientC: 25,
    humidityPercent: 45,
    convectionMul: 1,
    stressMax: 6,
    rampMs: 11000,
    vibration: 0,
    scene: { fog: "#16130a", floor: "#1f1a08" },
  },
];

export const DEFAULT_SCENARIO = ARENA_SCENARIOS[0];

export function getScenario(id: string | null | undefined): ArenaScenario {
  return ARENA_SCENARIOS.find((scenario) => scenario.id === id) ?? DEFAULT_SCENARIO;
}

/**
 * A scenario as an environment F.U.S.E.'s risk analysis can read.
 *
 * The two describe the same conditions in different vocabularies — a scenario
 * is what the bench simulates, an environment is what the engine analyses — and
 * this is the one place they are reconciled, so they cannot disagree about what
 * "Engine Bay" means.
 *
 * `load` becomes the voltage stress multiplier because that is exactly what the
 * bench's ramp does: it drives the rail above nominal. Passing 1 asks the
 * engine the question the bench asks before it starts — "how is this part doing
 * at its rated conditions, here?" — and passing the scenario's peak asks what
 * the run is going to do to it.
 */
export function environmentFor(
  scenario: ArenaScenario,
  load = 1,
): ArenaEnvironment {
  return {
    name: scenario.name,
    temperatureC: scenario.ambientC,
    humidityPercent: scenario.humidityPercent,
    voltageStressMultiplier: load,
  };
}
