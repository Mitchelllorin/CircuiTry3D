import { describe, expect, it } from "vitest";
import { detectFailure, familyThermal } from "./fuse";

const atTemp = (tempC: number) => ({
  powerDissipation: 0,
  currentRms: 0,
  operatingVoltage: 0,
  thermalRise: tempC - 25,
  ambientTemperature: 25,
});

describe("familyThermal honours the part's own maxTempC", () => {
  it("uses the family limit when the part carries none", () => {
    expect(familyThermal("mosfet")).toEqual({ junctionLimitC: 175, absoluteMaxTempC: 200 });
    expect(familyThermal("mosfet", { vds_max: 30 })).toEqual({ junctionLimitC: 175, absoluteMaxTempC: 200 });
  });

  it("takes the datasheet TJ max and keeps the family's margin above it", () => {
    expect(familyThermal("mosfet", { maxTempC: 150 })).toEqual({ junctionLimitC: 150, absoluteMaxTempC: 175 });
  });

  it("ignores a maxTempC that is not a usable number", () => {
    expect(familyThermal("mosfet", { maxTempC: "150" })).toEqual({ junctionLimitC: 175, absoluteMaxTempC: 200 });
    expect(familyThermal("mosfet", { maxTempC: 0 })).toEqual({ junctionLimitC: 175, absoluteMaxTempC: 200 });
  });
});

describe("local overtemp check uses the part's limit", () => {
  it("a 150 °C MOSFET at 160 °C is over temperature; a family-default one is not", () => {
    const rated150 = detectFailure({ type: "mosfet", properties: { maxTempC: 150 } }, atTemp(160));
    expect(rated150.name).toBe("Temperature Limit Exceeded");

    const familyDefault = detectFailure({ type: "mosfet", properties: {} }, atTemp(160));
    expect(familyDefault.severity).toBe(0);
  });
});
