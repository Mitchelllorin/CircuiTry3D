import type { PracticeProblem } from "../model/practice";
import { SymbolStandard } from "./standards";
import { buildElement, buildNodeMesh } from "./threeFactory";
import { Orientation, SchematicElement, TwoTerminalElement, Vec2 } from "./types";

const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

export function buildPracticeCircuit(three: any, problem: PracticeProblem, standard: SymbolStandard) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

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

  const sourceLabel = problem.source.label ?? "Source";
  const componentLabels = new Map(problem.components.map((component) => [component.id, component.label ?? component.id]));
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
    const segmentWidth = (topRight.x - topLeft.x) / count;
    const margin = Math.min(segmentWidth * 0.2, 0.5);

    let previous = topLeft;
    problem.components.forEach((component, index) => {
      const startX = topLeft.x + index * segmentWidth + margin;
      const endX = topLeft.x + (index + 1) * segmentWidth - margin;
      const resistorStart = point(startX, top);
      const resistorEnd = point(endX, top);
      pushWire(previous, resistorStart);
      pushResistor(component.label ?? component.id, resistorStart, resistorEnd);
      previous = resistorEnd;
    });

    pushWire(previous, topRight);
    pushWire(topRight, bottomRight);
    pushWire(bottomRight, start);
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
      pushResistor(component.label ?? component.id, resistorStart, resistorEnd);
      pushWire(resistorEnd, bottomNode);
    });
  };

  const buildCombination = () => {
    const start = point(-4.2, -2.3);
    const batteryStart = point(-4.2, -1.5);
    const batteryEnd = point(-4.2, 1.5);
    const topLeft = point(-4.2, 2.3);
    const topMid = point(-1.2, 2.3);
    const seriesTop = point(0.4, 2.3);
    const branchTop = point(1.4, 2.3);
    const branchRightTop = point(3.2, 2.3);
    const branchBottom = point(1.4, -0.3);
    const branchRightBottom = point(3.2, -0.3);
    const dropNode = point(1.4, -2.3);
    const bottomLeft = point(-2.0, -2.3);

    pushWire(start, batteryStart);
    pushBattery(batteryStart, batteryEnd, sourceLabel);
    pushWire(batteryEnd, topLeft);
    pushWire(topLeft, topMid);

    pushResistor(labelFor("R1"), topMid, seriesTop);
    pushWire(seriesTop, branchTop);

    pushResistor(labelFor("R2"), branchTop, branchBottom);
    pushWire(branchTop, branchRightTop);

    pushResistor(labelFor("R3"), branchRightTop, branchRightBottom);
    pushWire(branchRightBottom, branchBottom);
    pushWire(branchBottom, dropNode);

    pushResistor(labelFor("R4"), dropNode, bottomLeft);
    pushWire(bottomLeft, start);
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

  return group;
}
