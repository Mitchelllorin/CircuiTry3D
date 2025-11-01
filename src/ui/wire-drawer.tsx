import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Vec2 } from '../model/types';
import type { Node } from '../model/node';
import type { Wire } from '../model/wire';
import { createNode, findClosestNode, shouldMergeNodes, mergeNodes } from '../model/node';
import { createWire, ensurePointOnWire, findClosestPointOnWire } from '../model/wire';
import { segmentIntersect, distance } from '../utils/geom';
import { rebuildAdjacencyForWires } from '../sim/connectivity';
import { handleWireDraw } from '../src/WireManager';

// Configuration constants
const SNAP_RADIUS = 12; // px - snap endpoint to nearest pin/junction
const INTERSECT_TOLERANCE = 4; // px - detect crossing intersections
const MERGE_RADIUS = 6; // px - merge nodes when within this distance
const WIRE_HIT_RADIUS = 10; // px - detect clicks on existing wire segments
const ROUTING_GRID_SIZE = 24; // px - grid cell size for routing mode

export type WireMode = 'free' | 'schematic' | 'star' | 'routing';

interface WireDrawerProps {
  width: number;
  height: number;
  wires: Wire[];
  nodes: Node[];
  onWiresChange: (wires: Wire[]) => void;
  onNodesChange: (nodes: Node[]) => void;
  mode: WireMode;
}

export const WireDrawer: React.FC<WireDrawerProps> = ({
  width,
  height,
  wires,
  nodes,
  onWiresChange,
  onNodesChange,
  mode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWire, setCurrentWire] = useState<Vec2[]>([]);
  const [snapTarget, setSnapTarget] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredWireInfo, setHoveredWireInfo] = useState<{ wireId: string; point: Vec2 } | null>(null);
  const startNodeRef = useRef<Node | null>(null);

  const cloneWire = useCallback((wire: Wire): Wire => ({
    ...wire,
    points: wire.points.map((p) => ({ ...p })),
    attachedNodeIds: new Set(wire.attachedNodeIds)
  }), []);

  const cols = Math.max(1, Math.ceil(width / ROUTING_GRID_SIZE));
  const rows = Math.max(1, Math.ceil(height / ROUTING_GRID_SIZE));

  const toGridPoint = useCallback((pos: Vec2) => {
    return {
      x: Math.min(cols - 1, Math.max(0, Math.round(pos.x / ROUTING_GRID_SIZE))),
      y: Math.min(rows - 1, Math.max(0, Math.round(pos.y / ROUTING_GRID_SIZE)))
    };
  }, [cols, rows]);

  const fromGridPoint = useCallback((pt: { x: number; y: number }): Vec2 => {
    return {
      x: pt.x * ROUTING_GRID_SIZE,
      y: pt.y * ROUTING_GRID_SIZE
    };
  }, []);

  const buildRoutingGrid = useCallback(() => {
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ occupied: false }))
    );

    for (const node of nodes) {
      const g = toGridPoint(node.pos);
      grid[g.y][g.x].occupied = true;
    }

    return grid;
  }, [nodes, cols, rows, toGridPoint]);

  const buildWirePath = useCallback((start: Vec2, end: Vec2, options?: { preferHorizontal?: boolean }): Vec2[] => {
    const schematicPath = () => {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const horizontalFirst = options?.preferHorizontal ?? dx >= dy;
      const waypoint = horizontalFirst
        ? { x: end.x, y: start.y }
        : { x: start.x, y: end.y };

      if (distance(start, waypoint) < 0.01 || distance(waypoint, end) < 0.01) {
        return [start, end];
      }

      return [start, waypoint, end];
    };

    switch (mode) {
      case 'schematic': {
        return schematicPath();
      }
      case 'star': {
        const mid = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2
        };

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          const bend = Math.min(80, length / 2);
          const normX = -dy / length;
          const normY = dx / length;
          mid.x += normX * bend;
          mid.y += normY * bend;
        }

        return [start, mid, end];
      }
      case 'routing': {
        const grid = buildRoutingGrid();
        const startGrid = toGridPoint(start);
        const endGrid = toGridPoint(end);
        // Ensure start/end cells are available
        grid[startGrid.y][startGrid.x].occupied = false;
        grid[endGrid.y][endGrid.x].occupied = false;

        const terminals = nodes.map((node) => toGridPoint(node.pos));
        const path = handleWireDraw(startGrid, endGrid, grid, terminals);

        if (path && path.length > 1) {
          const converted = path.map((pt) => fromGridPoint(pt));
          converted[0] = { ...start };
          converted[converted.length - 1] = { ...end };
          return converted;
        }

        // Fallback to schematic if routing fails
        return schematicPath();
      }
      case 'free':
      default:
        return [start, end];
    }
  }, [mode, buildRoutingGrid, toGridPoint, fromGridPoint, nodes]);

  const findWireHit = useCallback((pos: Vec2) => {
    let best:
      | { wireIndex: number; point: Vec2; segIndex: number; distance: number; wire: Wire }
      | null = null;

    wires.forEach((wire, wireIndex) => {
      const closest = findClosestPointOnWire(pos, wire);
      if (!closest) return;

      if (closest.distance <= WIRE_HIT_RADIUS) {
        if (!best || closest.distance < best.distance) {
          best = {
            wireIndex,
            point: closest.point,
            segIndex: closest.segIndex,
            distance: closest.distance,
            wire
          };
        }
      }
    });

    return best;
  }, [wires]);

  /**
   * Get mouse position relative to canvas
   */
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  /**
   * Find snap target (node within snap radius)
   */
  const findSnapTarget = useCallback((pos: Vec2): Node | null => {
    return findClosestNode(pos, nodes, SNAP_RADIUS);
  }, [nodes]);

  /**
   * Handle mouse down - start drawing wire
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    let snapNode = findSnapTarget(pos);

    if (!snapNode) {
      const wireHit = findWireHit(pos);
      if (wireHit) {
        const junctionNode = createNode('junction', wireHit.point);

        const updatedWire = cloneWire(wireHit.wire);
        ensurePointOnWire(updatedWire, wireHit.point, 1);

        const updatedWires = [
          ...wires.slice(0, wireHit.wireIndex),
          updatedWire,
          ...wires.slice(wireHit.wireIndex + 1)
        ];
        const updatedNodes = [...nodes, junctionNode];

        onWiresChange(updatedWires);
        onNodesChange(updatedNodes);

        snapNode = junctionNode;
      }
    }

    const startPos = snapNode ? snapNode.pos : pos;
    startNodeRef.current = snapNode;
    setCurrentWire([startPos]);
    setIsDrawing(true);
    setSnapTarget(null);
    setHoveredNode(snapNode);
    setHoveredWireInfo(null);
  }, [getMousePos, findSnapTarget, nodes, wires, findWireHit, cloneWire, onNodesChange, onWiresChange]);

  /**
   * Handle mouse move - update wire preview and show snap target
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const snapNode = findSnapTarget(pos);
    
    setHoveredNode(snapNode);

    if (!isDrawing) {
      if (!snapNode) {
        const hit = findWireHit(pos);
        setHoveredWireInfo(hit ? { wireId: hit.wire.id, point: hit.point } : null);
      } else {
        setHoveredWireInfo(null);
      }
      return;
    }

    setHoveredWireInfo(null);

    if (currentWire.length === 0) {
      return;
    }

    const endPos = snapNode ? snapNode.pos : pos;
    const options = mode === 'schematic' ? { preferHorizontal: e.shiftKey } : undefined;
    const startPoint = currentWire[0];
    const path = buildWirePath(startPoint, endPos, options);
    setCurrentWire(path);
    setSnapTarget(snapNode);
  }, [getMousePos, findSnapTarget, isDrawing, currentWire, findWireHit, mode, buildWirePath]);

  /**
   * Handle mouse up - complete wire drawing
   */
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentWire.length === 0) {
      setIsDrawing(false);
      setCurrentWire([]);
      setSnapTarget(null);
      startNodeRef.current = null;
      return;
    }

    const pos = getMousePos(e);
    const endSnapNode = findSnapTarget(pos);
    const endPos = endSnapNode ? endSnapNode.pos : pos;
    const startPos = currentWire[0];
    const options = mode === 'schematic' ? { preferHorizontal: e.shiftKey } : undefined;

    const finalPath = buildWirePath(startPos, endPos, options);
    const newWire = createWire(finalPath);

    const workingWires = wires.map((wire) => cloneWire(wire));
    const workingNodes: Node[] = [...nodes];

    let startNode = startNodeRef.current ?? findClosestNode(startPos, workingNodes, MERGE_RADIUS / 2);
    if (!startNode) {
      startNode = createNode('wireAnchor', startPos);
      workingNodes.push(startNode);
    }

    let endNode = endSnapNode ?? findClosestNode(endPos, workingNodes, MERGE_RADIUS / 2);
    if (!endNode) {
      endNode = createNode('wireAnchor', endPos);
      workingNodes.push(endNode);
    }

    const junctionKeys = new Set<string>();

    const registerPoint = (point: Vec2) => `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`;

    const skipEndpoints = (point: Vec2) =>
      distance(point, startNode!.pos) <= MERGE_RADIUS || distance(point, endNode!.pos) <= MERGE_RADIUS;

    for (let w = 0; w < workingWires.length; w++) {
      const wire = workingWires[w];

      for (let i = 0; i < wire.points.length - 1; i++) {
        const A = wire.points[i];
        const B = wire.points[i + 1];

        for (let j = 0; j < newWire.points.length - 1; j++) {
          const C = newWire.points[j];
          const D = newWire.points[j + 1];

          const intersection = segmentIntersect(A, B, C, D);
          if (!intersection) continue;

          const distToSegmentStart = distance(intersection, C);
          const distToSegmentEnd = distance(intersection, D);
          if (distToSegmentStart <= INTERSECT_TOLERANCE || distToSegmentEnd <= INTERSECT_TOLERANCE) {
            continue;
          }

          if (skipEndpoints(intersection)) {
            continue;
          }

          const ensuredExisting = ensurePointOnWire(wire, intersection, 1);
          if (ensuredExisting.index === -1) {
            continue;
          }

          const actualPoint = wire.points[ensuredExisting.index];
          const ensureNew = ensurePointOnWire(newWire, actualPoint, 1);
          if (ensureNew.index === -1) {
            continue;
          }

          const key = registerPoint(actualPoint);
          if (junctionKeys.has(key)) {
            continue;
          }

          const existingNode = findClosestNode(actualPoint, workingNodes, MERGE_RADIUS / 2);
          if (existingNode) {
            junctionKeys.add(key);
            continue;
          }

          const junctionNode = createNode('junction', actualPoint);
          workingNodes.push(junctionNode);
          junctionKeys.add(key);
        }
      }
    }

    const nodesToMerge: [Node, Node][] = [];
    for (let i = 0; i < workingNodes.length; i++) {
      for (let j = i + 1; j < workingNodes.length; j++) {
        if (shouldMergeNodes(workingNodes[i], workingNodes[j], MERGE_RADIUS)) {
          nodesToMerge.push([workingNodes[i], workingNodes[j]]);
        }
      }
    }

    const mergedNodeIds = new Set<string>();
    for (const [nodeA, nodeB] of nodesToMerge) {
      if (!mergedNodeIds.has(nodeB.id)) {
        mergeNodes(nodeA, nodeB);
        mergedNodeIds.add(nodeB.id);
      }
    }

    const finalNodes = workingNodes.filter((n) => !mergedNodeIds.has(n.id));
    const finalWires = [...workingWires, newWire];

    rebuildAdjacencyForWires(finalWires, finalNodes);

    onWiresChange(finalWires);
    onNodesChange(finalNodes);

    setIsDrawing(false);
    setCurrentWire([]);
    setSnapTarget(null);
    setHoveredNode(null);
    setHoveredWireInfo(null);
    startNodeRef.current = null;
  }, [
    isDrawing,
    currentWire,
    getMousePos,
    findSnapTarget,
    mode,
    buildWirePath,
    wires,
    cloneWire,
    nodes,
    onWiresChange,
    onNodesChange
  ]);

  /**
   * Render the canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw existing wires
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    
    for (const wire of wires) {
      if (wire.points.length < 2) continue;
      
      ctx.beginPath();
      ctx.moveTo(wire.points[0].x, wire.points[0].y);
      
      for (let i = 1; i < wire.points.length; i++) {
        ctx.lineTo(wire.points[i].x, wire.points[i].y);
      }
      
      ctx.stroke();
    }
    
    // Draw nodes
    for (const node of nodes) {
      const radius = node.type === 'junction' ? 4 : 3;
      
      ctx.beginPath();
      ctx.arc(node.pos.x, node.pos.y, radius, 0, 2 * Math.PI);
      
      if (node === hoveredNode) {
        ctx.fillStyle = '#fbbf24';
      } else if (node.type === 'junction') {
        ctx.fillStyle = '#ef4444';
      } else if (node.type === 'componentPin') {
        ctx.fillStyle = '#22c55e';
      } else {
        ctx.fillStyle = '#94a3b8';
      }
      
      ctx.fill();
    }
    
    // Draw current wire being drawn
    if (isDrawing && currentWire.length > 0) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(currentWire[0].x, currentWire[0].y);
      
      for (let i = 1; i < currentWire.length; i++) {
        ctx.lineTo(currentWire[i].x, currentWire[i].y);
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw snap target indicator
    if (hoveredNode) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoveredNode.pos.x, hoveredNode.pos.y, 8, 0, 2 * Math.PI);
      ctx.stroke();
    }

    if (hoveredWireInfo) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoveredWireInfo.point.x, hoveredWireInfo.point.y, 6, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }, [wires, nodes, currentWire, isDrawing, hoveredNode, hoveredWireInfo, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: isDrawing ? 'crosshair' : hoveredNode || hoveredWireInfo ? 'pointer' : 'default',
        border: '1px solid #374151'
      }}
    />
  );
};
