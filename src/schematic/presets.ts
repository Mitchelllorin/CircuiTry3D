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

    // Canonical textbook series template:
    // battery on left, one centered component on top/right/bottom.
    const seriesIds = problem.components.map((component) => component.id);
    const buildSideGroups = (): [string[], string[], string[]] => {
      if (!seriesIds.length) {
        return [[], [], []];
      }
      if (seriesIds.length === 1) {
        return [[seriesIds[0]], [seriesIds[0]], []];
      }
      if (seriesIds.length === 2) {
        return [[seriesIds[0]], [seriesIds[1]], []];
      }
      const topCount = Math.ceil(seriesIds.length / 3);
      const remainingAfterTop = seriesIds.length - topCount;
      const rightCount = Math.ceil(remainingAfterTop / 2);
      return [
        seriesIds.slice(0, topCount),
        seriesIds.slice(topCount, topCount + rightCount),
        seriesIds.slice(topCount + rightCount),
      ];
    };
    const mergeSideLabel = (ids: string[], fallback: string) => {
      if (!ids.length) {
        return fallback;
      }
      if (ids.length === 1) {
        return labelFor(ids[0]);
      }
      return ids.map((id) => labelFor(id)).join(" + ");
    };

    const [topIds, rightIds, bottomIds] = buildSideGroups();
    const topLabel = mergeSideLabel(topIds, "Top load");
    const rightLabel = mergeSideLabel(rightIds, "Right load");
    const bottomLabel = mergeSideLabel(bottomIds, "Bottom return");

    const topMargin = SERIES_LAYOUT.margins.threeComponent.horizontal3D;
    const sideMargin = SERIES_LAYOUT.margins.threeComponent.vertical3D;

    // Top side component (centered)
    const topStart = point(topLeft.x + topMargin, top);
    const topEnd = point(topRight.x - topMargin, top);
    pushWire(topLeft, topStart);
    pushResistor(topLabel, topStart, topEnd);
    pushWire(topEnd, topRight);

    // Right side component (centered)
    const rightStart = point(right, top - sideMargin);
    const rightEnd = point(right, bottom + sideMargin);
    pushWire(topRight, rightStart);
    pushResistor(rightLabel, rightStart, rightEnd);
    pushWire(rightEnd, bottomRight);

    // Bottom side component (centered)
    const bottomStart = point(bottomRight.x - topMargin, bottom);
    const bottomEnd = point(start.x + topMargin, bottom);
    pushWire(bottomRight, bottomStart);
    pushResistor(bottomLabel, bottomStart, bottomEnd);
    pushWire(bottomEnd, start);
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
    const componentCount = problem.components.length;
    const isDoubleParallel =
      problem.network.kind === "series" &&
      problem.network.children.length === 2 &&
      problem.network.children.every((child) => child.kind === "parallel");

    // Use centralized layout bounds for 3D combination circuits
    const { left, top, bottom } = COMBINATION_LAYOUT.bounds3D;

    const start = point(left, bottom);
    const batteryOffset = BATTERY_LAYOUT.offset3D.fromCorner - 0.1;
    const batteryStart = point(left, bottom + batteryOffset);
    const batteryEnd = point(left, top - batteryOffset);
    const topLeft = point(left, top);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);

    if (isDoubleParallel && componentCount >= 4) {
      const [r1, r2, r3, r4] = problem.components.map((component) => component.id);
      const middle = (top + bottom) / 2;
      const box1CenterX = -1.2;
      const box2CenterX = 1.9;
      const branchOffset = 0.55;
      const leadOffset = 0.5;

      const box1LeftX = box1CenterX - branchOffset;
      const box1RightX = box1CenterX + branchOffset;
      const box2LeftX = box2CenterX - branchOffset;
      const box2RightX = box2CenterX + branchOffset;

      // Feed the first parallel section from the source top node.
      pushWire(topLeft, point(box1LeftX, top));
      pushWire(point(box1LeftX, top), point(box1RightX, top));
      pushWire(point(box1LeftX, middle), point(box1RightX, middle));

      // Series link between the two parallel sections.
      pushWire(point(box1RightX, middle), point(box2LeftX, middle));

      pushWire(point(box2LeftX, middle), point(box2RightX, middle));
      pushWire(point(box2LeftX, bottom), point(box2RightX, bottom));
      pushWire(point(box2RightX, bottom), start);

      const addVerticalBranch = (id: string, x: number, topZ: number, bottomZ: number) => {
        const resistorTop = point(x, topZ - leadOffset);
        const resistorBottom = point(x, bottomZ + leadOffset);
        pushWire(point(x, topZ), resistorTop);
        pushResistor(labelFor(id), resistorTop, resistorBottom);
        pushWire(resistorBottom, point(x, bottomZ));
      };

      addVerticalBranch(r1 ?? "R1", box1LeftX, top, middle);
      addVerticalBranch(r2 ?? "R2", box1RightX, top, middle);
      addVerticalBranch(r3 ?? "R3", box2LeftX, middle, bottom);
      addVerticalBranch(r4 ?? "R4", box2RightX, middle, bottom);
      return;
    }

    const hasBottomSeries = componentCount >= 4;

    // Identify series vs parallel components
    const seriesTopId = problem.components[0]?.id ?? "R1";
    const seriesBottomId = hasBottomSeries ? problem.components[componentCount - 1]?.id : null;
    const parallelIds = hasBottomSeries
      ? problem.components.slice(1, -1).map((component) => component.id)
      : problem.components.slice(1).map((component) => component.id);
    const renderedParallelIds = parallelIds.length ? parallelIds : [seriesTopId];

    // Series resistor positions from centralized standards
    const { series3DStart, series3DEnd } = COMBINATION_LAYOUT.seriesResistor;
    const seriesTopStart = point(series3DStart, top);
    const seriesTopEnd = point(series3DEnd, top);
    pushWire(topLeft, seriesTopStart);
    pushResistor(labelFor(seriesTopId), seriesTopStart, seriesTopEnd);

    // Parallel branches using centralized spacing (no short-circuit closing rail)
    const {
      branchCenterX3D,
      maxSpacing3D,
      spacingDivisor3D,
      topOffset3D,
      bottomOffset3D,
      bottomConnectionY3D,
    } = COMBINATION_LAYOUT.parallelSection;
    const branchBottomZ = hasBottomSeries ? bottomConnectionY3D : bottom;
    const branchCount = renderedParallelIds.length;
    const branchSpacing = branchCount > 1 ? Math.min(maxSpacing3D, spacingDivisor3D / branchCount) : 0;
    const totalWidth = branchSpacing * Math.max(branchCount - 1, 0);
    const branchStartX = branchCenterX3D - totalWidth / 2;
    const branchXs = renderedParallelIds.map((_, index) => branchStartX + index * branchSpacing);
    const branchLeftX = branchXs[0];
    const branchRightX = branchXs[branchXs.length - 1];

    const topRailLeft = point(branchLeftX, top);
    const topRailRight = point(branchRightX, top);
    const bottomRailLeft = point(branchLeftX, branchBottomZ);
    const bottomRailRight = point(branchRightX, branchBottomZ);

    pushWire(seriesTopEnd, topRailLeft);
    pushWire(topRailLeft, topRailRight);

    renderedParallelIds.forEach((id, index) => {
      const x = branchXs[index];
      const resistorTop = point(x, top - topOffset3D);
      const resistorBottom = point(x, branchBottomZ + bottomOffset3D);
      pushWire(point(x, top), resistorTop);
      pushResistor(labelFor(id), resistorTop, resistorBottom);
      pushWire(resistorBottom, point(x, branchBottomZ));
    });

    pushWire(bottomRailLeft, bottomRailRight);

    if (hasBottomSeries && seriesBottomId) {
      // Bottom series resistor return leg.
      const seriesBottomStart = point(series3DEnd, bottom);
      const seriesBottomEnd = point(series3DStart, bottom);
      pushWire(bottomRailLeft, seriesBottomStart);
      pushResistor(labelFor(seriesBottomId), seriesBottomStart, seriesBottomEnd);
      pushWire(seriesBottomEnd, start);
    } else {
      // Direct return wire for top+parallel combinations.
      const dropNode = point(branchLeftX, bottom);
      pushWire(bottomRailLeft, dropNode);
      pushWire(dropNode, start);
    }
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
