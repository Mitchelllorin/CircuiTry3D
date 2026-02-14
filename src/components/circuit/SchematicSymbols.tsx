import type { FC } from "react";
import {
  SCHEMATIC_COLORS,
  STROKE_WIDTHS,
  RESISTOR_SPECS,
  BATTERY_SPECS,
  LABEL_SPECS,
} from "../../schematic/visualConstants";

export type SchematicSymbolProps = {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  label?: string;
  showLabel?: boolean;
  labelOffset?: number;
  color?: string;
  strokeWidth?: number;
};

// Use centralized visual constants
const WIRE_COLOR = SCHEMATIC_COLORS.wire;
const COMPONENT_STROKE = SCHEMATIC_COLORS.componentStroke;
const LABEL_COLOR = SCHEMATIC_COLORS.labelPrimary;
const DEFAULT_STROKE_WIDTH = STROKE_WIDTHS.wireSvgSymbol;

type SvgPoint = {
  x: number;
  y: number;
};

const TRANSISTOR_GEOMETRY = {
  bodyRadius: 20,
  baseLeadStartX: -30,
  baseLeadEndX: -8,
  baseBarTopY: -12,
  baseBarBottomY: 12,
  collectorInner: { x: -8, y: -8 },
  collectorOuter: { x: 10, y: -20 },
  collectorLeadY: -30,
  emitterInner: { x: -8, y: 8 },
  emitterOuter: { x: 10, y: 20 },
  emitterLeadY: 30,
} as const;

const pointOnLine = (start: SvgPoint, end: SvgPoint, t: number): SvgPoint => ({
  x: start.x + (end.x - start.x) * t,
  y: start.y + (end.y - start.y) * t,
});

const formatSvgNumber = (value: number): string => Number(value.toFixed(2)).toString();

const buildArrowHeadPoints = (
  tail: SvgPoint,
  tip: SvgPoint,
  length = 6,
  width = 4
): string => {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const magnitude = Math.hypot(dx, dy) || 1;
  const ux = dx / magnitude;
  const uy = dy / magnitude;
  const perpendicularX = -uy;
  const perpendicularY = ux;
  const baseX = tip.x - ux * length;
  const baseY = tip.y - uy * length;
  const leftX = baseX + perpendicularX * (width / 2);
  const leftY = baseY + perpendicularY * (width / 2);
  const rightX = baseX - perpendicularX * (width / 2);
  const rightY = baseY - perpendicularY * (width / 2);

  return [
    `${formatSvgNumber(tip.x)},${formatSvgNumber(tip.y)}`,
    `${formatSvgNumber(leftX)},${formatSvgNumber(leftY)}`,
    `${formatSvgNumber(rightX)},${formatSvgNumber(rightY)}`,
  ].join(" ");
};

export const ResistorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      {/* Lead wires */}
      <line x1={-RESISTOR_SPECS.totalHalfSpan} y1="0" x2={-RESISTOR_SPECS.bodyHalfWidth} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={RESISTOR_SPECS.bodyHalfWidth} y1="0" x2={RESISTOR_SPECS.totalHalfSpan} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Zigzag body (4-6 peaks per style guide) */}
      <polyline
        points={RESISTOR_SPECS.zigzagPoints}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const CapacitorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-18" x2="-8" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="-18" x2="8" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const DiodeSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-10" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polygon
        points="-10,-12 -10,12 10,0"
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
      />
      <line x1="10" y1="-12" x2="10" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const ZenerDiodeSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-10" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polygon
        points="-10,-12 -10,12 10,0"
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
      />
      {/* Zener cathode "bent" line */}
      <polyline
        points="10,-12 14,-12 6,12 10,12"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="10" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const PhotodiodeSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const incomingArrow1Start = { x: -16, y: -32 };
  const incomingArrow1End = { x: -5, y: -21 };
  const incomingArrow2Start = { x: -8, y: -28 };
  const incomingArrow2End = { x: 3, y: -17 };

  return (
    <g transform={transform}>
      {/* Diode body */}
      <line x1="-30" y1="0" x2="-10" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polygon
        points="-10,-12 -10,12 10,0"
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
      />
      <line x1="10" y1="-12" x2="10" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Incoming light arrows */}
      <line
        x1={incomingArrow1Start.x}
        y1={incomingArrow1Start.y}
        x2={incomingArrow1End.x}
        y2={incomingArrow1End.y}
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
      />
      <polygon
        points={buildArrowHeadPoints(incomingArrow1Start, incomingArrow1End, 4.5, 4)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.2}
        strokeLinejoin="round"
      />
      <line
        x1={incomingArrow2Start.x}
        y1={incomingArrow2Start.y}
        x2={incomingArrow2End.x}
        y2={incomingArrow2End.y}
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
      />
      <polygon
        points={buildArrowHeadPoints(incomingArrow2Start, incomingArrow2End, 4.5, 4)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.2}
        strokeLinejoin="round"
      />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const LEDSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const outgoingArrow1Start = { x: 8, y: -14 };
  const outgoingArrow1End = { x: 20, y: -26 };
  const outgoingArrow2Start = { x: 14, y: -10 };
  const outgoingArrow2End = { x: 26, y: -22 };

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-10" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polygon
        points="-10,-12 -10,12 10,0"
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
      />
      <line x1="10" y1="-12" x2="10" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line
        x1={outgoingArrow1Start.x}
        y1={outgoingArrow1Start.y}
        x2={outgoingArrow1End.x}
        y2={outgoingArrow1End.y}
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
      />
      <polygon
        points={buildArrowHeadPoints(outgoingArrow1Start, outgoingArrow1End, 4.5, 4)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.2}
        strokeLinejoin="round"
      />
      <line
        x1={outgoingArrow2Start.x}
        y1={outgoingArrow2Start.y}
        x2={outgoingArrow2End.x}
        y2={outgoingArrow2End.y}
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
      />
      <polygon
        points={buildArrowHeadPoints(outgoingArrow2Start, outgoingArrow2End, 4.5, 4)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.2}
        strokeLinejoin="round"
      />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset - 8}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const ThermistorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1={-RESISTOR_SPECS.totalHalfSpan} y1="0" x2={-RESISTOR_SPECS.bodyHalfWidth} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={RESISTOR_SPECS.bodyHalfWidth} y1="0" x2={RESISTOR_SPECS.totalHalfSpan} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <polyline
        points={RESISTOR_SPECS.zigzagPoints}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Temperature slash */}
      <line x1="-12" y1="-18" x2="12" y2="18" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
      {/* Small "T" hint */}
      <text x="16" y="-10" textAnchor="middle" fill={color} fontSize={10} fontWeight={700}>
        T
      </text>
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const CeramicCapacitorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-18" x2="-8" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="-18" x2="8" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* non-polar hint */}
      <circle cx="0" cy="0" r="2" fill={color} opacity={0.35} />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const CrystalSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-16" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="16" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Crystal plates + resonator */}
      <line x1="-16" y1="-14" x2="-16" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="16" y1="-14" x2="16" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <rect x="-10" y="-14" width="20" height="28" fill="none" stroke={color} strokeWidth={strokeWidth * 0.9} rx="2" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const TransistorNPNSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -25,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const emitterArrowTail = pointOnLine(TRANSISTOR_GEOMETRY.emitterInner, TRANSISTOR_GEOMETRY.emitterOuter, 0.5);
  const emitterArrowTip = pointOnLine(TRANSISTOR_GEOMETRY.emitterInner, TRANSISTOR_GEOMETRY.emitterOuter, 0.8);

  return (
    <g transform={transform}>
      <circle cx="0" cy="0" r={TRANSISTOR_GEOMETRY.bodyRadius} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      <line x1={TRANSISTOR_GEOMETRY.baseLeadStartX} y1="0" x2={TRANSISTOR_GEOMETRY.baseLeadEndX} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.baseLeadEndX} y1={TRANSISTOR_GEOMETRY.baseBarTopY} x2={TRANSISTOR_GEOMETRY.baseLeadEndX} y2={TRANSISTOR_GEOMETRY.baseBarBottomY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1={TRANSISTOR_GEOMETRY.collectorInner.x} y1={TRANSISTOR_GEOMETRY.collectorInner.y} x2={TRANSISTOR_GEOMETRY.collectorOuter.x} y2={TRANSISTOR_GEOMETRY.collectorOuter.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.collectorOuter.x} y1={TRANSISTOR_GEOMETRY.collectorOuter.y} x2={TRANSISTOR_GEOMETRY.collectorOuter.x} y2={TRANSISTOR_GEOMETRY.collectorLeadY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1={TRANSISTOR_GEOMETRY.emitterInner.x} y1={TRANSISTOR_GEOMETRY.emitterInner.y} x2={TRANSISTOR_GEOMETRY.emitterOuter.x} y2={TRANSISTOR_GEOMETRY.emitterOuter.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.emitterOuter.x} y1={TRANSISTOR_GEOMETRY.emitterOuter.y} x2={TRANSISTOR_GEOMETRY.emitterOuter.x} y2={TRANSISTOR_GEOMETRY.emitterLeadY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <polygon
        points={buildArrowHeadPoints(emitterArrowTail, emitterArrowTip, 5.5, 5)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.25}
        strokeLinejoin="round"
      />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const TransistorPNPSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -25,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const emitterArrowTail = pointOnLine(TRANSISTOR_GEOMETRY.emitterInner, TRANSISTOR_GEOMETRY.emitterOuter, 0.78);
  const emitterArrowTip = pointOnLine(TRANSISTOR_GEOMETRY.emitterInner, TRANSISTOR_GEOMETRY.emitterOuter, 0.52);

  return (
    <g transform={transform}>
      {/* Outer circle */}
      <circle cx="0" cy="0" r={TRANSISTOR_GEOMETRY.bodyRadius} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead and vertical bar */}
      <line x1={TRANSISTOR_GEOMETRY.baseLeadStartX} y1="0" x2={TRANSISTOR_GEOMETRY.baseLeadEndX} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.baseLeadEndX} y1={TRANSISTOR_GEOMETRY.baseBarTopY} x2={TRANSISTOR_GEOMETRY.baseLeadEndX} y2={TRANSISTOR_GEOMETRY.baseBarBottomY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Collector (top) - no arrow */}
      <line x1={TRANSISTOR_GEOMETRY.collectorInner.x} y1={TRANSISTOR_GEOMETRY.collectorInner.y} x2={TRANSISTOR_GEOMETRY.collectorOuter.x} y2={TRANSISTOR_GEOMETRY.collectorOuter.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.collectorOuter.x} y1={TRANSISTOR_GEOMETRY.collectorOuter.y} x2={TRANSISTOR_GEOMETRY.collectorOuter.x} y2={TRANSISTOR_GEOMETRY.collectorLeadY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter (bottom) - arrow points INWARD for PNP */}
      <line x1={TRANSISTOR_GEOMETRY.emitterInner.x} y1={TRANSISTOR_GEOMETRY.emitterInner.y} x2={TRANSISTOR_GEOMETRY.emitterOuter.x} y2={TRANSISTOR_GEOMETRY.emitterOuter.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={TRANSISTOR_GEOMETRY.emitterOuter.x} y1={TRANSISTOR_GEOMETRY.emitterOuter.y} x2={TRANSISTOR_GEOMETRY.emitterOuter.x} y2={TRANSISTOR_GEOMETRY.emitterLeadY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* PNP arrow points inward (toward base) */}
      <polygon
        points={buildArrowHeadPoints(emitterArrowTail, emitterArrowTip, 5.5, 5)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.25}
        strokeLinejoin="round"
      />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const DarlingtonPairSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -32,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      {/* Outer circle - larger for Darlington */}
      <circle cx="0" cy="0" r="26" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead */}
      <line x1="-38" y1="0" x2="-14" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* First transistor (input stage) - smaller */}
      <line x1="-14" y1="-8" x2="-14" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-14" y1="-4" x2="0" y2="-12" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line x1="-14" y1="4" x2="0" y2="12" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />

      {/* Arrow on first emitter (pointing outward - NPN) */}
      <polygon
        points="0,12 -4,7 -6,13"
        fill={color}
        stroke={color}
        strokeWidth={1}
      />

      {/* Second transistor (output stage) - base connects to first emitter */}
      <line x1="0" y1="12" x2="0" y2="6" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="3" x2="14" y2="-10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="9" x2="14" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Arrow on second emitter (pointing outward - NPN) */}
      <polygon
        points="14,22 9,17 7,23"
        fill={color}
        stroke={color}
        strokeWidth={1}
      />

      {/* Collector lead (from first transistor collector, joined) */}
      <line x1="0" y1="-12" x2="14" y2="-10" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" strokeDasharray="2,2" />
      <line x1="14" y1="-10" x2="14" y2="-32" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter lead (from second transistor) */}
      <line x1="14" y1="22" x2="14" y2="32" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const InductorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-24" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M-24,0 Q-20,-8 -16,0 Q-12,8 -8,0 Q-4,-8 0,0 Q4,8 8,0 Q12,-8 16,0 Q20,8 24,0"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <line x1="24" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const BatterySymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = WIRE_COLOR,
  strokeWidth = STROKE_WIDTHS.componentDetail,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  // Counter-rotate the markers so text remains upright and readable
  const markerRotation = -rotation;

  // Polarity marker positions - centered above and below the battery symbol (our standard)
  // Positioned at the center of the battery (x=0), with + above and - below
  const polarityMarkerX = 0;
  const posMarkerY = -24; // Above the battery (positive)
  const negMarkerY = 24;  // Below the battery (negative)

  return (
    <g transform={transform}>
      {/* Lead wires - horizontal */}
      <line x1="-30" y1="0" x2="-7" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="7" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Negative plate (shorter vertical line on left) per style guide */}
      <line x1="-7" y1="-10" x2="-7" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Positive plate (longer, thicker vertical line on right) per style guide */}
      <line x1="7" y1="-18" x2="7" y2="18" stroke={color} strokeWidth={strokeWidth + BATTERY_SPECS.positiveStrokeExtra} strokeLinecap="round" />
      {/* Polarity markings - centered above (+) and below (-) the battery (our standard) */}
      <text
        x={polarityMarkerX}
        y={posMarkerY}
        fill={LABEL_COLOR}
        fontSize={LABEL_SPECS.polarityMarkerSize}
        textAnchor="middle"
        fontWeight="bold"
        transform={`rotate(${markerRotation}, ${polarityMarkerX}, ${posMarkerY})`}
      >
        +
      </text>
      <text
        x={polarityMarkerX}
        y={negMarkerY}
        fill={LABEL_COLOR}
        fontSize={LABEL_SPECS.polarityMarkerSize}
        textAnchor="middle"
        fontWeight="bold"
        transform={`rotate(${markerRotation}, ${polarityMarkerX}, ${negMarkerY})`}
      >
        −
      </text>
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset - 10}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const GroundSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      {/* Three progressively shorter bars per style guide */}
      <line x1="0" y1="-15" x2="0" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-15" y1="0" x2="15" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-10" y1="5" x2="10" y2="5" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
      <line x1="-5" y1="10" x2="5" y2="10" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={18}
          y={5}
          textAnchor="start"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const SwitchSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  ...props
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const isOpen = (props as any).isOpen ?? false;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="-8" cy="0" r="3" fill={color} />

      {isOpen ? (
        <line x1="-8" y1="0" x2="8" y2="-15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : (
        <line x1="-8" y1="0" x2="8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}

      <circle cx="8" cy="0" r="3" fill={color} />
      <line x1="8" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const FuseSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-15" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <rect
        x="-15"
        y="-8"
        width="30"
        height="16"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
        fill="none"
      />
      <line x1="-8" y1="0" x2="8" y2="0" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" />
      <line x1="15" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const PotentiometerSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -25,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;

  return (
    <g transform={transform}>
      {/* Lead wires */}
      <line x1={-RESISTOR_SPECS.totalHalfSpan} y1="0" x2={-RESISTOR_SPECS.bodyHalfWidth} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={RESISTOR_SPECS.bodyHalfWidth} y1="0" x2={RESISTOR_SPECS.totalHalfSpan} y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Zigzag body using centralized constants */}
      <polyline
        points={RESISTOR_SPECS.zigzagPoints}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <line x1="0" y1="-18" x2="0" y2="-5" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
      <polygon
        points="0,-5 -4,-10 4,-10"
        fill={color}
        stroke={color}
      />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const ACSourceSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-18" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="18" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="0" cy="0" r="16" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <path
        d="M-10,0 C-6,-8 -2,8 2,0 C6,-8 10,8 14,0"
        stroke={color}
        strokeWidth={strokeWidth * 0.85}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const LampSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-16" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="16" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="0" cy="0" r="14" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <line x1="-9" y1="-9" x2="9" y2="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-9" y1="9" x2="9" y2="-9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const MotorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-16" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="16" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="0" cy="0" r="14" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fill={color}
        fontSize={16}
        fontWeight={800}
        style={{ userSelect: "none" }}
      >
        M
      </text>
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const SpeakerSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-18" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Simple speaker cone */}
      <polygon
        points="-18,-10 -6,-10 6,0 -6,10 -18,10"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Sound waves */}
      <path
        d="M10,-6 Q16,0 10,6"
        stroke={color}
        strokeWidth={strokeWidth * 0.85}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M16,-10 Q26,0 16,10"
        stroke={color}
        strokeWidth={strokeWidth * 0.75}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      <line x1="18" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const OpAmpSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -26,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      {/* Triangle body */}
      <polygon
        points="-12,-16 -12,16 18,0"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Inputs */}
      <line x1="-30" y1="-8" x2="-12" y2="-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-30" y1="8" x2="-12" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Output */}
      <line x1="18" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* + / - markers */}
      <text x="-20" y="-4" textAnchor="middle" fill={color} fontSize={12} fontWeight={800}>
        -
      </text>
      <text x="-20" y="12" textAnchor="middle" fill={color} fontSize={12} fontWeight={800}>
        +
      </text>
      {showLabel && label && (
        <text
          x={2}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const TransformerSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -24,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      {/* Leads */}
      <line x1="-30" y1="-8" x2="-18" y2="-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-30" y1="8" x2="-18" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="18" y1="-8" x2="30" y2="-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="18" y1="8" x2="30" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Coils */}
      <path
        d="M-18,-14 Q-10,-14 -10,-8 Q-10,-2 -18,-2"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-18,2 Q-10,2 -10,8 Q-10,14 -18,14"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M18,-14 Q10,-14 10,-8 Q10,-2 18,-2"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M18,2 Q10,2 10,8 Q10,14 18,14"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />

      {/* Core bars */}
      <line x1="-4" y1="-16" x2="-4" y2="16" stroke={color} strokeWidth={strokeWidth * 0.75} strokeLinecap="round" />
      <line x1="4" y1="-16" x2="4" y2="16" stroke={color} strokeWidth={strokeWidth * 0.75} strokeLinecap="round" />

      {showLabel && label && (
        <text
          x={0}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const MOSFETSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -24,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      {/* Drain/Source channel */}
      <line x1="8" y1="-16" x2="8" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Gate */}
      <line x1="-12" y1="-10" x2="-12" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-30" y1="0" x2="-12" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-12" y1="0" x2="2" y2="0" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" strokeDasharray="2,2" />
      {/* Drain/Source leads */}
      <line x1="8" y1="-16" x2="30" y2="-16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="16" x2="30" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showLabel && label && (
        <text
          x={4}
          y={labelOffset}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={LABEL_SPECS.componentLabelSize}
          fontWeight={LABEL_SPECS.labelWeight}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const JunctionSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  color = COMPONENT_STROKE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  return (
    <g transform={transform}>
      <line x1="-30" y1="0" x2="-6" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="6" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="0" cy="0" r="5" fill={color} />
    </g>
  );
};

export type ComponentSymbol =
  | 'resistor'
  | 'capacitor'
  | 'capacitor-ceramic'
  | 'diode'
  | 'zener-diode'
  | 'photodiode'
  | 'led'
  | 'transistor-npn'
  | 'transistor-pnp'
  | 'darlington'
  | 'inductor'
  | 'battery'
  | 'ground'
  | 'switch'
  | 'fuse'
  | 'potentiometer'
  | 'ac_source'
  | 'lamp'
  | 'motor'
  | 'speaker'
  | 'opamp'
  | 'transformer'
  | 'mosfet'
  | 'thermistor'
  | 'crystal'
  | 'junction';

export const SCHEMATIC_SYMBOL_MAP: Record<ComponentSymbol, FC<SchematicSymbolProps>> = {
  'resistor': ResistorSymbol,
  'capacitor': CapacitorSymbol,
  'capacitor-ceramic': CeramicCapacitorSymbol,
  'diode': DiodeSymbol,
  'zener-diode': ZenerDiodeSymbol,
  'photodiode': PhotodiodeSymbol,
  'led': LEDSymbol,
  'transistor-npn': TransistorNPNSymbol,
  'transistor-pnp': TransistorPNPSymbol,
  'darlington': DarlingtonPairSymbol,
  'inductor': InductorSymbol,
  'battery': BatterySymbol,
  'ground': GroundSymbol,
  'switch': SwitchSymbol,
  'fuse': FuseSymbol,
  'potentiometer': PotentiometerSymbol,
  'ac_source': ACSourceSymbol,
  'lamp': LampSymbol,
  'motor': MotorSymbol,
  'speaker': SpeakerSymbol,
  'opamp': OpAmpSymbol,
  'transformer': TransformerSymbol,
  'mosfet': MOSFETSymbol,
  'thermistor': ThermistorSymbol,
  'crystal': CrystalSymbol,
  'junction': JunctionSymbol,
};

export function getSchematicSymbol(type: ComponentSymbol): FC<SchematicSymbolProps> | undefined {
  return SCHEMATIC_SYMBOL_MAP[type];
}
