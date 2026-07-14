import { BOARD_LIMITS, BOARD_PADDING } from "./config";
import type { Vec2 } from "./types";

const widthUnits = BOARD_LIMITS.maxX - BOARD_LIMITS.minX + BOARD_PADDING * 2;
const heightUnits = BOARD_LIMITS.maxZ - BOARD_LIMITS.minZ + BOARD_PADDING * 2;

export const BOARD_VIEWBOX = {
  width: widthUnits,
  height: heightUnits
};

export const getViewBoxString = () => `0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`;

export const toSvgPoint = (point: Vec2) => ({
  x: point.x - BOARD_LIMITS.minX + BOARD_PADDING,
  y: BOARD_LIMITS.maxZ + BOARD_PADDING - point.z
});

export const svgPointToWorld = (svgX: number, svgY: number): Vec2 => ({
  x: svgX + BOARD_LIMITS.minX - BOARD_PADDING,
  z: BOARD_LIMITS.maxZ + BOARD_PADDING - svgY
});

export const formatSvgPoint = (point: Vec2) => {
  const svg = toSvgPoint(point);
  return `${svg.x} ${svg.y}`;
};

export const midpoint = (a: Vec2, b: Vec2): Vec2 => ({
  x: (a.x + b.x) / 2,
  z: (a.z + b.z) / 2
});

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

export const orientationBetween = (start: Vec2, end: Vec2): "horizontal" | "vertical" =>
  Math.abs(end.x - start.x) >= Math.abs(end.z - start.z) ? "horizontal" : "vertical";

export const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

