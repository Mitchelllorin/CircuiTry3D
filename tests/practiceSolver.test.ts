import { describe, it, expect } from 'vitest';
import {
  createComponentMap,
  solvePracticeProblem,
  trySolvePracticeProblem,
} from '../src/utils/practiceSolver';
import type { PracticeComponent, PracticeProblem, CircuitNode } from '../src/model/practice';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResistor(id: string, resistance: number): PracticeComponent {
  return {
    id,
    label: `R${id}`,
    role: 'load',
    values: { resistance },
  };
}

function makeSource(voltage: number): PracticeComponent {
  return {
    id: 'source',
    label: 'Battery',
    role: 'source',
    values: { voltage },
  };
}

function makeSeriesProblem(voltage: number, resistances: number[]): PracticeProblem {
  const source = makeSource(voltage);
  const components = resistances.map((r, i) => makeResistor(`r${i + 1}`, r));

  const seriesChildren: CircuitNode[] = components.map((c) => ({
    kind: 'component',
    componentId: c.id,
  }));

  const network: CircuitNode = {
    kind: 'series',
    id: 'top',
    children: seriesChildren,
  };

  return {
    id: 'series-test',
    title: 'Series Test',
    topology: 'series',
    difficulty: 'standard',
    prompt: '',
    targetQuestion: '',
    targetMetric: { componentId: 'r1', key: 'voltage' },
    conceptTags: [],
    source,
    components,
    network,
    steps: [],
  };
}

function makeParallelProblem(voltage: number, resistances: number[]): PracticeProblem {
  const source = makeSource(voltage);
  const components = resistances.map((r, i) => makeResistor(`r${i + 1}`, r));

  const parallelChildren: CircuitNode[] = components.map((c) => ({
    kind: 'component',
    componentId: c.id,
  }));

  const network: CircuitNode = {
    kind: 'parallel',
    id: 'top',
    children: parallelChildren,
  };

  return {
    id: 'parallel-test',
    title: 'Parallel Test',
    topology: 'parallel',
    difficulty: 'standard',
    prompt: '',
    targetQuestion: '',
    targetMetric: { componentId: 'r1', key: 'current' },
    conceptTags: [],
    source,
    components,
    network,
    steps: [],
  };
}

// ─── createComponentMap ──────────────────────────────────────────────────────

describe('createComponentMap', () => {
  it('should index components by id', () => {
    const components = [
      makeResistor('a', 10),
      makeResistor('b', 20),
    ];
    const map = createComponentMap(components);
    expect(map['a']).toBe(components[0]);
    expect(map['b']).toBe(components[1]);
  });

  it('should return an empty object for an empty array', () => {
    expect(createComponentMap([])).toEqual({});
  });

  it('should handle a single component', () => {
    const c = makeResistor('only', 100);
    const map = createComponentMap([c]);
    expect(Object.keys(map)).toHaveLength(1);
    expect(map['only']).toBe(c);
  });
});

// ─── solvePracticeProblem — series circuits ───────────────────────────────────

describe('solvePracticeProblem — series circuit', () => {
  it('should compute total resistance as sum of series resistors', () => {
    const problem = makeSeriesProblem(10, [4, 6]);
    const result = solvePracticeProblem(problem);
    expect(result.equivalentResistance).toBeCloseTo(10);
  });

  it('should compute correct total current for series circuit', () => {
    // V=12V, R_total=4+8=12Ω → I=1A
    const problem = makeSeriesProblem(12, [4, 8]);
    const result = solvePracticeProblem(problem);
    expect(result.totals.current).toBeCloseTo(1);
  });

  it('should compute correct voltage drop across each series resistor', () => {
    // V=10V, R1=4Ω, R2=6Ω → I=1A, V_R1=4V, V_R2=6V
    const problem = makeSeriesProblem(10, [4, 6]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1'].voltage).toBeCloseTo(4);
    expect(result.components['r2'].voltage).toBeCloseTo(6);
  });

  it('should compute correct power dissipation for each resistor', () => {
    // V=10V, R1=4Ω, R2=6Ω → I=1A, P_R1=4W, P_R2=6W
    const problem = makeSeriesProblem(10, [4, 6]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1'].watts).toBeCloseTo(4);
    expect(result.components['r2'].watts).toBeCloseTo(6);
  });

  it('should include all component solutions in the result', () => {
    const problem = makeSeriesProblem(12, [3, 4, 5]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1']).toBeDefined();
    expect(result.components['r2']).toBeDefined();
    expect(result.components['r3']).toBeDefined();
  });

  it('should handle a single-component series network', () => {
    const problem = makeSeriesProblem(9, [9]);
    const result = solvePracticeProblem(problem);
    expect(result.equivalentResistance).toBeCloseTo(9);
    expect(result.totals.current).toBeCloseTo(1);
  });
});

// ─── solvePracticeProblem — parallel circuits ─────────────────────────────────

describe('solvePracticeProblem — parallel circuit', () => {
  it('should compute equivalent resistance for equal resistors in parallel', () => {
    // Two 10Ω resistors → R_eq = 5Ω
    const problem = makeParallelProblem(10, [10, 10]);
    const result = solvePracticeProblem(problem);
    expect(result.equivalentResistance).toBeCloseTo(5);
  });

  it('should split current equally across equal parallel branches', () => {
    // V=10V, R1=R2=10Ω → I_each=1A, I_total=2A
    const problem = makeParallelProblem(10, [10, 10]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1'].current).toBeCloseTo(1);
    expect(result.components['r2'].current).toBeCloseTo(1);
    expect(result.totals.current).toBeCloseTo(2);
  });

  it('should split current inversely to resistance in parallel branches', () => {
    // V=12V, R1=4Ω, R2=12Ω → I1=3A, I2=1A
    const problem = makeParallelProblem(12, [4, 12]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1'].current).toBeCloseTo(3, 4);
    expect(result.components['r2'].current).toBeCloseTo(1, 4);
  });

  it('should apply the same voltage across all parallel branches', () => {
    const problem = makeParallelProblem(10, [5, 20]);
    const result = solvePracticeProblem(problem);
    expect(result.components['r1'].voltage).toBeCloseTo(10);
    expect(result.components['r2'].voltage).toBeCloseTo(10);
  });
});

// ─── solvePracticeProblem — combination circuits ──────────────────────────────

describe('solvePracticeProblem — combination circuit', () => {
  it('should handle series-of-parallel sub-networks', () => {
    // R1=10Ω in series with (R2=10Ω ∥ R3=10Ω) → R_eq = 10 + 5 = 15Ω
    const r1 = makeResistor('r1', 10);
    const r2 = makeResistor('r2', 10);
    const r3 = makeResistor('r3', 10);

    const parallel: CircuitNode = {
      kind: 'parallel',
      id: 'par',
      children: [
        { kind: 'component', componentId: 'r2' },
        { kind: 'component', componentId: 'r3' },
      ],
    };

    const network: CircuitNode = {
      kind: 'series',
      id: 'top',
      children: [{ kind: 'component', componentId: 'r1' }, parallel],
    };

    const problem: PracticeProblem = {
      id: 'combo',
      title: 'Combo',
      topology: 'combination',
      difficulty: 'challenge',
      prompt: '',
      targetQuestion: '',
      targetMetric: { componentId: 'r1', key: 'voltage' },
      conceptTags: [],
      source: makeSource(15),
      components: [r1, r2, r3],
      network,
      steps: [],
    };

    const result = solvePracticeProblem(problem);
    expect(result.equivalentResistance).toBeCloseTo(15);
    expect(result.totals.current).toBeCloseTo(1);         // 15V / 15Ω = 1A
    expect(result.components['r1'].voltage).toBeCloseTo(10); // 1A × 10Ω
  });
});

// ─── solvePracticeProblem — error conditions ──────────────────────────────────

describe('solvePracticeProblem — error conditions', () => {
  it('should throw for an unknown component referenced in the network', () => {
    const problem = makeSeriesProblem(10, [5]);
    // Override network to reference a missing component id
    problem.network = { kind: 'component', componentId: 'does-not-exist' };

    expect(() => solvePracticeProblem(problem)).toThrow();
  });

  it('should throw when a component is missing a resistance value', () => {
    const badComponent: PracticeComponent = {
      id: 'r1',
      label: 'R1',
      role: 'load',
      // no values/givens → resistance is missing
    };
    const problem: PracticeProblem = {
      id: 'missing-r',
      title: '',
      topology: 'series',
      difficulty: 'standard',
      prompt: '',
      targetQuestion: '',
      targetMetric: { componentId: 'r1', key: 'voltage' },
      conceptTags: [],
      source: makeSource(10),
      components: [badComponent],
      network: { kind: 'component', componentId: 'r1' },
      steps: [],
    };

    expect(() => solvePracticeProblem(problem)).toThrow();
  });
});

// ─── trySolvePracticeProblem ──────────────────────────────────────────────────

describe('trySolvePracticeProblem', () => {
  it('should return { ok: true, data } for a valid problem', () => {
    const problem = makeSeriesProblem(10, [5, 5]);
    const attempt = trySolvePracticeProblem(problem);
    expect(attempt.ok).toBe(true);
    if (attempt.ok) {
      expect(attempt.data.totals.current).toBeCloseTo(1);
    }
  });

  it('should return { ok: false, error } when the solver throws', () => {
    const problem = makeSeriesProblem(10, [5]);
    problem.network = { kind: 'component', componentId: 'nonexistent' };
    const attempt = trySolvePracticeProblem(problem);
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) {
      expect(typeof attempt.error).toBe('string');
      expect(attempt.error.length).toBeGreaterThan(0);
    }
  });

  it('should wrap the full SolveResult on success', () => {
    const problem = makeParallelProblem(10, [10, 10]);
    const attempt = trySolvePracticeProblem(problem);
    expect(attempt.ok).toBe(true);
    if (attempt.ok) {
      expect(attempt.data.equivalentResistance).toBeCloseTo(5);
      expect(attempt.data.stepContext).toBeDefined();
    }
  });
});
