import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Vec2 } from '../model/types';
import type { Node } from '../model/node';
import type { Wire } from '../model/wire';
import { createNode, findClosestNode, shouldMergeNodes, mergeNodes } from '../model/node';
import { createWire, ensurePointOnWire, findClosestPointOnWire } from '../model/wire';
import { segmentIntersect, distance } from '../utils/geom';
import { rebuildAdjacencyForWires } from '../sim/connectivity';
import { handleWireDraw } from '../routing/WireManager';

// Configuration constants
const SNAP_RADIUS = 12; // px - snap endpoint to nearest pin/junction
const INTERSECT_TOLERANCE = 4; // px - detect crossing intersections
const MERGE_RADIUS = 6; // px - merge nodes when within this distance
const WIRE_HIT_RADIUS_MOUSE = 16; // px - detect clicks on existing wire segments (mouse)
const WIRE_HIT_RADIUS_TOUCH = 24; // px - detect touches on existing wire segments (larger for fingers)
const ROUTING_GRID_SIZE = 24; // px - grid cell size for routing mode
const MIN_WIRE_LENGTH = 1; // px - ignore jitter-sized wires

// Detect if device supports touch
const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const CANVAS_COLORS = {
  backgroundTop: "#040d20",
  backgroundMid: "#081b35",
  backgroundBottom: "#030d1e",
  gridMinor: "rgba(132, 186, 255, 0.09)",
  gridMajor: "rgba(0, 255, 180, 0.16)",
  ambientCore: "rgba(0, 210, 255, 0.14)",
  ambientMid: "rgba(0, 160, 220, 0.08)",
  ambientEdge: "rgba(0, 0, 0, 0)",
  vignette: "rgba(3, 10, 24, 0.72)",
  wireShadow: "rgba(2, 10, 20, 0.85)",
  wireGlow: "rgba(38, 212, 255, 0.5)",
  wireGlowActive: "rgba(60, 255, 220, 0.75)",
  wireCoreStart: "#9bf5ff",
  wireCoreMid: "#19ffc9",
  wireCoreEnd: "#9bf5ff",
  previewGlow: "rgba(255, 172, 64, 0.65)",
  previewCore: "rgba(255, 230, 195, 0.95)",
  hoveredWirePulse: "rgba(60, 255, 220, 0.6)",
} as const;

type NodeVisualStyle = {
  radius: number;
  center: string;
  mid: string;
  edge: string;
  stroke: string;
  glow: string;
};

const NODE_STYLE: Record<Node['type'], NodeVisualStyle> = {
  componentPin: {
    radius: 5.8,
    center: "#ffffff",
    mid: "#afffe8",
    edge: "#16e4b3",
    stroke: "#d5fff1",
    glow: "rgba(46, 255, 190, 0.78)",
  },
  junction: {
    radius: 6.3,
    center: "#fff3e4",
    mid: "#ffc17f",
    edge: "#ff7a2f",
    stroke: "#ffe1c5",
    glow: "rgba(255, 166, 80, 0.78)",
  },
  wireAnchor: {
    radius: 5.1,
    center: "#f6fbff",
    mid: "#a8d9ff",
    edge: "#3aa5ff",
    stroke: "#d6ebff",
    glow: "rgba(122, 198, 255, 0.72)",
  },
} as const;

export type WireMode = 'free' | 'schematic' | 'star' | 'offset' | 'arc' | 'routing';

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
  const pulsePhaseRef = useRef(0);
  const hoverPulseFrameRef = useRef<number | null>(null);
  const backgroundCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const pathCacheRef = useRef<Map<string, { key: string; path: Path2D }>>(new Map());
  // RAF-based throttle: only process one move event per animation frame
  const pendingMoveRef = useRef<{ pos: Vec2; shiftKey?: boolean } | null>(null);
  const moveRafRef = useRef<number | null>(null);

  // Animate the hovered-wire pulse *without* causing React re-renders.
  // We drive animation via requestAnimationFrame and redraw only the canvas.
  useEffect(() => {
    if (!hoveredWireInfo) {
      if (hoverPulseFrameRef.current !== null) {
        cancelAnimationFrame(hoverPulseFrameRef.current);
        hoverPulseFrameRef.current = null;
      }
      pulsePhaseRef.current = 0;
      return;
    }

    let lastTime = performance.now();
    const animate = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;
      // ~0.5 cycles/sec at 60fps feels "alive" without being distracting.
      pulsePhaseRef.current = (pulsePhaseRef.current + deltaMs * 0.005) % (Math.PI * 2);
      hoverPulseFrameRef.current = requestAnimationFrame(animate);
    };

    hoverPulseFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (hoverPulseFrameRef.current !== null) {
        cancelAnimationFrame(hoverPulseFrameRef.current);
        hoverPulseFrameRef.current = null;
      }
    };
  }, [hoveredWireInfo]);

  // Get the appropriate wire hit radius based on input type
  const getWireHitRadius = useCallback(() => {
    return isTouchDevice() ? WIRE_HIT_RADIUS_TOUCH : WIRE_HIT_RADIUS_MOUSE;
  }, []);

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

  const buildWirePath = useCallback((start: Vec2, end: Vec2, options?: { flip?: boolean }): Vec2[] => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const defaultHorizontalFirst = Math.abs(dx) >= Math.abs(dy);
    const flip = options?.flip ? -1 : 1;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const compressPath = (points: Vec2[]) => {
      if (points.length < 3) {
        return points;
      }
      const cleaned: Vec2[] = [points[0]];
      for (let i = 1; i < points.length - 1; i += 1) {
        const prev = cleaned[cleaned.length - 1];
        const curr = points[i];
        const next = points[i + 1];
        if (distance(prev, curr) < 0.01) {
          continue;
        }
        const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
        if (Math.abs(cross) < 0.01) {
          continue;
        }
        cleaned.push(curr);
      }
      cleaned.push(points[points.length - 1]);
      return cleaned;
    };

    const schematicPath = () => {
      const horizontalFirst = options?.flip ? !defaultHorizontalFirst : defaultHorizontalFirst;
      const waypoint = horizontalFirst
        ? { x: end.x, y: start.y }
        : { x: start.x, y: end.y };

      if (distance(start, waypoint) < 0.01 || distance(waypoint, end) < 0.01) {
        return [start, end];
      }

      return [start, waypoint, end];
    };

    const offsetPath = () => {
      if (length < 0.01) {
        return [start, end];
      }
      const horizontalFirst = defaultHorizontalFirst;
      const offsetMagnitude = clamp(length * 0.25, length * 0.15, ROUTING_GRID_SIZE * 2);
      if (horizontalFirst) {
        const baseY = (start.y + end.y) / 2;
        const direction = Math.sign(dy || 1) * flip;
        const midY = baseY + direction * offsetMagnitude;
        return compressPath([
          start,
          { x: start.x, y: midY },
          { x: end.x, y: midY },
          end
        ]);
      }
      const baseX = (start.x + end.x) / 2;
      const direction = Math.sign(dx || 1) * flip;
      const midX = baseX + direction * offsetMagnitude;
      return compressPath([
        start,
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        end
      ]);
    };

    const arcPath = () => {
      if (length < 0.01) {
        return [start, end];
      }
      const mid = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      };
      const normX = -dy / length;
      const normY = dx / length;
      const bend = clamp(length * 0.3, length * 0.2, ROUTING_GRID_SIZE * 3);
      const control = {
        x: mid.x + normX * bend * flip,
        y: mid.y + normY * bend * flip
      };
      const segments = Math.max(4, Math.min(10, Math.round(length / 80) + 4));
      const points: Vec2[] = [];
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const inv = 1 - t;
        points.push({
          x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
          y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y
        });
      }
      return points;
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

        if (length > 0) {
          const bend = Math.min(80, length / 2);
          const normX = -dy / length;
          const normY = dx / length;
          mid.x += normX * bend * flip;
          mid.y += normY * bend * flip;
        }

        return [start, mid, end];
      }
      case 'offset': {
        return offsetPath();
      }
      case 'arc': {
        return arcPath();
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

  type WireHit = {
    wireIndex: number;
    point: Vec2;
    segIndex: number;
    distance: number;
    wire: Wire;
  };

  const findWireHit = useCallback((pos: Vec2): WireHit | null => {
    const hitRadius = getWireHitRadius();
    let best: WireHit | null = null;

    wires.forEach((wire, wireIndex) => {
      const closest = findClosestPointOnWire(pos, wire);
      if (!closest) return;

      if (closest.distance <= hitRadius) {
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
  }, [wires, getWireHitRadius]);

  const computePathLength = useCallback((path: Vec2[]) => {
    if (path.length < 2) {
      return 0;
    }

    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
      length += distance(path[i], path[i + 1]);
    }
    return length;
  }, []);

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
   * Get touch position relative to canvas
   */
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
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
        const updatedWire = cloneWire(wireHit.wire);
        const ensured = ensurePointOnWire(updatedWire, wireHit.point, 1);
        if (ensured.index !== -1 && ensured.point) {
          const existingNode = findClosestNode(ensured.point, nodes, MERGE_RADIUS / 2);
          const junctionNode = existingNode ?? createNode('junction', ensured.point);
          junctionNode.pos = { ...ensured.point };

          const updatedWires = [
            ...wires.slice(0, wireHit.wireIndex),
            updatedWire,
            ...wires.slice(wireHit.wireIndex + 1)
          ];
          const updatedNodes = existingNode ? nodes : [...nodes, junctionNode];

          rebuildAdjacencyForWires(updatedWires, updatedNodes);

          onWiresChange(updatedWires);
          onNodesChange(updatedNodes);

          snapNode = junctionNode;
        }
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
   * Core move-processing logic shared by mouse and touch handlers.
   * Batched via requestAnimationFrame so the browser only processes
   * one move per frame regardless of how fast events fire.
   */
  const processMove = useCallback((pos: Vec2, shiftKey?: boolean) => {
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
    const options = shiftKey ? { flip: true } : undefined;
    const startPoint = currentWire[0];
    const path = buildWirePath(startPoint, endPos, options);
    setCurrentWire(path);
    setSnapTarget(snapNode);
  }, [findSnapTarget, isDrawing, currentWire, findWireHit, buildWirePath]);

  const scheduleMoveUpdate = useCallback((pos: Vec2, shiftKey?: boolean) => {
    pendingMoveRef.current = { pos, shiftKey };
    if (moveRafRef.current === null) {
      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = null;
        const pending = pendingMoveRef.current;
        if (pending) {
          pendingMoveRef.current = null;
          processMove(pending.pos, pending.shiftKey);
        }
      });
    }
  }, [processMove]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  /**
   * Handle mouse move - update wire preview and show snap target
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    scheduleMoveUpdate(pos, e.shiftKey);
  }, [getMousePos, scheduleMoveUpdate]);

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
    const options = e.shiftKey ? { flip: true } : undefined;

    const finalPath = buildWirePath(startPos, endPos, options);
    const pathLength = computePathLength(finalPath);

    if (finalPath.length < 2 || pathLength < MIN_WIRE_LENGTH) {
      setIsDrawing(false);
      setCurrentWire([]);
      setSnapTarget(null);
      setHoveredNode(null);
      setHoveredWireInfo(null);
      startNodeRef.current = null;
      return;
    }

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

    // Ensure wire endpoints are precisely aligned to node positions
    // This eliminates small gaps that could prevent circuit completion detection
    if (newWire.points.length > 0) {
      newWire.points[0] = { ...startNode.pos };
      newWire.points[newWire.points.length - 1] = { ...endNode.pos };
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
          if (ensuredExisting.index === -1 || !ensuredExisting.point) {
            continue;
          }

          const actualPoint = ensuredExisting.point;
          const ensureNew = ensurePointOnWire(newWire, actualPoint, 1);
          if (ensureNew.index === -1 || !ensureNew.point) {
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
   * Handle touch start - start drawing wire (mobile support)
   */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling while drawing
    const pos = getTouchPos(e);
    let snapNode = findSnapTarget(pos);

    if (!snapNode) {
      const wireHit = findWireHit(pos);
      if (wireHit) {
        const updatedWire = cloneWire(wireHit.wire);
        const ensured = ensurePointOnWire(updatedWire, wireHit.point, 1);
        if (ensured.index !== -1 && ensured.point) {
          const existingNode = findClosestNode(ensured.point, nodes, MERGE_RADIUS / 2);
          const junctionNode = existingNode ?? createNode('junction', ensured.point);
          junctionNode.pos = { ...ensured.point };

          const updatedWires = [
            ...wires.slice(0, wireHit.wireIndex),
            updatedWire,
            ...wires.slice(wireHit.wireIndex + 1)
          ];
          const updatedNodes = existingNode ? nodes : [...nodes, junctionNode];

          rebuildAdjacencyForWires(updatedWires, updatedNodes);

          onWiresChange(updatedWires);
          onNodesChange(updatedNodes);

          snapNode = junctionNode;
        }
      }
    }

    const startPos = snapNode ? snapNode.pos : pos;
    startNodeRef.current = snapNode;
    setCurrentWire([startPos]);
    setIsDrawing(true);
    setSnapTarget(null);
    setHoveredNode(snapNode);
    setHoveredWireInfo(null);
  }, [getTouchPos, findSnapTarget, nodes, wires, findWireHit, cloneWire, onNodesChange, onWiresChange]);

  /**
   * Handle touch move - update wire preview (mobile support)
   */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    scheduleMoveUpdate(pos);
  }, [getTouchPos, scheduleMoveUpdate]);

  /**
   * Handle touch end - complete wire drawing (mobile support)
   */
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentWire.length === 0) {
      setIsDrawing(false);
      setCurrentWire([]);
      setSnapTarget(null);
      startNodeRef.current = null;
      return;
    }

    const pos = getTouchPos(e);
    const endSnapNode = findSnapTarget(pos);
    const endPos = endSnapNode ? endSnapNode.pos : pos;
    const startPos = currentWire[0];

    const finalPath = buildWirePath(startPos, endPos);
    const pathLength = computePathLength(finalPath);

    if (finalPath.length < 2 || pathLength < MIN_WIRE_LENGTH) {
      setIsDrawing(false);
      setCurrentWire([]);
      setSnapTarget(null);
      setHoveredNode(null);
      setHoveredWireInfo(null);
      startNodeRef.current = null;
      return;
    }

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
          if (ensuredExisting.index === -1 || !ensuredExisting.point) {
            continue;
          }

          const actualPoint = ensuredExisting.point;
          const ensureNew = ensurePointOnWire(newWire, actualPoint, 1);
          if (ensureNew.index === -1 || !ensureNew.point) {
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
    getTouchPos,
    findSnapTarget,
    buildWirePath,
    computePathLength,
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
    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext('2d', { alpha: true, desynchronized: true }) ??
      canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const deviceRatio = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1;
    const displayWidth = width;
    const displayHeight = height;
    const scaledWidth = Math.round(displayWidth * deviceRatio);
    const scaledHeight = Math.round(displayHeight * deviceRatio);

    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
    }

    // Set CSS size explicitly (keeps crispness and prevents layout thrash)
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.save();
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.imageSmoothingEnabled = true;
    // @ts-expect-error - not present in older CanvasRenderingContext2D typings
    ctx.imageSmoothingQuality = 'high';

    const tracePolyline = (points: Vec2[]) => {
      if (points.length < 2) {
        return false;
      }
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      return true;
    };

    const getWirePath = (wireId: string, points: Vec2[]) => {
      const key = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|');
      const existing = pathCacheRef.current.get(wireId);
      if (existing && existing.key === key) {
        return existing.path;
      }
      const path = new Path2D();
      if (points.length >= 2) {
        path.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          path.lineTo(points[i].x, points[i].y);
        }
      }
      pathCacheRef.current.set(wireId, { key, path });
      return path;
    };

    const drawBackground = () => {
      const cacheKey = `${displayWidth}x${displayHeight}@${deviceRatio}`;
      const cached = backgroundCacheRef.current;

      if (!cached || cached.key !== cacheKey) {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = scaledWidth;
        bgCanvas.height = scaledHeight;
        const bgCtx = bgCanvas.getContext('2d');
        if (!bgCtx) {
          backgroundCacheRef.current = null;
          return;
        }

        bgCtx.save();
        bgCtx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

        const gradient = bgCtx.createLinearGradient(0, 0, 0, displayHeight);
        gradient.addColorStop(0, CANVAS_COLORS.backgroundTop);
        gradient.addColorStop(0.55, CANVAS_COLORS.backgroundMid);
        gradient.addColorStop(1, CANVAS_COLORS.backgroundBottom);
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, displayWidth, displayHeight);

        const minorSpacing = ROUTING_GRID_SIZE / 2;
        const majorSpacing = ROUTING_GRID_SIZE * 2;

        if (minorSpacing >= 1) {
          bgCtx.save();
          bgCtx.strokeStyle = CANVAS_COLORS.gridMinor;
          bgCtx.lineWidth = 1;
          bgCtx.beginPath();
          for (let x = minorSpacing; x < displayWidth; x += minorSpacing) {
            bgCtx.moveTo(x, 0);
            bgCtx.lineTo(x, displayHeight);
          }
          for (let y = minorSpacing; y < displayHeight; y += minorSpacing) {
            bgCtx.moveTo(0, y);
            bgCtx.lineTo(displayWidth, y);
          }
          bgCtx.stroke();
          bgCtx.restore();
        }

        bgCtx.save();
        bgCtx.strokeStyle = CANVAS_COLORS.gridMajor;
        bgCtx.lineWidth = 1.2;
        bgCtx.beginPath();
        for (let x = majorSpacing; x < displayWidth; x += majorSpacing) {
          bgCtx.moveTo(x, 0);
          bgCtx.lineTo(x, displayHeight);
        }
        for (let y = majorSpacing; y < displayHeight; y += majorSpacing) {
          bgCtx.moveTo(0, y);
          bgCtx.lineTo(displayWidth, y);
        }
        bgCtx.stroke();
        bgCtx.restore();

        bgCtx.save();
        const ambient = bgCtx.createRadialGradient(
          displayWidth * 0.45,
          displayHeight * 0.38,
          Math.max(displayWidth, displayHeight) * 0.05,
          displayWidth * 0.55,
          displayHeight * 0.58,
          Math.max(displayWidth, displayHeight) * 0.9
        );
        ambient.addColorStop(0, CANVAS_COLORS.ambientCore);
        ambient.addColorStop(0.55, CANVAS_COLORS.ambientMid);
        ambient.addColorStop(1, CANVAS_COLORS.ambientEdge);
        bgCtx.globalCompositeOperation = 'lighter';
        bgCtx.fillStyle = ambient;
        bgCtx.fillRect(0, 0, displayWidth, displayHeight);
        bgCtx.restore();

        bgCtx.save();
        const vignette = bgCtx.createRadialGradient(
          displayWidth / 2,
          displayHeight / 2,
          Math.max(displayWidth, displayHeight) * 0.32,
          displayWidth / 2,
          displayHeight / 2,
          Math.max(displayWidth, displayHeight) * 0.78
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, CANVAS_COLORS.vignette);
        bgCtx.globalCompositeOperation = 'multiply';
        bgCtx.fillStyle = vignette;
        bgCtx.fillRect(0, 0, displayWidth, displayHeight);
        bgCtx.restore();

        bgCtx.globalCompositeOperation = 'source-over';
        bgCtx.restore();

        backgroundCacheRef.current = { key: cacheKey, canvas: bgCanvas };
      }

      const nextCache = backgroundCacheRef.current;
      if (nextCache) {
        ctx.drawImage(nextCache.canvas, 0, 0, displayWidth, displayHeight);
      }
    };

    const drawWire = (wire: Wire, isHighlighted: boolean) => {
      if (wire.points.length < 2) {
        return;
      }

      const start = wire.points[0];
      const end = wire.points[wire.points.length - 1];
      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, CANVAS_COLORS.wireCoreStart);
      gradient.addColorStop(0.5, CANVAS_COLORS.wireCoreMid);
      gradient.addColorStop(1, CANVAS_COLORS.wireCoreEnd);
      const path = getWirePath(wire.id, wire.points);

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = CANVAS_COLORS.wireShadow;
      ctx.lineWidth = 6.6;
      ctx.shadowColor = CANVAS_COLORS.wireShadow;
      ctx.shadowBlur = 18;
      ctx.stroke(path);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isHighlighted ? CANVAS_COLORS.wireGlowActive : CANVAS_COLORS.wireGlow;
      ctx.lineWidth = isHighlighted ? 4.8 : 4.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = isHighlighted ? 0.9 : 0.6;
      ctx.shadowColor = isHighlighted ? CANVAS_COLORS.wireGlowActive : CANVAS_COLORS.wireGlow;
      ctx.shadowBlur = isHighlighted ? 28 : 18;
      ctx.stroke(path);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = gradient;
      ctx.lineWidth = isHighlighted ? 3.6 : 3.2;
      ctx.globalAlpha = 0.96;
      ctx.stroke(path);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = isHighlighted ? 0.75 : 0.4;
      ctx.stroke(path);
      ctx.restore();
    };

    const drawNode = (node: Node) => {
      const style = NODE_STYLE[node.type];
      const isHovered = hoveredNode?.id === node.id;
      const isSnap = snapTarget?.id === node.id;
      const radius = style.radius + (isHovered || isSnap ? 1.1 : 0);

      ctx.save();
      ctx.shadowColor = style.glow;
      ctx.shadowBlur = isHovered || isSnap ? 24 : 14;
      const gradient = ctx.createRadialGradient(
        node.pos.x - radius * 0.35,
        node.pos.y - radius * 0.35,
        radius * 0.1,
        node.pos.x,
        node.pos.y,
        radius + 1.4
      );
      gradient.addColorStop(0, style.center);
      gradient.addColorStop(0.45, style.mid);
      gradient.addColorStop(1, style.edge);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.pos.x, node.pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = isHovered || isSnap ? 2 : 1.4;
      ctx.beginPath();
      ctx.arc(node.pos.x, node.pos.y, radius + 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.65;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.ellipse(
        node.pos.x - radius * 0.3,
        node.pos.y - radius * 0.48,
        radius * 0.45,
        radius * 0.28,
        -0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      if (isSnap) {
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(255, 196, 120, 0.9)';
        ctx.shadowColor = 'rgba(255, 196, 120, 0.65)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(node.pos.x, node.pos.y, radius + 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawActiveWire = () => {
      if (!isDrawing || currentWire.length < 2) {
        return;
      }

      const path = getWirePath('__preview__', currentWire);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 6]);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = CANVAS_COLORS.previewGlow;
      ctx.lineWidth = 4.4;
      ctx.shadowColor = CANVAS_COLORS.previewGlow;
      ctx.shadowBlur = 22;
      ctx.stroke(path);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = CANVAS_COLORS.previewCore;
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = 0.92;
      ctx.stroke(path);
      ctx.restore();
    };

    const drawHoveredWireCue = () => {
      if (!hoveredWireInfo) {
        return;
      }

      const { point } = hoveredWireInfo;

      // Animated pulse effect - grows and fades
      const pulsePhase = pulsePhaseRef.current;
      const pulseScale = 1 + Math.sin(pulsePhase) * 0.25;
      const pulseAlpha = 0.5 + Math.sin(pulsePhase) * 0.3;
      const outerRingScale = 1.5 + Math.sin(pulsePhase * 0.7) * 0.4;
      const outerRingAlpha = 0.3 - Math.sin(pulsePhase * 0.7) * 0.15;

      // Outer expanding ring (like a ripple)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(60, 255, 220, ${Math.max(0, outerRingAlpha)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 14 * outerRingScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Main glowing circle
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(60, 255, 220, ${pulseAlpha * 0.6})`;
      ctx.shadowColor = CANVAS_COLORS.hoveredWirePulse;
      ctx.shadowBlur = 28 * pulseScale;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 11 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Inner bright circle
      ctx.save();
      ctx.fillStyle = `rgba(200, 255, 240, ${0.7 + pulseAlpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // White ring around circle
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + pulseAlpha * 0.2})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 11 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw "+" icon in the center to indicate "add junction here"
      ctx.save();
      ctx.strokeStyle = `rgba(40, 80, 70, ${0.85 + pulseAlpha * 0.1})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      const plusSize = 4 * pulseScale;
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(point.x - plusSize, point.y);
      ctx.lineTo(point.x + plusSize, point.y);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - plusSize);
      ctx.lineTo(point.x, point.y + plusSize);
      ctx.stroke();
      ctx.restore();
    };

    drawBackground();

    for (const wire of wires) {
      drawWire(wire, hoveredWireInfo?.wireId === wire.id);
    }

    for (const node of nodes) {
      drawNode(node);
    }

    drawActiveWire();
    drawHoveredWireCue();

    ctx.restore();
    // If the hover pulse is active, keep repainting at the display refresh rate.
    // We avoid React state updates; redraw is local to this effect.
    let raf: number | null = null;
    if (hoveredWireInfo) {
      // Throttle animation to 30fps on mobile to save battery/CPU
      const isMobile = isTouchDevice();
      const targetInterval = isMobile ? 33 : 16; // 30fps on mobile, 60fps on desktop
      let lastFrameTime = 0;

      const repaint = (now: number) => {
        // Throttle frame rate
        if (now - lastFrameTime < targetInterval) {
          raf = requestAnimationFrame(repaint);
          return;
        }
        lastFrameTime = now;

        // Re-run this effect's drawing logic by triggering a manual redraw:
        // we do it by re-entering the body via requestAnimationFrame closure.
        ctx.save();
        ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.imageSmoothingEnabled = true;
        // @ts-expect-error - not present in older CanvasRenderingContext2D typings
        ctx.imageSmoothingQuality = 'high';

        drawBackground();
        for (const wire of wires) {
          drawWire(wire, hoveredWireInfo?.wireId === wire.id);
        }
        for (const node of nodes) {
          drawNode(node);
        }
        drawActiveWire();
        drawHoveredWireCue();
        ctx.restore();

        raf = requestAnimationFrame(repaint);
      };
      raf = requestAnimationFrame(repaint);
    }

    return () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
      }
    };
  }, [wires, nodes, currentWire, isDrawing, hoveredNode, hoveredWireInfo, width, height, snapTarget]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        cursor: isDrawing ? 'crosshair' : hoveredNode || hoveredWireInfo ? 'pointer' : 'default',
        touchAction: 'none', // Prevent default touch behaviors like scrolling
        borderRadius: '18px',
        border: '1px solid rgba(136, 204, 255, 0.28)',
        boxShadow: '0 24px 48px rgba(6, 16, 36, 0.45)',
        background: 'transparent'
      }}
    />
  );
};
