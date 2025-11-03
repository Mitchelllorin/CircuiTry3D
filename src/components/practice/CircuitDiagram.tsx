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
  const labels = {
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

  const loopLeftX = positiveX + 56;
  const loopRightX = 320;
  const topY = 68;
  const bottomY = 204;
  const lead = 22;

  const horizontalResWidth = loopRightX - loopLeftX - lead * 2;
  const verticalResHeight = bottomY - topY - lead * 2;

  const r1CenterX = loopLeftX + lead + horizontalResWidth / 2;
  const r3CenterX = r1CenterX;
  const r2CenterY = topY + lead + verticalResHeight / 2;
  const r4CenterY = r2CenterY;

  const r1StartX = loopLeftX + lead;
  const r1EndX = loopRightX - lead;
  const r3StartX = r1StartX;
  const r3EndX = r1EndX;

  const r2TopY = topY + lead;
  const r2BottomY = bottomY - lead;
  const r4TopY = r2TopY;
  const r4BottomY = r2BottomY;

  const verticalResWidth = 30;
  const horizontalResHeight = 26;

  return (
    <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Series rectangular circuit">
      {drawBattery(batteryX, batteryY)}
      {/* Source leads */}
      <line x1={positiveX} y1={positiveTopY} x2={positiveX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={negativeX} y1={bottomY} x2={negativeX} y2={negativeBottomY} stroke={WIRE_COLOR} strokeWidth={4} />

      {/* Top side */}
      <line x1={positiveX} y1={topY} x2={loopLeftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={loopLeftX} y1={topY} x2={r1StartX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "series-resistor-R1",
        x: r1CenterX,
        y: topY,
        width: horizontalResWidth,
        height: horizontalResHeight,
        label: labels.R1,
        orientation: "horizontal",
      })}
      <line x1={r1EndX} y1={topY} x2={loopRightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />

      {/* Right side */}
      <line x1={loopRightX} y1={topY} x2={loopRightX} y2={r2TopY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "series-resistor-R2",
        x: loopRightX,
        y: r2CenterY,
        width: verticalResWidth,
        height: verticalResHeight,
        label: labels.R2,
        orientation: "vertical",
      })}
      <line x1={loopRightX} y1={r2BottomY} x2={loopRightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />

      {/* Bottom side */}
      <line x1={loopRightX} y1={bottomY} x2={r3EndX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "series-resistor-R3",
        x: r3CenterX,
        y: bottomY,
        width: horizontalResWidth,
        height: horizontalResHeight,
        label: labels.R3,
        orientation: "horizontal",
      })}
      <line x1={r3StartX} y1={bottomY} x2={loopLeftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      <line x1={loopLeftX} y1={bottomY} x2={negativeX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={4} />

      {/* Left side */}
      <line x1={loopLeftX} y1={bottomY} x2={loopLeftX} y2={r4BottomY} stroke={WIRE_COLOR} strokeWidth={4} />
      {drawResistor({
        key: "series-resistor-R4",
        x: loopLeftX,
        y: r4CenterY,
        width: verticalResWidth,
        height: verticalResHeight,
        label: labels.R4,
        orientation: "vertical",
      })}
      <line x1={loopLeftX} y1={r4TopY} x2={loopLeftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={4} />

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

