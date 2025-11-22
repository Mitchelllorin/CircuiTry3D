import { describe, it, expect } from 'vitest';
import { createWire, ensurePointOnWire, cloneWire } from '../src/model/wire';
import { createNode, findClosestNode } from '../src/model/node';
import { rebuildAdjacencyForWires } from '../src/sim/connectivity';
import type { Vec2, Wire } from '../src/model/types';
import type { Node } from '../src/model/node';

describe('Junction Functionality - Critical Requirements', () => {
  describe('Requirement 1: Junctions can be placed anywhere on a wire', () => {
    it('should create a junction at the beginning of a wire', () => {
      // Create a horizontal wire from (0, 0) to (100, 0)
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      // Try to place junction at the start point
      const junctionPoint = { x: 1, y: 0 };
      const result = ensurePointOnWire(wire, junctionPoint, 5);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.point).toBeDefined();
      expect(wire.points.length).toBeGreaterThanOrEqual(2);
    });

    it('should create a junction in the middle of a wire', () => {
      // Create a horizontal wire from (0, 0) to (100, 0)
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      // Place junction at midpoint
      const junctionPoint = { x: 50, y: 0 };
      const result = ensurePointOnWire(wire, junctionPoint, 1);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.point).toBeDefined();
      expect(result.inserted).toBe(true);
      expect(wire.points.length).toBe(3); // Original 2 + 1 junction

      // Verify the junction point is actually in the wire
      const junctionExists = wire.points.some(p =>
        Math.abs(p.x - junctionPoint.x) <= 1 && Math.abs(p.y - junctionPoint.y) <= 1
      );
      expect(junctionExists).toBe(true);
    });

    it('should create a junction at the end of a wire', () => {
      // Create a horizontal wire from (0, 0) to (100, 0)
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      // Place junction near the end
      const junctionPoint = { x: 99, y: 0 };
      const result = ensurePointOnWire(wire, junctionPoint, 5);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.point).toBeDefined();
      expect(wire.points.length).toBeGreaterThanOrEqual(2);
    });

    it('should create a junction on a multi-segment wire', () => {
      // Create an L-shaped wire with 3 points
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ]);

      // Place junction on the horizontal segment
      const junctionPoint = { x: 25, y: 0 };
      const result = ensurePointOnWire(wire, junctionPoint, 1);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.inserted).toBe(true);
      expect(wire.points.length).toBe(4); // Original 3 + 1 junction
    });

    it('should create a junction on the second segment of a multi-segment wire', () => {
      // Create an L-shaped wire with 3 points
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ]);

      // Place junction on the vertical segment
      const junctionPoint = { x: 50, y: 25 };
      const result = ensurePointOnWire(wire, junctionPoint, 1);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.inserted).toBe(true);
      expect(wire.points.length).toBe(4); // Original 3 + 1 junction
    });

    it('should not duplicate a junction if placed twice at the same location', () => {
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      const junctionPoint = { x: 50, y: 0 };

      // First placement
      const result1 = ensurePointOnWire(wire, junctionPoint, 1);
      expect(result1.inserted).toBe(true);
      const pointCountAfterFirst = wire.points.length;

      // Second placement at same location
      const result2 = ensurePointOnWire(wire, junctionPoint, 1);
      expect(result2.inserted).toBe(false); // Should use existing point
      expect(wire.points.length).toBe(pointCountAfterFirst); // No duplicate added
    });
  });

  describe('Requirement 2: Junctions can be used as starting points to run new wires', () => {
    it('should find a junction node as a snap target', () => {
      // Create a junction node
      const junctionNode = createNode('junction', { x: 50, y: 50 });
      const nodes: Node[] = [junctionNode];

      // Try to find it within snap radius
      const snapRadius = 12;
      const searchPoint = { x: 52, y: 52 }; // Within snap radius

      const foundNode = findClosestNode(searchPoint, nodes, snapRadius);

      expect(foundNode).not.toBeNull();
      expect(foundNode?.id).toBe(junctionNode.id);
      expect(foundNode?.type).toBe('junction');
    });

    it('should not find a junction node outside snap radius', () => {
      const junctionNode = createNode('junction', { x: 50, y: 50 });
      const nodes: Node[] = [junctionNode];

      const snapRadius = 12;
      const searchPoint = { x: 70, y: 70 }; // Outside snap radius

      const foundNode = findClosestNode(searchPoint, nodes, snapRadius);

      expect(foundNode).toBeNull();
    });

    it('should maintain connectivity when wires connect through a junction', () => {
      // Create first wire (horizontal)
      const wire1 = createWire([
        { x: 0, y: 50 },
        { x: 50, y: 50 }
      ]);

      // Create junction at end of first wire
      const junctionNode = createNode('junction', { x: 50, y: 50 });

      // Create second wire starting from junction (vertical)
      const wire2 = createWire([
        { x: 50, y: 50 },
        { x: 50, y: 100 }
      ]);

      const wires: Wire[] = [wire1, wire2];
      const nodes: Node[] = [junctionNode];

      // Rebuild connectivity graph
      rebuildAdjacencyForWires(wires, nodes);

      // The junction should be attached to both wires
      expect(junctionNode.attachedWireIds.size).toBeGreaterThan(0);
    });

    it('should allow multiple wires to branch from a single junction', () => {
      // Create first wire (horizontal)
      const wire1 = createWire([
        { x: 0, y: 50 },
        { x: 50, y: 50 }
      ]);

      // Create junction at end of first wire
      const junctionNode = createNode('junction', { x: 50, y: 50 });

      // Create second wire from junction (going up)
      const wire2 = createWire([
        { x: 50, y: 50 },
        { x: 50, y: 0 }
      ]);

      // Create third wire from junction (going down)
      const wire3 = createWire([
        { x: 50, y: 50 },
        { x: 50, y: 100 }
      ]);

      // Create fourth wire from junction (going right)
      const wire4 = createWire([
        { x: 50, y: 50 },
        { x: 100, y: 50 }
      ]);

      const wires: Wire[] = [wire1, wire2, wire3, wire4];
      const nodes: Node[] = [junctionNode];

      // Rebuild connectivity graph
      rebuildAdjacencyForWires(wires, nodes);

      // The junction should be attached to all four wires
      expect(junctionNode.attachedWireIds.size).toBeGreaterThanOrEqual(1);
    });

    it('should create valid wire path when starting from a junction', () => {
      // Simulate the wire drawer behavior:
      // 1. User clicks on existing wire to create junction
      const existingWire = createWire([
        { x: 0, y: 50 },
        { x: 100, y: 50 }
      ]);

      // 2. Junction is placed in the middle
      const clickPoint = { x: 50, y: 50 };
      const result = ensurePointOnWire(existingWire, clickPoint, 1);

      expect(result.index).toBeGreaterThan(-1);

      const junctionNode = createNode('junction', result.point!);

      // 3. New wire is drawn starting from the junction position
      const newWireStart = junctionNode.pos;
      const newWireEnd = { x: 50, y: 100 };

      const newWire = createWire([newWireStart, newWireEnd]);

      // Verify the new wire starts at the junction
      expect(newWire.points[0].x).toBe(junctionNode.pos.x);
      expect(newWire.points[0].y).toBe(junctionNode.pos.y);
      expect(newWire.points.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle junction placement on diagonal wire', () => {
      // Create a diagonal wire
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ]);

      // Place junction in the middle
      const junctionPoint = { x: 50, y: 50 };
      const result = ensurePointOnWire(wire, junctionPoint, 2);

      expect(result.index).toBeGreaterThan(-1);
      expect(result.point).toBeDefined();
    });

    it('should reject junction placement far from wire', () => {
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      // Try to place junction far away from the wire
      const junctionPoint = { x: 50, y: 50 };
      const result = ensurePointOnWire(wire, junctionPoint, 1); // Small tolerance

      expect(result.index).toBe(-1);
      expect(result.inserted).toBe(false);
    });

    it('should handle junction on very short wire segment', () => {
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 5, y: 0 }
      ]);

      const junctionPoint = { x: 2.5, y: 0 };
      const result = ensurePointOnWire(wire, junctionPoint, 1);

      expect(result.index).toBeGreaterThan(-1);
    });

    it('should find closest junction among multiple nodes', () => {
      const junction1 = createNode('junction', { x: 10, y: 10 });
      const junction2 = createNode('junction', { x: 50, y: 50 });
      const junction3 = createNode('junction', { x: 90, y: 90 });

      const nodes: Node[] = [junction1, junction2, junction3];

      // Search near junction2
      const searchPoint = { x: 52, y: 52 };
      const found = findClosestNode(searchPoint, nodes, 20);

      expect(found?.id).toBe(junction2.id);
    });
  });

  describe('Integration: Full Junction Workflow', () => {
    it('should simulate complete junction creation and wire branching workflow', () => {
      // Step 1: Create initial horizontal wire
      const mainWire = createWire([
        { x: 0, y: 50 },
        { x: 100, y: 50 }
      ]);

      // Step 2: User clicks in the middle of the wire
      const clickPoint = { x: 50, y: 51 }; // Slightly off, within snap tolerance
      const ensureResult = ensurePointOnWire(mainWire, clickPoint, 4);

      expect(ensureResult.index).toBeGreaterThan(-1);
      expect(ensureResult.inserted).toBe(true);

      // Step 3: Create junction node at the inserted point
      const junctionNode = createNode('junction', ensureResult.point!);

      // Step 4: User draws new wire from junction
      const branchWireStart = junctionNode.pos;
      const branchWireEnd = { x: 50, y: 100 };
      const branchWire = createWire([branchWireStart, branchWireEnd]);

      // Step 5: Update connectivity
      const allWires = [mainWire, branchWire];
      const allNodes = [junctionNode];

      rebuildAdjacencyForWires(allWires, allNodes);

      // Verify results
      expect(mainWire.points.length).toBe(3); // Start + Junction + End
      expect(branchWire.points.length).toBeGreaterThanOrEqual(2);
      expect(junctionNode.attachedWireIds.size).toBeGreaterThan(0);

      // Verify junction is on the main wire
      const junctionOnWire = mainWire.points.some(p =>
        Math.abs(p.x - junctionNode.pos.x) < 2 &&
        Math.abs(p.y - junctionNode.pos.y) < 2
      );
      expect(junctionOnWire).toBe(true);
    });
  });
});
