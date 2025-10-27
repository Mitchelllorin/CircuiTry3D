import { rebuildAdjacencyForWires } from "../src/sim/connectivity";

test("adjacency builds between nodes on wire endpoints", () => {
  const nodes = [{ id: "n1", pos: { x: 0, y: 0 }, attachedWireIds: new Set() }, { id: "n2", pos: { x: 10, y: 0 }, attachedWireIds: new Set() }];
  const wires = [{ id: "w1", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], attachedNodeIds: new Set(["n1", "n2"]) }];
  const adj = rebuildAdjacencyForWires(wires as any, nodes as any);
  expect(adj.get("n1")!.has("n2")).toBe(true);
});
