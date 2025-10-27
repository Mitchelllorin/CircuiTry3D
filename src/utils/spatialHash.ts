import type { Vec2 } from "./geom";

/**
 * Minimal spatial-hash for segments. Intended for mobile performance.
 * Store segments keyed by integer cell coordinates and query bbox for candidate segments.
 */
export class SpatialHash {
  cellSize: number;
  buckets: Map<string, Set<string>>; // "i|j" -> set(segmentId)
  segments: Map<string, { a: Vec2; b: Vec2 }>;

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.buckets = new Map();
    this.segments = new Map();
  }

  private key(i: number, j: number) { return `${i}|${j}`; }

  private cellsForBBox(minX: number, minY: number, maxX: number, maxY: number) {
    const i0 = Math.floor(minX / this.cellSize);
    const j0 = Math.floor(minY / this.cellSize);
    const i1 = Math.floor(maxX / this.cellSize);
    const j1 = Math.floor(maxY / this.cellSize);
    const out: [number, number][] = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push([i, j]);
    return out;
  }

  addSegment(id: string, a: Vec2, b: Vec2) {
    this.segments.set(id, { a, b });
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x, b.x);
    const maxY = Math.max(a.y, b.y);
    for (const [i, j] of this.cellsForBBox(minX, minY, maxX, maxY)) {
      const k = this.key(i, j);
      if (!this.buckets.has(k)) this.buckets.set(k, new Set());
      this.buckets.get(k)!.add(id);
    }
  }

  removeSegment(id: string) {
    this.segments.delete(id);
    for (const [k, set] of this.buckets) {
      if (set.has(id)) {
        set.delete(id);
        if (set.size === 0) this.buckets.delete(k);
      }
    }
  }

  queryBBox(minX: number, minY: number, maxX: number, maxY: number): string[] {
    const found = new Set<string>();
    for (const [i, j] of this.cellsForBBox(minX, minY, maxX, maxY)) {
      const k = this.key(i, j);
      const set = this.buckets.get(k);
      if (!set) continue;
      for (const id of set) found.add(id);
    }
    return Array.from(found);
  }

  getSegment(id: string) {
    return this.segments.get(id) || null;
  }
}
