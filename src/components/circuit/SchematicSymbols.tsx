import type { FC } from "react";
import {
  SCHEMATIC_COLORS,
  STROKE_WIDTHS,
  RESISTOR_SPECS,
  BATTERY_SPECS,
  LABEL_SPECS,
} from "../../schematic/visualConstants";
import {
  DEFAULT_SYMBOL_STANDARD,
  STANDARD_PROFILES,
  resolveSymbolStandard,
  type SymbolStandard,
} from "../../schematic/standards";

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
  isOpen?: boolean;
  standard?: SymbolStandard | string;
};

// Use centralized visual constants
const WIRE_COLOR = SCHEMATIC_COLORS.wire;
const COMPONENT_STROKE = SCHEMATIC_COLORS.componentStroke;
const LABEL_COLOR = SCHEMATIC_COLORS.labelPrimary;
const DEFAULT_STROKE_WIDTH = STROKE_WIDTHS.wireSvgSymbol;
const DEFAULT_SYMBOL_PROFILE = STANDARD_PROFILES[DEFAULT_SYMBOL_STANDARD];

type SvgPoint = { x: number; y: number };

const roundSvgCoord = (value: number): number => Math.round(value * 100) / 100;

const formatSvgPoints = (points: SvgPoint[]): string =>
  points
    .map(({ x, y }) => `${roundSvgCoord(x)},${roundSvgCoord(y)}`)
    .join(" ");

const resolveSymbolProfile = (standard?: SymbolStandard | string) =>
  STANDARD_PROFILES[resolveSymbolStandard(standard)] ?? DEFAULT_SYMBOL_PROFILE;

const interpolateSvgPoint = (from: SvgPoint, to: SvgPoint, ratio: number): SvgPoint => ({
  x: from.x + (to.x - from.x) * ratio,
  y: from.y + (to.y - from.y) * ratio,
});

/**
 * Build a consistently shaped triangular arrowhead aligned to a segment.
 * Direction is explicit so call sites stay semantically obvious.
 */
const buildArrowHead = (
  start: SvgPoint,
  end: SvgPoint,
  direction: "toward-end" | "toward-start" = "toward-end",
  length = 7,
  width = 6,
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const magnitude = Math.hypot(dx, dy);

  if (magnitude < 0.001) {
    return formatSvgPoints([end, end, end]);
  }

  const baseUx = dx / magnitude;
  const baseUy = dy / magnitude;
  const tip = direction === "toward-end" ? end : start;
  const ux = direction === "toward-end" ? baseUx : -baseUx;
  const uy = direction === "toward-end" ? baseUy : -baseUy;

  const baseX = tip.x - ux * length;
  const baseY = tip.y - uy * length;
  const halfWidth = width / 2;

  const px = -uy;
  const py = ux;

  const left = { x: baseX + px * halfWidth, y: baseY + py * halfWidth };
  const right = { x: baseX - px * halfWidth, y: baseY - py * halfWidth };

  return formatSvgPoints([tip, left, right]);
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
  standard,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const profile = resolveSymbolProfile(standard);
  const useIecBody = profile.resistor.bodyStyle === "rectangle";

  return (
    <g transform={transform}>
      {/* Lead wires */}
      <line
        x1={-RESISTOR_SPECS.totalHalfSpan}
        y1={0}
        x2={useIecBody ? -14 : -RESISTOR_SPECS.bodyHalfWidth}
        y2={0}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={useIecBody ? 14 : RESISTOR_SPECS.bodyHalfWidth}
        y1={0}
        x2={RESISTOR_SPECS.totalHalfSpan}
        y2={0}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {useIecBody ? (
        <rect
          x={-14}
          y={-8}
          width={28}
          height={16}
          rx={1.5}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.95}
        />
      ) : (
        // Zigzag body (ANSI/IEEE style, 4-6 peaks)
        <polyline
          points={RESISTOR_SPECS.zigzagPoints}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
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
  standard,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const profile = resolveSymbolProfile(standard);
  const showPolarityMarkers = profile.capacitor.showPolarityMarkers;
  const resolvedLabelOffset = showPolarityMarkers ? labelOffset - 6 : labelOffset;
  const markerStroke = "rgba(12, 32, 64, 0.9)";

  return (
    <g transform={transform}>
      <line x1={-30} y1={0} x2={-8} y2={0} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={-8} y1={-18} x2={-8} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={8} y1={-18} x2={8} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={8} y1={0} x2={30} y2={0} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {showPolarityMarkers && (
        <>
          <text
            x={15}
            y={-22}
            fill={LABEL_COLOR}
            fontSize={LABEL_SPECS.polarityMarkerSize}
            textAnchor="middle"
            fontWeight="bold"
            paintOrder="stroke"
            stroke={markerStroke}
            strokeWidth={0.8}
          >
            +
          </text>
          <text
            x={-15}
            y={24}
            fill={LABEL_COLOR}
            fontSize={LABEL_SPECS.polarityMarkerSize}
            textAnchor="middle"
            fontWeight="bold"
            paintOrder="stroke"
            stroke={markerStroke}
            strokeWidth={0.8}
          >
            −
          </text>
        </>
      )}
      {showLabel && label && (
        <text
          x={0}
          y={resolvedLabelOffset}
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
        points={buildArrowHead(incomingArrow1Start, incomingArrow1End, "toward-end", 4.5, 4)}
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
        points={buildArrowHead(incomingArrow2Start, incomingArrow2End, "toward-end", 4.5, 4)}
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
        points={buildArrowHead(outgoingArrow1Start, outgoingArrow1End, "toward-end", 4.5, 4)}
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
        points={buildArrowHead(outgoingArrow2Start, outgoingArrow2End, "toward-end", 4.5, 4)}
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
  const emitterBranchStart = { x: -8, y: 8 };
  const emitterBranchEnd = { x: 12, y: 20 };
  const npnArrowTail = interpolateSvgPoint(emitterBranchStart, emitterBranchEnd, 0.48);
  const npnArrowTip = interpolateSvgPoint(emitterBranchStart, emitterBranchEnd, 0.78);

  return (
    <g transform={transform}>
      <circle cx="0" cy="0" r="20" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-12" x2="-8" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1="-8" y1="-8" x2="12" y2="-20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="12" y1="-20" x2="30" y2="-30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line
        x1={emitterBranchStart.x}
        y1={emitterBranchStart.y}
        x2={emitterBranchEnd.x}
        y2={emitterBranchEnd.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line x1="12" y1="20" x2="30" y2="30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <polygon
        points={buildArrowHead(npnArrowTail, npnArrowTip, "toward-end", 5.4, 4.6)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.4}
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
  const emitterBranchStart = { x: -8, y: 8 };
  const emitterBranchEnd = { x: 12, y: 20 };
  const pnpArrowSpanStart = interpolateSvgPoint(emitterBranchStart, emitterBranchEnd, 0.32);
  const pnpArrowSpanEnd = interpolateSvgPoint(emitterBranchStart, emitterBranchEnd, 0.86);

  return (
    <g transform={transform}>
      {/* Outer circle */}
      <circle cx="0" cy="0" r="20" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead and vertical bar */}
      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-12" x2="-8" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Collector (top) - no arrow */}
      <line x1="-8" y1="-8" x2="12" y2="-20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="12" y1="-20" x2="30" y2="-30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter (bottom) - arrow points INWARD for PNP */}
      <line
        x1={emitterBranchStart.x}
        y1={emitterBranchStart.y}
        x2={emitterBranchEnd.x}
        y2={emitterBranchEnd.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line x1="12" y1="20" x2="30" y2="30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* PNP arrow points inward (toward base/emitter junction) */}
      <polygon
        points={buildArrowHead(pnpArrowSpanStart, pnpArrowSpanEnd, "toward-start", 5.4, 4.6)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.4}
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
  const firstEmitterStart = { x: -14, y: 4 };
  const firstEmitterEnd = { x: 0, y: 12 };
  const secondEmitterStart = { x: 0, y: 9 };
  const secondEmitterEnd = { x: 14, y: 22 };

  return (
    <g transform={transform}>
      {/* Outer circle - larger for Darlington */}
      <circle cx="0" cy="0" r="26" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead */}
      <line x1="-38" y1="0" x2="-14" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* First transistor (input stage) - smaller */}
      <line x1="-14" y1="-8" x2="-14" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-14" y1="-4" x2="0" y2="-12" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line
        x1={firstEmitterStart.x}
        y1={firstEmitterStart.y}
        x2={firstEmitterEnd.x}
        y2={firstEmitterEnd.y}
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
      />

      {/* Arrow on first emitter (pointing outward - NPN) */}
      <polygon
        points={buildArrowHead(firstEmitterStart, firstEmitterEnd, "toward-end", 4.8, 4.2)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.35}
        strokeLinejoin="round"
      />

      {/* Second transistor (output stage) - base connects to first emitter */}
      <line x1="0" y1="12" x2="0" y2="6" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="3" x2="14" y2="-10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line
        x1={secondEmitterStart.x}
        y1={secondEmitterStart.y}
        x2={secondEmitterEnd.x}
        y2={secondEmitterEnd.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Arrow on second emitter (pointing outward - NPN) */}
      <polygon
        points={buildArrowHead(secondEmitterStart, secondEmitterEnd, "toward-end", 4.8, 4.2)}
        fill={color}
        stroke={color}
        strokeWidth={strokeWidth * 0.35}
        strokeLinejoin="round"
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
        d="M-24,0 C-24,-8 -16,-8 -16,0 C-16,8 -8,8 -8,0 C-8,-8 0,-8 0,0 C0,8 8,8 8,0 C8,-8 16,-8 16,0 C16,8 24,8 24,0"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  standard,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  const profile = resolveSymbolProfile(standard);

  // Counter-rotate the markers so text remains upright and readable
  const markerRotation = -rotation;

  // Marker placement keeps polarity labels adjacent to matching plates.
  const positiveMarkerX = 11;
  const negativeMarkerX = -11;
  const posMarkerY = -24;
  const negMarkerY = 24;
  const markerStroke = "rgba(12, 32, 64, 0.9)";

  return (
    <g transform={transform}>
      {/* Lead wires - horizontal */}
      <line x1="-30" y1="0" x2="-7" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="7" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Negative plate (shorter vertical line on left) per style guide */}
      <line x1="-7" y1="-10" x2="-7" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Positive plate (longer, thicker vertical line on right) per style guide */}
      <line x1="7" y1="-18" x2="7" y2="18" stroke={color} strokeWidth={strokeWidth + BATTERY_SPECS.positiveStrokeExtra} strokeLinecap="round" />
      {/* Polarity markings are standard-profile dependent (ANSI/IEEE shows them). */}
      {profile.battery.showPolarityMarkers && (
        <>
          <text
            x={positiveMarkerX}
            y={posMarkerY}
            fill={LABEL_COLOR}
            fontSize={LABEL_SPECS.polarityMarkerSize}
            textAnchor="middle"
            fontWeight="bold"
            paintOrder="stroke"
            stroke={markerStroke}
            strokeWidth={0.8}
            transform={`rotate(${markerRotation}, ${positiveMarkerX}, ${posMarkerY})`}
          >
            +
          </text>
          <text
            x={negativeMarkerX}
            y={negMarkerY}
            fill={LABEL_COLOR}
            fontSize={LABEL_SPECS.polarityMarkerSize}
            textAnchor="middle"
            fontWeight="bold"
            paintOrder="stroke"
            stroke={markerStroke}
            strokeWidth={0.8}
            transform={`rotate(${markerRotation}, ${negativeMarkerX}, ${negMarkerY})`}
          >
            −
          </text>
        </>
      )}
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset - 16}
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
        d="M-12,0 C-8,-8 -4,8 0,0 C4,-8 8,8 12,0"
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
