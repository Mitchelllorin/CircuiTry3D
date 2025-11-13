import type { FC, SVGProps } from "react";

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

const WIRE_COLOR = "rgba(162, 212, 255, 0.9)";
const COMPONENT_STROKE = "rgba(148, 208, 255, 0.9)";
const LABEL_COLOR = "#d6ecff";

export const ResistorSymbol: FC<SchematicSymbolProps> = ({
  x,
  y,
  rotation = 0,
  scale = 1,
  label,
  showLabel = true,
  labelOffset = -18,
  color = COMPONENT_STROKE,
  strokeWidth = 3.2,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  
  return (
    <g transform={transform}>
      <polyline
        points="-30,0 -20,0 -15,-12 -5,12 5,-12 15,12 20,0 30,0"
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  
  return (
    <g transform={transform}>
      <line x1="-20" y1="-6" x2="20" y2="-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="-28" y1="8" x2="28" y2="8" stroke={color} strokeWidth={strokeWidth + 2} strokeLinecap="round" />
      <text x={-24} y={-12} fill={LABEL_COLOR} fontSize={12} textAnchor="middle">
        -
      </text>
      <text x={24} y={-12} fill={LABEL_COLOR} fontSize={12} textAnchor="middle">
        +
      </text>
      {showLabel && label && (
        <text
          x={0}
          y={labelOffset - 8}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  
  return (
    <g transform={transform}>
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
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
          fontSize={13}
          fontWeight={600}
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
  strokeWidth = 3.2,
}) => {
  const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`;
  
  return (
    <g transform={transform}>
      <polyline
        points="-30,0 -20,0 -15,-12 -5,12 5,-12 15,12 20,0 30,0"
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
          fontSize={13}
          fontWeight={600}
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
