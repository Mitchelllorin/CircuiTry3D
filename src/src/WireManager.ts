// src/src/WireManager.ts
import { aStar } from './WirePathfinder';

export function handleWireDraw(startNode, endNode, schematicGrid) {
  const path = aStar(startNode, endNode, schematicGrid);
  if (path) {
    renderWire(path); // Replace with your actual wire rendering logic
  } else {
    console.error("Invalid connection: no path found");
  }
}