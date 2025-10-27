import { Vec2 } from "./node";

export interface Wire {
  id: string;
  points: Vec2[]; // ordered polyline: [p0, p1, p2, ...]
  attachedNodeIds: Set<string>; // nodes that fall exactly on points
}
