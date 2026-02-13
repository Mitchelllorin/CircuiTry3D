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

type SymbolPoint = {
  x: number;
  y: number;
};

type ArrowDirection = "towardStart" | "towardEnd";

const formatPoint = ({ x, y }: SymbolPoint): string => `${x.toFixed(1)},${y.toFixed(1)}`;

const buildArrowPoints = (
  lineStart: SymbolPoint,
  lineEnd: SymbolPoint,
  {
    tipPosition,
    direction,
    length,
    width,
  }: {
    tipPosition: number;
    direction: ArrowDirection;
    length: number;
    width: number;
  }
): string => {
  const clampedTipPosition = Math.max(0, Math.min(1, tipPosition));
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const magnitude = Math.hypot(dx, dy) || 1;

  let tangentX = dx / magnitude;
  let tangentY = dy / magnitude;
  if (direction === "towardStart") {
    tangentX *= -1;
    tangentY *= -1;
  }

  const tipX = lineStart.x + dx * clampedTipPosition;
  const tipY = lineStart.y + dy * clampedTipPosition;
  const baseX = tipX - tangentX * length;
  const baseY = tipY - tangentY * length;
  const normalX = -tangentY;
  const normalY = tangentX;
  const halfWidth = width / 2;

  const leftBase: SymbolPoint = {
    x: baseX + normalX * halfWidth,
    y: baseY + normalY * halfWidth,
  };
  const rightBase: SymbolPoint = {
    x: baseX - normalX * halfWidth,
    y: baseY - normalY * halfWidth,
  };

  return [
    formatPoint({ x: tipX, y: tipY }),
    formatPoint(leftBase),
    formatPoint(rightBase),
  ].join(" ");
};

const BJT_GEOMETRY = {
  bodyRadius: 20,
  baseLeadStart: { x: -30, y: 0 },
  baseLeadEnd: { x: -8, y: 0 },
  baseBarTop: { x: -8, y: -12 },
  baseBarBottom: { x: -8, y: 12 },
  collectorBranchStart: { x: -8, y: -8 },
  collectorBranchJoint: { x: 10, y: -20 },
  collectorLeadEnd: { x: 10, y: -30 },
  emitterBranchStart: { x: -8, y: 8 },
  emitterBranchJoint: { x: 10, y: 20 },
  emitterLeadEnd: { x: 10, y: 30 },
} as const;

const DARLINGTON_GEOMETRY = {
  bodyRadius: 26,
  baseLeadStart: { x: -38, y: 0 },
  baseLeadEnd: { x: -14, y: 0 },
  firstBaseBarTop: { x: -14, y: -8 },
  firstBaseBarBottom: { x: -14, y: 8 },
  firstCollector: { x1: -14, y1: -4, x2: 0, y2: -12 },
  firstEmitter: { x1: -14, y1: 4, x2: 0, y2: 12 },
  interstageVerticalTop: { x: 0, y: 12 },
  interstageVerticalBottom: { x: 0, y: 6 },
  secondBaseBarTop: { x: 0, y: 0 },
  secondBaseBarBottom: { x: 0, y: 12 },
  secondCollector: { x1: 0, y1: 3, x2: 14, y2: -10 },
  secondEmitter: { x1: 0, y1: 9, x2: 14, y2: 22 },
  collectorLeadTop: { x: 14, y: -32 },
  emitterLeadBottom: { x: 14, y: 32 },
} as const;

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
      <polyline
        points="-2,-20 -12,-30 -10,-26"
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="6,-16 -4,-26 -2,-22"
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
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

      <polyline
        points="8,-14 18,-24 22,-20"
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14,-10 24,-20 28,-16"
        stroke={color}
        strokeWidth={strokeWidth * 0.6}
        fill="none"
        strokeLinecap="round"
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
  const arrowPoints = buildArrowPoints(
    BJT_GEOMETRY.emitterBranchStart,
    BJT_GEOMETRY.emitterBranchJoint,
    {
      tipPosition: 0.78,
      direction: "towardEnd",
      length: 7.2,
      width: 5.2,
    }
  );

  return (
    <g transform={transform}>
      <circle cx="0" cy="0" r={BJT_GEOMETRY.bodyRadius} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      <line x1={BJT_GEOMETRY.baseLeadStart.x} y1={BJT_GEOMETRY.baseLeadStart.y} x2={BJT_GEOMETRY.baseLeadEnd.x} y2={BJT_GEOMETRY.baseLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.baseBarTop.x} y1={BJT_GEOMETRY.baseBarTop.y} x2={BJT_GEOMETRY.baseBarBottom.x} y2={BJT_GEOMETRY.baseBarBottom.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1={BJT_GEOMETRY.collectorBranchStart.x} y1={BJT_GEOMETRY.collectorBranchStart.y} x2={BJT_GEOMETRY.collectorBranchJoint.x} y2={BJT_GEOMETRY.collectorBranchJoint.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.collectorBranchJoint.x} y1={BJT_GEOMETRY.collectorBranchJoint.y} x2={BJT_GEOMETRY.collectorLeadEnd.x} y2={BJT_GEOMETRY.collectorLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1={BJT_GEOMETRY.emitterBranchStart.x} y1={BJT_GEOMETRY.emitterBranchStart.y} x2={BJT_GEOMETRY.emitterBranchJoint.x} y2={BJT_GEOMETRY.emitterBranchJoint.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.emitterBranchJoint.x} y1={BJT_GEOMETRY.emitterBranchJoint.y} x2={BJT_GEOMETRY.emitterLeadEnd.x} y2={BJT_GEOMETRY.emitterLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <polygon
        points={arrowPoints}
        fill={color}
        stroke="none"
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
  const arrowPoints = buildArrowPoints(
    BJT_GEOMETRY.emitterBranchStart,
    BJT_GEOMETRY.emitterBranchJoint,
    {
      tipPosition: 0.42,
      direction: "towardStart",
      length: 7.2,
      width: 5.2,
    }
  );

  return (
    <g transform={transform}>
      {/* Outer circle */}
      <circle cx="0" cy="0" r={BJT_GEOMETRY.bodyRadius} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead and vertical bar */}
      <line x1={BJT_GEOMETRY.baseLeadStart.x} y1={BJT_GEOMETRY.baseLeadStart.y} x2={BJT_GEOMETRY.baseLeadEnd.x} y2={BJT_GEOMETRY.baseLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.baseBarTop.x} y1={BJT_GEOMETRY.baseBarTop.y} x2={BJT_GEOMETRY.baseBarBottom.x} y2={BJT_GEOMETRY.baseBarBottom.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Collector (top) - no arrow */}
      <line x1={BJT_GEOMETRY.collectorBranchStart.x} y1={BJT_GEOMETRY.collectorBranchStart.y} x2={BJT_GEOMETRY.collectorBranchJoint.x} y2={BJT_GEOMETRY.collectorBranchJoint.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.collectorBranchJoint.x} y1={BJT_GEOMETRY.collectorBranchJoint.y} x2={BJT_GEOMETRY.collectorLeadEnd.x} y2={BJT_GEOMETRY.collectorLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter (bottom) - arrow points INWARD for PNP */}
      <line x1={BJT_GEOMETRY.emitterBranchStart.x} y1={BJT_GEOMETRY.emitterBranchStart.y} x2={BJT_GEOMETRY.emitterBranchJoint.x} y2={BJT_GEOMETRY.emitterBranchJoint.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={BJT_GEOMETRY.emitterBranchJoint.x} y1={BJT_GEOMETRY.emitterBranchJoint.y} x2={BJT_GEOMETRY.emitterLeadEnd.x} y2={BJT_GEOMETRY.emitterLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* PNP arrow points inward (toward base) */}
      <polygon
        points={arrowPoints}
        fill={color}
        stroke="none"
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
  const firstEmitterArrowPoints = buildArrowPoints(
    { x: DARLINGTON_GEOMETRY.firstEmitter.x1, y: DARLINGTON_GEOMETRY.firstEmitter.y1 },
    { x: DARLINGTON_GEOMETRY.firstEmitter.x2, y: DARLINGTON_GEOMETRY.firstEmitter.y2 },
    {
      tipPosition: 0.76,
      direction: "towardEnd",
      length: 6.6,
      width: 4.8,
    }
  );
  const secondEmitterArrowPoints = buildArrowPoints(
    { x: DARLINGTON_GEOMETRY.secondEmitter.x1, y: DARLINGTON_GEOMETRY.secondEmitter.y1 },
    { x: DARLINGTON_GEOMETRY.secondEmitter.x2, y: DARLINGTON_GEOMETRY.secondEmitter.y2 },
    {
      tipPosition: 0.76,
      direction: "towardEnd",
      length: 6.6,
      width: 4.8,
    }
  );

  return (
    <g transform={transform}>
      {/* Outer circle - larger for Darlington */}
      <circle cx="0" cy="0" r={DARLINGTON_GEOMETRY.bodyRadius} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead */}
      <line x1={DARLINGTON_GEOMETRY.baseLeadStart.x} y1={DARLINGTON_GEOMETRY.baseLeadStart.y} x2={DARLINGTON_GEOMETRY.baseLeadEnd.x} y2={DARLINGTON_GEOMETRY.baseLeadEnd.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* First transistor (input stage) - smaller */}
      <line x1={DARLINGTON_GEOMETRY.firstBaseBarTop.x} y1={DARLINGTON_GEOMETRY.firstBaseBarTop.y} x2={DARLINGTON_GEOMETRY.firstBaseBarBottom.x} y2={DARLINGTON_GEOMETRY.firstBaseBarBottom.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={DARLINGTON_GEOMETRY.firstCollector.x1} y1={DARLINGTON_GEOMETRY.firstCollector.y1} x2={DARLINGTON_GEOMETRY.firstCollector.x2} y2={DARLINGTON_GEOMETRY.firstCollector.y2} stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line x1={DARLINGTON_GEOMETRY.firstEmitter.x1} y1={DARLINGTON_GEOMETRY.firstEmitter.y1} x2={DARLINGTON_GEOMETRY.firstEmitter.x2} y2={DARLINGTON_GEOMETRY.firstEmitter.y2} stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />

      {/* Arrow on first emitter (pointing outward - NPN) */}
      <polygon
        points={firstEmitterArrowPoints}
        fill={color}
        stroke="none"
      />

      {/* Second transistor (output stage) - base connects to first emitter */}
      <line x1={DARLINGTON_GEOMETRY.interstageVerticalTop.x} y1={DARLINGTON_GEOMETRY.interstageVerticalTop.y} x2={DARLINGTON_GEOMETRY.interstageVerticalBottom.x} y2={DARLINGTON_GEOMETRY.interstageVerticalBottom.y} stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line x1={DARLINGTON_GEOMETRY.secondBaseBarTop.x} y1={DARLINGTON_GEOMETRY.secondBaseBarTop.y} x2={DARLINGTON_GEOMETRY.secondBaseBarBottom.x} y2={DARLINGTON_GEOMETRY.secondBaseBarBottom.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={DARLINGTON_GEOMETRY.secondCollector.x1} y1={DARLINGTON_GEOMETRY.secondCollector.y1} x2={DARLINGTON_GEOMETRY.secondCollector.x2} y2={DARLINGTON_GEOMETRY.secondCollector.y2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={DARLINGTON_GEOMETRY.secondEmitter.x1} y1={DARLINGTON_GEOMETRY.secondEmitter.y1} x2={DARLINGTON_GEOMETRY.secondEmitter.x2} y2={DARLINGTON_GEOMETRY.secondEmitter.y2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Arrow on second emitter (pointing outward - NPN) */}
      <polygon
        points={secondEmitterArrowPoints}
        fill={color}
        stroke="none"
      />

      {/* Collector lead (from first transistor collector, joined) */}
      <line x1={DARLINGTON_GEOMETRY.firstCollector.x2} y1={DARLINGTON_GEOMETRY.firstCollector.y2} x2={DARLINGTON_GEOMETRY.secondCollector.x2} y2={DARLINGTON_GEOMETRY.secondCollector.y2} stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" strokeDasharray="2,2" />
      <line x1={DARLINGTON_GEOMETRY.secondCollector.x2} y1={DARLINGTON_GEOMETRY.secondCollector.y2} x2={DARLINGTON_GEOMETRY.collectorLeadTop.x} y2={DARLINGTON_GEOMETRY.collectorLeadTop.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter lead (from second transistor) */}
      <line x1={DARLINGTON_GEOMETRY.secondEmitter.x2} y1={DARLINGTON_GEOMETRY.secondEmitter.y2} x2={DARLINGTON_GEOMETRY.emitterLeadBottom.x} y2={DARLINGTON_GEOMETRY.emitterLeadBottom.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

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
      <line x1="-30" y1="0" x2="-25" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M-25,0 Q-25,-10 -18,-10 Q-11,-10 -11,0 Q-11,10 -4,10 Q3,10 3,0 Q3,-10 10,-10 Q17,-10 17,0 Q17,10 25,10"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        transform="translate(0,-5)"
      />
      <line x1="25" y1="-5" x2="30" y2="-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
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
