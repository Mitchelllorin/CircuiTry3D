import { describe, it, expect } from 'vitest';
import { rebuildAdjacencyForWires, UnionFind, findConnectedComponents } from '../src/sim/connectivity';
import { createWire } from '../src/model/wire';
import { createNode } from '../src/model/node';
import type { Vec2 } from '../src/model/types';

describe('Connectivity', () => {
  describe('rebuildAdjacencyForWires', () => {
    it('should build adjacency for simple wire', () => {
      const node1 = createNode('wireAnchor', { x: 0, y: 0 }, 'node1');
      const node2 = createNode('wireAnchor', { x: 10, y: 0 }, 'node2');
      
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      const graph = rebuildAdjacencyForWires([wire], [node1, node2]);
      
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].wireId).toBe('wire1');
      expect(graph.nodes.get('node1')).toContain('node2');
      expect(graph.nodes.get('node2')).toContain('node1');
    });

    it('should handle multiple wires', () => {
      const node1 = createNode('wireAnchor', { x: 0, y: 0 }, 'node1');
      const node2 = createNode('junction', { x: 10, y: 0 }, 'node2');
      const node3 = createNode('wireAnchor', { x: 20, y: 0 }, 'node3');
      
      const wire1 = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      const wire2 = createWire([
        { x: 10, y: 0 },
        { x: 20, y: 0 }
      ], 'wire2');
      
      const graph = rebuildAdjacencyForWires([wire1, wire2], [node1, node2, node3]);
      
      expect(graph.edges).toHaveLength(2);
      expect(graph.nodes.get('node2')!.size).toBe(2); // junction connects to both nodes
    });

    it('should update wire attachedNodeIds', () => {
      const node1 = createNode('wireAnchor', { x: 0, y: 0 }, 'node1');
      const node2 = createNode('wireAnchor', { x: 10, y: 0 }, 'node2');
      
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      rebuildAdjacencyForWires([wire], [node1, node2]);
      
      expect(wire.attachedNodeIds.has('node1')).toBe(true);
      expect(wire.attachedNodeIds.has('node2')).toBe(true);
    });

    it('should handle wires with no matching nodes', () => {
      const node1 = createNode('wireAnchor', { x: 100, y: 100 }, 'node1');
      
      const wire = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      const graph = rebuildAdjacencyForWires([wire], [node1]);
      
      expect(graph.edges).toHaveLength(0);
    });
  });

  describe('UnionFind', () => {
    it('should initialize with makeSet', () => {
      const uf = new UnionFind();
      uf.makeSet('a');
      uf.makeSet('b');
      
      expect(uf.find('a')).toBe('a');
      expect(uf.find('b')).toBe('b');
    });

    it('should union two sets', () => {
      const uf = new UnionFind();
      uf.makeSet('a');
      uf.makeSet('b');
      
      uf.union('a', 'b');
      
      expect(uf.connected('a', 'b')).toBe(true);
    });

    it('should check connectivity', () => {
      const uf = new UnionFind();
      uf.makeSet('a');
      uf.makeSet('b');
      uf.makeSet('c');
      
      uf.union('a', 'b');
      
      expect(uf.connected('a', 'b')).toBe(true);
      expect(uf.connected('a', 'c')).toBe(false);
      expect(uf.connected('b', 'c')).toBe(false);
    });

    it('should handle transitive connections', () => {
      const uf = new UnionFind();
      uf.makeSet('a');
      uf.makeSet('b');
      uf.makeSet('c');
      
      uf.union('a', 'b');
      uf.union('b', 'c');
      
      expect(uf.connected('a', 'c')).toBe(true);
    });

    it('should get connected components', () => {
      const uf = new UnionFind();
      uf.makeSet('a');
      uf.makeSet('b');
      uf.makeSet('c');
      uf.makeSet('d');
      
      uf.union('a', 'b');
      uf.union('c', 'd');
      
      const components = uf.getComponents();
      
      expect(components.size).toBe(2);
    });
  });

  describe('findConnectedComponents', () => {
    it('should find single component for connected graph', () => {
      const node1 = createNode('wireAnchor', { x: 0, y: 0 }, 'node1');
      const node2 = createNode('junction', { x: 10, y: 0 }, 'node2');
      const node3 = createNode('wireAnchor', { x: 20, y: 0 }, 'node3');
      
      const wire1 = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      const wire2 = createWire([
        { x: 10, y: 0 },
        { x: 20, y: 0 }
      ], 'wire2');
      
      const graph = rebuildAdjacencyForWires([wire1, wire2], [node1, node2, node3]);
      const components = findConnectedComponents(graph);
      
      expect(components).toHaveLength(1);
      expect(components[0].size).toBe(3);
    });

    it('should find multiple components for disconnected graph', () => {
      const node1 = createNode('wireAnchor', { x: 0, y: 0 }, 'node1');
      const node2 = createNode('wireAnchor', { x: 10, y: 0 }, 'node2');
      const node3 = createNode('wireAnchor', { x: 100, y: 100 }, 'node3');
      const node4 = createNode('wireAnchor', { x: 110, y: 100 }, 'node4');
      
      const wire1 = createWire([
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ], 'wire1');
      
      const wire2 = createWire([
        { x: 100, y: 100 },
        { x: 110, y: 100 }
      ], 'wire2');
      
      const graph = rebuildAdjacencyForWires([wire1, wire2], [node1, node2, node3, node4]);
      const components = findConnectedComponents(graph);
      
      expect(components).toHaveLength(2);
      expect(components[0].size).toBe(2);
      expect(components[1].size).toBe(2);
    });
  });
});
