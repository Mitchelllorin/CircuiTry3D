import { DEFAULT_SYMBOL_STANDARD, STANDARD_PROFILES, type SymbolStandard } from "./standards";
import type { SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

const EPS = 1e-6;

// @ts-expect-error TS6133
const _pointKey = (p: Vec2) => `${p.x.toFixed(6)}|${p.z.toFixed(6)}`;

const pointsEqual = (a: Vec2, b: Vec2) =>
  Math.abs(a.x - b.x) <= EPS && Math.abs(a.z - b.z) <= EPS;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const reversePath = (path: Vec2[]) => [...path].reverse();

const dedupeAdjacent = (path: Vec2[]): Vec2[] => {
  if (path.length <= 1) return path;
  const out: Vec2[] = [path[0]];
  for (let i = 1; i < path.length; i += 1) {
    const prev = out[out.length - 1];
    const next = path[i];
    if (!prev || !pointsEqual(prev, next)) {
      out.push(next);
    }
  }
  return out;
};

type AxisMetrics = {
  length: number;
  direction: 1 | -1;
  orientation: "horizontal" | "vertical";
  offsetPoint: (distance: number) => Vec2;
};

const computeAxisMetrics = (element: TwoTerminalElement): AxisMetrics => {
  if (element.orientation === "horizontal") {
    const delta = element.end.x - element.start.x;
    const direction: 1 | -1 = delta >= 0 ? 1 : -1;
    const length = Math.abs(delta);
    const baseZ = element.start.z;
    return {
      orientation: "horizontal",
      length,
      direction,
      offsetPoint: (distance: number) => ({ x: element.start.x + distance * direction, z: baseZ }),
    };
  }

  const delta = element.end.z - element.start.z;
  const direction: 1 | -1 = delta >= 0 ? 1 : -1;
  const length = Math.abs(delta);
  const baseX = element.start.x;
  return {
    orientation: "vertical",
    length,
    direction,
    offsetPoint: (distance: number) => ({ x: baseX, z: element.start.z + distance * direction }),
  };
};

function buildResistorConductorPath(element: TwoTerminalElement, standard?: SymbolStandard): Vec2[] {
  const profile = STANDARD_PROFILES[standard ?? DEFAULT_SYMBOL_STANDARD];
  const metrics = computeAxisMetrics(element);

  const suggestedLead = clamp(
    metrics.length * profile.resistor.leadFraction,
    profile.general.leadMin,
    Math.min(profile.general.leadMax, metrics.length / 2)
  );

  let leadLength = Math.min(suggestedLead, metrics.length / 2);
  let bodyLength = Math.max(metrics.length - 2 * leadLength, 0);

  if (bodyLength < profile.resistor.minBodyLength && metrics.length > profile.resistor.minBodyLength) {
    bodyLength = profile.resistor.minBodyLength;
    leadLength = Math.max((metrics.length - bodyLength) / 2, profile.general.leadMin * 0.6);
  }

  if (metrics.length <= profile.resistor.minBodyLength) {
    bodyLength = Math.max(metrics.length * 0.62, metrics.length - 2 * profile.general.leadMin);
    leadLength = Math.max((metrics.length - bodyLength) / 2, metrics.length * 0.18);
  }

  leadLength = clamp(leadLength, 0, metrics.length / 2);
  bodyLength = clamp(bodyLength, EPS, Math.max(metrics.length - 2 * leadLength, EPS));

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);

  // Default: straight conductor through the body
  if (profile.resistor.bodyStyle !== "zigzag") {
    return dedupeAdjacent([element.start, bodyStart, bodyEnd, element.end]);
  }

  const segments = Math.max(profile.resistor.zigzagSegments, 2);
  const amplitudeLimit = bodyLength / (segments * 1.4);
  const amplitude = Math.min(profile.resistor.zigzagAmplitude, amplitudeLimit);

  const zigPoints: Vec2[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const distance = leadLength + bodyLength * t;
    const basePoint = metrics.offsetPoint(distance);
    if (i === 0 || i === segments || amplitude <= EPS) {
      zigPoints.push(basePoint);
      continue;
    }

    const polarity = i % 2 === 0 ? -1 : 1;
    if (metrics.orientation === "horizontal") {
      zigPoints.push({ x: basePoint.x, z: basePoint.z + amplitude * polarity });
    } else {
      zigPoints.push({ x: basePoint.x + amplitude * polarity, z: basePoint.z });
    }
  }

  return dedupeAdjacent([element.start, bodyStart, ...zigPoints, bodyEnd, element.end]);
}

export function buildElementConductorPath(element: SchematicElement, standard?: SymbolStandard): Vec2[] | null {
  if (element.kind === "wire") {
    const wire = element as WireElement;
    return dedupeAdjacent(wire.path);
  }

  // Practice circuits only use two-terminal elements (battery + resistors) right now.
  if ("start" in element && "end" in element) {
    const two = element as TwoTerminalElement;
    if (two.kind === "resistor") {
      return buildResistorConductorPath(two, standard);
    }
    return dedupeAdjacent([two.start, two.end]);
  }

  return null;
}

/**
 * Merge element-level conductor polylines into longer continuous flow paths.
 * This is greedy (first-match) but gives a much more circuit-like animation than per-segment looping.
 */
export function buildFlowPathsFromElements(elements: SchematicElement[], standard?: SymbolStandard): Vec2[][] {
  const raw = elements
    .map((el) => buildElementConductorPath(el, standard))
    .filter((p): p is Vec2[] => Boolean(p && p.length >= 2))
    .map(dedupeAdjacent);

  const unused = raw.map((path, idx) => ({ idx, path }));
  const used = new Set<number>();
  const merged: Vec2[][] = [];

  const tryExtend = (current: Vec2[], direction: "forward" | "backward"): boolean => {
    const head = current[0];
    const tail = current[current.length - 1];
    const anchor = direction === "forward" ? tail : head;

    for (const candidate of unused) {
      if (used.has(candidate.idx)) continue;
      const cand = candidate.path;
      const candHead = cand[0];
      const candTail = cand[cand.length - 1];

      // Match anchor to candidate head
      if (pointsEqual(anchor, candHead)) {
        used.add(candidate.idx);
        if (direction === "forward") {
          current.push(...cand.slice(1));
        } else {
          current.unshift(...cand.slice(0, cand.length - 1));
        }
        return true;
      }

      // Match anchor to candidate tail (reverse candidate)
      if (pointsEqual(anchor, candTail)) {
        used.add(candidate.idx);
        const reversed = reversePath(cand);
        if (direction === "forward") {
          current.push(...reversed.slice(1));
        } else {
          current.unshift(...reversed.slice(0, reversed.length - 1));
        }
        return true;
      }
    }

    return false;
  };

  for (const item of unused) {
    if (used.has(item.idx)) continue;
    used.add(item.idx);

    const current = [...item.path];
    // Greedily extend in both directions as long as possible.
    // (This tends to reconstruct the intended loop rails / branches.)
    while (tryExtend(current, "forward")) {
      // keep extending
    }
    while (tryExtend(current, "backward")) {
      // keep extending
    }

    merged.push(dedupeAdjacent(current));
  }

  // Filter out tiny paths that don't meaningfully animate.
  return merged.filter((path) => path.length >= 2);
}

