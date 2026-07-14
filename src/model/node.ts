import type { Vec2 } from "../utils/geom";

export type NodeType = "componentPin" | "junction" | "wireAnchor";

export interface Node {
  id: string;
  type: NodeType;
  pos: Vec2;
  attachedWireIds: Set<string>;
}
