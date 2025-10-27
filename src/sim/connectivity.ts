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
  }
  
  // Build a position-to-node lookup for fast endpoint matching
  const nodesByPos = new Map<string, Node>();
  for (const node of nodes) {
    const key = posKey(node.pos);
    nodesByPos.set(key, node);
  }
  
  // Process each wire
  for (const wire of wires) {
    if (wire.points.length < 2) continue;
    
    // Find nodes at wire endpoints
    const startPos = wire.points[0];
    const endPos = wire.points[wire.points.length - 1];
    
    const startNode = findNodeAtPosition(startPos, nodes, 0.1); // small tolerance
    const endNode = findNodeAtPosition(endPos, nodes, 0.1);
    
    if (startNode && endNode) {
      // Create edge between the two endpoint nodes
      const edge: Edge = {
        wireId: wire.id,
        nodeA: startNode.id,
        nodeB: endNode.id
      };
      graph.edges.push(edge);
      
      // Add bidirectional connection
      if (!graph.nodes.has(startNode.id)) {
        graph.nodes.set(startNode.id, new Set());
      }
      if (!graph.nodes.has(endNode.id)) {
        graph.nodes.set(endNode.id, new Set());
      }
      
      graph.nodes.get(startNode.id)!.add(endNode.id);
      graph.nodes.get(endNode.id)!.add(startNode.id);
      
      // Update wire's attached nodes
      wire.attachedNodeIds.clear();
      wire.attachedNodeIds.add(startNode.id);
      wire.attachedNodeIds.add(endNode.id);
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
 * Create a string key from a position for lookup
 */
function posKey(pos: { x: number; y: number }): string {
  return `${Math.round(pos.x * 10)},${Math.round(pos.y * 10)}`;
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
