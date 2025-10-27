import type { Vec2 } from '../model/types';

/**
 * Calculate distance between two points
 */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Project point P onto line segment AB
 * Clamps t to [0, 1] to stay within the segment
 */
export function projectPointOnSegment(P: Vec2, A: Vec2, B: Vec2): Vec2 {
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
 * Check if two line segments AB and CD intersect
 * Returns the intersection point if they intersect, null otherwise
 * 
 * Uses the standard 2D line segment intersection algorithm:
 * - Calculate parameters s and t for the two lines
 * - If both s and t are in [0, 1], the segments intersect
 */
export function segmentIntersect(A: Vec2, B: Vec2, C: Vec2, D: Vec2): Vec2 | null {
  const dx1 = B.x - A.x;
  const dy1 = B.y - A.y;
  const dx2 = D.x - C.x;
  const dy2 = D.y - C.y;
  
  const denominator = dx1 * dy2 - dy1 * dx2;
  
  // Lines are parallel or coincident
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }
  
  const dx3 = C.x - A.x;
  const dy3 = C.y - A.y;
  
  const t = (dx3 * dy2 - dy3 * dx2) / denominator;
  const s = (dx3 * dy1 - dy3 * dx1) / denominator;
  
  // Check if intersection point is within both segments
  if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
    return {
      x: A.x + t * dx1,
      y: A.y + t * dy1
    };
  }
  
  return null;
}

/**
 * Find distance from point P to line segment AB
 */
export function pointToSegmentDistance(P: Vec2, A: Vec2, B: Vec2): number {
  const projected = projectPointOnSegment(P, A, B);
  return distance(P, projected);
}

/**
 * Check if a point is within a rectangle defined by two corners
 */
export function isPointInRect(point: Vec2, rectMin: Vec2, rectMax: Vec2): boolean {
  return point.x >= rectMin.x && point.x <= rectMax.x &&
         point.y >= rectMin.y && point.y <= rectMax.y;
}

/**
 * Simple spatial hash for fast proximity queries
 * Divides space into a grid of cells and stores items by cell
 */
export class SpatialHash<T> {
  private cellSize: number;
  private cells: Map<string, T[]>;
  
  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  /**
   * Get cell key for a position
   */
  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
  
  /**
   * Insert an item at a position
   */
  insert(pos: Vec2, item: T): void {
    const key = this.getCellKey(pos.x, pos.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(item);
  }
  
  /**
   * Query items near a position (within one cell radius)
   */
  queryNear(pos: Vec2): T[] {
    const results: T[] = [];
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    
    // Check the cell and its 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Clear all items from the spatial hash
   */
  clear(): void {
    this.cells.clear();
  }
}

/**
 * Calculate the cross product of vectors AB and AC
 * Used for determining orientation and collinearity
 */
export function crossProduct(A: Vec2, B: Vec2, C: Vec2): number {
  return (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
}

/**
 * Check if three points are collinear (lie on the same line)
 */
export function areCollinear(A: Vec2, B: Vec2, C: Vec2, tolerance: number = 1e-6): boolean {
  return Math.abs(crossProduct(A, B, C)) < tolerance;
}
