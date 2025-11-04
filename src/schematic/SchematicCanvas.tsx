import { memo, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type {
  BoardLimits,
  GroundElement,
  Orientation,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "./types";

type SchematicCanvasProps = {
  elements: SchematicElement[];
  previewElement?: SchematicElement | null;
  selectedElementId?: string | null;
  boardLimits?: BoardLimits;
  showGrid?: boolean;
  backgroundColor?: string;
  markerPoints?: { id: string; point: Vec2; color?: string; radius?: number }[];
  onCanvasPointerDown?: (point: Vec2, event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasPointerMove?: (point: Vec2 | null, event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasPointerLeave?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onElementPointerDown?: (elementId: string, event: React.PointerEvent<SVGElement>) => void;
};

const DEFAULT_LIMITS: BoardLimits = {
  minX: -8,
  maxX: 8,
  minZ: -6,
  maxZ: 6,
};

const MARGIN = 1.25;
const STROKE_COLOR = "#000000";
const HIGHLIGHT_STROKE = "#0b5ed7";
const PREVIEW_STROKE = "#64748b";
const NODE_FILL = "#000000";
const NODE_RADIUS = 0.12;
const FONT_FAMILY = "'Inter', 'Arial', sans-serif";

type ProjectedPoint = {
  x: number;
  y: number;
};

const EPSILON = 1e-6;

const toPointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
const scale = (a: Vec2, value: number): Vec2 => ({ x: a.x * value, z: a.z * value });
const length = (a: Vec2): number => Math.hypot(a.x, a.z);
const normalise = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len <= EPSILON) {
    return { x: 0, z: 0 };
  }
  return scale(a, 1 / len);
};
const perpendicular = (a: Vec2): Vec2 => ({ x: -a.z, z: a.x });
const midpoint = (a: Vec2, b: Vec2): Vec2 => scale(add(a, b), 0.5);

const projectPoint = (point: Vec2): ProjectedPoint => ({
  x: point.x,
  y: -point.z,
});

const pathFromPoints = (points: Vec2[]): string => {
  if (!points.length) {
    return "";
  }
  const [first, ...rest] = points;
  const move = projectPoint(first);
  const segments = rest
    .map((point) => {
      const { x, y } = projectPoint(point);
      return `L ${x.toFixed(3)} ${y.toFixed(3)}`;
    })
    .join(" ");
  return `M ${move.x.toFixed(3)} ${move.y.toFixed(3)} ${segments}`;
};

const linePoints = (start: Vec2, end: Vec2) => ({
  from: projectPoint(start),
  to: projectPoint(end),
});

const buildResistorPath = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const leadLength = Math.min(distance * 0.2, 0.8);
  const amplitude = Math.min(0.6, distance * 0.2);
  const bodyStart = add(element.start, scale(direction, leadLength));
  const bodyEnd = add(element.end, scale(direction, -leadLength));
  const zigCount = 6;
  const points: Vec2[] = [];
  for (let i = 0; i <= zigCount; i += 1) {
    const t = i / zigCount;
    const base = add(bodyStart, scale(subtract(bodyEnd, bodyStart), t));
    if (i === 0 || i === zigCount) {
      points.push(base);
    } else {
      const offset = (i % 2 === 0 ? -1 : 1) * amplitude;
      points.push(add(base, scale(normal, offset)));
    }
  }
  return {
    leadA: [element.start, bodyStart],
    leadB: [bodyEnd, element.end],
    body: points,
    labelPoint: add(midpoint(bodyStart, bodyEnd), scale(normal, amplitude + 0.6)),
  };
};

const buildBatteryGeometry = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const mid = midpoint(element.start, element.end);
  const plateGap = Math.min(distance * 0.35, 1.6);
  const positiveCenter = add(mid, scale(direction, plateGap / 2));
  const negativeCenter = add(mid, scale(direction, -plateGap / 2));
  const positiveHalf = Math.max(distance * 0.22, 0.9);
  const negativeHalf = Math.max(distance * 0.14, 0.6);

  const buildPlate = (center: Vec2, halfLength: number) => {
    const top = add(center, scale(normal, halfLength));
    const bottom = add(center, scale(normal, -halfLength));
    return [top, bottom] as const;
  };

  const [positiveTop, positiveBottom] = buildPlate(positiveCenter, positiveHalf);
  const [negativeTop, negativeBottom] = buildPlate(negativeCenter, negativeHalf);

  const leadLength = Math.max((distance - plateGap) / 2 - 0.1, 0.2);
  const leadStartEnd = add(element.start, scale(direction, leadLength));
  const leadEndStart = add(element.end, scale(direction, -leadLength));

  return {
    positivePlate: [positiveTop, positiveBottom],
    negativePlate: [negativeTop, negativeBottom],
    leadA: [element.start, leadStartEnd],
    leadB: [leadEndStart, element.end],
    labelPoint: add(mid, scale(normal, positiveHalf + 0.8)),
    polarityPlus: add(positiveCenter, scale(normal, positiveHalf + 0.45)),
    polarityMinus: add(negativeCenter, scale(normal, negativeHalf + 0.45)),
  };
};

const buildCapacitorGeometry = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const mid = midpoint(element.start, element.end);
  const plateGap = Math.min(distance * 0.25, 1.0);
  const rightCenter = add(mid, scale(direction, plateGap / 2));
  const leftCenter = add(mid, scale(direction, -plateGap / 2));
  const halfLength = Math.max(distance * 0.18, 0.9);

  const buildPlate = (center: Vec2) => {
    const top = add(center, scale(normal, halfLength));
    const bottom = add(center, scale(normal, -halfLength));
    return [top, bottom] as const;
  };

  const [rightTop, rightBottom] = buildPlate(rightCenter);
  const [leftTop, leftBottom] = buildPlate(leftCenter);

  const leadLength = Math.max((distance - plateGap) / 2 - 0.1, 0.2);
  const leadStartEnd = add(element.start, scale(direction, leadLength));
  const leadEndStart = add(element.end, scale(direction, -leadLength));

  return {
    rightPlate: [rightTop, rightBottom],
    leftPlate: [leftTop, leftBottom],
    leadA: [element.start, leadStartEnd],
    leadB: [leadEndStart, element.end],
    labelPoint: add(mid, scale(normal, halfLength + 0.75)),
  };
};

const buildInductorGeometry = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const coilCount = 4;
  const coilSpacing = Math.max((distance * 0.5) / coilCount, 0.5);
  const leadLength = Math.min(distance * 0.2, 0.8);
  const bodyStart = add(element.start, scale(direction, leadLength));
  const coils: Vec2[][] = [];
  for (let i = 0; i < coilCount; i += 1) {
    const centerOffset = leadLength + coilSpacing * (i + 0.5);
    const center = add(element.start, scale(direction, Math.min(centerOffset, distance - leadLength)));
    const radius = Math.min(coilSpacing * 0.45, 0.6);
    const segments = 12;
    const arc: Vec2[] = [];
    for (let j = 0; j <= segments; j += 1) {
      const theta = Math.PI * (j / segments);
      const offset = add(scale(normal, Math.sin(theta) * radius), scale(direction, Math.cos(theta) * radius));
      arc.push(add(center, offset));
    }
    coils.push(arc);
  }
  const bodyEnd = add(element.end, scale(direction, -leadLength));
  return {
    leadA: [element.start, bodyStart],
    leadB: [bodyEnd, element.end],
    coils,
    labelPoint: add(midpoint(bodyStart, bodyEnd), scale(normal, 0.9)),
  };
};

const buildSwitchGeometry = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const leadLength = Math.min(distance * 0.25, 0.9);
  const contactA = add(element.start, scale(direction, leadLength));
  const contactB = add(element.end, scale(direction, -leadLength));
  const bladePivot = midpoint(contactA, contactB);
  const bladeLength = Math.min(distance * 0.55, 1.6);
  const bladeEnd = add(bladePivot, scale(direction, bladeLength / 2));
  const openOffset = scale(normal, 0.6);
  return {
    leadA: [element.start, contactA],
    leadB: [contactB, element.end],
    contactA,
    contactB,
    blade: [add(contactA, openOffset), add(bladeEnd, openOffset)],
    labelPoint: add(bladePivot, scale(normal, 1.1)),
  };
};

const buildLampGeometry = (element: TwoTerminalElement) => {
  const axis = subtract(element.end, element.start);
  const distance = length(axis);
  if (distance <= EPSILON) {
    return null;
  }
  const direction = normalise(axis);
  const normal = normalise(perpendicular(direction));
  const leadLength = Math.min(distance * 0.2, 0.8);
  const bulbCenter = midpoint(add(element.start, scale(direction, leadLength)), add(element.end, scale(direction, -leadLength)));
  const radius = Math.min(distance * 0.25, 1.0);
  return {
    leadA: [element.start, add(element.start, scale(direction, leadLength))],
    leadB: [add(element.end, scale(direction, -leadLength)), element.end],
    bulbCenter,
    radius,
    labelPoint: add(bulbCenter, scale(normal, radius + 0.8)),
  };
};

const buildGroundGeometry = (element: GroundElement) => {
  const base = element.position;
  const orientation: Orientation = element.orientation ?? "horizontal";
  const segments: Vec2[][] = [];
  const lengthScale = 1;
  const offsets = [1.2, 0.8, 0.4];
  offsets.forEach((offset, index) => {
    const zOffset = -index * 0.3;
    if (orientation === "horizontal") {
      segments.push([
        { x: base.x - (offset * lengthScale) / 2, z: base.z + zOffset },
        { x: base.x + (offset * lengthScale) / 2, z: base.z + zOffset },
      ]);
    } else {
      segments.push([
        { x: base.x + zOffset, z: base.z - (offset * lengthScale) / 2 },
        { x: base.x + zOffset, z: base.z + (offset * lengthScale) / 2 },
      ]);
    }
  });
  return {
    stem: [
      { x: base.x, z: base.z + (orientation === "horizontal" ? 0.4 : 0) },
      { x: base.x, z: base.z },
    ],
    bars: segments,
  };
};

const collectTerminalCounts = (elements: SchematicElement[]): Map<string, number> => {
  const counts = new Map<string, number>();
  const register = (point: Vec2) => {
    const key = toPointKey(point);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  elements.forEach((element) => {
    if (element.kind === "wire") {
      const wire = element as WireElement;
      for (let i = 0; i < wire.path.length - 1; i += 1) {
        register(wire.path[i]);
        register(wire.path[i + 1]);
      }
    } else if (element.kind === "ground") {
      register((element as GroundElement).position);
    } else {
      const component = element as TwoTerminalElement;
      register(component.start);
      register(component.end);
    }
  });
  return counts;
};

const SchematicCanvas = memo(function SchematicCanvas({
  elements,
  previewElement,
  selectedElementId,
  boardLimits,
  showGrid = false,
  backgroundColor = "#ffffff",
  markerPoints,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerLeave,
  onElementPointerDown,
}: SchematicCanvasProps) {
  const limits = boardLimits ?? DEFAULT_LIMITS;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const augmentedElements = useMemo(() => {
    if (!previewElement) {
      return elements;
    }
    return [...elements, { ...previewElement, id: "__preview" }];
  }, [elements, previewElement]);

  const connectionCounts = useMemo(() => collectTerminalCounts(elements), [elements]);

  const allPoints = useMemo(() => {
    const points: Vec2[] = [];
    elements.forEach((element) => {
      if (element.kind === "wire") {
        const wire = element as WireElement;
        points.push(...wire.path);
      } else if (element.kind === "ground") {
        points.push((element as GroundElement).position);
      } else {
        const component = element as TwoTerminalElement;
        points.push(component.start, component.end);
      }
    });
    return points;
  }, [elements]);

  const minX = Math.min(limits.minX, ...allPoints.map((point) => point.x), limits.maxX);
  const maxX = Math.max(limits.maxX, ...allPoints.map((point) => point.x), limits.minX);
  const minZ = Math.min(limits.minZ, ...allPoints.map((point) => point.z), limits.maxZ);
  const maxZ = Math.max(limits.maxZ, ...allPoints.map((point) => point.z), limits.minZ);

  const width = maxX - minX;
  const height = maxZ - minZ;

  const viewBox = [
    (minX - MARGIN).toFixed(2),
    (-(maxZ + MARGIN)).toFixed(2),
    (width + MARGIN * 2).toFixed(2),
    (height + MARGIN * 2).toFixed(2),
  ].join(" ");

  const resolveBoardPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || typeof svg.createSVGPoint !== "function") {
      return null;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix || typeof matrix.inverse !== "function") {
      return null;
    }
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, z: -transformed.y } as Vec2;
  };

  const createShapeInteractionProps = (elementId: string, isPreview: boolean, interactive = true) => {
    if (!interactive) {
      return { pointerEvents: "none" as const };
    }
    if (isPreview || !onElementPointerDown) {
      return { pointerEvents: "visibleStroke" as const };
    }
    return {
      pointerEvents: "visibleStroke" as const,
      onPointerDown: (event: React.PointerEvent<SVGElement>) => {
        event.stopPropagation();
        onElementPointerDown(elementId, event);
      },
      style: { cursor: "pointer" } as const,
    };
  };

  const handleCanvasPointerDown = onCanvasPointerDown
    ? (event: React.PointerEvent<SVGSVGElement>) => {
        const boardPoint = resolveBoardPoint(event);
        if (boardPoint) {
          onCanvasPointerDown(boardPoint, event);
        }
      }
    : undefined;

  const handleCanvasPointerMove = onCanvasPointerMove
    ? (event: React.PointerEvent<SVGSVGElement>) => {
        const boardPoint = resolveBoardPoint(event);
        onCanvasPointerMove(boardPoint, event);
      }
    : undefined;

  const handleCanvasPointerLeave = onCanvasPointerLeave || onCanvasPointerMove
    ? (event: React.PointerEvent<SVGSVGElement>) => {
        if (onCanvasPointerLeave) {
          onCanvasPointerLeave(event);
        }
        if (onCanvasPointerMove) {
          onCanvasPointerMove(null, event);
        }
      }
    : undefined;

  const renderWire = (wire: WireElement, index: number, isPreview: boolean, isSelected: boolean) => {
    const d = pathFromPoints(wire.path);
    if (!d) {
      return null;
    }
    const interactionProps = createShapeInteractionProps(wire.id, isPreview, false);
    return (
      <path
        key={`${wire.id}-wire-${index}${isPreview ? "-preview" : ""}`}
        d={d}
        fill="none"
        stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={isPreview ? "6 4" : undefined}
        opacity={isPreview ? 0.65 : 1}
        {...interactionProps}
      />
    );
  };

  const componentNodes: ReactNode[] = [];
  const wireNodes: ReactNode[] = [];
  const labelNodes: ReactNode[] = [];

  augmentedElements.forEach((element) => {
    const isPreview = previewElement && element.id === "__preview";
    const isSelected = Boolean(selectedElementId && element.id === selectedElementId);

    if (element.kind === "wire") {
      const node = renderWire(element as WireElement, 0, isPreview, isSelected);
      if (node) {
        wireNodes.push(node);
      }
      return;
    }

    if (element.kind === "ground") {
      const ground = element as GroundElement;
      const geometry = buildGroundGeometry(ground);
      const stem = pathFromPoints(geometry.stem);
      if (stem) {
        wireNodes.push(
          <path
            key={`${ground.id}-stem`}
            d={stem}
            stroke={isPreview ? PREVIEW_STROKE : STROKE_COLOR}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            fill="none"
            strokeDasharray={isPreview ? "6 4" : undefined}
            opacity={isPreview ? 0.65 : 1}
          />
        );
      }
        geometry.bars.forEach((segment, idx) => {
          if (segment.length === 2) {
            const { from, to } = linePoints(segment[0], segment[1]);
            wireNodes.push(
              <line
                key={`${ground.id}-bar-${idx}`}
                x1={from.x.toFixed(3)}
                y1={from.y.toFixed(3)}
                x2={to.x.toFixed(3)}
                y2={to.y.toFixed(3)}
                stroke={isPreview ? PREVIEW_STROKE : STROKE_COLOR}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={isPreview ? "6 4" : undefined}
                opacity={isPreview ? 0.65 : 1}
              />
            );
          }
        });
      return;
    }

    const component = element as TwoTerminalElement;
    switch (component.kind) {
      case "resistor": {
        const geometry = buildResistorPath(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const leadA = pathFromPoints(geometry.leadA);
        const leadB = pathFromPoints(geometry.leadB);
        const body = pathFromPoints(geometry.body);
        if (leadA) {
          wireNodes.push(
            <path
              key={`${component.id}-leadA`}
              d={leadA}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (leadB) {
          wireNodes.push(
            <path
              key={`${component.id}-leadB`}
              d={leadB}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (body) {
          componentNodes.push(
            <path
              key={`${component.id}-body`}
              d={body}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (!isPreview && component.label) {
          const { x, y } = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={x}
              y={y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        break;
      }
      case "battery": {
        const geometry = buildBatteryGeometry(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const parts: Array<[Vec2, Vec2, string]> = [
          [geometry.leadA[0], geometry.leadA[1], "leadA"],
          [geometry.leadB[0], geometry.leadB[1], "leadB"],
          [geometry.positivePlate[0], geometry.positivePlate[1], "positive"],
          [geometry.negativePlate[0], geometry.negativePlate[1], "negative"],
        ];
        parts.forEach(([start, end, keySuffix]) => {
          const { from, to } = linePoints(start, end);
          wireNodes.push(
            <line
              key={`${component.id}-${keySuffix}`}
              x1={from.x.toFixed(3)}
              y1={from.y.toFixed(3)}
              x2={to.x.toFixed(3)}
              y2={to.y.toFixed(3)}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={isPreview && keySuffix.startsWith("lead") ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        });
        if (!isPreview && component.label) {
          const { x, y } = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={x}
              y={y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        if (!isPreview) {
          const plus = projectPoint(geometry.polarityPlus);
          const minus = projectPoint(geometry.polarityMinus);
          labelNodes.push(
            <text
              key={`${component.id}-plus`}
              x={plus.x}
              y={plus.y}
              fontFamily={FONT_FAMILY}
              fontSize={12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              +
            </text>
          );
          labelNodes.push(
            <text
              key={`${component.id}-minus`}
              x={minus.x}
              y={minus.y}
              fontFamily={FONT_FAMILY}
              fontSize={12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              −
            </text>
          );
        }
        break;
      }
      case "capacitor": {
        const geometry = buildCapacitorGeometry(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const parts: Array<[Vec2, Vec2, string]> = [
          [geometry.leadA[0], geometry.leadA[1], "leadA"],
          [geometry.leadB[0], geometry.leadB[1], "leadB"],
          [geometry.leftPlate[0], geometry.leftPlate[1], "left"],
          [geometry.rightPlate[0], geometry.rightPlate[1], "right"],
        ];
        parts.forEach(([start, end, keySuffix]) => {
          const { from, to } = linePoints(start, end);
          wireNodes.push(
            <line
              key={`${component.id}-${keySuffix}`}
              x1={from.x.toFixed(3)}
              y1={from.y.toFixed(3)}
              x2={to.x.toFixed(3)}
              y2={to.y.toFixed(3)}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={isPreview && keySuffix.startsWith("lead") ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        });
        if (!isPreview && component.label) {
          const { x, y } = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={x}
              y={y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        break;
      }
      case "inductor": {
        const geometry = buildInductorGeometry(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const leadA = pathFromPoints(geometry.leadA);
        const leadB = pathFromPoints(geometry.leadB);
        if (leadA) {
          wireNodes.push(
            <path
              key={`${component.id}-leadA`}
              d={leadA}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (leadB) {
          wireNodes.push(
            <path
              key={`${component.id}-leadB`}
              d={leadB}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        geometry.coils.forEach((coil, idx) => {
          const d = pathFromPoints(coil);
          if (d) {
            componentNodes.push(
              <path
                key={`${component.id}-coil-${idx}`}
                d={d}
                stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                fill="none"
                strokeDasharray={isPreview ? "6 4" : undefined}
                opacity={isPreview ? 0.65 : 1}
                {...pointerProps}
              />
            );
          }
        });
        if (!isPreview && component.label) {
          const { x, y } = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={x}
              y={y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        break;
      }
      case "switch": {
        const geometry = buildSwitchGeometry(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const leadA = pathFromPoints(geometry.leadA);
        const leadB = pathFromPoints(geometry.leadB);
        if (leadA) {
          wireNodes.push(
            <path
              key={`${component.id}-leadA`}
              d={leadA}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (leadB) {
          wireNodes.push(
            <path
              key={`${component.id}-leadB`}
              d={leadB}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        const blade = pathFromPoints(geometry.blade);
        if (blade) {
          componentNodes.push(
            <path
              key={`${component.id}-blade`}
              d={blade}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (!isPreview && component.label) {
          const { x, y } = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={x}
              y={y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        break;
      }
      case "lamp": {
        const geometry = buildLampGeometry(component);
        if (!geometry) {
          break;
        }
        const pointerProps = createShapeInteractionProps(component.id, isPreview);
        const leadA = pathFromPoints(geometry.leadA);
        const leadB = pathFromPoints(geometry.leadB);
        if (leadA) {
          wireNodes.push(
            <path
              key={`${component.id}-leadA`}
              d={leadA}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        if (leadB) {
          wireNodes.push(
            <path
              key={`${component.id}-leadB`}
              d={leadB}
              stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              fill="none"
              strokeDasharray={isPreview ? "6 4" : undefined}
              opacity={isPreview ? 0.65 : 1}
              {...pointerProps}
            />
          );
        }
        const { x, y } = projectPoint(geometry.bulbCenter);
        componentNodes.push(
          <circle
            key={`${component.id}-bulb`}
            cx={x.toFixed(3)}
            cy={y.toFixed(3)}
            r={geometry.radius}
            stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            fill="none"
            opacity={isPreview ? 0.65 : 1}
            {...pointerProps}
          />
        );
        componentNodes.push(
          <line
            key={`${component.id}-bulb-cross-1`}
            x1={(x - geometry.radius * 0.65).toFixed(3)}
            y1={(y - geometry.radius * 0.65).toFixed(3)}
            x2={(x + geometry.radius * 0.65).toFixed(3)}
            y2={(y + geometry.radius * 0.65).toFixed(3)}
            stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            opacity={isPreview ? 0.65 : 1}
            {...pointerProps}
          />
        );
        componentNodes.push(
          <line
            key={`${component.id}-bulb-cross-2`}
            x1={(x - geometry.radius * 0.65).toFixed(3)}
            y1={(y + geometry.radius * 0.65).toFixed(3)}
            x2={(x + geometry.radius * 0.65).toFixed(3)}
            y2={(y - geometry.radius * 0.65).toFixed(3)}
            stroke={isPreview ? PREVIEW_STROKE : isSelected ? HIGHLIGHT_STROKE : STROKE_COLOR}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            opacity={isPreview ? 0.65 : 1}
            {...pointerProps}
          />
        );
        if (!isPreview && component.label) {
          const labelPoint = projectPoint(geometry.labelPoint);
          labelNodes.push(
            <text
              key={`${component.id}-label`}
              x={labelPoint.x}
              y={labelPoint.y}
              fontFamily={FONT_FAMILY}
              fontSize={14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE_COLOR}
            >
              {component.label}
            </text>
          );
        }
        break;
      }
      default: {
        break;
      }
    }
  });

  const nodeMarks = Array.from(connectionCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([key]) => {
      const [xRaw, zRaw] = key.split("|").map(Number);
      const { x, y } = projectPoint({ x: xRaw, z: zRaw });
      return (
        <circle
          key={`node-${key}`}
          cx={x.toFixed(3)}
          cy={y.toFixed(3)}
          r={NODE_RADIUS}
          fill={NODE_FILL}
          pointerEvents="none"
        />
      );
    });

  const markerNodes = markerPoints?.map(({ id, point, color = "#0891b2", radius }) => {
    const { x, y } = projectPoint(point);
    const markerRadius = typeof radius === "number" ? radius : NODE_RADIUS * 0.8;
    return (
      <circle
        key={`marker-${id}`}
        cx={x.toFixed(3)}
        cy={y.toFixed(3)}
        r={markerRadius}
        fill={color}
        opacity={0.85}
        pointerEvents="none"
      />
    );
  });

  return (
    <svg
      ref={svgRef}
      className="schematic-canvas-svg"
      viewBox={viewBox}
      style={{ width: "100%", height: "100%", backgroundColor }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerLeave={handleCanvasPointerLeave}
    >
      {showGrid && (
        <defs>
          <pattern id="schematic-grid" width={1} height={1} patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 1 0 1 1" stroke="#d4d4d8" strokeWidth={0.02} fill="none" />
          </pattern>
        </defs>
      )}
      {showGrid && <rect x={(minX - MARGIN).toFixed(2)} y={(-(maxZ + MARGIN)).toFixed(2)} width={(width + MARGIN * 2).toFixed(2)} height={(height + MARGIN * 2).toFixed(2)} fill="url(#schematic-grid)" />}
      {wireNodes}
      {componentNodes}
      {nodeMarks}
      {markerNodes}
      {labelNodes}
    </svg>
  );
});

export default SchematicCanvas;
