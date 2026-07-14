import { Orientation } from "./types";

export type SymbolStandardId = "ieee" | "iec" | "ansi";

export type SymbolStandardReference = {
  id: string;
  standard: SymbolStandardId;
  title: string;
  clause: string;
  summary: string;
};

export const SCHEMATIC_STANDARD_REFERENCES: SymbolStandardReference[] = [
  {
    standard: "ieee",
    id: "IEEE Std 315-1975",
    title: "Graphic Symbols for Electrical and Electronics Diagrams",
    clause: "Clause 4",
    summary: "Defines reference designations and symbol geometry for passive components including alignment of leads and proportional stroke weight.",
  },
  {
    standard: "iec",
    id: "IEC 60617",
    title: "Graphical symbols for diagrams",
    clause: "Part 2 — Symbols for passive components",
    summary: "Specifies international symbology for resistors, capacitors, inductors, switches, sources, and grounding with mandatory spacing and stroke proportions.",
  },
  {
    standard: "ansi",
    id: "ANSI/ASME Y32.2-1975",
    title: "Graphic Symbols for Electrical and Electronics Diagrams",
    clause: "Section 5",
    summary: "Harmonises American usage with IEEE conventions, maintaining zig-zag resistors, polarised capacitors, and open-blade switches with defined lead clearances.",
  },
];

export type AxisSpec = {
  bodyFraction: number;
  minBodyLength: number;
  minLeadFraction: number;
};

const createAxisSpec = (bodyFraction: number, minBodyLength: number, minLeadFraction: number): AxisSpec => ({
  bodyFraction,
  minBodyLength,
  minLeadFraction,
});

export const AXIS_SPECS = {
  resistor: createAxisSpec(0.58, 0.78, 0.12),
  capacitor: createAxisSpec(0.54, 0.76, 0.14),
  battery: createAxisSpec(0.56, 0.84, 0.15),
  inductor: createAxisSpec(0.6, 0.8, 0.12),
  lamp: createAxisSpec(0.42, 0.62, 0.12),
  switch: createAxisSpec(0.55, 0.82, 0.18),
} as const;

export const SYMBOL_DIMENSIONS = {
  strokeRadius: 0.05,
  wireRadius: 0.05,
  nodeRadius: 0.12,
  wireHeight: 0.12,
  componentHeight: 0.16,
  labelHeight: 0.42,
} as const;

export type ResistorSpec = {
  axis: AxisSpec;
  zigZagCount: number;
  amplitudeRatio: number;
  amplitudeMin: number;
  amplitudeMax: number;
  iecBodyHeight: number;
  iecBodyDepthPadding: number;
  iecBodyDepthMin: number;
};

export type CapacitorSpec = {
  axis: AxisSpec;
  plateHeight: number;
  plateDepth: number;
  dielectricHeight: number;
  dielectricDepth: number;
  sectionRatios: {
    plate: number;
    gap: number;
  };
};

export type BatterySpec = {
  axis: AxisSpec;
  plateHeight: number;
  plateDepth: number;
  sectionRatios: {
    negative: number;
    gap: number;
    positive: number;
  };
  labelOffset: {
    axial: number;
    lateral: number;
    vertical: number;
  };
};

export type InductorSpec = {
  axis: AxisSpec;
  coilCount: number;
  coilRadius: number;
  coilTubeRadiusScale: number;
  coilArc: number;
  endClearance: number;
};

export type LampSpec = {
  axis: AxisSpec;
  discRadius: number;
  discThickness: number;
  ringRadius: number;
  ringTubeRadius: number;
  crossLength: number;
  crossThickness: number;
};

export type SwitchSpec = {
  axis: AxisSpec;
  postRadius: number;
  postHeight: number;
  postOffset: number;
  bladeRadius: number;
  bladeLength: number;
  bladeAngleDeg: number;
};

export type GroundSpec = {
  barWidths: number[];
  barSpacing: number;
  barThickness: number;
};

export const RESISTOR_SPEC: ResistorSpec = {
  axis: AXIS_SPECS.resistor,
  zigZagCount: 6,
  amplitudeRatio: 0.22,
  amplitudeMin: 0.16,
  amplitudeMax: 0.36,
  iecBodyHeight: 0.18,
  iecBodyDepthPadding: 0.12,
  iecBodyDepthMin: 0.6,
};

export const CAPACITOR_SPEC: CapacitorSpec = {
  axis: AXIS_SPECS.capacitor,
  plateHeight: 0.48,
  plateDepth: 1.05,
  dielectricHeight: 0.4,
  dielectricDepth: 0.92,
  sectionRatios: {
    plate: 0.28,
    gap: 0.44,
  },
};

export const BATTERY_SPEC: BatterySpec = {
  axis: AXIS_SPECS.battery,
  plateHeight: 0.18,
  plateDepth: 0.92,
  sectionRatios: {
    negative: 0.28,
    gap: 0.12,
    positive: 0.6,
  },
  labelOffset: {
    axial: 0.72,
    lateral: 0.82,
    vertical: 0.16,
  },
};

export const INDUCTOR_SPEC: InductorSpec = {
  axis: AXIS_SPECS.inductor,
  coilCount: 4,
  coilRadius: 0.44,
  coilTubeRadiusScale: 0.9,
  coilArc: Math.PI * 1.1,
  endClearance: 0.12,
};

export const LAMP_SPEC: LampSpec = {
  axis: AXIS_SPECS.lamp,
  discRadius: 0.52,
  discThickness: 0.04,
  ringRadius: 0.6,
  ringTubeRadius: 0.028,
  crossLength: 0.9,
  crossThickness: 0.04,
};

export const SWITCH_SPEC: SwitchSpec = {
  axis: AXIS_SPECS.switch,
  postRadius: 0.18,
  postHeight: 0.6,
  postOffset: 0.24,
  bladeRadius: 0.12,
  bladeLength: 1.6,
  bladeAngleDeg: 25,
};

export const GROUND_SPEC: GroundSpec = {
  barWidths: [1.2, 0.8, 0.4],
  barSpacing: 0.18,
  barThickness: 0.08,
};

export const resolveAxialVec2 = (orientation: Orientation, axisCoord: number, perpCoord: number) =>
  orientation === "horizontal"
    ? { x: axisCoord, z: perpCoord }
    : { x: perpCoord, z: axisCoord };

