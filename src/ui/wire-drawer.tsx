import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Vec2 } from '../model/types';
import type { Node } from '../model/node';
import type { Wire } from '../model/wire';
import { createNode, findClosestNode, shouldMergeNodes, mergeNodes } from '../model/node';
import { createWire, insertPointIntoWire, getWireEndpoints, updateWireEndpoint } from '../model/wire';
import { segmentIntersect, distance } from '../utils/geom';
import { rebuildAdjacencyForWires } from '../sim/connectivity';

// Configuration constants
const SNAP_RADIUS = 12; // px - snap endpoint to nearest pin/junction
const INTERSECT_TOLERANCE = 4; // px - detect crossing intersections
const RELEASE_DISTANCE = 18; // px - detach when component moves beyond this
const MERGE_RADIUS = 6; // px - merge nodes when within this distance

interface WireDrawerProps {
  width: number;
  height: number;
  wires: Wire[];
  nodes: Node[];
  onWiresChange: (wires: Wire[]) => void;
  onNodesChange: (nodes: Node[]) => void;
}

export const WireDrawer: React.FC<WireDrawerProps> = ({
  width,
  height,
  wires,
  nodes,
  onWiresChange,
  onNodesChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWire, setCurrentWire] = useState<Vec2[]>([]);
  const [snapTarget, setSnapTarget] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

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
    const snapNode = findSnapTarget(pos);
    
    const startPos = snapNode ? snapNode.pos : pos;
    setCurrentWire([startPos]);
    setIsDrawing(true);
    setSnapTarget(snapNode);
  }, [getMousePos, findSnapTarget]);

  /**
   * Handle mouse move - update wire preview and show snap target
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const snapNode = findSnapTarget(pos);
    
    setHoveredNode(snapNode);
    
    if (isDrawing && currentWire.length > 0) {
      const endPos = snapNode ? snapNode.pos : pos;
      setCurrentWire([currentWire[0], endPos]);
      setSnapTarget(snapNode);
    }
  }, [getMousePos, findSnapTarget, isDrawing, currentWire]);

  /**
   * Handle mouse up - complete wire drawing
   */
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentWire.length < 1) {
      setIsDrawing(false);
      setCurrentWire([]);
      return;
    }

    const pos = getMousePos(e);
    const endSnapNode = findSnapTarget(pos);
    const endPos = endSnapNode ? endSnapNode.pos : pos;

    // Create final wire
    const finalPoints = [currentWire[0], endPos];
    const newWire = createWire(finalPoints);
    
    // Handle start node
    let startNode: Node | null = null;
    if (snapTarget) {
      startNode = snapTarget;
    } else {
      // Create anchor node at start
      startNode = createNode('wireAnchor', currentWire[0]);
    }
    
    // Handle end node
    let endNode: Node | null = null;
    if (endSnapNode) {
      endNode = endSnapNode;
    } else {
      // Create anchor node at end
      endNode = createNode('wireAnchor', endPos);
    }
    
    // Check for intersections with existing wires
    const newNodes: Node[] = [];
    const updatedWires = [...wires];
    
    for (let i = 0; i < updatedWires.length; i++) {
      const wire = updatedWires[i];
      
      // Check each segment of existing wire
      for (let j = 0; j < wire.points.length - 1; j++) {
        const A = wire.points[j];
        const B = wire.points[j + 1];
        const C = finalPoints[0];
        const D = finalPoints[1];
        
        const intersection = segmentIntersect(A, B, C, D);
        
        if (intersection) {
          // Check if intersection is close enough to create junction
          const distToStart = distance(intersection, C);
          const distToEnd = distance(intersection, D);
          
          if (distToStart > INTERSECT_TOLERANCE && distToEnd > INTERSECT_TOLERANCE) {
            // Create junction node at intersection
            const junctionNode = createNode('junction', intersection);
            newNodes.push(junctionNode);
            
            // Insert junction into existing wire
            insertPointIntoWire(wire, intersection, j);
            
            // Insert junction into new wire (split it)
            insertPointIntoWire(newWire, intersection, 0);
          }
        }
      }
    }
    
    // Add new nodes (avoiding duplicates)
    const updatedNodes = [...nodes];
    
    if (!nodes.find(n => n.id === startNode!.id)) {
      updatedNodes.push(startNode);
    }
    if (!nodes.find(n => n.id === endNode!.id)) {
      updatedNodes.push(endNode);
    }
    updatedNodes.push(...newNodes);
    
    // Check for nodes that should be merged
    const nodesToMerge: [Node, Node][] = [];
    for (let i = 0; i < updatedNodes.length; i++) {
      for (let j = i + 1; j < updatedNodes.length; j++) {
        if (shouldMergeNodes(updatedNodes[i], updatedNodes[j], MERGE_RADIUS)) {
          nodesToMerge.push([updatedNodes[i], updatedNodes[j]]);
        }
      }
    }
    
    // Perform merges
    const mergedNodeIds = new Set<string>();
    for (const [nodeA, nodeB] of nodesToMerge) {
      if (!mergedNodeIds.has(nodeB.id)) {
        mergeNodes(nodeA, nodeB);
        mergedNodeIds.add(nodeB.id);
      }
    }
    
    // Filter out merged nodes
    const finalNodes = updatedNodes.filter(n => !mergedNodeIds.has(n.id));
    
    // Add new wire
    updatedWires.push(newWire);
    
    // Rebuild adjacency
    rebuildAdjacencyForWires(updatedWires, finalNodes);
    
    // Update state
    onWiresChange(updatedWires);
    onNodesChange(finalNodes);
    
    // Reset drawing state
    setIsDrawing(false);
    setCurrentWire([]);
    setSnapTarget(null);
  }, [isDrawing, currentWire, getMousePos, findSnapTarget, snapTarget, wires, nodes, onWiresChange, onNodesChange]);

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
  }, [wires, nodes, currentWire, isDrawing, hoveredNode, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isDrawing ? 'crosshair' : 'default', border: '1px solid #374151' }}
    />
  );
};
