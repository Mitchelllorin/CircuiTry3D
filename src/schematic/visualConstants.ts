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
 * Resistor rendering specifications (CircuiTry3D / ANSI-inspired zigzag style)
 * Reference: docs/schematic-style-guidelines.md
 *
 * CircuiTry3D Standard: "Three zig-zag schematic resistor body with labelled leads"
 * (Per component catalog description)
 */
export const RESISTOR_SPECS = {
  // Zigzag pattern
  zigzagSegments: 3,          // CircuiTry3D standard: 3 tight zig-zags
  zigzagAmplitude: 10,        // Peak height in 2D SVG units (tight zigzags)
  zigzagAmplitude3D: 0.30,    // Peak height in 3D units

  // Body dimensions
  bodyHalfWidth: 20,          // Half-width of zigzag body (SVG)
  totalHalfSpan: 30,          // Total component span including leads (SVG)

  // Lead wire fractions
  leadFraction: 0.22,         // Fraction of total length for leads (3D)

  // SVG polyline points for standard 3-peak zigzag: -20,0 to 20,0
  zigzagPoints: "-20,0 -10,-10 0,10 10,-10 20,0",

  // Integrated polyline (leads + zigzag in one stroke) for static SVG contexts (logo, favicon, splash)
  // Same 3-peak zigzag with lead wires baked into the single polyline path
  integratedPoints: "-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0",
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
// STANDARD CIRCUIT LAYOUT (Educational Square Loop)
// =============================================================================

/**
 * CircuiTry3D Standard Circuit Layout
 * ===================================
 *
 * This is the canonical layout format used throughout the application for
 * rendering circuits in both 2D and 3D views. It follows the standard
 * educational format used in schools, textbooks, and industry.
 *
 * LAYOUT RULES (must be followed for ALL circuit designs):
 * --------------------------------------------------------
 * 1. BATTERY on the LEFT SIDE (vertical orientation)
 *    - Positive terminal at top-left corner
 *    - Negative terminal at bottom-left corner
 *
 * 2. Components arranged around a SQUARE LOOP:
 *    - TOP RAIL: First component(s) after battery positive
 *    - RIGHT SIDE: Second component (if needed), vertical orientation
 *    - BOTTOM RAIL: Third/return component (if needed)
 *
 * 3. CORNERS (junction nodes) at standard positions:
 *    - Top-Left (TL): Connection from battery+ to top rail
 *    - Top-Right (TR): Connection from top rail to right side
 *    - Bottom-Right (BR): Connection from right side to bottom rail
 *    - Bottom-Left (BL): Connection from bottom rail to battery-
 *
 * 4. CURRENT FLOW direction (conventional):
 *    Battery+ → TL → TOP → TR → RIGHT → BR → BOTTOM → BL → Battery-
 *
 * 5. NO EMPTY SIDES (Rule C3D-011):
 *    - EVERY side of the circuit MUST have a component
 *    - Wires-only paths are NOT allowed in the standard layout
 *    - Series circuits require exactly 4 components (battery + 3 loads)
 *    - This rule is enforced by the circuit validator
 *
 * This format provides visual consistency and reinforces the mental model
 * of current flow for educational purposes.
 */

/**
 * Standard square loop layout dimensions for 3D rendering
 * Used in legacy.html PRESET_CIRCUITS and presets.ts
 */
export const CIRCUIT_LAYOUT_3D = {
  // Square loop corner coordinates (XZ plane, Y=0)
  corners: {
    topLeft: { x: -10, z: 6 },
    topRight: { x: 10, z: 6 },
    bottomRight: { x: 10, z: -6 },
    bottomLeft: { x: -10, z: -6 },
  },

  // Standard component positions
  positions: {
    // Battery: LEFT SIDE, centered vertically
    battery: { x: -10, y: 0, z: 0 },
    batteryRotation: Math.PI / 2, // 90° = vertical orientation

    // TOP RAIL component (switch, LED, R1)
    top: { x: 0, y: 0, z: 6 },
    topRotation: 0, // horizontal orientation

    // RIGHT SIDE component (R1 or R2)
    right: { x: 10, y: 0, z: 0 },
    rightRotation: Math.PI / 2, // vertical orientation

    // BOTTOM RAIL component (R2 or R3)
    bottom: { x: 0, y: 0, z: -6 },
    bottomRotation: 0, // horizontal orientation
  },

  // Junction positions (for wiring connections)
  junctions: {
    J_TL: { x: -10, y: 0, z: 6 },
    J_TR: { x: 10, y: 0, z: 6 },
    J_BR: { x: 10, y: 0, z: -6 },
    J_BL: { x: -10, y: 0, z: -6 },
  },
} as const;

/**
 * Standard square loop layout dimensions for 2D SVG rendering
 * Used in TroubleshootDiagram.tsx and CircuitDiagram.tsx
 */
export const CIRCUIT_LAYOUT_2D = {
  // SVG viewBox dimensions
  viewBox: {
    width: 280,
    height: 180,
    padding: 20,
  },

  // Square loop corner coordinates
  corners: {
    topLeft: { x: 50, y: 40 },
    topRight: { x: 230, y: 40 },
    bottomRight: { x: 230, y: 140 },
    bottomLeft: { x: 50, y: 140 },
  },

  // Standard component positions
  positions: {
    // Battery: LEFT SIDE, centered vertically between TL and BL
    battery: { x: 50, y: 90 },

    // TOP RAIL component (horizontal, centered between TL and TR)
    top: { x: 140, y: 40 },

    // RIGHT SIDE component (vertical, centered between TR and BR)
    right: { x: 230, y: 90 },

    // BOTTOM RAIL component (horizontal, centered between BR and BL)
    bottom: { x: 140, y: 140 },
  },

  // Component dimensions for layout calculations
  componentWidth: 60,  // Width of horizontal components
  componentHeight: 40, // Height of vertical components

  // Wire segment endpoints (for standard 3-component layout)
  wireSegments: {
    // Battery+ to top-left corner
    batteryToTL: { start: { x: 50, y: 82 }, end: { x: 50, y: 40 } },
    // Top-left corner to top component
    tlToTop: { start: { x: 50, y: 40 }, end: { x: 110, y: 40 } },
    // Top component to top-right corner
    topToTR: { start: { x: 170, y: 40 }, end: { x: 230, y: 40 } },
    // Top-right corner to right component
    trToRight: { start: { x: 230, y: 40 }, end: { x: 230, y: 70 } },
    // Right component to bottom-right corner
    rightToBR: { start: { x: 230, y: 110 }, end: { x: 230, y: 140 } },
    // Bottom-right to bottom-left corner
    brToBL: { start: { x: 230, y: 140 }, end: { x: 50, y: 140 } },
    // Bottom-left corner to battery-
    blToBattery: { start: { x: 50, y: 140 }, end: { x: 50, y: 98 } },
  },
} as const;

/**
 * Component placement helper for standard layouts
 * Maps component count to their positions in the square loop
 */
export type ComponentPlacement = {
  position: "left" | "top" | "right" | "bottom";
  orientation: "horizontal" | "vertical";
};

/**
 * CircuiTry3D Standard: No Empty Circuit Sides (Rule C3D-011)
 *
 * EVERY side of a series circuit must have a component. There should be no
 * side in a circuit where there is no component - this is the CircuiTry3D standard.
 *
 * Standard Square Loop Layout (4 components minimum):
 * - LEFT:   Battery (always present)
 * - TOP:    First load component (horizontal orientation)
 * - RIGHT:  Second load component (vertical orientation)
 * - BOTTOM: Third load component (horizontal orientation)
 *
 * This function ALWAYS returns 3 placements because the CircuiTry3D standard
 * requires components on all sides. Circuits with fewer than 3 load components
 * will be flagged by the circuit validator (C3D-011: insufficient_components).
 *
 * @param componentCount Number of non-battery components (should be 3 for standard circuits)
 * @returns Array of placements for all 3 positions (top, right, bottom)
 */
export function getStandardPlacements(componentCount: number): ComponentPlacement[] {
  // CircuiTry3D Standard: Always return all 3 positions
  // Every side of the circuit must have a component - no empty sides allowed
  // This is enforced by rule C3D-011 in the circuit validator
  return [
    { position: "top", orientation: "horizontal" },
    { position: "right", orientation: "vertical" },
    { position: "bottom", orientation: "horizontal" },
  ];
}

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
