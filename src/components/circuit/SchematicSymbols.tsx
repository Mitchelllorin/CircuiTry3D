import type { FC, SVGProps } from "react";
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

  return (
    <g transform={transform}>
      <circle cx="0" cy="0" r="20" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-12" x2="-8" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1="-8" y1="-8" x2="10" y2="-20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="-20" x2="10" y2="-30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <line x1="-8" y1="8" x2="10" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="20" x2="10" y2="30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      <polygon
        points="10,20 5,14 2,22"
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

  return (
    <g transform={transform}>
      {/* Outer circle */}
      <circle cx="0" cy="0" r="20" stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" />

      {/* Base lead and vertical bar */}
      <line x1="-30" y1="0" x2="-8" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-8" y1="-12" x2="-8" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Collector (top) - no arrow */}
      <line x1="-8" y1="-8" x2="10" y2="-20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="-20" x2="10" y2="-30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* Emitter (bottom) - arrow points INWARD for PNP */}
      <line x1="-8" y1="8" x2="10" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="20" x2="10" y2="30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

      {/* PNP arrow points inward (toward base) */}
      <polygon
        points="-5,10 0,16 -3,4"
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

  // Polarity marker positions in local (pre-rotation) coordinates
  // Negative plate is at x=-7, positive plate is at x=7
  // Place markers just outside the plates so they're clearly visible
  // These positions are relative to the component's local coordinate system
  // and will rotate WITH the component, keeping markers next to their respective plates
  const negMarkerX = -7;
  const negMarkerY = 16;  // Below the negative plate
  const posMarkerX = 7;
  const posMarkerY = -24; // Above the positive plate

  return (
    <g transform={transform}>
      {/* Lead wires - horizontal */}
      <line x1="-30" y1="0" x2="-7" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="7" y1="0" x2="30" y2="0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Negative plate (shorter vertical line on left) per style guide */}
      <line x1="-7" y1="-10" x2="-7" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Positive plate (longer, thicker vertical line on right) per style guide */}
      <line x1="7" y1="-18" x2="7" y2="18" stroke={color} strokeWidth={strokeWidth + BATTERY_SPECS.positiveStrokeExtra} strokeLinecap="round" />
      {/* Polarity markings per ANSI/IEEE standard - counter-rotated to stay readable */}
      <text
        x={negMarkerX}
        y={negMarkerY}
        fill={LABEL_COLOR}
        fontSize={LABEL_SPECS.polarityMarkerSize}
        textAnchor="middle"
        fontWeight="bold"
        transform={`rotate(${markerRotation}, ${negMarkerX}, ${negMarkerY})`}
      >
        -
      </text>
      <text
        x={posMarkerX}
        y={posMarkerY}
        fill={LABEL_COLOR}
        fontSize={LABEL_SPECS.polarityMarkerSize}
        textAnchor="middle"
        fontWeight="bold"
        transform={`rotate(${markerRotation}, ${posMarkerX}, ${posMarkerY})`}
      >
        +
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

export type ComponentSymbol =
  | 'resistor'
  | 'capacitor'
  | 'diode'
  | 'led'
  | 'transistor-npn'
  | 'transistor-pnp'
  | 'darlington'
  | 'inductor'
  | 'battery'
  | 'ground'
  | 'switch'
  | 'fuse'
  | 'potentiometer';

export const SCHEMATIC_SYMBOL_MAP: Record<ComponentSymbol, FC<SchematicSymbolProps>> = {
  'resistor': ResistorSymbol,
  'capacitor': CapacitorSymbol,
  'diode': DiodeSymbol,
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
};

export function getSchematicSymbol(type: ComponentSymbol): FC<SchematicSymbolProps> | undefined {
  return SCHEMATIC_SYMBOL_MAP[type];
}
