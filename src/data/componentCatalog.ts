/**
 * Branded component catalog — the single source of truth for real-world parts.
 *
 * Real-world, manufacturer-branded components with accurate spec data,
 * rated thresholds, and FUSE-compatible thermal/electrical properties.
 * Manufacturers can extend this catalog by uploading their spec files.
 *
 * This module is deliberately app-neutral: it belongs to neither the Builder nor
 * the Arena. Both import it (the Builder library to offer branded variants of a
 * generic part, the Arena to enrich an imported roster), so a part is defined
 * once, here, and nowhere else. `src/components/arena/catalogData.ts` is a thin
 * re-export kept for the Arena's existing import paths.
 */

export type CatalogSource = {
  /** Primary source used to enter the catalog facts. */
  url: string;
  publisher: string;
};

export type CatalogSimulation = {
  /**
   * `modeled` uses an existing generic engine family. It is educational behavior,
   * not a manufacturer-certified part model. `reference-only` is intentionally
   * not addable because the engine does not yet represent the device faithfully.
   */
  status: "modeled" | "reference-only";
  detail: string;
};

export type CatalogComponent = {
  id: string;
  manufacturer: string;
  /** Manufacturer ordering code when it differs from the display name. */
  partNumber?: string;
  name: string;
  spec: string;
  /**
   * Catalog-side family name. Not always identical to the Builder's
   * `builderType` — see `builderTypeFor()` below.
   */
  type: string;
  /**
   * Pins the 3D workspace part when the family name alone cannot choose one
   * (a "bjt" may be NPN or PNP). Omit to derive it from `type`.
   */
  builderType?: string;
  featured?: boolean;
  properties: Record<string, number>;
  /** Official product-page provenance, when catalog facts were source-backed. */
  source?: CatalogSource;
  /** How this entry may be used by CircuiTry3D's current simulation engine. */
  simulation?: CatalogSimulation;
  ratedThresholds?: {
    maxVoltageV?: number;
    maxCurrentA?: number;
    maxPowerW?: number;
    maxTempC?: number;
    minTempC?: number;
    thermalResistanceCA?: number;
  };
};

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

  // ── Crystals ──────────────────────────────────────────────────────────────
  // No ratedThresholds: these were merged in from the Builder's own list, which
  // never carried datasheet limits. Left absent rather than invented — FUSE reads
  // this field, so a guessed number would fail a part at the wrong point.
  {
    id: "abracon-abls-16mhz",
    manufacturer: "Abracon",
    name: "ABLS-16.000MHZ-B4-T",
    spec: "HC-49/US · 16MHz · 18pF · ±20ppm",
    type: "crystal",
    properties: { frequency: 16000000 },
  },
  {
    id: "ecs-8mhz",
    manufacturer: "ECS",
    name: "ECS-80-20-4X",
    spec: "HC-49/US · 8MHz · 20pF · ±30ppm",
    type: "crystal",
    properties: { frequency: 8000000 },
  },

  // ── Thermistors ───────────────────────────────────────────────────────────
  {
    id: "vishay-ntcle100-10k",
    manufacturer: "Vishay",
    name: "NTCLE100E3103JB0",
    spec: "NTC · 10kΩ @25°C · B=3950K · 5%",
    type: "thermistor",
    properties: { resistance: 10000 },
  },

  // ── PNP transistor ────────────────────────────────────────────────────────
  // Catalog `type` is the family ("bjt"), which cannot say NPN from PNP, so this
  // one pins its Builder part explicitly.
  {
    id: "on-semi-2n3906",
    manufacturer: "ON Semi",
    name: "2N3906",
    spec: "TO-92 · PNP · 40V · 200mA",
    type: "bjt",
    builderType: "bjt-pnp",
    properties: { vce_max: 40, ic_max: 0.2, hfe: 100, vbe: 0.65, powerRating: 0.625 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 0.2, maxPowerW: 0.625, maxTempC: 150 },
  },

  // ── TE Connectivity seed catalog ──────────────────────────────────────────
  // Reference-only entries remain inspectable in the Arena catalog, but are not
  // offered as electrical parts until the simulator can represent their behavior.
  {
    id: "te-282104-1",
    manufacturer: "TE Connectivity",
    partNumber: "282104-1",
    name: "AMP SUPERSEAL 1.5",
    spec: "sealed automotive 2-position connector · up to 14A / 24V system",
    type: "connector",
    properties: { positions: 2, systemCurrentA: 14, systemVoltageV: 24 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-282104-1.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. System figures depend on the mating assembly, terminals, wire, seals, and installation conditions.",
    },
  },
  {
    id: "te-1-967325-1",
    manufacturer: "TE Connectivity",
    partNumber: "1-967325-1",
    name: "AMPSEAL 16",
    spec: "sealed automotive 16-position connector · 17A / 250VAC system class",
    type: "connector",
    properties: { positions: 16, systemCurrentA: 17, systemVoltageV: 250 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-1-967325-1.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. System-class figures are not guaranteed ratings for an incomplete connector assembly.",
    },
  },
  {
    id: "te-1-480424-0",
    manufacturer: "TE Connectivity",
    partNumber: "1-480424-0",
    name: "Universal MATE-N-LOK",
    spec: "2-position power connector · up to 19A / 600VAC system class",
    type: "connector",
    properties: { positions: 2, systemCurrentA: 19, systemVoltageV: 600 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-1-480424-0.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. Installed capability depends on the full mated assembly and application conditions.",
    },
  },
  {
    id: "te-796635-2",
    manufacturer: "TE Connectivity",
    partNumber: "796635-2",
    name: "Eurostyle terminal-block header",
    spec: "2-position header · 5.0mm pitch · 12A / 300V class",
    type: "connector",
    properties: { positions: 2, pitchMm: 5, currentClassA: 12, voltageClassV: 300 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-796635-2.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current engine does not model terminal blocks, mated connectors, or wiring conditions.",
    },
  },
  {
    id: "te-v23074-a1001-a403",
    manufacturer: "TE Connectivity",
    partNumber: "V23074-A1001-A403",
    name: "F4 automotive relay",
    spec: "12V coil · changeover · 30A at 14VDC class",
    type: "relay",
    properties: { coilVoltage: 12, maxCurrent: 30, maxVoltage: 14 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-V23074-A1001-A403.html",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled as a generic electromagnetic relay for education; it is not a manufacturer-certified coil or contact model.",
    },
    ratedThresholds: { maxCurrentA: 30, maxVoltageV: 14 },
  },
  {
    id: "te-t9as1d22-12",
    manufacturer: "TE Connectivity",
    partNumber: "T9AS1D22-12",
    name: "T9A power relay",
    spec: "12VDC coil · SPST-NO · 30A at 277VAC class",
    type: "relay",
    properties: { coilVoltage: 12, maxCurrent: 30, maxVoltage: 277 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-T9AS1D22-12.html",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled as a generic electromagnetic relay for education; it is not a manufacturer-certified coil or contact model.",
    },
    ratedThresholds: { maxCurrentA: 30, maxVoltageV: 277 },
  },
  {
    id: "te-ev200aaana",
    manufacturer: "TE Connectivity",
    partNumber: "EV200AAANA",
    name: "Kilovac EV200 contactor",
    spec: "sealed high-voltage DC contactor · 12V control · EV200 family ~500A / up to 900VDC",
    type: "contactor",
    properties: { controlVoltage: 12, familyCurrentA: 500, familyVoltageV: 900 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-EV200AAANA.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current relay model cannot represent contactor interruption, arc suppression, or high-voltage DC switching behavior.",
    },
  },
  {
    id: "te-ms4525do-ds5ai001dp",
    manufacturer: "TE Connectivity",
    partNumber: "MS4525DO-DS5AI001DP",
    name: "MS4525DO differential-pressure sensor",
    spec: "±1psi differential pressure · I2C · 3.3V / 5V",
    type: "sensor",
    properties: { pressureRangePsi: 1, minSupplyVoltage: 3.3, maxSupplyVoltage: 5 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-MS4525DO-DS5AI001DP.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. Pressure transduction and I2C behavior are not modeled by the current circuit engine.",
    },
  },
  {
    id: "te-tsys01",
    manufacturer: "TE Connectivity",
    partNumber: "TSYS01",
    name: "TSYS01 temperature sensor",
    spec: "I2C / SPI · 2.2–3.6V · -40 to +125°C",
    type: "sensor",
    properties: { minSupplyVoltage: 2.2, maxSupplyVoltage: 3.6, minTemperatureC: -40, maxTemperatureC: 125 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-TSYS01.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. Digital sensor conversion and I2C/SPI communications are not modeled by the current circuit engine.",
    },
  },
  {
    id: "te-htu31d",
    manufacturer: "TE Connectivity",
    partNumber: "HTU31D",
    name: "HTU31D humidity/temperature sensor",
    spec: "I2C · 1.5–3.6V · approximately ±2% RH",
    type: "sensor",
    properties: { minSupplyVoltage: 1.5, maxSupplyVoltage: 3.6, humidityAccuracyPercent: 2 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-HTU31D.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. Humidity sensing and I2C communications are not modeled by the current circuit engine.",
    },
  },
  {
    id: "te-rxef050",
    manufacturer: "TE Connectivity",
    partNumber: "RXEF050",
    name: "PolySwitch PPTC",
    spec: "resettable PPTC · 0.50A hold · 1.00A trip · 72V max",
    type: "pptc",
    properties: { holdCurrentA: 0.5, tripCurrentA: 1, maxVoltage: 72 },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-RXEF050.html",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current fuse model is permanent-blow; it does not model PPTC heating, resistance increase, or reset behavior.",
    },
  },

  // ── Logic / ICs ───────────────────────────────────────────────────────────
  // The 3D workspace has no `ic` part (no case in legacy.html's
  // getDefaultProperties or createMesh), so these do not appear in the Builder
  // library. They stay here for the Arena, which does model them.
  {
    id: "ti-74hc595",
    manufacturer: "Texas Instruments",
    name: "SN74HC595N",
    spec: "DIP-16 · 8-bit shift register · 2–6V",
    type: "ic",
    properties: { supplyVoltage: 6, maxCurrent: 0.07, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 7, maxTempC: 125 },
  },
  {
    id: "ti-cd4011be",
    manufacturer: "Texas Instruments",
    name: "CD4011BE",
    spec: "DIP-14 · quad NAND · 3–18V",
    type: "ic",
    properties: { supplyVoltage: 18, maxCurrent: 0.01, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 20, maxTempC: 125 },
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

/** Components entered for a specific manufacturer, preserving catalog order. */
export function getManufacturerCatalogComponents(manufacturer: string): CatalogComponent[] {
  return CATALOG_COMPONENTS.filter((component) => component.manufacturer === manufacturer);
}

/**
 * Find a catalog component by id.
 */
export function findCatalogComponent(id: string): CatalogComponent | null {
  return CATALOG_COMPONENTS.find((c) => c.id === id) ?? null;
}

/**
 * Catalog family name → the 3D workspace part it spawns as.
 *
 * `null` means the workspace has no such part, so the family is left out of the
 * Builder library entirely (it can still appear in the Arena, which models more
 * than the workspace can draw).
 */
const BUILDER_TYPE_BY_FAMILY: Record<string, string | null> = {
  battery: "battery",
  resistor: "resistor",
  capacitor: "capacitor",
  inductor: "inductor",
  led: "led",
  diode: "diode",
  bjt: "bjt",
  mosfet: "mosfet",
  opamp: "opamp",
  fuse: "fuse",
  crystal: "crystal",
  thermistor: "thermistor",
  voltage_regulator: "voltage-regulator",
  relay: "relay",
  ic: null, // legacy.html has no 'ic' case in getDefaultProperties/createMesh
};

/** The workspace part this branded component spawns as, or null if it has none. */
export function builderTypeFor(part: CatalogComponent): string | null {
  if (part.simulation?.status === "reference-only") {
    return null;
  }
  return part.builderType ?? BUILDER_TYPE_BY_FAMILY[part.type] ?? null;
}

/** Drop keys whose value isn't a usable number, so no NaN reaches the workspace. */
function defined(props: Record<string, number | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

const scale = (value: number | undefined, factor: number) =>
  typeof value === "number" ? value * factor : undefined;

/**
 * Catalog properties → the properties the 3D workspace stores on a part.
 *
 * These are two different vocabularies and must not be passed through raw. The
 * catalog is datasheet-faithful: SI units (farads, henries) and datasheet names
 * (`vth`, `hfe`, `ratedCurrentA`). The workspace keeps a smaller set under its
 * own names, and — critically — capacitance in µF and inductance in mH. See
 * `getDefaultProperties` in public/legacy.html. Handing 1e-6 to a workspace that
 * means µF would build a one-picofarad capacitor.
 *
 * Unmapped keys are dropped, not merged: `Component.updateProperties` writes
 * whatever it is given onto the part, and the nameplate renders it.
 *
 * An empty result means "spawn with the workspace defaults". That is the right
 * answer for LEDs (the workspace models one by `resistance`, and the catalog
 * carries no equivalent) and op-amps (the workspace wants open-loop gain; the
 * catalog carries gain-bandwidth product). Both already behaved this way.
 */
export function toWorkspaceProperties(part: CatalogComponent): Record<string, number> {
  const p = part.properties;
  switch (part.type) {
    case "battery":
      return defined({ voltage: p.voltage });
    case "resistor":
    case "thermistor":
      return defined({ resistance: p.resistance });
    case "capacitor":
      return defined({ capacitance: scale(p.capacitance, 1e6) }); // F → µF
    case "inductor":
      return defined({ inductance: scale(p.inductance, 1e3) }); // H → mH
    case "diode":
      return defined({ forwardVoltage: p.forwardVoltage });
    case "bjt":
      return defined({ gain: p.hfe });
    case "mosfet":
      return defined({ threshold: p.vth });
    case "fuse":
      return defined({ current: p.ratedCurrentA });
    case "crystal":
      return defined({ frequency: p.frequency });
    case "voltage_regulator":
      return defined({ outputVoltage: p.outputVoltage, maxCurrent: p.maxCurrent });
    case "relay":
      return defined({ coilVoltage: p.coilVoltage });
    default:
      return {};
  }
}
