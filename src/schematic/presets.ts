import type { PracticeProblem } from "../model/practice";
import { SymbolStandard } from "./standards";
import { buildElement, buildNodeMesh } from "./threeFactory";
import { Orientation, SchematicElement, TwoTerminalElement, Vec2 } from "./types";

const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

// Format resistance value for display (e.g., "150 Ω", "1.5 kΩ")
const formatResistance = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)} MΩ`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} kΩ`;
  }
  return `${value} Ω`;
};

// Format voltage value for display (e.g., "24V")
const formatVoltage = (value: number): string => {
  return `${value}V`;
};

export function buildPracticeCircuitElements(problem: PracticeProblem): SchematicElement[] {
  const elements: SchematicElement[] = [];
  let elementCounter = 0;

  const makeId = (prefix: string) => `${prefix}-${problem.id}-${elementCounter++}`;
  const clonePoint = (point: Vec2): Vec2 => ({ x: point.x, z: point.z });
  const point = (x: number, z: number): Vec2 => ({ x, z });
  const orientationFor = (start: Vec2, end: Vec2): Orientation =>
    Math.abs(end.x - start.x) >= Math.abs(end.z - start.z) ? "horizontal" : "vertical";

  const pushWire = (start: Vec2, end: Vec2) => {
    if (Math.abs(start.x - end.x) <= 1e-6 && Math.abs(start.z - end.z) <= 1e-6) {
      return;
    }
    elements.push({
      id: makeId("wire"),
      kind: "wire",
      path: [clonePoint(start), clonePoint(end)],
    });
  };

  const pushComponent = (kind: TwoTerminalElement["kind"], label: string, start: Vec2, end: Vec2) => {
    elements.push({
      id: makeId(kind),
      kind,
      label,
      start: clonePoint(start),
      end: clonePoint(end),
      orientation: orientationFor(start, end),
    });
  };

  const pushBattery = (start: Vec2, end: Vec2, label: string) => pushComponent("battery", label, start, end);
  const pushResistor = (label: string, start: Vec2, end: Vec2) => pushComponent("resistor", label, start, end);

  // Create labels with actual problem values for mirroring the 2D schematic
  const sourceVoltage = problem.source.givens?.voltage ?? problem.source.values?.voltage;
  const sourceLabel = sourceVoltage ? formatVoltage(sourceVoltage) : (problem.source.label ?? "Source");

  // Map component IDs to labels with their resistance values
  const componentLabels = new Map(
    problem.components.map((component) => {
      const resistance = component.givens?.resistance ?? component.values?.resistance;
      if (resistance) {
        return [component.id, `${component.id} = ${formatResistance(resistance)}`];
      }
      return [component.id, component.label ?? component.id];
    })
  );
  const labelFor = (id: string) => componentLabels.get(id) ?? id;

  const buildSeries = () => {
    const left = -4.4;
    const right = 4.4;
    const top = 2.7;
    const bottom = -2.7;

    const start = point(left, bottom);
    const batteryStart = point(left, bottom + 0.9);
    const batteryEnd = point(left, top - 0.9);
    const topLeft = point(left, top);
    const topRight = point(right, top);
    const bottomRight = point(right, bottom);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);

    const count = Math.max(problem.components.length, 1);

    if (count === 2) {
      // Two resistors: one on top, one on bottom
      const topMargin = 0.8;
      const component1 = problem.components[0];
      const component2 = problem.components[1];

      // R1 on top
      const r1Start = point(topLeft.x + topMargin, top);
      const r1End = point(topRight.x - topMargin, top);
      pushWire(topLeft, r1Start);
      pushResistor(labelFor(component1.id), r1Start, r1End);
      pushWire(r1End, topRight);

      // Right side wire
      pushWire(topRight, bottomRight);

      // R2 on bottom
      const r2Start = point(bottomRight.x - topMargin, bottom);
      const r2End = point(start.x + topMargin, bottom);
      pushWire(bottomRight, r2Start);
      pushResistor(labelFor(component2.id), r2Start, r2End);
      pushWire(r2End, start);
    } else if (count === 3) {
      // Three resistors: top, right side, bottom
      const topMargin = 0.8;
      const sideMargin = 0.6;
      const component1 = problem.components[0];
      const component2 = problem.components[1];
      const component3 = problem.components[2];

      // R1 on top
      const r1Start = point(topLeft.x + topMargin, top);
      const r1End = point(topRight.x - topMargin, top);
      pushWire(topLeft, r1Start);
      pushResistor(labelFor(component1.id), r1Start, r1End);
      pushWire(r1End, topRight);

      // R2 on right side
      const r2Start = point(right, top - sideMargin);
      const r2End = point(right, bottom + sideMargin);
      pushWire(topRight, r2Start);
      pushResistor(labelFor(component2.id), r2Start, r2End);
      pushWire(r2End, bottomRight);

      // R3 on bottom
      const r3Start = point(bottomRight.x - topMargin, bottom);
      const r3End = point(start.x + topMargin, bottom);
      pushWire(bottomRight, r3Start);
      pushResistor(labelFor(component3.id), r3Start, r3End);
      pushWire(r3End, start);
    } else {
      // 4+ resistors: distribute around the rectangle (top, right, bottom sides)
      // Following the same logic as CircuitDiagram.tsx for consistency
      const topCount = Math.ceil(count / 3);
      const bottomCount = Math.ceil((count - topCount) / 2);
      const rightCount = count - topCount - bottomCount;

      const topIds = problem.components.slice(0, topCount).map(c => c.id);
      const rightIds = problem.components.slice(topCount, topCount + rightCount).map(c => c.id);
      const bottomIds = problem.components.slice(topCount + rightCount).map(c => c.id);

      // Top row resistors (horizontal)
      const topWidth = topRight.x - topLeft.x;
      const topSpacing = topWidth / topIds.length;
      const topMargin = Math.min(topSpacing * 0.15, 0.4);

      let previous = topLeft;
      topIds.forEach((id, index) => {
        const startX = topLeft.x + index * topSpacing + topMargin;
        const endX = topLeft.x + (index + 1) * topSpacing - topMargin;
        const resistorStart = point(startX, top);
        const resistorEnd = point(endX, top);
        pushWire(previous, resistorStart);
        pushResistor(labelFor(id), resistorStart, resistorEnd);
        previous = resistorEnd;
      });
      pushWire(previous, topRight);

      // Right side resistors (vertical)
      if (rightIds.length > 0) {
        const rightHeight = top - bottom;
        const rightSpacing = rightHeight / rightIds.length;
        const rightMargin = Math.min(rightSpacing * 0.15, 0.3);

        let previousRight = topRight;
        rightIds.forEach((id, index) => {
          const startZ = top - index * rightSpacing - rightMargin;
          const endZ = top - (index + 1) * rightSpacing + rightMargin;
          const resistorStart = point(right, startZ);
          const resistorEnd = point(right, endZ);
          pushWire(previousRight, resistorStart);
          pushResistor(labelFor(id), resistorStart, resistorEnd);
          previousRight = resistorEnd;
        });
        pushWire(previousRight, bottomRight);
      } else {
        pushWire(topRight, bottomRight);
      }

      // Bottom row resistors (horizontal, reversed direction)
      if (bottomIds.length > 0) {
        const bottomWidth = topRight.x - topLeft.x;
        const bottomSpacing = bottomWidth / bottomIds.length;
        const bottomMargin = Math.min(bottomSpacing * 0.15, 0.4);

        let previousBottom = bottomRight;
        bottomIds.forEach((id, index) => {
          const startX = bottomRight.x - index * bottomSpacing - bottomMargin;
          const endX = bottomRight.x - (index + 1) * bottomSpacing + bottomMargin;
          const resistorStart = point(startX, bottom);
          const resistorEnd = point(endX, bottom);
          pushWire(previousBottom, resistorStart);
          pushResistor(labelFor(id), resistorStart, resistorEnd);
          previousBottom = resistorEnd;
        });
        pushWire(previousBottom, start);
      } else {
        pushWire(bottomRight, start);
      }
    }
  };

  const buildParallel = () => {
    const left = -2.6;
    const right = 3.8;
    const top = 2.5;
    const bottom = -2.5;

    const leftBottom = point(left, bottom);
    const batteryStart = point(left, bottom + 0.9);
    const batteryEnd = point(left, top - 0.9);
    const leftTop = point(left, top);
    const rightTop = point(right, top);
    const rightBottom = point(right, bottom);

    pushWire(leftBottom, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, leftTop);
    pushWire(leftTop, rightTop);
    pushWire(leftBottom, rightBottom);

    const branchCount = Math.max(problem.components.length, 1);
    const spacing = (right - left) / (branchCount + 1);
    const branchSpan = Math.min(Math.abs(top - bottom) - 1, 4.2);
    const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, 0.6);

    problem.components.forEach((component, index) => {
      const x = left + spacing * (index + 1);
      const topNode = point(x, top);
      const bottomNode = point(x, bottom);
      const resistorStart = point(x, top - offset);
      const resistorEnd = point(x, bottom + offset);

      pushWire(topNode, resistorStart);
      pushResistor(labelFor(component.id), resistorStart, resistorEnd);
      pushWire(resistorEnd, bottomNode);
    });
  };

  const buildCombination = () => {
    const componentCount = problem.components.length;
    const hasBottomSeries = componentCount >= 4;

    // Identify series vs parallel components
    const seriesTopId = problem.components[0]?.id ?? "R1";
    const seriesBottomId = hasBottomSeries ? problem.components[componentCount - 1]?.id : null;
    const parallelIds = hasBottomSeries
      ? problem.components.slice(1, -1).map(c => c.id)
      : problem.components.slice(1).map(c => c.id);

    const parallelCount = parallelIds.length;

    // Layout dimensions
    const left = -4.2;
    const right = 3.8;
    const top = 2.3;
    const bottom = -2.3;

    const start = point(left, bottom);
    const batteryStart = point(left, bottom + 0.8);
    const batteryEnd = point(left, top - 0.8);
    const topLeft = point(left, top);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);

    // Series resistor on top (R1)
    const seriesTopStart = point(-2.4, top);
    const seriesTopEnd = point(-0.4, top);
    pushWire(topLeft, seriesTopStart);
    pushResistor(labelFor(seriesTopId), seriesTopStart, seriesTopEnd);

    // Parallel branches
    const branchCenterX = 1.4;
    const branchSpacing = Math.min(1.8, 3.6 / parallelCount);
    const totalWidth = branchSpacing * (parallelCount - 1);
    const branchStartX = branchCenterX - totalWidth / 2;

    const branchTop = point(branchCenterX, top);
    const branchBottom = point(branchCenterX, hasBottomSeries ? -0.3 : bottom);

    pushWire(seriesTopEnd, branchTop);

    // Create parallel branches
    parallelIds.forEach((id, index) => {
      const x = branchStartX + index * branchSpacing;
      const branchTopPt = point(x, top);
      const branchBottomPt = point(x, hasBottomSeries ? -0.3 : bottom);
      const resistorTop = point(x, top - 0.6);
      const resistorBottom = point(x, (hasBottomSeries ? -0.3 : bottom) + 0.6);

      pushWire(branchTop, branchTopPt);
      pushWire(branchTopPt, resistorTop);
      pushResistor(labelFor(id), resistorTop, resistorBottom);
      pushWire(resistorBottom, branchBottomPt);
      pushWire(branchBottomPt, branchBottom);
    });

    // Close the circuit
    if (hasBottomSeries && seriesBottomId) {
      // Bottom series resistor (R4)
      const dropNode = point(branchCenterX, bottom);
      const seriesBottomStart = point(-0.4, bottom);
      const seriesBottomEnd = point(-2.4, bottom);

      pushWire(branchBottom, dropNode);
      pushResistor(labelFor(seriesBottomId), dropNode, seriesBottomStart);
      pushWire(seriesBottomStart, seriesBottomEnd);
      pushWire(seriesBottomEnd, start);
    } else {
      // Direct return wire
      pushWire(branchBottom, point(branchCenterX, bottom));
      pushWire(point(branchCenterX, bottom), start);
    }

    // Right side closing wire
    const rightTop = point(right, top);
    const rightBottom = point(right, bottom);
    pushWire(branchTop, rightTop);
    pushWire(rightTop, rightBottom);
    pushWire(rightBottom, point(branchCenterX, bottom));
  };

  const presetKey = problem.presetHint ?? problem.topology;

  switch (presetKey) {
    case "parallel_basic":
      buildParallel();
      break;
    case "mixed_circuit":
      buildCombination();
      break;
    case "series_basic":
    default:
      if (problem.topology === "parallel") {
        buildParallel();
      } else if (problem.topology === "combination") {
        buildCombination();
      } else {
        buildSeries();
      }
      break;
  }

  return elements;
}

export function buildPracticeCircuit(three: any, problem: PracticeProblem, standard: SymbolStandard) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

  const elements = buildPracticeCircuitElements(problem);
  const nodeMap = new Map<string, Vec2>();
  const elementGroup = new three.Group();

  elements.forEach((element) => {
    const { group: elementMesh, terminals } = buildElement(three, element, { standard });
    elementGroup.add(elementMesh);
    terminals.forEach((terminal) => {
      const key = pointKey(terminal);
      if (!nodeMap.has(key)) {
        nodeMap.set(key, terminal);
      }
    });
  });

  group.add(elementGroup);

  const nodeGroup = new three.Group();
  nodeMap.forEach((node) => {
    const mesh = buildNodeMesh(three, node, { standard });
    nodeGroup.add(mesh);
  });

  group.add(nodeGroup);

  // Expose the canonical elements used to build the circuit (useful for flow/path visualisation)
  group.userData = { ...(group.userData ?? {}), elements };

  return group;
}
