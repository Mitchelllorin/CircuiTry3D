import { describe, expect, it } from "vitest";
import {
  builderTypeFor,
  getManufacturerCatalogComponents,
  toWorkspaceProperties,
} from "../src/data/componentCatalog";

const TE_PRODUCT_URLS = {
  "282104-1": "https://www.te.com/usa-en/product-282104-1.html",
  "1-967325-1": "https://www.te.com/usa-en/product-1-967325-1.html",
  "1-480424-0": "https://www.te.com/usa-en/product-1-480424-0.html",
  "796635-2": "https://www.te.com/usa-en/product-796635-2.html",
  "V23074-A1001-A403": "https://www.te.com/usa-en/product-V23074-A1001-A403.html",
  "T9AS1D22-12": "https://www.te.com/usa-en/product-T9AS1D22-12.html",
  EV200AAANA: "https://www.te.com/usa-en/product-EV200AAANA.html",
  "MS4525DO-DS5AI001DP":
    "https://www.te.com/usa-en/product-MS4525DO-DS5AI001DP.html",
  TSYS01: "https://www.te.com/usa-en/product-TSYS01.html",
  HTU31D: "https://www.te.com/usa-en/product-HTU31D.html",
  RXEF050: "https://www.te.com/usa-en/product-RXEF050.html",
} as const;

const LITTELFUSE_PRODUCT_URLS = {
  "0218.250MXP":
    "https://www.littelfuse.com/products/fuses-overcurrent-protection/fuses/cartridge-fuses/5x20mm-fuses-cartridge-fuses/218/0218-250",
  "1812L110/16DR":
    "https://www.littelfuse.com/assetdocs/resettable-ptcs-1812l-datasheet?assetguid=ca5c80cb-504e-4a8a-8e74-0107520a1717",
  "SMF5.0A":
    "https://www.littelfuse.com/products/overvoltage-protection/tvs-diodes/surface-mount/smf/smf5-0a",
  SMBJ24A:
    "https://www.littelfuse.com/products/overvoltage-protection/tvs-diodes/surface-mount/smbj/smbj24a",
  SP0502BAHTG:
    "https://www.littelfuse.com/assetdocs/tvs-diode-array-spasp050xba-lead-freegreen-datasheet?assetguid=15a03de1-f0c6-457a-95f1-55d449fdd756",
  V14E275P:
    "https://www.littelfuse.com/products/overvoltage-protection/varistors/radial-leaded-varistors/ultramov/v14e275p",
} as const;

const VISHAY_PRODUCT_URLS = {
  "1N4148W-E3-08": "https://www.vishay.com/docs/86356/1n4148w.pdf",
  "SS14-E3/61T": "https://www.vishay.com/doc/?88746",
  "SMAJ5.0A-E3/61": "https://www.vishay.com/docs/88390/smaj50a.pdf",
  CRCW060310K0FKEA: "https://www.vishay.com/docs/28773/crcwce3.pdf",
  VJ0603Y104KXXAT: "https://www.vishay.com/en/product/45199/",
  IHLP2525CZER100M01: "https://www.vishay.com/docs/34335/ihlp-2525cz-5a.pdf",
  SiSS52DN: "https://www.vishay.com/docs/79977/siss52dn.pdf",
} as const;

function sourceUrlsFor(manufacturer: string): Record<string, string | undefined> {
  return Object.fromEntries(
    getManufacturerCatalogComponents(manufacturer)
      .filter((entry) => entry.source)
      .map((entry) => [entry.partNumber, entry.source?.url]),
  );
}

describe("TE Connectivity manufacturer catalog", () => {
  const entries = getManufacturerCatalogComponents("TE Connectivity");

  it("preserves the eleven official product-page sources", () => {
    expect(entries).toHaveLength(11);
    expect(sourceUrlsFor("TE Connectivity")).toEqual(TE_PRODUCT_URLS);
  });

  it("only offers families with an existing, explicitly generic model", () => {
    const modeled = entries.filter((entry) => entry.simulation?.status === "modeled");
    expect(modeled.map((entry) => entry.partNumber)).toEqual([
      "V23074-A1001-A403",
      "T9AS1D22-12",
    ]);
    expect(modeled.map(builderTypeFor)).toEqual(["relay", "relay"]);
    expect(modeled.map(toWorkspaceProperties)).toEqual([
      { coilVoltage: 12 },
      { coilVoltage: 12 },
    ]);
  });

  it("keeps unsupported electrical behavior out of the builder", () => {
    const referenceOnly = entries.filter(
      (entry) => entry.simulation?.status === "reference-only",
    );
    expect(referenceOnly).toHaveLength(9);
    expect(referenceOnly.every((entry) => builderTypeFor(entry) === null)).toBe(true);
  });
});

describe("Littelfuse and Vishay manufacturer catalogs", () => {
  it("preserves official provenance for every added product", () => {
    expect(sourceUrlsFor("Littelfuse")).toEqual(LITTELFUSE_PRODUCT_URLS);
    expect(sourceUrlsFor("Vishay")).toEqual(VISHAY_PRODUCT_URLS);
  });

  it("keeps transient and resettable protection reference-only", () => {
    const protection = getManufacturerCatalogComponents("Littelfuse").filter(
      (entry) => entry.source && entry.partNumber !== "0218.250MXP",
    );
    expect(protection.every((entry) => builderTypeFor(entry) === null)).toBe(true);
  });

  it("maps only supported Vishay families to existing Builder parts", () => {
    const modeled = getManufacturerCatalogComponents("Vishay").filter(
      (entry) => entry.source && entry.simulation?.status === "modeled",
    );
    expect(modeled.map(builderTypeFor)).toEqual([
      "diode",
      "diode",
      "resistor",
      "capacitor",
      "inductor",
      "mosfet",
    ]);
  });
});
