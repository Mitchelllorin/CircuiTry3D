/**
 * Component Insertion Module
 *
 * Infrastructure for handling a component being dropped onto an existing wire
 * in a closed circuit.  The three meaningful outcomes are:
 *
 *  **Series**   – Both terminals snap onto the *same* wire.
 *                 The wire is split at both terminal positions and the component
 *                 is placed in between.  The closed-circuit loop is preserved
 *                 with the new component now in series.
 *
 *  **Bridging** – The two terminals snap onto *different* wires.
 *                 Each wire is split at its respective snap point; the component
 *                 bridges the gap between the two split ends.
 *
 *  **Partial**  – Only one terminal is close enough to snap onto a wire.
 *                 That wire is split; the other terminal is left at its original
 *                 (dropped) position and the component is partially connected.
 *
 *  **Floating** – Neither terminal is near any wire.
 *                 The component is returned unchanged; the caller decides what
 *                 to do (typically just add it as a disconnected element).
 *
 * Usage
 * -----
 * ```ts
 * import { insertComponentOntoCircuit, applyInsertionResult } from './componentInsertion';
 *
 * const result = insertComponentOntoCircuit(droppedComponent, existingElements);
 *
 * if (result.success) {
 *   setElements(applyInsertionResult(existingElements, droppedComponent, result));
 * } else {
 *   // Floating: just add the component
 *   setElements([...existingElements, droppedComponent]);
 * }
 * ```
 */

import type { SchematicElement, TwoTerminalElement, WireElement, Vec2 } from './types';
import { createId } from '../utils/id';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Information about a component terminal snapping onto a wire.
 */
export interface WireHit {
  /** The wire element that was hit. */
  wire: WireElement;
  /** Closest point on the wire to the original terminal position. */
  snapped: Vec2;
  /** Index i such that the hit lies on wire.path[i] → wire.path[i + 1]. */
  segIndex: number;
  /** Parameter along the hit segment, clamped to [0, 1]. */
  param: number;
  /** Euclidean distance from the original position to the snapped position. */
  distance: number;
}

/** How the component was (or was not) inserted. */
export type InsertionType = 'series' | 'bridging' | 'partial' | 'floating';

export type ComponentInsertionResult =
  | {
      success: false;
      insertionType: 'floating';
      reason: string;
    }
  | {
      success: true;
      insertionType: Exclude<InsertionType, 'floating'>;
      /** Component with terminals updated to the snapped wire positions. */
      updatedComponent: TwoTerminalElement;
      /** IDs of original wire elements to remove from the circuit. */
      elementsToRemove: string[];
      /** New wire segments to add to the circuit. */
      elementsToAdd: WireElement[];
      message: string;
    };

export interface InsertionOptions {
  /**
   * Maximum distance (in schematic units) between a terminal and a wire for
   * the terminal to snap onto that wire.  Defaults to 0.6.
   */
  snapTolerance?: number;
}

// ─── Geometry helpers (schematic Vec2 uses {x, z}) ───────────────────────────

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function pointsNear(a: Vec2, b: Vec2, tolerance: number): boolean {
  return dist2(a, b) <= tolerance;
}

/**
 * Project point P onto line segment [A, B].
 * Returns the clamped projection and parameter t ∈ [0, 1].
 */
function projectOnSegment(P: Vec2, A: Vec2, B: Vec2): { point: Vec2; t: number } {
  const dx = B.x - A.x;
  const dz = B.z - A.z;
  const lenSq = dx * dx + dz * dz;

  if (lenSq === 0) {
    return { point: { x: A.x, z: A.z }, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(1, ((P.x - A.x) * dx + (P.z - A.z) * dz) / lenSq)
  );

  return { point: { x: A.x + t * dx, z: A.z + t * dz }, t };
}

/**
 * Project a point onto a polyline path.
 * Returns the closest segment index, snapped position, segment parameter, and
 * distance from the original point.
 */
function projectPointOnPath(
  pos: Vec2,
  path: Vec2[]
): { segIndex: number; snapped: Vec2; param: number; distance: number } | null {
  if (path.length < 2) return null;

  let best: { segIndex: number; snapped: Vec2; param: number; distance: number } | null = null;

  for (let i = 0; i < path.length - 1; i++) {
    const { point, t } = projectOnSegment(pos, path[i], path[i + 1]);
    const d = dist2(pos, point);
    if (best === null || d < best.distance) {
      best = { segIndex: i, snapped: point, param: t, distance: d };
    }
  }

  return best;
}

/**
 * Monotonically-increasing ordering value for a snap position along a wire.
 * Used to determine which of two snap points comes first in path order.
 */
function pathOrder(segIndex: number, param: number): number {
  return segIndex + param;
}

// ─── Wire splitting helpers ───────────────────────────────────────────────────

/**
 * Build a path from the start of a polyline up to (and including) a snap point.
 * Returns null if the resulting path would be degenerate (< 2 distinct points).
 */
function buildPathToSnap(
  fullPath: Vec2[],
  segIndex: number,
  snapPoint: Vec2,
  tolerance: number
): Vec2[] | null {
  // Take all original points up to and including path[segIndex]
  const points: Vec2[] = fullPath.slice(0, segIndex + 1).map(p => ({ x: p.x, z: p.z }));

  // Append the snap point unless it duplicates the last collected point
  if (!pointsNear(points[points.length - 1], snapPoint, tolerance)) {
    points.push({ x: snapPoint.x, z: snapPoint.z });
  }

  if (points.length < 2) return null;
  if (pointsNear(points[0], points[points.length - 1], tolerance)) return null;

  return points;
}

/**
 * Build a path from a snap point to the end of a polyline.
 * Returns null if the resulting path would be degenerate (< 2 distinct points).
 */
function buildPathFromSnap(
  fullPath: Vec2[],
  segIndex: number,
  snapPoint: Vec2,
  tolerance: number
): Vec2[] | null {
  const points: Vec2[] = [{ x: snapPoint.x, z: snapPoint.z }];

  // Append remaining original path points from segIndex + 1 onwards,
  // skipping any that duplicate the current tail.
  for (let i = segIndex + 1; i < fullPath.length; i++) {
    const p = fullPath[i];
    if (!pointsNear(points[points.length - 1], p, tolerance)) {
      points.push({ x: p.x, z: p.z });
    }
  }

  if (points.length < 2) return null;
  if (pointsNear(points[0], points[points.length - 1], tolerance)) return null;

  return points;
}

/**
 * Split a wire at two ordered snap positions (first comes before second in
 * path order).  Returns 0–2 new wire segments: the portion before the first
 * snap and the portion after the second snap.  The middle section (between the
 * two snaps) is intentionally omitted — the dropped component replaces it.
 */
function splitWireAroundComponent(
  wire: WireElement,
  first: Pick<WireHit, 'snapped' | 'segIndex' | 'param'>,
  second: Pick<WireHit, 'snapped' | 'segIndex' | 'param'>,
  tolerance: number
): WireElement[] {
  const segments: WireElement[] = [];

  const beforePath = buildPathToSnap(wire.path, first.segIndex, first.snapped, tolerance);
  if (beforePath) {
    segments.push({ id: createId('wire'), kind: 'wire', path: beforePath });
  }

  const afterPath = buildPathFromSnap(wire.path, second.segIndex, second.snapped, tolerance);
  if (afterPath) {
    segments.push({ id: createId('wire'), kind: 'wire', path: afterPath });
  }

  return segments;
}

/**
 * Split a wire at a single snap position.
 * Returns 0–2 new wire segments: before and after the snap point.
 */
function splitWireAtPoint(
  wire: WireElement,
  hit: Pick<WireHit, 'snapped' | 'segIndex' | 'param'>,
  tolerance: number
): WireElement[] {
  const segments: WireElement[] = [];

  const beforePath = buildPathToSnap(wire.path, hit.segIndex, hit.snapped, tolerance);
  if (beforePath) {
    segments.push({ id: createId('wire'), kind: 'wire', path: beforePath });
  }

  const afterPath = buildPathFromSnap(wire.path, hit.segIndex, hit.snapped, tolerance);
  if (afterPath) {
    segments.push({ id: createId('wire'), kind: 'wire', path: afterPath });
  }

  return segments;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Find the closest wire to a given position, within a tolerance.
 * Returns null if no wire element is within the tolerance distance.
 */
export function findWireHit(
  pos: Vec2,
  elements: SchematicElement[],
  tolerance: number
): WireHit | null {
  let best: WireHit | null = null;

  for (const el of elements) {
    if (el.kind !== 'wire') continue;
    const wire = el as WireElement;
    const proj = projectPointOnPath(pos, wire.path);
    if (!proj || proj.distance > tolerance) continue;

    if (best === null || proj.distance < best.distance) {
      best = {
        wire,
        snapped: proj.snapped,
        segIndex: proj.segIndex,
        param: proj.param,
        distance: proj.distance,
      };
    }
  }

  return best;
}

/**
 * Insert a dropped component into a circuit.
 *
 * Detects which wire(s) the component's terminals are close to, snaps the
 * terminals onto those wires, splits the affected wires, and returns a
 * description of the changes needed to update the circuit element list.
 *
 * The caller applies the result via {@link applyInsertionResult} or manually:
 * - Remove every element whose ID is in `result.elementsToRemove`.
 * - Add all elements in `result.elementsToAdd`.
 * - Replace (or add) the component with `result.updatedComponent`.
 */
export function insertComponentOntoCircuit(
  component: TwoTerminalElement,
  elements: SchematicElement[],
  options: InsertionOptions = {}
): ComponentInsertionResult {
  const tolerance = options.snapTolerance ?? 0.6;

  const startHit = findWireHit(component.start, elements, tolerance);
  const endHit = findWireHit(component.end, elements, tolerance);

  // ── Floating ──────────────────────────────────────────────────────────────
  if (!startHit && !endHit) {
    return {
      success: false,
      insertionType: 'floating',
      reason:
        'Neither terminal is near an existing wire. ' +
        'The component was not inserted into the circuit.',
    };
  }

  // ── Series: both terminals on the same wire ───────────────────────────────
  if (startHit && endHit && startHit.wire.id === endHit.wire.id) {
    const wire = startHit.wire;

    const startOrder = pathOrder(startHit.segIndex, startHit.param);
    const endOrder = pathOrder(endHit.segIndex, endHit.param);

    const [first, second] =
      startOrder <= endOrder ? [startHit, endHit] : [endHit, startHit];

    // Degenerate: both terminals project to the same wire point
    if (pointsNear(first.snapped, second.snapped, tolerance)) {
      return {
        success: false,
        insertionType: 'floating',
        reason:
          'Component terminals project to the same point on the wire. ' +
          'The component was not inserted.',
      };
    }

    const newSegments = splitWireAroundComponent(wire, first, second, tolerance);

    // Preserve start/end orientation: map snapped positions back to original order
    const [snappedStart, snappedEnd] =
      startOrder <= endOrder
        ? [first.snapped, second.snapped]
        : [second.snapped, first.snapped];

    return {
      success: true,
      insertionType: 'series',
      updatedComponent: {
        ...component,
        start: { x: snappedStart.x, z: snappedStart.z },
        end: { x: snappedEnd.x, z: snappedEnd.z },
      },
      elementsToRemove: [wire.id],
      elementsToAdd: newSegments,
      message: `Component inserted in series. Wire split into ${newSegments.length} segment(s).`,
    };
  }

  // ── Bridging: terminals on two different wires ────────────────────────────
  if (startHit && endHit) {
    const toRemove: string[] = [startHit.wire.id, endHit.wire.id];
    const newSegments: WireElement[] = [
      ...splitWireAtPoint(startHit.wire, startHit, tolerance),
      ...splitWireAtPoint(endHit.wire, endHit, tolerance),
    ];

    return {
      success: true,
      insertionType: 'bridging',
      updatedComponent: {
        ...component,
        start: { x: startHit.snapped.x, z: startHit.snapped.z },
        end: { x: endHit.snapped.x, z: endHit.snapped.z },
      },
      elementsToRemove: toRemove,
      elementsToAdd: newSegments,
      message: 'Component bridges two wires. Each wire was split at its snap point.',
    };
  }

  // ── Partial: exactly one terminal on a wire ───────────────────────────────
  const hit = (startHit ?? endHit)!;
  const isStartHit = !!startHit;

  const newSegments = splitWireAtPoint(hit.wire, hit, tolerance);

  return {
    success: true,
    insertionType: 'partial',
    updatedComponent: {
      ...component,
      start: isStartHit
        ? { x: hit.snapped.x, z: hit.snapped.z }
        : { x: component.start.x, z: component.start.z },
      end: isStartHit
        ? { x: component.end.x, z: component.end.z }
        : { x: hit.snapped.x, z: hit.snapped.z },
    },
    elementsToRemove: [hit.wire.id],
    elementsToAdd: newSegments,
    message: `Component partially connected. Only the ${isStartHit ? 'start' : 'end'} terminal was snapped to a wire.`,
  };
}

/**
 * Apply a {@link ComponentInsertionResult} to a circuit element list.
 *
 * - Removes the original wire(s) that were split.
 * - Adds the new wire segments.
 * - Upserts the (possibly updated) component.
 * - When the result is `floating`, the component is simply appended unchanged.
 *
 * Returns the new element list (the input array is not mutated).
 */
export function applyInsertionResult(
  elements: SchematicElement[],
  component: TwoTerminalElement,
  result: ComponentInsertionResult
): SchematicElement[] {
  if (!result.success) {
    // Floating: component has no wire to snap to — add it as a disconnected element
    return [...elements, component];
  }

  const removeSet = new Set(result.elementsToRemove);

  return [
    // Keep every element that wasn't affected
    ...elements.filter(el => !removeSet.has(el.id) && el.id !== component.id),
    // Updated component (terminals may be snapped)
    result.updatedComponent,
    // Replacement wire segments
    ...result.elementsToAdd,
  ];
}
