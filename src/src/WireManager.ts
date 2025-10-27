// src/WireManager.ts
import { aStar } from './WirePathfinder';

type Point = { x: number; y: number };
type Cell = { occupied: boolean };

const SNAP_RADIUS = 1; // grid units
const MAX_WIRE_LENGTH = 12; // grid units, tune for your board

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function snapToTerminal(p: Point, terminals: Point[]): Point {
  for (const t of terminals) {
    if (dist(p, t) <= SNAP_RADIUS) return { x: t.x, y: t.y };
  }
  return p;
}

function clampWireLength(start: Point, end: Point, maxLen = MAX_WIRE_LENGTH): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length <= maxLen) return end;
  const scale = maxLen / length;
  return { x: Math.round(start.x + dx * scale), y: Math.round(start.y + dy * scale) };
}

// debug-friendly renderer hook: replace with your real renderer
function renderWire(path: Point[]) {
  // temporary: console log; your renderer should draw grid-aligned polyline
  console.log('renderWire path:', path);
}

/**
 * handleWireDraw
 * - snaps start/end to nearest terminals
 * - clamps length to avoid runaway wires
 * - runs aStar for routing on schematicGrid
 * - renders if path found, logs structured error if not
 *
 * terminals array should be provided by caller (component terminals list)
 */
export function handleWireDraw(
  rawStart: Point,
  rawEnd: Point,
  schematicGrid: Cell[][],
  terminals: Point[] = []
) {
  // 1) snap to terminals
  const start = snapToTerminal(rawStart, terminals);
  let end = snapToTerminal(rawEnd, terminals);

  // 2) clamp length to avoid crazy jutting
  end = clampWireLength(start, end);

  // 3) run pathfinder
  const path = aStar(start, end, schematicGrid);
  if (path && path.length) {
    renderWire(path);
    return path;
  }

  // 4) fallback: if no path found, attempt small relaxations
  // try snapping end back to rawEnd (in case clamp forced impossible routing)
  const path2 = aStar(start, rawEnd, schematicGrid);
  if (path2 && path2.length) {
    renderWire(path2);
    return path2;
  }

  console.error('Invalid connection: no path found', { start, end, rawStart, rawEnd });
  return null;
}

