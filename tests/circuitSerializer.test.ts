import { describe, it, expect } from 'vitest';
import {
  serializeNode,
  deserializeNode,
  serializeWire,
  deserializeWire,
  serializeNodes,
  deserializeNodes,
  serializeWires,
  deserializeWires,
  createSavedCircuit,
  validateCircuitDocument,
  migrateCircuitDocument,
  getCircuitSummary,
  CIRCUIT_SCHEMA_VERSION,
} from '../src/services/circuitSerializer';
import type { SerializedNode, SerializedWire, CircuitState, SavedCircuit } from '../src/services/circuitSerializer';
import type { Node } from '../src/model/node';
import type { Wire } from '../src/model/wire';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNode(overrides?: Partial<Node>): Node {
  return {
    id: 'node-1',
    type: 'junction',
    pos: { x: 5, y: 10 },
    attachedWireIds: new Set(['wire-1', 'wire-2']),
    ...overrides,
  };
}

function makeWire(overrides?: Partial<Wire>): Wire {
  return {
    id: 'wire-1',
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
    attachedNodeIds: new Set(['node-1', 'node-2']),
    ...overrides,
  };
}

function makeCircuitState(overrides?: Partial<CircuitState>): CircuitState {
  return {
    nodes: [],
    wires: [],
    components: [],
    junctions: [],
    ...overrides,
  };
}

// ─── serializeNode / deserializeNode ────────────────────────────────────────

describe('serializeNode', () => {
  it('should convert attachedWireIds Set to an array', () => {
    const node = makeNode();
    const serialized = serializeNode(node);
    expect(Array.isArray(serialized.attachedWireIds)).toBe(true);
    expect(serialized.attachedWireIds).toContain('wire-1');
    expect(serialized.attachedWireIds).toContain('wire-2');
  });

  it('should preserve id, type, and pos', () => {
    const node = makeNode({ id: 'n-abc', type: 'componentPin', pos: { x: 3, y: 7 } });
    const s = serializeNode(node);
    expect(s.id).toBe('n-abc');
    expect(s.type).toBe('componentPin');
    expect(s.pos).toEqual({ x: 3, y: 7 });
  });

  it('should produce a plain JSON-serializable object (no Sets)', () => {
    const node = makeNode();
    const s = serializeNode(node);
    // JSON round-trip must not throw
    const json = JSON.stringify(s);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('deserializeNode', () => {
  it('should convert attachedWireIds array back to a Set', () => {
    const serialized: SerializedNode = {
      id: 'n1',
      type: 'junction',
      pos: { x: 0, y: 0 },
      attachedWireIds: ['wire-a', 'wire-b'],
    };
    const node = deserializeNode(serialized);
    expect(node.attachedWireIds).toBeInstanceOf(Set);
    expect(node.attachedWireIds.has('wire-a')).toBe(true);
    expect(node.attachedWireIds.has('wire-b')).toBe(true);
  });

  it('should produce an empty Set for an empty array', () => {
    const s: SerializedNode = { id: 'n2', type: 'wireAnchor', pos: { x: 1, y: 2 }, attachedWireIds: [] };
    const node = deserializeNode(s);
    expect(node.attachedWireIds.size).toBe(0);
  });
});

describe('serializeNode / deserializeNode roundtrip', () => {
  it('should produce an equivalent node after serialize → deserialize', () => {
    const original = makeNode({ id: 'rt-1', type: 'componentPin', pos: { x: 9, y: 3 } });
    original.attachedWireIds.add('wire-x');

    const restored = deserializeNode(serializeNode(original));

    expect(restored.id).toBe(original.id);
    expect(restored.type).toBe(original.type);
    expect(restored.pos).toEqual(original.pos);
    expect(restored.attachedWireIds.has('wire-x')).toBe(true);
    expect(restored.attachedWireIds.has('wire-1')).toBe(true);
    expect(restored.attachedWireIds.has('wire-2')).toBe(true);
  });
});

// ─── serializeWire / deserializeWire ────────────────────────────────────────

describe('serializeWire', () => {
  it('should convert attachedNodeIds Set to an array', () => {
    const wire = makeWire();
    const s = serializeWire(wire);
    expect(Array.isArray(s.attachedNodeIds)).toBe(true);
    expect(s.attachedNodeIds).toContain('node-1');
    expect(s.attachedNodeIds).toContain('node-2');
  });

  it('should copy points as plain objects', () => {
    const wire = makeWire();
    const s = serializeWire(wire);
    expect(s.points).toHaveLength(3);
    expect(s.points[0]).toEqual({ x: 0, y: 0 });
  });

  it('should produce a JSON-serializable object', () => {
    const s = serializeWire(makeWire());
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});

describe('deserializeWire', () => {
  it('should convert attachedNodeIds array back to a Set', () => {
    const serialized: SerializedWire = {
      id: 'w1',
      points: [{ x: 0, y: 0 }, { x: 5, y: 0 }],
      attachedNodeIds: ['node-a'],
    };
    const wire = deserializeWire(serialized);
    expect(wire.attachedNodeIds).toBeInstanceOf(Set);
    expect(wire.attachedNodeIds.has('node-a')).toBe(true);
  });
});

describe('serializeWire / deserializeWire roundtrip', () => {
  it('should produce an equivalent wire after serialize → deserialize', () => {
    const original = makeWire();
    const restored = deserializeWire(serializeWire(original));

    expect(restored.id).toBe(original.id);
    expect(restored.points).toEqual(original.points);
    expect(restored.attachedNodeIds.has('node-1')).toBe(true);
    expect(restored.attachedNodeIds.has('node-2')).toBe(true);
  });
});

// ─── Batch helpers ───────────────────────────────────────────────────────────

describe('serializeNodes / deserializeNodes', () => {
  it('should serialize and deserialize multiple nodes', () => {
    const nodes = [
      makeNode({ id: 'n1', pos: { x: 0, y: 0 } }),
      makeNode({ id: 'n2', type: 'componentPin', pos: { x: 5, y: 5 } }),
    ];

    const serialized = serializeNodes(nodes);
    expect(serialized).toHaveLength(2);

    const restored = deserializeNodes(serialized);
    expect(restored[0].id).toBe('n1');
    expect(restored[1].id).toBe('n2');
    restored.forEach((n) => expect(n.attachedWireIds).toBeInstanceOf(Set));
  });

  it('should handle an empty array', () => {
    expect(serializeNodes([])).toEqual([]);
    expect(deserializeNodes([])).toEqual([]);
  });
});

describe('serializeWires / deserializeWires', () => {
  it('should serialize and deserialize multiple wires', () => {
    const wires = [
      makeWire({ id: 'w1' }),
      makeWire({ id: 'w2', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }] }),
    ];

    const serialized = serializeWires(wires);
    expect(serialized).toHaveLength(2);

    const restored = deserializeWires(serialized);
    expect(restored[0].id).toBe('w1');
    expect(restored[1].id).toBe('w2');
    restored.forEach((w) => expect(w.attachedNodeIds).toBeInstanceOf(Set));
  });
});

// ─── createSavedCircuit ──────────────────────────────────────────────────────

describe('createSavedCircuit', () => {
  it('should create a valid SavedCircuit with correct schema version', () => {
    const state = makeCircuitState();
    const saved = createSavedCircuit('My Circuit', state);
    expect(saved.version).toBe(CIRCUIT_SCHEMA_VERSION);
  });

  it('should embed the circuit name in metadata', () => {
    const saved = createSavedCircuit('Test Circuit', makeCircuitState());
    expect(saved.metadata.name).toBe('Test Circuit');
  });

  it('should set createdAt and updatedAt to the same timestamp (within 50ms)', () => {
    const before = Date.now();
    const saved = createSavedCircuit('Circuit', makeCircuitState());
    const after = Date.now();

    expect(saved.metadata.createdAt).toBeGreaterThanOrEqual(before);
    expect(saved.metadata.createdAt).toBeLessThanOrEqual(after);
    expect(saved.metadata.createdAt).toBe(saved.metadata.updatedAt);
  });

  it('should include optional description and tags', () => {
    const saved = createSavedCircuit('My Circuit', makeCircuitState(), {
      description: 'A test',
      tags: ['series', 'resistor'],
    });
    expect(saved.metadata.description).toBe('A test');
    expect(saved.metadata.tags).toContain('series');
  });

  it('should include optional settings', () => {
    const saved = createSavedCircuit('My Circuit', makeCircuitState(), {
      settings: { showGrid: true, wireRoutingMode: 'orthogonal' },
    });
    expect(saved.settings?.showGrid).toBe(true);
    expect(saved.settings?.wireRoutingMode).toBe('orthogonal');
  });

  it('should generate a unique id on every call', () => {
    const ids = new Set(
      Array.from({ length: 10 }, () => createSavedCircuit('C', makeCircuitState()).metadata.id)
    );
    expect(ids.size).toBe(10);
  });
});

// ─── validateCircuitDocument ─────────────────────────────────────────────────

describe('validateCircuitDocument', () => {
  function makeValidDoc(): SavedCircuit {
    return createSavedCircuit('Valid', makeCircuitState());
  }

  it('should accept a valid SavedCircuit document', () => {
    expect(validateCircuitDocument(makeValidDoc())).toBe(true);
  });

  it('should reject null and undefined', () => {
    expect(validateCircuitDocument(null)).toBe(false);
    expect(validateCircuitDocument(undefined)).toBe(false);
  });

  it('should reject a plain string', () => {
    expect(validateCircuitDocument('not an object')).toBe(false);
  });

  it('should reject a document missing the version field', () => {
    const doc = makeValidDoc() as Record<string, unknown>;
    delete doc['version'];
    expect(validateCircuitDocument(doc)).toBe(false);
  });

  it('should reject a document with a non-string version', () => {
    const doc = { ...makeValidDoc(), version: 42 };
    expect(validateCircuitDocument(doc)).toBe(false);
  });

  it('should reject a document with missing metadata', () => {
    const doc = makeValidDoc() as Record<string, unknown>;
    delete doc['metadata'];
    expect(validateCircuitDocument(doc)).toBe(false);
  });

  it('should reject metadata missing required fields', () => {
    const doc = makeValidDoc();
    // Remove name from metadata
    const badDoc = { ...doc, metadata: { ...doc.metadata, name: undefined } };
    expect(validateCircuitDocument(badDoc)).toBe(false);
  });

  it('should reject a document missing state', () => {
    const doc = makeValidDoc() as Record<string, unknown>;
    delete doc['state'];
    expect(validateCircuitDocument(doc)).toBe(false);
  });

  it('should reject state where nodes is not an array', () => {
    const doc = makeValidDoc();
    const badDoc = { ...doc, state: { ...doc.state, nodes: 'not-array' } };
    expect(validateCircuitDocument(badDoc)).toBe(false);
  });
});

// ─── migrateCircuitDocument ──────────────────────────────────────────────────

describe('migrateCircuitDocument', () => {
  it('should return a document at the current schema version', () => {
    const doc = createSavedCircuit('Old Circuit', makeCircuitState());
    const migrated = migrateCircuitDocument({ ...doc, version: '0.9.0' });
    expect(migrated.version).toBe(CIRCUIT_SCHEMA_VERSION);
  });

  it('should preserve all other fields during migration', () => {
    const original = createSavedCircuit('Circuit', makeCircuitState(), { description: 'keep me' });
    const migrated = migrateCircuitDocument(original);
    expect(migrated.metadata.name).toBe('Circuit');
    expect(migrated.metadata.description).toBe('keep me');
    expect(migrated.state).toEqual(original.state);
  });
});

// ─── getCircuitSummary ───────────────────────────────────────────────────────

describe('getCircuitSummary', () => {
  it('should count components, wires, junctions, and nodes', () => {
    const state: CircuitState = {
      nodes: [
        { id: 'n1', type: 'junction', pos: { x: 0, y: 0 }, attachedWireIds: [] },
        { id: 'n2', type: 'junction', pos: { x: 1, y: 0 }, attachedWireIds: [] },
      ],
      wires: [
        { id: 'w1', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], attachedNodeIds: [] },
      ],
      components: [
        { id: 'c1', type: 'resistor' },
        { id: 'c2', type: 'battery' },
        { id: 'c3', type: 'led' },
      ],
      junctions: [
        { id: 'j1', type: 'junction', pos: { x: 0, y: 0 }, attachedWireIds: [] },
      ],
    };

    const doc = createSavedCircuit('Test', state);
    const summary = getCircuitSummary(doc);

    expect(summary.nodeCount).toBe(2);
    expect(summary.wireCount).toBe(1);
    expect(summary.componentCount).toBe(3);
    expect(summary.junctionCount).toBe(1);
  });

  it('should return all zeros for an empty circuit', () => {
    const doc = createSavedCircuit('Empty', makeCircuitState());
    const summary = getCircuitSummary(doc);
    expect(summary.nodeCount).toBe(0);
    expect(summary.wireCount).toBe(0);
    expect(summary.componentCount).toBe(0);
    expect(summary.junctionCount).toBe(0);
  });
});

// ─── CIRCUIT_SCHEMA_VERSION ──────────────────────────────────────────────────

describe('CIRCUIT_SCHEMA_VERSION', () => {
  it('should be a non-empty string', () => {
    expect(typeof CIRCUIT_SCHEMA_VERSION).toBe('string');
    expect(CIRCUIT_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});
