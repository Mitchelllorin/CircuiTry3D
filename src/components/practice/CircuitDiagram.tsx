import type { PracticeProblem } from "../../model/practice";

type DiagramProps = {
  problem: PracticeProblem;
};

const WIRE_COLOR = "rgba(148, 208, 255, 0.9)";
const LABEL_COLOR = "#d6ecff";
const RESISTOR_STROKE = "rgba(220, 244, 255, 0.96)";
const RESISTOR_GLOW = "rgba(116, 196, 255, 0.42)";
const BATTERY_POSITIVE_STROKE = "rgba(232, 246, 255, 0.96)";
const BATTERY_NEGATIVE_STROKE = "rgba(108, 186, 255, 0.92)";
const BATTERY_HIGHLIGHT = "rgba(255, 255, 255, 0.45)";
const WIRE_STROKE_WIDTH = 4;

const getComponentLabel = (problem: PracticeProblem, componentId: string) => {
  if (componentId === "totals") {
    return "Totals";
  }

  if (componentId === problem.source.id) {
    return problem.source.label ?? problem.source.id;
  }

  const match = problem.components.find((component) => component.id === componentId);
  return match?.label ?? componentId;
};

type BatteryOptions = {
  x: number;
  y: number;
  orientation: "horizontal" | "vertical";
  length?: number;
};

const drawBattery = ({ x, y, orientation, length = 80 }: BatteryOptions) => {
  const plateGap = length * 0.36;
  const halfGap = plateGap / 2;
  const leadLength = (length - plateGap) / 2;
  const plateThickness = 4.5;
  const positiveSpan = orientation === "vertical" ? 46 : 46;
  const negativeSpan = positiveSpan * 0.62;

  if (orientation === "vertical") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <line
          x1={0}
          y1={-length / 2}
          x2={0}
          y2={-halfGap - leadLength * 0.1}
          stroke={WIRE_COLOR}
          strokeWidth={WIRE_STROKE_WIDTH}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={halfGap + leadLength * 0.1}
          x2={0}
          y2={length / 2}
          stroke={WIRE_COLOR}
          strokeWidth={WIRE_STROKE_WIDTH}
          strokeLinecap="round"
        />
        <line
          x1={-positiveSpan / 2}
          y1={-halfGap}
          x2={positiveSpan / 2}
          y2={-halfGap}
          stroke={BATTERY_POSITIVE_STROKE}
          strokeWidth={plateThickness}
          strokeLinecap="round"
        />
        <line
          x1={-negativeSpan / 2}
          y1={halfGap}
          x2={negativeSpan / 2}
          y2={halfGap}
          stroke={BATTERY_NEGATIVE_STROKE}
          strokeWidth={plateThickness * 0.88}
          strokeLinecap="round"
        />
        <line
          x1={-positiveSpan / 2}
          y1={-halfGap - plateThickness * 0.4}
          x2={positiveSpan / 2}
          y2={-halfGap - plateThickness * 0.4}
          stroke={BATTERY_HIGHLIGHT}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <line
        x1={-length / 2}
        y1={0}
        x2={-halfGap - leadLength * 0.1}
        y2={0}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={halfGap + leadLength * 0.1}
        y1={0}
        x2={length / 2}
        y2={0}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={-halfGap}
        y1={-positiveSpan / 2}
        x2={-halfGap}
        y2={positiveSpan / 2}
        stroke={BATTERY_POSITIVE_STROKE}
        strokeWidth={plateThickness}
        strokeLinecap="round"
      />
      <line
        x1={halfGap}
        y1={-negativeSpan / 2}
        x2={halfGap}
        y2={negativeSpan / 2}
        stroke={BATTERY_NEGATIVE_STROKE}
        strokeWidth={plateThickness * 0.88}
        strokeLinecap="round"
      />
      <line
        x1={-halfGap - plateThickness * 0.4}
        y1={-positiveSpan / 2}
        x2={-halfGap - plateThickness * 0.4}
        y2={positiveSpan / 2}
        stroke={BATTERY_HIGHLIGHT}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </g>
  );
};

type ResistorOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  orientation: "horizontal" | "vertical";
  labelPosition?: "above" | "below" | "left" | "right";
};

const drawResistor = ({ x, y, width, height, label, orientation, labelPosition }: ResistorOptions) => {
  const length = orientation === "horizontal" ? width : height;
  const thickness = orientation === "horizontal" ? height : width;
  const amplitude = Math.max(thickness * 0.42, 8);
  const lead = Math.min(length * 0.18, 22);
  const segments = 6;
  const segmentLength = (length - 2 * lead) / segments;

  const pathSegments: string[] = [];

  if (orientation === "horizontal") {
    const half = width / 2;
    const start = -half;
    pathSegments.push(`M ${start} 0`);
    pathSegments.push(`L ${start + lead} 0`);

    let currentX = start + lead;
    for (let i = 0; i < segments; i += 1) {
      currentX += segmentLength;
      const yOffset = i % 2 === 0 ? -amplitude : amplitude;
      pathSegments.push(`L ${currentX} ${yOffset}`);
    }

    pathSegments.push(`L ${half - lead} 0`);
    pathSegments.push(`L ${half} 0`);
  } else {
    const half = height / 2;
    const start = -half;
    pathSegments.push(`M 0 ${start}`);
    pathSegments.push(`L 0 ${start + lead}`);

    let currentY = start + lead;
    for (let i = 0; i < segments; i += 1) {
      currentY += segmentLength;
      const xOffset = i % 2 === 0 ? amplitude : -amplitude;
      pathSegments.push(`L ${xOffset} ${currentY}`);
    }

    pathSegments.push(`L 0 ${half - lead}`);
    pathSegments.push(`L 0 ${half}`);
  }

  const pathD = pathSegments.join(" ");

  let labelX = 0;
  let labelY = 0;
  let anchor: "start" | "middle" | "end" = "middle";

  if (orientation === "horizontal") {
    const offset = height / 2 + 16;
    if (labelPosition === "below") {
      labelY = offset;
    } else {
      labelY = -offset;
    }
    anchor = "middle";
  } else {
    const offset = width / 2 + 20;
    if (labelPosition === "left") {
      labelX = -offset;
      anchor = "end";
    } else {
      labelX = offset;
      anchor = "start";
    }
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d={pathD}
        stroke={RESISTOR_GLOW}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.4}
      />
      <path d={pathD} stroke={RESISTOR_STROKE} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x={labelX} y={labelY} textAnchor={anchor} fontSize={13} fill={LABEL_COLOR} fontWeight={600} dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
};

const SeriesSquareDiagram = ({ problem }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
    R4: getComponentLabel(problem, "R4"),
  };

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Series square circuit">
      <rect x={60} y={60} width={240} height={140} fill="none" stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} />
      {drawBattery({ x: 45, y: 130, orientation: "horizontal", length: 30 })}
      <line
        x1={12}
        y1={130}
        x2={30}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={300}
        y1={130}
        x2={324}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      {drawResistor({ x: 180, y: 60, width: 120, height: 26, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 300, y: 130, width: 26, height: 110, label: labels.R2, orientation: "vertical" })}
      {drawResistor({ x: 180, y: 200, width: 120, height: 26, label: labels.R3, orientation: "horizontal", labelPosition: "below" })}
      {drawResistor({ x: 60, y: 130, width: 26, height: 110, label: labels.R4, orientation: "vertical", labelPosition: "left" })}
      <text x={36} y={116} fill={LABEL_COLOR} fontSize={13} textAnchor="start">
        {problem.source.label ?? "Source"}
      </text>
    </svg>
  );
};

const ParallelSquareDiagram = ({ problem }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
  };

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Parallel square circuit">
      <rect x={80} y={50} width={200} height={160} fill="none" stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} />
      {drawBattery({ x: 62, y: 130, orientation: "horizontal", length: 36 })}
      <line
        x1={24}
        y1={130}
        x2={44}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={280}
        y1={130}
        x2={314}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={180}
        y1={50}
        x2={180}
        y2={70}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={180}
        y1={210}
        x2={180}
        y2={230}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      {drawResistor({ x: 180, y: 82, width: 200, height: 24, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 180, y: 128, width: 200, height: 24, label: labels.R2, orientation: "horizontal", labelPosition: "below" })}
      {drawResistor({ x: 180, y: 174, width: 200, height: 24, label: labels.R3, orientation: "horizontal", labelPosition: "below" })}
      <text x={46} y={116} fill={LABEL_COLOR} fontSize={13} textAnchor="start">
        {problem.source.label ?? "Source"}
      </text>
    </svg>
  );
};

const CombinationSquareDiagram = ({ problem }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
    R4: getComponentLabel(problem, "R4"),
  };

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Combination ladder circuit">
      <rect x={70} y={56} width={220} height={148} fill="none" stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} />
      {drawBattery({ x: 52, y: 130, orientation: "horizontal", length: 36 })}
      <line
        x1={36}
        y1={130}
        x2={52}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={290}
        y1={130}
        x2={324}
        y2={130}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      {drawResistor({ x: 180, y: 56, width: 160, height: 26, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 290, y: 110, width: 26, height: 60, label: labels.R2, orientation: "vertical" })}
      {drawResistor({ x: 290, y: 170, width: 26, height: 60, label: labels.R3, orientation: "vertical" })}
      <line
        x1={250}
        y1={110}
        x2={290}
        y2={110}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={250}
        y1={170}
        x2={290}
        y2={170}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <line
        x1={250}
        y1={110}
        x2={250}
        y2={170}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      {drawResistor({ x: 180, y: 204, width: 160, height: 26, label: labels.R4, orientation: "horizontal", labelPosition: "below" })}
      <text x={36} y={116} fill={LABEL_COLOR} fontSize={13} textAnchor="start">
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

  if (problem.diagram === "seriesSquare") {
    content = <SeriesSquareDiagram problem={problem} />;
  } else if (problem.diagram === "parallelSquare") {
    content = <ParallelSquareDiagram problem={problem} />;
  } else if (problem.diagram === "comboSquare") {
    content = <CombinationSquareDiagram problem={problem} />;
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

