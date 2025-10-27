import { describe, it, expect } from 'vitest';
import {
  distance,
  projectPointOnSegment,
  segmentIntersect,
  pointToSegmentDistance,
  SpatialHash,
  crossProduct,
  areCollinear,
} from '../src/utils/geom';
import type { Vec2 } from '../src/model/types';

describe('Geometry Utilities', () => {
  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const a: Vec2 = { x: 0, y: 0 };
      const b: Vec2 = { x: 3, y: 4 };
      expect(distance(a, b)).toBe(5);
    });

    it('should return 0 for same point', () => {
      const a: Vec2 = { x: 5, y: 5 };
      expect(distance(a, a)).toBe(0);
    });
  });

  describe('projectPointOnSegment', () => {
    it('should project point onto segment midpoint', () => {
      const P: Vec2 = { x: 5, y: 5 };
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      
      const result = projectPointOnSegment(P, A, B);
      expect(result.x).toBe(5);
      expect(result.y).toBe(0);
    });

    it('should clamp to segment start when projection is before start', () => {
      const P: Vec2 = { x: -5, y: 5 };
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      
      const result = projectPointOnSegment(P, A, B);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should clamp to segment end when projection is after end', () => {
      const P: Vec2 = { x: 15, y: 5 };
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      
      const result = projectPointOnSegment(P, A, B);
      expect(result.x).toBe(10);
      expect(result.y).toBe(0);
    });

    it('should handle zero-length segment', () => {
      const P: Vec2 = { x: 5, y: 5 };
      const A: Vec2 = { x: 3, y: 3 };
      const B: Vec2 = { x: 3, y: 3 };
      
      const result = projectPointOnSegment(P, A, B);
      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
    });
  });

  describe('segmentIntersect', () => {
    it('should find intersection of crossing segments', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 10 };
      const C: Vec2 = { x: 0, y: 10 };
      const D: Vec2 = { x: 10, y: 0 };
      
      const result = segmentIntersect(A, B, C, D);
      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(5, 5);
      expect(result!.y).toBeCloseTo(5, 5);
    });

    it('should return null for parallel segments', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      const C: Vec2 = { x: 0, y: 5 };
      const D: Vec2 = { x: 10, y: 5 };
      
      const result = segmentIntersect(A, B, C, D);
      expect(result).toBeNull();
    });

    it('should return null for non-intersecting segments', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 5, y: 0 };
      const C: Vec2 = { x: 10, y: 0 };
      const D: Vec2 = { x: 15, y: 0 };
      
      const result = segmentIntersect(A, B, C, D);
      expect(result).toBeNull();
    });

    it('should find intersection at endpoint', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      const C: Vec2 = { x: 10, y: 0 };
      const D: Vec2 = { x: 10, y: 10 };
      
      const result = segmentIntersect(A, B, C, D);
      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(10, 5);
      expect(result!.y).toBeCloseTo(0, 5);
    });

    it('should handle T-intersection', () => {
      const A: Vec2 = { x: 0, y: 5 };
      const B: Vec2 = { x: 10, y: 5 };
      const C: Vec2 = { x: 5, y: 0 };
      const D: Vec2 = { x: 5, y: 10 };
      
      const result = segmentIntersect(A, B, C, D);
      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(5, 5);
      expect(result!.y).toBeCloseTo(5, 5);
    });
  });

  describe('pointToSegmentDistance', () => {
    it('should calculate perpendicular distance to segment', () => {
      const P: Vec2 = { x: 5, y: 5 };
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      
      const dist = pointToSegmentDistance(P, A, B);
      expect(dist).toBe(5);
    });

    it('should calculate distance to closest endpoint', () => {
      const P: Vec2 = { x: 15, y: 5 };
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 10, y: 0 };
      
      const dist = pointToSegmentDistance(P, A, B);
      expect(dist).toBeCloseTo(Math.sqrt(25 + 25), 5);
    });
  });

  describe('SpatialHash', () => {
    it('should insert and query items', () => {
      const hash = new SpatialHash<string>(10);
      
      hash.insert({ x: 5, y: 5 }, 'item1');
      hash.insert({ x: 15, y: 15 }, 'item2');
      hash.insert({ x: 50, y: 50 }, 'item3');
      
      const near = hash.queryNear({ x: 5, y: 5 });
      expect(near).toContain('item1');
      expect(near).toContain('item2');
      expect(near).not.toContain('item3');
    });

    it('should clear all items', () => {
      const hash = new SpatialHash<string>(10);
      hash.insert({ x: 5, y: 5 }, 'item1');
      
      hash.clear();
      
      const near = hash.queryNear({ x: 5, y: 5 });
      expect(near.length).toBe(0);
    });

    it('should handle multiple items in same cell', () => {
      const hash = new SpatialHash<string>(10);
      
      hash.insert({ x: 5, y: 5 }, 'item1');
      hash.insert({ x: 6, y: 6 }, 'item2');
      hash.insert({ x: 7, y: 7 }, 'item3');
      
      const near = hash.queryNear({ x: 5, y: 5 });
      expect(near.length).toBe(3);
    });
  });

  describe('crossProduct', () => {
    it('should calculate positive cross product', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 1, y: 0 };
      const C: Vec2 = { x: 1, y: 1 };
      
      const result = crossProduct(A, B, C);
      expect(result).toBeGreaterThan(0);
    });

    it('should calculate negative cross product', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 1, y: 0 };
      const C: Vec2 = { x: 1, y: -1 };
      
      const result = crossProduct(A, B, C);
      expect(result).toBeLessThan(0);
    });

    it('should return zero for collinear points', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 5, y: 0 };
      const C: Vec2 = { x: 10, y: 0 };
      
      const result = crossProduct(A, B, C);
      expect(result).toBe(0);
    });
  });

  describe('areCollinear', () => {
    it('should detect collinear points on horizontal line', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 5, y: 0 };
      const C: Vec2 = { x: 10, y: 0 };
      
      expect(areCollinear(A, B, C)).toBe(true);
    });

    it('should detect collinear points on diagonal line', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 5, y: 5 };
      const C: Vec2 = { x: 10, y: 10 };
      
      expect(areCollinear(A, B, C)).toBe(true);
    });

    it('should detect non-collinear points', () => {
      const A: Vec2 = { x: 0, y: 0 };
      const B: Vec2 = { x: 5, y: 0 };
      const C: Vec2 = { x: 5, y: 5 };
      
      expect(areCollinear(A, B, C)).toBe(false);
    });
  });
});
