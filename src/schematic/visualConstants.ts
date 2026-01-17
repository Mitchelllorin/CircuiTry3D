/**
 * CircuiTry3D Visual Standards Constants
 * ======================================
 *
 * This file defines the canonical visual standards for all circuit rendering
 * throughout the application. These constants ensure consistency between:
 * - Practice problem diagrams (CircuitDiagram.tsx)
 * - 2D schematic symbols (SchematicSymbols.tsx)
 * - 3D schematic rendering (threeFactory.ts)
 * - Logo and branding (CircuitLogo.tsx)
 * - Any future circuit visualization components
 *
 * Reference: docs/schematic-style-guidelines.md
 * Reference Images: src/assets/reference-circuits/
 *
 * IMPORTANT: Modify these constants to change visual appearance app-wide.
 * Do not use magic numbers in individual components.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Primary colors for schematic elements (2D SVG rendering)
 * Used in practice diagrams and SVG-based schematic views
 */
export const SCHEMATIC_COLORS = {
  // Wire and connection colors
  wire: "rgba(162, 212, 255, 0.9)",          // Primary wire color
  wireHighlight: "#2563EB",                   // Selection/highlight blue
  wirePreview: "#94a3b8",                     // Preview/ghost state

  // Component stroke colors
  componentStroke: "rgba(148, 208, 255, 0.9)", // Default component outline
  componentFill: "none",                       // Components are typically unfilled

  // Junction node colors
  nodeFill: "rgba(162, 212, 255, 0.95)",      // Junction node fill
  nodeStroke: "rgba(12, 32, 64, 0.9)",        // Junction node outline

  // Label colors
  labelPrimary: "#d6ecff",                    // Component labels (R₁, Vs, etc.)
  labelValue: "#a8d8ff",                      // Value labels (100Ω, 24V, etc.)
  labelBackground: "rgba(255, 255, 255, 0.9)", // Label card background

  // Battery polarity markers
  polarityMarker: "#d6ecff",
} as const;

/**
 * 3D rendering colors (Three.js hex values)
 * Used in threeFactory.ts for 3D schematic mode
 */
export const THREE_COLORS = {
  stroke: 0x111111,           // Pure black strokes per style guide
  highlight: 0x2563eb,        // Selection highlight blue
  preview: 0x94a3b8,          // Preview/ghost state
  nodeFill: 0x111111,         // Junction node fill
  plate: 0x111111,            // Battery/capacitor plates
  dielectric: 0xededed,       // Capacitor dielectric gap
  lampRing: 0x111111,         // Lamp symbol outline
  lampFill: 0xffffff,         // Lamp symbol fill
  ground: 0x111111,           // Ground symbol
  labelText: "#111111",       // Label text color
} as const;

/**
 * Logo/branding colors (gradient-based)
 * Used in CircuitLogo.tsx for the app logo
 */
export const LOGO_COLORS = {
  wireGradientStart: "#88ccff",
  wireGradientEnd: "#00ff88",
  componentGradientStart: "#ff8844",
  componentGradientEnd: "#ff8844",
  nodeFill: "#00ff88",
  nodeStroke: "#0f172a",
  labelPrimary: "#88ccff",
  labelSecondary: "#94a3b8",
} as const;

// =============================================================================
// STROKE DIMENSIONS
// =============================================================================

/**
 * Stroke widths for 2D SVG rendering
 */
export const STROKE_WIDTHS = {
  // Wire stroke width
  wire: 4,                    // Standard wire thickness
  wireSvgSymbol: 3.2,         // Wire in SVG symbol components

  // Component strokes
  componentBody: 3.2,         // Main component body stroke
  componentDetail: 2.5,       // Fine details (battery plates, etc.)
  componentLeads: 3.2,        // Component lead wires

  // Node dimensions
  nodeStroke: 1.4,            // Junction node outline width
} as const;

/**
 * 3D rendering stroke radii (for tube/cylinder geometry)
 */
export const THREE_STROKE_RADII = {
  wire: 0.055,                // Wire tube radius
  resistor: 0.055,            // Resistor zigzag tube radius
  node: 0.12,                 // Junction node sphere radius
} as const;

// =============================================================================
// NODE/JUNCTION DIMENSIONS
// =============================================================================

/**
 * Junction node sizing
 */
export const NODE_DIMENSIONS = {
  // 2D SVG radius
  radius2D: 4.2,

  // 3D radius
  radius3D: 0.12,

  // Maximum ratio to wire thickness (node should not exceed wire × 3)
  maxWireRatio: 3,
} as const;

// =============================================================================
// RESISTOR SPECIFICATIONS
// =============================================================================

/**
 * Resistor rendering specifications (ANSI/IEEE zigzag style)
 * Reference: docs/schematic-style-guidelines.md
 */
export const RESISTOR_SPECS = {
  // Zigzag pattern
  zigzagSegments: 6,          // Number of complete peaks (4-6 per style guide)
  zigzagAmplitude: 8,         // Peak height in 2D SVG units
  zigzagAmplitude3D: 0.30,    // Peak height in 3D units

  // Body dimensions
  bodyHalfWidth: 20,          // Half-width of zigzag body (SVG)
  totalHalfSpan: 30,          // Total component span including leads (SVG)

  // Lead wire fractions
  leadFraction: 0.22,         // Fraction of total length for leads (3D)

  // SVG polyline points for standard zigzag
  // Creates 4 complete peaks: -20,0 to 20,0
  zigzagPoints: "-20,0 -16,-8 -10,8 -4,-8 2,8 8,-8 14,8 20,0",
} as const;

/**
 * IEC-style resistor (rectangular body)
 */
export const RESISTOR_IEC_SPECS = {
  bodyStyle: "rectangle",
  bodyWidth: 0.9,             // Body length in 3D units
  bodyThickness: 0.24,
  bodyDepth: 0.46,
  leadFraction: 0.25,
} as const;

// =============================================================================
// BATTERY SPECIFICATIONS
// =============================================================================

/**
 * Battery symbol specifications
 * Reference: Long plate = positive (+), short plate = negative (-)
 */
export const BATTERY_SPECS = {
  // Plate dimensions (SVG)
  positivePlateHeight: 36,    // Longer plate (positive)
  negativePlateHeight: 20,    // Shorter plate (negative)
  plateGap: 14,               // Gap between plates
  plateStrokeWidth: 3,        // Regular plate stroke
  positiveStrokeExtra: 2,     // Extra thickness for positive plate

  // 3D dimensions
  positivePlateWidth3D: 1.3,
  negativePlateWidth3D: 0.7,
  plateGap3D: 0.35,
  plateHeight3D: 0.52,
  plateThickness3D: 0.08,

  // Polarity markers
  showPolarityMarkers: true,  // Show +/- labels (ANSI/IEEE default)
} as const;

// =============================================================================
// CAPACITOR SPECIFICATIONS
// =============================================================================

export const CAPACITOR_SPECS = {
  // Plate dimensions (SVG)
  plateHeight: 36,            // Plate height
  plateGap: 16,               // Gap between plates

  // 3D dimensions
  plateGap3D: 0.28,
  plateThickness3D: 0.08,
  plateWidth3D: 1.2,
  plateHeight3D: 0.52,
  leadFraction: 0.2,
  showPolarityMarkers: true,  // For polarized capacitors
} as const;

// =============================================================================
// LAYOUT SPECIFICATIONS
// =============================================================================

/**
 * Circuit layout specifications for practice diagrams
 * Reference: docs/circuit-topology-reference.md
 */
export const LAYOUT_SPECS = {
  // SVG viewBox standard
  viewBoxWidth: 600,
  viewBoxHeight: 240,

  // Circuit frame positioning
  leftMargin: 80,             // Battery position (left side)
  rightMargin: 520,           // Right side of circuit frame
  topMargin: 55,
  bottomMargin: 185,

  // Battery positioning
  batteryScale: 0.85,         // Scale factor for battery symbol
  batteryLabelOffset: 28,     // Label distance from battery

  // Component spacing
  resistorMinGap: 30,         // Minimum gap between resistors
  branchSpacing: 72,          // Default spacing between parallel branches

  // Wire routing
  wireCornerRadius: 0,        // 90° angles only (orthogonal routing)
  orthogonalOnly: true,       // Enforce 90° angles per style guide
} as const;

// =============================================================================
// LABEL SPECIFICATIONS
// =============================================================================

/**
 * Label formatting and positioning
 */
export const LABEL_SPECS = {
  // Font sizes (SVG)
  componentLabelSize: 13,     // R₁, Vs, etc.
  valueLabelSize: 11,         // 100Ω, 24V, etc.
  polarityMarkerSize: 11,     // +/- symbols

  // Font weights
  labelWeight: 600,           // Bold for labels
  valueWeight: 500,           // Medium for values

  // Positioning
  horizontalLabelOffset: -26, // Above horizontal components
  verticalLabelOffset: 22,    // Beside vertical components

  // Value formatting
  useOmegaSymbol: true,       // Use Ω instead of "ohm"
  useSubscripts: true,        // Use R₁ instead of R1
  useSpaceBeforeUnit: true,   // "100 Ω" vs "100Ω"
} as const;

// =============================================================================
// HEIGHT LAYERS (3D)
// =============================================================================

/**
 * 3D rendering height layers
 */
export const HEIGHT_LAYERS = {
  wire: 0.12,                 // Wire height above board
  component: 0.16,            // Component body height
  label: 0.4,                 // Label sprite height
} as const;

// =============================================================================
// SYMBOL STANDARD DEFINITIONS
// =============================================================================

/**
 * Available symbol standards
 */
export type SymbolStandard = "ansi-ieee" | "iec";

/**
 * Default symbol standard (North American)
 */
export const DEFAULT_SYMBOL_STANDARD: SymbolStandard = "ansi-ieee";

/**
 * Symbol standard display options for UI
 */
export const SYMBOL_STANDARD_OPTIONS = [
  {
    key: "ansi-ieee" as SymbolStandard,
    label: "ANSI/IEEE",
    description: "North American zigzag resistor, explicit polarity marks",
  },
  {
    key: "iec" as SymbolStandard,
    label: "IEC",
    description: "International rectangular resistor, neutral polarity",
  },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format resistance value for display
 * Examples: "150 Ω", "1.5 kΩ", "2.2 MΩ"
 */
export const formatResistance = (value: number): string => {
  if (value >= 1000000) {
    const mOhms = value / 1000000;
    return `${mOhms % 1 === 0 ? mOhms.toFixed(0) : mOhms.toFixed(1)} MΩ`;
  } else if (value >= 1000) {
    const kOhms = value / 1000;
    return `${kOhms % 1 === 0 ? kOhms.toFixed(0) : kOhms.toFixed(1)} kΩ`;
  }
  return `${value} Ω`;
};

/**
 * Format voltage value for display
 * Examples: "24V", "5V", "12V"
 */
export const formatVoltage = (value: number): string => {
  return `${value}V`;
};

/**
 * Format current value for display
 * Examples: "2A", "500 mA", "1.5 A"
 */
export const formatCurrent = (value: number): string => {
  if (value < 0.001) {
    return `${(value * 1000000).toFixed(1)} μA`;
  } else if (value < 1) {
    return `${(value * 1000).toFixed(0)} mA`;
  }
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)} A`;
};

/**
 * Format capacitance value for display
 * Examples: "100 μF", "10 nF", "1 pF"
 */
export const formatCapacitance = (value: number): string => {
  if (value >= 1e-6) {
    return `${(value * 1e6).toFixed(value * 1e6 % 1 === 0 ? 0 : 1)} μF`;
  } else if (value >= 1e-9) {
    return `${(value * 1e9).toFixed(0)} nF`;
  }
  return `${(value * 1e12).toFixed(0)} pF`;
};

/**
 * Generate component label with subscript
 * Examples: "R₁", "R₂", "C₁"
 */
export const formatComponentLabel = (prefix: string, index: number): string => {
  const subscripts = "₀₁₂₃₄₅₆₇₈₉";
  const subscript = index.toString().split("").map(d => subscripts[parseInt(d)]).join("");
  return `${prefix}${subscript}`;
};
