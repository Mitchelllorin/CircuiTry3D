export type NodeType = "componentPin" | "junction" | "wireAnchor";

export interface Vec2 { x: number; y: number; }

export interface Node {
  id: string;
  type: NodeType;
  pos: Vec2;
  attachedWireIds: Set<string>;
}
