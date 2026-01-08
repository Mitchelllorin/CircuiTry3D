import type { Vec2 } from './types';
import { createId } from "../utils/id";

export type NodeType = "componentPin" | "junction" | "wireAnchor";

export interface Node {
  id: string;
  type: NodeType;
  pos: Vec2;
  attachedWireIds: Set<string>;
}

/**
 * Create a new node with a unique ID
 */
export function createNode(type: NodeType, pos: Vec2, id?: string): Node {
  return {
    id: id ?? createId("node"),
    type,
    pos: { ...pos },
    attachedWireIds: new Set<string>()
  };
}

/**
 * Calculate distance between two positions
 */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest node to a given position within a maximum distance
 */
export function findClosestNode(
  pos: Vec2,
  nodes: Node[],
  maxDistance: number
): Node | null {
  let closest: Node | null = null;
  let minDist = maxDistance;

  for (const node of nodes) {
    const dist = distance(pos, node.pos);
    if (dist < minDist) {
      minDist = dist;
      closest = node;
    }
  }

  return closest;
}

/**
 * Check if two nodes should be merged based on proximity
 */
export function shouldMergeNodes(nodeA: Node, nodeB: Node, mergeRadius: number): boolean {
  if (nodeA.id === nodeB.id) return false;
  return distance(nodeA.pos, nodeB.pos) <= mergeRadius;
}

/**
 * Merge two nodes by combining their wire attachments
 * Returns the merged node (nodeA with nodeB's wires added)
 */
export function mergeNodes(nodeA: Node, nodeB: Node): Node {
  // Combine wire IDs from both nodes
  for (const wireId of nodeB.attachedWireIds) {
    nodeA.attachedWireIds.add(wireId);
  }
  
  // Use the position of the "more important" node type
  // Priority: componentPin > junction > wireAnchor
  const typePriority: Record<NodeType, number> = {
    componentPin: 3,
    junction: 2,
    wireAnchor: 1
  };
  
  if (typePriority[nodeB.type] > typePriority[nodeA.type]) {
    nodeA.pos = { ...nodeB.pos };
    nodeA.type = nodeB.type;
  }
  
  return nodeA;
}
