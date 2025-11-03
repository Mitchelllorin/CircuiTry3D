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
  key?: string;
};

const drawResistor = ({ x, y, width, height, label, orientation, key }: ResistorOptions) => {
  const rx = orientation === "horizontal" ? 8 : 10;
  const ry = orientation === "horizontal" ? 10 : 8;

  return (
    <g key={key} transform={`translate(${x}, ${y})`}>
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

const SeriesRectDiagram = ({ problem }: DiagramProps) => {
  const resistorIds = ["R1", "R2", "R3", "R4"] as const;
  const labels: Record<(typeof resistorIds)[number], string> = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
    R4: getComponentLabel(problem, "R4"),
  };

  const batteryX = 58;
  const batteryY = 150;
  const positiveX = batteryX + 14;
  const positiveTopY = batteryY - 28;
  const negativeX = batteryX;
  const negativeBottomY = batteryY + 18;
  const topY = 70;
  const bottomY = 200;
  const rightX = 320;

  const wireSpan = rightX - positiveX;
  const segmentWidth = wireSpan / resistorIds.length;
  const resistorWidth = Math.min(76, Math.max(48, segmentWidth - 12));
  const resistorHeight = 26;

  const resistorCenters = resistorIds.map((_, index) => positiveX + segmentWidth * (index + 0.5));
  const resistorStarts = resistorCenters.map((center) => center - resistorWidth / 2);
  const resistorEnds = resistorCenters.map((center) => center + resistorWidth / 2);

  const topWireSegments = resistorStarts.map((startX, index) => {
    const prevEnd = index === 0 ? positiveX : resistorEnds[index - 1];
    return (
      <line
        key={`series-wire-${resistorIds[index]}`}
        x1={prevEnd}
        y1={topY}
        x2={startX}
        y2={topY}
        stroke={WIRE_COLOR}
        strokeWidth={4}
      />
    );
  });

  const finalTopWire =
    resistorEnds.length > 0 ? (
      <line
        key="series-wire-end"
        x1={resistorEnds[resistorEnds.length - 1]}
        y1={topY}
        x2={rightX}
        y2={topY}
        stroke={WIRE_COLOR}
        strokeWidth={4}
      />
    ) : null;

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Series rectangular circuit">
      {drawBattery(batteryX, batteryY)}
      <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      {topWireSegments}
      {resistorCenters.map((centerX, index) =>
        drawResistor({
          key: `series-resistor-${resistorIds[index]}`,
          x: centerX,
          y: topY,
          width: resistorWidth,
          height: resistorHeight,
          label: labels[resistorIds[index]],
          orientation: "horizontal",
        })
      )}
      {finalTopWire}
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={rightX} y1={bottomY} x2={negativeX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <text x={positiveX - 12} y={positiveTopY - 12} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
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

  const batteryX = 62;
  const batteryY = 150;
  const positiveX = batteryX + 14;
  const positiveTopY = batteryY - 28;
  const negativeX = batteryX;
  const negativeBottomY = batteryY + 18;
  const topY = 80;
  const bottomY = 200;
  const rightX = 320;

  const branchStart = positiveX + 60;
  const branchSpacing = 70;
  const branchXs = branchIds.map((_, index) => branchStart + index * branchSpacing);

  const resistorHeight = 84;
  const resistorWidth = 28;
  const resistorCenterY = (topY + bottomY) / 2;
  const resistorTopY = resistorCenterY - resistorHeight / 2;
  const resistorBottomY = resistorCenterY + resistorHeight / 2;

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Parallel rectangular circuit">
      {drawBattery(batteryX, batteryY)}
      <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={positiveX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={negativeX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />

      {branchXs.map((x, index) => (
        <g key={`parallel-branch-${branchIds[index]}`}>
          <line x1={x} y1={topY} x2={x} y2={resistorTopY} stroke={WIRE_COLOR} strokeWidth={4} />
          {drawResistor({
            key: `parallel-resistor-${branchIds[index]}`,
            x,
            y: resistorCenterY,
            width: resistorWidth,
            height: resistorHeight,
            label: labels[branchIds[index]],
            orientation: "vertical",
          })}
          <line x1={x} y1={resistorBottomY} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
        </g>
      ))}

      <text x={positiveX - 12} y={positiveTopY - 12} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
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
  const positiveX = batteryX + 14;
  const positiveTopY = batteryY - 28;
  const negativeX = batteryX;
  const negativeBottomY = batteryY + 18;
  const topY = 80;
  const bottomY = 200;
  const branchX = 280;

  const r1Lead = 32;
  const r1Width = 120;
  const r1StartX = positiveX + r1Lead;
  const r1EndX = r1StartX + r1Width;
  const r1CenterX = (r1StartX + r1EndX) / 2;

  const branchOrder = ["R2", "R3"] as const;
  const branchOffsets: Record<(typeof branchOrder)[number], number> = {
    R2: -40,
    R3: 40,
  };
  const branchResWidth = 26;
  const branchResHeight = 90;
  const branchCenterY = (topY + bottomY) / 2;
  const branchResTopY = branchCenterY - branchResHeight / 2;
  const branchResBottomY = branchCenterY + branchResHeight / 2;

  const bottomSpan = branchX - negativeX;
  const r4Width = 120;
  const r4Lead = Math.max(30, (bottomSpan - r4Width) / 2);
  const r4StartX = negativeX + r4Lead;
  const r4EndX = r4StartX + r4Width;
  const r4CenterX = (r4StartX + r4EndX) / 2;

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Combination rectangular circuit">
      {drawBattery(batteryX, batteryY)}
      <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={positiveX} y1={topY} x2={r1StartX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "combo-resistor-R1",
        x: r1CenterX,
        y: topY,
        width: r1Width,
        height: 26,
        label: labels.R1,
        orientation: "horizontal",
      })}
      <line x1={r1EndX} y1={topY} x2={branchX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />

      {branchOrder.map((id) => {
        const offset = branchOffsets[id];
        const x = branchX + offset;
        return (
          <g key={`combo-branch-${id}`}>
            <line x1={branchX} y1={topY} x2={x} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
            <line x1={x} y1={topY} x2={x} y2={branchResTopY} stroke={WIRE_COLOR} strokeWidth={4} />
            {drawResistor({
              key: `combo-resistor-${id}`,
              x,
              y: branchCenterY,
              width: branchResWidth,
              height: branchResHeight,
              label: labels[id],
              orientation: "vertical",
            })}
            <line x1={x} y1={branchResBottomY} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
            <line x1={x} y1={bottomY} x2={branchX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
          </g>
        );
      })}

      <line x1={branchX} y1={bottomY} x2={r4EndX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "combo-resistor-R4",
        x: r4CenterX,
        y: bottomY,
        width: r4Width,
        height: 26,
        label: labels.R4,
        orientation: "horizontal",
      })}
      <line x1={negativeX} y1={bottomY} x2={r4StartX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={4} />

      <text x={positiveX - 12} y={positiveTopY - 12} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
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

