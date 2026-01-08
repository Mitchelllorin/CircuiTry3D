import { aStar, type GridCell, type GridPoint } from "./WirePathfinder";

const SNAP_RADIUS = 1; // grid units
const MAX_WIRE_LENGTH = 48; // grid units

function dist(a: GridPoint, b: GridPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function snapToTerminal(p: GridPoint, terminals: GridPoint[]): GridPoint {
  for (const t of terminals) {
    if (dist(p, t) <= SNAP_RADIUS) return { x: t.x, y: t.y };
  }
  return p;
}

function clampWireLength(start: GridPoint, end: GridPoint, maxLen = MAX_WIRE_LENGTH): GridPoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length <= maxLen) return end;
  const scale = maxLen / length;
  return { x: Math.round(start.x + dx * scale), y: Math.round(start.y + dy * scale) };
}

/**
 * Routing helper used by the 2D wire drawer (routing mode).
 * - snaps start/end to nearest terminals
 * - clamps length to avoid runaway wires
 * - runs A* on schematicGrid
 */
export function handleWireDraw(
  rawStart: GridPoint,
  rawEnd: GridPoint,
  schematicGrid: GridCell[][],
  terminals: GridPoint[] = [],
): GridPoint[] | null {
  const start = snapToTerminal(rawStart, terminals);
  let end = snapToTerminal(rawEnd, terminals);

  // Clamp length to avoid crazy jutting
  end = clampWireLength(start, end);

  const path = aStar(start, end, schematicGrid);
  if (path?.length) {
    return path;
  }

  // Fallback: if no path found, attempt small relaxation
  const path2 = aStar(start, rawEnd, schematicGrid);
  if (path2?.length) {
    return path2;
  }

  console.error("Invalid connection: no path found", { start, end, rawStart, rawEnd });
  return null;
}

export type { GridCell, GridPoint };

