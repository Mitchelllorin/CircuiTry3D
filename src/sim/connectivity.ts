import type { Wire } from "../model/wire";
import type { Node } from "../model/node";

export type Adjacency = Map<string, Set<string>>;

/**
 * Build adjacency for a set of wires and nodes.
 * This is incremental-friendly: call for affected wires only if you maintain global adjacency externally.
 */
export function rebuildAdjacencyForWires(wires: Wire[], nodes: Node[]): Adjacency {
  const nodeByPos = new Map<string, string>(); // key "x|y" -> nodeId
  for (const n of nodes) {
    nodeByPos.set(`${n.pos.x}|${n.pos.y}`, n.id);
  }

  const adj: Adjacency = new Map();
  function addEdge(a: string, b: string) {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }

  for (const w of wires) {
    for (let i = 0; i < w.points.length - 1; i++) {
      const A = w.points[i];
      const B = w.points[i + 1];
      const keyA = `${A.x}|${A.y}`;
      const keyB = `${B.x}|${B.y}`;
      const nodeA = nodeByPos.get(keyA);
      const nodeB = nodeByPos.get(keyB);
      if (nodeA && nodeB) addEdge(nodeA, nodeB);
    }
  }

  return adj;
}
