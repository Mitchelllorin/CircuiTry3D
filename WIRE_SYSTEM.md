# Wire System Architecture

This document describes the robust wire topology system implemented for CircuiTry3D.

## Overview

The wire system provides deterministic node-and-wire topology with automatic junction creation, selectable wiring modes (Freeform, Schematic, Square, Offset, Star, Arc, and Routing), snap-to-pin functionality, and connectivity tracking for circuit simulation.

## Core Concepts

### Nodes
Nodes are connection points in the circuit. There are three types:

1. **Component Pins** (`componentPin`): Fixed connection points on circuit components (green indicators)
2. **Junctions** (`junction`): Connection points for branching wires (amber/orange indicators) - **the key to parallel and series-parallel circuit problems**
3. **Wire Anchors** (`wireAnchor`): Free endpoints of wires not connected to anything (cyan indicators)

### Junction Nodes: The CircuiTry3D Standard

**Junctions are critical for solving complex circuit problems.** They enable:

- **Parallel branches**: Drop a junction on any wire run to create parallel paths
- **Series-parallel decomposition**: Break "squares within squares" layouts into manageable sections
- **Current division analysis**: Junctions serve as nodes where Kirchhoff's Current Law (KCL) applies

**How to create junctions:**
1. Enable Wire Mode
2. Hover over an existing wire - look for the pulsing '+' indicator
3. Click/tap to drop a junction node (amber dot appears)
4. Draw new wires from the junction in any direction

**Visual feedback:**
- Hovering over a wire shows a pulsing cyan ring with a '+' crosshair
- Junction nodes display as amber/orange dots (priority 2, between component pins and wire anchors)
- Multiple wires can connect to a single junction for branching

### Wires
Wires are polylines connecting nodes. Each wire:
- Has an ordered list of points (`Vec2[]`)
- Tracks attached node IDs for every node it touches (endpoints and mid-line junctions)
- Can be split by inserting junction points mid-segment—both automatically (intersections) and manually (click-to-branch)

### Connectivity Graph
The system maintains an adjacency graph where:
- Nodes are vertices
- Wires form edges between connected nodes
- Union-Find algorithm identifies connected components

## File Structure

```
src/
├── model/
│   ├── types.ts          # Shared Vec2 type
│   ├── node.ts           # Node model and utilities
│   └── wire.ts           # Wire model and topology functions
├── sim/
│   └── connectivity.ts   # Adjacency graph and Union-Find
├── ui/
│   └── wire-drawer.tsx   # React canvas drawing component
├── utils/
│   └── geom.ts           # Geometric algorithms
└── styles/
    └── junction.css      # Visual styles for nodes and wires
```

### Wiring Modes

| Mode | Behaviour |
| --- | --- |
| **Freeform** | Draws a straight segment between the chosen endpoints—ideal for quick sketches. |
| **Schematic** | Generates 90° elbow paths. Hold `Shift` while dragging to flip the elbow orientation on the fly. |
| **Square** | Routes outside the endpoint box using right-angle corners for textbook-style "around-the-edge" wiring. Hold `Shift` to flip the outside side. |
| **Offset** | Routes an orthogonal detour offset from the midpoint—useful for parallel runs or avoiding overlap. Hold `Shift` to flip the offset side. |
| **Star** | Inserts a graceful radial bend, useful for hub-and-spoke layouts. Hold `Shift` to flip the bend side. |
| **Arc** | Draws a smooth curved sweep by sampling a quadratic arc. Hold `Shift` to flip the arc side. |
| **Routing** | Uses grid-based A* routing (with node-aware obstacles) to auto-thread a tidy path between endpoints. |

Each mode is available from the left-side Wire Mode panel in the Builder UI and is also exposed via the `WireDrawer` component.

## Configuration Constants

```typescript
const SNAP_RADIUS = 12;           // px - snap to pins/junctions
const INTERSECT_TOLERANCE = 4;    // px - junction creation threshold
const MERGE_RADIUS = 6;           // px - merge duplicate nodes
```

## Key Algorithms

### Segment Intersection
Uses the standard 2D line segment intersection algorithm:
```typescript
segmentIntersect(A, B, C, D) -> Vec2 | null
```
Returns intersection point if segments AB and CD cross.

### Point Projection
Projects a point onto a line segment:
```typescript
projectPointOnSegment(P, A, B) -> Vec2
```
Clamps parameter t to [0, 1] to stay within segment bounds.

### Junction Creation
When drawing a wire:
1. Check each segment against existing wires
2. If intersection detected within `INTERSECT_TOLERANCE`
3. Create (or reuse) a junction node at the intersection point
4. Split both wires by inserting the junction

### Node Merging
After any topology change:
1. Find node pairs within `MERGE_RADIUS`
2. Merge their wire attachments and positions (respecting priority pin > junction > anchor)

### Connectivity Rebuild
After topology changes:
```typescript
rebuildAdjacencyForWires(wires, nodes) -> AdjacencyGraph
```
1. Build position-to-node lookup
2. For each wire, find nodes at endpoints
3. Create bidirectional edges in adjacency graph
4. Update wire.attachedNodeIds

## Usage Example

```typescript
import { WireDrawer } from './ui/wire-drawer';
import { createNode } from './model/node';

function MyCircuitEditor() {
  const [wires, setWires] = useState([]);
  const [nodes, setNodes] = useState([
    createNode('componentPin', { x: 100, y: 100 }),
    createNode('componentPin', { x: 300, y: 100 })
  ]);

  return (
    <WireDrawer
      width={600}
      height={600}
      wires={wires}
      nodes={nodes}
      onWiresChange={setWires}
      onNodesChange={setNodes}
      mode={mode}
    />
  );
}
```

## Testing

Run unit tests:
```bash
npm test
```

Test coverage:
- ✓ 22 geometry utility tests
- ✓ 8 wire model tests
- ✓ 11 connectivity tests

## Demo

Access the interactive demo:
```
http://localhost:3000/wire-demo
```

Features demonstrated:
- Wire drawing between component pins
- Automatic junction creation at crossings
- Snap-to-pin highlighting
- Node statistics display

## Integration with Existing Circuit Builder

The wire system is designed to be integrated into `public/legacy.html`:

1. **Data Migration**: Existing wire data can be converted:
   ```typescript
   // Old format: { points: Vec2[] }
   // New format: Wire with attachedNodeIds
   
   function migrateOldWire(oldWire) {
     const wire = createWire(oldWire.points);
     const startNode = createNode('wireAnchor', wire.points[0]);
     const endNode = createNode('wireAnchor', wire.points[wire.points.length - 1]);
     wire.attachedNodeIds.add(startNode.id);
     wire.attachedNodeIds.add(endNode.id);
     return { wire, nodes: [startNode, endNode] };
   }
   ```

2. **Simulation Integration**: Use connectivity graph for current flow:
   ```typescript
   const graph = rebuildAdjacencyForWires(wires, nodes);
   const components = findConnectedComponents(graph);
   // Each component is an isolated circuit
   ```

3. **Component Movement**: Update wire endpoints when components move.

## Performance Considerations

- **Spatial Hash**: Use `SpatialHash` for O(1) proximity queries with large node counts
- **Incremental Updates**: Only rebuild connectivity for affected wires
- **Canvas Rendering**: Batch render calls, use requestAnimationFrame
- **Target**: 200+ wires on mobile devices remain responsive

## Future Enhancements

Potential improvements:
- Wire labels and annotations
- Wire bundling for parallel connections
- Undo/redo support for junction edits
- Serialization for save/load (persisting mode selections and junction metadata)

## References

- [Line Segment Intersection Algorithm](https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection)
- [Union-Find Data Structure](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
- [Spatial Hashing](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/)
