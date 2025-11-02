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
const MIN_WIRE_LENGTH = 1; // px - ignore jitter-sized wires

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
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const deviceRatio = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const displayWidth = width;
    const displayHeight = height;
    const scaledWidth = Math.round(displayWidth * deviceRatio);
    const scaledHeight = Math.round(displayHeight * deviceRatio);

    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
    }

    if (canvas.style.width !== `${displayWidth}px`) {
      canvas.style.width = `${displayWidth}px`;
    }
    if (canvas.style.height !== `${displayHeight}px`) {
      canvas.style.height = `${displayHeight}px`;
    }

    ctx.save();
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

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

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
      gradient.addColorStop(0, CANVAS_COLORS.backgroundTop);
      gradient.addColorStop(0.55, CANVAS_COLORS.backgroundMid);
      gradient.addColorStop(1, CANVAS_COLORS.backgroundBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const minorSpacing = ROUTING_GRID_SIZE / 2;
      const majorSpacing = ROUTING_GRID_SIZE * 2;

      if (minorSpacing >= 1) {
        ctx.save();
        ctx.strokeStyle = CANVAS_COLORS.gridMinor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = minorSpacing; x < displayWidth; x += minorSpacing) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, displayHeight);
        }
        for (let y = minorSpacing; y < displayHeight; y += minorSpacing) {
          ctx.moveTo(0, y);
          ctx.lineTo(displayWidth, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = CANVAS_COLORS.gridMajor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = majorSpacing; x < displayWidth; x += majorSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayHeight);
      }
      for (let y = majorSpacing; y < displayHeight; y += majorSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(displayWidth, y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      const ambient = ctx.createRadialGradient(
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
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.restore();

      ctx.save();
      const vignette = ctx.createRadialGradient(
        displayWidth / 2,
        displayHeight / 2,
        Math.max(displayWidth, displayHeight) * 0.32,
        displayWidth / 2,
        displayHeight / 2,
        Math.max(displayWidth, displayHeight) * 0.78
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, CANVAS_COLORS.vignette);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
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

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = CANVAS_COLORS.wireShadow;
      ctx.lineWidth = 6.6;
      ctx.shadowColor = CANVAS_COLORS.wireShadow;
      ctx.shadowBlur = 18;
      tracePolyline(wire.points);
      ctx.stroke();
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
      tracePolyline(wire.points);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = gradient;
      ctx.lineWidth = isHighlighted ? 3.6 : 3.2;
      ctx.globalAlpha = 0.96;
      tracePolyline(wire.points);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = isHighlighted ? 0.75 : 0.4;
      tracePolyline(wire.points);
      ctx.stroke();
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

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 6]);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = CANVAS_COLORS.previewGlow;
      ctx.lineWidth = 4.4;
      ctx.shadowColor = CANVAS_COLORS.previewGlow;
      ctx.shadowBlur = 22;
      tracePolyline(currentWire);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = CANVAS_COLORS.previewCore;
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = 0.92;
      tracePolyline(currentWire);
      ctx.stroke();
      ctx.restore();
    };

    const drawHoveredWireCue = () => {
      if (!hoveredWireInfo) {
        return;
      }

      const { point } = hoveredWireInfo;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = CANVAS_COLORS.hoveredWirePulse;
      ctx.shadowColor = CANVAS_COLORS.hoveredWirePulse;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
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
  }, [wires, nodes, currentWire, isDrawing, hoveredNode, hoveredWireInfo, width, height, snapTarget]);

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
        borderRadius: '18px',
        border: '1px solid rgba(136, 204, 255, 0.28)',
        boxShadow: '0 24px 48px rgba(6, 16, 36, 0.45)',
        background: 'transparent'
      }}
    />
  );
};
