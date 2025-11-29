import type { Wire } from '../model/wire';
import type { Node } from '../model/node';
import { distance } from '../utils/geom';

/**
 * Edge in the connectivity graph
 */
export interface Edge {
  wireId: string;
  nodeA: string;
  nodeB: string;
}

/**
 * Adjacency list representation of the wire-node graph
 */
export interface AdjacencyGraph {
  nodes: Map<string, Set<string>>; // nodeId -> Set of connected nodeIds
  edges: Edge[];
}

// Connection tolerance for detecting wire-to-node connections.
// This should be generous enough to account for minor positioning differences
// between wire endpoints and node positions after snapping operations.
// The UI snap radius is 12px, so we use a tolerance that ensures connections
// are detected even with small gaps from floating-point precision or rendering.
const CONNECTION_TOLERANCE = 8;

/**
 * Rebuild the adjacency graph from wires and nodes
 * This should be called whenever the topology changes
 */
export function rebuildAdjacencyForWires(wires: Wire[], nodes: Node[]): AdjacencyGraph {
  const graph: AdjacencyGraph = {
    nodes: new Map(),
    edges: []
  };

  // Initialize all nodes in the graph
  for (const node of nodes) {
    graph.nodes.set(node.id, new Set());
    node.attachedWireIds.clear();
  }

  // Process each wire
  for (const wire of wires) {
    if (wire.points.length < 2) continue;

    wire.attachedNodeIds.clear();

    const nodesOnWire: Node[] = [];

    for (const point of wire.points) {
      const node = findNodeAtPosition(point, nodes, CONNECTION_TOLERANCE);
      if (node) {
        // Avoid duplicates when multiple consecutive points map to same node
        if (!nodesOnWire.some((existing) => existing.id === node.id)) {
          nodesOnWire.push(node);
          wire.attachedNodeIds.add(node.id);
          node.attachedWireIds.add(wire.id);
        }
      }
    }

    if (nodesOnWire.length < 2) {
      continue;
    }

    for (let i = 0; i < nodesOnWire.length - 1; i++) {
      const nodeA = nodesOnWire[i];
      const nodeB = nodesOnWire[i + 1];

      if (nodeA.id === nodeB.id) {
        continue;
      }

      const edge: Edge = {
        wireId: wire.id,
        nodeA: nodeA.id,
        nodeB: nodeB.id
      };

      graph.edges.push(edge);

      if (!graph.nodes.has(nodeA.id)) {
        graph.nodes.set(nodeA.id, new Set());
      }
      if (!graph.nodes.has(nodeB.id)) {
        graph.nodes.set(nodeB.id, new Set());
      }

      graph.nodes.get(nodeA.id)!.add(nodeB.id);
      graph.nodes.get(nodeB.id)!.add(nodeA.id);
    }
  }
  
  return graph;
}

/**
 * Find a node at a specific position within a tolerance
 */
function findNodeAtPosition(pos: { x: number; y: number }, nodes: Node[], tolerance: number): Node | null {
  for (const node of nodes) {
    if (distance(pos, node.pos) <= tolerance) {
      return node;
    }
  }
  return null;
}

/**
 * Union-Find (Disjoint Set Union) data structure
 * Used for finding connected components in the graph
 */
export class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;
  
  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }
  
  /**
   * Make a new set containing only the given element
   */
  makeSet(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }
  
  /**
   * Find the root/representative of the set containing id
   * Uses path compression for efficiency
   */
  find(id: string): string {
    if (!this.parent.has(id)) {
      this.makeSet(id);
    }
    
    if (this.parent.get(id) !== id) {
      // Path compression: point directly to root
      this.parent.set(id, this.find(this.parent.get(id)!));
    }
    
    return this.parent.get(id)!;
  }
  
  /**
   * Union two sets by connecting their roots
   * Uses union by rank for efficiency
   */
  union(idA: string, idB: string): void {
    const rootA = this.find(idA);
    const rootB = this.find(idB);
    
    if (rootA === rootB) return;
    
    const rankA = this.rank.get(rootA) ?? 0;
    const rankB = this.rank.get(rootB) ?? 0;
    
    // Attach smaller rank tree under root of higher rank tree
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
  
  /**
   * Check if two elements are in the same connected component
   */
  connected(idA: string, idB: string): boolean {
    return this.find(idA) === this.find(idB);
  }
  
  /**
   * Get all connected components as a map from root to set of members
   */
  getComponents(): Map<string, Set<string>> {
    const components = new Map<string, Set<string>>();
    
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!components.has(root)) {
        components.set(root, new Set());
      }
      components.get(root)!.add(id);
    }
    
    return components;
  }
}

/**
 * Find connected components in the wire-node graph
 * Returns groups of connected node IDs
 */
export function findConnectedComponents(graph: AdjacencyGraph): Set<string>[] {
  const uf = new UnionFind();
  
  // Initialize all nodes
  for (const nodeId of graph.nodes.keys()) {
    uf.makeSet(nodeId);
  }
  
  // Union connected nodes
  for (const edge of graph.edges) {
    uf.union(edge.nodeA, edge.nodeB);
  }
  
  // Get components
  const components = uf.getComponents();
  return Array.from(components.values());
}

/**
 * Get all nodes reachable from a given node
 */
export function getReachableNodes(startNodeId: string, graph: AdjacencyGraph): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    
    visited.add(current);
    
    const neighbors = graph.nodes.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }
  
  return visited;
}
