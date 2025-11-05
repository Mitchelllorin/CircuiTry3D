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
