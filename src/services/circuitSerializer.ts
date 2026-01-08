/**
 * Circuit Serialization Service
 * Handles conversion between runtime circuit state and JSON-serializable format.
 *
 * Key considerations:
 * - Node.attachedWireIds and Wire.attachedNodeIds are Sets, not Arrays
 * - Sets are not JSON-serializable, so we convert to/from Arrays
 * - Maintains backward compatibility with future schema versions
 */

import type { Node, NodeType } from "../model/node";
import type { Wire } from "../model/wire";
import type { Vec2 } from "../model/types";
import { createId } from "../utils/id";

// Serializable versions of the types (Sets converted to Arrays)
export interface SerializedNode {
  id: string;
  type: NodeType;
  pos: Vec2;
  attachedWireIds: string[];
}

export interface SerializedWire {
  id: string;
  points: Vec2[];
  attachedNodeIds: string[];
}

// Component data from the builder
export interface SerializedComponent {
  id: string;
  type: string;
  name?: string;
  label?: string;
  position?: Vec2;
  orientation?: "horizontal" | "vertical";
  properties?: Record<string, unknown>;
}

// Complete circuit state
export interface CircuitState {
  nodes: SerializedNode[];
  wires: SerializedWire[];
  components: SerializedComponent[];
  junctions: SerializedNode[];
}

// Metadata for saved circuits
export interface CircuitMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  tags?: string[];
}

// Complete saved circuit document
export interface SavedCircuit {
  version: string;
  metadata: CircuitMetadata;
  state: CircuitState;
  settings?: {
    wireRoutingMode?: string;
    layoutMode?: string;
    showGrid?: boolean;
    showLabels?: boolean;
  };
}

// Current schema version
export const CIRCUIT_SCHEMA_VERSION = "1.0.0";

/**
 * Serialize a Node to JSON-compatible format
 */
export function serializeNode(node: Node): SerializedNode {
  return {
    id: node.id,
    type: node.type,
    pos: { x: node.pos.x, y: node.pos.y },
    attachedWireIds: Array.from(node.attachedWireIds),
  };
}

/**
 * Deserialize a Node from JSON format
 */
export function deserializeNode(serialized: SerializedNode): Node {
  return {
    id: serialized.id,
    type: serialized.type,
    pos: { x: serialized.pos.x, y: serialized.pos.y },
    attachedWireIds: new Set(serialized.attachedWireIds),
  };
}

/**
 * Serialize a Wire to JSON-compatible format
 */
export function serializeWire(wire: Wire): SerializedWire {
  return {
    id: wire.id,
    points: wire.points.map((p) => ({ x: p.x, y: p.y })),
    attachedNodeIds: Array.from(wire.attachedNodeIds),
  };
}

/**
 * Deserialize a Wire from JSON format
 */
export function deserializeWire(serialized: SerializedWire): Wire {
  return {
    id: serialized.id,
    points: serialized.points.map((p) => ({ x: p.x, y: p.y })),
    attachedNodeIds: new Set(serialized.attachedNodeIds),
  };
}

/**
 * Serialize multiple nodes
 */
export function serializeNodes(nodes: Node[]): SerializedNode[] {
  return nodes.map(serializeNode);
}

/**
 * Deserialize multiple nodes
 */
export function deserializeNodes(serialized: SerializedNode[]): Node[] {
  return serialized.map(deserializeNode);
}

/**
 * Serialize multiple wires
 */
export function serializeWires(wires: Wire[]): SerializedWire[] {
  return wires.map(serializeWire);
}

/**
 * Deserialize multiple wires
 */
export function deserializeWires(serialized: SerializedWire[]): Wire[] {
  return serialized.map(deserializeWire);
}

/**
 * Create a new SavedCircuit document
 */
export function createSavedCircuit(
  name: string,
  state: CircuitState,
  options?: {
    description?: string;
    tags?: string[];
    settings?: SavedCircuit["settings"];
  }
): SavedCircuit {
  const now = Date.now();
  const id = createId("circuit");

  return {
    version: CIRCUIT_SCHEMA_VERSION,
    metadata: {
      id,
      name,
      description: options?.description,
      createdAt: now,
      updatedAt: now,
      tags: options?.tags,
    },
    state,
    settings: options?.settings,
  };
}

/**
 * Validate a circuit document structure
 */
export function validateCircuitDocument(doc: unknown): doc is SavedCircuit {
  if (!doc || typeof doc !== "object") {
    return false;
  }

  const circuit = doc as Partial<SavedCircuit>;

  if (typeof circuit.version !== "string") {
    return false;
  }

  if (!circuit.metadata || typeof circuit.metadata !== "object") {
    return false;
  }

  const meta = circuit.metadata as Partial<CircuitMetadata>;
  if (
    typeof meta.id !== "string" ||
    typeof meta.name !== "string" ||
    typeof meta.createdAt !== "number" ||
    typeof meta.updatedAt !== "number"
  ) {
    return false;
  }

  if (!circuit.state || typeof circuit.state !== "object") {
    return false;
  }

  const state = circuit.state as Partial<CircuitState>;
  if (
    !Array.isArray(state.nodes) ||
    !Array.isArray(state.wires) ||
    !Array.isArray(state.components)
  ) {
    return false;
  }

  return true;
}

/**
 * Migrate older circuit documents to current version
 */
export function migrateCircuitDocument(doc: SavedCircuit): SavedCircuit {
  // Currently at v1.0.0 - no migrations needed yet
  // Future versions will add migration logic here
  return {
    ...doc,
    version: CIRCUIT_SCHEMA_VERSION,
  };
}

/**
 * Generate a circuit summary for display
 */
export function getCircuitSummary(circuit: SavedCircuit): {
  componentCount: number;
  wireCount: number;
  junctionCount: number;
  nodeCount: number;
} {
  return {
    componentCount: circuit.state.components.length,
    wireCount: circuit.state.wires.length,
    junctionCount: circuit.state.junctions.length,
    nodeCount: circuit.state.nodes.length,
  };
}
