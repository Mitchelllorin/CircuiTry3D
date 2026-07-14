import { GroundElement, Orientation, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const NODE_RADIUS = 0.12;
export const WIRE_HEIGHT = 0.1;
export const COMPONENT_HEIGHT = 0.1;
export const LABEL_HEIGHT = 0.42;

const STROKE_DEPTH = 0.06;
const WIRE_STROKE_WIDTH = 0.12;
const COMPONENT_STROKE_WIDTH = 0.16;

const SYMBOL_DEFAULTS = {
  resistor: { preferred: 2.4, minimum: 1.2, zigCount: 6, amplitude: 0.4 },
  capacitor: { preferred: 1.6, minimum: 1.0, plateSpacing: 0.36, plateLength: 1.6 },
  battery: { preferred: 1.7, minimum: 1.0, plateSpacing: 0.42, longPlate: 1.4, shortPlate: 0.8 },
  inductor: { preferred: 2.4, minimum: 1.4, coilCount: 4 },
  lamp: { preferred: 1.8, minimum: 1.1 },
  switch: { preferred: 2.2, minimum: 1.2 },
} as const;

type SymbolBodyLayout = {
  orientation: Orientation;
  axis: "x" | "z";
  direction: 1 | -1;
  span: number;
  startAxis: number;
  endAxis: number;
  crossAxis: number;
  bodyStart: Vec2;
  bodyEnd: Vec2;
  bodyLength: number;
  leadIn: number;
  leadOut: number;
  center: Vec2;
  scale: number;
};

type BuildOptions = {
  preview?: boolean;
  highlight?: boolean;
  standard?: SymbolStandard;
};

const DEFAULT_STANDARD: SchematicStandard = "ansi";

type BuildResult = {
  group: any;
  terminals: Vec2[];
};

// Use centralized color constants for 3D rendering
const COLOR_HELPERS = {
  stroke: 0x111111,
  highlight: 0x2563eb,
  preview: 0x94a3b8,
  nodeFill: 0x111111,
  plate: 0x111111,
  dielectric: 0xededed,
  lampRing: 0x111111,
  lampFill: 0xffffff,
  ground: 0x111111,
} as const;

const LABEL_COLOR = THREE_COLORS.labelText;

const COMPONENT_TYPE_COLORS: Record<string, string> = {
  battery: "#ef4444",    // Red for power source
  ac_source: "#f97316",  // Orange for AC power
  resistor: "#f59e0b",   // Amber for resistance
  capacitor: "#3b82f6",  // Blue for capacitance
  inductor: "#8b5cf6",   // Purple for inductance
  lamp: "#fbbf24",       // Yellow for light
  led: "#22c55e",        // Green for LED
  switch: "#10b981",     // Emerald for switching
  diode: "#ec4899",      // Pink for one-way flow
  fuse: "#f43f5e",       // Rose for protection
  motor: "#06b6d4",      // Cyan for motors
  speaker: "#a855f7",    // Purple for audio
  bjt: "#14b8a6",        // Teal for transistors
  "bjt-npn": "#0d9488",  // Darker teal for NPN
  "bjt-pnp": "#2dd4bf",  // Lighter teal for PNP
  darlington: "#115e59", // Deep teal for Darlington
  mosfet: "#059669",     // Emerald for MOSFET (voltage-controlled)
  potentiometer: "#eab308", // Yellow for variable resistors
  opamp: "#6366f1",      // Indigo for op-amps
  transformer: "#84cc16", // Lime for transformers
  ground: "#6b7280",     // Gray for ground
  wire: "#111111",       // Black for wires
};

const SNAP_EPSILON = 1e-6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toVec3 = (three: any, point: Vec2, height = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

const rectangularBetween = (
  three: any,
  startVec: any,
  endVec: any,
  width = STROKE_WIDTH,
  depth = STROKE_DEPTH,
  material?: any
) => {
  const delta = new three.Vector3().subVectors(endVec, startVec);
  const planarLength = Math.hypot(delta.x, delta.z);
  if (planarLength <= SNAP_EPSILON) {
    return null;
  }
  const geometry = new three.BoxGeometry(planarLength, depth, width);
  const mesh = new three.Mesh(geometry, material ?? new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke }));
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const yaw = Math.atan2(delta.x, delta.z);
  mesh.rotation.y = yaw;
  return mesh;
};

const strokeBetween = (
  three: any,
  start: Vec2,
  end: Vec2,
  height: number,
  material: any,
  width = STROKE_WIDTH,
  depth = STROKE_DEPTH
) => {
  const startVec = toVec3(three, start, height);
  const endVec = toVec3(three, end, height);
  return rectangularBetween(three, startVec, endVec, width, depth, material);
};

const styliseMaterial = (three: any, material: any, options: BuildOptions, baseColor: number) => {
  if (!material) {
    return;
  }

  const base = new three.Color(baseColor);
  if (options.highlight) {
    // Use custom highlight color if provided, otherwise use default blue
    const highlightHex = options.highlightColor ?? COLOR_HELPERS.highlight;
    material.color = new three.Color(highlightHex);
  } else if (options.preview) {
    const preview = new three.Color(COLOR_HELPERS.preview);
    material.color = base.clone().lerp(preview, 0.45);
    material.transparent = true;
    material.opacity = 0.55;
    material.depthWrite = false;
  } else {
    material.color = base;
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
  }

  if (material.emissive) {
    material.emissive = new three.Color(0x000000);
    material.emissiveIntensity = 0;
  }
  if (typeof material.metalness === "number") {
    material.metalness = 0;
  }
  if (typeof material.roughness === "number") {
    material.roughness = 0.6;
  }

  material.needsUpdate = true;
};

const strokeBetween = (three: any, startVec: any, endVec: any, radius: number, material: any) => {
  const direction = new three.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  if (length <= SNAP_EPSILON) {
    return null;
  }

  const thickness = radius * 2;
  const geometry = new three.BoxGeometry(length, thickness, thickness);
  const mesh = new three.Mesh(geometry, material);
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(1, 0, 0), direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);
  return mesh;
};

const resolveSymbolBody = (
  element: TwoTerminalElement,
  preferredLength: number,
  minimumLength: number
): SymbolBodyLayout => {
  const orientation = element.orientation;
  const axis = orientation === "horizontal" ? "x" : "z";
  const startAxis = axis === "x" ? element.start.x : element.start.z;
  const endAxis = axis === "x" ? element.end.x : element.end.z;
  const direction = endAxis >= startAxis ? 1 : -1;
  const span = Math.max(Math.abs(endAxis - startAxis), SNAP_EPSILON);
  const safePreferred = Math.max(preferredLength, minimumLength);

  let bodyLength = Math.min(safePreferred, span);
  if (bodyLength < minimumLength) {
    bodyLength = Math.min(span, minimumLength);
  }

  const leftover = Math.max(span - bodyLength, 0);
  const halfLead = leftover / 2;
  const bodyStartAxis = startAxis + direction * halfLead;
  const bodyEndAxis = bodyStartAxis + direction * bodyLength;
  const crossAxis = axis === "x" ? element.start.z : element.start.x;

  const bodyStart: Vec2 =
    axis === "x"
      ? { x: bodyStartAxis, z: crossAxis }
      : { x: crossAxis, z: bodyStartAxis };
  const bodyEnd: Vec2 =
    axis === "x"
      ? { x: bodyEndAxis, z: crossAxis }
      : { x: crossAxis, z: bodyEndAxis };

  const centerAxis = (bodyStartAxis + bodyEndAxis) / 2;
  const center: Vec2 = axis === "x" ? { x: centerAxis, z: crossAxis } : { x: crossAxis, z: centerAxis };
  const scale = bodyLength / safePreferred;

  return {
    orientation,
    axis,
    direction: direction as 1 | -1,
    span,
    startAxis,
    endAxis,
    crossAxis,
    bodyStart,
    bodyEnd,
    bodyLength,
    leadIn: Math.abs(bodyStartAxis - startAxis),
    leadOut: Math.abs(endAxis - bodyEndAxis),
    center,
    scale: Number.isFinite(scale) && scale > 0 ? Math.min(scale, 1) : 1,
  };
};

const createLabelSprite = (three: any, text: string, color = LABEL_COLOR, options: BuildOptions = {}) => {
  const canvas = document.createElement("canvas");
  // Use larger canvas for longer text to maintain quality
  const isLongText = text.length > 4;
  canvas.width = isLongText ? 512 : 256;
  canvas.height = isLongText ? 256 : 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Use component type color if available and not in preview mode
  const effectiveColor = (!options.preview && componentKind && COMPONENT_TYPE_COLORS[componentKind])
    ? COMPONENT_TYPE_COLORS[componentKind]
    : color;

  if (!options.preview) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = effectiveColor;

  // Dynamically adjust font size based on text length to fit canvas
  let fontSize = 150;
  if (text.length > 12) {
    fontSize = 60;
  } else if (text.length > 8) {
    fontSize = 80;
  } else if (text.length > 4) {
    fontSize = 100;
  }

  ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new three.CanvasTexture(canvas);
  // Correct color space so label colors render accurately.
  if (three.SRGBColorSpace) {
    texture.colorSpace = three.SRGBColorSpace;
  } else if (three.sRGBEncoding) {
    // Legacy fallback for older Three versions.
    texture.encoding = three.sRGBEncoding;
  }
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  const material = new three.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: options.preview ? 0.6 : 1
  });
  const sprite = new three.Sprite(material);
  // Adjust sprite scale based on canvas aspect ratio and text length
  const scaleX = isLongText ? 2.8 : 1.4;
  const scaleY = isLongText ? 1.4 : 0.7;
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.userData.texture = texture;
  sprite.userData.material = material;
  return sprite;
};

const buildWireElement = (three: any, element: WireElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `wire-${element.id}`;
  const material = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, material, options, COLOR_HELPERS.stroke);
  const profile = resolveProfile(options.standard);
  const wireRadius = profile.general.strokeRadius;

  for (let i = 0; i < element.path.length - 1; i += 1) {
    const startVec = toVec3(three, element.path[i], WIRE_HEIGHT);
    const endVec = toVec3(three, element.path[i + 1], WIRE_HEIGHT);
    const mesh = strokeBetween(three, startVec, endVec, WIRE_RADIUS, material);
    if (mesh) {
      group.add(mesh);
    }
  }

  const terminals: Vec2[] = [];
  if (element.path.length > 0) {
    terminals.push(element.path[0]);
    terminals.push(element.path[element.path.length - 1]);
  }

  return { group, terminals };
};

const buildAnsiIeeeResistorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `resistor-${element.id}`;

  const bodyMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, bodyMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const axisKey = element.orientation === "horizontal" ? "x" : "z";
  const crossKey = element.orientation === "horizontal" ? "z" : "x";
  const axisStart = element.start[axisKey];
  const axisEnd = element.end[axisKey];
  const axisDirection = axisEnd >= axisStart ? 1 : -1;
  const baseCross = element.start[crossKey];
  const totalLength = Math.abs(axisEnd - axisStart);

  const makePoint = (axisValue: number, offset = 0): Vec2 =>
    element.orientation === "horizontal"
      ? { x: axisValue, z: baseCross + offset }
      : { x: baseCross + offset, z: axisValue };

  if (totalLength <= SNAP_EPSILON) {
    return { group, terminals: [element.start, element.end] };
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const segStart = toVec3(three, points[i], COMPONENT_HEIGHT);
    const segEnd = toVec3(three, points[i + 1], COMPONENT_HEIGHT);
    const mesh = strokeBetween(three, segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
    if (mesh) {
      group.add(mesh);
    }
  } else {
    const bodyStartAxis = axisStart + axisDirection * leadLength;
    const bodyEndAxis = axisEnd - axisDirection * leadLength;
    const amplitude = Math.min(bodyLength * 0.26, 0.45);
    const bodyPoints: Vec2[] = [];

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label);
    if (labelSprite) {
      const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
      const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildResistorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const standard = options.standard ?? DEFAULT_SYMBOL_STANDARD;
  if (standard === "iec") {
    return buildIecResistorElement(three, element, options);
  }
  return buildAnsiIeeeResistorElement(three, element, options);
};

const buildBatteryElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `battery-${element.id}`;

  const positiveMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const negativeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, BATTERY_SPEC.axis);
  const positiveMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const negativeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, positiveMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, negativeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const axisKey = element.orientation === "horizontal" ? "x" : "z";
  const crossKey = element.orientation === "horizontal" ? "z" : "x";
  const axisStart = element.start[axisKey];
  const axisEnd = element.end[axisKey];
  const baseCross = element.start[crossKey];
  const axisDirection = axisEnd >= axisStart ? 1 : -1;
  const totalLength = Math.abs(axisEnd - axisStart);

  if (totalLength <= SNAP_EPSILON) {
    return { group, terminals: [element.start, element.end] };
  }

  const toPoint = (axisValue: number, offset = 0): Vec2 =>
    element.orientation === "horizontal"
      ? { x: axisValue, z: baseCross + offset }
      : { x: baseCross + offset, z: axisValue };

  const toAxis = (t: number) => axisStart + axisDirection * (totalLength * t);

  const minLeadT = Math.min(0.26, Math.max(0.12, 0.4 / totalLength));
  let negativeT = minLeadT;
  let positiveT = 1 - minLeadT;
  const minGapT = Math.min(0.55, Math.max(0.22, 0.45 / totalLength));

  if (positiveT - negativeT < minGapT) {
    const midT = 0.5;
    const halfGap = minGapT / 2;
    negativeT = midT - halfGap;
    positiveT = midT + halfGap;
  }

  negativeT = Math.max(Math.min(negativeT, 0.86), 0.08);
  positiveT = Math.min(Math.max(positiveT, 0.14), 0.92);

  const negativeAxis = toAxis(negativeT);
  const positiveAxis = toAxis(positiveT);

  const positiveLength = Math.min(1.45, Math.max(totalLength * 0.32, 0.95));
  const negativeLength = positiveLength * 0.65;
  const plateThickness = COMPONENT_STROKE_WIDTH;

  if (element.orientation === "horizontal") {
    const positivePlate = new three.Mesh(
      new three.BoxGeometry(plateThickness, STROKE_DEPTH, positiveLength),
      positiveMaterial
    );
    positivePlate.position.set(positiveAxis, COMPONENT_HEIGHT, baseCross);

    const negativePlate = new three.Mesh(
      new three.BoxGeometry(plateThickness, STROKE_DEPTH, negativeLength),
      negativeMaterial
    );
    negativePlate.position.set(negativeAxis, COMPONENT_HEIGHT, baseCross);

    group.add(positivePlate, negativePlate);
  } else {
    const positivePlate = new three.Mesh(
      new three.BoxGeometry(positiveLength, STROKE_DEPTH, plateThickness),
      positiveMaterial
    );
    positivePlate.position.set(baseCross, COMPONENT_HEIGHT, positiveAxis);

    const negativePlate = new three.Mesh(
      new three.BoxGeometry(negativeLength, STROKE_DEPTH, plateThickness),
      negativeMaterial
    );
    negativePlate.position.set(baseCross, COMPONENT_HEIGHT, negativeAxis);

    group.add(positivePlate, negativePlate);
  }

  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEndMesh) {
    group.add(leadEndMesh);
  }

  if (!options.preview) {
    const offset = element.orientation === "horizontal" ? { x: 0.72, z: 0.0 } : { x: 0.0, z: 0.72 };
    const plusLabel = createLabelSprite(three, "+", "#111111");
    if (plusLabel) {
      const target = element.orientation === "horizontal"
        ? { x: positiveAxis + offset.x, z: baseCross + 0.0 }
        : { x: baseCross + 0.0, z: positiveAxis + offset.z };
      plusLabel.position.copy(toVec3(three, target, COMPONENT_HEIGHT + 0.12));
      plusLabel.scale.set(0.9, 0.9, 1);
      group.add(plusLabel);
    }

    const minusLabel = createLabelSprite(three, "−", "#111111");
    if (minusLabel) {
      const target = element.orientation === "horizontal"
        ? { x: negativeAxis - offset.x, z: baseCross + 0.0 }
        : { x: baseCross + 0.0, z: negativeAxis - offset.z };
      minusLabel.position.copy(toVec3(three, target, COMPONENT_HEIGHT + 0.12));
      minusLabel.scale.set(0.9, 0.9, 1);
      group.add(minusLabel);
    }
  }

  if (!options.preview) {
    const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
    const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
    const labelSprite = createLabelSprite(three, element.label ?? "V");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }

    const plusLabel = createLabelSprite(three, "+", "#ffffff");
    const minusLabel = createLabelSprite(three, "−", "#cdd6f4");

    if (plusLabel && minusLabel) {
      const axialOffset = BATTERY_SPEC.labelOffset.axial * axis.direction;
      if (element.orientation === "horizontal") {
        plusLabel.position.set(
          positiveCenterCoord + axialOffset,
          COMPONENT_HEIGHT + BATTERY_SPEC.labelOffset.vertical,
          axis.perpCoord + BATTERY_SPEC.labelOffset.lateral
        );
        minusLabel.position.set(
          negativeCenterCoord - axialOffset,
          COMPONENT_HEIGHT + BATTERY_SPEC.labelOffset.vertical,
          axis.perpCoord + BATTERY_SPEC.labelOffset.lateral
        );
      } else {
        plusLabel.position.set(
          axis.perpCoord + BATTERY_SPEC.labelOffset.lateral,
          COMPONENT_HEIGHT + BATTERY_SPEC.labelOffset.vertical,
          positiveCenterCoord + axialOffset
        );
        minusLabel.position.set(
          axis.perpCoord + BATTERY_SPEC.labelOffset.lateral,
          COMPONENT_HEIGHT + BATTERY_SPEC.labelOffset.vertical,
          negativeCenterCoord - axialOffset
        );
      }
      plusLabel.scale.set(0.9, 0.9, 1);
      minusLabel.scale.set(0.9, 0.9, 1);
      group.add(plusLabel, minusLabel);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildCapacitorElement = (three: any, element: TwoTerminalElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `capacitor-${element.id}`;

  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const dielectricMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.dielectric });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, CAPACITOR_SPEC.axis);
  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const dielectricMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.dielectric });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const axisKey = element.orientation === "horizontal" ? "x" : "z";
  const crossKey = element.orientation === "horizontal" ? "z" : "x";
  const axisStart = element.start[axisKey];
  const axisEnd = element.end[axisKey];
  const baseCross = element.start[crossKey];
  const axisDirection = axisEnd >= axisStart ? 1 : -1;
  const totalLength = Math.abs(axisEnd - axisStart);

  if (totalLength <= SNAP_EPSILON) {
    return { group, terminals: [element.start, element.end] };
  }

  const toPoint = (axisValue: number, offset = 0): Vec2 =>
    element.orientation === "horizontal"
      ? { x: axisValue, z: baseCross + offset }
      : { x: baseCross + offset, z: axisValue };

  const toAxis = (t: number) => axisStart + axisDirection * (totalLength * t);

  const leadFraction = Math.min(0.24, Math.max(0.12, 0.38 / totalLength));
  let innerStartT = leadFraction;
  let innerEndT = 1 - leadFraction;
  const minGapT = Math.min(0.5, Math.max(0.2, 0.35 / totalLength));

  if (innerEndT - innerStartT < minGapT) {
    const midT = 0.5;
    const halfGap = minGapT / 2;
    innerStartT = midT - halfGap;
    innerEndT = midT + halfGap;
  }

  innerStartT = Math.max(Math.min(innerStartT, 0.84), 0.08);
  innerEndT = Math.min(Math.max(innerEndT, 0.16), 0.92);

  const plateAAxis = toAxis(innerStartT);
  const plateBAxis = toAxis(innerEndT);
  const plateLength = Math.min(1.25, Math.max(totalLength * 0.3, 0.9));
  const dielectricThickness = Math.min(0.22, Math.max(totalLength * 0.08, 0.12));

  if (element.orientation === "horizontal") {
    const plateA = new three.Mesh(
      new three.BoxGeometry(COMPONENT_STROKE_WIDTH, STROKE_DEPTH, plateLength),
      plateMaterial
    );
    plateA.position.set(plateAAxis, COMPONENT_HEIGHT, baseCross);

    const plateB = new three.Mesh(
      new three.BoxGeometry(COMPONENT_STROKE_WIDTH, STROKE_DEPTH, plateLength),
      plateMaterial
    );
    plateB.position.set(plateBAxis, COMPONENT_HEIGHT, baseCross);

    const dielectric = new three.Mesh(
      new three.BoxGeometry(Math.abs(plateBAxis - plateAAxis), STROKE_DEPTH * 0.65, dielectricThickness),
      dielectricMaterial
    );
    dielectric.position.set((plateAAxis + plateBAxis) / 2, COMPONENT_HEIGHT, baseCross);

    group.add(plateA, plateB, dielectric);
  } else {
    const plateA = new three.Mesh(
      new three.BoxGeometry(plateLength, STROKE_DEPTH, COMPONENT_STROKE_WIDTH),
      plateMaterial
    );
    plateA.position.set(baseCross, COMPONENT_HEIGHT, plateAAxis);

    const plateB = new three.Mesh(
      new three.BoxGeometry(plateLength, STROKE_DEPTH, COMPONENT_STROKE_WIDTH),
      plateMaterial
    );
    plateB.position.set(baseCross, COMPONENT_HEIGHT, plateBAxis);

    const dielectric = new three.Mesh(
      new three.BoxGeometry(dielectricThickness, STROKE_DEPTH * 0.65, Math.abs(plateBAxis - plateAAxis)),
      dielectricMaterial
    );
    dielectric.position.set(baseCross, COMPONENT_HEIGHT, (plateAAxis + plateBAxis) / 2);

    group.add(plateA, plateB, dielectric);
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEndMesh) {
    group.add(leadEndMesh);
  }

  const gap = Math.min(plateSpacing * layout.scale, layout.bodyLength * 0.5);
  const axisStart = layout.axis === "x" ? layout.bodyStart.x : layout.bodyStart.z;
  const axisEnd = layout.axis === "x" ? layout.bodyEnd.x : layout.bodyEnd.z;
  const centerAxis = (axisStart + axisEnd) / 2;
  const plateOffset = gap * 0.5;
  const plateSize = plateLength * Math.max(layout.scale, 0.4);
  const thickness = 0.08;
  const plateHeight = 0.48;
  const dielectricHeight = 0.38;
  const cross = layout.crossAxis;

  const placePlate = (axisPosition: number, material: any) => {
    const geometry = layout.orientation === "horizontal"
      ? new three.BoxGeometry(thickness, plateHeight, plateSize)
      : new three.BoxGeometry(plateSize, plateHeight, thickness);
    const mesh = new three.Mesh(geometry, material);
    if (layout.axis === "x") {
      mesh.position.set(axisPosition, COMPONENT_HEIGHT, cross);
    } else {
      mesh.position.set(cross, COMPONENT_HEIGHT, axisPosition);
    }
    return mesh;
  };

  const negativeAxis = centerAxis - layout.direction * plateOffset;
  const positiveAxis = centerAxis + layout.direction * plateOffset;
  const plateA = placePlate(negativeAxis, plateMaterial);
  const plateB = placePlate(positiveAxis, plateMaterial);
  group.add(plateA, plateB);

  const dielectricGeometry = layout.orientation === "horizontal"
    ? new three.BoxGeometry(Math.max(gap * 0.4, 0.12), dielectricHeight, plateSize * 0.85)
    : new three.BoxGeometry(plateSize * 0.85, dielectricHeight, Math.max(gap * 0.4, 0.12));
  const dielectric = new three.Mesh(dielectricGeometry, dielectricMaterial);
  if (layout.axis === "x") {
    dielectric.position.set(centerAxis, COMPONENT_HEIGHT, cross);
  } else {
    dielectric.position.set(cross, COMPONENT_HEIGHT, centerAxis);
  }
  group.add(dielectric);

  if (!options.preview) {
    const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
    const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
    const labelSprite = createLabelSprite(three, element.label ?? "C");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildInductorElement = (three: any, element: TwoTerminalElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `inductor-${element.id}`;

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, INDUCTOR_SPEC.axis);
  const coilMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, coilMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const coilCount = 4;
  const axisKey = element.orientation === "horizontal" ? "x" : "z";
  const crossKey = element.orientation === "horizontal" ? "z" : "x";
  const axisStart = element.start[axisKey];
  const axisEnd = element.end[axisKey];
  const baseCross = element.start[crossKey];
  const axisDirection = axisEnd >= axisStart ? 1 : -1;
  const totalLength = Math.abs(axisEnd - axisStart);

  if (totalLength <= SNAP_EPSILON) {
    return { group, terminals: [element.start, element.end] };
  }

  const leadFraction = Math.min(0.2, Math.max(0.1, 0.32 / totalLength));
  const leadLength = totalLength * leadFraction;
  const bodyLength = Math.max(totalLength - 2 * leadLength, totalLength * 0.6);
  const bodyStartAxis = axisStart + axisDirection * ((totalLength - bodyLength) / 2);
  const spacing = bodyLength / (coilCount + 1);
  const coilRadius = Math.min(bodyLength / (coilCount * 2.2), 0.46);
  const coilTube = COMPONENT_STROKE_WIDTH * 0.36;

  const startTop = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endTop = toVec3(three, element.end, COMPONENT_HEIGHT);
  const bodyStartTop = toVec3(three, layout.bodyStart, COMPONENT_HEIGHT);
  const bodyEndTop = toVec3(three, layout.bodyEnd, COMPONENT_HEIGHT);

  const verticalStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startTop, WIRE_RADIUS, leadMaterial);
  const verticalEnd = cylinderBetween(three, endTop, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (verticalStart) {
    group.add(verticalStart);
  }
  if (verticalEnd) {
    group.add(verticalEnd);
  }

  const leadIn = cylinderBetween(three, startTop, bodyStartTop, WIRE_RADIUS, leadMaterial);
  const leadOut = cylinderBetween(three, bodyEndTop, endTop, WIRE_RADIUS, leadMaterial);
  if (leadIn) {
    group.add(leadIn);
  }
  if (leadOut) {
    group.add(leadOut);
  }

  const spacing = layout.bodyLength / coilCount;
  const radius = Math.min(0.45 * layout.scale + 0.1, spacing * 0.5);
  const tubeRadius = RESISTOR_RADIUS * 0.9;

  const availableLength = Math.max(axisLength - STROKE_WIDTH * 1.2, STROKE_WIDTH * 2.5);
  const rawRadius = availableLength / (coilCount * 2);
  const coilRadius = Math.max(Math.min(rawRadius, 0.55), STROKE_WIDTH * 0.8);
  const totalCoilWidth = coilCount * coilRadius * 2;
  const spacingTotal = Math.max(axisLength - totalCoilWidth, coilRadius * 0.4);
  const spacing = spacingTotal / (coilCount + 1);

  const centers: number[] = [];
  for (let i = 0; i < coilCount; i += 1) {
    const t = (i + 0.5) / coilCount;
    const torusGeometry = new three.TorusGeometry(radius, WIRE_RADIUS, 32, 96, Math.PI);
    const mesh = new three.Mesh(torusGeometry, coilMaterial);

    if (element.orientation === "horizontal") {
      const x = element.start.x + (element.end.x - element.start.x) * t;
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(x, COMPONENT_HEIGHT, element.start.z);
    } else {
      const z = element.start.z + (element.end.z - element.start.z) * t;
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(element.start.x, COMPONENT_HEIGHT, z);
    }

    group.add(mesh);
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEndMesh) {
    group.add(leadEndMesh);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "L", LABEL_COLOR, options, "inductor");
    if (labelSprite) {
      const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
      const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildLampElement = (three: any, element: TwoTerminalElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `lamp-${element.id}`;

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, LAMP_SPEC.axis);
  const ringMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.lampRing });
  const fillMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.lampFill,
    emissive: options.preview ? 0x000000 : 0xffeb99,
    emissiveIntensity: options.preview ? 0 : 0.6
  });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, ringMaterial, options, COLOR_HELPERS.lampRing);
  // Keep emissive properties for the fill material
  if (!options.preview) {
    fillMaterial.transparent = false;
    fillMaterial.opacity = 1;
  }
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const center = new three.Vector3(
    (element.start.x + element.end.x) / 2,
    COMPONENT_HEIGHT,
    (element.start.z + element.end.z) / 2
  );
  const disc = new three.Mesh(new three.CylinderGeometry(0.55, 0.55, STROKE_DEPTH * 0.6, 32), fillMaterial);
  disc.position.copy(center);
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(radius, 0.02, 16, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center3D);
  group.add(ring);

  const crossOffset = 0.42;
  const crossPoints: [Vec2, Vec2][] = [
    [
      { x: center.x - crossOffset, z: center.z - crossOffset },
      { x: center.x + crossOffset, z: center.z + crossOffset },
    ],
    [
      { x: center.x - crossOffset, z: center.z + crossOffset },
      { x: center.x + crossOffset, z: center.z - crossOffset },
    ],
  ];

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.02);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.02);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadInnerEnd) {
    group.add(leadInnerEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP", LABEL_COLOR, options, "lamp");
    if (labelSprite) {
      labelSprite.position.copy(center.clone().setY(center.y + 0.9));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildSwitchElement = (three: any, element: TwoTerminalElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `switch-${element.id}`;

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, SWITCH_SPEC.axis);
  const postMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const bladeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, postMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, bladeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  const postGeometry = new three.CylinderGeometry(0.18, 0.18, 0.55, 24);
  const postA = new three.Mesh(postGeometry, postMaterial);
  const postB = new three.Mesh(postGeometry, postMaterial);

  if (element.orientation === "horizontal") {
    postA.position.set(element.start.x + 0.3, COMPONENT_HEIGHT + 0.1, element.start.z);
    postB.position.set(element.end.x - 0.3, COMPONENT_HEIGHT + 0.1, element.end.z);
  } else {
    postA.position.set(element.start.x, COMPONENT_HEIGHT + 0.1, element.start.z + 0.3);
    postB.position.set(element.end.x, COMPONENT_HEIGHT + 0.1, element.end.z - 0.3);
  }

  const blade = new three.Mesh(new three.BoxGeometry(1.8, STROKE_DEPTH, COMPONENT_STROKE_WIDTH * 0.6), bladeMaterial);
  const bladePivot = new three.Object3D();
  bladePivot.position.copy(postA.position);
  blade.position.y = 0.1;
  if (element.orientation === "horizontal") {
    blade.rotation.z = -Math.PI / 6;
  } else {
    blade.rotation.x = Math.PI / 6;
  }
  bladePivot.add(blade);

  group.add(postA, postB, bladePivot);

  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }

  const dropBack = cylinderBetween(three, contactStubVec, bodyEndTop, WIRE_RADIUS * 0.75, leadMaterial);
  if (dropBack) {
    group.add(dropBack);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S", LABEL_COLOR, options, "switch");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildGroundElement = (three: any, element: GroundElement, options: BuildOptions = {}): BuildResult => {
  const group = new three.Group();
  group.name = `ground-${element.id}`;
  const lineMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.ground });
  styliseMaterial(three, lineMaterial, options, COLOR_HELPERS.ground);

  const lengths = [1.2, 0.8, 0.4];
  const offsets = [0, -0.18, -0.34];
  const barThickness = STROKE_WIDTH;
  const barDepth = STROKE_DEPTH;

  lengths.forEach((length, index) => {
    const geometry = element.orientation === "horizontal"
      ? new three.BoxGeometry(length, barDepth, barThickness)
      : new three.BoxGeometry(barThickness, barDepth, length);
    const bar = new three.Mesh(geometry, lineMaterial);
    bar.position.set(element.position.x, COMPONENT_HEIGHT + offsets[index], element.position.z);
    group.add(bar);
  });

  return { group, terminals: [element.position] };
};

// LED builder with glowing effect
const buildLEDElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `led-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  // LED colors based on typical LED colors
  const ledColor = 0x22c55e; // Default green
  const ledGlowColor = 0x4ade80;

  const bodyMaterial = new three.MeshStandardMaterial({
    color: ledColor,
    transparent: true,
    opacity: 0.85,
    emissive: options.preview ? 0x000000 : ledGlowColor,
    emissiveIntensity: options.preview ? 0 : 0.4
  });
  const cathodeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, cathodeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyLength = Math.min(metrics.length * 0.5, 0.6);
  const leadLength = (metrics.length - bodyLength) / 2;

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);
  const bodyCenter = metrics.offsetPoint(metrics.length / 2);

  // LED dome shape
  const domeRadius = bodyLength * 0.35;
  const dome = new three.Mesh(
    new three.SphereGeometry(domeRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    bodyMaterial
  );
  dome.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + 0.1));
  group.add(dome);

  // LED base cylinder
  const base = new three.Mesh(
    new three.CylinderGeometry(domeRadius, domeRadius * 0.8, 0.15, 24),
    bodyMaterial
  );
  base.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  group.add(base);

  // Add arrows to indicate light emission
  if (!options.preview) {
    const arrowMaterial = new three.MeshStandardMaterial({
      color: ledGlowColor,
      emissive: ledGlowColor,
      emissiveIntensity: 0.5
    });
    for (let i = 0; i < 2; i++) {
      const arrow = new three.Mesh(
        new three.ConeGeometry(0.04, 0.15, 6),
        arrowMaterial
      );
      const offset = i === 0 ? 0.15 : -0.15;
      if (metrics.orientation === "horizontal") {
        arrow.position.set(bodyCenter.x, COMPONENT_HEIGHT + 0.3, bodyCenter.z + offset);
        arrow.rotation.z = -Math.PI / 4;
      } else {
        arrow.position.set(bodyCenter.x + offset, COMPONENT_HEIGHT + 0.3, bodyCenter.z);
        arrow.rotation.x = Math.PI / 4;
      }
      group.add(arrow);
    }

    // Add point light for glow effect
    const glowLight = new three.PointLight(ledGlowColor, 0.5, 1.5);
    glowLight.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + 0.2));
    group.add(glowLight);
  }

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStart, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, bodyEnd, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (startLead) group.add(startLead);
  if (endLead) group.add(endLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "LED", LABEL_COLOR, options, "led");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(
        toVec3(three, element.start, COMPONENT_HEIGHT),
        toVec3(three, element.end, COMPONENT_HEIGHT)
      ).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT + 0.1;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

// Fuse builder with glass tube appearance
const buildFuseElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `fuse-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const glassMaterial = new three.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    metalness: 0.1,
    roughness: 0.1
  });
  const capMaterial = new three.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.6, roughness: 0.3 });
  const filamentMaterial = new three.MeshStandardMaterial({ color: 0x333333 });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyLength = Math.min(metrics.length * 0.6, 0.7);
  const leadLength = (metrics.length - bodyLength) / 2;
  const bodyCenter = metrics.offsetPoint(metrics.length / 2);

  // Glass tube
  const tubeRadius = 0.12;
  const tubeGeom = metrics.orientation === "horizontal"
    ? new three.CylinderGeometry(tubeRadius, tubeRadius, bodyLength * 0.7, 16, 1, true)
    : new three.CylinderGeometry(tubeRadius, tubeRadius, bodyLength * 0.7, 16, 1, true);
  const tube = new three.Mesh(tubeGeom, glassMaterial);
  tube.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  if (metrics.orientation === "horizontal") {
    tube.rotation.z = Math.PI / 2;
  }
  group.add(tube);

  // Metal end caps
  const capGeom = new three.CylinderGeometry(tubeRadius * 1.1, tubeRadius * 1.1, 0.1, 16);
  const bodyStart = metrics.offsetPoint(leadLength + bodyLength * 0.15);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength - bodyLength * 0.15);

  const cap1 = new three.Mesh(capGeom, capMaterial);
  cap1.position.copy(toVec3(three, bodyStart, COMPONENT_HEIGHT));
  if (metrics.orientation === "horizontal") cap1.rotation.z = Math.PI / 2;

  const cap2 = new three.Mesh(capGeom, capMaterial);
  cap2.position.copy(toVec3(three, bodyEnd, COMPONENT_HEIGHT));
  if (metrics.orientation === "horizontal") cap2.rotation.z = Math.PI / 2;

  group.add(cap1, cap2);

  // Internal filament
  const filament = cylinderBetween(
    three,
    toVec3(three, bodyStart, COMPONENT_HEIGHT),
    toVec3(three, bodyEnd, COMPONENT_HEIGHT),
    0.015,
    filamentMaterial
  );
  if (filament) group.add(filament);

  // Leads
  const startLeadPoint = metrics.offsetPoint(leadLength);
  const endLeadPoint = metrics.offsetPoint(metrics.length - leadLength);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, startLeadPoint, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, endLeadPoint, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (startLead) group.add(startLead);
  if (endLead) group.add(endLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "F", LABEL_COLOR, options, "fuse");
    if (labelSprite) {
      labelSprite.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + LABEL_HEIGHT));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

// AC Source builder with sine wave symbol
const buildACSourceElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `ac_source-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const circleMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, circleMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyCenter = metrics.offsetPoint(metrics.length / 2);
  const circleRadius = Math.min(metrics.length * 0.25, 0.5);

  // Circle body
  const ring = new three.Mesh(
    new three.TorusGeometry(circleRadius, 0.04, 16, 48),
    circleMaterial
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  group.add(ring);

  // Sine wave inside circle (approximated with curve)
  const sinePoints: any[] = [];
  const sineSegments = 20;
  for (let i = 0; i <= sineSegments; i++) {
    const t = i / sineSegments;
    const x = (t - 0.5) * circleRadius * 1.4;
    const y = Math.sin(t * Math.PI * 2) * circleRadius * 0.3;
    sinePoints.push(new three.Vector3(x, y, 0));
  }

  const sineGeom = new three.TubeGeometry(
    new three.CatmullRomCurve3(sinePoints),
    20, 0.025, 8, false
  );
  const sineMesh = new three.Mesh(sineGeom, circleMaterial);
  sineMesh.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  if (metrics.orientation === "vertical") {
    sineMesh.rotation.y = Math.PI / 2;
  }
  group.add(sineMesh);

  // Leads
  const leadStart = metrics.offsetPoint(metrics.length / 2 - circleRadius);
  const leadEnd = metrics.offsetPoint(metrics.length / 2 + circleRadius);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, leadStart, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, leadEnd, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (startLead) group.add(startLead);
  if (endLead) group.add(endLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "AC", LABEL_COLOR, options, "ac_source");
    if (labelSprite) {
      labelSprite.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + LABEL_HEIGHT));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

// Motor builder with circular body and shaft
const buildMotorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `motor-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const bodyMaterial = new three.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.3, roughness: 0.6 });
  const shaftMaterial = new three.MeshStandardMaterial({ color: 0x8c8c8c, metalness: 0.7, roughness: 0.3 });
  const labelMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, labelMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyCenter = metrics.offsetPoint(metrics.length / 2);
  const bodyRadius = Math.min(metrics.length * 0.25, 0.45);

  // Motor body (circle with M)
  const ring = new three.Mesh(
    new three.TorusGeometry(bodyRadius, 0.05, 16, 48),
    bodyMaterial
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  group.add(ring);

  // Inner fill
  const disc = new three.Mesh(
    new three.CylinderGeometry(bodyRadius - 0.03, bodyRadius - 0.03, 0.04, 32),
    new three.MeshStandardMaterial({ color: 0x555555 })
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT));
  group.add(disc);

  // Shaft (small cylinder extending from motor)
  const shaft = new three.Mesh(
    new three.CylinderGeometry(0.06, 0.06, 0.25, 16),
    shaftMaterial
  );
  shaft.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + 0.15));
  group.add(shaft);

  // Leads
  const leadStart = metrics.offsetPoint(metrics.length / 2 - bodyRadius);
  const leadEnd = metrics.offsetPoint(metrics.length / 2 + bodyRadius);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, leadStart, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, leadEnd, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (startLead) group.add(startLead);
  if (endLead) group.add(endLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "M", LABEL_COLOR, options, "motor");
    if (labelSprite) {
      labelSprite.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.1));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

// Speaker builder with cone shape
const buildSpeakerElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `speaker-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const coneMaterial = new three.MeshStandardMaterial({ color: 0x4a4a4a });
  const frameMaterial = new three.MeshStandardMaterial({ color: 0x2d2d2d });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyCenter = metrics.offsetPoint(metrics.length / 2);
  const coneRadius = Math.min(metrics.length * 0.2, 0.35);

  // Speaker frame (back)
  const frame = new three.Mesh(
    new three.BoxGeometry(coneRadius * 1.8, 0.15, coneRadius * 1.8),
    frameMaterial
  );
  frame.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT - 0.05));
  group.add(frame);

  // Speaker cone
  const cone = new three.Mesh(
    new three.ConeGeometry(coneRadius, 0.25, 16),
    coneMaterial
  );
  cone.rotation.x = -Math.PI / 2;
  cone.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + 0.1));
  group.add(cone);

  // Sound waves (decorative curved lines)
  if (!options.preview) {
    const waveMaterial = new three.MeshStandardMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.5
    });
    for (let i = 1; i <= 2; i++) {
      const wave = new three.Mesh(
        new three.TorusGeometry(coneRadius * (0.5 + i * 0.3), 0.02, 8, 12, Math.PI),
        waveMaterial
      );
      if (metrics.orientation === "horizontal") {
        wave.rotation.y = Math.PI / 2;
        wave.position.set(bodyCenter.x + 0.15 + i * 0.1, COMPONENT_HEIGHT + 0.1, bodyCenter.z);
      } else {
        wave.rotation.x = 0;
        wave.position.set(bodyCenter.x, COMPONENT_HEIGHT + 0.1, bodyCenter.z + 0.15 + i * 0.1);
      }
      group.add(wave);
    }
  }

  // Leads
  const leadStart = metrics.offsetPoint(metrics.length / 2 - coneRadius * 1.2);
  const leadEnd = metrics.offsetPoint(metrics.length / 2 + coneRadius * 1.2);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, leadStart, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, leadEnd, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (startLead) group.add(startLead);
  if (endLead) group.add(endLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "SPK", LABEL_COLOR, options, "speaker");
    if (labelSprite) {
      labelSprite.position.copy(toVec3(three, bodyCenter, COMPONENT_HEIGHT + LABEL_HEIGHT));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildTwoTerminalElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  switch (element.kind) {
    case "resistor":
      return buildResistorElement(three, element, options);
    case "battery":
      return buildBatteryElement(three, element, options);
    case "capacitor":
      return buildCapacitorElement(three, element, options);
    case "capacitor-ceramic":
      return buildCapacitorElement(three, element, options);
    case "inductor":
      return buildInductorElement(three, element, options);
    case "thermistor":
      return buildResistorElement(three, element, options);
    case "crystal":
      return buildCapacitorElement(three, element, options);
    case "lamp":
      return buildLampElement(three, element, options);
    case "switch":
      return buildSwitchElement(three, element, options);
    case "diode":
      return buildDiodeElement(three, element, options);
    case "zener-diode":
      return buildDiodeElement(three, element, options);
    case "photodiode":
      return buildDiodeElement(three, element, options);
    case "led":
      return buildLEDElement(three, element, options);
    case "fuse":
      return buildFuseElement(three, element, options);
    case "ac_source":
      return buildACSourceElement(three, element, options);
    case "motor":
      return buildMotorElement(three, element, options);
    case "speaker":
      return buildSpeakerElement(three, element, options);
    default:
      return buildResistorElement(three, element, options);
  }
};

export const buildElement = (three: any, element: SchematicElement, options: BuildOptions): BuildResult => {
  const standard = options.standard ?? DEFAULT_SYMBOL_STANDARD;
  const resolvedOptions: BuildOptions = { ...options, standard };
  if (element.kind === "wire") {
    return buildWireElement(three, element as WireElement, resolvedOptions);
  }
  if (element.kind === "ground") {
    return buildGroundElement(three, element as GroundElement, resolvedOptions);
  }
  return buildTwoTerminalElement(three, element as TwoTerminalElement, resolvedOptions);
};

export const buildNodeMesh = (three: any, point: Vec2, options: BuildOptions = {}) => {
  const material = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.nodeFill
  });
  styliseMaterial(three, material, options, COLOR_HELPERS.nodeFill);
  const nodeRadius = profile.general.nodeRadius;
  const geoKey = `sphere:${nodeRadius.toFixed(4)}`;
  const geometry = getCachedGeometry(geoKey, () =>
    new three.SphereGeometry(nodeRadius, 28, 20)
  );
  const mesh = new three.Mesh(geometry, material);
  mesh.position.copy(toVec3(three, point, COMPONENT_HEIGHT + 0.08));
  return mesh;
};

export const disposeThreeObject = (root: any) => {
  if (!root || typeof root.traverse !== "function") {
    return;
  }
  const disposeMaterial = (material: any) => {
    if (!material) {
      return;
    }
    if (Array.isArray(material)) {
      material.forEach((mat) => disposeMaterial(mat));
      return;
    }
    if (material.map && typeof material.map.dispose === "function") {
      material.map.dispose();
    }
    if (material.dispose && typeof material.dispose === "function") {
      material.dispose();
    }
  };

  root.traverse((child: any) => {
    // Skip cached geometries — they are reused across scene rebuilds.
    if (child.geometry && typeof child.geometry.dispose === "function" && !_cachedGeometries.has(child.geometry)) {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
    if (child.userData && child.userData.texture && typeof child.userData.texture.dispose === "function") {
      child.userData.texture.dispose();
    }
    if (child.userData && child.userData.material && typeof child.userData.material.dispose === "function") {
      disposeMaterial(child.userData.material);
    }
  });
};
