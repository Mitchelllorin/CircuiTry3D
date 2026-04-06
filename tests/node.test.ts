import { describe, it, expect } from 'vitest';
import {
  createNode,
  distance,
  findClosestNode,
  shouldMergeNodes,
  mergeNodes,
} from '../src/model/node';
import type { Node } from '../src/model/node';
import type { Vec2 } from '../src/model/types';

describe('Node Model', () => {
  describe('createNode', () => {
    it('should create a node with a unique ID', () => {
      const node = createNode('junction', { x: 0, y: 0 });
      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
    });

    it('should use the provided custom ID', () => {
      const node = createNode('componentPin', { x: 5, y: 10 }, 'my-node-id');
      expect(node.id).toBe('my-node-id');
    });

    it('should assign the correct type', () => {
      const junction = createNode('junction', { x: 0, y: 0 });
      const pin = createNode('componentPin', { x: 0, y: 0 });
      const anchor = createNode('wireAnchor', { x: 0, y: 0 });

      expect(junction.type).toBe('junction');
      expect(pin.type).toBe('componentPin');
      expect(anchor.type).toBe('wireAnchor');
    });

    it('should copy the position to avoid external mutation', () => {
      const pos: Vec2 = { x: 3, y: 7 };
      const node = createNode('junction', pos);
      pos.x = 999;
      expect(node.pos.x).toBe(3);
    });

    it('should start with an empty attachedWireIds set', () => {
      const node = createNode('junction', { x: 0, y: 0 });
      expect(node.attachedWireIds).toBeInstanceOf(Set);
      expect(node.attachedWireIds.size).toBe(0);
    });

    it('should generate unique IDs for different nodes', () => {
      const ids = new Set(Array.from({ length: 20 }, () => createNode('junction', { x: 0, y: 0 }).id));
      expect(ids.size).toBe(20);
    });
  });

  describe('distance', () => {
    it('should compute the Pythagorean distance (3-4-5 triangle)', () => {
      const a: Vec2 = { x: 0, y: 0 };
      const b: Vec2 = { x: 3, y: 4 };
      expect(distance(a, b)).toBe(5);
    });

    it('should return 0 for identical points', () => {
      const a: Vec2 = { x: 7, y: -3 };
      expect(distance(a, a)).toBe(0);
    });

    it('should be commutative', () => {
      const a: Vec2 = { x: 1, y: 2 };
      const b: Vec2 = { x: 4, y: 6 };
      expect(distance(a, b)).toBeCloseTo(distance(b, a));
    });

    it('should handle negative coordinates', () => {
      const a: Vec2 = { x: -3, y: -4 };
      const b: Vec2 = { x: 0, y: 0 };
      expect(distance(a, b)).toBe(5);
    });

    it('should handle axis-aligned distances', () => {
      const a: Vec2 = { x: 0, y: 0 };
      const b: Vec2 = { x: 10, y: 0 };
      expect(distance(a, b)).toBe(10);

      const c: Vec2 = { x: 0, y: 6 };
      expect(distance(a, c)).toBe(6);
    });
  });

  describe('findClosestNode', () => {
    it('should return null for an empty list', () => {
      const result = findClosestNode({ x: 0, y: 0 }, [], 100);
      expect(result).toBeNull();
    });

    it('should return null when no node is within maxDistance', () => {
      const nodes: Node[] = [createNode('junction', { x: 100, y: 100 })];
      const result = findClosestNode({ x: 0, y: 0 }, nodes, 10);
      expect(result).toBeNull();
    });

    it('should return the closest node within maxDistance', () => {
      const near = createNode('junction', { x: 2, y: 0 });
      const far = createNode('junction', { x: 10, y: 0 });
      const result = findClosestNode({ x: 0, y: 0 }, [near, far], 5);
      expect(result).toBe(near);
    });

    it('should pick the nearest when multiple nodes are in range', () => {
      const n1 = createNode('junction', { x: 3, y: 0 });
      const n2 = createNode('junction', { x: 5, y: 0 });
      const n3 = createNode('junction', { x: 1, y: 0 });
      const result = findClosestNode({ x: 0, y: 0 }, [n1, n2, n3], 20);
      expect(result).toBe(n3);
    });

    it('should treat maxDistance as exclusive (node exactly at maxDistance is not returned)', () => {
      const node = createNode('junction', { x: 10, y: 0 });
      // distance is exactly 10; maxDistance is 10 — should NOT match (< not <=)
      const result = findClosestNode({ x: 0, y: 0 }, [node], 10);
      expect(result).toBeNull();
    });
  });

  describe('shouldMergeNodes', () => {
    it('should return false for the same node', () => {
      const node = createNode('junction', { x: 0, y: 0 });
      expect(shouldMergeNodes(node, node, 100)).toBe(false);
    });

    it('should return true when nodes are within the merge radius', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      const b = createNode('junction', { x: 3, y: 0 });
      expect(shouldMergeNodes(a, b, 5)).toBe(true);
    });

    it('should return false when nodes are outside the merge radius', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      const b = createNode('junction', { x: 20, y: 0 });
      expect(shouldMergeNodes(a, b, 5)).toBe(false);
    });

    it('should return true when nodes are exactly at the merge radius boundary', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      const b = createNode('junction', { x: 5, y: 0 });
      expect(shouldMergeNodes(a, b, 5)).toBe(true);
    });
  });

  describe('mergeNodes', () => {
    it('should combine wire IDs from both nodes', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      a.attachedWireIds.add('wire-1');
      a.attachedWireIds.add('wire-2');

      const b = createNode('junction', { x: 1, y: 0 });
      b.attachedWireIds.add('wire-3');

      const merged = mergeNodes(a, b);
      expect(merged.attachedWireIds.has('wire-1')).toBe(true);
      expect(merged.attachedWireIds.has('wire-2')).toBe(true);
      expect(merged.attachedWireIds.has('wire-3')).toBe(true);
    });

    it('should deduplicate shared wire IDs', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      a.attachedWireIds.add('shared-wire');

      const b = createNode('junction', { x: 1, y: 0 });
      b.attachedWireIds.add('shared-wire');

      mergeNodes(a, b);
      expect(a.attachedWireIds.size).toBe(1);
    });

    it('should keep componentPin type over junction when nodeB is a componentPin', () => {
      const a = createNode('wireAnchor', { x: 0, y: 0 });
      const b = createNode('componentPin', { x: 5, y: 5 });

      const merged = mergeNodes(a, b);
      expect(merged.type).toBe('componentPin');
      expect(merged.pos).toEqual({ x: 5, y: 5 });
    });

    it('should keep componentPin type and position when nodeA already is a componentPin', () => {
      const a = createNode('componentPin', { x: 1, y: 2 });
      const b = createNode('junction', { x: 9, y: 9 });

      const merged = mergeNodes(a, b);
      expect(merged.type).toBe('componentPin');
      expect(merged.pos).toEqual({ x: 1, y: 2 });
    });

    it('should prefer junction over wireAnchor', () => {
      const a = createNode('wireAnchor', { x: 0, y: 0 });
      const b = createNode('junction', { x: 3, y: 4 });

      const merged = mergeNodes(a, b);
      expect(merged.type).toBe('junction');
    });

    it('should return nodeA as the merged result', () => {
      const a = createNode('junction', { x: 0, y: 0 });
      const b = createNode('junction', { x: 1, y: 0 });

      const result = mergeNodes(a, b);
      expect(result).toBe(a);
    });
  });
});
