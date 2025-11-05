import { Orientation } from "./types";

export type SymbolStandard = "ansi-ieee" | "iec";

export type SymbolStandardProfile = {
  resistor: {
    bodyStyle: "zigzag" | "rectangle";
    zigzagSegments: number;
    zigzagAmplitude: number;
    leadFraction: number;
    minBodyLength: number;
    bodyThickness: number;
    bodyDepth: number;
  };
  capacitor: {
    plateGap: number;
    plateThickness: number;
    plateWidth: number;
    plateHeight: number;
    leadFraction: number;
    showPolarityMarkers: boolean;
  };
  battery: {
    plateGap: number;
    positivePlateWidth: number;
    negativePlateWidth: number;
    plateHeight: number;
    plateThickness: number;
    showPolarityMarkers: boolean;
  };
  inductor: {
    coilCount: number;
    coilRadius: number;
    coilTubeRadius: number;
    coilArc: number;
    leadFraction: number;
  };
  switch: {
    bladeAngle: number;
    contactRadius: number;
    bladeThickness: number;
    bladeWidth: number;
    leadFraction: number;
    contactGap: number;
  };
  lamp: {
    ringRadius: number;
    ringTube: number;
    discThickness: number;
    crossThickness: number;
  };
  general: {
    leadMin: number;
    leadMax: number;
    strokeRadius: number;
    nodeRadius: number;
  };
};

export const DEFAULT_SYMBOL_STANDARD: SymbolStandard = "ansi-ieee";

export const STANDARD_PROFILES: Record<SymbolStandard, SymbolStandardProfile> = {
  "ansi-ieee": {
    resistor: {
      bodyStyle: "zigzag",
      zigzagSegments: 6,
      zigzagAmplitude: 0.35,
      leadFraction: 0.22,
      minBodyLength: 1.1,
      bodyThickness: 0.22,
      bodyDepth: 0.5,
    },
    capacitor: {
      plateGap: 0.28,
      plateThickness: 0.08,
      plateWidth: 1.2,
      plateHeight: 0.52,
      leadFraction: 0.2,
      showPolarityMarkers: true,
    },
    battery: {
      plateGap: 0.35,
      positivePlateWidth: 1.3,
      negativePlateWidth: 0.7,
      plateHeight: 0.52,
      plateThickness: 0.08,
      showPolarityMarkers: true,
    },
    inductor: {
      coilCount: 4,
      coilRadius: 0.46,
      coilTubeRadius: 0.045,
      coilArc: Math.PI * 1.1,
      leadFraction: 0.2,
    },
    switch: {
      bladeAngle: 32 * (Math.PI / 180),
      contactRadius: 0.16,
      bladeThickness: 0.1,
      bladeWidth: 0.42,
      leadFraction: 0.22,
      contactGap: 0.18,
    },
    lamp: {
      ringRadius: 0.55,
      ringTube: 0.02,
      discThickness: 0.045,
      crossThickness: 0.06,
    },
    general: {
      leadMin: 0.35,
      leadMax: 0.8,
      strokeRadius: 0.055,
      nodeRadius: 0.12,
    },
  },
  iec: {
    resistor: {
      bodyStyle: "rectangle",
      zigzagSegments: 6,
      zigzagAmplitude: 0.32,
      leadFraction: 0.25,
      minBodyLength: 0.9,
      bodyThickness: 0.24,
      bodyDepth: 0.46,
    },
    capacitor: {
      plateGap: 0.22,
      plateThickness: 0.07,
      plateWidth: 1.1,
      plateHeight: 0.5,
      leadFraction: 0.24,
      showPolarityMarkers: false,
    },
    battery: {
      plateGap: 0.32,
      positivePlateWidth: 1.1,
      negativePlateWidth: 0.6,
      plateHeight: 0.5,
      plateThickness: 0.07,
      showPolarityMarkers: false,
    },
    inductor: {
      coilCount: 3,
      coilRadius: 0.44,
      coilTubeRadius: 0.045,
      coilArc: Math.PI,
      leadFraction: 0.24,
    },
    switch: {
      bladeAngle: 28 * (Math.PI / 180),
      contactRadius: 0.15,
      bladeThickness: 0.1,
      bladeWidth: 0.4,
      leadFraction: 0.24,
      contactGap: 0.16,
    },
    lamp: {
      ringRadius: 0.55,
      ringTube: 0.02,
      discThickness: 0.045,
      crossThickness: 0.05,
    },
    general: {
      leadMin: 0.3,
      leadMax: 0.7,
      strokeRadius: 0.05,
      nodeRadius: 0.12,
    },
  },
};

const DEFAULT_PROFILE = STANDARD_PROFILES[DEFAULT_SYMBOL_STANDARD];

export const SYMBOL_STANDARD_OPTIONS: { key: SymbolStandard; label: string; description: string }[] = [
  {
    key: "ansi-ieee",
    label: "ANSI/IEEE",
    description: "North American zigzag resistor, explicit polarity marks",
  },
  {
    key: "iec",
    label: "IEC",
    description: "International rectangular resistor, neutral polarity",
  },
];

export const resolveSymbolStandard = (value: SymbolStandard | string | null | undefined): SymbolStandard => {
  if (!value) {
    return DEFAULT_SYMBOL_STANDARD;
  }
  if (value === "ansi" || value === "ieee") {
    return "ansi-ieee";
  }
  return (value === "ansi-ieee" || value === "iec") ? value : DEFAULT_SYMBOL_STANDARD;
};

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
    summary:
      "Defines reference designations and symbol geometry for passive components including alignment of leads and proportional stroke weight.",
  },
  {
    standard: "iec",
    id: "IEC 60617",
    title: "Graphical symbols for diagrams",
    clause: "Part 2 — Symbols for passive components",
    summary:
      "Specifies international symbology for resistors, capacitors, inductors, switches, sources, and grounding with mandatory spacing and stroke proportions.",
  },
  {
    standard: "ansi",
    id: "ANSI/ASME Y32.2-1975",
    title: "Graphic Symbols for Electrical and Electronics Diagrams",
    clause: "Section 5",
    summary:
      "Harmonises American usage with IEEE conventions, maintaining zig-zag resistors, polarised capacitors, and open-blade switches with defined lead clearances.",
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
  strokeRadius: DEFAULT_PROFILE.general.strokeRadius,
  wireRadius: DEFAULT_PROFILE.general.strokeRadius,
  nodeRadius: DEFAULT_PROFILE.general.nodeRadius,
  wireHeight: 0.12,
  componentHeight: 0.16,
  labelHeight: 0.4,
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
