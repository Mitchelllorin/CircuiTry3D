import type { BoardLimits } from "./types";

export const SNAP_STEP = 0.5;

export const MIN_SEGMENT_LENGTH = SNAP_STEP;

export const BOARD_LIMITS: BoardLimits = {
  minX: -7.5,
  maxX: 7.5,
  minZ: -5.5,
  maxZ: 5.5
};

export const BOARD_PADDING = 1.25; // world units added around the board for SVG framing

export const NODE_RADIUS_UNITS = 0.18;

export const STROKE_WIDTH_UNITS = 0.12;

export const RESISTOR_ZIG_COUNT = 6;

export const RESISTOR_AMPLITUDE_UNITS = 0.5;

export const LABEL_OFFSET_UNITS = 0.9;

