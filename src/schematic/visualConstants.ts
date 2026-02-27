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
 *
 * CRITICAL PILLAR: These constants define the canonical layout rules for ALL
 * circuit diagrams throughout CircuiTry3D. Consistency is paramount.
 *
 * Layout Principles:
 * 1. Component Centering: Components are centered within their allocated space
 * 2. Even Distribution: Components distributed evenly around the circuit path
 * 3. Uniform Spacing: Consistent gaps between adjacent components
 * 4. Orthogonal Routing: All wires use 90° angles only
 */
export const LAYOUT_SPECS = {
  // SVG viewBox standard
  viewBoxWidth: 600,
  viewBoxHeight: 240,

  // Circuit frame positioning (2D SVG)
  leftMargin: 80,             // Battery position (left side)
  rightMargin: 520,           // Right side of circuit frame (default)
  rightMarginExtended: 560,   // Extended right margin for 4+ parallel branches
  topMargin: 55,
  bottomMargin: 185,

  // Battery positioning - UNIFIED across all circuit types
  batteryScale: 0.85,         // Scale factor for battery symbol (USE THIS EVERYWHERE)
  batteryHalfSpan: 25.5,      // batteryScale * 30 = actual half-span
  batteryLabelOffset: 28,     // Label distance from battery

  // Component spacing
  resistorMinGap: 30,         // Minimum gap between resistors
  branchSpacing: 72,          // Default spacing between parallel branches
  branchSpacingMin: 50,       // Minimum branch spacing for dense layouts

  // Wire routing
  wireCornerRadius: 0,        // 90° angles only (orthogonal routing)
  orthogonalOnly: true,       // Enforce 90° angles per style guide
} as const;

/**
 * Series Circuit Layout Standards
 *
 * Series circuits form a single continuous path with no branching nodes.
 * Components are distributed evenly around the rectangular frame.
 *
 * Layout Pattern:
 * - Battery on left side (vertical orientation)
 * - Components distributed across top, right, and bottom sides
 * - Corner nodes at each turn of the rectangular path
 *
 * Distribution Rules:
 * - 2 components: top and bottom
 * - 3 components: top, right, bottom
 * - 4+ components: divided among top (ceil(n/3)), right, and bottom
 */
export const SERIES_LAYOUT = {
  // 3D coordinate bounds (for presets.ts)
  bounds3D: {
    left: -4.4,
    right: 4.4,
    top: 2.7,
    bottom: -2.7,
  },

  // 2D SVG coordinate frame (for CircuitDiagram.tsx)
  frame2D: {
    leftX: LAYOUT_SPECS.leftMargin,
    rightX: LAYOUT_SPECS.rightMargin,
    topY: LAYOUT_SPECS.topMargin,
    bottomY: LAYOUT_SPECS.bottomMargin,
  },

  // Component distribution margins
  margins: {
    // Margin from corner for 2-component layout
    twoComponent: {
      horizontal: 60,  // SVG units
      horizontal3D: 0.8,  // 3D units
    },
    // Margin from corner for 3-component layout
    threeComponent: {
      horizontal: 40,  // SVG units
      horizontal3D: 0.8,  // 3D units
      vertical: 30,    // SVG units (right side resistor)
      vertical3D: 0.6,  // 3D units
    },
    // Dynamic margins for 4+ components (proportional to spacing)
    multiComponent: {
      marginRatio: 0.15,     // 15% of available spacing
      maxHorizontal: 0.4,    // Max margin for top/bottom (3D)
      maxVertical: 0.3,      // Max margin for right side (3D)
      maxHorizontal2D: 10,   // Max margin gap in SVG units
    },
  },

  // Component count distribution formula for 4+ resistors
  distribution: {
    // topCount = Math.ceil(count / 3)
    // rightCount = count - topCount - bottomCount
    // bottomCount = Math.ceil((count - topCount) / 2)
    getTopCount: (total: number) => Math.ceil(total / 3),
    getBottomCount: (total: number, topCount: number) => Math.ceil((total - topCount) / 2),
    getRightCount: (total: number, topCount: number, bottomCount: number) => total - topCount - bottomCount,
  },
} as const;

/**
 * Parallel Circuit Layout Standards
 *
 * Parallel circuits have two common nodes (supply and return rails)
 * with branches extending vertically between them.
 *
 * Layout Pattern:
 * - Battery on left side
 * - Horizontal rails on top and bottom
 * - Vertical branches evenly distributed between rails
 * - Junction nodes at every branch connection point
 *
 * Distribution Rules:
 * - Branches spaced evenly across available width
 * - Branch spacing formula: totalWidth / (branchCount + 1)
 * - Labels alternate left/right for clarity when branches are close
 */
export const PARALLEL_LAYOUT = {
  // 3D coordinate bounds
  bounds3D: {
    left: -2.6,
    right: 3.8,
    top: 2.5,
    bottom: -2.5,
  },

  // 2D SVG positioning
  frame2D: {
    leftX: LAYOUT_SPECS.leftMargin,
    rightXDefault: LAYOUT_SPECS.rightMargin,
    rightXExtended: LAYOUT_SPECS.rightMarginExtended,  // For 4+ branches
    topY: LAYOUT_SPECS.topMargin,
    bottomY: LAYOUT_SPECS.bottomMargin,
  },

  // Branch positioning
  branches: {
    // Resistor vertical offset from rail (SVG)
    topOffset2D: 26,
    bottomOffset2D: 26,
    // 3D offset calculation
    minVerticalSpan3D: 4.2,  // Max span for branch resistor
    minOffset3D: 0.6,        // Minimum offset from rail
  },

  // Spacing calculation
  spacing: {
    // Formula: (railEnd - railStart - margin) / (branchCount + 1)
    marginOffset2D: 100,  // Total margin from left rail edge
    startOffset2D: 50,    // Offset for first branch position
  },
} as const;

/**
 * Combination (Series-Parallel) Circuit Layout Standards
 *
 * Combination circuits have both series and parallel sections.
 * The canonical layout is the "ladder" pattern.
 *
 * Standard Ladder Pattern:
 * - R1 in series on top rail
 * - Parallel section (R2 || R3) in middle
 * - R4 in series on bottom rail (optional)
 *
 * Alternative: Double Parallel
 * - (R1 || R2) section followed by (R3 || R4) section in series
 */
export const COMBINATION_LAYOUT = {
  // 3D coordinate bounds
  bounds3D: {
    left: -4.2,
    right: 3.8,
    top: 2.3,
    bottom: -2.3,
  },

  // 2D SVG positioning
  frame2D: {
    leftX: LAYOUT_SPECS.leftMargin,
    rightX: 540,  // Slightly narrower for combination
    topY: LAYOUT_SPECS.topMargin,
    bottomY: LAYOUT_SPECS.bottomMargin,
  },

  // Series resistor positioning
  seriesResistor: {
    // Standard ladder: center X for parallel section
    branchCenterXWithBottom: 420,    // When R4 exists on bottom
    branchCenterXNoBottom: 460,      // When no bottom series resistor
    // Series resistor endpoints
    startOffset2D: 50,               // From left margin
    endOffsetFromCenter2D: 80,       // Gap before parallel section
    // 3D positioning
    series3DStart: -2.4,
    series3DEnd: -0.4,
  },

  // Parallel section
  parallelSection: {
    // Branch spacing calculation
    maxSpacing2D: 72,                // Maximum branch spacing (matches LAYOUT_SPECS)
    spacingDivisor2D: 140,           // For formula: Math.min(maxSpacing, divisor / count)
    maxSpacing3D: 1.8,
    spacingDivisor3D: 3.6,
    // Branch center X position (3D)
    branchCenterX3D: 1.4,
    // Vertical resistor offsets
    topOffset2D: 26,
    bottomOffset2D: 28,
    topOffset3D: 0.6,
    bottomOffset3D: 0.6,
    // Connection points (when bottom series exists)
    bottomConnectionY3D: -0.3,
  },

  // Double-parallel layout (two parallel boxes stacked in series)
  doubleParallel: {
    // 2D layout (matches textbook screenshot: stacked top/bottom boxes)
    centerX2D: 420,
    branchSpacing2D: 56,           // Horizontal spacing between left/right branch resistors
    topNodeY2D: LAYOUT_SPECS.topMargin,
    midNodeY2D: (LAYOUT_SPECS.topMargin + LAYOUT_SPECS.bottomMargin) / 2,
    bottomNodeY2D: LAYOUT_SPECS.bottomMargin,
    leadInset2D: 24,               // Gap from node rail to resistor body

    // 3D layout (same topology as 2D)
    centerX3D: 1.4,
    branchSpacing3D: 1.6,
    topNodeZ3D: 2.3,
    midNodeZ3D: 0,
    bottomNodeZ3D: -2.3,
    leadInset3D: 0.6,
  },
} as const;

/**
 * Centralized battery rendering parameters
 * Use these constants instead of local values
 */
export const BATTERY_LAYOUT = {
  // Scale factor - USE THIS SINGLE VALUE everywhere
  scale: LAYOUT_SPECS.batteryScale,
  // Half-span in SVG units (30 * scale)
  halfSpan2D: 30 * LAYOUT_SPECS.batteryScale,
  // 3D positioning offsets
  offset3D: {
    fromCorner: 0.9,  // Gap from corner to battery terminal
  },
  // Label positioning
  labelOffset: LAYOUT_SPECS.batteryLabelOffset,
  // Polarity marker display
  showPolarity: true,
} as const;

/**
 * Calculate component centering position
 * Centers a component between two points
 */
export const centerComponent = (start: number, end: number): number => {
  return (start + end) / 2;
};

/**
 * Calculate even distribution positions for N components
 * Returns array of center positions for each component
 */
export const distributeEvenly = (
  start: number,
  end: number,
  count: number,
  marginRatio: number = 0.15,
  maxMargin: number = Infinity
): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [centerComponent(start, end)];

  const totalSpan = end - start;
  const spacing = totalSpan / count;
  const margin = Math.min(spacing * marginRatio, maxMargin);

  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    // Center position for component i
    const componentStart = start + i * spacing + margin;
    const componentEnd = start + (i + 1) * spacing - margin;
    positions.push(centerComponent(componentStart, componentEnd));
  }
  return positions;
};

/**
 * Calculate parallel branch positions
 * Distributes branches evenly across available width
 */
export const calculateBranchPositions = (
  railStart: number,
  railEnd: number,
  branchCount: number,
  marginOffset: number = 0
): number[] => {
  if (branchCount <= 0) return [];

  const availableWidth = railEnd - railStart - marginOffset;
  const spacing = availableWidth / (branchCount + 1);
  const startPosition = railStart + spacing + marginOffset / 2;

  const positions: number[] = [];
  for (let i = 0; i < branchCount; i++) {
    positions.push(startPosition + i * spacing);
  }
  return positions;
};

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
