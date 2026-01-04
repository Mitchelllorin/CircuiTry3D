/**
 * CircuiTry3D Schematic Module
 * ============================
 *
 * Central export point for all schematic-related constants, types, and utilities.
 * Import from this module for access to visual standards used throughout the app.
 *
 * @example
 * import { SCHEMATIC_COLORS, formatResistance, SymbolStandard } from '../schematic';
 */

// Visual constants and formatters
export {
  // Color palettes
  SCHEMATIC_COLORS,
  THREE_COLORS,
  LOGO_COLORS,

  // Stroke dimensions
  STROKE_WIDTHS,
  THREE_STROKE_RADII,

  // Node/junction dimensions
  NODE_DIMENSIONS,

  // Component specifications
  RESISTOR_SPECS,
  RESISTOR_IEC_SPECS,
  BATTERY_SPECS,
  CAPACITOR_SPECS,

  // Layout specifications
  LAYOUT_SPECS,

  // Label specifications
  LABEL_SPECS,

  // Height layers (3D)
  HEIGHT_LAYERS,

  // Symbol standards
  DEFAULT_SYMBOL_STANDARD,
  SYMBOL_STANDARD_OPTIONS,

  // Value formatters
  formatResistance,
  formatVoltage,
  formatCurrent,
  formatCapacitance,
  formatComponentLabel,

  // Types
  type SymbolStandard,
} from "./visualConstants";

// Symbol standard profiles and resolution
export {
  STANDARD_PROFILES,
  resolveSymbolStandard,
} from "./standards";

// Type definitions
export type {
  SymbolStandardProfile,
} from "./standards";

export type {
  SchematicElement,
  TwoTerminalElement,
  ThreeTerminalElement,
  MultiTerminalElement,
  WireElement,
  GroundElement,
  Orientation,
  Vec2,
} from "./types";

// Component catalog
export { COMPONENT_CATALOG } from "./catalog";

// Practice circuit builder
export { buildPracticeCircuit } from "./presets";

// 3D factory exports
export {
  WIRE_RADIUS,
  RESISTOR_RADIUS,
  NODE_RADIUS,
  WIRE_HEIGHT,
  COMPONENT_HEIGHT,
  LABEL_HEIGHT,
} from "./threeFactory";

// Current flow animation exports
export {
  CurrentFlowAnimationSystem,
  CURRENT_FLOW_PHYSICS,
  INTENSITY_COLORS,
  FLOW_MODE_APPEARANCE,
  type FlowMode,
  type CurrentIntensity,
  type CurrentFlowParticle,
  type FlowPathConfig,
} from "./currentFlowAnimation";

// Electrical visualization utilities (physics-based)
export {
  // Voltage visualization
  VOLTAGE_VISUALIZATION,
  getVoltageColor,
  getVoltageHeightOffset,
  getVoltageGlowIntensity,
  createVoltageMarkers,
  formatVoltageLabel,

  // Current flow visualization
  calculateCurrentFlowParams,

  // Power dissipation visualization (P = I²R)
  calculatePowerDissipation,
  calculateVoltageDrop,

  // Wire segment visualization
  createWireSegmentVisualizations,

  // Types
  type VoltageMarker,
  type CurrentFlowParams,
  type PowerDissipationParams,
  type WireSegmentVisualization,
} from "./electricalVisualization";
