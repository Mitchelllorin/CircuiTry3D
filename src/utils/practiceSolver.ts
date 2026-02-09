import { mergeMetrics, solveWireMetrics, type WireMetrics } from "./electrical";
import type {
  CircuitNode,
  PracticeComponent,
  PracticeProblem,
  PracticeStepContext,
} from "../model/practice";

export type SolveResult = {
  totals: WireMetrics;
  source: WireMetrics;
  components: Record<string, WireMetrics>;
  equivalentResistance: number;
  stepContext: PracticeStepContext;
};

export type SolveAttempt =
  | { ok: true; data: SolveResult }
  | { ok: false; error: string };

type ComponentMap = Record<string, PracticeComponent>;

const ensureFinite = (value: number, description: string) => {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value for ${description}`);
  }
  return value;
};

export function createComponentMap(components: PracticeComponent[]): ComponentMap {
  return components.reduce<ComponentMap>((acc, component) => {
    acc[component.id] = component;
    return acc;
  }, {});
}

export function solvePracticeProblem(problem: PracticeProblem): SolveResult {
  const componentMap = createComponentMap(problem.components);

  const resistanceCache = new Map<CircuitNode, number>();

  const resolveComponentResistance = (componentId: string): number => {
    const component = componentMap[componentId];
    if (!component) {
      throw new Error(`Unknown component '${componentId}'`);
    }

    const explicitResistance = component.values?.resistance ?? component.givens?.resistance;
    if (typeof explicitResistance === "number" && Number.isFinite(explicitResistance)) {
      return explicitResistance;
    }

    throw new Error(`Component '${componentId}' is missing a resistance value for solving`);
  };

  const computeEquivalentResistance = (node: CircuitNode): number => {
    if (resistanceCache.has(node)) {
      return resistanceCache.get(node)!;
    }

    let result: number;

    if (node.kind === "component") {
      result = resolveComponentResistance(node.componentId);
    } else if (node.kind === "series") {
      result = node.children.reduce((sum, child) => sum + computeEquivalentResistance(child), 0);
    } else {
      // Parallel
      const reciprocal = node.children.reduce((sum, child) => {
        const childResistance = computeEquivalentResistance(child);
        if (childResistance <= 0) {
          throw new Error("Parallel branch resistance must be positive");
        }
        return sum + 1 / childResistance;
      }, 0);

      if (reciprocal <= 0) {
        throw new Error("Parallel network reciprocal resistance must be positive");
      }

      result = 1 / reciprocal;
    }

    resistanceCache.set(node, result);
    return result;
  };

  const totalResistance = ensureFinite(computeEquivalentResistance(problem.network), "total resistance");

  const totalMetrics = solveWireMetrics({
    resistance: totalResistance,
    ...problem.source.values,
  });

  const sourceMetrics = solveWireMetrics({
    resistance: totalResistance,
    voltage: totalMetrics.voltage,
    current: totalMetrics.current,
    watts: totalMetrics.watts,
    ...problem.source.values,
  });

  const componentSolutions: Record<string, WireMetrics> = {};

  const propagateNode = (node: CircuitNode, current: number, voltage: number) => {
    if (!Number.isFinite(current) || !Number.isFinite(voltage)) {
      throw new Error("Invalid propagation state for circuit node");
    }

    if (node.kind === "component") {
      const component = componentMap[node.componentId];
      if (!component) {
        throw new Error(`Component '${node.componentId}' not found during propagation`);
      }

      const resolved = solveWireMetrics(
        mergeMetrics(component.values, {
          current,
          voltage,
        })
      );

      componentSolutions[component.id] = resolved;
      return;
    }

    if (node.kind === "series") {
      node.children.forEach((child) => {
        const childResistance = computeEquivalentResistance(child);
        const childVoltage = current * childResistance;
        propagateNode(child, current, childVoltage);
      });
      return;
    }

    // Parallel
    node.children.forEach((child) => {
      const childResistance = computeEquivalentResistance(child);
      if (childResistance <= 0) {
        throw new Error("Parallel branch resistance must be positive");
      }
      const childCurrent = voltage / childResistance;
      propagateNode(child, childCurrent, voltage);
    });
  };

  propagateNode(problem.network, totalMetrics.current, totalMetrics.voltage);

  const stepContext: PracticeStepContext = {
    totals: totalMetrics,
    source: sourceMetrics,
    components: componentSolutions,
  };

  return {
    totals: totalMetrics,
    source: sourceMetrics,
    components: componentSolutions,
    equivalentResistance: totalResistance,
    stepContext,
  };
}

export function trySolvePracticeProblem(problem: PracticeProblem): SolveAttempt {
  try {
    return { ok: true, data: solvePracticeProblem(problem) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown solver error";
    console.warn(`[PracticeSolver] Failed to solve '${problem.id}'`, error);
    return { ok: false, error: message };
  }
}

