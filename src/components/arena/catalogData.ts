/**
 * Branded component catalog.
 *
 * Real-world, manufacturer-branded components with accurate spec data,
 * rated thresholds, and FUSE-compatible thermal/electrical properties.
 * Manufacturers can extend this catalog by uploading their spec files.
 */

import type { CatalogComponent } from "./types";

export const CATALOG_COMPONENTS: CatalogComponent[] = [
  // ── Batteries ─────────────────────────────────────────────────────────────
  {
    id: "energizer-522-9v",
    manufacturer: "Energizer",
    name: "522 9V Alkaline",
    spec: "PP3 · 9V · 565mAh · alkaline",
    type: "battery",
    properties: { voltage: 9, internalResistance: 0.5, capacityMah: 565 },
    ratedThresholds: { maxVoltageV: 9, maxTempC: 54, minTempC: -18 },
  },
  {
    id: "duracell-mn1604-9v",
    manufacturer: "Duracell",
    name: "MN1604 9V",
    spec: "PP3 · 9V · 550mAh · alkaline",
    type: "battery",
    properties: { voltage: 9, internalResistance: 0.5, capacityMah: 550 },
    ratedThresholds: { maxVoltageV: 9, maxTempC: 54, minTempC: -18 },
  },
  {
    id: "panasonic-lr6-aa",
    manufacturer: "Panasonic",
    name: "LR6 AA Alkaline",
    spec: "AA · 1.5V · 2850mAh · alkaline",
    type: "battery",
    properties: { voltage: 1.5, internalResistance: 0.15, capacityMah: 2850 },
    ratedThresholds: { maxVoltageV: 1.65, maxTempC: 60, minTempC: -20 },
  },

  // ── Resistors ──────────────────────────────────────────────────────────────
  {
    id: "vishay-crcw0402-100r",
    manufacturer: "Vishay",
    name: "CRCW0402 100Ω",
    spec: "0402 · 100Ω · 1% · 63mW",
    type: "resistor",
    properties: { resistance: 100, powerRating: 0.063, tolerance: 0.01 },
    ratedThresholds: { maxPowerW: 0.063, maxTempC: 155, thermalResistanceCA: 300 },
  },
  {
    id: "vishay-crcw0603-330r",
    manufacturer: "Vishay",
    name: "CRCW0603 330Ω",
    spec: "0603 · 330Ω · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 330, powerRating: 0.1, tolerance: 0.01 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "vishay-crcw0603-1k",
    manufacturer: "Vishay",
    name: "CRCW0603 1kΩ",
    spec: "0603 · 1kΩ · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 1000, powerRating: 0.1, tolerance: 0.01 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "vishay-crcw0603-10k",
    manufacturer: "Vishay",
    name: "CRCW0603 10kΩ",
    spec: "0603 · 10kΩ · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 10000, powerRating: 0.1, tolerance: 0.01 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "yageo-cfr-1k",
    manufacturer: "Yageo",
    name: "CFR-25JB-52-1K",
    spec: "axial · 1kΩ · 5% · 250mW",
    type: "resistor",
    properties: { resistance: 1000, powerRating: 0.25, tolerance: 0.05 },
    ratedThresholds: { maxPowerW: 0.25, maxTempC: 155, thermalResistanceCA: 80 },
  },
  {
    id: "yageo-cfr-10k",
    manufacturer: "Yageo",
    name: "CFR-25JB-52-10K",
    spec: "axial · 10kΩ · 5% · 250mW",
    type: "resistor",
    properties: { resistance: 10000, powerRating: 0.25, tolerance: 0.05 },
    ratedThresholds: { maxPowerW: 0.25, maxTempC: 155, thermalResistanceCA: 80 },
  },
  {
    id: "bourns-cr0603-100k",
    manufacturer: "Bourns",
    name: "CR0603-FX-1003ELF",
    spec: "0603 · 100kΩ · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 100000, powerRating: 0.1, tolerance: 0.01 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },

  // ── Capacitors ────────────────────────────────────────────────────────────
  {
    id: "murata-gcj-1uf",
    manufacturer: "Murata",
    name: "GCJ316R71H105KA12D",
    spec: "0805 · 1µF · 50V · X7R",
    type: "capacitor",
    properties: { capacitance: 1e-6, maxVoltage: 50, esr: 0.05 },
    ratedThresholds: { maxVoltageV: 50, maxTempC: 125, thermalResistanceCA: 45 },
  },
  {
    id: "tdk-c3225x5r-10uf",
    manufacturer: "TDK",
    name: "C3225X5R1C106K",
    spec: "1210 · 10µF · 16V · X5R",
    type: "capacitor",
    properties: { capacitance: 10e-6, maxVoltage: 16, esr: 0.02 },
    ratedThresholds: { maxVoltageV: 16, maxTempC: 85, thermalResistanceCA: 40 },
  },
  {
    id: "panasonic-eeufm-100uf",
    manufacturer: "Panasonic",
    name: "EEU-FM1E101",
    spec: "radial · 100µF · 25V · 105°C",
    type: "capacitor",
    properties: { capacitance: 100e-6, maxVoltage: 25, esr: 0.3 },
    ratedThresholds: { maxVoltageV: 25, maxTempC: 105, thermalResistanceCA: 35 },
  },
  {
    id: "nichicon-ufw-470uf",
    manufacturer: "Nichicon",
    name: "UFW1C471MED",
    spec: "radial · 470µF · 16V · 105°C",
    type: "capacitor",
    properties: { capacitance: 470e-6, maxVoltage: 16, esr: 0.12 },
    ratedThresholds: { maxVoltageV: 16, maxTempC: 105, thermalResistanceCA: 28 },
  },

  // ── LEDs ──────────────────────────────────────────────────────────────────
  {
    id: "vishay-tlhr5400-red",
    manufacturer: "Vishay",
    name: "TLHR5400",
    spec: "T-1 3/4 · red · 2.0V · 20mA · 630nm",
    type: "led",
    properties: { forwardVoltage: 2.0, maxCurrent: 0.02, efficiency: 0.3 },
    ratedThresholds: { maxVoltageV: 2.6, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 120 },
  },
  {
    id: "wurth-led-green",
    manufacturer: "Würth Elektronik",
    name: "151031VS06000",
    spec: "SMD · green · 2.1V · 20mA · 525nm",
    type: "led",
    properties: { forwardVoltage: 2.1, maxCurrent: 0.02, efficiency: 0.35 },
    ratedThresholds: { maxVoltageV: 2.8, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 110 },
  },
  {
    id: "osram-lb-d47b-blue",
    manufacturer: "Osram",
    name: "LB D47B-R2T1-35",
    spec: "SMD · blue · 3.0V · 20mA · 470nm",
    type: "led",
    properties: { forwardVoltage: 3.0, maxCurrent: 0.02, efficiency: 0.33 },
    ratedThresholds: { maxVoltageV: 3.8, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 110 },
  },
  {
    id: "cree-c503b-wan-white",
    manufacturer: "Cree",
    name: "C503B-WAN-CB0F0251",
    spec: "T-1 3/4 · white · 3.2V · 20mA · 6000K",
    type: "led",
    properties: { forwardVoltage: 3.2, maxCurrent: 0.02, efficiency: 0.4 },
    ratedThresholds: { maxVoltageV: 4.0, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 100 },
  },
  {
    id: "lumileds-lxhl-mm01-yellow",
    manufacturer: "Lumileds",
    name: "LXHL-MM01 Yellow",
    spec: "T-1 3/4 · yellow · 2.1V · 20mA · 585nm",
    type: "led",
    properties: { forwardVoltage: 2.1, maxCurrent: 0.02, efficiency: 0.28 },
    ratedThresholds: { maxVoltageV: 2.8, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 115 },
  },

  // ── Diodes ────────────────────────────────────────────────────────────────
  {
    id: "on-semi-1n4148",
    manufacturer: "ON Semiconductor",
    name: "1N4148",
    spec: "DO-35 · 100V · 300mA · signal",
    type: "diode",
    properties: { forwardVoltage: 0.72, maxCurrent: 0.3, reverseVoltage: 100, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 0.3, maxPowerW: 0.5, maxTempC: 200, thermalResistanceCA: 250 },
  },
  {
    id: "on-semi-1n4007",
    manufacturer: "ON Semiconductor",
    name: "1N4007",
    spec: "DO-41 · 1000V · 1A · rectifier",
    type: "diode",
    properties: { forwardVoltage: 0.7, maxCurrent: 1, reverseVoltage: 1000, powerRating: 3 },
    ratedThresholds: { maxVoltageV: 1000, maxCurrentA: 1, maxPowerW: 3, maxTempC: 175, thermalResistanceCA: 60 },
  },
  {
    id: "nxp-bat43",
    manufacturer: "NXP",
    name: "BAT43",
    spec: "DO-35 · 30V · 200mA · Schottky",
    type: "diode",
    properties: { forwardVoltage: 0.25, maxCurrent: 0.2, reverseVoltage: 30, powerRating: 0.25 },
    ratedThresholds: { maxVoltageV: 30, maxCurrentA: 0.2, maxPowerW: 0.25, maxTempC: 150, thermalResistanceCA: 300 },
  },
  {
    id: "vishay-1n5819",
    manufacturer: "Vishay",
    name: "1N5819",
    spec: "DO-41 · 40V · 1A · Schottky",
    type: "diode",
    properties: { forwardVoltage: 0.34, maxCurrent: 1, reverseVoltage: 40, powerRating: 2.5 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1, maxPowerW: 2.5, maxTempC: 150, thermalResistanceCA: 50 },
  },

  // ── BJTs ──────────────────────────────────────────────────────────────────
  {
    id: "on-semi-2n2222a",
    manufacturer: "ON Semiconductor",
    name: "2N2222A",
    spec: "TO-18 · NPN · 40V · 600mA · 625mW",
    type: "bjt",
    properties: { vce_max: 40, ic_max: 0.6, hfe: 100, vbe: 0.7, powerRating: 0.625 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 0.6, maxPowerW: 0.625, maxTempC: 200, thermalResistanceCA: 200 },
  },
  {
    id: "on-semi-2n3904",
    manufacturer: "ON Semiconductor",
    name: "2N3904",
    spec: "TO-92 · NPN · 40V · 200mA",
    type: "bjt",
    properties: { vce_max: 40, ic_max: 0.2, hfe: 100, vbe: 0.65, powerRating: 0.625 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 0.2, maxPowerW: 0.625, maxTempC: 150, thermalResistanceCA: 200 },
  },
  {
    id: "stmicro-bc547",
    manufacturer: "STMicroelectronics",
    name: "BC547",
    spec: "TO-92 · NPN · 45V · 100mA · 500mW",
    type: "bjt",
    properties: { vce_max: 45, ic_max: 0.1, hfe: 110, vbe: 0.7, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 45, maxCurrentA: 0.1, maxPowerW: 0.5, maxTempC: 150, thermalResistanceCA: 250 },
  },
  {
    id: "on-semi-tip31c",
    manufacturer: "ON Semiconductor",
    name: "TIP31C",
    spec: "TO-220 · NPN · 100V · 3A · 40W",
    type: "bjt",
    properties: { vce_max: 100, ic_max: 3, hfe: 25, vbe: 0.7, powerRating: 40 },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 3, maxPowerW: 40, maxTempC: 150, thermalResistanceCA: 3.125 },
  },

  // ── MOSFETs ───────────────────────────────────────────────────────────────
  {
    id: "infineon-irf540n",
    manufacturer: "Infineon",
    name: "IRF540N",
    spec: "TO-220 · N-MOSFET · 100V · 33A",
    type: "mosfet",
    properties: { vth: 4, rds_on: 0.044, id_max: 33, vds_max: 100, vgs_max: 20, powerRating: 130 },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 33, maxPowerW: 130, maxTempC: 175, thermalResistanceCA: 0.92 },
  },
  {
    id: "vishay-si2302ads",
    manufacturer: "Vishay",
    name: "SI2302ADS",
    spec: "SOT-23 · N-MOSFET · 20V · 2.3A",
    type: "mosfet",
    properties: { vth: 1.0, rds_on: 0.08, id_max: 2.3, vds_max: 20, vgs_max: 12, powerRating: 0.9 },
    ratedThresholds: { maxVoltageV: 20, maxCurrentA: 2.3, maxPowerW: 0.9, maxTempC: 150, thermalResistanceCA: 138 },
  },
  {
    id: "on-semi-2n7000",
    manufacturer: "ON Semiconductor",
    name: "2N7000",
    spec: "TO-92 · N-MOSFET · 60V · 200mA",
    type: "mosfet",
    properties: { vth: 2.1, rds_on: 5, id_max: 0.2, vds_max: 60, vgs_max: 20, powerRating: 0.4 },
    ratedThresholds: { maxVoltageV: 60, maxCurrentA: 0.2, maxPowerW: 0.4, maxTempC: 150, thermalResistanceCA: 62.5 },
  },

  // ── Voltage Regulators ────────────────────────────────────────────────────
  {
    id: "ti-lm7805",
    manufacturer: "Texas Instruments",
    name: "LM7805",
    spec: "TO-220 · 5V · 1.5A",
    type: "voltage_regulator",
    properties: { outputVoltage: 5, dropoutVoltage: 2, maxCurrent: 1.5, powerRating: 15 },
    ratedThresholds: { maxVoltageV: 35, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "ti-lm7812",
    manufacturer: "Texas Instruments",
    name: "LM7812",
    spec: "TO-220 · 12V · 1.5A",
    type: "voltage_regulator",
    properties: { outputVoltage: 12, dropoutVoltage: 2, maxCurrent: 1.5, powerRating: 15 },
    ratedThresholds: { maxVoltageV: 35, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "ti-lm317",
    manufacturer: "Texas Instruments",
    name: "LM317T",
    spec: "TO-220 · adj 1.2–37V · 1.5A",
    type: "voltage_regulator",
    properties: { outputVoltage: 5, dropoutVoltage: 3, maxCurrent: 1.5, powerRating: 15 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "microchip-mcp1700-3v3",
    manufacturer: "Microchip",
    name: "MCP1700-3302E/TO",
    spec: "TO-92 · 3.3V · 250mA · LDO",
    type: "voltage_regulator",
    properties: { outputVoltage: 3.3, dropoutVoltage: 0.178, maxCurrent: 0.25, powerRating: 1 },
    ratedThresholds: { maxVoltageV: 6, maxCurrentA: 0.25, maxPowerW: 1, maxTempC: 125, thermalResistanceCA: 250 },
  },

  // ── Op-Amps ───────────────────────────────────────────────────────────────
  {
    id: "ti-lm358",
    manufacturer: "Texas Instruments",
    name: "LM358N",
    spec: "DIP-8 · dual op-amp · 32V supply",
    type: "opamp",
    properties: { supplyVoltage: 32, slewRate: 0.6, gainBandwidth: 1e6, powerRating: 0.68 },
    ratedThresholds: { maxVoltageV: 32, maxPowerW: 0.68, maxTempC: 125, thermalResistanceCA: 100 },
  },
  {
    id: "ti-lm741",
    manufacturer: "Texas Instruments",
    name: "LM741CN",
    spec: "DIP-8 · single op-amp · 18V supply",
    type: "opamp",
    properties: { supplyVoltage: 18, slewRate: 0.5, gainBandwidth: 1e6, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 18, maxPowerW: 0.5, maxTempC: 125, thermalResistanceCA: 100 },
  },
  {
    id: "analog-devices-op07",
    manufacturer: "Analog Devices",
    name: "OP07CP",
    spec: "DIP-8 · ultra-low offset · 22V supply",
    type: "opamp",
    properties: { supplyVoltage: 22, slewRate: 0.3, gainBandwidth: 0.6e6, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 22, maxPowerW: 0.5, maxTempC: 125, thermalResistanceCA: 100 },
  },

  // ── Timer ICs ─────────────────────────────────────────────────────────────
  {
    id: "ti-ne555",
    manufacturer: "Texas Instruments",
    name: "NE555P",
    spec: "DIP-8 · timer · 4.5–16V",
    type: "ic",
    properties: { supplyVoltage: 16, maxCurrent: 0.2, powerRating: 0.6 },
    ratedThresholds: { maxVoltageV: 16, maxCurrentA: 0.2, maxPowerW: 0.6, maxTempC: 70, thermalResistanceCA: 70 },
  },
  {
    id: "microchip-pic12f675",
    manufacturer: "Microchip",
    name: "PIC12F675-I/P",
    spec: "DIP-8 · 8-bit MCU · 4MHz · 3.5–5.5V",
    type: "ic",
    properties: { supplyVoltage: 5.5, maxCurrent: 0.025, powerRating: 0.3 },
    ratedThresholds: { maxVoltageV: 5.5, maxCurrentA: 0.025, maxPowerW: 0.3, maxTempC: 85, thermalResistanceCA: 125 },
  },

  // ── Inductors ─────────────────────────────────────────────────────────────
  {
    id: "sumida-cdrh4d28-470",
    manufacturer: "Sumida",
    name: "CDRH4D28-470",
    spec: "SMD shielded · 47µH · 700mA sat · 0.22Ω DCR",
    type: "inductor",
    properties: { inductance: 47e-6, dcResistance: 0.22, saturationCurrentA: 0.7, powerRating: 0.5 },
    ratedThresholds: { maxCurrentA: 0.7, maxPowerW: 0.5, maxTempC: 125, thermalResistanceCA: 55 },
  },
  {
    id: "bourns-srr1260-101y",
    manufacturer: "Bourns",
    name: "SRR1260-101Y",
    spec: "SMD shielded · 100µH · 2.1A sat · 0.061Ω DCR",
    type: "inductor",
    properties: { inductance: 100e-6, dcResistance: 0.061, saturationCurrentA: 2.1, powerRating: 1 },
    ratedThresholds: { maxCurrentA: 2.1, maxPowerW: 1, maxTempC: 125, thermalResistanceCA: 35 },
  },
  {
    id: "vishay-ihlp2020-10uh",
    manufacturer: "Vishay",
    name: "IHLP2020BZER100M5A",
    spec: "SMD shielded · 10µH · 4.6A sat · 0.023Ω DCR",
    type: "inductor",
    properties: { inductance: 10e-6, dcResistance: 0.023, saturationCurrentA: 4.6, powerRating: 1.5 },
    ratedThresholds: { maxCurrentA: 4.6, maxPowerW: 1.5, maxTempC: 125, thermalResistanceCA: 25 },
  },

  // ── Fuses ─────────────────────────────────────────────────────────────────
  {
    id: "littelfuse-251001",
    manufacturer: "Littelfuse",
    name: "251001",
    spec: "axial · 1A · 250V · fast blow · glass",
    type: "fuse",
    properties: { ratedCurrentA: 1, meltingI2t: 1, resistance: 0.02 },
    ratedThresholds: { maxVoltageV: 250, maxCurrentA: 1, maxTempC: 125 },
  },
  {
    id: "littelfuse-250500",
    manufacturer: "Littelfuse",
    name: "250500",
    spec: "axial · 500mA · 250V · fast blow · glass",
    type: "fuse",
    properties: { ratedCurrentA: 0.5, meltingI2t: 0.25, resistance: 0.04 },
    ratedThresholds: { maxVoltageV: 250, maxCurrentA: 0.5, maxTempC: 125 },
  },
  {
    id: "schurter-ato-5a",
    manufacturer: "Schurter",
    name: "0034.3512",
    spec: "ATO blade · 5A · 32V · automotive",
    type: "fuse",
    properties: { ratedCurrentA: 5, meltingI2t: 25, resistance: 0.006 },
    ratedThresholds: { maxVoltageV: 32, maxCurrentA: 5, maxTempC: 125 },
  },
];

/**
 * Get unique component categories from the catalog.
 */
export function getCatalogCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of CATALOG_COMPONENTS) {
    if (!seen.has(c.type)) {
      seen.add(c.type);
      result.push(c.type);
    }
  }
  return result;
}

/**
 * Filter catalog by search term and optional type.
 */
export function searchCatalog(query: string, typeFilter?: string): CatalogComponent[] {
  const q = query.trim().toLowerCase();
  return CATALOG_COMPONENTS.filter((c) => {
    if (typeFilter && typeFilter !== "all" && c.type !== typeFilter) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.manufacturer.toLowerCase().includes(q) ||
      c.spec.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  });
}

/**
 * Find a catalog component by id.
 */
export function findCatalogComponent(id: string): CatalogComponent | null {
  return CATALOG_COMPONENTS.find((c) => c.id === id) ?? null;
}
