import type { Wire } from "../model/wire";
import type { Node } from "../model/node";

/**
 * When app loads, convert legacy wires (polylines only) into
 * Wire objects with anchor nodes at endpoints so topology code can operate.
 */
export function migrateLegacyWires(wirePolylines: { id: string; points: { x: number; y: number }[] }[]) {
  const wires: Wire[] = [];
  const nodes: Node[] = [];
  for (const w of wirePolylines) {
    const wire: Wire = { id: w.id, points: w.points.map(p => ({ x: p.x, y: p.y })), attachedNodeIds: new Set() };
    // create anchor node for start and end
    const startNode: Node = { id: `${w.id}-n0`, type: "wireAnchor", pos: wire.points[0], attachedWireIds: new Set([w.id]) };
    const endNode: Node = { id: `${w.id}-n1`, type: "wireAnchor", pos: wire.points[wire.points.length - 1], attachedWireIds: new Set([w.id]) };
    wire.attachedNodeIds.add(startNode.id);
    wire.attachedNodeIds.add(endNode.id);
    wires.push(wire);
    nodes.push(startNode, endNode);
  }
  return { wires, nodes };
}
