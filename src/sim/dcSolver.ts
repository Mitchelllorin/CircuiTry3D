import type { SchematicElement, TwoTerminalElement, Vec2, WireElement, GroundElement } from "../schematic/types";

export type CurrentDirection =
  | "start->end"
  | "end->start"
  | "path-forward"
  | "path-backward"
  | "collector->emitter"
  | "emitter->collector"
  | "unknown";

export type SolvedElementCurrent = {
  elementId: string;
  amps: number;
  /** Convention depends on element kind; see docs for details. */
  direction: CurrentDirection;
};

export type SolvedWireSegmentCurrent = {
  wireId: string;
  segmentIndex: number; // i means path[i] -> path[i+1]
  amps: number; // positive means along path[i] -> path[i+1]
};

export type DCSolveStatus =
  | "solved"
  | "unsolved"
  | "no_reference"
  | "singular"
  | "invalid_ideal_short";

export type DCSolution = {
  status: DCSolveStatus;
  reason?: string;
  /** Node voltages in volts, relative to chosen reference node (0 V). */
  nodeVoltages: Map<string, number>;
  /** Per-element currents using consistent sign conventions. */
  elementCurrents: Map<string, SolvedElementCurrent>;
  /** Per-wire segment currents (ideal short segments). */
  wireSegmentCurrents: SolvedWireSegmentCurrent[];
  /** The node chosen as 0 V reference. */
  referenceNodeId?: string;
  /** Map from terminal keys (elementId:terminalKey) to node IDs */
  terminalToNode?: Map<string, string>;
};

type TerminalRef = {
  elementId: string;
  kind: SchematicElement["kind"];
  terminalKey: string;
  point: Vec2;
};

type VoltageSource = {
  id: string;
  positiveNode: string; // nodeId
  negativeNode: string; // nodeId
  volts: number;
  /** If present, maps back to element or wire segment */
  meta:
    | { type: "battery"; elementId: string }
    | { type: "wireSegment"; wireId: string; segmentIndex: number }
    | { type: "inductor"; elementId: string }
    | { type: "short"; elementId: string; label: string };
};

type ResistorLike = {
  elementId: string;
  kind: "resistor" | "lamp";
  a: string;
  b: string;
  ohms: number;
};

const DEFAULT_TOLERANCE = 0.6;
const EPS = 1e-12;

const dist = (a: Vec2, b: Vec2) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};

const bucketKey = (p: Vec2, size: number) => `${Math.floor(p.x / size)}:${Math.floor(p.z / size)}`;

function parseNumberWithMetricPrefix(raw: string): number | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Capture like: 1.5 k, 220, 10M, 4.7kΩ
  const m = text.match(/([-+]?\d+(\.\d+)?)(\s*[kKmM])?/);
  if (!m) return null;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return null;
  const prefix = (m[3] ?? "").trim();
  if (!prefix) return base;
  if (prefix.toLowerCase() === "k") return base * 1e3;
  if (prefix === "M") return base * 1e6;
  if (prefix === "m") return base * 1e-3;
  return base;
}

function parseVoltageVolts(label: string | undefined): number | null {
  if (!label) return null;
  const lowered = label.toLowerCase();
  if (!lowered.includes("v")) {
    // practice mode uses "24V" so this is a strong signal, but fallback if it's numeric-only
    const n = parseNumberWithMetricPrefix(label);
    return n;
  }
  const n = parseNumberWithMetricPrefix(label);
  return n;
}

function parseResistanceOhms(label: string | undefined): number | null {
  if (!label) return null;
  // Accept Ω, ohm, and plain numbers (as many UIs label resistors as "R1 = 220 Ω")
  const lowered = label.toLowerCase();
  if (!lowered.includes("ohm") && !lowered.includes("ω") && !lowered.includes("r")) {
    // still allow numeric-only labels like "220"
    const n = parseNumberWithMetricPrefix(label);
    return n;
  }
  const n = parseNumberWithMetricPrefix(label);
  return n;
}

function gaussianSolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row) => row.slice());
  const x = b.slice();

  for (let col = 0; col < n; col += 1) {
    // Partial pivot
    let pivotRow = col;
    let pivotAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r += 1) {
      const v = Math.abs(M[r][col]);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivotRow = r;
      }
    }

    if (pivotAbs < EPS) {
      return null;
    }

    if (pivotRow !== col) {
      const tmpRow = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmpRow;
      const tmpB = x[col];
      x[col] = x[pivotRow];
      x[pivotRow] = tmpB;
    }

    const pivot = M[col][col];
    for (let c = col; c < n; c += 1) {
      M[col][c] /= pivot;
    }
    x[col] /= pivot;

    // Eliminate
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < EPS) continue;
      for (let c = col; c < n; c += 1) {
        M[r][c] -= factor * M[col][c];
      }
      x[r] -= factor * x[col];
    }
  }

  return x;
}

function enumerateTerminals(elements: SchematicElement[]): TerminalRef[] {
  const terminals: TerminalRef[] = [];

  for (const element of elements) {
    if (element.kind === "wire") {
      const wire = element as WireElement;
      wire.path.forEach((point, idx) => {
        terminals.push({
          elementId: wire.id,
          kind: "wire",
          terminalKey: `p${idx}`,
          point,
        });
      });
      continue;
    }

    if (element.kind === "ground") {
      const ground = element as GroundElement;
      terminals.push({
        elementId: ground.id,
        kind: "ground",
        terminalKey: "gnd",
        point: ground.position,
      });
      continue;
    }

    if (element.kind === "bjt") {
      terminals.push({ elementId: element.id, kind: "bjt", terminalKey: "collector", point: element.collector });
      terminals.push({ elementId: element.id, kind: "bjt", terminalKey: "base", point: element.base });
      terminals.push({ elementId: element.id, kind: "bjt", terminalKey: "emitter", point: element.emitter });
      continue;
    }

    const component = element as TwoTerminalElement;
    terminals.push({ elementId: component.id, kind: component.kind, terminalKey: "start", point: component.start });
    terminals.push({ elementId: component.id, kind: component.kind, terminalKey: "end", point: component.end });
  }

  return terminals;
}

function buildElectricalNodes(terminals: TerminalRef[], tolerance: number): {
  terminalToNode: Map<string, string>;
  nodePositions: Map<string, Vec2>;
} {
  // Spatial hash buckets for near-neighbor matching.
  const buckets = new Map<string, number[]>();
  terminals.forEach((t, idx) => {
    const key = bucketKey(t.point, tolerance);
    const existing = buckets.get(key);
    if (existing) existing.push(idx);
    else buckets.set(key, [idx]);
  });

  // Union-Find over terminal indices
  const parent = Array.from({ length: terminals.length }, (_, i) => i);
  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const neighborOffsets = [-1, 0, 1];
  for (const [key, indices] of buckets.entries()) {
    const [bx, bz] = key.split(":").map((v) => Number(v));
    for (const dx of neighborOffsets) {
      for (const dz of neighborOffsets) {
        const nk = `${bx + dx}:${bz + dz}`;
        const neighbor = buckets.get(nk);
        if (!neighbor) continue;
        for (const i of indices) {
          for (const j of neighbor) {
            if (i >= j) continue;
            if (dist(terminals[i].point, terminals[j].point) <= tolerance) {
              union(i, j);
            }
          }
        }
      }
    }
  }

  const rootToNodeId = new Map<number, string>();
  const nodePositions = new Map<string, Vec2>();
  const terminalToNode = new Map<string, string>();

  const makeTerminalKey = (t: TerminalRef) => `${t.elementId}:${t.terminalKey}`;

  for (let i = 0; i < terminals.length; i += 1) {
    const root = find(i);
    let nodeId = rootToNodeId.get(root);
    if (!nodeId) {
      nodeId = `n${rootToNodeId.size}`;
      rootToNodeId.set(root, nodeId);
      nodePositions.set(nodeId, terminals[i].point);
    }
    terminalToNode.set(makeTerminalKey(terminals[i]), nodeId);
  }

  return { terminalToNode, nodePositions };
}

function terminalNodeId(terminalToNode: Map<string, string>, elementId: string, terminalKey: string): string | null {
  return terminalToNode.get(`${elementId}:${terminalKey}`) ?? null;
}

function pickReferenceNode(elements: SchematicElement[], terminalToNode: Map<string, string>): string | null {
  // Prefer explicit ground.
  const ground = elements.find((e) => e.kind === "ground") as GroundElement | undefined;
  if (ground) {
    const node = terminalNodeId(terminalToNode, ground.id, "gnd");
    if (node) return node;
  }

  // Next prefer battery negative terminal (element.start is negative in our drawing model).
  const battery = elements.find((e) => e.kind === "battery") as TwoTerminalElement | undefined;
  if (battery) {
    const node = terminalNodeId(terminalToNode, battery.id, "start");
    if (node) return node;
  }

  // Fallback: first available terminal node.
  const firstKey = terminalToNode.values().next();
  return firstKey.done ? null : firstKey.value;
}

function buildIdealShortConnectivity(elements: SchematicElement[], terminalToNode: Map<string, string>): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a)!.add(b);
    graph.get(b)!.add(a);
  };

  for (const element of elements) {
    if (element.kind === "wire") {
      const wire = element as WireElement;
      for (let i = 0; i < wire.path.length - 1; i += 1) {
        const na = terminalNodeId(terminalToNode, wire.id, `p${i}`);
        const nb = terminalNodeId(terminalToNode, wire.id, `p${i + 1}`);
        if (na && nb && na !== nb) {
          addEdge(na, nb);
        }
      }
      continue;
    }

    // DC steady-state model: inductor is an ideal short.
    if (element.kind === "inductor") {
      const a = terminalNodeId(terminalToNode, element.id, "start");
      const b = terminalNodeId(terminalToNode, element.id, "end");
      if (a && b && a !== b) addEdge(a, b);
      continue;
    }
  }

  return graph;
}

function hasIdealShortBetween(graph: Map<string, Set<string>>, a: string, b: string): boolean {
  if (a === b) return true;
  const visited = new Set<string>();
  const queue: string[] = [a];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === b) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const neigh = graph.get(cur);
    if (!neigh) continue;
    for (const n of neigh) {
      if (!visited.has(n)) queue.push(n);
    }
  }
  return false;
}

/**
 * Solve a schematic circuit using DC Modified Nodal Analysis (MNA).
 *
 * Key guarantees:
 * - Open circuits yield ~0 A everywhere (no closed conductive path).
 * - Direction is standardized: for passive two-terminal parts, positive current means `start -> end`.
 * - Wires are treated as ideal shorts, but we still solve per-segment currents via 0 V sources.
 */
export function solveDCCircuit(elements: SchematicElement[], options?: { tolerance?: number }): DCSolution {
  const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE;
  const terminals = enumerateTerminals(elements);
  const { terminalToNode } = buildElectricalNodes(terminals, tolerance);

  const globalPreferredReference = pickReferenceNode(elements, terminalToNode);
  if (!globalPreferredReference) {
    return {
      status: "no_reference",
      reason: "No terminals found to establish a reference node.",
      nodeVoltages: new Map(),
      elementCurrents: new Map(),
      wireSegmentCurrents: [],
      terminalToNode,
    };
  }

  const allNodeIds = new Set<string>();
  for (const nodeId of terminalToNode.values()) {
    allNodeIds.add(nodeId);
  }

  const resistors: ResistorLike[] = [];
  const sources: VoltageSource[] = [];

  const pushVoltageSource = (source: VoltageSource) => {
    sources.push(source);
  };

  // Build components.
  for (const element of elements) {
    if (element.kind === "resistor" || element.kind === "lamp") {
      const a = terminalNodeId(terminalToNode, element.id, "start");
      const b = terminalNodeId(terminalToNode, element.id, "end");
      if (!a || !b || a === b) continue;
      const parsed = parseResistanceOhms((element as TwoTerminalElement).label);
      const ohms =
        element.kind === "lamp"
          ? (parsed && parsed > 0 ? parsed : 10)
          : (parsed && parsed > 0 ? parsed : 100);
      resistors.push({ elementId: element.id, kind: element.kind, a, b, ohms });
      continue;
    }

    if (element.kind === "battery") {
      const neg = terminalNodeId(terminalToNode, element.id, "start"); // negative terminal
      const pos = terminalNodeId(terminalToNode, element.id, "end");   // positive terminal
      if (!neg || !pos || neg === pos) continue;
      const volts = parseVoltageVolts((element as TwoTerminalElement).label) ?? 9;
      pushVoltageSource({
        id: `vs:${element.id}`,
        positiveNode: pos,
        negativeNode: neg,
        volts,
        meta: { type: "battery", elementId: element.id },
      });
      continue;
    }

    if (element.kind === "wire") {
      const wire = element as WireElement;
      for (let i = 0; i < wire.path.length - 1; i += 1) {
        const a = terminalNodeId(terminalToNode, wire.id, `p${i}`);
        const b = terminalNodeId(terminalToNode, wire.id, `p${i + 1}`);
        if (!a || !b || a === b) continue;
        pushVoltageSource({
          id: `vs:${wire.id}:${i}`,
          positiveNode: a,
          negativeNode: b,
          volts: 0,
          meta: { type: "wireSegment", wireId: wire.id, segmentIndex: i },
        });
      }
      continue;
    }

    if (element.kind === "inductor") {
      // DC steady-state: inductor ~ short (0 V) for current flow visualization.
      const a = terminalNodeId(terminalToNode, element.id, "start");
      const b = terminalNodeId(terminalToNode, element.id, "end");
      if (!a || !b || a === b) continue;
      pushVoltageSource({
        id: `vs:${element.id}`,
        positiveNode: a,
        negativeNode: b,
        volts: 0,
        meta: { type: "inductor", elementId: element.id },
      });
      continue;
    }

    // DC steady-state simplifications:
    // - capacitor: open circuit (ignore)
    // - switch: no state in schematic model yet; treat as open circuit

    // Diodes and LEDs: Model as voltage-controlled resistors
    // Forward bias (anode > cathode): conduct with small resistance + forward voltage drop
    // Reverse bias (anode < cathode): block current (very high resistance / open circuit)
    // This is a simplified linear approximation for DC analysis
    if (element.kind === "diode" || element.kind === "led") {
      const anode = terminalNodeId(terminalToNode, element.id, "start"); // anode at start
      const cathode = terminalNodeId(terminalToNode, element.id, "end"); // cathode at end
      if (!anode || !cathode || anode === cathode) continue;

      // For initial DC solve, we model diodes as having:
      // - Forward: small resistance (allows current flow from anode to cathode)
      // - We'll use a voltage source for the forward voltage drop + small series resistance
      // This creates a "diode in forward bias" model
      const forwardVoltage = element.kind === "led" ? 2.0 : 0.7; // LED ~2V, silicon diode ~0.7V
      const forwardResistance = element.kind === "led" ? 50 : 10; // Small series resistance in ohms

      // Add diode as a voltage source (forward drop) + resistor in series
      // The voltage source enforces the forward voltage drop
      // Note: This assumes forward bias. The validator will catch reverse bias conditions.
      pushVoltageSource({
        id: `vs:${element.id}`,
        positiveNode: anode,
        negativeNode: cathode,
        volts: forwardVoltage,
        meta: { type: "short", elementId: element.id, label: element.kind === "led" ? "LED" : "Diode" },
      });

      // Add a small series resistance for realistic current limiting
      // This helps prevent numerical issues and models the real diode behavior better
      resistors.push({
        elementId: `${element.id}_fwd`,
        kind: "resistor",
        a: anode,
        b: cathode,
        ohms: forwardResistance,
      });
      continue;
    }
  }

  // Partition into electrically connected components. This prevents floating/unconnected parts
  // from making the global MNA matrix singular (those subcircuits have undefined absolute voltages).
  const nodes = Array.from(allNodeIds);
  const nodeToIdx = new Map(nodes.map((id, idx) => [id, idx] as const));
  const parent = nodes.map((_, idx) => idx);
  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: string, b: string) => {
    const ia = nodeToIdx.get(a);
    const ib = nodeToIdx.get(b);
    if (ia === undefined || ib === undefined) return;
    const ra = find(ia);
    const rb = find(ib);
    if (ra !== rb) parent[rb] = ra;
  };

  resistors.forEach((r) => union(r.a, r.b));
  sources.forEach((s) => union(s.positiveNode, s.negativeNode));

  const componentMap = new Map<number, Set<string>>();
  nodes.forEach((id) => {
    const root = find(nodeToIdx.get(id)!);
    if (!componentMap.has(root)) componentMap.set(root, new Set());
    componentMap.get(root)!.add(id);
  });

  // Detect an "ideal short" directly across a battery (battery (+) to (-) connected only by ideal shorts).
  // This is checked per global netlist, but only matters if both terminals are in the same connected component.
  const idealGraph = buildIdealShortConnectivity(elements, terminalToNode);
  const batteries = elements.filter((e) => e.kind === "battery") as TwoTerminalElement[];
  for (const battery of batteries) {
    const neg = terminalNodeId(terminalToNode, battery.id, "start");
    const pos = terminalNodeId(terminalToNode, battery.id, "end");
    if (neg && pos && hasIdealShortBetween(idealGraph, neg, pos)) {
      return {
        status: "invalid_ideal_short",
        reason: "Battery terminals are connected by an ideal short (0 Ω path).",
        nodeVoltages: new Map([[globalPreferredReference, 0]]),
        elementCurrents: new Map(),
        wireSegmentCurrents: [],
        referenceNodeId: globalPreferredReference,
        terminalToNode,
      };
    }
  }

  const nodeVoltages = new Map<string, number>();
  const elementCurrents = new Map<string, SolvedElementCurrent>();
  const wireSegmentCurrents: SolvedWireSegmentCurrent[] = [];

  // Default everything to 0; then overwrite for solved components.
  for (const id of allNodeIds) {
    nodeVoltages.set(id, 0);
  }

  // Solve each component that contains at least one voltage source.
  let primaryReferenceNodeId: string | undefined = globalPreferredReference;

  const componentRoots = Array.from(componentMap.keys());
  for (const root of componentRoots) {
    const compNodes = componentMap.get(root)!;

    const compSources = sources.filter((s) => compNodes.has(s.positiveNode) && compNodes.has(s.negativeNode));
    const compResistors = resistors.filter((r) => compNodes.has(r.a) && compNodes.has(r.b));

    // If there are no sources, we keep all voltages/currents at 0 for this component.
    if (compSources.length === 0) {
      compResistors.forEach((r) => {
        elementCurrents.set(r.elementId, { elementId: r.elementId, amps: 0, direction: "unknown" });
      });
      continue;
    }

    // Pick a reference node for this component.
    let referenceNodeId: string | null = null;
    for (const element of elements) {
      if (element.kind !== "ground") continue;
      const n = terminalNodeId(terminalToNode, element.id, "gnd");
      if (n && compNodes.has(n)) {
        referenceNodeId = n;
        break;
      }
    }
    if (!referenceNodeId) {
      const battery = elements.find((e) => e.kind === "battery") as TwoTerminalElement | undefined;
      if (battery) {
        const n = terminalNodeId(terminalToNode, battery.id, "start");
        if (n && compNodes.has(n)) referenceNodeId = n;
      }
    }
    if (!referenceNodeId) {
      referenceNodeId = compNodes.values().next().value ?? null;
    }
    if (!referenceNodeId) {
      continue;
    }
    primaryReferenceNodeId = primaryReferenceNodeId ?? referenceNodeId;

    const unknownNodes = Array.from(compNodes).filter((n) => n !== referenceNodeId);
    const nodeIndex = new Map<string, number>(unknownNodes.map((id, idx) => [id, idx] as const));

    const n = unknownNodes.length;
    const m = compSources.length;
    const dim = n + m;

    if (dim === 0) {
      nodeVoltages.set(referenceNodeId, 0);
      continue;
    }

    const A: number[][] = Array.from({ length: dim }, () => Array.from({ length: dim }, () => 0));
    const bVec: number[] = Array.from({ length: dim }, () => 0);

    const idxV = (nodeId: string): number | null => (nodeId === referenceNodeId ? null : (nodeIndex.get(nodeId) ?? null));
    const idxI = (k: number) => n + k;

    for (const r of compResistors) {
      const g = r.ohms > EPS ? 1 / r.ohms : 1 / EPS;
      const ia = idxV(r.a);
      const ib = idxV(r.b);
      if (ia !== null) A[ia][ia] += g;
      if (ib !== null) A[ib][ib] += g;
      if (ia !== null && ib !== null) {
        A[ia][ib] -= g;
        A[ib][ia] -= g;
      }
    }

    for (let k = 0; k < compSources.length; k += 1) {
      const src = compSources[k];
      const ip = idxV(src.positiveNode);
      const ineg = idxV(src.negativeNode);
      const colI = idxI(k);
      if (ip !== null) A[ip][colI] += 1;
      if (ineg !== null) A[ineg][colI] -= 1;
      const row = idxI(k);
      if (ip !== null) A[row][ip] += 1;
      if (ineg !== null) A[row][ineg] -= 1;
      bVec[row] = src.volts;
    }

    const solved = gaussianSolve(A, bVec);
    if (!solved) {
      return {
        status: "singular",
        reason: "Circuit matrix is singular (often caused by floating subcircuits or ideal-only loops).",
        nodeVoltages: new Map([[globalPreferredReference, 0]]),
        elementCurrents: new Map(),
        wireSegmentCurrents: [],
        referenceNodeId: globalPreferredReference,
        terminalToNode,
      };
    }

    nodeVoltages.set(referenceNodeId, 0);
    for (const nodeId of unknownNodes) {
      nodeVoltages.set(nodeId, solved[nodeIndex.get(nodeId)!]);
    }

    const sourceCurrents = new Map<string, number>();
    for (let k = 0; k < compSources.length; k += 1) {
      sourceCurrents.set(compSources[k].id, solved[idxI(k)]);
    }

    const V = (nodeId: string) => nodeVoltages.get(nodeId) ?? 0;

    // Currents through resistor-like elements, standard: + means start -> end
    for (const r of compResistors) {
      const amps = (V(r.a) - V(r.b)) / r.ohms;
      elementCurrents.set(r.elementId, {
        elementId: r.elementId,
        amps,
        direction: amps >= 0 ? "start->end" : "end->start",
      });
    }

    for (const src of compSources) {
      const amps = sourceCurrents.get(src.id) ?? 0;
      if (src.meta.type === "battery") {
        elementCurrents.set(src.meta.elementId, {
          elementId: src.meta.elementId,
          amps,
          direction: amps >= 0 ? "end->start" : "start->end",
        });
        continue;
      }
      if (src.meta.type === "wireSegment") {
        wireSegmentCurrents.push({ wireId: src.meta.wireId, segmentIndex: src.meta.segmentIndex, amps });
        continue;
      }
      // Diode/LED current: positive amps means forward current (anode to cathode = start to end)
      if (src.meta.type === "short" && (src.meta.label === "LED" || src.meta.label === "Diode")) {
        // For diodes/LEDs, current flows from anode (start) to cathode (end) in forward bias
        // Positive source current means conventional current from anode to cathode
        elementCurrents.set(src.meta.elementId, {
          elementId: src.meta.elementId,
          amps: Math.abs(amps), // Forward current should be positive
          direction: amps >= 0 ? "start->end" : "end->start",
        });
      }
    }
  }

  // Ensure resistor/lamp currents exist even if they weren't part of a solved component.
  for (const r of resistors) {
    if (!elementCurrents.has(r.elementId)) {
      elementCurrents.set(r.elementId, { elementId: r.elementId, amps: 0, direction: "unknown" });
    }
  }

  return {
    status: "solved",
    nodeVoltages,
    elementCurrents,
    wireSegmentCurrents,
    referenceNodeId: primaryReferenceNodeId,
    terminalToNode,
  };
}

