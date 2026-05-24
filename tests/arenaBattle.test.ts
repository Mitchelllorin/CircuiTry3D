import { describe, expect, it } from "vitest";
import { computeDamage } from "../src/components/arena/battleMath";
import { buildArenaRoster } from "../src/components/arena/arenaData";
import { coerceArenaPayload } from "../src/components/arena/arenaStorage";

describe("arena battle helpers", () => {
  it("builds agents whose resistance increases defense", () => {
    const roster = buildArenaRoster({
      sessionName: "Test Session",
      components: [
        {
          id: "r-low",
          name: "Low Shield Resistor",
          type: "resistor",
          properties: { resistance: 12, voltage: 9, current: 0.2, power: 0.3 },
        },
        {
          id: "r-high",
          name: "High Shield Resistor",
          type: "resistor",
          properties: { resistance: 1200, voltage: 9, current: 0.2, power: 0.3 },
        },
      ],
    });

    expect(roster).toHaveLength(2);
    expect(roster[1]?.defense).toBeGreaterThan(roster[0]?.defense ?? 0);
  });

  it("reduces damage against higher-resistance defenders", () => {
    const [attacker, lightlyShielded, heavilyShielded] = buildArenaRoster({
      components: [
        {
          id: "led-1",
          name: "Attacker",
          type: "led",
          properties: { forwardVoltage: 3, current: 1.2, power: 5 },
        },
        {
          id: "target-1",
          name: "Low Shield",
          type: "resistor",
          properties: { resistance: 8, voltage: 5, current: 0.2 },
        },
        {
          id: "target-2",
          name: "High Shield",
          type: "resistor",
          properties: { resistance: 3200, voltage: 5, current: 0.2 },
        },
      ],
    });

    const lowShieldDamage = computeDamage(attacker!, lightlyShielded!, 0.25);
    const highShieldDamage = computeDamage(attacker!, heavilyShielded!, 0.25);

    expect(highShieldDamage).toBeLessThan(lowShieldDamage);
  });

  it("coerces legacy storage payloads into arena session payloads", () => {
    const payload = coerceArenaPayload({
      label: "Legacy Export",
      metrics: {
        voltage: 12,
        current: 1,
        resistance: 24,
        power: 12,
      },
      state: {
        components: [{ id: "c-1", name: "Cap", type: "capacitor", properties: {} }],
      },
    });

    expect(payload?.sessionName).toBe("Legacy Export");
    expect(payload?.components).toHaveLength(1);
    expect(payload?.analysis?.basic?.resistance).toBe(24);
  });
});
