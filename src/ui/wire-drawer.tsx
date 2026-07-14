// Add integration hooks around existing draw code. This file is illustrative.
// Import new utilities where needed.
import React from "react";
import { segmentIntersect } from "../utils/geom";
import type { Vec2 } from "../utils/geom";

// Example: call this when a wire is finished or moved to detect intersections with other wires
export function detectAndCreateJunctionsForWire(wireId: string, wirePoints: Vec2[], otherWires: Record<string, Vec2[]>, createJunction: (pos: Vec2) => void) {
  for (let i = 0; i < wirePoints.length - 1; i++) {
    const A = wirePoints[i];
    const B = wirePoints[i + 1];
    for (const [otherId, otherPts] of Object.entries(otherWires)) {
      for (let j = 0; j < otherPts.length - 1; j++) {
        const C = otherPts[j];
        const D = otherPts[j + 1];
        const P = segmentIntersect(A, B, C, D);
        if (P) createJunction(P);
      }
    }
  }
}
