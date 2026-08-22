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

describe("TE Connectivity manufacturer catalog", () => {
  const entries = getManufacturerCatalogComponents("TE Connectivity");

  it("preserves the eleven official product-page sources", () => {
    expect(entries).toHaveLength(11);
    expect(
      Object.fromEntries(
        entries.map((entry) => [entry.partNumber, entry.source?.url]),
      ),
    ).toEqual(TE_PRODUCT_URLS);
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
