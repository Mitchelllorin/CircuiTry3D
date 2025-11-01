import type { Vec2 } from './types';
import type { Node } from './node';

export interface Wire {
  id: string;
  points: Vec2[]; // ordered polyline
  attachedNodeIds: Set<string>;
}

/**
 * Create a new wire with a unique ID
 */
export function createWire(points: Vec2[], id?: string): Wire {
  return {
    id: id ?? `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    points: points.map(p => ({ ...p })),
    attachedNodeIds: new Set<string>()
  };
}

/**
 * Insert a point into a wire at the specified segment index
 * This splits the segment at segIndex by inserting point P between
 * points[segIndex] and points[segIndex+1]
 */
export function insertPointIntoWire(wire: Wire, P: Vec2, segIndex: number): void {
  if (segIndex < 0 || segIndex >= wire.points.length - 1) {
    throw new Error(`Invalid segment index ${segIndex} for wire with ${wire.points.length} points`);
  }
  
  // Insert the point after segIndex
  wire.points.splice(segIndex + 1, 0, { ...P });
}

/**
 * Ensure that a point exists on a wire's polyline, inserting it if necessary.
 * Returns the index of the point and whether an insertion occurred.
 */
export function ensurePointOnWire(
  wire: Wire,
  point: Vec2,
  tolerance: number = 0.5
): { index: number; inserted: boolean } {
  // Check if the point already exists (within tolerance)
  for (let i = 0; i < wire.points.length; i++) {
    if (distance(wire.points[i], point) <= tolerance) {
      return { index: i, inserted: false };
    }
  }

  const closest = findClosestPointOnWire(point, wire);
  if (!closest) {
    return { index: -1, inserted: false };
  }

  if (closest.distance > tolerance) {
    return { index: -1, inserted: false };
  }

  insertPointIntoWire(wire, closest.point, closest.segIndex);
  return { index: closest.segIndex + 1, inserted: true };
}

/**
 * Find the closest point on a wire to a given position
 * Returns the segment index and the projected point
 */
export function findClosestPointOnWire(
  pos: Vec2,
  wire: Wire
): { segIndex: number; point: Vec2; distance: number } | null {
  if (wire.points.length < 2) return null;

  let minDist = Infinity;
  let bestSegIndex = -1;
  let bestPoint: Vec2 | null = null;

  for (let i = 0; i < wire.points.length - 1; i++) {
    const A = wire.points[i];
    const B = wire.points[i + 1];
    
    // Project pos onto segment AB
    const projected = projectPointOnSegment(pos, A, B);
    const dist = distance(pos, projected);

    if (dist < minDist) {
      minDist = dist;
      bestSegIndex = i;
      bestPoint = projected;
    }
  }

  if (bestPoint === null) return null;

  return {
    segIndex: bestSegIndex,
    point: bestPoint,
    distance: minDist
  };
}

/**
 * Check if a point lies on a wire segment within tolerance
 */
export function isPointOnWireSegment(
  point: Vec2,
  wire: Wire,
  segIndex: number,
  tolerance: number
): boolean {
  if (segIndex < 0 || segIndex >= wire.points.length - 1) return false;
  
  const A = wire.points[segIndex];
  const B = wire.points[segIndex + 1];
  const projected = projectPointOnSegment(point, A, B);
  
  return distance(point, projected) <= tolerance;
}

/**
 * Remove a node reference from a wire
 */
export function detachNodeFromWire(wire: Wire, nodeId: string): void {
  wire.attachedNodeIds.delete(nodeId);
}

/**
 * Attach a node reference to a wire
 */
export function attachNodeToWire(wire: Wire, nodeId: string): void {
  wire.attachedNodeIds.add(nodeId);
}

/**
 * Helper: Calculate distance between two points
 */
function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Helper: Project point P onto line segment AB
 * Clamps t to [0, 1] to stay within the segment
 */
function projectPointOnSegment(P: Vec2, A: Vec2, B: Vec2): Vec2 {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  
  if (dx === 0 && dy === 0) {
    // A and B are the same point
    return { ...A };
  }
  
  // Calculate parameter t
  const t = Math.max(0, Math.min(1, 
    ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy)
  ));
  
  return {
    x: A.x + t * dx,
    y: A.y + t * dy
  };
}

/**
 * Get the endpoints of a wire (first and last points)
 */
export function getWireEndpoints(wire: Wire): { start: Vec2; end: Vec2 } | null {
  if (wire.points.length < 2) return null;
  return {
    start: wire.points[0],
    end: wire.points[wire.points.length - 1]
  };
}

/**
 * Update wire endpoint position
 */
export function updateWireEndpoint(wire: Wire, isStart: boolean, newPos: Vec2): void {
  if (wire.points.length === 0) return;
  
  if (isStart) {
    wire.points[0] = { ...newPos };
  } else {
    wire.points[wire.points.length - 1] = { ...newPos };
  }
}
