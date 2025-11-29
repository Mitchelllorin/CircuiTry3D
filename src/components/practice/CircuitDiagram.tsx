import type { PracticeProblem } from "../../model/practice";
import { ResistorSymbol, BatterySymbol } from "../circuit/SchematicSymbols";

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
const VALUE_COLOR = "#a8d8ff";
const NODE_FILL = "rgba(162, 212, 255, 0.95)";
const NODE_STROKE = "rgba(12, 32, 64, 0.9)";
const WIRE_STROKE_WIDTH = 4;
const NODE_RADIUS = 4.2;

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

// Get component label with resistance value (e.g., "R1 150Ω")
const getComponentLabelWithValue = (problem: PracticeProblem, componentId: string): { label: string; value: string | null } => {
  if (componentId === "totals") {
    return { label: "Circuit Totals", value: null };
  }

  if (componentId === problem.source.id) {
    const voltage = problem.source.givens?.voltage ?? problem.source.values?.voltage;
    return {
      label: problem.source.label ?? problem.source.id,
      value: voltage ? formatVoltage(voltage) : null,
    };
  }

  const match = problem.components.find((component) => component.id === componentId);
  if (match) {
    const resistance = match.givens?.resistance ?? match.values?.resistance;
    return {
      label: match.label ?? match.id,
      value: resistance ? formatResistance(resistance) : null,
    };
  }

  return { label: componentId, value: null };
};

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
  value?: string | null;
  key?: string;
  labelOffset?: number;
  labelSide?: "left" | "right";
};

const drawResistor = ({ start, end, orientation, label, value, key, labelOffset, labelSide }: ResistorSymbolOptions) => {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const rotation = orientation === "horizontal" ? 0 : 90;

  // For horizontal resistors, position label above the zigzag peak (which is 8px above center)
  // Label needs to be higher to avoid being obscured by the resistor body
  const adjustedLabelOffset = orientation === "horizontal"
    ? (labelOffset ?? -26)
    : 0;

  const labelX = orientation === "horizontal"
    ? centerX
    : centerX + ((labelSide ?? "right") === "left" ? -22 : 22);

  const labelY = orientation === "horizontal"
    ? centerY + adjustedLabelOffset
    : centerY + (labelOffset ?? 0);

  const textAnchor = orientation === "horizontal"
    ? "middle" as const
    : ((labelSide ?? "right") === "left" ? "end" as const : "start" as const);

  // Calculate proper wire endpoints accounting for direction
  // Resistor symbol body spans from -20 to +20 (leads from -30 to -20 and +20 to +30)
  const resistorHalfWidth = 30; // Total symbol span

  // For horizontal: wire goes from start to left edge, then from right edge to end
  // For vertical: wire goes from start to top edge, then from bottom edge to end
  let wireEndFromStart: { x: number; y: number };
  let wireStartToEnd: { x: number; y: number };

  if (orientation === "horizontal") {
    const leftEdge = centerX - resistorHalfWidth;
    const rightEdge = centerX + resistorHalfWidth;
    if (start.x < end.x) {
      // Left to right
      wireEndFromStart = { x: leftEdge, y: centerY };
      wireStartToEnd = { x: rightEdge, y: centerY };
    } else {
      // Right to left
      wireEndFromStart = { x: rightEdge, y: centerY };
      wireStartToEnd = { x: leftEdge, y: centerY };
    }
  } else {
    const topEdge = centerY - resistorHalfWidth;
    const bottomEdge = centerY + resistorHalfWidth;
    if (start.y < end.y) {
      // Top to bottom
      wireEndFromStart = { x: centerX, y: topEdge };
      wireStartToEnd = { x: centerX, y: bottomEdge };
    } else {
      // Bottom to top
      wireEndFromStart = { x: centerX, y: bottomEdge };
      wireStartToEnd = { x: centerX, y: topEdge };
    }
  }

  // Value label positioning (below the main label for horizontal, offset for vertical)
  const valueY = orientation === "horizontal"
    ? labelY + 13
    : labelY + 12;

  return (
    <g key={key}>
      <line
        x1={start.x}
        y1={start.y}
        x2={wireEndFromStart.x}
        y2={wireEndFromStart.y}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <ResistorSymbol
        x={centerX}
        y={centerY}
        rotation={rotation}
        scale={1}
        label=""
        showLabel={false}
        color={COMPONENT_STROKE}
        strokeWidth={3.2}
      />
      <line
        x1={wireStartToEnd.x}
        y1={wireStartToEnd.y}
        x2={end.x}
        y2={end.y}
        stroke={WIRE_COLOR}
        strokeWidth={WIRE_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <text x={labelX} y={labelY} textAnchor={textAnchor} fill={LABEL_COLOR} fontSize={13} fontWeight={600}>
        {label}
      </text>
      {value && (
        <text x={labelX} y={valueY} textAnchor={textAnchor} fill={VALUE_COLOR} fontSize={11} fontWeight={500}>
          {value}
        </text>
      )}
    </g>
  );
};

const SeriesRectDiagram = ({ problem }: DiagramProps) => {
  // Get labels and values for each resistor
  const r1Data = getComponentLabelWithValue(problem, "R1");
  const r2Data = getComponentLabelWithValue(problem, "R2");
  const r3Data = getComponentLabelWithValue(problem, "R3");
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

  // Layout matching CircuitLogo reference: battery on left, resistors distributed around circuit
  const leftX = 100;
  const rightX = 500;
  const topY = 60;
  const bottomY = 180;

  // Battery on left side (vertical orientation)
  // Battery symbol spans 60 units (-30 to +30), scaled by 0.9 = 54 units
  const batteryScale = 0.9;
  const batteryHalfSpan = 30 * batteryScale; // 27 units
  const batteryCenterY = (topY + bottomY) / 2; // 120
  const batteryTopY = batteryCenterY - batteryHalfSpan; // ~93
  const batteryBottomY = batteryCenterY + batteryHalfSpan; // ~147

  // Corner nodes
  const topLeft: Point = { x: leftX, y: topY };
  const topRight: Point = { x: rightX, y: topY };
  const bottomRight: Point = { x: rightX, y: bottomY };
  const bottomLeft: Point = { x: leftX, y: bottomY };

  // R1 on top (horizontal)
  const r1Start: Point = { x: leftX + 40, y: topY };
  const r1End: Point = { x: rightX - 40, y: topY };

  // R2 on right side (vertical)
  const r2Start: Point = { x: rightX, y: topY + 30 };
  const r2End: Point = { x: rightX, y: bottomY - 30 };

  // R3 on bottom (horizontal)
  const r3Start: Point = { x: rightX - 40, y: bottomY };
  const r3End: Point = { x: leftX + 40, y: bottomY };

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Series circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <g transform={`translate(${leftX}, ${batteryCenterY}) rotate(-90)`}>
        <BatterySymbol
          x={0}
          y={0}
          rotation={0}
          scale={batteryScale}
          label=""
          showLabel={false}
          color={WIRE_COLOR}
          strokeWidth={3}
        />
      </g>
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top run with R1 */}
      <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "series-R1",
        start: r1Start,
        end: r1End,
        label: r1Data.label,
        value: r1Data.value,
        orientation: "horizontal",
      })}
      <line x1={r1End.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Right side with R2 (vertical) */}
      <line x1={rightX} y1={topY} x2={rightX} y2={r2Start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "series-R2",
        start: r2Start,
        end: r2End,
        label: r2Data.label,
        value: r2Data.value,
        orientation: "vertical",
        labelSide: "right",
      })}
      <line x1={rightX} y1={r2End.y} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Bottom run with R3 */}
      <line x1={rightX} y1={bottomY} x2={r3Start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "series-R3",
        start: r3Start,
        end: r3End,
        label: r3Data.label,
        value: r3Data.value,
        orientation: "horizontal",
        labelOffset: 22,
      })}
      <line x1={r3End.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Corner nodes */}
      {drawNode(topLeft, "series-node-tl")}
      {drawNode(topRight, "series-node-tr")}
      {drawNode(bottomRight, "series-node-br")}
      {drawNode(bottomLeft, "series-node-bl")}

      {/* Battery label on the left, outside the circuit */}
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={13} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={11} textAnchor="middle">
          {sourceData.value}
        </text>
      )}
    </svg>
  );
};

const ParallelRectDiagram = ({ problem }: DiagramProps) => {
  const branchIds = ["R1", "R2", "R3"] as const;

  // Get labels and values for each resistor
  const componentData: Record<(typeof branchIds)[number], { label: string; value: string | null }> = {
    R1: getComponentLabelWithValue(problem, "R1"),
    R2: getComponentLabelWithValue(problem, "R2"),
    R3: getComponentLabelWithValue(problem, "R3"),
  };
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

  // Layout with battery on left side (vertical orientation)
  const leftX = 100;
  const rightX = 520;
  const topY = 60;
  const bottomY = 180;

  // Battery on left side (vertical)
  // Battery symbol spans 60 units (-30 to +30), scaled by 0.85 = 51 units
  const batteryScale = 0.85;
  const batteryHalfSpan = 30 * batteryScale; // 25.5 units
  const batteryCenterY = (topY + bottomY) / 2; // 120
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  const branchStart = leftX + 100;
  const branchSpacing = 100;
  const branchXs = branchIds.map((_, index) => branchStart + index * branchSpacing);

  const branchResTop = topY + 26;
  const branchResBottom = bottomY - 26;

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Parallel circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <g transform={`translate(${leftX}, ${batteryCenterY}) rotate(-90)`}>
        <BatterySymbol
          x={0}
          y={0}
          rotation={0}
          scale={batteryScale}
          label=""
          showLabel={false}
          color={WIRE_COLOR}
          strokeWidth={3}
        />
      </g>
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top rail */}
      <line x1={leftX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {/* Bottom rail */}
      <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {/* Right side connection */}
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {branchXs.map((x, index) => {
        const id = branchIds[index];
        const data = componentData[id];
        const start: Point = { x, y: branchResTop };
        const end: Point = { x, y: branchResBottom };
        return (
          <g key={`parallel-branch-${id}`}>
            <line x1={x} y1={topY} x2={x} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawResistor({
              key: `parallel-resistor-${id}`,
              start,
              end,
              label: data.label,
              value: data.value,
              orientation: "vertical",
            })}
            <line x1={x} y1={end.y} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawNode({ x, y: topY }, `parallel-node-top-${id}`)}
            {drawNode({ x, y: bottomY }, `parallel-node-bottom-${id}`)}
          </g>
        );
      })}

      {drawNode({ x: leftX, y: topY }, "parallel-node-source-top")}
      {drawNode({ x: leftX, y: bottomY }, "parallel-node-source-bottom")}
      {drawNode({ x: rightX, y: topY }, "parallel-node-right-top")}
      {drawNode({ x: rightX, y: bottomY }, "parallel-node-right-bottom")}

      {/* Battery label on left, outside the circuit */}
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={13} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={11} textAnchor="middle">
          {sourceData.value}
        </text>
      )}
    </svg>
  );
};

const CombinationRectDiagram = ({ problem }: DiagramProps) => {
  // Get labels and values for each resistor
  const r1Data = getComponentLabelWithValue(problem, "R1");
  const r2Data = getComponentLabelWithValue(problem, "R2");
  const r3Data = getComponentLabelWithValue(problem, "R3");
  const r4Data = getComponentLabelWithValue(problem, "R4");
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

  const branchOrder = ["R2", "R3"] as const;
  const branchData: Record<(typeof branchOrder)[number], { label: string; value: string | null }> = {
    R2: r2Data,
    R3: r3Data,
  };

  // Layout with battery on left side (vertical orientation)
  const leftX = 100;
  const topY = 60;
  const bottomY = 180;
  const branchX = 440;

  // Battery on left side (vertical)
  // Battery symbol spans 60 units (-30 to +30), scaled by 0.85 = 51 units
  const batteryScale = 0.85;
  const batteryHalfSpan = 30 * batteryScale; // 25.5 units
  const batteryCenterY = (topY + bottomY) / 2; // 120
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  const r1Start: Point = { x: leftX + 50, y: topY };
  const r1End: Point = { x: branchX - 60, y: topY };

  const branchOffsets: Record<(typeof branchOrder)[number], number> = {
    R2: -36,
    R3: 36,
  };
  const branchResTop = topY + 28;
  const branchResBottom = bottomY - 32;

  const r4Start: Point = { x: leftX + 50, y: bottomY };
  const r4End: Point = { x: branchX - 60, y: bottomY };

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Combination circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <g transform={`translate(${leftX}, ${batteryCenterY}) rotate(-90)`}>
        <BatterySymbol
          x={0}
          y={0}
          rotation={0}
          scale={batteryScale}
          label=""
          showLabel={false}
          color={WIRE_COLOR}
          strokeWidth={3}
        />
      </g>
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top run with R1 */}
      <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "combo-R1",
        start: r1Start,
        end: r1End,
        label: r1Data.label,
        value: r1Data.value,
        orientation: "horizontal",
      })}
      <line x1={r1End.x} y1={topY} x2={branchX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Parallel branches */}
      {branchOrder.map((id) => {
        const offset = branchOffsets[id];
        const data = branchData[id];
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
              label: data.label,
              value: data.value,
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

      {/* Bottom run with R4 */}
      <line x1={branchX} y1={bottomY} x2={r4End.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "combo-R4",
        start: r4Start,
        end: r4End,
        label: r4Data.label,
        value: r4Data.value,
        orientation: "horizontal",
        labelOffset: 22,
      })}
      <line x1={r4Start.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Corner nodes */}
      {drawNode({ x: leftX, y: topY }, "combo-node-source-top")}
      {drawNode({ x: leftX, y: bottomY }, "combo-node-source-bottom")}
      {drawNode({ x: branchX, y: topY }, "combo-node-branch-top")}
      {drawNode({ x: branchX, y: bottomY }, "combo-node-branch-bottom")}

      {/* Battery label on left, outside the circuit */}
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={13} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={11} textAnchor="middle">
          {sourceData.value}
        </text>
      )}
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
    <>
      <div className="diagram-card-header">
        <strong>Worksheet Circuit</strong>
        <span>{problem.title}</span>
      </div>
      <div className="diagram-card" aria-label="Circuit schematic">
        {content}
      </div>
    </>
  );
}

