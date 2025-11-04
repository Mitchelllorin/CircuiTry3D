import type { PracticeProblem } from "../model/practice";
import type { Orientation, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

type ElementAccumulator = {
  elements: SchematicElement[];
  nextId: (prefix: string) => string;
};

const createAccumulator = (): ElementAccumulator => {
  let counter = 0;
  return {
    elements: [],
    nextId(prefix: string) {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
};

const determineOrientation = (start: Vec2, end: Vec2): Orientation =>
  Math.abs(end.x - start.x) >= Math.abs(end.z - start.z) ? "horizontal" : "vertical";

const pushWire = (acc: ElementAccumulator, path: Vec2[]) => {
  if (path.length < 2) {
    return;
  }
  const wire: WireElement = {
    id: acc.nextId("wire"),
    kind: "wire",
    path,
  };
  acc.elements.push(wire);
};

const pushResistor = (acc: ElementAccumulator, start: Vec2, end: Vec2, label: string) => {
  const resistor: TwoTerminalElement = {
    id: acc.nextId("resistor"),
    kind: "resistor",
    label,
    start,
    end,
    orientation: determineOrientation(start, end),
  };
  acc.elements.push(resistor);
};

const pushBattery = (acc: ElementAccumulator, start: Vec2, end: Vec2, label: string) => {
  const battery: TwoTerminalElement = {
    id: acc.nextId("battery"),
    kind: "battery",
    label,
    start,
    end,
    orientation: determineOrientation(start, end),
  };
  acc.elements.push(battery);
};

const buildSeriesLayout = (acc: ElementAccumulator, problem: PracticeProblem) => {
  const left = -4.4;
  const right = 4.4;
  const top = 2.7;
  const bottom = -2.7;

  const start: Vec2 = { x: left, z: bottom };
  const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
  const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
  const topLeft: Vec2 = { x: left, z: top };
  const topRight: Vec2 = { x: right, z: top };
  const bottomRight: Vec2 = { x: right, z: bottom };

  pushWire(acc, [start, batteryStart]);
  pushBattery(acc, batteryStart, batteryEnd, problem.source.label ?? "V" + problem.source.id);
  pushWire(acc, [batteryEnd, topLeft]);

  const componentCount = Math.max(problem.components.length, 1);
  const segmentWidth = (topRight.x - topLeft.x) / componentCount;
  const margin = Math.min(segmentWidth * 0.2, 0.5);

  let previousPoint = topLeft;
  problem.components.forEach((component, index) => {
    const startX = topLeft.x + index * segmentWidth + margin;
    const endX = topLeft.x + (index + 1) * segmentWidth - margin;
    const resistorStart: Vec2 = { x: startX, z: top };
    const resistorEnd: Vec2 = { x: endX, z: top };
    pushWire(acc, [previousPoint, resistorStart]);
    pushResistor(acc, resistorStart, resistorEnd, component.label ?? component.id);
    previousPoint = resistorEnd;
  });

  pushWire(acc, [previousPoint, topRight]);
  pushWire(acc, [topRight, bottomRight]);
  pushWire(acc, [bottomRight, start]);
};

const buildParallelLayout = (acc: ElementAccumulator, problem: PracticeProblem) => {
  const left = -2.6;
  const right = 3.8;
  const top = 2.5;
  const bottom = -2.5;

  const leftBottom: Vec2 = { x: left, z: bottom };
  const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
  const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
  const leftTop: Vec2 = { x: left, z: top };
  const rightTop: Vec2 = { x: right, z: top };
  const rightBottom: Vec2 = { x: right, z: bottom };

  pushWire(acc, [leftBottom, batteryStart]);
  pushBattery(acc, batteryStart, batteryEnd, problem.source.label ?? "V" + problem.source.id);
  pushWire(acc, [batteryEnd, leftTop]);
  pushWire(acc, [leftTop, rightTop]);
  pushWire(acc, [leftBottom, rightBottom]);

  const branchCount = Math.max(problem.components.length, 1);
  const spacing = (right - left) / (branchCount + 1);
  const branchSpan = Math.min(Math.abs(top - bottom) - 1, 4.2);
  const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, 0.6);

  problem.components.forEach((component, index) => {
    const x = left + spacing * (index + 1);
    const topNode: Vec2 = { x, z: top };
    const bottomNode: Vec2 = { x, z: bottom };
    const resistorStart: Vec2 = { x, z: top - offset };
    const resistorEnd: Vec2 = { x, z: bottom + offset };

    pushWire(acc, [topNode, resistorStart]);
    pushResistor(acc, resistorStart, resistorEnd, component.label ?? component.id);
    pushWire(acc, [resistorEnd, bottomNode]);
  });
};

const buildCombinationLayout = (acc: ElementAccumulator, problem: PracticeProblem) => {
  const start: Vec2 = { x: -4.2, z: -2.3 };
  const batteryStart: Vec2 = { x: -4.2, z: -1.5 };
  const batteryEnd: Vec2 = { x: -4.2, z: 1.5 };
  const topLeft: Vec2 = { x: -4.2, z: 2.3 };
  const topMid: Vec2 = { x: -1.2, z: 2.3 };
  const branchTop: Vec2 = { x: 1.4, z: 2.3 };
  const branchRightTop: Vec2 = { x: 3.2, z: 2.3 };
  const branchBottom: Vec2 = { x: 1.4, z: -0.3 };
  const branchRightBottom: Vec2 = { x: 3.2, z: -0.3 };
  const dropNode: Vec2 = { x: 1.4, z: -2.3 };
  const bottomLeft: Vec2 = { x: -2.0, z: -2.3 };

  const labelFor = (id: string) => problem.components.find((component) => component.id === id)?.label ?? id;

  pushWire(acc, [start, batteryStart]);
  pushBattery(acc, batteryStart, batteryEnd, problem.source.label ?? "V" + problem.source.id);
  pushWire(acc, [batteryEnd, topLeft]);
  pushWire(acc, [topLeft, topMid]);

  const r1Start = topMid;
  const r1End: Vec2 = { x: 0.4, z: 2.3 };
  pushResistor(acc, r1Start, r1End, labelFor("R1"));

  pushWire(acc, [r1End, branchTop]);

  const r2Start: Vec2 = { x: branchTop.x, z: branchTop.z };
  const r2End: Vec2 = { x: branchBottom.x, z: branchBottom.z };
  pushResistor(acc, r2Start, r2End, labelFor("R2"));

  pushWire(acc, [branchTop, branchRightTop]);

  const r3Start: Vec2 = { x: branchRightTop.x, z: branchRightTop.z };
  const r3End: Vec2 = { x: branchRightBottom.x, z: branchRightBottom.z };
  pushResistor(acc, r3Start, r3End, labelFor("R3"));

  pushWire(acc, [branchRightBottom, branchBottom]);
  pushWire(acc, [branchBottom, dropNode]);

  const r4Start: Vec2 = { x: dropNode.x, z: dropNode.z };
  const r4End: Vec2 = { x: bottomLeft.x, z: bottomLeft.z };
  pushResistor(acc, r4Start, r4End, labelFor("R4"));

  pushWire(acc, [r4End, start]);
};

export const buildPracticePresetElements = (problem: PracticeProblem): SchematicElement[] => {
  const acc = createAccumulator();
  const presetKey = problem.presetHint ?? problem.topology;

  switch (presetKey) {
    case "parallel_basic":
      buildParallelLayout(acc, problem);
      break;
    case "mixed_circuit":
      buildCombinationLayout(acc, problem);
      break;
    case "series_basic":
    default:
      if (problem.topology === "parallel") {
        buildParallelLayout(acc, problem);
      } else if (problem.topology === "combination") {
        buildCombinationLayout(acc, problem);
      } else {
        buildSeriesLayout(acc, problem);
      }
      break;
  }

  return acc.elements;
};
