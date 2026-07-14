import { memo, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, PointerEventHandler } from "react";
import {
  LABEL_OFFSET_UNITS,
  NODE_RADIUS_UNITS,
  RESISTOR_AMPLITUDE_UNITS,
  RESISTOR_ZIG_COUNT,
  STROKE_WIDTH_UNITS
} from "./config";
import {
  BOARD_VIEWBOX,
  distance,
  formatSvgPoint,
  getViewBoxString,
  midpoint,
  pointKey,
  toSvgPoint
} from "./geometry";
import type {
  GroundElement,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement
} from "./types";

type PointerHandler = (event: ReactPointerEvent<SVGElement>, elementId: string) => void;

export type SchematicSvgProps = {
  elements: SchematicElement[];
  previewElement?: SchematicElement | null;
  selectedElementId?: string | null;
  draftAnchor?: Vec2 | null;
  hoverPoint?: Vec2 | null;
  className?: string;
  width?: number | string;
  height?: number | string;
  onPointerDown?: PointerEventHandler<SVGSVGElement>;
  onPointerMove?: PointerEventHandler<SVGSVGElement>;
  onPointerLeave?: PointerEventHandler<SVGSVGElement>;
  onElementPointerDown?: PointerHandler;
};

type DrawCommand = {
  id: string;
  element: SchematicElement;
  isSelected: boolean;
  strokeDasharray?: string;
  opacity?: number;
};

const STROKE_COLOR = "#0f172a";
const HIGHLIGHT_COLOR = "#0b57d0";
const PREVIEW_COLOR = "#94a3b8";
const NODE_FILL = "#0f172a";

const defaultWidth = "100%" as const;
const defaultHeight = "100%" as const;

const isWire = (element: SchematicElement): element is WireElement => element.kind === "wire";
const isGround = (element: SchematicElement): element is GroundElement => element.kind === "ground";
const isTwoTerminal = (element: SchematicElement): element is TwoTerminalElement =>
  !isWire(element) && !isGround(element);

const toPolylinePoints = (points: Vec2[]) => points.map(formatSvgPoint).join(" ");

const buildResistorPoints = (element: TwoTerminalElement): Vec2[] => {
  const { start, end, orientation } = element;
  const points: Vec2[] = [];
  const horizontal = orientation === "horizontal";
  const total = horizontal ? end.x - start.x : end.z - start.z;
  const direction = total >= 0 ? 1 : -1;
  const length = Math.abs(total);
  const lead = Math.min(length * 0.2, 0.6);
  const bodyLength = Math.max(length - lead * 2, 0.8);
  const segment = bodyLength / RESISTOR_ZIG_COUNT;
  const amplitude = Math.min(RESISTOR_AMPLITUDE_UNITS, bodyLength * 0.4);

  const advance = (offset: number): Vec2 =>
    horizontal
      ? { x: start.x + direction * offset, z: start.z }
      : { x: start.x, z: start.z + direction * offset };

  const zigPoint = (offset: number, sign: 1 | -1): Vec2 =>
    horizontal
      ? { x: start.x + direction * offset, z: start.z + amplitude * sign }
      : { x: start.x + amplitude * sign, z: start.z + direction * offset };

  points.push(start);
  points.push(advance(lead));

  for (let i = 0; i < RESISTOR_ZIG_COUNT; i += 1) {
    const baseOffset = lead + segment * i;
    const midOffset = baseOffset + segment / 2;
    const sign = (i % 2 === 0 ? 1 : -1) as 1 | -1;
    points.push(zigPoint(midOffset, sign));
    points.push(advance(baseOffset + segment));
  }

  points.push(advance(length));
  points.push(end);

  return points;
};

const buildWirePoints = (element: WireElement): Vec2[] => element.path;

const buildCapacitorGeometry = (element: TwoTerminalElement) => {
  const { start, end, orientation } = element;
  const horizontal = orientation === "horizontal";
  const total = horizontal ? end.x - start.x : end.z - start.z;
  const direction = total >= 0 ? 1 : -1;
  const length = Math.abs(total);
  const lead = Math.min(length * 0.25, 0.7);
  const gap = Math.min(length * 0.2, 0.5);
  const plateLength = horizontal ? 2.0 : 2.0;

  const leadStart = horizontal
    ? { x: start.x + direction * lead, z: start.z }
    : { x: start.x, z: start.z + direction * lead };
  const leadEnd = horizontal
    ? { x: end.x - direction * lead, z: end.z }
    : { x: end.x, z: end.z - direction * lead };

  const plateA = horizontal
    ? { x: leadStart.x, z: start.z - plateLength / 2 }
    : { x: start.x - plateLength / 2, z: leadStart.z };
  const plateB = horizontal
    ? { x: leadEnd.x, z: end.z - plateLength / 2 }
    : { x: end.x - plateLength / 2, z: leadEnd.z };

  const plateA2 = horizontal
    ? { x: leadStart.x, z: start.z + plateLength / 2 }
    : { x: start.x + plateLength / 2, z: leadStart.z };
  const plateB2 = horizontal
    ? { x: leadEnd.x, z: end.z + plateLength / 2 }
    : { x: end.x + plateLength / 2, z: leadEnd.z };

  const gapOffset = gap / 2;
  const connectorA = horizontal
    ? { x: leadStart.x - direction * gapOffset, z: start.z }
    : { x: start.x, z: leadStart.z - direction * gapOffset };
  const connectorB = horizontal
    ? { x: leadEnd.x + direction * gapOffset, z: end.z }
    : { x: end.x, z: leadEnd.z + direction * gapOffset };

  return {
    leadStart,
    leadEnd,
    plateA,
    plateA2,
    plateB,
    plateB2,
    connectorA,
    connectorB
  };
};

const buildBatteryGeometry = (element: TwoTerminalElement) => {
  const { start, end, orientation } = element;
  const horizontal = orientation === "horizontal";
  const total = horizontal ? end.x - start.x : end.z - start.z;
  const direction = total >= 0 ? 1 : -1;
  const length = Math.abs(total);
  const lead = Math.min(length * 0.25, 0.8);
  const gap = Math.min(length * 0.18, 0.45);
  const plateSpan = 2.2;
  const shortSpan = 1.4;

  const center = midpoint(start, end);
  const plateOffset = gap / 2;

  const negativePlate = horizontal
    ? { x: center.x - direction * plateOffset, z: start.z }
    : { x: start.x, z: center.z - direction * plateOffset };
  const positivePlate = horizontal
    ? { x: center.x + direction * plateOffset, z: start.z }
    : { x: start.x, z: center.z + direction * plateOffset };

  const leadStartEnd = horizontal
    ? { x: negativePlate.x - direction * 0.0001, z: start.z }
    : { x: start.x, z: negativePlate.z - direction * 0.0001 };
  const leadEndStart = horizontal
    ? { x: positivePlate.x + direction * 0.0001, z: end.z }
    : { x: end.x + direction * 0.0001, z: positivePlate.z };

  const leadStart = horizontal
    ? { x: start.x + direction * lead, z: start.z }
    : { x: start.x, z: start.z + direction * lead };
  const leadEnd = horizontal
    ? { x: end.x - direction * lead, z: end.z }
    : { x: end.x, z: end.z - direction * lead };

  return {
    negativePlate,
    positivePlate,
    leadStart,
    leadEnd,
    leadStartEnd,
    leadEndStart,
    plateSpan,
    shortSpan,
    orientation,
    direction
  };
};

const buildInductorPath = (element: TwoTerminalElement) => {
  const { start, end, orientation } = element;
  const horizontal = orientation === "horizontal";
  const total = horizontal ? end.x - start.x : end.z - start.z;
  const direction = total >= 0 ? 1 : -1;
  const length = Math.abs(total);
  const lead = Math.min(length * 0.25, 0.8);
  const coilLength = Math.max(length - lead * 2, 1.2);
  const loops = 4;
  const loopSpan = coilLength / loops;
  const amplitude = Math.min(loopSpan * 0.6, 0.7);

  const leadStart = horizontal
    ? { x: start.x + direction * lead, z: start.z }
    : { x: start.x, z: start.z + direction * lead };

  const commands: string[] = [];
  const startSvg = toSvgPoint(leadStart);
  commands.push(`M ${startSvg.x} ${startSvg.y}`);

  for (let i = 0; i < loops; i += 1) {
    const loopStart = lead + loopSpan * i;
    const ctrl1Offset = loopStart + loopSpan / 3;
    const ctrl2Offset = loopStart + (2 * loopSpan) / 3;
    const loopEnd = loopStart + loopSpan;

    const control1 = horizontal
      ? { x: start.x + direction * ctrl1Offset, z: start.z - amplitude }
      : { x: start.x + amplitude, z: start.z + direction * ctrl1Offset };
    const control2 = horizontal
      ? { x: start.x + direction * ctrl2Offset, z: start.z + amplitude }
      : { x: start.x - amplitude, z: start.z + direction * ctrl2Offset };
    const endPoint = horizontal
      ? { x: start.x + direction * loopEnd, z: start.z }
      : { x: start.x, z: start.z + direction * loopEnd };

    const ctrl1Svg = toSvgPoint(control1);
    const ctrl2Svg = toSvgPoint(control2);
    const endSvg = toSvgPoint(endPoint);

    commands.push(`C ${ctrl1Svg.x} ${ctrl1Svg.y} ${ctrl2Svg.x} ${ctrl2Svg.y} ${endSvg.x} ${endSvg.y}`);
  }

  const leadEnd = horizontal
    ? { x: end.x - direction * lead, z: end.z }
    : { x: end.x, z: end.z - direction * lead };

  return {
    d: commands.join(" "),
    leadStart,
    leadEnd
  };
};

const buildSwitchGeometry = (element: TwoTerminalElement) => {
  const { start, end, orientation } = element;
  const horizontal = orientation === "horizontal";
  const total = horizontal ? end.x - start.x : end.z - start.z;
  const direction = total >= 0 ? 1 : -1;
  const length = Math.abs(total);
  const lead = Math.min(length * 0.25, 0.8);
  const gap = Math.min(length * 0.2, 0.6);

  const anchor = horizontal
    ? { x: start.x + direction * (length - gap), z: start.z }
    : { x: start.x, z: start.z + direction * (length - gap) };
  const bladeEnd = horizontal
    ? { x: anchor.x + direction * gap * 0.9, z: start.z - gap * 0.4 }
    : { x: start.x + gap * 0.4, z: anchor.z + direction * gap * 0.9 };

  const leadStart = horizontal
    ? { x: start.x + direction * lead, z: start.z }
    : { x: start.x, z: start.z + direction * lead };
  const leadEnd = horizontal
    ? { x: end.x - direction * lead, z: end.z }
    : { x: end.x, z: end.z - direction * lead };

  return {
    anchor,
    bladeEnd,
    leadStart,
    leadEnd
  };
};

const buildLampGeometry = (element: TwoTerminalElement) => {
  const center = midpoint(element.start, element.end);
  const radius = distance(element.start, element.end) / 4;
  return {
    center,
    radius
  };
};

const renderLabel = (element: TwoTerminalElement, color: string) => {
  if (!element.label) {
    return null;
  }
  const { start, end, orientation } = element;
  const mid = midpoint(start, end);
  const svg = toSvgPoint(mid);
  const offset = LABEL_OFFSET_UNITS;
  const horizontal = orientation === "horizontal";
  const x = svg.x + (horizontal ? 0 : offset * (end.x >= start.x ? 1 : -1));
  const y = svg.y - (horizontal ? offset : 0);
  return (
    <text
      key={`${element.id}-label`}
      x={x}
      y={y}
      fill={color}
      fontSize={0.9}
      fontWeight="600"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {element.label}
    </text>
  );
};

const buildNodes = (elements: SchematicElement[]) => {
  const nodes = new Map<string, Vec2>();
  elements.forEach((element) => {
    if (isWire(element)) {
      if (element.path.length > 0) {
        nodes.set(pointKey(element.path[0]), element.path[0]);
        nodes.set(pointKey(element.path[element.path.length - 1]), element.path[element.path.length - 1]);
      }
      return;
    }
    if (isGround(element)) {
      nodes.set(pointKey(element.position), element.position);
      return;
    }
    nodes.set(pointKey(element.start), element.start);
    nodes.set(pointKey(element.end), element.end);
  });
  return Array.from(nodes.values());
};

const renderGround = (element: GroundElement, color: string, strokeWidth: number) => {
  const base = toSvgPoint(element.position);
  const widths = [1.2, 0.8, 0.4];
  const spacing = 0.3;
  return (
    <g key={element.id} data-element-id={element.id}>
      {widths.map((width, index) => (
        <line
          key={`${element.id}-bar-${index}`}
          x1={base.x - width / 2}
          x2={base.x + width / 2}
          y1={base.y + index * spacing}
          y2={base.y + index * spacing}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
};

const renderWireElement = (element: WireElement, color: string, strokeWidth: number, dasharray?: string) => (
  <polyline
    key={element.id}
    data-element-id={element.id}
    points={toPolylinePoints(buildWirePoints(element))}
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={dasharray}
  />
);

const renderResistorElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => (
  <polyline
    key={element.id}
    data-element-id={element.id}
    points={toPolylinePoints(buildResistorPoints(element))}
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={dasharray}
  />
);

const renderCapacitorElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  const geometry = buildCapacitorGeometry(element);
  const connectorPoints = [element.start, geometry.connectorA, geometry.connectorB, element.end];
  const startSegment = connectorPoints.slice(0, 2);
  const endSegment = connectorPoints.slice(2);

  return (
    <g key={element.id} data-element-id={element.id}>
      <polyline
        points={toPolylinePoints(startSegment)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dasharray}
      />
      <polyline
        points={toPolylinePoints(endSegment)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dasharray}
      />
      <line
        x1={toSvgPoint(geometry.plateA).x}
        y1={toSvgPoint(geometry.plateA).y}
        x2={toSvgPoint(geometry.plateA2).x}
        y2={toSvgPoint(geometry.plateA2).y}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={toSvgPoint(geometry.plateB).x}
        y1={toSvgPoint(geometry.plateB).y}
        x2={toSvgPoint(geometry.plateB2).x}
        y2={toSvgPoint(geometry.plateB2).y}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};

const renderBatteryElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  const geometry = buildBatteryGeometry(element);
  const startSvg = toSvgPoint(element.start);
  const endSvg = toSvgPoint(element.end);
  const negativeSvg = toSvgPoint(geometry.negativePlate);
  const positiveSvg = toSvgPoint(geometry.positivePlate);
  const leadStartSvg = toSvgPoint(geometry.leadStart);
  const leadEndSvg = toSvgPoint(geometry.leadEnd);
  const leadStartEndSvg = toSvgPoint(geometry.leadStartEnd);
  const leadEndStartSvg = toSvgPoint(geometry.leadEndStart);

  const plusOffset = geometry.orientation === "horizontal" ? { x: 0, y: -0.9 } : { x: 0.9, y: 0 };
  const minusOffset = geometry.orientation === "horizontal" ? { x: 0, y: 0.9 } : { x: -0.9, y: 0 };

  return (
    <g key={element.id} data-element-id={element.id}>
      <line
        x1={startSvg.x}
        y1={startSvg.y}
        x2={leadStartSvg.x}
        y2={leadStartSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <line
        x1={endSvg.x}
        y1={endSvg.y}
        x2={leadEndSvg.x}
        y2={leadEndSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <line
        x1={leadStartEndSvg.x}
        y1={leadStartEndSvg.y}
        x2={negativeSvg.x}
        y2={negativeSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={leadEndStartSvg.x}
        y1={leadEndStartSvg.y}
        x2={positiveSvg.x}
        y2={positiveSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={negativeSvg.x}
        y1={negativeSvg.y - geometry.shortSpan / 2}
        x2={negativeSvg.x}
        y2={negativeSvg.y + geometry.shortSpan / 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={positiveSvg.x}
        y1={positiveSvg.y - geometry.plateSpan / 2}
        x2={positiveSvg.x}
        y2={positiveSvg.y + geometry.plateSpan / 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <text
        x={positiveSvg.x + plusOffset.x}
        y={positiveSvg.y + plusOffset.y}
        fontSize={0.9}
        fontWeight="600"
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        +
      </text>
      <text
        x={negativeSvg.x + minusOffset.x}
        y={negativeSvg.y + minusOffset.y}
        fontSize={0.9}
        fontWeight="600"
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        -
      </text>
    </g>
  );
};

const renderInductorElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  const { d, leadStart, leadEnd } = buildInductorPath(element);
  const startSvg = toSvgPoint(element.start);
  const leadStartSvg = toSvgPoint(leadStart);
  const endSvg = toSvgPoint(element.end);
  const leadEndSvg = toSvgPoint(leadEnd);
  return (
    <g key={element.id} data-element-id={element.id}>
      <line
        x1={startSvg.x}
        y1={startSvg.y}
        x2={leadStartSvg.x}
        y2={leadStartSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dasharray} />
      <line
        x1={endSvg.x}
        y1={endSvg.y}
        x2={leadEndSvg.x}
        y2={leadEndSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
    </g>
  );
};

const renderSwitchElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  const geometry = buildSwitchGeometry(element);
  const startSvg = toSvgPoint(element.start);
  const leadStartSvg = toSvgPoint(geometry.leadStart);
  const anchorSvg = toSvgPoint(geometry.anchor);
  const bladeEndSvg = toSvgPoint(geometry.bladeEnd);
  const endSvg = toSvgPoint(element.end);
  const leadEndSvg = toSvgPoint(geometry.leadEnd);

  return (
    <g key={element.id} data-element-id={element.id}>
      <line
        x1={startSvg.x}
        y1={startSvg.y}
        x2={leadStartSvg.x}
        y2={leadStartSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <line
        x1={leadStartSvg.x}
        y1={leadStartSvg.y}
        x2={anchorSvg.x}
        y2={anchorSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={anchorSvg.x}
        y1={anchorSvg.y}
        x2={bladeEndSvg.x}
        y2={bladeEndSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <circle cx={anchorSvg.x} cy={anchorSvg.y} r={strokeWidth * 0.85} fill={color} />
      <line
        x1={endSvg.x}
        y1={endSvg.y}
        x2={leadEndSvg.x}
        y2={leadEndSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
    </g>
  );
};

const renderLampElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  const geometry = buildLampGeometry(element);
  const startSvg = toSvgPoint(element.start);
  const endSvg = toSvgPoint(element.end);
  const centerSvg = toSvgPoint(geometry.center);
  const radius = geometry.radius;

  return (
    <g key={element.id} data-element-id={element.id}>
      <line
        x1={startSvg.x}
        y1={startSvg.y}
        x2={centerSvg.x}
        y2={centerSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <line
        x1={endSvg.x}
        y1={endSvg.y}
        x2={centerSvg.x}
        y2={centerSvg.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
      <circle
        cx={centerSvg.x}
        cy={centerSvg.y}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <line
        x1={centerSvg.x - radius * 0.8}
        y1={centerSvg.y - radius * 0.8}
        x2={centerSvg.x + radius * 0.8}
        y2={centerSvg.y + radius * 0.8}
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
      />
      <line
        x1={centerSvg.x - radius * 0.8}
        y1={centerSvg.y + radius * 0.8}
        x2={centerSvg.x + radius * 0.8}
        y2={centerSvg.y - radius * 0.8}
        stroke={color}
        strokeWidth={strokeWidth * 0.8}
      />
    </g>
  );
};

const renderTwoTerminalElement = (
  element: TwoTerminalElement,
  color: string,
  strokeWidth: number,
  dasharray?: string
) => {
  switch (element.kind) {
    case "resistor":
      return renderResistorElement(element, color, strokeWidth, dasharray);
    case "battery":
      return renderBatteryElement(element, color, strokeWidth, dasharray);
    case "capacitor":
      return renderCapacitorElement(element, color, strokeWidth, dasharray);
    case "inductor":
      return renderInductorElement(element, color, strokeWidth, dasharray);
    case "lamp":
      return renderLampElement(element, color, strokeWidth, dasharray);
    case "switch":
      return renderSwitchElement(element, color, strokeWidth, dasharray);
    default:
      return renderResistorElement(element, color, strokeWidth, dasharray);
  }
};

const renderElement = (
  command: DrawCommand,
  color: string,
  strokeWidth: number,
  onElementPointerDown?: PointerHandler
) => {
  const { element, id, isSelected, strokeDasharray, opacity } = command;
  const strokeColor = isSelected ? HIGHLIGHT_COLOR : color;

  const elementNode = isWire(element)
    ? renderWireElement(element, strokeColor, strokeWidth, strokeDasharray)
    : isGround(element)
    ? renderGround(element, strokeColor, strokeWidth)
    : renderTwoTerminalElement(element as TwoTerminalElement, strokeColor, strokeWidth, strokeDasharray);

  const label = isTwoTerminal(element) ? renderLabel(element, strokeColor) : null;

  return (
    <g
      key={id}
      opacity={opacity}
      onPointerDown={
        onElementPointerDown
          ? (event) => {
              event.stopPropagation();
              onElementPointerDown(event, element.id);
            }
          : undefined
      }
    >
      {elementNode}
      {label}
    </g>
  );
};

export const SchematicSvg = memo(function SchematicSvg({
  elements,
  previewElement,
  selectedElementId,
  draftAnchor,
  hoverPoint,
  className,
  width = defaultWidth,
  height = defaultHeight,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onElementPointerDown
}: SchematicSvgProps) {
  const prepared = useMemo(() => {
    const baseCommands: DrawCommand[] = elements.map((element) => ({
      id: element.id,
      element,
      isSelected: selectedElementId === element.id
    }));

    if (previewElement) {
      baseCommands.push({
        id: previewElement.id,
        element: previewElement,
        isSelected: false,
        strokeDasharray: "0.3 0.3",
        opacity: 0.85
      });
    }

    return baseCommands;
  }, [elements, previewElement, selectedElementId]);

  const nodes = useMemo(() => buildNodes(elements), [elements]);

  const strokeWidth = STROKE_WIDTH_UNITS;

  return (
    <svg
      className={className}
      viewBox={getViewBoxString()}
      width={width}
      height={height}
      role="presentation"
      aria-hidden
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <rect
        x={0}
        y={0}
        width={BOARD_VIEWBOX.width}
        height={BOARD_VIEWBOX.height}
        fill="#ffffff"
        stroke="#cbd5f5"
        strokeWidth={0.05}
        rx={0.35}
        ry={0.35}
      />
      <g>
        {prepared.map((command) =>
          renderElement(command, command.strokeDasharray ? PREVIEW_COLOR : STROKE_COLOR, strokeWidth, onElementPointerDown)
        )}
      </g>
      <g>
        {nodes.map((node) => {
          const svg = toSvgPoint(node);
          const radius = NODE_RADIUS_UNITS;
          const isHighlighted = selectedElementId
            ? elements
                .filter((element) => element.id === selectedElementId)
                .some((element) => {
                  if (isWire(element)) {
                    return (
                      pointKey(element.path[0]) === pointKey(node) ||
                      pointKey(element.path[element.path.length - 1]) === pointKey(node)
                    );
                  }
                  if (isGround(element)) {
                    return pointKey(element.position) === pointKey(node);
                  }
                  return pointKey(element.start) === pointKey(node) || pointKey(element.end) === pointKey(node);
                })
            : false;

          return (
            <circle
              key={`node-${pointKey(node)}`}
              cx={svg.x}
              cy={svg.y}
              r={radius}
              fill={isHighlighted ? HIGHLIGHT_COLOR : NODE_FILL}
            />
          );
        })}
      </g>
      {draftAnchor ? (
        <circle
          cx={toSvgPoint(draftAnchor).x}
          cy={toSvgPoint(draftAnchor).y}
          r={NODE_RADIUS_UNITS * 1.2}
          fill={PREVIEW_COLOR}
          opacity={0.8}
        />
      ) : null}
      {hoverPoint ? (
        <circle
          cx={toSvgPoint(hoverPoint).x}
          cy={toSvgPoint(hoverPoint).y}
          r={NODE_RADIUS_UNITS * 0.8}
          fill="none"
          stroke={PREVIEW_COLOR}
          strokeWidth={strokeWidth * 0.8}
        />
      ) : null}
    </svg>
  );
});

SchematicSvg.displayName = "SchematicSvg";

