import type { PracticeProblem } from "../../model/practice";
import type { JSX } from "react";
import { ResistorSymbol, BatterySymbol } from "../circuit/SchematicSymbols";
import {
  SCHEMATIC_COLORS,
  STROKE_WIDTHS,
  NODE_DIMENSIONS,
  LABEL_SPECS,
  RESISTOR_SPECS,
  SERIES_LAYOUT,
  PARALLEL_LAYOUT,
  COMBINATION_LAYOUT,
  BATTERY_LAYOUT,
  formatResistance,
  formatVoltage,
} from "../../schematic/visualConstants";

type DiagramProps = {
  problem: PracticeProblem;
  showGivens?: boolean;
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
const IEEE_RESISTOR_SEGMENTS = 6;
const IEEE_RESISTOR_AMPLITUDE = 12;
const IEEE_RESISTOR_LEAD_FRACTION = 0.22;
const IEEE_BATTERY_POSITIVE_WIDTH = 32;
const IEEE_BATTERY_NEGATIVE_WIDTH = 18;
const IEEE_BATTERY_GAP = 8;

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

const drawBattery = (x: number, y: number) => (
  <g transform={`translate(${x}, ${y})`}>
    <line x1={-20} y1={6} x2={20} y2={6} stroke={WIRE_COLOR} strokeWidth={3} strokeLinecap="round" />
    <line x1={-28} y1={-8} x2={28} y2={-8} stroke={WIRE_COLOR} strokeWidth={5} strokeLinecap="round" />
    <text x={-24} y={12} fill={LABEL_COLOR} fontSize={12} textAnchor="end">
      -
    </text>
    <text x={24} y={-14} fill={LABEL_COLOR} fontSize={12} textAnchor="start">
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
    strokeWidth={STROKE_WIDTHS.nodeStroke}
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

const drawResistor = ({ start, end, orientation, label, key, labelOffset, labelSide }: ResistorSymbolOptions) => {
  const totalLength = orientation === "horizontal" ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y);
  const leadLength = totalLength * IEEE_RESISTOR_LEAD_FRACTION;
  const bodyLength = totalLength - 2 * leadLength;
  
  const points: string[] = [];
  const leadPoints: Point[] = [];

  if (orientation === "horizontal") {
    const direction = end.x > start.x ? 1 : -1;
    const bodyStartX = start.x + leadLength * direction;
    const bodyEndX = start.x + (totalLength - leadLength) * direction;
    
    leadPoints.push({ x: start.x, y: start.y });
    leadPoints.push({ x: bodyStartX, y: start.y });
    
    const step = bodyLength / IEEE_RESISTOR_SEGMENTS;
    for (let i = 0; i <= IEEE_RESISTOR_SEGMENTS; i += 1) {
      const x = bodyStartX + step * i * direction;
      let y = start.y;
      if (i > 0 && i < IEEE_RESISTOR_SEGMENTS) {
        y += (i % 2 === 0 ? -IEEE_RESISTOR_AMPLITUDE : IEEE_RESISTOR_AMPLITUDE);
      }
      points.push(`${x},${y}`);
    }
    
    leadPoints.push({ x: bodyEndX, y: start.y });
    leadPoints.push({ x: end.x, y: end.y });
  } else {
    const direction = end.y > start.y ? 1 : -1;
    const bodyStartY = start.y + leadLength * direction;
    const bodyEndY = start.y + (totalLength - leadLength) * direction;
    
    leadPoints.push({ x: start.x, y: start.y });
    leadPoints.push({ x: start.x, y: bodyStartY });
    
    const step = bodyLength / IEEE_RESISTOR_SEGMENTS;
    for (let i = 0; i <= IEEE_RESISTOR_SEGMENTS; i += 1) {
      const y = bodyStartY + step * i * direction;
      let x = start.x;
      if (i > 0 && i < IEEE_RESISTOR_SEGMENTS) {
        x += (i % 2 === 0 ? IEEE_RESISTOR_AMPLITUDE : -IEEE_RESISTOR_AMPLITUDE);
      }
      points.push(`${x},${y}`);
    }
    
    leadPoints.push({ x: start.x, y: bodyEndY });
    leadPoints.push({ x: end.x, y: end.y });
  }

  // Value label positioning (below the main label for horizontal, offset for vertical)
  const valueY = orientation === "horizontal"
    ? labelY + 13
    : labelY + 12;

  return (
    <g key={key}>
      <line 
        x1={leadPoints[0].x} 
        y1={leadPoints[0].y} 
        x2={leadPoints[1].x} 
        y2={leadPoints[1].y} 
        stroke={COMPONENT_STROKE} 
        strokeWidth={2.8} 
        strokeLinecap="round" 
      />
      <polyline
        points={points.join(" ")}
        stroke={COMPONENT_STROKE}
        strokeWidth={2.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      <line 
        x1={leadPoints[2].x} 
        y1={leadPoints[2].y} 
        x2={leadPoints[3].x} 
        y2={leadPoints[3].y} 
        stroke={COMPONENT_STROKE} 
        strokeWidth={2.8} 
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
        strokeWidth={STROKE_WIDTHS.wireSvgSymbol}
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
      <text x={labelX} y={labelY} textAnchor={textAnchor} fill={LABEL_COLOR} fontSize={LABEL_SPECS.componentLabelSize} fontWeight={LABEL_SPECS.labelWeight}>
        {label}
      </text>
      {value && (
        <text x={labelX} y={valueY} textAnchor={textAnchor} fill={VALUE_COLOR} fontSize={LABEL_SPECS.valueLabelSize} fontWeight={LABEL_SPECS.valueWeight}>
          {value}
        </text>
      )}
    </g>
  );
};

const SeriesRectDiagram = ({ problem, showGivens = true }: DiagramProps) => {
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
    const positiveRightY = batteryY;
    const negativeRightY = batteryY;

    const label = ids
      .map((id) => componentData.get(id)?.label ?? id)
      .join(" + ");

    const totalResistance = ids.reduce((sum, id) => {
      const component = problem.components.find((entry) => entry.id === id);
      const resistance =
        component?.givens?.resistance ?? component?.values?.resistance;
      return Number.isFinite(resistance) ? sum + (resistance as number) : sum;
    }, 0);
    const hasResolvableResistance = ids.every((id) => {
      const component = problem.components.find((entry) => entry.id === id);
      const resistance =
        component?.givens?.resistance ?? component?.values?.resistance;
      return Number.isFinite(resistance);
    });

    return {
      label,
      value: hasResolvableResistance ? formatResistance(totalResistance) : null,
    };
  };

    return (
      <svg className="diagram-svg" viewBox="0 0 360 260" role="img" aria-label="Series circuit diagram">
        {drawBattery(batteryX, batteryY)}
        {/* Source leads - positive connects to top, negative connects to bottom via left side */}
        <line x1={positiveX} y1={positiveRightY} x2={loopLeftX} y2={positiveRightY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={loopLeftX} y1={positiveRightY} x2={loopLeftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX} y1={negativeRightY} x2={negativeX - 30} y2={negativeRightY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX - 30} y1={negativeRightY} x2={negativeX - 30} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        <line x1={negativeX - 30} y1={bottomY} x2={loopLeftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

        {/* Top run */}
        <line x1={loopLeftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-top-load",
          start: topStart,
          end: topEnd,
          label: topData.label,
          value: topData.value,
          orientation: "horizontal",
        })}
        <line x1={topEnd.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      </g>,
      <g key="series-right-group">
        <line x1={rightX} y1={topY} x2={rightX} y2={rightStart.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-right-load",
          start: rightStart,
          end: rightEnd,
          label: rightData.label,
          value: rightData.value,
          orientation: "vertical",
          labelSide: "right",
        })}
        <line x1={rightX} y1={rightEnd.y} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      </g>,
      <g key="series-bottom-group">
        <line x1={rightX} y1={bottomY} x2={bottomStart.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        {drawResistor({
          key: "series-bottom-load",
          start: bottomStart,
          end: bottomEnd,
          label: bottomData.label,
          value: bottomData.value,
          orientation: "horizontal",
          labelOffset: 22,
        })}
        <line x1={r3End.x} y1={bottomY} x2={loopLeftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Series circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <BatterySymbol
        x={leftX}
        y={batteryCenterY}
        rotation={-90}
        scale={batteryScale}
        label=""
        showLabel={false}
        color={WIRE_COLOR}
        strokeWidth={3}
      />
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Dynamically render resistors */}
      {renderResistors()}

        <text x={positiveX + 30} y={batteryY - 20} fill={LABEL_COLOR} fontSize={13} textAnchor="middle">
          {problem.source.label ?? "Source"}
        </text>
        {showGivens && (
          <>
            {problem.source.givens?.voltage !== undefined && (
              <text x={batteryX - 40} y={batteryY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor="end">
                {problem.source.givens.voltage}V
              </text>
            )}
            {problem.components.map((component, idx) => {
              const givens = component.givens;
              if (!givens || Object.keys(givens).length === 0) return null;
              
              let textX = 0;
              let textY = 0;
              let anchor: "start" | "end" | "middle" = "middle";
              
              if (component.id === "R1") {
                textX = (r1Start.x + r1End.x) / 2;
                textY = topY - 30;
                anchor = "middle";
              } else if (component.id === "R2") {
                textX = loopRightX + 40;
                textY = (r2Start.y + r2End.y) / 2;
                anchor = "start";
              } else if (component.id === "R3") {
                textX = (r3Start.x + r3End.x) / 2;
                textY = bottomY + 32;
                anchor = "middle";
              } else if (component.id === "R4") {
                textX = loopLeftX - 40;
                textY = (r4Start.y + r4End.y) / 2;
                anchor = "end";
              }
              
              const displayValue = givens.resistance !== undefined ? `${givens.resistance}Ω` :
                                   givens.voltage !== undefined ? `${givens.voltage}V` :
                                   givens.current !== undefined ? `${givens.current}A` :
                                   givens.watts !== undefined ? `${givens.watts}W` : null;
              
              if (!displayValue) return null;
              
              return (
                <text key={`given-${component.id}`} x={textX} y={textY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor={anchor}>
                  {displayValue}
                </text>
              );
            })}
          </>
        )}
      </svg>
    );
};

const ParallelRectDiagram = ({ problem, showGivens = true }: DiagramProps) => {
  const branchIds = ["R1", "R2", "R3"] as const;
  const labels: Record<(typeof branchIds)[number], string> = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
  };

  // Get labels and values for each resistor dynamically
  const componentData = new Map(
    branchIds.map(id => [id, getComponentLabelWithValue(problem, id)])
  );
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

  // Layout from centralized standards - battery on left side (vertical orientation)
  const { leftX, rightXDefault, rightXExtended, topY, bottomY } = PARALLEL_LAYOUT.frame2D;
  const rightX = branchCount <= 3 ? rightXDefault : rightXExtended;

  // Battery using centralized constants
  const batteryScale = BATTERY_LAYOUT.scale;
  const batteryHalfSpan = BATTERY_LAYOUT.halfSpan2D;
  const batteryCenterY = (topY + bottomY) / 2;
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  // Calculate branch spacing using centralized formula
  // Branches are evenly distributed across the available width
  const { marginOffset2D, startOffset2D } = PARALLEL_LAYOUT.spacing;
  const totalBranchWidth = rightX - leftX - marginOffset2D;
  const branchSpacing = totalBranchWidth / (branchCount + 1);
  const branchStart = leftX + branchSpacing + startOffset2D;
  const branchXs = branchIds.map((_, index) => branchStart + index * branchSpacing);

  // Resistor vertical offsets from centralized standards
  const branchResTop = topY + PARALLEL_LAYOUT.branches.topOffset2D;
  const branchResBottom = bottomY - PARALLEL_LAYOUT.branches.bottomOffset2D;

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Parallel circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <BatterySymbol
        x={leftX}
        y={batteryCenterY}
        rotation={-90}
        scale={batteryScale}
        label=""
        showLabel={false}
        color={WIRE_COLOR}
        strokeWidth={3}
      />
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top rail */}
      <line x1={leftX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {/* Bottom rail */}
      <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {branchXs.map((x, index) => {
        const id = branchIds[index];
        const data = componentData.get(id) ?? { label: id, value: null };
        const start: Point = { x, y: branchResTop };
        const end: Point = { x, y: branchResBottom };
        // Alternate label sides for clarity when branches are close
        const labelSide = index % 2 === 0 ? "left" : "right";
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
              labelSide: branchCount > 3 ? labelSide : "right",
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
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={LABEL_SPECS.componentLabelSize} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={LABEL_SPECS.valueLabelSize} textAnchor="middle">
          {sourceData.value}
        </text>
        {showGivens && (
          <>
            {problem.source.givens?.voltage !== undefined && (
              <text x={batteryX - 40} y={batteryY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor="end">
                {problem.source.givens.voltage}V
              </text>
            )}
            {branchIds.map((id, idx) => {
              const component = problem.components.find(c => c.id === id);
              if (!component?.givens || Object.keys(component.givens).length === 0) return null;
              
              const x = branchXs[idx];
              const textY = (branchResTop + branchResBottom) / 2;
              
              const givens = component.givens;
              const displayValue = givens.resistance !== undefined ? `${givens.resistance}Ω` :
                                   givens.voltage !== undefined ? `${givens.voltage}V` :
                                   givens.current !== undefined ? `${givens.current}A` :
                                   givens.watts !== undefined ? `${givens.watts}W` : null;
              
              if (!displayValue) return null;
              
              return (
                <text key={`given-${id}`} x={x + 32} y={textY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor="start">
                  {displayValue}
                </text>
              );
            })}
          </>
        )}
      </svg>
    );
};

const CombinationRectDiagram = ({ problem, showGivens = true }: DiagramProps) => {
  const labels = {
    R1: getComponentLabel(problem, "R1"),
    R2: getComponentLabel(problem, "R2"),
    R3: getComponentLabel(problem, "R3"),
    R4: getComponentLabel(problem, "R4"),
  };

  // Get component data map
  const componentData = new Map(
    componentIds.map(id => [id, getComponentLabelWithValue(problem, id)])
  );

  // Analyze network structure to determine layout
  // Standard layouts:
  // 3-component: R1 series, R2||R3 parallel (no bottom series)
  // 4-component (ladder): R1 series, R2||R3 parallel, R4 series
  // 4-component (nested): (R1+R2)||R3, then R4 series
  // 4-component (double-parallel): (R1||R2) + (R3||R4) series

  const hasBottomSeries = componentCount >= 4 && isStandardLadder(problem.network);
  const isDoubleParallel = componentCount === 4 && isDoubleParallelNetwork(problem.network);

  // Layout from centralized standards
  const { leftX, topY, bottomY } = COMBINATION_LAYOUT.frame2D;

  // Battery using centralized constants
  const batteryScale = BATTERY_LAYOUT.scale;
  const batteryHalfSpan = BATTERY_LAYOUT.halfSpan2D;
  const batteryCenterY = (topY + bottomY) / 2;
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  // For double-parallel circuits, render two separate parallel sections
  if (isDoubleParallel) {
    return renderDoubleParallelDiagram(sourceData, componentData, componentIds, {
      leftX, topY, bottomY, batteryScale, batteryCenterY, batteryTopY, batteryBottomY
    });
  }

  // Parallel branch center position from centralized standards
  const { branchCenterXWithBottom, branchCenterXNoBottom, startOffset2D, endOffsetFromCenter2D } = COMBINATION_LAYOUT.seriesResistor;
  const branchCenterX = hasBottomSeries ? branchCenterXWithBottom : branchCenterXNoBottom;

  // Identify series vs parallel components based on problem network
  const seriesTopId = componentIds[0]; // R1
  const seriesBottomId = hasBottomSeries ? componentIds[componentCount - 1] : null; // R4 if exists
  const parallelIds = hasBottomSeries
    ? componentIds.slice(1, -1) // R2, R3 (middle)
    : componentIds.slice(1);    // All except first

  const seriesTopData = componentData.get(seriesTopId) ?? { label: seriesTopId, value: null };
  const seriesBottomData = seriesBottomId ? (componentData.get(seriesBottomId) ?? { label: seriesBottomId, value: null }) : null;

  // Series resistor positions (horizontal) - using centralized offsets
  const r1Start: Point = { x: leftX + startOffset2D, y: topY };
  const r1End: Point = { x: branchCenterX - endOffsetFromCenter2D, y: topY };

  const r4Start: Point = hasBottomSeries ? { x: leftX + startOffset2D, y: bottomY } : { x: 0, y: 0 };
  const r4End: Point = hasBottomSeries ? { x: branchCenterX - endOffsetFromCenter2D, y: bottomY } : { x: 0, y: 0 };

  // Parallel branch positions (vertical) - using centralized spacing
  const parallelCount = parallelIds.length;
  const { maxSpacing2D, spacingDivisor2D, topOffset2D, bottomOffset2D } = COMBINATION_LAYOUT.parallelSection;
  const branchSpacing = Math.min(maxSpacing2D, spacingDivisor2D / parallelCount);
  const totalBranchWidth = branchSpacing * (parallelCount - 1);
  const branchStartX = branchCenterX - totalBranchWidth / 2;
  const branchXs = parallelIds.map((_, index) => branchStartX + index * branchSpacing);

  const branchResTop = topY + topOffset2D;
  const branchResBottom = bottomY - bottomOffset2D;
  const branchLeftX = Math.min(...branchXs);
  const branchRightX = Math.max(...branchXs);

  // Calculate parallel box dimensions for visual indicator
  const parallelBoxLeft = Math.min(...branchXs) - 18;
  const parallelBoxRight = Math.max(...branchXs) + 18;
  const parallelBoxTop = topY - 8;
  const parallelBoxBottom = bottomY + 8;

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Combination circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Parallel section indicator box (textbook "box within box" style) */}
      <rect
        x={parallelBoxLeft}
        y={parallelBoxTop}
        width={parallelBoxRight - parallelBoxLeft}
        height={parallelBoxBottom - parallelBoxTop}
        fill="none"
        stroke="rgba(162, 212, 255, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
        ry={6}
      />
      <text
        x={parallelBoxRight + 8}
        y={parallelBoxTop + 14}
        fill="rgba(162, 212, 255, 0.5)"
        fontSize={9}
        fontStyle="italic"
      >
        parallel
      </text>

      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={bottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <BatterySymbol
        x={leftX}
        y={batteryCenterY}
        rotation={-90}
        scale={batteryScale}
        label=""
        showLabel={false}
        color={WIRE_COLOR}
        strokeWidth={3}
      />
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top run with series R1 */}
      <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {drawResistor({
        key: "combo-series-top",
        start: r1Start,
        end: r1End,
        label: seriesTopData.label,
        value: seriesTopData.value,
        orientation: "horizontal",
      })}
      <line x1={r1End.x} y1={topY} x2={branchLeftX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={branchLeftX} y1={topY} x2={branchRightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Parallel branches section */}
      {branchXs.map((x, index) => {
        const id = parallelIds[index];
        const data = componentData.get(id) ?? { label: id, value: null };
        const start: Point = { x, y: branchResTop };
        const end: Point = { x, y: branchResBottom };
        // Alternate label sides for better readability
        const labelSide = index === 0 ? "left" : "right";
        return (
          <g key={`combo-parallel-${id}`}>
            {/* Wire from top rail to branch */}
            <line x1={x} y1={topY} x2={x} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {/* Parallel resistor */}
            {drawResistor({
              key: `combo-parallel-resistor-${id}`,
              start,
              end,
              label: data.label,
              value: data.value,
              orientation: "vertical",
              labelSide,
            })}
            {/* Wire from branch to bottom rail */}
            <line x1={x} y1={end.y} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {/* Junction nodes */}
            {drawNode({ x, y: topY }, `combo-parallel-node-top-${id}`)}
            {drawNode({ x, y: bottomY }, `combo-parallel-node-bottom-${id}`)}
          </g>
        );
      })}

      <line x1={branchLeftX} y1={bottomY} x2={branchRightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Bottom run with series R4 (if present) */}
      {hasBottomSeries && seriesBottomData ? (
        <>
          <line x1={branchLeftX} y1={bottomY} x2={r4End.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({
            key: "combo-series-bottom",
            start: r4Start,
            end: r4End,
            label: seriesBottomData.label,
            value: seriesBottomData.value,
            orientation: "horizontal",
            labelOffset: 22,
          })}
          <line x1={r4Start.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </>
      ) : (
        /* Direct connection from parallel section back to source */
        <line x1={branchLeftX} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      )}

      {/* Corner nodes */}
      {drawNode({ x: leftX, y: topY }, "combo-node-source-top")}
      {drawNode({ x: leftX, y: bottomY }, "combo-node-source-bottom")}
      {drawNode({ x: branchLeftX, y: topY }, "combo-node-branch-top-left")}
      {drawNode({ x: branchRightX, y: topY }, "combo-node-branch-top-right")}
      {drawNode({ x: branchLeftX, y: bottomY }, "combo-node-branch-bottom-left")}
      {drawNode({ x: branchRightX, y: bottomY }, "combo-node-branch-bottom-right")}

      {/* Battery label on left, outside the circuit */}
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={LABEL_SPECS.componentLabelSize} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={LABEL_SPECS.valueLabelSize} textAnchor="middle">
          {sourceData.value}
        </text>
        {showGivens && (
          <>
            {problem.source.givens?.voltage !== undefined && (
              <text x={batteryX - 40} y={batteryY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor="end">
                {problem.source.givens.voltage}V
              </text>
            )}
            {problem.components.map((component, idx) => {
              const givens = component.givens;
              if (!givens || Object.keys(givens).length === 0) return null;
              
              let textX = 0;
              let textY = 0;
              let anchor: "start" | "end" | "middle" = "middle";
              
              if (component.id === "R1") {
                textX = (r1Start.x + r1End.x) / 2;
                textY = topY - 26;
                anchor = "middle";
              } else if (component.id === "R2") {
                textX = branchX + branchOffsets["R2"] - 32;
                textY = (branchResTop + branchResBottom) / 2;
                anchor = "end";
              } else if (component.id === "R3") {
                textX = branchX + branchOffsets["R3"] + 32;
                textY = (branchResTop + branchResBottom) / 2;
                anchor = "start";
              } else if (component.id === "R4") {
                textX = (r4Start.x + r4End.x) / 2;
                textY = bottomY + 32;
                anchor = "middle";
              }
              
              const displayValue = givens.resistance !== undefined ? `${givens.resistance}Ω` :
                                   givens.voltage !== undefined ? `${givens.voltage}V` :
                                   givens.current !== undefined ? `${givens.current}A` :
                                   givens.watts !== undefined ? `${givens.watts}W` : null;
              
              if (!displayValue) return null;
              
              return (
                <text key={`given-${component.id}`} x={textX} y={textY} fill={"#ffeb3b"} fontSize={14} fontWeight={600} textAnchor={anchor}>
                  {displayValue}
                </text>
              );
            })}
          </>
        )}
      </svg>
    );
};

// Helper function to determine if network is a standard ladder (series-parallel-series)
function isStandardLadder(network: PracticeProblem["network"]): boolean {
  if (network.kind !== "series") return false;
  const children = network.children;
  // Standard ladder: component, parallel, component
  return children.length === 3 &&
    children[0].kind === "component" &&
    children[1].kind === "parallel" &&
    children[2].kind === "component";
}

// Helper function to detect double-parallel network: (R1||R2) + (R3||R4)
function isDoubleParallelNetwork(network: PracticeProblem["network"]): boolean {
  if (network.kind !== "series") return false;
  const children = network.children;
  // Double parallel: parallel, parallel
  return children.length === 2 &&
    children[0].kind === "parallel" &&
    children[1].kind === "parallel";
}

// Render textbook double-parallel diagram: two parallel boxes stacked in series.
function renderDoubleParallelDiagram(
  _problem: PracticeProblem,
  sourceData: { label: string; value: string | null },
  componentData: Map<string, { label: string; value: string | null }>,
  componentIds: string[],
  layout: {
    leftX: number; topY: number; bottomY: number;
    batteryScale: number; batteryCenterY: number;
    batteryTopY: number; batteryBottomY: number;
  }
) {
  const { leftX, batteryScale, batteryCenterY, batteryTopY, batteryBottomY } = layout;

  const topIds = [componentIds[0], componentIds[1]];
  const bottomIds = [componentIds[2], componentIds[3]];
  const {
    centerX2D,
    branchSpacing2D,
    topNodeY2D,
    midNodeY2D,
    bottomNodeY2D,
    leadInset2D,
  } = COMBINATION_LAYOUT.doubleParallel;

  const leftBranchX = centerX2D - branchSpacing2D / 2;
  const rightBranchX = centerX2D + branchSpacing2D / 2;
  const nodeTopY = topNodeY2D;
  const nodeMidY = midNodeY2D;
  const nodeBottomY = bottomNodeY2D;

  const topResStartY = nodeTopY + leadInset2D;
  const topResEndY = nodeMidY - leadInset2D;
  const bottomResStartY = nodeMidY + leadInset2D;
  const bottomResEndY = nodeBottomY - leadInset2D;

  const boxLeft = leftBranchX - 18;
  const boxWidth = rightBranchX - leftBranchX + 36;
  const topBoxTop = nodeTopY - 8;
  const topBoxHeight = nodeMidY - nodeTopY + 16;
  const bottomBoxTop = nodeMidY - 8;
  const bottomBoxHeight = nodeBottomY - nodeMidY + 16;
  const branchXs = [leftBranchX, rightBranchX];

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Double parallel combination circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Parallel box indicators (stacked textbook pattern) */}
      <rect
        x={boxLeft}
        y={topBoxTop}
        width={boxWidth}
        height={topBoxHeight}
        fill="none"
        stroke="rgba(162, 212, 255, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
        ry={6}
      />
      <rect
        x={boxLeft}
        y={bottomBoxTop}
        width={boxWidth}
        height={bottomBoxHeight}
        fill="none"
        stroke="rgba(162, 212, 255, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
        ry={6}
      />

      {/* Left side with battery (vertical) */}
      <line x1={leftX} y1={nodeBottomY} x2={leftX} y2={batteryBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <BatterySymbol
        x={leftX}
        y={batteryCenterY}
        rotation={-90}
        scale={batteryScale}
        label=""
        showLabel={false}
        color={WIRE_COLOR}
        strokeWidth={3}
      />
      <line x1={leftX} y1={batteryTopY} x2={leftX} y2={nodeTopY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Series feed and return wires */}
      <line x1={leftX} y1={nodeTopY} x2={centerX2D} y2={nodeTopY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={centerX2D} y1={nodeBottomY} x2={leftX} y2={nodeBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top/mid/bottom rails */}
      <line x1={leftBranchX} y1={nodeTopY} x2={rightBranchX} y2={nodeTopY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={leftBranchX} y1={nodeMidY} x2={rightBranchX} y2={nodeMidY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={leftBranchX} y1={nodeBottomY} x2={rightBranchX} y2={nodeBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Top parallel pair (R1 || R2) */}
      {topIds.map((id, index) => {
        const x = branchXs[index];
        const data = componentData.get(id) ?? { label: id, value: null };
        return (
          <g key={`double-top-${id}`}>
            <line x1={x} y1={nodeTopY} x2={x} y2={topResStartY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawResistor({
              key: `double-top-resistor-${id}`,
              start: { x, y: topResStartY },
              end: { x, y: topResEndY },
              label: data.label,
              value: data.value,
              orientation: "vertical",
              labelSide: index === 0 ? "left" : "right",
            })}
            <line x1={x} y1={topResEndY} x2={x} y2={nodeMidY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawNode({ x, y: nodeTopY }, `double-top-node-top-${id}`)}
            {drawNode({ x, y: nodeMidY }, `double-top-node-mid-${id}`)}
          </g>
        );
      })}

      {/* Bottom parallel pair (R3 || R4) */}
      {bottomIds.map((id, index) => {
        const x = branchXs[index];
        const data = componentData.get(id) ?? { label: id, value: null };
        return (
          <g key={`double-bottom-${id}`}>
            <line x1={x} y1={nodeMidY} x2={x} y2={bottomResStartY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawResistor({
              key: `double-bottom-resistor-${id}`,
              start: { x, y: bottomResStartY },
              end: { x, y: bottomResEndY },
              label: data.label,
              value: data.value,
              orientation: "vertical",
              labelSide: index === 0 ? "left" : "right",
            })}
            <line x1={x} y1={bottomResEndY} x2={x} y2={nodeBottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawNode({ x, y: nodeBottomY }, `double-bottom-node-bottom-${id}`)}
          </g>
        );
      })}

      {/* Series nodes between source and stacked boxes */}
      {drawNode({ x: leftX, y: nodeTopY }, "double-node-source-top")}
      {drawNode({ x: centerX2D, y: nodeTopY }, "double-node-top-feed")}
      {drawNode({ x: centerX2D, y: nodeMidY }, "double-node-mid-series")}
      {drawNode({ x: centerX2D, y: nodeBottomY }, "double-node-bottom-return")}
      {drawNode({ x: leftX, y: nodeBottomY }, "double-node-source-bottom")}

      {/* Battery label */}
      <text x={leftX - 28} y={batteryCenterY - 2} fill={LABEL_COLOR} fontSize={LABEL_SPECS.componentLabelSize} textAnchor="middle">
        {sourceData.label}
      </text>
      {sourceData.value && (
        <text x={leftX - 28} y={batteryCenterY + 12} fill={VALUE_COLOR} fontSize={LABEL_SPECS.valueLabelSize} textAnchor="middle">
          {sourceData.value}
        </text>
      )}
    </svg>
  );
}

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

