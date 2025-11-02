import type { PracticeProblem } from "../../model/practice";

type DiagramProps = {
  problem: PracticeProblem;
};

const WIRE_COLOR = "rgba(162, 212, 255, 0.9)";
const COMPONENT_FILL = "rgba(26, 54, 96, 0.6)";
const COMPONENT_STROKE = "rgba(148, 208, 255, 0.9)";
const LABEL_COLOR = "#d6ecff";

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

const drawBattery = (x: number, y: number) => (
  <g transform={`translate(${x}, ${y})`}>
    <line x1={0} y1={-18} x2={0} y2={18} stroke={WIRE_COLOR} strokeWidth={3} />
    <line x1={14} y1={-28} x2={14} y2={28} stroke={WIRE_COLOR} strokeWidth={5} />
  </g>
);

type ResistorOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  orientation: "horizontal" | "vertical";
};

const drawResistor = ({ x, y, width, height, label, orientation }: ResistorOptions) => {
  const rx = orientation === "horizontal" ? 8 : 10;
  const ry = orientation === "horizontal" ? 10 : 8;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={rx}
        ry={ry}
        fill={COMPONENT_FILL}
        stroke={COMPONENT_STROKE}
        strokeWidth={2}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fontSize={orientation === "horizontal" ? 16 : 14}
        fill={LABEL_COLOR}
        fontWeight={600}
      >
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
      <rect x={60} y={60} width={240} height={140} fill="none" stroke={WIRE_COLOR} strokeWidth={4} />
      {drawBattery(50, 130)}
      <line x1={36} y1={130} x2={60} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={300} y1={130} x2={324} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({ x: 180, y: 52, width: 120, height: 26, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 312, y: 130, width: 26, height: 110, label: labels.R2, orientation: "vertical" })}
      {drawResistor({ x: 180, y: 208, width: 120, height: 26, label: labels.R3, orientation: "horizontal" })}
      {drawResistor({ x: 48, y: 130, width: 26, height: 110, label: labels.R4, orientation: "vertical" })}
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
      <rect x={80} y={50} width={200} height={160} fill="none" stroke={WIRE_COLOR} strokeWidth={4} />
      {drawBattery(70, 130)}
      <line x1={46} y1={130} x2={80} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={280} y1={130} x2={314} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={180} y1={50} x2={180} y2={70} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={180} y1={210} x2={180} y2={230} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({ x: 180, y: 82, width: 200, height: 24, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 180, y: 128, width: 200, height: 24, label: labels.R2, orientation: "horizontal" })}
      {drawResistor({ x: 180, y: 174, width: 200, height: 24, label: labels.R3, orientation: "horizontal" })}
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
      <rect x={70} y={56} width={220} height={148} fill="none" stroke={WIRE_COLOR} strokeWidth={4} />
      {drawBattery(60, 130)}
      <line x1={36} y1={130} x2={70} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={290} y1={130} x2={324} y2={130} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({ x: 180, y: 52, width: 160, height: 26, label: labels.R1, orientation: "horizontal" })}
      {drawResistor({ x: 290, y: 110, width: 26, height: 60, label: labels.R2, orientation: "vertical" })}
      {drawResistor({ x: 290, y: 170, width: 26, height: 60, label: labels.R3, orientation: "vertical" })}
      <line x1={250} y1={110} x2={290} y2={110} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={250} y1={170} x2={290} y2={170} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={250} y1={110} x2={250} y2={170} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({ x: 180, y: 208, width: 160, height: 26, label: labels.R4, orientation: "horizontal" })}
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

