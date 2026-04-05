// ─── Manufacturer Component Schema ────────────────────────────────────────────
// Shared TypeScript types for real-world manufacturer component specs imported
// into the Component Arena.  The arena's JS importer accepts any object that
// satisfies ManufacturerComponent; the types here enforce correctness on the
// React side of the bridge.

// ── Per-family electrical property bags ─────────────────────────────────────

export interface ResistorProperties {
  resistance: number;       // Ohms
  tolerance?: number;       // 0–1 fraction (0.05 = 5 %)
  tempCoeff?: number;       // ppm/°C expressed as fraction/°C
  powerRating?: number;     // Watts
  thermalResistance?: number; // °C/W
}

export interface CapacitorProperties {
  capacitance: number;      // Farads
  maxVoltage?: number;      // V
  esr?: number;             // Ohms (Equivalent Series Resistance)
  tempCoeff?: number;       // fraction/°C
  thermalResistance?: number;
}

export interface InductorProperties {
  inductance: number;       // Henrys
  dcResistance?: number;    // Ohms (DCR)
  saturationCurrentA?: number;
  thermalResistance?: number;
}

export interface LEDProperties {
  forwardVoltage: number;   // V
  seriesResistance?: number; // Ohms
  efficiency?: number;      // 0–1
  thermalResistance?: number;
  wavelengthNm?: number;    // dominant wavelength
  luminousEfficacy?: number; // lm/W
}

export interface FuseProperties {
  ratedCurrentA: number;
  meltingI2t?: number;      // A²·s (pre-arcing I²t)
  resistance?: number;      // Ohms (cold)
  thermalResistance?: number;
  fuseClass?: "fast-blow" | "slow-blow" | "time-delay" | "semiconductor";
  voltageRatingV?: number;
  breakingCapacityA?: number;
}

export interface MOSFETProperties {
  vth: number;              // Gate threshold voltage (V)
  rds_on: number;           // On-state drain-source resistance (Ohms)
  id_max: number;           // Max continuous drain current (A)
  vds_max: number;          // Max drain-source voltage (V)
  vgs_max: number;          // Max gate-source voltage (V)
  powerRating?: number;     // Watts
  thermalResistance?: number; // θJA °C/W
  qg?: number;              // Gate charge (nC)
  coss?: number;            // Output capacitance (pF)
}

export interface BJTProperties {
  vce_max: number;          // V
  ic_max: number;           // A
  hfe: number;              // DC current gain
  vbe?: number;             // Base-emitter voltage (V)
  powerRating?: number;
  thermalResistance?: number;
}

export interface DiodeProperties {
  forwardVoltage: number;   // V
  maxCurrent: number;       // A
  reverseVoltage?: number;  // V (PIV)
  forwardResistance?: number;
  thermalResistance?: number;
  powerRating?: number;
}

export interface OpAmpProperties {
  supplyVoltage?: number;
  slewRate?: number;        // V/µs
  gainBandwidth?: number;   // Hz
  powerRating?: number;
  thermalResistance?: number;
}

export interface VoltageRegulatorProperties {
  outputVoltage: number;
  dropoutVoltage?: number;
  maxCurrent?: number;
  powerRating?: number;
  thermalResistance?: number;
  maxTempC?: number;
}

export interface RelayProperties {
  coilVoltage: number;
  coilResistance?: number;
  maxSwitchCurrent?: number;
  maxSwitchVoltage?: number;
  thermalResistance?: number;
}

export interface BatteryProperties {
  voltage: number;
  internalResistance?: number;
  capacityMah?: number;
  thermalResistance?: number;
}

export interface GenericProperties {
  [key: string]: number | string | boolean | undefined;
}

// Tagged union of all property bags
export type ComponentProperties =
  | ResistorProperties
  | CapacitorProperties
  | InductorProperties
  | LEDProperties
  | FuseProperties
  | MOSFETProperties
  | BJTProperties
  | DiodeProperties
  | OpAmpProperties
  | VoltageRegulatorProperties
  | RelayProperties
  | BatteryProperties
  | GenericProperties;

// ── Component type identifiers ───────────────────────────────────────────────

export type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "led"
  | "fuse"
  | "mosfet"
  | "bjt"
  | "bjt-npn"
  | "bjt-pnp"
  | "diode"
  | "zener_diode"
  | "opamp"
  | "ic"
  | "voltage_regulator"
  | "relay"
  | "battery"
  | "switch"
  | "heatsink"
  | "lamp"
  | "motor"
  | "thermistor"
  | "transformer"
  | "crystal"
  | string; // allow extension for custom types

// ── Manufacturer component spec ───────────────────────────────────────────────

export interface ManufacturerComponent {
  /** Mandatory: manufacturer part number, e.g. "IRF540N" */
  partNumber: string;
  /** Mandatory: manufacturer name, e.g. "Infineon" */
  manufacturer: string;
  /** Mandatory: FailureEngine-compatible component type */
  type: ComponentType;
  /** Human-readable display name */
  name: string;
  /** Electrical properties — validated against per-family interface above */
  properties: ComponentProperties;

  // ── Optional fields ─────────────────────────────────────────────────────
  /** Stable unique ID (auto-generated from partNumber+manufacturer if absent) */
  id?: string;
  /** URL to manufacturer datasheet PDF */
  datasheetUrl?: string;
  /** Package type, e.g. "TO-220", "0402", "SOIC-8" */
  packageType?: string;
  /** Product series / family name */
  seriesName?: string;
  /** Standards/certifications, e.g. ["AEC-Q101", "RoHS"] */
  certifications?: string[];
  /** Absolute maximum ratings (any numeric key → value) */
  absoluteMaxRatings?: Record<string, number>;
  /** Recommended operating conditions */
  recommendedOperatingConditions?: Record<string, number>;
  /** Free-text application notes */
  notes?: string;
  /** Optional pre-computed composition data for FUSE™ analysis */
  composition?: Record<string, unknown>;
}

// ── Manufacturer catalog envelope ────────────────────────────────────────────

export interface ManufacturerCatalog {
  /** Schema/version identifier, e.g. "circuitry-catalog-v1" */
  vendor: string;
  /** Semantic version of this catalog data, e.g. "1.0.0" */
  version: string;
  /** ISO 8601 timestamp when this catalog was generated/exported */
  exportedAt: string;
  /** Array of component specs — all must satisfy ManufacturerComponent */
  components: ManufacturerComponent[];
}

// ── Arena bridge message types ────────────────────────────────────────────────

export type FuseAlertLevel = "none" | "warn" | "critical";

export interface ArenaMetricsUpdate {
  type: "arena:metrics-update";
  componentId: string;
  metrics: {
    powerDissipation: number;
    currentRms: number;
    thermalRise: number;
    impedance: number;
    efficiency: number | null;
  };
}

export interface ArenaFuseEvent {
  type: "arena:fuse-event";
  severity: FuseAlertLevel;
  componentId: string;
  failureModes: string[];
}

export interface ArenaStatusMessage {
  type: "arena:status";
  message: string;
  testRunning: boolean;
  componentCount: number;
}

export interface ArenaNavigateMessage {
  type: "arena:navigate";
  path: string;
}

export type ArenaOutboundMessage =
  | ArenaMetricsUpdate
  | ArenaFuseEvent
  | ArenaStatusMessage
  | ArenaNavigateMessage;

// ── Context state shape (used by ArenaContext) ───────────────────────────────

export interface ArenaContextState {
  activeComponentId: string | null;
  fuseAlertLevel: FuseAlertLevel;
  testRunning: boolean;
  lastExportAt: string | null;
  componentCount: number;
}
