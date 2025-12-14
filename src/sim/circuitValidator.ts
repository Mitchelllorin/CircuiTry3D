/**
 * Circuit Validation Module
 *
 * Provides comprehensive circuit validation with real-time feedback including:
 * - Open circuit detection
 * - Floating node/component identification
 * - Short circuit warnings
 * - Missing ground reference notifications
 */

import type { SchematicElement, TwoTerminalElement, GroundElement, WireElement, Vec2 } from '../schematic/types';

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Types of validation issues
 */
export type ValidationIssueType =
  | 'open_circuit'
  | 'floating_component'
  | 'floating_node'
  | 'short_circuit'
  | 'missing_ground'
  | 'missing_power_source'
  | 'unconnected_terminal'
  | 'multiple_power_sources';

/**
 * Single validation issue
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  message: string;
  description: string;
  affectedElements: string[];
  affectedPositions?: Vec2[];
}

/**
 * Overall circuit validation result
 */
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  stats: {
    componentCount: number;
    wireCount: number;
    groundCount: number;
    batteryCount: number;
    nodeCount: number;
    connectedComponents: number;
  };
  circuitStatus: 'complete' | 'incomplete' | 'invalid';
}

/**
 * Connection tolerance for detecting wire-to-component connections
 */
const CONNECTION_TOLERANCE = 0.6;

/**
 * Check if two points are within connection tolerance
 */
function arePointsConnected(p1: Vec2, p2: Vec2): boolean {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz) <= CONNECTION_TOLERANCE;
}

/**
 * Get terminal positions for a schematic element
 */
function getElementTerminals(element: SchematicElement): Vec2[] {
  if (element.kind === 'wire') {
    const wire = element as WireElement;
    return wire.path.length >= 2
      ? [wire.path[0], wire.path[wire.path.length - 1]]
      : wire.path;
  }

  if (element.kind === 'ground') {
    const ground = element as GroundElement;
    return [ground.position];
  }

  // Two-terminal components (battery, resistor, capacitor, etc.)
  const component = element as TwoTerminalElement;
  return [component.start, component.end];
}

/**
 * Build adjacency graph from schematic elements
 */
function buildConnectionGraph(elements: SchematicElement[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  // Initialize graph for all elements
  for (const element of elements) {
    graph.set(element.id, new Set());
  }

  // Find connections between elements
  for (let i = 0; i < elements.length; i++) {
    const elementA = elements[i];
    const terminalsA = getElementTerminals(elementA);

    for (let j = i + 1; j < elements.length; j++) {
      const elementB = elements[j];
      const terminalsB = getElementTerminals(elementB);

      // Check if any terminal of A connects to any terminal of B
      let connected = false;
      for (const termA of terminalsA) {
        for (const termB of terminalsB) {
          if (arePointsConnected(termA, termB)) {
            connected = true;
            break;
          }
        }
        if (connected) break;
      }

      if (connected) {
        graph.get(elementA.id)?.add(elementB.id);
        graph.get(elementB.id)?.add(elementA.id);
      }
    }
  }

  return graph;
}

/**
 * Find connected components in the graph using DFS
 */
function findConnectedComponents(graph: Map<string, Set<string>>): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const component = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.add(current);

      const neighbors = graph.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }

    components.push(component);
  }

  return components;
}

/**
 * Check for short circuits (battery terminals directly connected without load)
 */
function detectShortCircuits(
  elements: SchematicElement[],
  graph: Map<string, Set<string>>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const batteries = elements.filter(e => e.kind === 'battery') as TwoTerminalElement[];

  for (const battery of batteries) {
    // Check if battery terminals are connected only through wires (no load)
    const connectedIds = graph.get(battery.id);
    if (!connectedIds) continue;

    // Get all elements connected to battery
    const directConnections = Array.from(connectedIds).map(id =>
      elements.find(e => e.id === id)
    ).filter(Boolean) as SchematicElement[];

    // Check if there's a direct wire connection without load
    const wiresOnly = directConnections.filter(e => e.kind === 'wire');
    const loads = directConnections.filter(e =>
      e.kind !== 'wire' && e.kind !== 'battery' && e.kind !== 'ground'
    );

    // Simple short circuit detection: wires connecting both battery terminals without load
    if (wiresOnly.length > 0 && loads.length === 0) {
      // Check if wires form a path between battery terminals
      const batteryStart = battery.start;
      const batteryEnd = battery.end;

      for (const wire of wiresOnly) {
        const wireElement = wire as WireElement;
        const wirePath = wireElement.path;
        if (wirePath.length < 2) continue;

        const wireStart = wirePath[0];
        const wireEnd = wirePath[wirePath.length - 1];

        const connectsStart = arePointsConnected(wireStart, batteryStart) ||
                             arePointsConnected(wireEnd, batteryStart);
        const connectsEnd = arePointsConnected(wireStart, batteryEnd) ||
                           arePointsConnected(wireEnd, batteryEnd);

        if (connectsStart && connectsEnd) {
          issues.push({
            type: 'short_circuit',
            severity: 'error',
            message: 'Short Circuit Detected',
            description: `A direct connection exists between battery terminals without a load component. This would cause excessive current flow and potential damage.`,
            affectedElements: [battery.id, wire.id],
            affectedPositions: [batteryStart, batteryEnd]
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check for floating (unconnected) components
 */
function detectFloatingComponents(
  elements: SchematicElement[],
  graph: Map<string, Set<string>>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const element of elements) {
    if (element.kind === 'wire') continue; // Wires are connectors, not loads

    const connections = graph.get(element.id);
    const connectionCount = connections?.size ?? 0;

    if (connectionCount === 0) {
      const label = (element as TwoTerminalElement).label ?? element.kind;
      const terminals = getElementTerminals(element);

      issues.push({
        type: 'floating_component',
        severity: 'warning',
        message: `Floating Component: ${label}`,
        description: `Component ${label} has no connections. Connect it to the circuit using wires.`,
        affectedElements: [element.id],
        affectedPositions: terminals
      });
    } else if (element.kind !== 'ground' && connectionCount === 1) {
      // Component with only one terminal connected
      const label = (element as TwoTerminalElement).label ?? element.kind;
      const terminals = getElementTerminals(element);

      issues.push({
        type: 'unconnected_terminal',
        severity: 'warning',
        message: `Partially Connected: ${label}`,
        description: `Component ${label} has only one terminal connected. Both terminals must be connected for current to flow.`,
        affectedElements: [element.id],
        affectedPositions: terminals
      });
    }
  }

  return issues;
}

/**
 * Check for open circuit conditions
 */
function detectOpenCircuits(
  elements: SchematicElement[],
  connectedComponents: Set<string>[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // An open circuit exists if batteries and loads are in different connected components
  if (connectedComponents.length <= 1) return issues;

  // Find which component contains batteries
  const batteries = elements.filter(e => e.kind === 'battery');
  const loads = elements.filter(e =>
    e.kind !== 'wire' && e.kind !== 'battery' && e.kind !== 'ground'
  );

  if (batteries.length === 0 || loads.length === 0) return issues;

  for (const battery of batteries) {
    const batteryComponent = connectedComponents.find(c => c.has(battery.id));

    for (const load of loads) {
      const loadComponent = connectedComponents.find(c => c.has(load.id));

      if (batteryComponent !== loadComponent) {
        const batteryLabel = (battery as TwoTerminalElement).label ?? 'Battery';
        const loadLabel = (load as TwoTerminalElement).label ?? load.kind;

        issues.push({
          type: 'open_circuit',
          severity: 'error',
          message: 'Open Circuit Detected',
          description: `${batteryLabel} and ${loadLabel} are not connected. Complete the circuit path to allow current flow.`,
          affectedElements: [battery.id, load.id],
          affectedPositions: [
            ...getElementTerminals(battery),
            ...getElementTerminals(load)
          ]
        });
      }
    }
  }

  return issues;
}

/**
 * Check for missing ground reference
 */
function detectMissingGround(elements: SchematicElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const grounds = elements.filter(e => e.kind === 'ground');
  const batteries = elements.filter(e => e.kind === 'battery');

  // Only warn about missing ground if there's a power source
  if (batteries.length > 0 && grounds.length === 0) {
    issues.push({
      type: 'missing_ground',
      severity: 'info',
      message: 'Missing Ground Reference',
      description: 'No ground symbol is present in the circuit. Adding a ground reference helps establish voltage levels and is required for many simulation types.',
      affectedElements: batteries.map(b => b.id),
      affectedPositions: batteries.flatMap(b => getElementTerminals(b))
    });
  }

  return issues;
}

/**
 * Check for missing power source
 */
function detectMissingPowerSource(elements: SchematicElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const batteries = elements.filter(e => e.kind === 'battery');
  const loads = elements.filter(e =>
    e.kind !== 'wire' && e.kind !== 'battery' && e.kind !== 'ground'
  );

  // Warn if there are loads but no power source
  if (loads.length > 0 && batteries.length === 0) {
    issues.push({
      type: 'missing_power_source',
      severity: 'warning',
      message: 'Missing Power Source',
      description: 'The circuit has components but no battery or power source. Add a battery to power the circuit.',
      affectedElements: loads.map(l => l.id),
      affectedPositions: loads.flatMap(l => getElementTerminals(l))
    });
  }

  return issues;
}

/**
 * Check for floating wire endpoints (wires not connected to anything)
 */
function detectFloatingWireEndpoints(
  elements: SchematicElement[],
  graph: Map<string, Set<string>>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const wires = elements.filter(e => e.kind === 'wire') as WireElement[];

  for (const wire of wires) {
    const connections = graph.get(wire.id);
    if (!connections || connections.size === 0) {
      issues.push({
        type: 'floating_node',
        severity: 'warning',
        message: 'Floating Wire',
        description: 'This wire segment is not connected to any components.',
        affectedElements: [wire.id],
        affectedPositions: wire.path
      });
    }
  }

  return issues;
}

/**
 * Main validation function - validates entire circuit
 */
export function validateCircuit(elements: SchematicElement[]): ValidationResult {
  // Handle empty circuit
  if (elements.length === 0) {
    return {
      isValid: true,
      issues: [],
      stats: {
        componentCount: 0,
        wireCount: 0,
        groundCount: 0,
        batteryCount: 0,
        nodeCount: 0,
        connectedComponents: 0
      },
      circuitStatus: 'incomplete'
    };
  }

  // Categorize elements
  const wires = elements.filter(e => e.kind === 'wire');
  const grounds = elements.filter(e => e.kind === 'ground');
  const batteries = elements.filter(e => e.kind === 'battery');
  const components = elements.filter(e =>
    e.kind !== 'wire' && e.kind !== 'ground'
  );

  // Build connection graph
  const graph = buildConnectionGraph(elements);

  // Find connected components
  const connectedComponents = findConnectedComponents(graph);

  // Collect all validation issues
  const issues: ValidationIssue[] = [];

  // Run all validation checks
  issues.push(...detectShortCircuits(elements, graph));
  issues.push(...detectFloatingComponents(elements, graph));
  issues.push(...detectOpenCircuits(elements, connectedComponents));
  issues.push(...detectMissingGround(elements));
  issues.push(...detectMissingPowerSource(elements));
  issues.push(...detectFloatingWireEndpoints(elements, graph));

  // Determine circuit status
  const hasErrors = issues.some(i => i.severity === 'error');
  const hasWarnings = issues.some(i => i.severity === 'warning');

  let circuitStatus: 'complete' | 'incomplete' | 'invalid';
  if (hasErrors) {
    circuitStatus = 'invalid';
  } else if (hasWarnings || batteries.length === 0 || components.length <= 1) {
    circuitStatus = 'incomplete';
  } else {
    circuitStatus = 'complete';
  }

  // Calculate node count (unique positions where connections occur)
  const allTerminals = elements.flatMap(e => getElementTerminals(e));
  const uniqueNodes = new Set(
    allTerminals.map(t => `${t.x.toFixed(2)},${t.z.toFixed(2)}`)
  );

  return {
    isValid: !hasErrors,
    issues,
    stats: {
      componentCount: components.length,
      wireCount: wires.length,
      groundCount: grounds.length,
      batteryCount: batteries.length,
      nodeCount: uniqueNodes.size,
      connectedComponents: connectedComponents.length
    },
    circuitStatus
  };
}

/**
 * Get a human-readable summary of validation status
 */
export function getValidationSummary(result: ValidationResult): string {
  const { stats, issues, circuitStatus } = result;

  if (stats.componentCount === 0 && stats.wireCount === 0) {
    return 'Empty circuit - place components to begin';
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  if (circuitStatus === 'complete') {
    return 'Circuit is complete and ready for simulation';
  }

  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  if (infos > 0) parts.push(`${infos} suggestion${infos > 1 ? 's' : ''}`);

  if (parts.length === 0) {
    return 'Circuit incomplete - continue building';
  }

  return parts.join(', ');
}

/**
 * Get severity icon for display
 */
export function getSeverityIcon(severity: ValidationSeverity): string {
  switch (severity) {
    case 'error': return '✕';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
  }
}

/**
 * Get severity label for display
 */
export function getSeverityLabel(severity: ValidationSeverity): string {
  switch (severity) {
    case 'error': return 'Error';
    case 'warning': return 'Warning';
    case 'info': return 'Info';
  }
}
