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

/**
 * Circuit completion status
 */
export interface CircuitStatus {
  isClosed: boolean;
  hasLoop: boolean;
  powerSourceConnected: boolean;
  componentCount: number;
  openEndpoints: string[];
  message: string;
}

/**
 * Check if the circuit forms a complete closed loop
 * A circuit is considered closed if:
 * 1. There is at least one power source (battery)
 * 2. The power source terminals are connected through a path
 * 3. There are no dangling/open wire endpoints in the main circuit
 *
 * @param wires - Array of wires in the circuit
 * @param nodes - Array of nodes (pins, junctions, anchors)
 * @param powerSourceNodeIds - Optional array of node IDs representing power source terminals
 *                            (if provided, checks if positive and negative are connected)
 */
export function checkCircuitCompletion(
  wires: Wire[],
  nodes: Node[],
  powerSourceNodeIds?: { positive: string; negative: string }[]
): CircuitStatus {
  if (wires.length === 0 || nodes.length < 2) {
    return {
      isClosed: false,
      hasLoop: false,
      powerSourceConnected: false,
      componentCount: 0,
      openEndpoints: [],
      message: "No circuit elements present"
    };
  }

  // Build the adjacency graph
  const graph = rebuildAdjacencyForWires(wires, nodes);

  // Find connected components
  const components = findConnectedComponents(graph);

  // Count nodes that are only connected to one other node (potential open endpoints)
  const openEndpoints: string[] = [];
  for (const [nodeId, neighbors] of graph.nodes.entries()) {
    // A node with only one connection in a circuit is an open endpoint
    // (unless it's specifically a component terminal that's intentionally the end)
    if (neighbors.size === 1) {
      const node = nodes.find(n => n.id === nodeId);
      // wireAnchor nodes with only one connection are open wire ends
      if (node && node.type === 'wireAnchor') {
        openEndpoints.push(nodeId);
      }
    }
  }

  // Check if power sources are properly connected (both terminals in same component)
  let powerSourceConnected = false;
  if (powerSourceNodeIds && powerSourceNodeIds.length > 0) {
    // Check if any power source has both terminals connected
    for (const source of powerSourceNodeIds) {
      const positiveReachable = getReachableNodes(source.positive, graph);
      if (positiveReachable.has(source.negative)) {
        powerSourceConnected = true;
        break;
      }
    }
  } else {
    // If no power source specified, assume connected if there's at least one component
    powerSourceConnected = components.length > 0 && components.some(c => c.size >= 2);
  }

  // Check for loops using cycle detection
  const hasLoop = detectCycle(graph);

  // A circuit is closed if:
  // - Power source terminals are connected (or we have valid components)
  // - There's a loop in the circuit
  // - No dangling wire anchors (open endpoints are okay if they're component pins)
  const isClosed = powerSourceConnected && hasLoop && openEndpoints.length === 0;

  let message: string;
  if (isClosed) {
    message = "Circuit is complete and closed";
  } else if (!powerSourceConnected) {
    message = "Power source terminals not connected";
  } else if (!hasLoop) {
    message = "No closed loop detected in circuit";
  } else if (openEndpoints.length > 0) {
    message = `Open circuit: ${openEndpoints.length} unconnected wire endpoint(s)`;
  } else {
    message = "Circuit is incomplete";
  }

  return {
    isClosed,
    hasLoop,
    powerSourceConnected,
    componentCount: nodes.filter(n => n.type === 'componentPin').length,
    openEndpoints,
    message
  };
}

/**
 * Detect if the graph contains at least one cycle (closed loop)
 * Uses DFS-based cycle detection
 */
function detectCycle(graph: AdjacencyGraph): boolean {
  const visited = new Set<string>();
  const nodeIds = Array.from(graph.nodes.keys());

  if (nodeIds.length === 0) return false;

  // DFS from each unvisited node
  for (const startNode of nodeIds) {
    if (visited.has(startNode)) continue;

    const stack: Array<{ nodeId: string; parent: string | null }> = [
      { nodeId: startNode, parent: null }
    ];

    while (stack.length > 0) {
      const { nodeId, parent } = stack.pop()!;

      if (visited.has(nodeId)) {
        // Found a cycle - we've visited this node before from a different path
        return true;
      }

      visited.add(nodeId);

      const neighbors = graph.nodes.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          // Skip the parent node (the one we came from) to avoid false positives
          if (neighbor !== parent) {
            if (visited.has(neighbor)) {
              // Found a back edge - this means there's a cycle
              return true;
            }
            stack.push({ nodeId: neighbor, parent: nodeId });
          }
        }
      }
    }
  }

  return false;
}

/**
 * Check if two specific nodes are connected through a path
 * Useful for checking if battery terminals are connected through the circuit
 */
export function areNodesConnected(
  nodeIdA: string,
  nodeIdB: string,
  wires: Wire[],
  nodes: Node[]
): boolean {
  const graph = rebuildAdjacencyForWires(wires, nodes);
  const reachable = getReachableNodes(nodeIdA, graph);
  return reachable.has(nodeIdB);
}
