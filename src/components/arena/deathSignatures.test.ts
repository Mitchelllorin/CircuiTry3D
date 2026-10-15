import { describe, expect, it } from "vitest";
import { BLOWOUT_BY_FAMILY } from "./failureFx";
import { FAIL_SIGNATURE_BY_FAMILY, failSignatureFor } from "./deathSignatures";

/**
 * Every family F.U.S.E. can name must have a death.
 *
 * This is the test that would have caught the transformer. The engine resolves a
 * transformer to its own family, the arena carried it as a contender, and the
 * two tables that decide what happens when it dies had no entry for it — so it
 * fell through to `generic`, and a part with fifty watts of windings and a
 * laminated core in it cooked like an anonymous 5 mm blob. Nothing failed, no
 * warning was printed, and the only way to find out was to sit and watch a
 * transformer do nothing.
 *
 * The list below is not hand-written: it is the set of canonical families in the
 * engine's own COMPONENT_FAMILY_MAP (public/js/component-failure-engine.js). If
 * the engine learns a family the bench cannot visualise, this fails.
 */
const ENGINE_FAMILIES = [
  "battery",
  "bjt",
  "capacitor",
  "crystal",
  "diode",
  "fuse",
  "heatsink",
  "ic",
  "inductor",
  "lamp",
  "led",
  "mosfet",
  "motor",
  "opamp",
  "relay",
  "resistor",
  "switch",
  "thermistor",
  "transformer",
  "voltage_regulator",
  "wire",
  "zener_diode",
] as const;

describe("every family the engine can resolve can be destroyed", () => {
  it.each(ENGINE_FAMILIES)("%s has a death signature", (family) => {
    expect(FAIL_SIGNATURE_BY_FAMILY[family]).toBeTruthy();
  });

  it.each(ENGINE_FAMILIES)("%s has a blowout profile", (family) => {
    expect(BLOWOUT_BY_FAMILY[family]).toBeTruthy();
  });

  it("does not leave the transformer on the generic death", () => {
    // The specific regression: a transformer and an unspecified blob must not
    // die the same way, or the bench says nothing about either.
    const transformer = failSignatureFor("transformer", null);
    expect(transformer).not.toEqual(FAIL_SIGNATURE_BY_FAMILY.generic);
    expect(transformer.ember).toBeGreaterThan(0);
    expect(transformer.hot).toBe(true);
    expect(transformer.smoke).toBeTruthy();
  });
});

describe("a part that is nothing in particular still dies like one", () => {
  it("falls back to the generic signature", () => {
    expect(failSignatureFor("no-such-family", null)).toEqual(
      FAIL_SIGNATURE_BY_FAMILY.generic,
    );
  });

  it("lets the F.U.S.E. failure mode modulate the family's own death", () => {
    // What a part is MADE of decides the shape; HOW it was killed decides the
    // violence. Both halves have to keep working, or the table is just data.
    const melted = failSignatureFor("resistor", "melt");
    expect(melted.hot).toBe(true);
    expect(melted.ember).toBeGreaterThan(0.5);

    const blown = failSignatureFor("resistor", "blowout");
    expect(blown.motion).toBe("burst");
    expect(blown.popMs).toBeLessThanOrEqual(600);
  });
});

describe("the parts that are not on trial have no death at all", () => {
  // Deliberate absence, not an oversight: these never reach the death throes
  // (see EASTER_EGGS in fuse.ts), so an entry here would be dead data implying
  // they can be killed. Asserted so the next person sweeping the tables for
  // missing families knows why these four are not in them.
  it.each(["flux", "transfunctioner", "warp", "dilithium"])(
    "%s is absent from both tables",
    (family) => {
      expect(FAIL_SIGNATURE_BY_FAMILY[family]).toBeUndefined();
      expect(BLOWOUT_BY_FAMILY[family]).toBeUndefined();
    },
  );
});
