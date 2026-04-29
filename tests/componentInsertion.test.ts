import { describe, it, expect } from 'vitest';
import {
  findWireHit,
  insertComponentOntoCircuit,
  applyInsertionResult,
  type WireHit,
  type ComponentInsertionResult,
} from '../src/schematic/componentInsertion';
import type { SchematicElement, TwoTerminalElement, WireElement } from '../src/schematic/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal horizontal wire element from (x0, 0) to (x1, 0). */
function makeWire(
  id: string,
  path: Array<{ x: number; z: number }>
): WireElement {
  return { id, kind: 'wire', path };
}

/** Build a minimal resistor (two-terminal element). */
function makeResistor(
  id: string,
  start: { x: number; z: number },
  end: { x: number; z: number }
): TwoTerminalElement {
  return {
    id,
    kind: 'resistor',
    label: id,
    start,
    end,
    orientation: 'horizontal',
  };
}

// ─── findWireHit ──────────────────────────────────────────────────────────────

describe('findWireHit', () => {
  it('returns null when there are no wires', () => {
    const elements: SchematicElement[] = [];
    expect(findWireHit({ x: 5, z: 0 }, elements, 0.6)).toBeNull();
  });

  it('returns null when non-wire elements are present', () => {
    const resistor = makeResistor('r1', { x: 0, z: 0 }, { x: 4, z: 0 });
    expect(findWireHit({ x: 2, z: 0 }, [resistor], 0.6)).toBeNull();
  });

  it('returns null when the point is too far from any wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    expect(findWireHit({ x: 5, z: 5 }, [wire], 0.6)).toBeNull();
  });

  it('snaps to the midpoint of a horizontal wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const hit = findWireHit({ x: 5, z: 0.2 }, [wire], 0.6);
    expect(hit).not.toBeNull();
    expect(hit!.wire.id).toBe('w1');
    expect(hit!.snapped.x).toBeCloseTo(5);
    expect(hit!.snapped.z).toBeCloseTo(0);
  });

  it('snaps to the nearest point on a vertical wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 0, z: 10 }]);
    const hit = findWireHit({ x: 0.3, z: 7 }, [wire], 0.6);
    expect(hit).not.toBeNull();
    expect(hit!.snapped.z).toBeCloseTo(7);
    expect(hit!.snapped.x).toBeCloseTo(0);
  });

  it('snaps to the start endpoint of a wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const hit = findWireHit({ x: 0, z: 0.1 }, [wire], 0.6);
    expect(hit).not.toBeNull();
    expect(hit!.snapped.x).toBeCloseTo(0);
  });

  it('snaps to the end endpoint of a wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const hit = findWireHit({ x: 10, z: 0.1 }, [wire], 0.6);
    expect(hit).not.toBeNull();
    expect(hit!.snapped.x).toBeCloseTo(10);
  });

  it('picks the closer wire when multiple wires are present', () => {
    const wire1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const wire2 = makeWire('w2', [{ x: 0, z: 5 }, { x: 10, z: 5 }]);
    const hit = findWireHit({ x: 5, z: 0.3 }, [wire1, wire2], 1);
    expect(hit!.wire.id).toBe('w1');
  });

  it('snaps correctly onto a multi-segment wire', () => {
    // L-shaped wire: (0,0) → (5,0) → (5,10)
    const wire = makeWire('w1', [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 5, z: 10 },
    ]);
    // Point near the vertical segment
    const hit = findWireHit({ x: 5.2, z: 7 }, [wire], 0.6);
    expect(hit).not.toBeNull();
    expect(hit!.snapped.x).toBeCloseTo(5);
    expect(hit!.snapped.z).toBeCloseTo(7);
  });
});

// ─── insertComponentOntoCircuit – floating ────────────────────────────────────

describe('insertComponentOntoCircuit – floating', () => {
  it('returns floating when there are no wires', () => {
    const comp = makeResistor('r1', { x: 2, z: 0 }, { x: 4, z: 0 });
    const result = insertComponentOntoCircuit(comp, []);
    expect(result.success).toBe(false);
    expect(result.insertionType).toBe('floating');
  });

  it('returns floating when both terminals are far from all wires', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 2, z: 5 }, { x: 4, z: 5 });
    const result = insertComponentOntoCircuit(comp, [wire]);
    expect(result.success).toBe(false);
    expect(result.insertionType).toBe('floating');
  });

  it('returns floating when both terminals collapse to the same wire point', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // Both terminals are nearly co-located and project to the same wire point
    const comp = makeResistor(
      'r1',
      { x: 5, z: 0.1 },
      { x: 5.05, z: 0.1 }
    );
    const result = insertComponentOntoCircuit(comp, [wire], { snapTolerance: 1 });
    expect(result.success).toBe(false);
    expect(result.insertionType).toBe('floating');
  });
});

// ─── insertComponentOntoCircuit – series ──────────────────────────────────────

describe('insertComponentOntoCircuit – series', () => {
  it('splits a wire into two segments when component is placed in the middle', () => {
    // Wire: (0,0) → (10,0)
    // Component: start=(2,0), end=(8,0)  — spans the middle section
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 2, z: 0 }, { x: 8, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('series');
    expect(result.elementsToRemove).toEqual(['w1']);
    expect(result.elementsToAdd).toHaveLength(2);

    // Segment before the component: (0,0) → (2,0)
    const before = result.elementsToAdd[0];
    expect(before.path[0]).toMatchObject({ x: 0, z: 0 });
    expect(before.path[before.path.length - 1]).toMatchObject({ x: 2, z: 0 });

    // Segment after the component: (8,0) → (10,0)
    const after = result.elementsToAdd[1];
    expect(after.path[0]).toMatchObject({ x: 8, z: 0 });
    expect(after.path[after.path.length - 1]).toMatchObject({ x: 10, z: 0 });
  });

  it('produces one segment when the component start snaps to the wire start', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // start terminal at wire origin → before-segment degenerates
    const comp = makeResistor('r1', { x: 0, z: 0 }, { x: 5, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.elementsToAdd).toHaveLength(1);
    // Only the after-segment remains: (5,0) → (10,0)
    const after = result.elementsToAdd[0];
    expect(after.path[0]).toMatchObject({ x: 5, z: 0 });
  });

  it('produces one segment when the component end snaps to the wire end', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 3, z: 0 }, { x: 10, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.elementsToAdd).toHaveLength(1);
    const before = result.elementsToAdd[0];
    expect(before.path[before.path.length - 1]).toMatchObject({ x: 3, z: 0 });
  });

  it('produces zero segments when the component spans the entire wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 0, z: 0 }, { x: 10, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.elementsToAdd).toHaveLength(0);
  });

  it('updates the component terminals to the snapped wire positions', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // terminals are slightly off the wire (within snap tolerance)
    const comp = makeResistor('r1', { x: 2, z: 0.3 }, { x: 7, z: -0.2 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.updatedComponent.start.z).toBeCloseTo(0);
    expect(result.updatedComponent.end.z).toBeCloseTo(0);
    expect(result.updatedComponent.start.x).toBeCloseTo(2);
    expect(result.updatedComponent.end.x).toBeCloseTo(7);
  });

  it('correctly handles reversed terminal order (end before start on wire)', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // start=8, end=2 — reversed relative to wire direction
    const comp = makeResistor('r1', { x: 8, z: 0 }, { x: 2, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('series');
    expect(result.elementsToAdd).toHaveLength(2);
    // Component start/end should still reflect the original orientation
    expect(result.updatedComponent.start.x).toBeCloseTo(8);
    expect(result.updatedComponent.end.x).toBeCloseTo(2);
  });

  it('works on a multi-segment (L-shaped) wire', () => {
    // Wire: (0,0) → (10,0) → (10,10)
    const wire = makeWire('w1', [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ]);
    // Component on the vertical segment
    const comp = makeResistor('r1', { x: 10, z: 3 }, { x: 10, z: 7 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('series');
    expect(result.elementsToRemove).toEqual(['w1']);
    expect(result.elementsToAdd).toHaveLength(2);

    // Before segment should include the horizontal portion + down to z=3
    const before = result.elementsToAdd[0];
    expect(before.path[0]).toMatchObject({ x: 0, z: 0 });

    // After segment should run from z=7 to z=10
    const after = result.elementsToAdd[1];
    expect(after.path[after.path.length - 1]).toMatchObject({ x: 10, z: 10 });
  });

  it('respects custom snapTolerance', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // Terminals are 0.8 units away — within tolerance 1.0, outside default 0.6
    const comp = makeResistor('r1', { x: 2, z: 0.8 }, { x: 8, z: 0.8 });

    const result1 = insertComponentOntoCircuit(comp, [wire]); // default tolerance
    expect(result1.success).toBe(false);

    const result2 = insertComponentOntoCircuit(comp, [wire], { snapTolerance: 1 });
    expect(result2.success).toBe(true);
    if (!result2.success) return;
    expect(result2.insertionType).toBe('series');
  });
});

// ─── insertComponentOntoCircuit – bridging ────────────────────────────────────

describe('insertComponentOntoCircuit – bridging', () => {
  it('splits each wire and bridges them with the component', () => {
    // Two parallel horizontal wires
    const wire1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const wire2 = makeWire('w2', [{ x: 0, z: 4 }, { x: 10, z: 4 }]);

    // Component bridges across at x=5
    const comp = makeResistor('r1', { x: 5, z: 0 }, { x: 5, z: 4 });

    const result = insertComponentOntoCircuit(comp, [wire1, wire2]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('bridging');
    expect(result.elementsToRemove).toContain('w1');
    expect(result.elementsToRemove).toContain('w2');
    // Each wire generates up to 2 segments → up to 4 total
    expect(result.elementsToAdd.length).toBeGreaterThanOrEqual(2);
  });

  it('snaps bridging terminals onto the nearest wire', () => {
    const wire1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const wire2 = makeWire('w2', [{ x: 0, z: 4 }, { x: 10, z: 4 }]);

    // Terminals are slightly off the wires
    const comp = makeResistor('r1', { x: 5, z: 0.3 }, { x: 5, z: 3.8 });

    const result = insertComponentOntoCircuit(comp, [wire1, wire2]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.updatedComponent.start.z).toBeCloseTo(0);
    expect(result.updatedComponent.end.z).toBeCloseTo(4);
  });
});

// ─── insertComponentOntoCircuit – partial ─────────────────────────────────────

describe('insertComponentOntoCircuit – partial', () => {
  it('returns partial when only the start terminal is near a wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // end terminal is far from any wire
    const comp = makeResistor('r1', { x: 3, z: 0 }, { x: 3, z: 5 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('partial');
    expect(result.updatedComponent.start.z).toBeCloseTo(0); // snapped
    expect(result.updatedComponent.end.z).toBeCloseTo(5);   // unchanged
  });

  it('returns partial when only the end terminal is near a wire', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    // start terminal is far from any wire
    const comp = makeResistor('r1', { x: 7, z: 5 }, { x: 7, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.insertionType).toBe('partial');
    expect(result.updatedComponent.start.z).toBeCloseTo(5); // unchanged
    expect(result.updatedComponent.end.z).toBeCloseTo(0);   // snapped
  });

  it('splits the hit wire at the partial snap point', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 5, z: 0 }, { x: 5, z: 5 });

    const result = insertComponentOntoCircuit(comp, [wire]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.elementsToRemove).toEqual(['w1']);
    // Wire split at x=5 → two segments
    expect(result.elementsToAdd).toHaveLength(2);
  });
});

// ─── applyInsertionResult ─────────────────────────────────────────────────────

describe('applyInsertionResult', () => {
  it('appends the component unchanged when result is floating', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 2, z: 5 }, { x: 4, z: 5 });

    const result = insertComponentOntoCircuit(comp, [wire]);
    expect(result.success).toBe(false);

    const updated = applyInsertionResult([wire], comp, result);
    expect(updated).toHaveLength(2); // original wire + component
    expect(updated.find(e => e.id === 'r1')).toBeTruthy();
    expect(updated.find(e => e.id === 'w1')).toBeTruthy();
  });

  it('replaces the original wire with new segments and adds the component', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 3, z: 0 }, { x: 7, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);
    expect(result.success).toBe(true);

    const updated = applyInsertionResult([wire], comp, result);

    // Original wire should be gone
    expect(updated.find(e => e.id === 'w1')).toBeUndefined();
    // Two new wire segments + updated component
    const wires = updated.filter(e => e.kind === 'wire');
    expect(wires).toHaveLength(2);
    expect(updated.find(e => e.id === comp.id)).toBeTruthy();
  });

  it('does not duplicate the component if it already exists in the element list', () => {
    const wire = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const comp = makeResistor('r1', { x: 3, z: 0 }, { x: 7, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire]);
    expect(result.success).toBe(true);

    // Simulate: component already present in the list before insertion
    const updated = applyInsertionResult([wire, comp], comp, result);
    const compCount = updated.filter(e => e.id === comp.id).length;
    expect(compCount).toBe(1);
  });

  it('preserves unrelated elements', () => {
    const wire1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const wire2 = makeWire('w2', [{ x: 0, z: 5 }, { x: 10, z: 5 }]);
    const battery = makeResistor('bat1', { x: 0, z: 0 }, { x: 10, z: 5 });

    const comp = makeResistor('r1', { x: 3, z: 0 }, { x: 7, z: 0 });

    const result = insertComponentOntoCircuit(comp, [wire1, wire2, battery]);
    const updated = applyInsertionResult([wire1, wire2, battery], comp, result);

    // wire2 and battery should still be in the list
    expect(updated.find(e => e.id === 'w2')).toBeTruthy();
    expect(updated.find(e => e.id === 'bat1')).toBeTruthy();
  });
});

// ─── Integration: closed-circuit topology preservation ───────────────────────

describe('closed-circuit topology – integration', () => {
  /**
   * Simulate a simple rectangular closed circuit:
   *
   *   (0,0) ──w1──► (10,0)
   *     ▲               │
   *    w4              w2
   *     │               ▼
   *   (0,10) ◄─w3── (10,10)
   *
   * Dropping a resistor onto w1 between x=3 and x=7 should split w1 into
   * two segments and insert the resistor in series — the loop is preserved.
   */
  it('preserves the closed-circuit loop after a series insertion', () => {
    const w1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const w2 = makeWire('w2', [{ x: 10, z: 0 }, { x: 10, z: 10 }]);
    const w3 = makeWire('w3', [{ x: 10, z: 10 }, { x: 0, z: 10 }]);
    const w4 = makeWire('w4', [{ x: 0, z: 10 }, { x: 0, z: 0 }]);
    const elements: SchematicElement[] = [w1, w2, w3, w4];

    const resistor = makeResistor('r1', { x: 3, z: 0 }, { x: 7, z: 0 });
    const result = insertComponentOntoCircuit(resistor, elements);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.insertionType).toBe('series');

    const updated = applyInsertionResult(elements, resistor, result);

    // Should have: 2 new wire segments (split w1) + w2, w3, w4 + resistor = 6
    expect(updated).toHaveLength(6);
    expect(updated.find(e => e.id === 'w1')).toBeUndefined(); // replaced
    expect(updated.find(e => e.id === 'r1')).toBeTruthy();    // inserted
    expect(updated.filter(e => e.kind === 'wire')).toHaveLength(5); // 4 original (minus w1) + 2 new
  });

  it('circuit wires connect properly to the inserted component terminals', () => {
    const w1 = makeWire('w1', [{ x: 0, z: 0 }, { x: 10, z: 0 }]);
    const elements: SchematicElement[] = [w1];
    const resistor = makeResistor('r1', { x: 2, z: 0 }, { x: 8, z: 0 });

    const result = insertComponentOntoCircuit(resistor, elements);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const updated = applyInsertionResult(elements, resistor, result);
    const comp = updated.find(e => e.id === 'r1') as TwoTerminalElement;
    const wires = updated.filter(e => e.kind === 'wire') as WireElement[];

    // The "before" wire should end at the component's start terminal
    const beforeWire = wires.find(w =>
      w.path[w.path.length - 1].x === comp.start.x &&
      w.path[w.path.length - 1].z === comp.start.z
    );
    expect(beforeWire).toBeTruthy();

    // The "after" wire should start at the component's end terminal
    const afterWire = wires.find(w =>
      w.path[0].x === comp.end.x &&
      w.path[0].z === comp.end.z
    );
    expect(afterWire).toBeTruthy();
  });
});
