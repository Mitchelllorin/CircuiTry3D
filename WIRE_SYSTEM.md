# Wire System Architecture

This document describes the robust wire topology system implemented for CircuiTry3D.

## Overview

The wire system provides deterministic node-and-wire topology with automatic junction creation, snap-to-pin functionality, and connectivity tracking for circuit simulation.

## Core Concepts

### Nodes
Nodes are connection points in the circuit. There are three types:

1. **Component Pins** (`componentPin`): Fixed connection points on circuit components
2. **Junctions** (`junction`): Auto-created when wires cross within tolerance
3. **Wire Anchors** (`wireAnchor`): Free endpoints of wires not connected to anything

### Wires
Wires are polylines connecting nodes. Each wire:
- Has an ordered list of points (`Vec2[]`)
- Tracks attached node IDs at endpoints
- Can be split by inserting junction points mid-segment

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

## Configuration Constants

```typescript
const SNAP_RADIUS = 12;           // px - snap to pins/junctions
const INTERSECT_TOLERANCE = 4;    // px - junction creation threshold
const RELEASE_DISTANCE = 18;      // px - detach from moved components
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
3. Create junction node at intersection point
4. Split both wires by inserting the junction

### Node Merging
After any topology change:
1. Find node pairs within `MERGE_RADIUS`
2. Merge their wire attachments
3. Keep higher-priority node type (pin > junction > anchor)

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
     // Create anchor nodes at endpoints
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

3. **Component Movement**: Update wire endpoints when components move:
   ```typescript
   function onComponentMove(component, newPos) {
     for (const pinNode of component.pins) {
       pinNode.pos = newPos + pinOffset;
       // Check if any wires should detach
       for (const wireId of pinNode.attachedWireIds) {
         const wire = findWire(wireId);
         const endpoint = getWireEndpoint(wire, pinNode);
         if (distance(pinNode.pos, endpoint) > RELEASE_DISTANCE) {
           detachWireFromNode(wire, pinNode);
           // Create new anchor at old position
           createNode('wireAnchor', endpoint);
         }
       }
     }
   }
   ```

## Performance Considerations

- **Spatial Hash**: Use `SpatialHash` for O(1) proximity queries with large node counts
- **Incremental Updates**: Only rebuild connectivity for affected wires
- **Canvas Rendering**: Batch render calls, use requestAnimationFrame
- **Target**: 200+ wires on mobile devices remain responsive

## Future Enhancements

Potential improvements:
- Wire routing with obstacles (A* pathfinding integration)
- Wire labels and annotations
- Multi-segment wire editing (insert/delete points)
- Orthogonal routing mode (Manhattan/rectilinear wires)
- Wire bundling for parallel connections
- Undo/redo support
- Serialization for save/load

## References

- [Line Segment Intersection Algorithm](https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection)
- [Union-Find Data Structure](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
- [Spatial Hashing](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/)
