import type { PracticeProblem } from "../../model/practice";

type DiagramProps = {
  problem: PracticeProblem;
};

type Point = {
  x: number;
  y: number;
};

const WIRE_COLOR = "rgba(162, 212, 255, 0.9)";
const COMPONENT_STROKE = "rgba(148, 208, 255, 0.9)";
const LABEL_COLOR = "#d6ecff";
const NODE_FILL = "rgba(162, 212, 255, 0.95)";
const NODE_STROKE = "rgba(12, 32, 64, 0.9)";
const WIRE_STROKE_WIDTH = 4;
const NODE_RADIUS = 4.2;
const RESISTOR_SEGMENTS = 6;
const RESISTOR_AMPLITUDE = 10;

const getComponentLabel = (problem: PracticeProblem, componentId: string) => {
  if (componentId === "totals") {
    return "Circuit Totals";
  }

  if (componentId === problem.source.id) {
    return problem.source.label ?? problem.source.id;
  }

  const match = problem.components.find((component) => component.id === componentId);
  return match?.label ?? componentId;
};

const drawBattery = (x: number, y: number) => (
  <g transform={`translate(${x}, ${y})`}>
    <line x1={-20} y1={-6} x2={20} y2={-6} stroke={WIRE_COLOR} strokeWidth={3} strokeLinecap="round" />
    <line x1={-28} y1={8} x2={28} y2={8} stroke={WIRE_COLOR} strokeWidth={5} strokeLinecap="round" />
    <text x={-24} y={-12} fill={LABEL_COLOR} fontSize={12} textAnchor="middle">
      -
    </text>
    <text x={24} y={-12} fill={LABEL_COLOR} fontSize={12} textAnchor="middle">
      +
    </text>
  </g>
);

const drawNode = ({ x, y }: Point, key?: string) => (
  <circle
    key={key}
    cx={x}
    cy={y}
    r={NODE_RADIUS}
    fill={NODE_FILL}
    stroke={NODE_STROKE}
    strokeWidth={1.4}
  />
);

type ResistorSymbolOptions = {
  start: Point;
  end: Point;
  orientation: "horizontal" | "vertical";
  label: string;
  key?: string;
  labelOffset?: number;
  labelSide?: "left" | "right";
};

const drawResistor = ({ start, end, orientation, label, key, labelOffset, labelSide }: ResistorSymbolOptions) => {
  const points: string[] = [];

  if (orientation === "horizontal") {
    const length = end.x - start.x;
    const step = length / RESISTOR_SEGMENTS;
    for (let i = 0; i <= RESISTOR_SEGMENTS; i += 1) {
      const x = start.x + step * i;
      let y = start.y;
      if (i > 0 && i < RESISTOR_SEGMENTS) {
        y += i % 2 === 0 ? -RESISTOR_AMPLITUDE : RESISTOR_AMPLITUDE;
      }
      points.push(`${x},${y}`);
    }
  } else {
    const length = end.y - start.y;
    const step = length / RESISTOR_SEGMENTS;
    for (let i = 0; i <= RESISTOR_SEGMENTS; i += 1) {
      const y = start.y + step * i;
      let x = start.x;
      if (i > 0 && i < RESISTOR_SEGMENTS) {
        x += i % 2 === 0 ? RESISTOR_AMPLITUDE : -RESISTOR_AMPLITUDE;
      }
      points.push(`${x},${y}`);
    }
  }

  let labelX: number;
  let labelY: number;
  let textAnchor: "start" | "end" | "middle";

  if (orientation === "horizontal") {
    labelX = (start.x + end.x) / 2;
    labelY = (start.y + end.y) / 2 + (labelOffset ?? -18);
    textAnchor = "middle";
  } else {
    const horizontalOffset = 22;
    const side = labelSide ?? "right";
    labelX = (start.x + end.x) / 2 + (side === "left" ? -horizontalOffset : horizontalOffset);
    labelY = (start.y + end.y) / 2 + (labelOffset ?? 0);
    textAnchor = side === "left" ? "end" : "start";
  }

  return (
    <g key={key}>
      <polyline
        points={points.join(" ")}
        stroke={COMPONENT_STROKE}
        strokeWidth={3.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={labelX} y={labelY} textAnchor={textAnchor} fill={LABEL_COLOR} fontSize={13} fontWeight={600}>
        {label}
      </text>
    </g>
  );
};

const SeriesRectDiagram = ({ problem }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
  };

    const batteryX = 180;
    const batteryY = 220;
    const batteryLeftX = batteryX - 34;
    const batteryRightX = batteryX + 34;

    const leftX = 80;
    const rightX = 280;
    const topY = 70;
    const bottomY = batteryY;
    const lead = 26;

    const r1Start: Point = { x: leftX + lead, y: topY };
    const r1End: Point = { x: rightX - lead, y: topY };
    const r2Start: Point = { x: rightX, y: topY + lead };
    const r2End: Point = { x: rightX, y: bottomY - lead };
    const r3Start: Point = { x: rightX - lead, y: bottomY };
    const r3End: Point = { x: batteryRightX + 6, y: bottomY };

    const topLeft: Point = { x: leftX, y: topY };
    const topRight: Point = { x: rightX, y: topY };
    const bottomRight: Point = { x: rightX, y: bottomY };

    return (
      <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Series circuit diagram">
        {/* Top run */}
        <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-R1",
          start: r1Start,
          end: r1End,
          label: labels.R1,
          orientation: "horizontal",
        })}
        <line x1={r1End.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {/* Right run */}
        <line x1={rightX} y1={topY} x2={rightX} y2={r2Start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-R2",
          start: r2Start,
          end: r2End,
          label: labels.R2,
          orientation: "vertical",
          labelSide: "right",
        })}
        <line x1={rightX} y1={r2End.y} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {/* Bottom run with R3 and battery in series */}
        <line x1={rightX} y1={bottomY} x2={r3Start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-R3",
          start: r3Start,
          end: r3End,
          label: labels.R3,
          orientation: "horizontal",
          labelOffset: 20,
        })}
        <line x1={r3End.x} y1={bottomY} x2={batteryRightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawBattery(batteryX, batteryY)}
        <line x1={batteryLeftX} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {/* Left return */}
        <line x1={leftX} y1={bottomY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {drawNode(topLeft, "series-node-tl")}
        {drawNode(topRight, "series-node-tr")}
        {drawNode(bottomRight, "series-node-br")}
        {drawNode({ x: leftX, y: bottomY }, "series-node-bl")}

        <text x={batteryX} y={bottomY + 26} fill={LABEL_COLOR} fontSize={13} textAnchor="middle">
          {problem.source.label ?? "Source"}
        </text>
      </svg>
    );
};

const ParallelRectDiagram = ({ problem }: DiagramProps) => {
  const branchIds = ["R1", "R2", "R3"] as const;
  const labels: Record<(typeof branchIds)[number], string> = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
  };

    const batteryX = 60;
    const batteryY = 150;
    const positiveX = batteryX + 8;
    const negativeX = batteryX - 6;
    const positiveTopY = batteryY - 34;
    const negativeBottomY = batteryY + 32;
    const topY = 82;
    const bottomY = 202;
    const rightX = 320;

    const branchStart = positiveX + 58;
    const branchSpacing = 70;
    const branchXs = branchIds.map((_, index) => branchStart + index * branchSpacing);

    const branchResTop = topY + 26;
    const branchResBottom = bottomY - 26;

    return (
      <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Parallel circuit diagram">
        {drawBattery(batteryX, batteryY)}
        <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={positiveX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {branchXs.map((x, index) => {
          const id = branchIds[index];
          const start: Point = { x, y: branchResTop };
          const end: Point = { x, y: branchResBottom };
          return (
            <g key={`parallel-branch-${id}`}>
              <line x1={x} y1={topY} x2={x} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              {drawResistor({
                key: `parallel-resistor-${id}`,
                start,
                end,
                label: labels[id],
                orientation: "vertical",
              })}
              <line x1={x} y1={end.y} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              {drawNode({ x, y: topY }, `parallel-node-top-${id}`)}
              {drawNode({ x, y: bottomY }, `parallel-node-bottom-${id}`)}
            </g>
          );
        })}

        {drawNode({ x: positiveX, y: topY }, "parallel-node-source-top")}
        {drawNode({ x: positiveX, y: bottomY }, "parallel-node-source-bottom")}
        {drawNode({ x: rightX, y: topY }, "parallel-node-right-top")}
        {drawNode({ x: rightX, y: bottomY }, "parallel-node-right-bottom")}

        <text x={positiveX - 16} y={positiveTopY - 10} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
          {problem.source.label ?? "Source"}
        </text>
      </svg>
    );
};

const CombinationRectDiagram = ({ problem }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
    R4: getComponentLabel(problem, "R4"),
  };

    const batteryX = 60;
    const batteryY = 150;
    const positiveX = batteryX + 8;
    const negativeX = batteryX - 6;
    const positiveTopY = batteryY - 34;
    const negativeBottomY = batteryY + 32;
    const topY = 82;
    const bottomY = 202;
    const branchX = 270;

    const r1Start: Point = { x: positiveX + 54, y: topY };
    const r1End: Point = { x: branchX - 20, y: topY };

    const branchOrder = ["R2", "R3"] as const;
    const branchOffsets: Record<(typeof branchOrder)[number], number> = {
      R2: -32,
      R3: 32,
    };
    const branchResTop = topY + 28;
    const branchResBottom = bottomY - 32;

    const r4Start: Point = { x: negativeX + 48, y: bottomY };
    const r4End: Point = { x: branchX - 18, y: bottomY };

    return (
      <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Combination circuit diagram">
        {drawBattery(batteryX, batteryY)}
        <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={positiveX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "combo-R1",
          start: r1Start,
          end: r1End,
          label: labels.R1,
          orientation: "horizontal",
        })}
        <line x1={r1End.x} y1={topY} x2={branchX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {branchOrder.map((id) => {
          const offset = branchOffsets[id];
          const branchXPos = branchX + offset;
          const start: Point = { x: branchXPos, y: branchResTop };
          const end: Point = { x: branchXPos, y: branchResBottom };
          return (
            <g key={`combo-branch-${id}`}>
              <line x1={branchX} y1={topY} x2={branchXPos} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              <line x1={branchXPos} y1={topY} x2={branchXPos} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              {drawResistor({
                key: `combo-resistor-${id}`,
                start,
                end,
                label: labels[id],
                orientation: "vertical",
                labelSide: id === "R2" ? "left" : "right",
              })}
              <line x1={branchXPos} y1={end.y} x2={branchXPos} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              <line x1={branchXPos} y1={bottomY} x2={branchX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
              {drawNode({ x: branchXPos, y: topY }, `combo-node-top-${id}`)}
              {drawNode({ x: branchXPos, y: bottomY }, `combo-node-bottom-${id}`)}
            </g>
          );
        })}

        <line x1={branchX} y1={bottomY} x2={r4End.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "combo-R4",
          start: r4Start,
          end: r4End,
          label: labels.R4,
          orientation: "horizontal",
          labelOffset: 20,
        })}
        <line x1={negativeX} y1={bottomY} x2={r4Start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {drawNode({ x: positiveX, y: topY }, "combo-node-source-top")}
        {drawNode({ x: positiveX, y: bottomY }, "combo-node-source-bottom")}
        {drawNode({ x: branchX, y: topY }, "combo-node-branch-top")}
        {drawNode({ x: branchX, y: bottomY }, "combo-node-branch-bottom")}

        <text x={positiveX - 16} y={positiveTopY - 10} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
          {problem.source.label ?? "Source"}
        </text>
      </svg>
    );
};

export default function CircuitDiagram({ problem }: DiagramProps) {
  if (!problem.diagram) {
    return null;
  }

  let content: JSX.Element | null = null;

  if (problem.diagram === "seriesRect") {
    content = <SeriesRectDiagram problem={problem} />;
  } else if (problem.diagram === "parallelRect") {
    content = <ParallelRectDiagram problem={problem} />;
  } else if (problem.diagram === "comboRect") {
    content = <CombinationRectDiagram problem={problem} />;
  }

  if (!content) {
    return null;
  }

  return (
    <div className="diagram-card" aria-label="Circuit schematic">
      <div className="diagram-card-header">
        <strong>Worksheet Circuit</strong>
        <span>{problem.title}</span>
      </div>
      {content}
    </div>
  );
}

