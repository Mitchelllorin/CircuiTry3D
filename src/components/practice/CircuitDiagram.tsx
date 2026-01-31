import type { PracticeProblem } from "../../model/practice";
import type { JSX } from "react";
import { ResistorSymbol, BatterySymbol } from "../circuit/SchematicSymbols";
import {
  SCHEMATIC_COLORS,
  STROKE_WIDTHS,
  NODE_DIMENSIONS,
  LAYOUT_SPECS,
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
};

type Point = {
  x: number;
  y: number;
};

// Use centralized visual constants
const WIRE_COLOR = SCHEMATIC_COLORS.wire;
const COMPONENT_STROKE = SCHEMATIC_COLORS.componentStroke;
const LABEL_COLOR = SCHEMATIC_COLORS.labelPrimary;
const VALUE_COLOR = SCHEMATIC_COLORS.labelValue;
const NODE_FILL = SCHEMATIC_COLORS.nodeFill;
const NODE_STROKE = SCHEMATIC_COLORS.nodeStroke;
const WIRE_STROKE_WIDTH = STROKE_WIDTHS.wire;
const NODE_RADIUS = NODE_DIMENSIONS.radius2D;

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

// Junction node drawn per style guide (filled circles at T-junctions)
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

const drawResistor = ({ start, end, orientation, label, value, key, labelOffset, labelSide }: ResistorSymbolOptions) => {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const rotation = orientation === "horizontal" ? 0 : 90;

  // For horizontal resistors, position label above the zigzag peak
  // Label needs to be higher to avoid being obscured by the resistor body
  const adjustedLabelOffset = orientation === "horizontal"
    ? (labelOffset ?? LABEL_SPECS.horizontalLabelOffset)
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
  // Resistor symbol body uses centralized constant for total span
  const resistorHalfWidth = RESISTOR_SPECS.totalHalfSpan;

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

const SeriesRectDiagram = ({ problem }: DiagramProps) => {
  // Dynamically get component data from problem (supports 2, 3, 4+ resistors)
  const componentIds = problem.components.map(c => c.id);
  const componentCount = componentIds.length;
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

  // Get component data map
  const componentData = new Map(
    componentIds.map(id => [id, getComponentLabelWithValue(problem, id)])
  );

  // Layout from centralized standards
  const { leftX, rightX, topY, bottomY } = SERIES_LAYOUT.frame2D;

  // Battery on left side (vertical orientation) - USE CENTRALIZED CONSTANTS
  const batteryScale = BATTERY_LAYOUT.scale;
  const batteryHalfSpan = BATTERY_LAYOUT.halfSpan2D;
  const batteryCenterY = (topY + bottomY) / 2;
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  // Corner nodes
  const topLeft: Point = { x: leftX, y: topY };
  const topRight: Point = { x: rightX, y: topY };
  const bottomRight: Point = { x: rightX, y: bottomY };
  const bottomLeft: Point = { x: leftX, y: bottomY };

  // Distribute resistors around the circuit based on count
  // Following centralized layout standards:
  // 2 components: R1 top, R2 bottom
  // 3 components: R1 top, R2 right side, R3 bottom
  // 4+ components: distributed evenly (top: ceil(n/3), right: middle, bottom: rest)

  const renderResistors = () => {
    const elements: JSX.Element[] = [];
    // Use centralized margin constants
    const margins = SERIES_LAYOUT.margins;

    if (componentCount === 2) {
      // Two resistors: top and bottom
      const r1Data = componentData.get(componentIds[0]) ?? { label: componentIds[0], value: null };
      const r2Data = componentData.get(componentIds[1]) ?? { label: componentIds[1], value: null };
      const horizontalMargin = margins.twoComponent.horizontal;

      // R1 on top (horizontal) - centered with equal margins
      const r1Start: Point = { x: leftX + horizontalMargin, y: topY };
      const r1End: Point = { x: rightX - horizontalMargin, y: topY };
      elements.push(
        <g key="series-r1-group">
          <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({ key: "series-R1", start: r1Start, end: r1End, label: r1Data.label, value: r1Data.value, orientation: "horizontal" })}
          <line x1={r1End.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </g>
      );

      // R2 on bottom (horizontal) - centered with equal margins
      const r2Start: Point = { x: rightX - horizontalMargin, y: bottomY };
      const r2End: Point = { x: leftX + horizontalMargin, y: bottomY };
      elements.push(
        <g key="series-r2-group">
          <line x1={rightX} y1={bottomY} x2={r2Start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({ key: "series-R2", start: r2Start, end: r2End, label: r2Data.label, value: r2Data.value, orientation: "horizontal", labelOffset: 22 })}
          <line x1={r2End.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </g>
      );

      // Right side wire (connecting top to bottom)
      elements.push(
        <line key="series-right-wire" x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      );
    } else if (componentCount === 3) {
      // Three resistors: top, right side, bottom
      const r1Data = componentData.get(componentIds[0]) ?? { label: componentIds[0], value: null };
      const r2Data = componentData.get(componentIds[1]) ?? { label: componentIds[1], value: null };
      const r3Data = componentData.get(componentIds[2]) ?? { label: componentIds[2], value: null };
      const horizontalMargin = margins.threeComponent.horizontal;
      const verticalMargin = margins.threeComponent.vertical;

      // R1 on top (horizontal) - centered
      const r1Start: Point = { x: leftX + horizontalMargin, y: topY };
      const r1End: Point = { x: rightX - horizontalMargin, y: topY };
      elements.push(
        <g key="series-r1-group">
          <line x1={leftX} y1={topY} x2={r1Start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({ key: "series-R1", start: r1Start, end: r1End, label: r1Data.label, value: r1Data.value, orientation: "horizontal" })}
          <line x1={r1End.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </g>
      );

      // R2 on right side (vertical) - centered vertically with margins
      const r2Start: Point = { x: rightX, y: topY + verticalMargin };
      const r2End: Point = { x: rightX, y: bottomY - verticalMargin };
      elements.push(
        <g key="series-r2-group">
          <line x1={rightX} y1={topY} x2={rightX} y2={r2Start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({ key: "series-R2", start: r2Start, end: r2End, label: r2Data.label, value: r2Data.value, orientation: "vertical", labelSide: "right" })}
          <line x1={rightX} y1={r2End.y} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </g>
      );

      // R3 on bottom (horizontal) - centered
      const r3Start: Point = { x: rightX - horizontalMargin, y: bottomY };
      const r3End: Point = { x: leftX + horizontalMargin, y: bottomY };
      elements.push(
        <g key="series-r3-group">
          <line x1={rightX} y1={bottomY} x2={r3Start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
          {drawResistor({ key: "series-R3", start: r3Start, end: r3End, label: r3Data.label, value: r3Data.value, orientation: "horizontal", labelOffset: 22 })}
          <line x1={r3End.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        </g>
      );
    } else {
      // 4+ resistors: distribute around the rectangle using centralized distribution formula
      // Top row: ceil(n/3), Right side: middle, Bottom row: remaining
      const { getTopCount, getBottomCount, getRightCount } = SERIES_LAYOUT.distribution;
      const topCount = getTopCount(componentCount);
      const bottomCount = getBottomCount(componentCount, topCount);
      const rightCount = getRightCount(componentCount, topCount, bottomCount);

      const topIds = componentIds.slice(0, topCount);
      const rightIds = componentIds.slice(topCount, topCount + rightCount);
      const bottomIds = componentIds.slice(topCount + rightCount);

      // Component margin constraints from centralized standards
      const { marginRatio, maxHorizontal2D } = margins.multiComponent;

      // Top row resistors (horizontal) - evenly distributed
      const topWidth = rightX - leftX - 80;
      const topSpacing = topWidth / topCount;
      const topMargin = Math.min(topSpacing * marginRatio, maxHorizontal2D);
      topIds.forEach((id, index) => {
        const data = componentData.get(id) ?? { label: id, value: null };
        // Apply even distribution with margins
        const startX = leftX + 40 + index * topSpacing + topMargin;
        const endX = leftX + 40 + (index + 1) * topSpacing - topMargin;
        const start: Point = { x: startX, y: topY };
        const end: Point = { x: endX, y: topY };
        elements.push(
          <g key={`series-top-${id}-group`}>
            {index === 0 && <line x1={leftX} y1={topY} x2={start.x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
            {drawResistor({ key: `series-top-${id}`, start, end, label: data.label, value: data.value, orientation: "horizontal" })}
            {index === topIds.length - 1 && <line x1={end.x} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
          </g>
        );
      });

      // Right side resistors (vertical) - evenly distributed
      if (rightIds.length > 0) {
        const rightHeight = bottomY - topY - 60;
        const rightSpacing = rightHeight / rightIds.length;
        const rightMargin = Math.min(rightSpacing * marginRatio, maxHorizontal2D);
        rightIds.forEach((id, index) => {
          const data = componentData.get(id) ?? { label: id, value: null };
          // Apply even distribution with margins
          const startY = topY + 30 + index * rightSpacing + rightMargin;
          const endY = topY + 30 + (index + 1) * rightSpacing - rightMargin;
          const start: Point = { x: rightX, y: startY };
          const end: Point = { x: rightX, y: endY };
          elements.push(
            <g key={`series-right-${id}-group`}>
              {index === 0 && <line x1={rightX} y1={topY} x2={rightX} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
              {drawResistor({ key: `series-right-${id}`, start, end, label: data.label, value: data.value, orientation: "vertical", labelSide: "right" })}
              {index === rightIds.length - 1 && <line x1={rightX} y1={end.y} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
            </g>
          );
        });
      } else {
        // Just a wire on the right side
        elements.push(
          <line key="series-right-wire" x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
        );
      }

      // Bottom row resistors (horizontal, reversed direction) - evenly distributed
      const bottomWidth = rightX - leftX - 80;
      const bottomSpacing = bottomWidth / bottomIds.length;
      const bottomMargin = Math.min(bottomSpacing * marginRatio, maxHorizontal2D);
      bottomIds.forEach((id, index) => {
        const data = componentData.get(id) ?? { label: id, value: null };
        // Apply even distribution with margins (reversed direction)
        const startX = rightX - 40 - index * bottomSpacing - bottomMargin;
        const endX = rightX - 40 - (index + 1) * bottomSpacing + bottomMargin;
        const start: Point = { x: startX, y: bottomY };
        const end: Point = { x: endX, y: bottomY };
        elements.push(
          <g key={`series-bottom-${id}-group`}>
            {index === 0 && <line x1={rightX} y1={bottomY} x2={start.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
            {drawResistor({ key: `series-bottom-${id}`, start, end, label: data.label, value: data.value, orientation: "horizontal", labelOffset: 22 })}
            {index === bottomIds.length - 1 && <line x1={end.x} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />}
          </g>
        );
      });
    }

    return elements;
  };

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

      {/* Corner nodes */}
      {drawNode(topLeft, "series-node-tl")}
      {drawNode(topRight, "series-node-tr")}
      {drawNode(bottomRight, "series-node-br")}
      {drawNode(bottomLeft, "series-node-bl")}

      {/* Battery label on the left, outside the circuit */}
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
};

const ParallelRectDiagram = ({ problem }: DiagramProps) => {
  // Dynamically get component IDs from the problem (supports 2, 3, 4+ resistors)
  const branchIds = problem.components.map(c => c.id);
  const branchCount = branchIds.length;

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
      {/* Right side connection */}
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

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
      )}
    </svg>
  );
};

const CombinationRectDiagram = ({ problem }: DiagramProps) => {
  // Dynamically get component data from the problem
  const componentIds = problem.components.map(c => c.id);
  const componentCount = componentIds.length;
  const sourceData = getComponentLabelWithValue(problem, problem.source.id);

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
  const { leftX, rightX, topY, bottomY } = COMBINATION_LAYOUT.frame2D;

  // Battery using centralized constants
  const batteryScale = BATTERY_LAYOUT.scale;
  const batteryHalfSpan = BATTERY_LAYOUT.halfSpan2D;
  const batteryCenterY = (topY + bottomY) / 2;
  const batteryTopY = batteryCenterY - batteryHalfSpan;
  const batteryBottomY = batteryCenterY + batteryHalfSpan;

  // For double-parallel circuits, render two separate parallel sections
  if (isDoubleParallel) {
    return renderDoubleParallelDiagram(problem, sourceData, componentData, componentIds, {
      leftX, rightX, topY, bottomY, batteryScale, batteryHalfSpan, batteryCenterY, batteryTopY, batteryBottomY
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
      <line x1={r1End.x} y1={topY} x2={branchCenterX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

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
            <line x1={branchCenterX} y1={topY} x2={x} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
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
            <line x1={x} y1={bottomY} x2={branchCenterX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {/* Junction nodes */}
            {drawNode({ x, y: topY }, `combo-parallel-node-top-${id}`)}
            {drawNode({ x, y: bottomY }, `combo-parallel-node-bottom-${id}`)}
          </g>
        );
      })}

      {/* Bottom run with series R4 (if present) */}
      {hasBottomSeries && seriesBottomData ? (
        <>
          <line x1={branchCenterX} y1={bottomY} x2={r4End.x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
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
        <line x1={branchCenterX} y1={bottomY} x2={leftX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      )}

      {/* Right side closing wire (for proper circuit completion) */}
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={branchCenterX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      <line x1={branchCenterX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Corner nodes */}
      {drawNode({ x: leftX, y: topY }, "combo-node-source-top")}
      {drawNode({ x: leftX, y: bottomY }, "combo-node-source-bottom")}
      {drawNode({ x: branchCenterX, y: topY }, "combo-node-branch-top")}
      {drawNode({ x: branchCenterX, y: bottomY }, "combo-node-branch-bottom")}
      {drawNode({ x: rightX, y: topY }, "combo-node-right-top")}
      {drawNode({ x: rightX, y: bottomY }, "combo-node-right-bottom")}

      {/* Battery label on left, outside the circuit */}
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

// Render double-parallel combination diagram with two separate parallel boxes
function renderDoubleParallelDiagram(
  problem: PracticeProblem,
  sourceData: { label: string; value: string | null },
  componentData: Map<string, { label: string; value: string | null }>,
  componentIds: string[],
  layout: {
    leftX: number; rightX: number; topY: number; bottomY: number;
    batteryScale: number; batteryHalfSpan: number; batteryCenterY: number;
    batteryTopY: number; batteryBottomY: number;
  }
) {
  const { leftX, rightX, topY, bottomY, batteryScale, batteryCenterY, batteryTopY, batteryBottomY } = layout;

  // For double-parallel: R1||R2 in first box, R3||R4 in second box
  const box1Ids = [componentIds[0], componentIds[1]];
  const box2Ids = [componentIds[2], componentIds[3]];

  // Box positions from centralized standards
  const { box1CenterX, box2CenterX, branchSpacing } = COMBINATION_LAYOUT.doubleParallel;

  // Resistor offsets from centralized parallel layout standards
  const branchResTop = topY + PARALLEL_LAYOUT.branches.topOffset2D;
  const branchResBottom = bottomY - PARALLEL_LAYOUT.branches.bottomOffset2D;

  return (
    <svg className="diagram-svg" viewBox="0 0 600 240" role="img" aria-label="Double parallel combination circuit diagram" preserveAspectRatio="xMidYMid meet">
      {/* Box 1 indicator */}
      <rect
        x={box1CenterX - branchSpacing - 18}
        y={topY - 8}
        width={branchSpacing * 2 + 36}
        height={bottomY - topY + 16}
        fill="none"
        stroke="rgba(162, 212, 255, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
        ry={6}
      />
      <text x={box1CenterX} y={topY - 16} fill="rgba(162, 212, 255, 0.5)" fontSize={9} textAnchor="middle" fontStyle="italic">
        Box 1
      </text>

      {/* Box 2 indicator */}
      <rect
        x={box2CenterX - branchSpacing - 18}
        y={topY - 8}
        width={branchSpacing * 2 + 36}
        height={bottomY - topY + 16}
        fill="none"
        stroke="rgba(162, 212, 255, 0.25)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
        ry={6}
      />
      <text x={box2CenterX} y={topY - 16} fill="rgba(162, 212, 255, 0.5)" fontSize={9} textAnchor="middle" fontStyle="italic">
        Box 2
      </text>

      {/* Series connection indicator between boxes */}
      <text x={(box1CenterX + box2CenterX) / 2} y={topY - 3} fill="rgba(162, 212, 255, 0.4)" fontSize={10} textAnchor="middle">
        series
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

      {/* Top rail */}
      <line x1={leftX} y1={topY} x2={rightX} y2={topY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {/* Bottom rail */}
      <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
      {/* Right side connection */}
      <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />

      {/* Box 1 branches */}
      {box1Ids.map((id, index) => {
        const x = box1CenterX + (index === 0 ? -branchSpacing / 2 : branchSpacing / 2);
        const data = componentData.get(id) ?? { label: id, value: null };
        const start: Point = { x, y: branchResTop };
        const end: Point = { x, y: branchResBottom };
        const labelSide = index === 0 ? "left" : "right";
        return (
          <g key={`box1-${id}`}>
            <line x1={x} y1={topY} x2={x} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawResistor({
              key: `box1-resistor-${id}`,
              start, end,
              label: data.label,
              value: data.value,
              orientation: "vertical",
              labelSide,
            })}
            <line x1={x} y1={end.y} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawNode({ x, y: topY }, `box1-node-top-${id}`)}
            {drawNode({ x, y: bottomY }, `box1-node-bottom-${id}`)}
          </g>
        );
      })}

      {/* Box 2 branches */}
      {box2Ids.map((id, index) => {
        const x = box2CenterX + (index === 0 ? -branchSpacing / 2 : branchSpacing / 2);
        const data = componentData.get(id) ?? { label: id, value: null };
        const start: Point = { x, y: branchResTop };
        const end: Point = { x, y: branchResBottom };
        const labelSide = index === 0 ? "left" : "right";
        return (
          <g key={`box2-${id}`}>
            <line x1={x} y1={topY} x2={x} y2={start.y} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawResistor({
              key: `box2-resistor-${id}`,
              start, end,
              label: data.label,
              value: data.value,
              orientation: "vertical",
              labelSide,
            })}
            <line x1={x} y1={end.y} x2={x} y2={bottomY} stroke={WIRE_COLOR} strokeWidth={WIRE_STROKE_WIDTH} strokeLinecap="round" />
            {drawNode({ x, y: topY }, `box2-node-top-${id}`)}
            {drawNode({ x, y: bottomY }, `box2-node-bottom-${id}`)}
          </g>
        );
      })}

      {/* Corner nodes */}
      {drawNode({ x: leftX, y: topY }, "double-node-source-top")}
      {drawNode({ x: leftX, y: bottomY }, "double-node-source-bottom")}
      {drawNode({ x: rightX, y: topY }, "double-node-right-top")}
      {drawNode({ x: rightX, y: bottomY }, "double-node-right-bottom")}

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

