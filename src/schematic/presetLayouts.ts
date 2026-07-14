import type { PracticeProblem } from "../model/practice";
import { orientationBetween } from "./geometry";
import type { SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

type ElementAccumulator = {
  elements: SchematicElement[];
  counter: number;
};

const createAccumulator = (): ElementAccumulator => ({ elements: [], counter: 0 });

const nextId = (acc: ElementAccumulator, prefix: string) => {
  acc.counter += 1;
  return `${prefix}-${acc.counter.toString(16)}`;
};

const addWire = (acc: ElementAccumulator, start: Vec2, end: Vec2) => {
  const id = nextId(acc, "wire");
  const wire: WireElement = {
    id,
    kind: "wire",
    path: [start, end]
  };
  acc.elements.push(wire);
};

const addTwoTerminal = (
  acc: ElementAccumulator,
  kind: TwoTerminalElement["kind"],
  start: Vec2,
  end: Vec2,
  label: string
) => {
  const id = nextId(acc, kind);
  const element: TwoTerminalElement = {
    id,
    kind,
    label,
    start,
    end,
    orientation: orientationBetween(start, end)
  };
  acc.elements.push(element);
};

const buildSeriesLayout = (acc: ElementAccumulator, problem: PracticeProblem) => {
  const left = -4.4;
  const right = 4.4;
  const top = 2.7;
  const bottom = -2.7;

  const sourceLabel = problem.source.label ?? "Source";

  const start: Vec2 = { x: left, z: bottom };
  const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
  const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
  const topLeft: Vec2 = { x: left, z: top };
  const topRight: Vec2 = { x: right, z: top };
  const bottomRight: Vec2 = { x: right, z: bottom };

  addWire(acc, start, batteryStart);
  addTwoTerminal(acc, "battery", batteryStart, batteryEnd, sourceLabel);
  addWire(acc, batteryEnd, topLeft);

  const componentCount = Math.max(problem.components.length, 1);
  const segmentWidth = (topRight.x - topLeft.x) / componentCount;
  const margin = Math.min(segmentWidth * 0.2, 0.5);

  let previousPoint = topLeft;
  problem.components.forEach((component, index) => {
    const startX = topLeft.x + index * segmentWidth + margin;
    const endX = topLeft.x + (index + 1) * segmentWidth - margin;
    const resistorStart: Vec2 = { x: startX, z: top };
    const resistorEnd: Vec2 = { x: endX, z: top };
    addWire(acc, previousPoint, resistorStart);
    addTwoTerminal(acc, component.role === "source" ? "battery" : "resistor", resistorStart, resistorEnd, component.label ?? component.id);
    previousPoint = resistorEnd;
  });

  addWire(acc, previousPoint, topRight);
  addWire(acc, topRight, bottomRight);
  addWire(acc, bottomRight, start);
};

const buildParallelLayout = (acc: ElementAccumulator, problem: PracticeProblem) => {
  const left = -2.6;
  const right = 3.8;
  const top = 2.5;
  const bottom = -2.5;

  const sourceLabel = problem.source.label ?? "Source";

  const leftBottom: Vec2 = { x: left, z: bottom };
  const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
  const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
  const leftTop: Vec2 = { x: left, z: top };
  const rightTop: Vec2 = { x: right, z: top };
  const rightBottom: Vec2 = { x: right, z: bottom };

  addWire(acc, leftBottom, batteryStart);
  addTwoTerminal(acc, "battery", batteryStart, batteryEnd, sourceLabel);
  addWire(acc, batteryEnd, leftTop);
  addWire(acc, leftTop, rightTop);
  addWire(acc, leftBottom, rightBottom);

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
    addWire(acc, topNode, resistorStart);
    addTwoTerminal(acc, "resistor", resistorStart, resistorEnd, component.label ?? component.id);
    addWire(acc, resistorEnd, bottomNode);
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
  const sourceLabel = problem.source.label ?? "Source";

  addWire(acc, start, batteryStart);
  addTwoTerminal(acc, "battery", batteryStart, batteryEnd, sourceLabel);
  addWire(acc, batteryEnd, topLeft);
  addWire(acc, topLeft, topMid);

  const r1Start: Vec2 = topMid;
  const r1End: Vec2 = { x: 0.4, z: 2.3 };
  addTwoTerminal(acc, "resistor", r1Start, r1End, labelFor("R1"));
  addWire(acc, r1End, branchTop);

  const r2Start: Vec2 = { x: branchTop.x, z: branchTop.z };
  const r2End: Vec2 = { x: branchBottom.x, z: branchBottom.z };
  addTwoTerminal(acc, "resistor", r2Start, r2End, labelFor("R2"));

  addWire(acc, branchTop, branchRightTop);

  const r3Start: Vec2 = { x: branchRightTop.x, z: branchRightTop.z };
  const r3End: Vec2 = { x: branchRightBottom.x, z: branchRightBottom.z };
  addTwoTerminal(acc, "resistor", r3Start, r3End, labelFor("R3"));

  addWire(acc, branchRightBottom, branchBottom);
  addWire(acc, branchBottom, dropNode);

  const r4Start: Vec2 = { x: dropNode.x, z: dropNode.z };
  const r4End: Vec2 = { x: bottomLeft.x, z: bottomLeft.z };
  addTwoTerminal(acc, "resistor", r4Start, r4End, labelFor("R4"));

  addWire(acc, r4End, start);
};

export const createPresetElements = (problem: PracticeProblem): SchematicElement[] => {
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

