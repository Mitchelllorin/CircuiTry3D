import { describe, expect, it } from "vitest";
import { getComponentComposition } from "../../data/componentCompositions";
import { detectFailure, resolveFamily } from "./fuse";
import {
  createInternalsReveal,
  failedInternal,
  hasModelledInternals,
} from "./componentInternals";

/**
 * What is actually inside each part, and which parts cannot die.
 *
 * Neither is visible in a diff or a screenshot: whether a family has a modelled
 * interior at all (as opposed to the generic torn cavity), and whether the
 * easter egg really is immortal. Both used to be wrong in a way no type would
 * catch — a family with a blowout profile but no interior opens onto a hole,
 * and a part with no failure path still has to be RESOLVED to its own family,
 * or it gets the generic thermal model and quietly cooks like a resistor.
 */

const INTERIOR_FAMILIES = [
  "resistor",
  "capacitor",
  "led",
  "diode",
  "bjt",
  "mosfet",
  "battery",
  "switch",
  "fuse",
  "lamp",
  "relay",
  "inductor",
  "transformer",
];

describe("modelled interiors", () => {
  it.each(INTERIOR_FAMILIES)("%s has an interior to open", (family) => {
    expect(hasModelledInternals(family)).toBe(true);
  });

  it("resolves a transformer to the inductor composition", () => {
    // Two windings on one core IS the inductor's composition; without the
    // alias the family had no layers, so its reveal had nothing to build and
    // the part opened onto an empty shell.
    const comp = getComponentComposition("transformer");
    expect(comp).toBeTruthy();
    expect(comp?.internalLayers.length).toBeGreaterThan(0);
    expect(comp?.subComponents.some((sub) => sub.isCritical)).toBe(true);
  });

  it("names the critical sub-component a transformer's failure is", () => {
    const internal = failedInternal("transformer");
    expect(internal?.name).toBeTruthy();
    expect(internal?.limitC).toBeGreaterThan(0);
  });

  it("has no interior for a family nobody has specified", () => {
    // The generic fallback is only honest while it is still a FALLBACK: a
    // family with no composition must keep the wound rather than build an
    // empty interior, which would open onto nothing at all.
    expect(hasModelledInternals("generic")).toBe(false);
    expect(hasModelledInternals("not-a-real-family")).toBe(false);
  });

  it("returns null rather than throwing for a family with no composition", () => {
    const three = { Group: class {} } as never;
    expect(createInternalsReveal(three, "not-a-real-family", null)).toBeNull();
  });
});

describe("the flux capacitor", () => {
  const component = {
    type: "flux-capacitor",
    properties: { builderType: "flux-capacitor" },
  };
  const overloaded = {
    powerDissipation: 5000,
    currentRms: 400,
    operatingVoltage: 400,
    thermalRise: 4000,
  };

  it("resolves to its own family, not the generic profile", () => {
    expect(resolveFamily("flux-capacitor")).toBe("flux");
  });

  it("survives an overload that destroys everything else", () => {
    const result = detectFailure(component, overloaded);
    expect(result.failed).toBe(false);
    expect(result.severity).toBe(0);
    expect(result.name).toContain("1.21");
  });

  it("still destroys a resistor under the same load", () => {
    // The control: the bench has not simply stopped reporting failures.
    const result = detectFailure(
      { type: "resistor", properties: { powerRating: 0.25 } },
      overloaded,
    );
    expect(result.failed).toBe(true);
  });
});

/**
 * The rest of the shelf.
 *
 * Same easter egg, three more shapes: whatever the bench does to them, they
 * answer with a number and a line of prose instead of a failure. Each one is
 * asserted on its OWN family — resolving to `generic` would mean the part is
 * being measured against a 0.25 W profile it has nothing to do with, which is
 * exactly how the flux capacitor used to end up looking like a resistor.
 */
describe("the other easter eggs", () => {
  const cases = [
    ["continuum-transfunctioner", "transfunctioner", "Transfunction"],
    ["warp-drive", "warp", "Warp"],
    ["dilithium-crystal", "dilithium", "Dilithium"],
  ] as const;

  const overloaded = {
    powerDissipation: 5000,
    currentRms: 400,
    operatingVoltage: 400,
    thermalRise: 4000,
  };

  it.each(cases)("%s resolves to its own family", (type, family) => {
    expect(resolveFamily(type)).toBe(family);
  });

  it.each(cases)("%s survives an overload", (type, _family, name) => {
    const result = detectFailure(
      { type, properties: { builderType: type } },
      overloaded,
    );
    expect(result.failed).toBe(false);
    expect(result.severity).toBe(0);
    expect(result.name).toContain(name);
  });

  it.each(cases)("%s opens onto no interior — deliberately", (type) => {
    // There is nothing inside them to model, and inventing a cutaway would be
    // pretending the bench knows how a warp nacelle is built.
    expect(hasModelledInternals(resolveFamily(type))).toBe(false);
  });
});
