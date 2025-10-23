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
// Fake grid: 10x10 empty cells
const schematicGrid = Array.from({ length: 10 }, (_, y) =>
  Array.from({ length: 10 }, (_, x) => ({ occupied: false }))
);

// Fake start and end points
const startNode = { x: 2, y: 3 };
const endNode = { x: 7, y: 6 };

// Call the wire drawing function
handleWireDraw(startNode, endNode, schematicGrid);

// Temporary wire renderer
function renderWire(path) {
  console.log("Wire path:", path);
}