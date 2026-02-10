/**
 * Circuit Validation Module
 *
 * Provides comprehensive circuit validation with real-time feedback including:
 * - Open circuit detection
 * - Floating node/component identification
 * - Short circuit warnings
 * - Missing ground reference notifications
 * - Polarity violation detection for diodes, LEDs, and other polarity-sensitive components
 */

import type { SchematicElement, TwoTerminalElement, GroundElement, WireElement, Vec2 } from '../schematic/types';
import { solveDCCircuit } from './dcSolver';
import { getPolarityConfig, isPolaritySensitive } from '../schematic/catalog';

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
  | 'multiple_power_sources'
  | 'reverse_polarity'
  | 'diode_reverse_bias'
  | 'led_reverse_bias'
  | 'capacitor_reverse_polarity'
  | 'insufficient_components';

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
    // IMPORTANT: include ALL polyline points so junctions/taps can be detected.
    return wire.path;
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
 * CircuiTry3D Rule C3D-011: Minimum Component Count (No Empty Circuit Sides)
 *
 * In a series circuit following the standard square loop layout, EVERY SIDE of the
 * circuit must have a component. There should be no side without a component.
 *
 * Standard Square Loop Layout:
 * - LEFT:   Battery (always)
 * - TOP:    First component (horizontal)
 * - RIGHT:  Second component (vertical)
 * - BOTTOM: Third component (horizontal)
 *
 * This rule ensures:
 * 1. Educational consistency - students see complete circuit layouts
 * 2. Visual balance - no empty wires without purpose
 * 3. Realistic simulation - actual circuits have components on all paths
 *
 * @param elements - All schematic elements
 * @returns ValidationIssue[] - Issues for insufficient components
 */
function detectInsufficientComponents(elements: SchematicElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const batteries = elements.filter(e => e.kind === 'battery');
  const loadComponents = elements.filter(e =>
    e.kind !== 'wire' && e.kind !== 'battery' && e.kind !== 'ground'
  );

  // Only validate if we have a battery (circuit is being built)
  if (batteries.length === 0) return issues;

  // CircuiTry3D Standard: Series circuits must have exactly 4 components
  // (1 battery on left + 3 load components on top, right, bottom)
  const REQUIRED_LOAD_COMPONENTS = 3;

  if (loadComponents.length < REQUIRED_LOAD_COMPONENTS) {
    const missingCount = REQUIRED_LOAD_COMPONENTS - loadComponents.length;
    const sideNames = ['top', 'right', 'bottom'];
    const missingSides = sideNames.slice(loadComponents.length).join(', ');

    issues.push({
      type: 'insufficient_components',
      severity: 'warning',
      message: `Missing ${missingCount} Component${missingCount > 1 ? 's' : ''} (No Empty Sides)`,
      description:
        `CircuiTry3D Standard: Every side of a circuit must have a component. ` +
        `A series circuit requires 4 components (battery + 3 others) to fill the ` +
        `standard square loop layout. Missing component${missingCount > 1 ? 's' : ''} on: ${missingSides}. ` +
        `Add resistor(s), LED(s), switch(es), or other components to complete the circuit.`,
      affectedElements: batteries.map(b => b.id),
      affectedPositions: batteries.flatMap(b => getElementTerminals(b))
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
 * Detect polarity violations in the circuit.
 *
 * This function analyzes the circuit topology to determine if polarity-sensitive
 * components (diodes, LEDs, electrolytic capacitors) are connected with correct polarity.
 *
 * For current to flow correctly:
 * - Diodes/LEDs: Anode must be at higher potential than cathode (forward bias)
 * - Capacitors: Positive terminal must be at higher potential than negative
 *
 * @param elements - All schematic elements
 * @param graph - Connection graph of elements
 * @param nodeVoltages - Solved node voltages from DC analysis
 * @param terminalToNode - Map of terminal keys to node IDs
 */
function detectPolarityViolations(
  elements: SchematicElement[],
  nodeVoltages: Map<string, number>,
  terminalToNode: Map<string, string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find all polarity-sensitive components
  const polarityComponents = elements.filter(e =>
    isPolaritySensitive(e.kind) && e.kind !== 'battery'
  ) as TwoTerminalElement[];

  for (const component of polarityComponents) {
    const polarityConfig = getPolarityConfig(component.kind);
    if (!polarityConfig) continue;

    // Get terminal node IDs
    const startNodeId = terminalToNode.get(`${component.id}:start`);
    const endNodeId = terminalToNode.get(`${component.id}:end`);

    if (!startNodeId || !endNodeId) continue;

    // Get voltages at each terminal
    const startVoltage = nodeVoltages.get(startNodeId) ?? 0;
    const endVoltage = nodeVoltages.get(endNodeId) ?? 0;

    // Calculate voltage across the component (from positive to negative terminal)
    // For diodes/LEDs: positiveTerminal = "start" (anode), so Vanode - Vcathode
    // For capacitors: positiveTerminal = "end", so Vend - Vstart
    let voltageAcross: number;
    if (polarityConfig.positiveTerminal === 'start') {
      voltageAcross = startVoltage - endVoltage; // Vanode - Vcathode
    } else {
      voltageAcross = endVoltage - startVoltage; // Vpositive - Vnegative
    }

    // Check for reverse polarity (negative voltage across the component)
    // A small threshold avoids false positives from floating-point errors
    const REVERSE_POLARITY_THRESHOLD = -0.01; // -10mV threshold

    if (voltageAcross < REVERSE_POLARITY_THRESHOLD && !polarityConfig.allowsReverseCurrent) {
      const label = component.label ?? component.kind.toUpperCase();
      const terminals = getElementTerminals(component);

      // Determine specific issue type based on component kind
      let issueType: ValidationIssueType;
      let message: string;
      let description: string;

      switch (component.kind) {
        case 'diode':
          issueType = 'diode_reverse_bias';
          message = `Diode ${label} is Reverse Biased`;
          description = `The diode's cathode is at higher potential than its anode (reverse bias). ` +
            `Current cannot flow through a reverse-biased diode. ` +
            `Swap the diode orientation or check your circuit connections. ` +
            `Voltage across: ${voltageAcross.toFixed(2)}V (anode to cathode).`;
          break;

        case 'led':
          issueType = 'led_reverse_bias';
          message = `LED ${label} Will Not Light (Reverse Polarity)`;
          description = `The LED's cathode is at higher potential than its anode (reverse bias). ` +
            `LEDs only emit light when current flows from anode (+) to cathode (-). ` +
            `Check the LED orientation: the longer leg (anode) should connect to the positive side. ` +
            `Voltage across: ${voltageAcross.toFixed(2)}V (anode to cathode).`;
          break;

        case 'capacitor':
          issueType = 'capacitor_reverse_polarity';
          message = `Capacitor ${label} Has Reverse Polarity`;
          description = `The electrolytic capacitor is connected with reverse polarity. ` +
            `The negative terminal is at higher potential than the positive terminal. ` +
            `This can damage the capacitor. Check the capacitor orientation. ` +
            `Voltage across: ${voltageAcross.toFixed(2)}V.`;
          break;

        default:
          issueType = 'reverse_polarity';
          message = `${label} Has Reverse Polarity`;
          description = `This component is connected with reverse polarity and may not function correctly. ` +
            `Voltage across: ${voltageAcross.toFixed(2)}V.`;
      }

      issues.push({
        type: issueType,
        severity: component.kind === 'capacitor' ? 'error' : 'warning',
        message,
        description,
        affectedElements: [component.id],
        affectedPositions: terminals
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
  issues.push(...detectInsufficientComponents(elements));

  // Physics-backed sanity checks (Ohm + Kirchhoff):
  // - enforce that ideal shorts across a battery are flagged
  // - provide deterministic "no current in open circuit" behavior for simulation layers
  // - detect polarity violations in diodes, LEDs, and other polarity-sensitive components
  const dcSolution = solveDCCircuit(elements);
  if (dcSolution.status === 'invalid_ideal_short') {
    const batteries = elements.filter(e => e.kind === 'battery') as TwoTerminalElement[];
    issues.push({
      type: 'short_circuit',
      severity: 'error',
      message: 'Ideal Short Across Source',
      description: 'A battery\'s positive and negative terminals are connected by a 0 Ω path (wire/short). This implies infinite current in an ideal model.',
      affectedElements: batteries.map(b => b.id),
      affectedPositions: batteries.flatMap(b => getElementTerminals(b))
    });
  } else if (dcSolution.status === 'singular') {
    issues.push({
      type: 'open_circuit',
      severity: 'info',
      message: 'Circuit Not Solvable (Floating Network)',
      description: 'The circuit is electrically floating or under-constrained for DC solving. Add a ground reference and ensure there is at least one resistive path.',
      affectedElements: [],
    });
  }

  // Polarity violation detection for diodes, LEDs, capacitors
  // Only check if we have valid node voltages from the solver
  if (dcSolution.status === 'solved' && dcSolution.terminalToNode) {
    issues.push(...detectPolarityViolations(
      elements,
      dcSolution.nodeVoltages,
      dcSolution.terminalToNode
    ));
  }

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

/**
 * Determines if current flow animation should be enabled based on circuit validation.
 *
 * Current flow should ONLY be enabled when:
 * 1. Circuit has no errors (open circuit, short circuit)
 * 2. Circuit forms a complete closed loop
 * 3. There is at least one power source and one load
 *
 * This implements CircuiTry3D Rule C3D-010: Circuit Completion State
 * "Current flow animation and simulation shall only run when circuit validation returns 'complete' status."
 *
 * @param elements - The schematic elements in the circuit
 * @returns Object with shouldAnimate boolean and reason string
 */
export function shouldEnableCurrentFlow(elements: SchematicElement[]): {
  shouldAnimate: boolean;
  reason: string;
  currentAmps: number;
} {
  // First validate the circuit
  const validation = validateCircuit(elements);

  // Check for errors - no animation if circuit has errors
  if (!validation.isValid) {
    const firstError = validation.issues.find(i => i.severity === 'error');
    return {
      shouldAnimate: false,
      reason: firstError?.message ?? 'Circuit has validation errors',
      currentAmps: 0
    };
  }

  // Check circuit status - only animate if complete
  if (validation.circuitStatus !== 'complete') {
    return {
      shouldAnimate: false,
      reason: validation.circuitStatus === 'incomplete'
        ? 'Circuit is incomplete - ensure all components are connected in a closed loop'
        : 'Circuit is invalid',
      currentAmps: 0
    };
  }

  // Circuit is valid and complete - solve to get current value
  const solution = solveDCCircuit(elements);

  if (solution.status !== 'solved') {
    return {
      shouldAnimate: false,
      reason: solution.reason ?? 'Unable to solve circuit',
      currentAmps: 0
    };
  }

  // Find the total circuit current (from battery or first resistor)
  let totalCurrent = 0;
  for (const [, current] of solution.elementCurrents) {
    if (Math.abs(current.amps) > Math.abs(totalCurrent)) {
      totalCurrent = current.amps;
    }
  }

  // Only animate if there's measurable current (> 0.001mA threshold)
  if (Math.abs(totalCurrent) < 0.000001) {
    return {
      shouldAnimate: false,
      reason: 'No current flow detected in circuit',
      currentAmps: 0
    };
  }

  return {
    shouldAnimate: true,
    reason: 'Circuit complete - current flow enabled',
    currentAmps: Math.abs(totalCurrent)
  };
}
