import type { PracticeProblem } from "../model/practice";
import { SymbolStandard } from "./standards";
import { buildElement, buildNodeMesh } from "./threeFactory";
import { Orientation, SchematicElement, TwoTerminalElement, Vec2 } from "./types";
import {
  SERIES_LAYOUT,
  PARALLEL_LAYOUT,
  COMBINATION_LAYOUT,
  BATTERY_LAYOUT,
} from "./visualConstants";

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
    // Use centralized layout bounds for 3D series circuits
    const { left, right, top, bottom } = SERIES_LAYOUT.bounds3D;

    const start = point(left, bottom);
    const batteryOffset = BATTERY_LAYOUT.offset3D.fromCorner;
    const batteryStart = point(left, bottom + batteryOffset);
    const batteryEnd = point(left, top - batteryOffset);
    const topLeft = point(left, top);
    const topRight = point(right, top);
    const bottomRight = point(right, bottom);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);

    const count = Math.max(problem.components.length, 1);

    if (count === 2) {
      // Two resistors: one on top, one on bottom - centered with equal margins
      const topMargin = SERIES_LAYOUT.margins.twoComponent.horizontal3D;
      const component1 = problem.components[0];
      const component2 = problem.components[1];

      // R1 on top - centered
      const r1Start = point(topLeft.x + topMargin, top);
      const r1End = point(topRight.x - topMargin, top);
      pushWire(topLeft, r1Start);
      pushResistor(labelFor(component1.id), r1Start, r1End);
      pushWire(r1End, topRight);

      // Right side wire
      pushWire(topRight, bottomRight);

      // R2 on bottom - centered (symmetric with R1)
      const r2Start = point(bottomRight.x - topMargin, bottom);
      const r2End = point(start.x + topMargin, bottom);
      pushWire(bottomRight, r2Start);
      pushResistor(labelFor(component2.id), r2Start, r2End);
      pushWire(r2End, start);
    } else if (count === 3) {
      // Three resistors: top, right side, bottom - evenly distributed
      const topMargin = SERIES_LAYOUT.margins.threeComponent.horizontal3D;
      const sideMargin = SERIES_LAYOUT.margins.threeComponent.vertical3D;
      const component1 = problem.components[0];
      const component2 = problem.components[1];
      const component3 = problem.components[2];

      // R1 on top - centered
      const r1Start = point(topLeft.x + topMargin, top);
      const r1End = point(topRight.x - topMargin, top);
      pushWire(topLeft, r1Start);
      pushResistor(labelFor(component1.id), r1Start, r1End);
      pushWire(r1End, topRight);

      // R2 on right side - centered vertically
      const r2Start = point(right, top - sideMargin);
      const r2End = point(right, bottom + sideMargin);
      pushWire(topRight, r2Start);
      pushResistor(labelFor(component2.id), r2Start, r2End);
      pushWire(r2End, bottomRight);

      // R3 on bottom - centered (symmetric with R1)
      const r3Start = point(bottomRight.x - topMargin, bottom);
      const r3End = point(start.x + topMargin, bottom);
      pushWire(bottomRight, r3Start);
      pushResistor(labelFor(component3.id), r3Start, r3End);
      pushWire(r3End, start);
    } else {
      // 4+ resistors: distribute around the rectangle (top, right, bottom sides)
      // Using centralized distribution formula for even component spacing
      const { getTopCount, getBottomCount, getRightCount } = SERIES_LAYOUT.distribution;
      const topCount = getTopCount(count);
      const bottomCount = getBottomCount(count, topCount);
      const rightCount = getRightCount(count, topCount, bottomCount);

      const topIds = problem.components.slice(0, topCount).map(c => c.id);
      const rightIds = problem.components.slice(topCount, topCount + rightCount).map(c => c.id);
      const bottomIds = problem.components.slice(topCount + rightCount).map(c => c.id);

      // Margin constraints from centralized standards
      const { marginRatio, maxHorizontal, maxVertical } = SERIES_LAYOUT.margins.multiComponent;

      // Top row resistors (horizontal) - evenly distributed
      const topWidth = topRight.x - topLeft.x;
      const topSpacing = topWidth / topIds.length;
      const topMargin = Math.min(topSpacing * marginRatio, maxHorizontal);

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

      // Right side resistors (vertical) - evenly distributed
      if (rightIds.length > 0) {
        const rightHeight = top - bottom;
        const rightSpacing = rightHeight / rightIds.length;
        const rightMargin = Math.min(rightSpacing * marginRatio, maxVertical);

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

      // Bottom row resistors (horizontal, reversed direction) - evenly distributed
      if (bottomIds.length > 0) {
        const bottomWidth = topRight.x - topLeft.x;
        const bottomSpacing = bottomWidth / bottomIds.length;
        const bottomMargin = Math.min(bottomSpacing * marginRatio, maxHorizontal);

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
    // Use centralized layout bounds for 3D parallel circuits
    const { left, right, top, bottom } = PARALLEL_LAYOUT.bounds3D;

    const leftBottom = point(left, bottom);
    const batteryOffset = BATTERY_LAYOUT.offset3D.fromCorner;
    const batteryStart = point(left, bottom + batteryOffset);
    const batteryEnd = point(left, top - batteryOffset);
    const leftTop = point(left, top);
    const rightTop = point(right, top);
    const rightBottom = point(right, bottom);

    pushWire(leftBottom, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, leftTop);
    pushWire(leftTop, rightTop);
    pushWire(leftBottom, rightBottom);

    // Calculate branch positions using centralized formula
    // Branches are evenly distributed across the available width
    const branchCount = Math.max(problem.components.length, 1);
    const spacing = (right - left) / (branchCount + 1);

    // Branch vertical span from centralized standards
    const { minVerticalSpan3D, minOffset3D } = PARALLEL_LAYOUT.branches;
    const branchSpan = Math.min(Math.abs(top - bottom) - 1, minVerticalSpan3D);
    const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, minOffset3D);

    // Render each branch - evenly distributed and centered
    problem.components.forEach((component, index) => {
      const x = left + spacing * (index + 1);  // Evenly distributed positions
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
    const extractDoubleParallelGroups = (): string[][] | null => {
      const network = problem.network;
      if (network.kind !== "series" || network.children.length !== 2) {
        return null;
      }

      const groups: string[][] = [];
      for (const child of network.children) {
        if (child.kind !== "parallel") {
          return null;
        }
        const ids = child.children
          .filter((node): node is { kind: "component"; componentId: string } => node.kind === "component")
          .map((node) => node.componentId);
        if (ids.length === 0) {
          return null;
        }
        groups.push(ids);
      }
      return groups;
    };

    const doubleParallelGroups = extractDoubleParallelGroups();
    if (doubleParallelGroups) {
      const [topGroupIds, bottomGroupIds] = doubleParallelGroups;
      const { left, top, bottom } = COMBINATION_LAYOUT.bounds3D;
      const {
        centerX3D,
        branchSpacing3D,
        topNodeZ3D,
        midNodeZ3D,
        bottomNodeZ3D,
        leadInset3D,
      } = COMBINATION_LAYOUT.doubleParallel;

      const start = point(left, bottom);
      const batteryOffset = BATTERY_LAYOUT.offset3D.fromCorner - 0.1;
      const batteryStart = point(left, bottom + batteryOffset);
      const batteryEnd = point(left, top - batteryOffset);

      const topSourceNode = point(left, topNodeZ3D);
      const bottomSourceNode = point(left, bottomNodeZ3D);
      const topCenter = point(centerX3D, topNodeZ3D);
      const midCenter = point(centerX3D, midNodeZ3D);
      const bottomCenter = point(centerX3D, bottomNodeZ3D);

      const branchCount = Math.max(topGroupIds.length, bottomGroupIds.length, 1);
      const width = branchSpacing3D * Math.max(branchCount - 1, 0);
      const branchStartX = centerX3D - width / 2;
      const branchXs = Array.from({ length: branchCount }, (_, index) => branchStartX + index * branchSpacing3D);

      pushWire(start, batteryStart);
      pushBattery(batteryStart, batteryEnd, sourceLabel);
      pushWire(batteryEnd, topSourceNode);
      pushWire(topSourceNode, topCenter);
      pushWire(bottomCenter, bottomSourceNode);
      pushWire(bottomSourceNode, start);

      // Top parallel group
      topGroupIds.forEach((id, index) => {
        const x = branchXs[index] ?? centerX3D;
        const topNode = point(x, topNodeZ3D);
        const midNode = point(x, midNodeZ3D);
        const resistorStart = point(x, topNodeZ3D - leadInset3D);
        const resistorEnd = point(x, midNodeZ3D + leadInset3D);

        pushWire(topCenter, topNode);
        pushWire(topNode, resistorStart);
        pushResistor(labelFor(id), resistorStart, resistorEnd);
        pushWire(resistorEnd, midNode);
        pushWire(midNode, midCenter);
      });

      // Bottom parallel group
      bottomGroupIds.forEach((id, index) => {
        const x = branchXs[index] ?? centerX3D;
        const midNode = point(x, midNodeZ3D);
        const bottomNode = point(x, bottomNodeZ3D);
        const resistorStart = point(x, midNodeZ3D - leadInset3D);
        const resistorEnd = point(x, bottomNodeZ3D + leadInset3D);

        pushWire(midCenter, midNode);
        pushWire(midNode, resistorStart);
        pushResistor(labelFor(id), resistorStart, resistorEnd);
        pushWire(resistorEnd, bottomNode);
        pushWire(bottomNode, bottomCenter);
      });

      return;
    }

    const componentCount = problem.components.length;
    const hasBottomSeries = componentCount >= 4;

    // Identify series vs parallel components
    const seriesTopId = problem.components[0]?.id ?? "R1";
    const seriesBottomId = hasBottomSeries ? problem.components[componentCount - 1]?.id : null;
    const parallelIds = hasBottomSeries
      ? problem.components.slice(1, -1).map(c => c.id)
      : problem.components.slice(1).map(c => c.id);

    const parallelCount = parallelIds.length;

    // Use centralized layout bounds for 3D combination circuits
    const { left, right, top, bottom } = COMBINATION_LAYOUT.bounds3D;

    const start = point(left, bottom);
    const batteryOffset = BATTERY_LAYOUT.offset3D.fromCorner - 0.1;  // Slightly tighter for combination
    const batteryStart = point(left, bottom + batteryOffset);
    const batteryEnd = point(left, top - batteryOffset);
    const topLeft = point(left, top);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);

    // Series resistor positions from centralized standards
    const { series3DStart, series3DEnd } = COMBINATION_LAYOUT.seriesResistor;
    const seriesTopStart = point(series3DStart, top);
    const seriesTopEnd = point(series3DEnd, top);
    pushWire(topLeft, seriesTopStart);
    pushResistor(labelFor(seriesTopId), seriesTopStart, seriesTopEnd);

    // Parallel branches using centralized spacing
    const { branchCenterX3D, maxSpacing3D, spacingDivisor3D, topOffset3D, bottomOffset3D, bottomConnectionY3D } = COMBINATION_LAYOUT.parallelSection;
    const branchSpacing = Math.min(maxSpacing3D, spacingDivisor3D / parallelCount);
    const totalWidth = branchSpacing * (parallelCount - 1);
    const branchStartX = branchCenterX3D - totalWidth / 2;

    const branchTop = point(branchCenterX3D, top);
    const branchBottom = point(branchCenterX3D, hasBottomSeries ? bottomConnectionY3D : bottom);

    pushWire(seriesTopEnd, branchTop);

    // Create parallel branches - evenly distributed and centered
    parallelIds.forEach((id, index) => {
      const x = branchStartX + index * branchSpacing;
      const branchTopPt = point(x, top);
      const branchBottomPt = point(x, hasBottomSeries ? bottomConnectionY3D : bottom);
      const resistorTop = point(x, top - topOffset3D);
      const resistorBottom = point(x, (hasBottomSeries ? bottomConnectionY3D : bottom) + bottomOffset3D);

      pushWire(branchTop, branchTopPt);
      pushWire(branchTopPt, resistorTop);
      pushResistor(labelFor(id), resistorTop, resistorBottom);
      pushWire(resistorBottom, branchBottomPt);
      pushWire(branchBottomPt, branchBottom);
    });

    // Close the circuit
    if (hasBottomSeries && seriesBottomId) {
      // Bottom series resistor (R4)
      const dropNode = point(branchCenterX3D, bottom);
      const seriesBottomStart = point(series3DEnd, bottom);
      const seriesBottomEnd = point(series3DStart, bottom);

      pushWire(branchBottom, dropNode);
      pushResistor(labelFor(seriesBottomId), dropNode, seriesBottomStart);
      pushWire(seriesBottomStart, seriesBottomEnd);
      pushWire(seriesBottomEnd, start);
    } else {
      // Direct return wire
      pushWire(branchBottom, point(branchCenterX3D, bottom));
      pushWire(point(branchCenterX3D, bottom), start);
    }

    // Right side closing wire
    const rightTop = point(right, top);
    const rightBottom = point(right, bottom);
    pushWire(branchTop, rightTop);
    pushWire(rightTop, rightBottom);
    pushWire(rightBottom, point(branchCenterX3D, bottom));
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
