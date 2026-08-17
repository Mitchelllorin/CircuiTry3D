import { describe, expect, it } from "vitest";
import { BLOWOUT_BY_FAMILY, blowoutFor } from "../src/components/arena/failureFx";

/**
 * The blowout table is DATA that decides how each component dies. A missing or
 * malformed entry doesn't throw — it silently falls through to `generic`, and
 * the symptom is "every part on the bench blows up the same way", which is
 * exactly the thing this system exists to stop. So the table is tested.
 *
 * The rendering itself needs a WebGL context and isn't covered here; what is
 * covered is every decision made before a single sprite is created.
 */
describe("blowout signatures", () => {
  const families = Object.keys(BLOWOUT_BY_FAMILY);

  it("gives every family a physically coherent event", () => {
    for (const family of families) {
      const spec = BLOWOUT_BY_FAMILY[family];
      expect(spec.shards, `${family} shards`).toBeGreaterThanOrEqual(0);
      expect(spec.sparks, `${family} sparks`).toBeGreaterThanOrEqual(0);
      expect(spec.flameMs, `${family} flameMs`).toBeGreaterThanOrEqual(0);
      expect(spec.scorch, `${family} scorch`).toBeGreaterThanOrEqual(0);
      // A family that throws fragments has to give them a size and a speed, or
      // it spawns zero-sized debris that never leaves the part.
      if (spec.shards > 0) {
        expect(spec.shardSize, `${family} shardSize`).toBeGreaterThan(0);
        expect(spec.shardSpeed, `${family} shardSpeed`).toBeGreaterThan(0);
      }
      // Same for fire: burning for a while at zero size is an invisible fire.
      if (spec.flameMs > 0) {
        expect(spec.flameSize, `${family} flameSize`).toBeGreaterThan(0);
      }
      if (spec.sparks > 0) {
        expect(spec.sparkSpeed, `${family} sparkSpeed`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the quiet deaths quiet", () => {
    // These three fail by simply going open circuit. If they ever start
    // throwing shrapnel or catching fire, the bench has lost the distinction
    // between a part that failed and a part that was destroyed — and a fuse
    // that threw shrapnel would be a failed fuse.
    for (const family of ["led", "fuse", "lamp"]) {
      const spec = BLOWOUT_BY_FAMILY[family];
      expect(spec.shards, `${family} must not fragment`).toBe(0);
      expect(spec.flameMs, `${family} must not burn`).toBe(0);
      expect(spec.rupture, `${family} package must stay closed`).toBe(0);
    }
    // A switch's body is undamaged — only its contacts arc.
    expect(BLOWOUT_BY_FAMILY.switch.shards).toBe(0);
    expect(BLOWOUT_BY_FAMILY.switch.flameMs).toBe(0);
    expect(BLOWOUT_BY_FAMILY.switch.rupture).toBe(0);
  });

  it("ejects nothing from a sealed package", () => {
    // Physical rule, not a style preference: an LED die cracks under its epoxy,
    // a fuse element vaporises inside its glass tube, a filament breaks inside
    // its envelope. Nothing gets out. Drawing sparks or debris for these would
    // be inventing a phenomenon that does not occur — and it would erase the
    // difference between a part that quietly opens and one that comes apart.
    for (const family of ["led", "fuse", "lamp"]) {
      const spec = BLOWOUT_BY_FAMILY[family];
      expect(spec.sparks, `${family} must eject nothing`).toBe(0);
      expect(spec.shards, `${family} must eject nothing`).toBe(0);
    }
  });

  it("only ruptures the families that actually come apart", () => {
    for (const family of Object.keys(BLOWOUT_BY_FAMILY)) {
      const spec = BLOWOUT_BY_FAMILY[family];
      expect(spec.rupture, `${family} rupture`).toBeGreaterThanOrEqual(0);
      expect(spec.rupture, `${family} rupture`).toBeLessThanOrEqual(1);
      // Anything that throws pieces of its own casing must visibly break open,
      // or the debris appears NEAR the part rather than out of it.
      if (spec.shards > 0) {
        expect(spec.rupture, `${family} sheds shards but never opens`).toBeGreaterThan(0);
      }
    }
    // Silicon splitting its package is the most violent non-battery event here.
    expect(BLOWOUT_BY_FAMILY.mosfet.rupture).toBe(1);
  });

  it("melting weeps open rather than bursting", () => {
    const melted = blowoutFor("mosfet", "melt");
    expect(melted.rupture).toBeLessThan(BLOWOUT_BY_FAMILY.mosfet.rupture);
    expect(melted.rupture).toBeGreaterThan(0);
  });

  it("a blowout opens a casing that normally stays shut", () => {
    // An LED never ruptures on its own, but one that is blown apart must.
    expect(BLOWOUT_BY_FAMILY.led.rupture).toBe(0);
    expect(blowoutFor("led", "blowout").rupture).toBeGreaterThan(0);
  });

  it("vents the canned parts upward and ruptures the moulded ones outward", () => {
    // An electrolytic and a cell have a scored vent: they fire out of the top.
    expect(BLOWOUT_BY_FAMILY.capacitor.vent).toBe("up");
    expect(BLOWOUT_BY_FAMILY.battery.vent).toBe("up");
    // An epoxy package has no vent, so it lets go wherever it is weakest.
    expect(BLOWOUT_BY_FAMILY.mosfet.vent).toBe("radial");
    expect(BLOWOUT_BY_FAMILY.resistor.vent).toBe("radial");
  });

  it("falls back to generic for a family it has never seen", () => {
    // Real branded parts will arrive as data with families this table predates.
    expect(blowoutFor("thermistor-from-a-vendor", null)).toEqual(
      BLOWOUT_BY_FAMILY.generic,
    );
  });

  it("melting throws nothing and burns longer", () => {
    const melted = blowoutFor("mosfet", "melt");
    expect(melted.shards).toBe(0);
    expect(melted.flameMs).toBeGreaterThan(BLOWOUT_BY_FAMILY.mosfet.flameMs);
  });

  it("a blowout is more violent than the same part's default death", () => {
    const base = BLOWOUT_BY_FAMILY.resistor;
    const blown = blowoutFor("resistor", "blowout");
    expect(blown.shards).toBeGreaterThan(base.shards);
    expect(blown.shardSpeed).toBeGreaterThan(base.shardSpeed);
    expect(blown.sparks).toBeGreaterThan(base.sparks);
    // Over sooner, though — it is a bang, not a slow cook.
    expect(blown.flameMs).toBeLessThan(base.flameMs);
  });

  it("gives a blowout of a non-fragmenting part real debris to throw", () => {
    // An LED that is blown apart rather than merely killed must not inherit the
    // LED's zero shard SIZE, or it throws fragments that cannot be seen.
    const blown = blowoutFor("led", "blowout");
    expect(blown.shards).toBeGreaterThan(0);
    expect(blown.shardSize).toBeGreaterThan(0);
    expect(blown.shardSpeed).toBeGreaterThan(0);
    expect(blown.flameSize).toBeGreaterThan(0);
  });
});
