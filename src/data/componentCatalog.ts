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

/**
 * The line that has to appear wherever a branded part is shown.
 *
 * Defined once, here, because it used to be carried by the optional
 * `simulation` block — which meant the 51 entries that never got one showed no
 * disclaimer at all. The least-verified entries were the unprotected ones,
 * which is exactly backwards. Nothing in this sentence depends on which part
 * is on screen, so it does not belong on a part.
 */
export const CATALOG_DISCLAIMER =
  "Manufacturer names and part numbers identify real parts. CircuiTry3D is not " +
  "affiliated with or endorsed by any manufacturer listed, and the behavior shown " +
  "is CircuiTry3D's own educational model, not a manufacturer part model.";

/** Families whose name is an acronym and reads wrong in lower case. */

const FAMILY_LABEL: Record<string, string> = {

  bjt: "BJT",

  "bjt-npn": "NPN BJT",

  "bjt-pnp": "PNP BJT",

  led: "LED",

  ic: "IC",

  mosfet: "MOSFET",

  opamp: "op-amp",

  zener_diode: "Zener diode",

};


const familyLabel = (type: string) =>

  FAMILY_LABEL[type] ?? type.replace(/_/g, " ");


/** "Vishay" -> "Vishay's", but "Texas Instruments" -> "Texas Instruments'". */


const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);



/** What is known about where a catalog entry's figures came from. */
export type CatalogProvenance = {
  /** Whether the engine represents this device, or only files the facts. */
  status: "modeled" | "reference-only";
  detail: string;
  /** True when the figures were entered from the manufacturer's own page. */
  sourceBacked: boolean;
};

/**
 * Provenance for any entry, declared or not.
 *
 * Fidelity and provenance are two different axes, and conflating them is how
 * this went wrong the first time. A jellybean like 2N3904 or LM7805 is modeled
 * honestly — the generic engine does represent it — while its figures are
 * still typical published values nobody has checked against the manufacturer's
 * own page. Such a part is not "reference-only"; it is modeled and unverified,
 * and a reader is entitled to both halves rather than to silence.
 *
 * Defaulting to `modeled` keeps `builderTypeFor` deciding exactly what it
 * decided before: only an explicit `reference-only` withholds a part.
 */
export function provenanceFor(part: CatalogComponent): CatalogProvenance {
  if (part.simulation) {
    return { ...part.simulation, sourceBacked: Boolean(part.source) };
  }
  return {
    status: "modeled",
    detail:
      `Modeled with CircuiTry3D's generic ${familyLabel(part.type)} engine. ` +
      `Catalog figures are typical published values for this industry-standard ` +
      `part and have not been verified against ${possessive(part.manufacturer)} own product page.`,
    sourceBacked: false,
  };
}

export const CATALOG_COMPONENTS: CatalogComponent[] = [
  // ── Batteries ─────────────────────────────────────────────────────────────
  {
    id: "energizer-522-9v",
    manufacturer: "Energizer",
    partNumber: "522",
    name: "522 9V Alkaline",
    spec: "PP3 · 9V · 565mAh · alkaline",
    type: "battery",
    properties: { voltage: 9, internalResistance: 0.5, capacityMah: 565 },
    ratedThresholds: { maxVoltageV: 9, maxTempC: 54, minTempC: -18 },
  },
  {
    id: "duracell-mn1604-9v",
    manufacturer: "Duracell",
    partNumber: "MN1604",
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
  // The CRCW e3 series sheet holds full rated power to 70 °C and derates from
  // there to zero at 155 °C. That knee is the maker's, so it is carried as
  // `deratingKneeC` and the bench derates from it. Without it the Arena assumed
  // a 25 °C knee and told a student their 0603 had three quarters of its rating
  // at 55 °C ambient, where Vishay's own curve still says all of it.
  {
    id: "vishay-crcw0402-100r",
    manufacturer: "Vishay",
    name: "CRCW0402 100Ω",
    spec: "0402 · 100Ω · 1% · 63mW",
    type: "resistor",
    properties: { resistance: 100, powerRating: 0.063, tolerance: 0.01, deratingKneeC: 70 },
    ratedThresholds: { maxPowerW: 0.063, maxTempC: 155, thermalResistanceCA: 300 },
  },
  {
    id: "vishay-crcw0603-330r",
    manufacturer: "Vishay",
    name: "CRCW0603 330Ω",
    spec: "0603 · 330Ω · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 330, powerRating: 0.1, tolerance: 0.01, deratingKneeC: 70 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "vishay-crcw0603-1k",
    manufacturer: "Vishay",
    name: "CRCW0603 1kΩ",
    spec: "0603 · 1kΩ · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 1000, powerRating: 0.1, tolerance: 0.01, deratingKneeC: 70 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "vishay-crcw0603-10k",
    manufacturer: "Vishay",
    name: "CRCW0603 10kΩ",
    spec: "0603 · 10kΩ · 1% · 100mW",
    type: "resistor",
    properties: { resistance: 10000, powerRating: 0.1, tolerance: 0.01, deratingKneeC: 70 },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },
  {
    id: "yageo-cfr-1k",
    manufacturer: "Yageo",
    partNumber: "CFR-25JB-52-1K",
    name: "CFR-25JB-52-1K",
    spec: "axial · 1kΩ · 5% · 250mW",
    type: "resistor",
    properties: { resistance: 1000, powerRating: 0.25, tolerance: 0.05 },
    ratedThresholds: { maxPowerW: 0.25, maxTempC: 155, thermalResistanceCA: 80 },
  },
  {
    id: "yageo-cfr-10k",
    manufacturer: "Yageo",
    partNumber: "CFR-25JB-52-10K",
    name: "CFR-25JB-52-10K",
    spec: "axial · 10kΩ · 5% · 250mW",
    type: "resistor",
    properties: { resistance: 10000, powerRating: 0.25, tolerance: 0.05 },
    ratedThresholds: { maxPowerW: 0.25, maxTempC: 155, thermalResistanceCA: 80 },
  },
  {
    id: "bourns-cr0603-100k",
    manufacturer: "Bourns",
    partNumber: "CR0603-FX-1003ELF",
    name: "CR0603-FX-1003ELF",
    spec: "0603 · 100kΩ · 1% · 100mW",
    type: "resistor",
    // Bourns CR series thick-film chip resistors: 0603 rated 0.10 W, ±1%
    // tolerance, ±100 ppm/°C, −55 to +155 °C. Bourns does not publish a
    // limiting element voltage on the series sheet the way Vishay does, so this
    // entry carries no voltage limit rather than borrowing another maker's.
    properties: { resistance: 100000, powerRating: 0.1, tolerance: 0.01, tcr: 100e-6 },
    source: {
      publisher: "Bourns",
      url: "https://www.bourns.com/docs/product-datasheets/cr.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Bourns' resistance, 0.10 W rating and ±1% tolerance. The ±100 ppm/°C coefficient is carried as a rating: the app's resistor model does not drift with temperature. No element voltage limit is applied because Bourns' series sheet does not state one.",
    },
    ratedThresholds: { maxPowerW: 0.1, maxTempC: 155, thermalResistanceCA: 200 },
  },

  // ── Capacitors ────────────────────────────────────────────────────────────
  {
    id: "murata-gcj-1uf",
    manufacturer: "Murata",
    partNumber: "GCJ316R71H105KA12D",
    name: "GCJ316R71H105KA12D",
    spec: "0805 · 1µF · 50V · X7R",
    type: "capacitor",
    properties: { capacitance: 1e-6, maxVoltage: 50, esr: 0.05 },
    ratedThresholds: { maxVoltageV: 50, maxTempC: 125, thermalResistanceCA: 45 },
  },
  {
    id: "murata-grm188-104k",
    manufacturer: "Murata",
    partNumber: "GRM188R71H104KA93D",
    name: "GRM188R71H104KA93D",
    spec: "0603 · 0.1µF ±10% · 50Vdc · X7R (±15%, −55 to +125°C) · 6.3mg",
    type: "capacitor",
    // Murata's own reference sheet for this ordering code: 0.10 µF ±10%, 50 Vdc,
    // X7R with ±15.0% capacitance change over −55 to +125 °C, 1.6 × 0.8 × 0.8 mm,
    // 6.3 mg. No ESR figure is carried because this sheet publishes none — an
    // ESR taken from a similar part would be a number from a different datasheet.
    properties: { capacitance: 0.1e-6, maxVoltage: 50 },
    source: {
      publisher: "Murata",
      url: "https://pim.murata.com/en-us/pim/details/?partNum=GRM188R71H104KA93D",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Murata's 0.10 µF and 50 Vdc rating. X7R's ±15% change over the temperature range, and the capacitance it loses under DC bias, are ratings the sheet states rather than behaviour this app reproduces: the capacitor holds 0.10 µF at every temperature and every bias. Murata's own product page marks this ordering code as to be discontinued, naming GRM155R71H104KE14# as the alternative — the figures are this part's, and the lifecycle notice is Murata's.",
    },
    ratedThresholds: { maxVoltageV: 50, minTempC: -55, maxTempC: 125 },
  },
  {
    id: "tdk-c3225x5r-10uf",
    manufacturer: "TDK",
    partNumber: "C3225X5R1C106K",
    name: "C3225X5R1C106K",
    spec: "1210 · 10µF · 16V · X5R",
    type: "capacitor",
    properties: { capacitance: 10e-6, maxVoltage: 16, esr: 0.02 },
    ratedThresholds: { maxVoltageV: 16, maxTempC: 85, thermalResistanceCA: 40 },
  },
  {
    id: "panasonic-eeufm-100uf",
    manufacturer: "Panasonic",
    partNumber: "EEU-FM1E101",
    name: "EEU-FM1E101",
    spec: "radial · 100µF · 25V · 105°C",
    type: "capacitor",
    // Panasonic's own FM-A series specification, read from the part's product
    // page: 100 µF ±20%, 25 V, −40 to +105 °C, 455 mA rms ripple at 100 kHz,
    // 130 mΩ impedance at 100 kHz, 25 µA leakage, Ø6.3 × 11.2 mm on a 2.5 mm
    // pitch, 2000 h endurance. `esr` is that 130 mΩ, not a class figure: an
    // electrolytic's ESR is the number that decides whether it gets hot.
    properties: { capacitance: 100e-6, maxVoltage: 25, esr: 0.13, rippleCurrent: 0.455, leakageCurrent: 25e-6 },
    source: {
      publisher: "Panasonic",
      url: "https://industrial.panasonic.com/ww/products/pt/aluminum-cap-lead/models/EEUFM1E101",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Panasonic's capacitance, voltage, ESR and temperature range. Ripple heating, electrolyte dry-out and the 2000 h endurance figure are not modeled: the app has no aging model for electrolytics, so it will not show this part going high-ESR with age.",
    },
    ratedThresholds: { maxVoltageV: 25, maxTempC: 105, thermalResistanceCA: 35 },
  },
  {
    id: "nichicon-ufw-470uf",
    manufacturer: "Nichicon",
    partNumber: "UFW1C471MED",
    name: "UFW1C471MED",
    spec: "radial · 470µF · 16V · 105°C",
    type: "capacitor",
    properties: { capacitance: 470e-6, maxVoltage: 16, esr: 0.12 },
    ratedThresholds: { maxVoltageV: 16, maxTempC: 105, thermalResistanceCA: 28 },
  },

  {
    id: "kemet-t491a106k016at",
    manufacturer: "KEMET",
    partNumber: "T491A106K016AT",
    name: "T491 tantalum chip capacitor",
    spec: "1206/3216 · MnO2 tantalum · 10µF ±10% · 16VDC · 3Ω ESR · 158mA ripple",
    type: "capacitor",
    // KEMET's own specification sheet for T491A106K016AT: 10 µF ±10% MnO2
    // molded tantalum, 16 VDC at 85 °C and 10.72 VDC at 125 °C, 1206 / 3216
    // case, ESR 3 Ω at 100 kHz and 25 °C, dissipation factor 6% at 120 Hz,
    // ripple current 158 mA rms at 25 °C, 142.2 mA at 85 °C and 63.2 mA at
    // 125 °C, leakage 1.6 µA five minutes after 25 °C, −55 to +125 °C. The
    // 3 Ω ESR is the figure that matters: at 1 A of ripple it would dissipate
    // 3 W in a 1206 body, which is why the ripple rating is 158 mA.
    properties: { capacitance: 10e-6, maxVoltage: 16, esr: 3, rippleCurrent: 0.158, leakageCurrent: 1.6e-6 },
    source: {
      publisher: "KEMET",
      url: "https://search.kemet.com/download/specsheet/T491A106K016AT",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with KEMET's 10 µF, 16 VDC and 3 Ω ESR. The engine charges and discharges the capacitance and shows the ESR as series resistance, but it does not police the 158 mA ripple rating, the 63.2 mA at 125 °C or the 10.72 V derating: exceed any of them here and the part simply keeps working, where a real tantalum fails short.",
    },
    ratedThresholds: { maxVoltageV: 16, minTempC: -55, maxTempC: 125 },
  },

  // ── LEDs ──────────────────────────────────────────────────────────────────
  {
    id: "vishay-tlhr5400-red",
    manufacturer: "Vishay",
    partNumber: "TLHR5400",
    name: "TLHR5400",
    spec: "T-1 3/4 · red · 2.0V · 20mA · 630nm",
    type: "led",
    // Vishay document 83012, current revision: forward voltage 2.0 V typical at
    // 20 mA and 3.0 V maximum at the same current, DC forward current 30 mA at
    // an ambient of 65 C or below, reverse voltage 6 V, junction temperature
    // 100 C. The 20 mA on this card is the test current for VF, not a limit —
    // the limit is 30 mA, and the card used to carry 20 mA as though it were.
    properties: { forwardVoltage: 2.0, maxCurrent: 0.03, efficiency: 0.3 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/83012/tlhr540x_tlhy540x.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Vishay's 2.0 V typical forward drop and its 30 mA DC rating at an ambient of 65 C or below. The engine holds one forward drop rather than this LED's I-V curve, so the 3.0 V maximum at 20 mA is carried as a rating rather than shown, and the 6 V reverse limit and the luminous intensity are carried as figures: neither is simulated.",
    },
    ratedThresholds: { maxVoltageV: 3, maxCurrentA: 0.03, maxTempC: 100, thermalResistanceCA: 120 },
  },
  {
    id: "wurth-led-green",
    manufacturer: "Würth Elektronik",
    partNumber: "151031VS06000",
    name: "151031VS06000",
    spec: "SMD · green · 2.1V · 20mA · 525nm",
    type: "led",
    properties: { forwardVoltage: 2.1, maxCurrent: 0.02, efficiency: 0.35 },
    ratedThresholds: { maxVoltageV: 2.8, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 110 },
  },
  {
    id: "osram-lb-d47b-blue",
    manufacturer: "Osram",
    partNumber: "LB D47B-R2T1-35",
    name: "LB D47B-R2T1-35",
    spec: "SMD · blue · 3.0V · 20mA · 470nm",
    type: "led",
    properties: { forwardVoltage: 3.0, maxCurrent: 0.02, efficiency: 0.33 },
    ratedThresholds: { maxVoltageV: 3.8, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 110 },
  },
  {
    id: "cree-c503b-wan-white",
    manufacturer: "Cree",
    partNumber: "C503B-WAN-CB0F0251",
    name: "C503B-WAN-CB0F0251",
    spec: "T-1 3/4 · white · 3.2V · 20mA · 6000K",
    type: "led",
    properties: { forwardVoltage: 3.2, maxCurrent: 0.02, efficiency: 0.4 },
    ratedThresholds: { maxVoltageV: 4.0, maxCurrentA: 0.02, maxTempC: 100, thermalResistanceCA: 100 },
  },
  {
    id: "lumileds-lxhl-mm01-yellow",
    manufacturer: "Lumileds",
    partNumber: "LXHL-MM01",
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
    partNumber: "1N4148",
    name: "1N4148",
    spec: "DO-35 · 100V · 300mA · signal",
    type: "diode",
    properties: { forwardVoltage: 0.72, maxCurrent: 0.3, reverseVoltage: 100, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 0.3, maxPowerW: 0.5, maxTempC: 200, thermalResistanceCA: 250 },
  },
  {
    id: "on-semi-1n4007",
    manufacturer: "ON Semiconductor",
    partNumber: "1N4007",
    name: "1N4007",
    spec: "DO-41 · 1000V · 1A · rectifier",
    type: "diode",
    // onsemi's 1N4001–1N4007 general-purpose rectifier datasheet: VRRM 1000 V,
    // average rectified current 1.0 A at 75 °C ambient, non-repetitive surge
    // 30 A for one 8.3 ms half sine, I²t 3.7 A²s, forward drop 1.1 V maximum at
    // 1 A, junction −55 to +175 °C. The forward drop is entered at the sheet's
    // 1.1 V maximum rather than the 0.7 V a textbook quote gives, so a bridge
    // here dissipates what the real one does.
    properties: { forwardVoltage: 1.1, maxCurrent: 1, reverseVoltage: 1000, powerRating: 3 },
    source: {
      publisher: "ON Semiconductor",
      url: "https://www.mouser.com/ds/2/149/1N4007-888322.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Forward drop, 1 A rating and 1000 V reverse rating are from the onsemi datasheet. The 3 W dissipation is the model's own figure: that datasheet states no power dissipation for the part, so nothing from the maker is being quoted there. Surge current and I²t are carried as ratings, not simulated.",
    },
    ratedThresholds: { maxVoltageV: 1000, maxCurrentA: 1, maxPowerW: 3, maxTempC: 175, thermalResistanceCA: 60 },
  },
  {
    id: "nxp-bat43",
    manufacturer: "NXP",
    partNumber: "BAT43",
    name: "BAT43",
    spec: "DO-35 · 30V · 200mA · Schottky",
    type: "diode",
    properties: { forwardVoltage: 0.25, maxCurrent: 0.2, reverseVoltage: 30, powerRating: 0.25 },
    ratedThresholds: { maxVoltageV: 30, maxCurrentA: 0.2, maxPowerW: 0.25, maxTempC: 150, thermalResistanceCA: 300 },
  },
  {
    id: "vishay-1n5819",
    manufacturer: "Vishay",
    partNumber: "1N5819",
    name: "1N5819",
    spec: "DO-41 · 40V · 1A · Schottky",
    type: "diode",
    // Vishay General Semiconductor 1N581x sheet: maximum instantaneous forward
    // voltage 0.600 V at 1.0 A for the 1N5819 (0.450 V for the 5817, 0.550 V
    // for the 5818), 40 V repetitive peak reverse, 1.0 A average rectified,
    // 25 A non-repetitive surge, 150 C junction. The 0.34 V this card used to
    // carry was not on that sheet in any column: the maker's own 1 A figure is
    // 0.600 V, and a Schottky is not a 0.3 V device at an amp.
    properties: { forwardVoltage: 0.6, maxCurrent: 1, reverseVoltage: 40, powerRating: 2.5 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/88523/1n5817.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Vishay's 0.600 V maximum forward drop at 1 A and its 40 V and 1 A ratings. The engine uses a fixed drop rather than this part's I-V curve, so the 0.90 V the sheet gives at 3 A is not shown. The 2.5 W dissipation is the app's own figure: this sheet states no power dissipation for the part. Surge current is carried as a rating, not simulated.",
    },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1, maxPowerW: 2.5, maxTempC: 150, thermalResistanceCA: 50 },
  },

  {
    id: "diodes-inc-1n5819",
    manufacturer: "Diodes Incorporated",
    partNumber: "1N5819",
    name: "1N5819 Schottky barrier rectifier",
    spec: "DO-41 · Schottky · 40V · 1.0A · VF 0.60V at 1A · 25A surge",
    type: "diode",
    // Diodes Incorporated data sheet DS23001 Rev. 10-2 (April 2023), 1N5819
    // column: VRRM 40 V, VR(RMS) 28 V, average rectified output current 1.0 A
    // at TL = +90 °C, non-repetitive peak forward surge 25 A for one 8.3 ms
    // half sine, forward voltage 0.60 V at 1.0 A and 0.90 V at 3.0 A, peak
    // reverse leakage 1.0 mA at 25 °C and 10 mA at 100 °C at the rated
    // blocking voltage, typical total capacitance 110 pF, typical
    // junction-to-ambient 50 °C/W. The 0.60 V is the sheet's own figure at
    // 1 A: a textbook 0.3 V Schottky drop would halve the heat in a bridge.
    properties: { forwardVoltage: 0.6, maxCurrent: 1, reverseVoltage: 40 },
    source: {
      publisher: "Diodes Incorporated",
      url: "https://www.diodes.com/assets/Datasheets/ds23001.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Diodes' 0.60 V forward drop at 1 A and its 40 V blocking rating. The engine holds one forward drop rather than this part's I-V curve, so the 0.90 V the sheet specifies at 3 A is not shown, and the 110 pF junction capacitance and the 25 A surge rating are carried as ratings: switching and inrush are not simulated.",
    },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1, thermalResistanceCA: 50 },
  },

  // ── BJTs

  {
    id: "nexperia-bc847b",
    manufacturer: "Nexperia",
    partNumber: "BC847B",
    name: "BC847B NPN transistor",
    spec: "SOT23 · NPN · 45V · 100mA · hFE 200–450 (group B) · VCEsat 200mV typ",
    type: "bjt",
    builderType: "bjt-npn",
    // Nexperia BC847 series data sheet, Rev. 13 (1 July 2022), group B column:
    // VCEO 45 V, VEBO 6 V, IC 100 mA, ICM 200 mA for a single pulse of 1 ms or
    // less, hFE 200 to 450 at VCE = 5 V and IC = 2 mA (290 typical), VCEsat
    // 90 mV typical and 200 mV maximum at 10 mA, 200 mV typical and 400 mV
    // maximum at 100 mA, VBE 580 to 700 mV, fT 100 MHz minimum, collector
    // capacitance 1.5 pF maximum, SOT23 (TO-236AB). The 290 here is the
    // sheet's typical group B gain, not its midpoint: an engine with one gain
    // has to pick one, and picking the typical is stated rather than implied.
    properties: { vce_max: 45, ic_max: 0.1, hfe: 290, vbe: 0.66 },
    source: {
      publisher: "Nexperia",
      url: "https://assets.nexperia.com/documents/data-sheet/BC847X_SER.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled as an NPN with Nexperia's 45 V and 100 mA limits and its typical group B gain of 290. The sheet gives a 200 to 450 spread across the same part number, and one gain cannot show that: two BC847Bs here behave identically, where two real ones need not. The 200 mA single-pulse peak, the 100 MHz transition frequency, the 1.5 pF collector capacitance and the 400 mV maximum saturation voltage at 100 mA are carried as ratings, not behaviours.",
    },
    ratedThresholds: { maxVoltageV: 45, maxCurrentA: 0.1 },
  },

  // ── BJTs ──────────────────────────────────────────────────────────────────
  {
    id: "on-semi-2n2222a",
    manufacturer: "ON Semiconductor",
    partNumber: "2N2222A",
    name: "2N2222A",
    spec: "TO-18 · NPN · 40V · 600mA · 625mW",
    type: "bjt",
    properties: { vce_max: 40, ic_max: 0.6, hfe: 100, vbe: 0.7, powerRating: 0.625 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 0.6, maxPowerW: 0.625, maxTempC: 200, thermalResistanceCA: 200 },
  },
  {
    id: "on-semi-2n3904",
    manufacturer: "ON Semiconductor",
    partNumber: "2N3904",
    name: "2N3904",
    spec: "TO-92 · NPN · 40V · 200mA",
    type: "bjt",
    properties: { vce_max: 40, ic_max: 0.2, hfe: 100, vbe: 0.65, powerRating: 0.625 },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 0.2, maxPowerW: 0.625, maxTempC: 150, thermalResistanceCA: 200 },
  },
  {
    id: "stmicro-bc547",
    manufacturer: "STMicroelectronics",
    partNumber: "BC547",
    name: "BC547",
    spec: "TO-92 · NPN · 45V · 100mA · 500mW",
    type: "bjt",
    // ST's BC547 datasheet (March 2003 revision): VCEO 45 V, VCBO 50 V,
    // VEBO 6 V, IC 100 mA, ICM 200 mA, Ptot 500 mW at 25 °C case, hFE 110–800
    // across the A/B/C gain groups, Tj 150 °C. `hfe` takes 110, the bottom of
    // the band, so the model needs more base current than the part typically
    // does rather than less.
    properties: { vce_max: 45, ic_max: 0.1, hfe: 110, vbe: 0.7, powerRating: 0.5 },
    source: {
      publisher: "STMicroelectronics",
      url: "http://www.kontest.ru/datasheet/stmicroelectronics/bc547cap.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with ST's 45 V, 100 mA, 500 mW and 110 minimum gain. The engine uses one fixed current gain rather than the part's gain curve, so a collector current other than 2 mA will not reproduce the sheet's hFE for that current. Read from a mirrored copy of ST's document; the figures are ST's, the copy is not.",
    },
    ratedThresholds: { maxVoltageV: 45, maxCurrentA: 0.1, maxPowerW: 0.5, maxTempC: 150, thermalResistanceCA: 250 },
  },
  {
    id: "on-semi-tip31c",
    manufacturer: "ON Semiconductor",
    partNumber: "TIP31C",
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
    partNumber: "IRF540N",
    name: "IRF540N",
    spec: "TO-220 · N-MOSFET · 100V · 33A",
    type: "mosfet",
    // Infineon datasheet Rev 2.1 (24 Jul 2026): V(BR)DSS 100 V, RDS(on) 44 mΩ
    // max at VGS 10 V, ID 33 A at 25 °C / 23 A at 100 °C, IDM 110 A, PD 130 W
    // at 25 °C case, VGS ±20 V, gate threshold 2.0–4.0 V, Tj −55 to +175 °C.
    // `vth` takes the top of the threshold band, so the model switches later
    // than a typical part rather than earlier — the safe way to be wrong.
    // Infineon's product page quotes 140 W for this part; the datasheet says
    // 130 W, and the datasheet is the document being cited here.
    properties: { vth: 4, rds_on: 0.044, id_max: 33, vds_max: 100, vgs_max: 20, powerRating: 130 },
    source: {
      publisher: "Infineon",
      url: "https://www.infineon.com/assets/row/public/documents/24/49/infineon-irf540n-datasheet-en.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Infineon's 44 mΩ on-resistance, 100 V rating and 130 W dissipation. RDS(on) is held at its 25 °C value: the app does not apply the datasheet's temperature coefficient, so a hot IRF540N here does not resist as much as the real one. Gate charge, body-diode recovery and avalanche ratings are carried as ratings, not simulated.",
    },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 33, maxPowerW: 130, maxTempC: 175, thermalResistanceCA: 0.92 },
  },
  {
    id: "vishay-si2302ads",
    manufacturer: "Vishay",
    partNumber: "SI2302ADS",
    name: "SI2302ADS",
    spec: "SOT-23 · N-MOSFET · 20V · 2.3A",
    type: "mosfet",
    // Vishay Siliconix document 71831, Rev. J: VDS 20 V, VGS +/- 8 V, continuous
    // drain current 2.4 A for 5 s and 2.1 A steady state at TA = 25 C, pulsed
    // 10 A, RDS(on) 0.060 ohm maximum at VGS = 4.5 V and 0.115 ohm at 2.5 V,
    // gate threshold 0.65 to 1.2 V, PD 0.9 W (5 s) and 0.7 W steady state,
    // RthJA 140 C/W (5 s) and 175 C/W steady state, TJ 150 C. The card used to
    // carry 2.3 A, 0.08 ohm, a 12 V gate limit and 138 C/W, none of which is on
    // the sheet; `vth` takes the top of the band, so it switches later than a
    // typical part rather than earlier.
    properties: { vth: 1.2, rds_on: 0.06, id_max: 2.1, vds_max: 20, vgs_max: 8, powerRating: 0.9 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/71831/si2302ads.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Vishay's 0.060 ohm maximum on-resistance at 4.5 V gate drive and its 2.1 A steady-state rating in free air. RDS(on) is held at its 25 C value, so a hot part here does not resist as much as the real one, and the 0.115 ohm at 2.5 V drive is carried as a figure rather than modelled: this engine treats the channel as fully enhanced.",
    },
    ratedThresholds: { maxVoltageV: 20, maxCurrentA: 2.1, maxPowerW: 0.9, maxTempC: 150, thermalResistanceCA: 175 },
  },
  {
    id: "on-semi-2n7000",
    manufacturer: "ON Semiconductor",
    partNumber: "2N7000",
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
    partNumber: "LM7805",
    name: "LM7805",
    spec: "TO-220 · 5V · 1.5A",
    type: "voltage_regulator",
    properties: { outputVoltage: 5, dropoutVoltage: 2, maxCurrent: 1.5, powerRating: 15 },
    ratedThresholds: { maxVoltageV: 35, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "ti-lm7812",
    manufacturer: "Texas Instruments",
    partNumber: "LM7812",
    name: "LM7812",
    spec: "TO-220 · 12V · 1.5A",
    type: "voltage_regulator",
    properties: { outputVoltage: 12, dropoutVoltage: 2, maxCurrent: 1.5, powerRating: 15 },
    ratedThresholds: { maxVoltageV: 35, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "ti-lm317",
    manufacturer: "Texas Instruments",
    partNumber: "LM317T",
    name: "LM317T",
    spec: "TO-220 · adj 1.2–37V · 1.5A",
    type: "voltage_regulator",
    // Texas Instruments datasheet Rev Z: output adjustable 1.25 V to 37 V,
    // more than 1.5 A, and 40 V as the maximum input-to-output differential —
    // that 40 V is the number that decides whether an unregulated wall supply
    // can feed it. `outputVoltage` is 5 V because the workspace needs one
    // setting for an adjustable part; the range is carried below.
    properties: {
      outputVoltage: 5, dropoutVoltage: 3, maxCurrent: 1.5, powerRating: 15,
      outputVoltageMin: 1.25, outputVoltageMax: 37, inputOutputMax: 40,
    },
    source: {
      publisher: "Texas Instruments",
      url: "https://www.ti.com/lit/ds/symlink/lm317.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled as a 5 V source for the workspace; the part actually adjusts from 1.25 V to 37 V and the sheet's 1.25 V is its reference, not a pin voltage students can read off. The 3 V dropout is the sheet's minimum input-to-output differential for regulation, not a measured dropout. Line and load regulation and the 1.5 A current limit shape are not simulated.",
    },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1.5, maxPowerW: 15, maxTempC: 125, thermalResistanceCA: 5 },
  },
  {
    id: "microchip-mcp1700-3v3",
    manufacturer: "Microchip",
    partNumber: "MCP1700-3302E/TO",
    name: "MCP1700-3302E/TO",
    spec: "TO-92 · 3.3V · 250mA · LDO",
    type: "voltage_regulator",
    // Microchip DS20001826F: input 2.3–6.0 V, 250 mA output, 178 mV typical
    // dropout at 250 mA, 1.6 µA typical quiescent current, ±0.4% typical output
    // accuracy. The 6.0 V input ceiling is what makes this an LDO for a 5 V or
    // single-cell rail, and the quiescent current is why a coin cell survives.
    properties: {
      outputVoltage: 3.3, dropoutVoltage: 0.178, maxCurrent: 0.25, powerRating: 1,
      inputVoltageMin: 2.3, quiescentCurrent: 1.6e-6,
    },
    source: {
      publisher: "Microchip",
      url: "https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP1700-Data-Sheet-20001826F.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Microchip's 3.3 V output, 250 mA limit and 178 mV dropout. The 1.6 µA quiescent current is carried as a rating: the app's regulator model does not add its own supply current, so a battery run here lasts marginally longer than the real part allows.",
    },
    ratedThresholds: { maxVoltageV: 6, maxCurrentA: 0.25, maxPowerW: 1, maxTempC: 125, thermalResistanceCA: 250 },
  },

  // ── Op-Amps ───────────────────────────────────────────────────────────────
  {
    id: "ti-lm358",
    manufacturer: "Texas Instruments",
    partNumber: "LM358N",
    name: "LM358N",
    spec: "DIP-8 · dual op-amp · 32V supply",
    type: "opamp",
    properties: { supplyVoltage: 32, slewRate: 0.6, gainBandwidth: 1e6, powerRating: 0.68 },
    ratedThresholds: { maxVoltageV: 32, maxPowerW: 0.68, maxTempC: 125, thermalResistanceCA: 100 },
  },
  {
    id: "ti-lm741",
    manufacturer: "Texas Instruments",
    partNumber: "LM741CN",
    name: "LM741CN",
    spec: "DIP-8 · single op-amp · 18V supply",
    type: "opamp",
    properties: { supplyVoltage: 18, slewRate: 0.5, gainBandwidth: 1e6, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 18, maxPowerW: 0.5, maxTempC: 125, thermalResistanceCA: 100 },
  },
  {
    id: "analog-devices-op07",
    manufacturer: "Analog Devices",
    partNumber: "OP07CP",
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
    partNumber: "NE555P",
    name: "NE555P",
    spec: "DIP-8 · timer · 4.5–16V",
    type: "ic",
    properties: { supplyVoltage: 16, maxCurrent: 0.2, powerRating: 0.6 },
    ratedThresholds: { maxVoltageV: 16, maxCurrentA: 0.2, maxPowerW: 0.6, maxTempC: 70, thermalResistanceCA: 70 },
  },
  {
    id: "microchip-pic12f675",
    manufacturer: "Microchip",
    partNumber: "PIC12F675-I/P",
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
    partNumber: "CDRH4D28-470",
    name: "CDRH4D28-470",
    spec: "SMD shielded · 47µH · 700mA sat · 0.22Ω DCR",
    type: "inductor",
    properties: { inductance: 47e-6, dcResistance: 0.22, saturationCurrentA: 0.7, powerRating: 0.5 },
    ratedThresholds: { maxCurrentA: 0.7, maxPowerW: 0.5, maxTempC: 125, thermalResistanceCA: 55 },
  },
  {
    id: "bourns-srr1260-101y",
    manufacturer: "Bourns",
    partNumber: "SRR1260-101Y",
    name: "SRR1260-101Y",
    spec: "SMD shielded · 100µH · 2.1A sat · 0.061Ω DCR",
    type: "inductor",
    properties: { inductance: 100e-6, dcResistance: 0.061, saturationCurrentA: 2.1, powerRating: 1 },
    ratedThresholds: { maxCurrentA: 2.1, maxPowerW: 1, maxTempC: 125, thermalResistanceCA: 35 },
  },
  {
    id: "vishay-ihlp2020-10uh",
    manufacturer: "Vishay",
    partNumber: "IHLP2020BZER100M5A",
    name: "IHLP2020BZER100M5A",
    spec: "SMD shielded · 10µH · 4.6A sat · 0.023Ω DCR",
    type: "inductor",
    properties: { inductance: 10e-6, dcResistance: 0.023, saturationCurrentA: 4.6, powerRating: 1.5 },
    ratedThresholds: { maxCurrentA: 4.6, maxPowerW: 1.5, maxTempC: 125, thermalResistanceCA: 25 },
  },

  {
    id: "wurth-744031100",
    manufacturer: "Würth Elektronik",
    partNumber: "744031100",
    name: "WE-TPC 744031100 power inductor",
    spec: "3.8 × 3.8 × 1.65mm · shielded · 10µH ±30% · 0.74A rated · 185mΩ DCR · 45MHz",
    type: "inductor",
    // Würth Elektronik's own data sheet for 744031100 (WE-TPC SMT shielded
    // tiny power inductor): 10 µH ±30% at 100 kHz / 100 mV, rated current
    // 0.74 A maximum at ΔT = 30 K, saturation current 0.56 A typical at
    // |ΔL/L| < 35%, DC resistance 185 mΩ typical and 205 mΩ maximum at 20 °C,
    // self-resonant frequency 45 MHz typical, 3.8 × 3.8 × 1.65 mm, ambient
    // −40 to +95 °C referred to the rated current. Both currents are carried:
    // 0.74 A is where it gets hot, 0.56 A is where it stops being an
    // inductor, and they are 0.18 A apart.
    properties: { inductance: 10e-6, dcResistance: 0.185, saturationCurrentA: 0.56 },
    source: {
      publisher: "Würth Elektronik",
      url: "https://www.we-online.com/components/products/datasheet/744031100.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Würth's 10 µH inductance and 185 mΩ typical DC resistance, so the copper loss shown is this part's own. The model does not roll inductance off with current, so the 0.56 A saturation point is carried as a rating rather than a behaviour: a real 744031100 above 0.56 A stops being a 10 µH inductor, and this one stays 10 µH. The 45 MHz self-resonance and 205 mΩ maximum DCR are carried as figures.",
    },
    ratedThresholds: { maxCurrentA: 0.74, minTempC: -40, maxTempC: 95 },
  },

  // ── Fuses ─────────────────────────────────────────────────────────────────
  {
    id: "littelfuse-251001",
    manufacturer: "Littelfuse",
    partNumber: "251001",
    name: "PICO II very fast-acting fuse",
    spec: "subminiature axial · 1A · 125V · very fast-acting · I²t 0.256 A²s · 128mΩ cold",
    type: "fuse",
    // Littelfuse 251 Series data sheet, the 1.00 A row of the electrical
    // specifications table: ordering number 251001, 125 V maximum, 50 A
    // interrupting at 125 VAC (300 A at 125 VDC), nominal cold resistance
    // 0.128 ohm, nominal melting I2t 0.256 A2s, nominal voltage drop 0.194 V.
    // This card used to carry 250 V, 1 A2s and 0.02 ohm — the voltage was the
    // 218 series' by mistake, and neither of the other two is on this sheet.
    properties: {
      ratedCurrentA: 1,
      meltingI2t: 0.256,
      resistance: 0.128,
      voltageRatingV: 125,
      breakingCapacityA: 50,
    },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/assetdocs/fuse-251-datasheet?assetguid=f47a0bb7-8ede-4679-9646-7114c3787688",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with CircuiTry3D's generic fuse engine at Littelfuse's 1 A rating, reporting the published 0.256 A2s melting I2t as the let-through energy. The 251 is very fast-acting, and the engine opens as soon as current passes the rating anyway, so the 1 s maximum the sheet allows at 200 percent is not shown. The 50 A interrupting rating at 125 VAC is carried as a figure, not as arc-quenching behaviour.",
    },
    ratedThresholds: { maxVoltageV: 125, maxCurrentA: 1, maxTempC: 125 },
  },
  {
    id: "littelfuse-250500",
    manufacturer: "Littelfuse",
    partNumber: "250500",
    name: "250500",
    spec: "axial · 500mA · 250V · fast blow · glass",
    type: "fuse",
    properties: { ratedCurrentA: 0.5, meltingI2t: 0.25, resistance: 0.04 },
    ratedThresholds: { maxVoltageV: 250, maxCurrentA: 0.5, maxTempC: 125 },
  },
  {
    id: "schurter-ato-5a",
    manufacturer: "Schurter",
    partNumber: "0034.3512",
    name: "0034.3512",
    spec: "ATO blade · 5A · 32V · automotive",
    type: "fuse",
    properties: { ratedCurrentA: 5, meltingI2t: 25, resistance: 0.006 },
    ratedThresholds: { maxVoltageV: 32, maxCurrentA: 5, maxTempC: 125 },
  },

  // ── Fuses, from the makers the outreach tracker has already written to ─────
  {
    id: "eaton-s505-5-r",
    manufacturer: "Eaton",
    partNumber: "S505-5-R",
    name: "S505 series time-delay fuse",
    spec: "5 × 20mm ceramic · 5A · 250VAC · 1500A breaking · I²t 71.30 A²s · 13.1mΩ cold",
    type: "fuse",
    // Eaton's own S505 data sheet (Technical Data 2037, October 2020): 5.0 A,
    // 250 VAC, 1500 A interrupting rating, typical 0.0131 Ω cold resistance,
    // typical 71.30 A²s pre-arcing I²t at 10× rated current, 77.5 mV typical
    // drop at rated current. No temperature limits are carried: the sheet gives
    // a derating curve, not a figure that can be cited as a limit.
    properties: {
      ratedCurrentA: 5,
      meltingI2t: 71.3,
      resistance: 0.0131,
      voltageRatingV: 250,
      breakingCapacityA: 1500,
    },
    source: {
      publisher: "Eaton",
      url: "https://www.eaton.com/content/dam/eaton/products/electronic-components/resources/data-sheet/eaton-s505-ferrule-time-delay-ceramic-tube-fuses-data-sheet.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with CircuiTry3D's generic fuse engine at Eaton's 5 A rating, reporting the published 71.30 A²s pre-arcing I²t as let-through energy. The S505 is time-delay: the sheet allows 10× rated current for up to 150 ms, while this engine opens as soon as current passes the rating, so an inrush a real S505 rides through will clear this one. The 1500 A interrupting rating is carried as a figure, not as arc-quenching behaviour.",
    },
    ratedThresholds: { maxCurrentA: 5, maxVoltageV: 250 },
  },
  {
    id: "schurter-fst-5x20-5a",
    manufacturer: "Schurter",
    partNumber: "0034.3124",
    name: "FST 5x20 time-lag fuse",
    spec: "5 × 20mm glass · time-lag T · 5A · 250VAC · I²t 102 A²s · 100mV drop at 5A",
    type: "fuse",
    // Schurter's FST 5x20 data sheet: the 5 A variant (0034.3124) is rated
    // 250 VAC, time-lag T to IEC 60127-2, glass tube, low breaking capacity,
    // typical melting I²t 102 A²s at 10× In, 100 mV maximum drop at 1.0 In,
    // admissible ambient −55 to +125 °C, 1 g. The sheet publishes voltage drop
    // and not resistance, so the 0.02 Ω is that 100 mV maximum divided by 5 A
    // — arithmetic on Schurter's figure, and labelled as ours below. No
    // breaking capacity is carried: the series spans 35 A to 200 A and this
    // variant's own interrupting rating is not stated on its row.
    properties: { ratedCurrentA: 5, meltingI2t: 102, voltageRatingV: 250, resistance: 0.02 },
    source: {
      publisher: "Schurter",
      url: "https://www.schurter.com/en/datasheet/typ_FST_5x20.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Schurter's 5 A rating and the 102 A²s typical melting I²t of this variant, so the engine reports that let-through energy and opens above 5 A. The 0.02 Ω here is Schurter's 100 mV maximum drop at 5 A divided by 5 A, not a published resistance. Time-lag T and the series' 35 A to 200 A breaking capacity are carried as ratings, not behaviours: an inrush a real FST survives can trip this one, and the engine cannot show a glass body failing to contain an arc it was never rated for.",
    },
    ratedThresholds: { maxCurrentA: 5, maxVoltageV: 250, minTempC: -55, maxTempC: 125 },
  },
  {
    id: "mersen-fr10gg50v20",
    manufacturer: "Mersen",
    partNumber: "FR10GG50V20",
    name: "FR10GG50V20 gG fuse-link",
    spec: "10 × 38mm ceramic · gG · 20A · 500VAC / 250VDC · 120kA breaking",
    type: "fuse",
    // Mersen's own product page for item D211028: cylindrical fuse-link gG,
    // size 10 × 38 mm, 20 A, 500 VAC IEC, 250 VDC IEC, AC maximum breaking
    // capacity 120 kA, DC maximum 100 kA at 250 V with L/R = 15 ms, ceramic
    // body, silver-plated copper ferrules, clip mounting, Ø10.3 × 38 mm.
    // Melting I²t is on the linked gG datasheet, not on the page, and is not
    // carried rather than estimated.
    properties: { ratedCurrentA: 20, voltageRatingV: 500, breakingCapacityA: 120000 },
    source: {
      publisher: "Mersen",
      url: "https://www.mersen.com/en/products/ferrule-fuse-links-10x38-gg-400-690vac/d211028-fr10gg50v20",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Mersen's 20 A rating, its 500 VAC and the 120 kA breaking capacity, so the engine opens above 20 A and reports no let-through energy: this entry carries no melting I²t, because Mersen publishes it on the gG datasheet rather than on the page the figures came from. gG is an inverse-time characteristic — a real one carries a modest overload for a while before it clears — so an overload this engine trips on instantly is one Mersen's part would have ridden out.",
    },
    ratedThresholds: { maxCurrentA: 20, maxVoltageV: 500 },
  },

  {
    id: "bel-fuse-5et-2-r",
    manufacturer: "Bel Fuse",
    partNumber: "5ET 2-R",
    name: "5ET 2-R time-lag fuse",
    spec: "5 × 20mm glass · time-lag · 2A · 250VAC · 150A breaking · IEC 60127-2 sheet 6",
    type: "fuse",
    // Bel Fuse 5ET/5ETP data sheet (Rev. 5ET Dec 2023): 5 × 20 mm glass tube,
    // time-lag, IEC 60127-2 standard sheet 6, rated 250 VAC, interrupting
    // rating 150 A at 250 VAC across the 1 A to 6.3 A ratings. Pre-arcing from
    // the same sheet: 1.5 × In holds 1 hr minimum, 2.1 × In clears within
    // 2 min, 2.75 × In 600 ms to 10 s, 4 × In 150 ms to 3 s, 10 × In 20 ms to
    // 300 ms. No cold resistance and no melting I²t are carried: this sheet
    // publishes neither, and a figure borrowed from another fuse would be a
    // figure from another part.
    properties: { ratedCurrentA: 2, voltageRatingV: 250, breakingCapacityA: 150 },
    source: {
      publisher: "Bel Fuse",
      url: "https://www.belfuse.com/media/datasheets/products/circuit-protection/ds-cp-5et-5etp-series.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Bel's 2 A rating and 250 VAC, so the engine opens as soon as current passes 2 A. The sheet allows 10× rated current for 20 to 300 ms and 2.1× for up to two minutes, and none of that window exists here: an inrush the real 5ET rides through will clear this one. No let-through energy is reported, because Bel publishes no melting I²t for this series. The 150 A interrupting rating is carried as a figure, not as arc-quenching behaviour.",
    },
    ratedThresholds: { maxCurrentA: 2, maxVoltageV: 250 },
  },

  // ── Crystals ──────────────────────────────────────────────────────────────
  // No ratedThresholds: these were merged in from the Builder's own list, which
  // never carried datasheet limits. Left absent rather than invented — FUSE reads
  // this field, so a guessed number would fail a part at the wrong point.
  {
    id: "abracon-abls-16mhz",
    manufacturer: "Abracon",
    partNumber: "ABLS-16.000MHZ-B4-T",
    name: "ABLS-16.000MHZ-B4-T",
    spec: "HC-49/US · 16MHz · 18pF · ±20ppm",
    type: "crystal",
    properties: { frequency: 16000000 },
  },
  {
    id: "ecs-8mhz",
    manufacturer: "ECS",
    partNumber: "ECS-80-20-4X",
    name: "ECS-80-20-4X",
    spec: "HC-49/US · 8MHz · 20pF · ±30ppm",
    type: "crystal",
    properties: { frequency: 8000000 },
  },

  // ── Thermistors ───────────────────────────────────────────────────────────
  {
    id: "vishay-ntcle100-10k",
    manufacturer: "Vishay",
    partNumber: "NTCLE100E3103JB0",
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
    manufacturer: "ON Semiconductor",
    partNumber: "2N3906",
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
    // TE's T9A series datasheet (Rev 2, Jun 2022) and the product page for this
    // ordering code: code D 1 W coil, 12 VDC rated, 144 Ω ±10%, must-operate
    // 9 VDC, must-release 1.2 VDC, coil insulation class F (155 °C); one form A
    // contact, 30 A limiting continuous, 277 VAC rated switching, 75 mΩ initial
    // contact resistance, 1500 Vrms dielectric, 15/15 ms operate/release. The
    // 9 V must-operate is the number that matters with a sagging supply: a
    // 12 V coil is not a 12 V-only coil.
    properties: {
      coilVoltage: 12, maxCurrent: 30, maxVoltage: 277,
      coilResistance: 144, coilPower: 1, mustOperateV: 9, mustReleaseV: 1.2,
      contactResistance: 0.075, operateMs: 15, releaseMs: 15,
    },
    source: {
      publisher: "TE Connectivity",
      url: "https://www.te.com/usa-en/product-T9AS1D22-12.html",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled as a generic electromagnetic relay at TE's own coil and contact ratings. The coil is treated as its rated 144 Ω, so it does not drop out as the supply sags toward the sheet's 9 V must-operate; contact bounce, arc duration and the 10⁶-operation mechanical life are not simulated. The relay switches; it does not wear.",
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

  // ── Littelfuse seed catalog ────────────────────────────────────────────────
  {
    id: "littelfuse-0218-250mxp",
    manufacturer: "Littelfuse",
    partNumber: "0218.250MXP",
    name: "218 series cartridge fuse",
    spec: "5 × 20mm time-lag · 250mA · 250VAC · 35A breaking · I²t 0.5405 A²s · 1.0495Ω cold",
    type: "fuse",
    // Every figure here is off Littelfuse's own 218-series datasheet and product
    // page for 0218.250, not typical values: 250 mA rated, 250 VAC, 35 A
    // interrupting rating (low-breaking-capacity glass cartridge), nominal
    // melting I²t 0.5405 A²s, nominal cold resistance 1.0495Ω, -55 to +125°C.
    properties: {
      ratedCurrentA: 0.25,
      meltingI2t: 0.5405,
      resistance: 1.0495,
      voltageRatingV: 250,
      breakingCapacityA: 35,
    },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/products/fuses-overcurrent-protection/fuses/cartridge-fuses/5x20mm-fuses-cartridge-fuses/218/0218-250",
    },
    simulation: {
      // IEC 60127-2 Sheet 3 time-lag fuse. The engine opens the element on a
      // current threshold, not on the published time-current curve, so a real
      // inrush that a 218 would ride through will open this one. Say so rather
      // than let the model look more faithful than it is.
      status: "modeled",
      detail:
        "Modeled with CircuiTry3D's generic fuse engine at the datasheet rating: it opens above 250 mA and reports the 0.5405 A²s melting I²t as the let-through energy. Littelfuse's time-current curve is not modeled, so an inrush a real 218 would survive can trip this one, and the 35 A interrupting rating is carried as a rating rather than as an arc-quenching behavior.",
    },
    ratedThresholds: { maxCurrentA: 0.25, maxVoltageV: 250, maxTempC: 125, minTempC: -55 },
  },
  {
    id: "littelfuse-1812l110-16dr",
    manufacturer: "Littelfuse",
    partNumber: "1812L110/16DR",
    name: "1812L series PPTC",
    spec: "resettable PPTC · 1.10A hold · 1.95A trip · 16V",
    type: "pptc",
    properties: { holdCurrentA: 1.1, tripCurrentA: 1.95, maxVoltage: 16 },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/assetdocs/resettable-ptcs-1812l-datasheet?assetguid=ca5c80cb-504e-4a8a-8e74-0107520a1717",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current fuse model is permanent-blow and does not represent PPTC trip resistance or reset behavior.",
    },
  },
  {
    id: "littelfuse-smf5-0a",
    manufacturer: "Littelfuse",
    partNumber: "SMF5.0A",
    name: "SMF TVS diode",
    spec: "surface-mount TVS diode · 5V",
    type: "tvs",
    properties: { standoffVoltageV: 5 },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/products/overvoltage-protection/tvs-diodes/surface-mount/smf/smf5-0a",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current diode model does not represent transient clamping or surge energy behavior.",
    },
  },
  {
    id: "littelfuse-smbj24a",
    manufacturer: "Littelfuse",
    partNumber: "SMBJ24A",
    name: "SMBJ TVS diode",
    spec: "surface-mount TVS diode · 24V",
    type: "tvs",
    properties: { standoffVoltageV: 24 },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/products/overvoltage-protection/tvs-diodes/surface-mount/smbj/smbj24a",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current diode model does not represent transient clamping or surge energy behavior.",
    },
  },
  {
    id: "littelfuse-sp0502bahtg",
    manufacturer: "Littelfuse",
    partNumber: "SP0502BAHTG",
    name: "SP05 ESD/TVS array",
    spec: "two-channel ESD / TVS diode array",
    type: "esd_array",
    properties: { channels: 2 },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/assetdocs/tvs-diode-array-spasp050xba-lead-freegreen-datasheet?assetguid=15a03de1-f0c6-457a-95f1-55d449fdd756",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The engine does not model multi-channel ESD or transient suppression behavior.",
    },
  },
  {
    id: "littelfuse-v14e275p",
    manufacturer: "Littelfuse",
    partNumber: "V14E275P",
    name: "UltraMOV varistor",
    spec: "radial-leaded varistor · 275VAC",
    type: "varistor",
    properties: { acVoltageRatingV: 275 },
    source: {
      publisher: "Littelfuse",
      url: "https://www.littelfuse.com/products/overvoltage-protection/varistors/radial-leaded-varistors/ultramov/v14e275p",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The engine does not model varistor nonlinear clamping or surge aging behavior.",
    },
  },

  // ── Vishay seed catalog ────────────────────────────────────────────────────
  {
    id: "vishay-1n4148w-e3-08",
    manufacturer: "Vishay",
    partNumber: "1N4148W-E3-08",
    name: "1N4148W fast switching diode",
    spec: "fast switching diode · 100V",
    type: "diode",
    // Vishay document 85748, current revision (Apr 2026): VRRM 100 V, VR 75 V,
    // average rectified current 250 mA, continuous forward 300 mA, surge 500 mA
    // for 1 s, 280 mW on FR-4, VF 1 V at 10 mA and 1.2 V at 100 mA, 25 nA
    // leakage at 20 V, 4 ns recovery, junction 150 °C. Older revisions of the
    // same document said 150 mA and 350 mW; the current one is what is entered
    // here, and the difference is exactly why a part needs a revision date.
    properties: { forwardVoltage: 1.0, maxCurrent: 0.3, reverseVoltage: 100, powerRating: 0.28 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/86356/1n4148w.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Vishay's 1 V forward drop, 300 mA continuous rating and 280 mW dissipation. The engine uses a fixed forward drop rather than this part's I-V curve, so it will not show the 1.2 V at 100 mA that the sheet specifies, and the 4 ns recovery time is carried as a rating only: switching speed is not simulated.",
    },
    ratedThresholds: { maxVoltageV: 100, maxCurrentA: 0.3, maxPowerW: 0.28, maxTempC: 150 },
  },
  {
    id: "vishay-ss14-e3-61t",
    manufacturer: "Vishay",
    partNumber: "SS14-E3/61T",
    name: "SS14 Schottky rectifier",
    spec: "Schottky diode · 40V · 1A",
    type: "diode",
    properties: { reverseVoltage: 40, maxCurrent: 1 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/doc/?88746",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled as a generic diode for education; the simulator does not use this part's Schottky I-V curve.",
    },
    ratedThresholds: { maxVoltageV: 40, maxCurrentA: 1 },
  },
  {
    id: "vishay-smaj5-0a-e3-61",
    manufacturer: "Vishay",
    partNumber: "SMAJ5.0A-E3/61",
    name: "SMAJ TVS diode",
    spec: "surface-mount TVS diode · 5V",
    type: "tvs",
    properties: { standoffVoltageV: 5 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/88390/smaj50a.pdf",
    },
    simulation: {
      status: "reference-only",
      detail: "Reference only. The current diode model does not represent transient clamping or surge energy behavior.",
    },
  },
  {
    id: "vishay-crcw060310k0fkea",
    manufacturer: "Vishay",
    partNumber: "CRCW060310K0FKEA",
    name: "CRCW 0603 resistor",
    spec: "0603 thick-film resistor · 10kΩ · 1%",
    type: "resistor",
    // Vishay document 20035 (D/CRCW e3), read through a distributor's copy of it
    // because vishay.com refuses automated fetches: the 0603 size is rated
    // 0.10 W at 70 °C, limiting element voltage 75 V, ±1% and ±100 ppm/K, and
    // −55 to +155 °C. The 75 V limit is the one that catches students out — a
    // 10 kΩ 0603 asked to drop more than that arcs across the body first.
    properties: { resistance: 10000, powerRating: 0.1, tolerance: 0.01, tcr: 100e-6 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/20035/dcrcwe3.pdf",
    },
    simulation: {
      status: "modeled",
      detail:
        "Modeled with Vishay's resistance, tolerance, 0.10 W rating and 75 V limiting element voltage. The 100 ppm/K temperature coefficient is carried as a rating: the app's resistor model does not drift with temperature, so a hot resistor here stays at its cold value.",
    },
    ratedThresholds: { maxPowerW: 0.1, maxVoltageV: 75, maxTempC: 155 },
  },
  {
    id: "vishay-vj0603y104kxxat",
    manufacturer: "Vishay",
    partNumber: "VJ0603Y104KXXAT",
    name: "VJ 0603 MLCC",
    spec: "0603 MLCC · 100nF · 16V · X7R",
    type: "capacitor",
    properties: { capacitance: 100e-9, maxVoltage: 16 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/en/product/45199/",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled with sourced capacitance and voltage; dielectric bias effects and ESR are not part-specific in the current model.",
    },
    ratedThresholds: { maxVoltageV: 16 },
  },
  {
    id: "vishay-ihlp2525czer100m01",
    manufacturer: "Vishay",
    partNumber: "IHLP2525CZER100M01",
    name: "IHLP power inductor",
    spec: "shielded power inductor · 10µH",
    type: "inductor",
    properties: { inductance: 10e-6 },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/34335/ihlp-2525cz-5a.pdf",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled with sourced inductance; saturation, DCR, and thermal behavior remain generic until separately sourced and modeled.",
    },
  },
  {
    id: "vishay-siss52dn",
    manufacturer: "Vishay",
    partNumber: "SiSS52DN",
    name: "SiSS52DN N-channel MOSFET",
    spec: "N-channel power MOSFET · 30V · 47.1A free air (162A on a heatsink) · 1.2mΩ max · PowerPAK 1212-8S",
    type: "mosfet",
    // Free-air ratings from the datasheet (TA = 25 °C): the part on the bench with
    // no heatsink. The case-mounted figures (162 A, 57 W, RthJC 2.2 °C/W) are the
    // headline numbers on the datasheet, but they assume a heatsink the Arena
    // bench does not have.
    properties: {
      vds_max: 30,
      vgs_max: 16,
      vth: 2.2,
      rds_on: 0.0012,
      id_max: 47.1,
      powerRating: 4.8,
      thermalResistance: 26,
      qg: 43.2,
      maxTempC: 150,
    },
    source: {
      publisher: "Vishay",
      url: "https://www.vishay.com/docs/79977/siss52dn.pdf",
    },
    simulation: {
      status: "modeled",
      detail: "Modeled on the datasheet's absolute maximum ratings at TA = 25 °C (free air, no heatsink): 47.1 A, 4.8 W, RthJA 26 °C/W, TJ 150 °C. Educational model; transfer and switching curves are not simulated.",
    },
    ratedThresholds: {
      maxVoltageV: 30,
      maxCurrentA: 47.1,
      maxPowerW: 4.8,
      maxTempC: 150,
      thermalResistanceCA: 26,
    },
  },

  // ── Logic / ICs ───────────────────────────────────────────────────────────
  // The 3D workspace has no `ic` part (no case in legacy.html's
  // getDefaultProperties or createMesh), so these do not appear in the Builder
  // library. They stay here for the Arena, which does model them.
  {
    id: "ti-74hc595",
    manufacturer: "Texas Instruments",
    partNumber: "SN74HC595N",
    name: "SN74HC595N",
    spec: "DIP-16 · 8-bit shift register · 2–6V",
    type: "ic",
    properties: { supplyVoltage: 6, maxCurrent: 0.07, powerRating: 0.5 },
    ratedThresholds: { maxVoltageV: 7, maxTempC: 125 },
  },
  {
    id: "ti-cd4011be",
    manufacturer: "Texas Instruments",
    partNumber: "CD4011BE",
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
 *
 * Every part also carries its datasheet temperature limit as `maxTempC` when the
 * catalog has one (`ratedThresholds.maxTempC`, else `properties.maxTempC`). The
 * Builder's thermal readout and F.U.S.E. use it in place of the family limit;
 * the workspace merges it over its defaults, so an LED still gets its default
 * resistance.
 */
export function toWorkspaceProperties(part: CatalogComponent): Record<string, number> {
  return {
    ...familyWorkspaceProperties(part),
    ...defined({ maxTempC: datasheetMaxTempC(part) }),
  };
}

/** The part's datasheet temperature limit (°C), if the catalog has one. */
function datasheetMaxTempC(part: CatalogComponent): number | undefined {
  const fromThresholds = part.ratedThresholds?.maxTempC;
  if (typeof fromThresholds === "number") return fromThresholds;
  const fromProps = (part.properties as Record<string, unknown>).maxTempC;
  return typeof fromProps === "number" ? fromProps : undefined;
}

function familyWorkspaceProperties(part: CatalogComponent): Record<string, number> {
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
      // `current` is what the workspace nameplate prints and what its mesh badges.
      // The other two are what FUSE actually reads to decide the element's fate:
      // without `ratedCurrentA` the engine fell back to its own 1 A default, so a
      // 250 mA cartridge fuse held on to 1.1 A — four times its rating — and then
      // blew like a 1 A part. `meltingI2t` is the let-through energy it reports.
      return defined({
        current: p.ratedCurrentA,
        ratedCurrentA: p.ratedCurrentA,
        meltingI2t: p.meltingI2t,
      });
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
