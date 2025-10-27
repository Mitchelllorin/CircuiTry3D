import { describe, it, expect } from 'vitest';
import { createWire, insertPointIntoWire, getWireEndpoints } from '../src/model/wire';
import type { Vec2 } from '../src/model/types';

describe('Wire Model', () => {
  describe('createWire', () => {
    it('should create a wire with unique ID', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      
      const wire = createWire(points);
      
      expect(wire.id).toBeDefined();
      expect(wire.points).toHaveLength(2);
      expect(wire.attachedNodeIds.size).toBe(0);
    });

    it('should create a wire with custom ID', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      
      const wire = createWire(points, 'custom-id');
      
      expect(wire.id).toBe('custom-id');
    });

    it('should copy points to avoid mutation', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      
      const wire = createWire(points);
      points[0].x = 999;
      
      expect(wire.points[0].x).toBe(0);
    });
  });

  describe('insertPointIntoWire', () => {
    it('should insert point at specified segment index', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      ];
      const wire = createWire(points);
      
      const newPoint: Vec2 = { x: 5, y: 0 };
      insertPointIntoWire(wire, newPoint, 0);
      
      expect(wire.points).toHaveLength(4);
      expect(wire.points[1]).toEqual(newPoint);
    });

    it('should throw error for invalid segment index', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ];
      const wire = createWire(points);
      
      const newPoint: Vec2 = { x: 5, y: 0 };
      
      expect(() => insertPointIntoWire(wire, newPoint, -1)).toThrow();
      expect(() => insertPointIntoWire(wire, newPoint, 5)).toThrow();
    });

    it('should insert junction point splitting wire into three segments', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ];
      const wire = createWire(points);
      
      const junction: Vec2 = { x: 50, y: 0 };
      insertPointIntoWire(wire, junction, 0);
      
      expect(wire.points).toHaveLength(3);
      expect(wire.points[0]).toEqual({ x: 0, y: 0 });
      expect(wire.points[1]).toEqual({ x: 50, y: 0 });
      expect(wire.points[2]).toEqual({ x: 100, y: 0 });
    });
  });

  describe('getWireEndpoints', () => {
    it('should return start and end points', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 10, y: 10 }
      ];
      const wire = createWire(points);
      
      const endpoints = getWireEndpoints(wire);
      
      expect(endpoints).not.toBeNull();
      expect(endpoints!.start).toEqual({ x: 0, y: 0 });
      expect(endpoints!.end).toEqual({ x: 10, y: 10 });
    });

    it('should return null for wire with less than 2 points', () => {
      const wire = createWire([{ x: 0, y: 0 }]);
      
      const endpoints = getWireEndpoints(wire);
      
      expect(endpoints).toBeNull();
    });
  });
});
