import { DEFAULT_SYMBOL_STANDARD, STANDARD_PROFILES, SYMBOL_DIMENSIONS, SymbolStandard } from "./standards";
import { GroundElement, Orientation, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

const DEFAULT_PROFILE = STANDARD_PROFILES[DEFAULT_SYMBOL_STANDARD];

export const WIRE_RADIUS = SYMBOL_DIMENSIONS.wireRadius;
export const RESISTOR_RADIUS = SYMBOL_DIMENSIONS.strokeRadius;
export const NODE_RADIUS = SYMBOL_DIMENSIONS.nodeRadius;
export const WIRE_HEIGHT = SYMBOL_DIMENSIONS.wireHeight;
export const COMPONENT_HEIGHT = SYMBOL_DIMENSIONS.componentHeight;
export const LABEL_HEIGHT = SYMBOL_DIMENSIONS.labelHeight;

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

const positionOnAxis = (
  mesh: any,
  orientation: "horizontal" | "vertical",
  axisCoord: number,
  perpCoord: number,
  height: number
) => {
  if (orientation === "horizontal") {
    mesh.position.set(axisCoord, height, perpCoord);
  } else {
    mesh.position.set(perpCoord, height, axisCoord);
  }
};

const createAxisAlignedBoxGeometry = (three: any, orientation: "horizontal" | "vertical", axisLength: number, height: number, perpLength: number) =>
  orientation === "horizontal"
    ? new three.BoxGeometry(axisLength, height, perpLength)
    : new three.BoxGeometry(perpLength, height, axisLength);

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

// ---------------------------------------------------------------------------
// Shared geometry cache — avoids re-creating identical Three.js buffer
// geometries for every component on every scene rebuild.  The cache is keyed
// by a short string describing the geometry parameters (type+dimensions) and
// stores the geometry once.  Geometries in the cache are never disposed so
// they survive across rebuilds; the memory cost is negligible (a handful of
// small BufferGeometry instances).
// ---------------------------------------------------------------------------
const _geometryCache = new Map<string, any>();
const _cachedGeometries = new Set<any>();

const getCachedGeometry = (key: string, factory: () => any): any => {
  let geom = _geometryCache.get(key);
  if (!geom) {
    geom = factory();
    _geometryCache.set(key, geom);
    _cachedGeometries.add(geom);
  }
  return geom;
};

const cylinderBetween = (three: any, startVec: any, endVec: any, radius: number, material: any) => {
  const direction = new three.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  if (length <= SNAP_EPSILON) {
    return null;
  }
  // Use a cached unit-height cylinder geometry; scale mesh to actual length.
  const geoKey = `cyl:${radius.toFixed(4)}`;
  const unitGeom = getCachedGeometry(geoKey, () =>
    new three.CylinderGeometry(radius, radius, 1, 24, 1, true)
  );
  const mesh = new three.Mesh(unitGeom, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.scale.set(1, length, 1);
  const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);
  return mesh;
};

const createLabelSprite = (
  three: any,
  text: string,
  color: string = LABEL_COLOR,
  options: BuildOptions = {},
  componentKind?: string
) => {
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
    const mesh = cylinderBetween(three, startVec, endVec, wireRadius, material);
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

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, RESISTOR_SPEC.axis);
  const resistorMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const wireMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const iecMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, wireMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, iecMaterial, options, COLOR_HELPERS.stroke);

  const standard = options.standard ?? DEFAULT_STANDARD;
  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  if (standard === "iec") {
    const axisDelta =
      element.orientation === "horizontal"
        ? element.end.x - element.start.x
        : element.end.z - element.start.z;
    const axisLength = Math.max(Math.abs(axisDelta), 1e-3);
    const bodyThickness = 0.38;
    const bodyHeight = 0.28;
    const centerX = (element.start.x + element.end.x) / 2;
    const centerZ = (element.start.z + element.end.z) / 2;
    const geometry =
      element.orientation === "horizontal"
        ? new three.BoxGeometry(axisLength, bodyHeight, bodyThickness)
        : new three.BoxGeometry(bodyThickness, bodyHeight, axisLength);
    const body = new three.Mesh(geometry, resistorMaterial);
    body.position.set(centerX, COMPONENT_HEIGHT, centerZ);
    group.add(body);
  } else {
    const zigCount = 6;
    const amplitude = 0.35;
    const points: Vec2[] = [];

    for (let i = 0; i <= zigCount; i += 1) {
      const t = i / zigCount;
      if (element.orientation === "horizontal") {
        const x = element.start.x + (element.end.x - element.start.x) * t;
        const zOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? -amplitude : amplitude);
        points.push({ x, z: element.start.z + zOffset });
      } else {
        const z = element.start.z + (element.end.z - element.start.z) * t;
        const xOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? amplitude : -amplitude);
        points.push({ x: element.start.x + xOffset, z });
      }
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const segStart = toVec3(three, points[i], COMPONENT_HEIGHT);
      const segEnd = toVec3(three, points[i + 1], COMPONENT_HEIGHT);
      const mesh = cylinderBetween(three, segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
      if (mesh) {
        group.add(mesh);
      }
    }
  }
  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label, LABEL_COLOR, options, "resistor");
    if (labelSprite) {
      const labelAnchor = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const labelPosition = toVec3(three, labelAnchor, COMPONENT_HEIGHT);
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
      group.add(labelSprite);
    }
  }

  // ── Resistance scatter-field aura ──────────────────────────────────────────
  // A translucent envelope around the resistor body that hints at the mirror-like
  // atomic lattice inside: electrons bounce off it like light in a mirrored cavity.
  // Only shown in full 3D view (not preview mode) and only when body is large enough.
  if (!options.preview && bodyLength > 0.15) {
    const centerDistance = leadLength + bodyLength / 2;
    const centerPoint = metrics.offsetPoint(centerDistance);
    // How much larger than the resistor body the aura extends on each side
    const AURA_EXPANSION = 0.22;
    // Scale increment between the two nested glow shells
    const AURA_SHELL_SCALE_INCREMENT = 0.22;
    const profile = resolveProfile(options.standard);
    const auraThickness = profile.resistor.bodyThickness + AURA_EXPANSION;
    const auraDepth = profile.resistor.bodyDepth + AURA_EXPANSION;
    const auraLength = bodyLength + AURA_EXPANSION;

    const auraGeom = metrics.orientation === "horizontal"
      ? new three.BoxGeometry(auraLength, auraThickness, auraDepth)
      : new three.BoxGeometry(auraDepth, auraThickness, auraLength);

    // Two nested shells give a soft, glowing "field" look
    for (let shell = 0; shell < 2; shell++) {
      const shellScale = 1 + shell * AURA_SHELL_SCALE_INCREMENT;
      const auraMat = new three.MeshBasicMaterial({
        color: 0xaaccff,
        transparent: true,
        opacity: shell === 0 ? 0.07 : 0.03,
        depthWrite: false,
        side: three.BackSide
      });
      const auraMesh = new three.Mesh(auraGeom, auraMat);
      auraMesh.position.copy(toVec3(three, centerPoint, COMPONENT_HEIGHT));
      auraMesh.scale.setScalar(shellScale);
      auraMesh.name = `resistor-aura-${shell}`;
      group.add(auraMesh);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildIecResistorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `resistor-${element.id}`;
  const bodyMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  styliseMaterial(three, bodyMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const axisVector = new three.Vector3().subVectors(endVec, startVec);
  const axisLength = axisVector.length();

  if (axisLength <= SNAP_EPSILON) {
    return { group, terminals: [element.start, element.end] };
  }

  const axisDirection = axisVector.clone().normalize();
  let leadLength = Math.min(axisLength * 0.25, 0.45);
  const maxLeadLength = Math.max(axisLength / 2 - 0.05, 0);
  leadLength = Math.min(leadLength, maxLeadLength);
  leadLength = Math.max(leadLength, Math.min(0.12, axisLength / 4));

  let bodyLength = axisLength - leadLength * 2;
  const desiredBodyMin = Math.max(axisLength * 0.48, 0.32);
  if (bodyLength < desiredBodyMin) {
    bodyLength = Math.min(axisLength, Math.max(desiredBodyMin, axisLength - 0.16));
    leadLength = Math.max((axisLength - bodyLength) / 2, 0.08);
  }

  const bodyStartVec = startVec.clone().add(axisDirection.clone().multiplyScalar(leadLength));
  const bodyEndVec = endVec.clone().add(axisDirection.clone().multiplyScalar(-leadLength));
  const bodyMidpoint = new three.Vector3().addVectors(bodyStartVec, bodyEndVec).multiplyScalar(0.5);

  const bodyGeometry = new three.BoxGeometry(bodyLength, 0.3, 0.74);
  const bodyMesh = new three.Mesh(bodyGeometry, bodyMaterial);
  const axisOrientation = new three.Vector3(axisDirection.x, 0, axisDirection.z);
  if (axisOrientation.lengthSq() > 0) {
    axisOrientation.normalize();
    const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(1, 0, 0), axisOrientation);
    bodyMesh.setRotationFromQuaternion(quaternion);
  }
  bodyMesh.position.copy(bodyMidpoint);
  group.add(bodyMesh);

  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), bodyStartVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, bodyEndVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label);
    if (labelSprite) {
      labelSprite.position.copy(bodyMidpoint.clone());
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

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, BATTERY_SPEC.axis);
  const positiveMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const negativeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, positiveMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, negativeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const ratioSum =
    BATTERY_SPEC.sectionRatios.negative + BATTERY_SPEC.sectionRatios.gap + BATTERY_SPEC.sectionRatios.positive;
  const ratioScale = ratioSum > 0 ? axis.bodyLength / ratioSum : axis.bodyLength;
  const negativeLength = BATTERY_SPEC.sectionRatios.negative * ratioScale;
  const positiveLength = BATTERY_SPEC.sectionRatios.positive * ratioScale;

  const positiveCenterCoord =
    axis.direction === 1
      ? axis.bodyEndCoord - positiveLength / 2
      : axis.bodyStartCoord + positiveLength / 2;
  const negativeCenterCoord =
    axis.direction === 1
      ? axis.bodyStartCoord + negativeLength / 2
      : axis.bodyEndCoord - negativeLength / 2;

  const positiveGeometry = createAxisAlignedBoxGeometry(
    three,
    element.orientation,
    positiveLength,
    BATTERY_SPEC.plateHeight,
    BATTERY_SPEC.plateDepth
  );
  const negativeGeometry = createAxisAlignedBoxGeometry(
    three,
    element.orientation,
    negativeLength,
    BATTERY_SPEC.plateHeight,
    BATTERY_SPEC.plateDepth
  );

  const positivePlate = new three.Mesh(positiveGeometry, positiveMaterial);
  const negativePlate = new three.Mesh(negativeGeometry, negativeMaterial);
  positionOnAxis(positivePlate, element.orientation, positiveCenterCoord, axis.perpCoord, COMPONENT_HEIGHT);
  positionOnAxis(negativePlate, element.orientation, negativeCenterCoord, axis.perpCoord, COMPONENT_HEIGHT);
  group.add(positivePlate, negativePlate);

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT - 0.05),
    WIRE_RADIUS,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT - 0.05),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelText = element.label ?? "V";
    const labelSprite = createLabelSprite(three, labelText, LABEL_COLOR, options, "battery");
    if (labelSprite) {
      const midpoint = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const midpointVec = toVec3(three, midpoint, COMPONENT_HEIGHT);
      midpointVec.y += LABEL_HEIGHT;
      labelSprite.position.copy(midpointVec);
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

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, CAPACITOR_SPEC.axis);
  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const dielectricMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.dielectric });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const ratioSum = CAPACITOR_SPEC.sectionRatios.gap + CAPACITOR_SPEC.sectionRatios.plate * 2;
  const ratioScale = ratioSum > 0 ? axis.bodyLength / ratioSum : axis.bodyLength;
  const plateThickness = CAPACITOR_SPEC.sectionRatios.plate * ratioScale;
  const gapThickness = CAPACITOR_SPEC.sectionRatios.gap * ratioScale;
  const plateOffset = gapThickness / 2 + plateThickness / 2;

  const plateACenter = axis.centerCoord - axis.direction * plateOffset;
  const plateBCenter = axis.centerCoord + axis.direction * plateOffset;

  const plateGeometry = createAxisAlignedBoxGeometry(
    three,
    element.orientation,
    plateThickness,
    CAPACITOR_SPEC.plateHeight,
    CAPACITOR_SPEC.plateDepth
  );
  const dielectricGeometry = createAxisAlignedBoxGeometry(
    three,
    element.orientation,
    gapThickness,
    CAPACITOR_SPEC.dielectricHeight,
    CAPACITOR_SPEC.dielectricDepth
  );

  const plateA = new three.Mesh(plateGeometry, plateMaterial);
  const plateB = new three.Mesh(plateGeometry.clone(), plateMaterial);
  const dielectric = new three.Mesh(dielectricGeometry, dielectricMaterial);
  positionOnAxis(plateA, element.orientation, plateACenter, axis.perpCoord, COMPONENT_HEIGHT);
  positionOnAxis(plateB, element.orientation, plateBCenter, axis.perpCoord, COMPONENT_HEIGHT);
  positionOnAxis(dielectric, element.orientation, axis.centerCoord, axis.perpCoord, COMPONENT_HEIGHT);
  group.add(plateA, plateB, dielectric);

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "C", LABEL_COLOR, options, "capacitor");
    if (labelSprite) {
      const anchor = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const labelPosition = toVec3(three, anchor, COMPONENT_HEIGHT);
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
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

  const usableLength = Math.max(axis.bodyLength - INDUCTOR_SPEC.endClearance * 2, axis.bodyLength * 0.6);
  const startOffset = (axis.bodyLength - usableLength) / 2;
  const coilSpacing = usableLength / Math.max(1, INDUCTOR_SPEC.coilCount);
  const coilTubeRadius = RESISTOR_RADIUS * INDUCTOR_SPEC.coilTubeRadiusScale;

  for (let i = 0; i < INDUCTOR_SPEC.coilCount; i += 1) {
    const centerOffset = startOffset + coilSpacing * (i + 0.5);
    const centerCoord = axis.bodyStartCoord + axis.direction * centerOffset;
    const torus = new three.TorusGeometry(INDUCTOR_SPEC.coilRadius, coilTubeRadius, 18, 48, INDUCTOR_SPEC.coilArc);
    const mesh = new three.Mesh(torus, coilMaterial);
    if (element.orientation === "horizontal") {
      mesh.rotation.y = Math.PI / 2;
    } else {
      mesh.rotation.x = Math.PI / 2;
    }
    positionOnAxis(mesh, element.orientation, centerCoord, axis.perpCoord, COMPONENT_HEIGHT);
    group.add(mesh);
  }

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "L", LABEL_COLOR, options, "inductor");
    if (labelSprite) {
      const anchor = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const labelPosition = toVec3(three, anchor, COMPONENT_HEIGHT);
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
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

  const center2D = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
  const center3D = toVec3(three, center2D, COMPONENT_HEIGHT);
  const disc = new three.Mesh(
    new three.CylinderGeometry(LAMP_SPEC.discRadius, LAMP_SPEC.discRadius, LAMP_SPEC.discThickness, 32),
    fillMaterial
  );

  const disc = new three.Mesh(new three.CylinderGeometry(0.55, 0.55, 0.02, 32), fillMaterial);
  disc.position.copy(center);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(LAMP_SPEC.ringRadius, LAMP_SPEC.ringTubeRadius, 16, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center3D);
  group.add(ring);

  const crossGeom = new three.BoxGeometry(LAMP_SPEC.crossLength, LAMP_SPEC.crossThickness, LAMP_SPEC.crossThickness);
  const crossA = new three.Mesh(crossGeom, ringMaterial);
  const crossB = new three.Mesh(crossGeom, ringMaterial);
  crossA.position.copy(center3D);
  crossB.position.copy(center3D);
  crossA.rotation.y = Math.PI / 4;
  crossB.rotation.y = -Math.PI / 4;
  group.add(crossA, crossB);

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT - 0.02),
    WIRE_RADIUS,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT - 0.02),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP", LABEL_COLOR, options, "lamp");
    if (labelSprite) {
      labelSprite.position.copy(center.clone());
      labelSprite.position.y += 0.9;
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

  const postOffset = Math.min(SWITCH_SPEC.postOffset, axis.bodyLength / 3);
  const postACoord = axis.bodyStartCoord + axis.direction * postOffset;
  const postBCoord = axis.bodyEndCoord - axis.direction * postOffset;

  const postGeometry = new three.CylinderGeometry(SWITCH_SPEC.postRadius, SWITCH_SPEC.postRadius, SWITCH_SPEC.postHeight, 24);
  const postA = new three.Mesh(postGeometry, postMaterial);
  const postB = new three.Mesh(postGeometry, postMaterial);
  const postY = COMPONENT_HEIGHT + SWITCH_SPEC.postHeight / 2;

  const postAPos2D = resolveAxialVec2(element.orientation, postACoord, axis.perpCoord);
  const postBPos2D = resolveAxialVec2(element.orientation, postBCoord, axis.perpCoord);
  postA.position.set(postAPos2D.x, postY, postAPos2D.z);
  postB.position.set(postBPos2D.x, postY, postBPos2D.z);
  group.add(postA, postB);

  const bladeLengthRaw = axis.bodyLength - postOffset * 2;
  const bladeLength = clamp(bladeLengthRaw, SWITCH_SPEC.bladeLength * 0.4, SWITCH_SPEC.bladeLength);
  const bladeThickness = SWITCH_SPEC.bladeRadius * 2;
  const bladeGeometry = new three.BoxGeometry(bladeLength, bladeThickness, bladeThickness);
  const blade = new three.Mesh(bladeGeometry, bladeMaterial);
  const bladePivot = new three.Object3D();
  bladePivot.position.set(postAPos2D.x, postY + SWITCH_SPEC.postHeight / 2, postAPos2D.z);

  if (element.orientation === "horizontal") {
    blade.position.x = bladeLength / 2;
    const openAngle = (Math.PI / 180) * SWITCH_SPEC.bladeAngleDeg * -axis.direction;
    blade.rotation.z = openAngle;
  } else {
    blade.rotation.y = Math.PI / 2;
    blade.position.z = bladeLength / 2;
    const openAngle = (Math.PI / 180) * SWITCH_SPEC.bladeAngleDeg * axis.direction;
    blade.rotation.x = openAngle;
  }

  bladePivot.add(blade);
  group.add(bladePivot);

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT - 0.05),
    WIRE_RADIUS,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT - 0.05),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    leadMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (endLead) {
    group.add(endLead);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S", LABEL_COLOR, options, "switch");
    if (labelSprite) {
      const anchor = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const labelPosition = toVec3(three, anchor, COMPONENT_HEIGHT);
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildDiodeElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `diode-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const bodyMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const cathodeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, bodyMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, cathodeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const bodyLength = Math.min(metrics.length * 0.6, 0.8);
  const leadLength = (metrics.length - bodyLength) / 2;

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);

  const triangleHeight = bodyLength * 0.7;
  const triangleWidth = bodyLength * 0.5;

  const triangleCenter = metrics.offsetPoint(leadLength + bodyLength * 0.4);
  const cathodeCenter = metrics.offsetPoint(leadLength + bodyLength * 0.75);

  const shape = new three.Shape();
  if (metrics.orientation === "horizontal") {
    shape.moveTo(-triangleHeight / 2, 0);
    shape.lineTo(triangleHeight / 2, triangleWidth / 2);
    shape.lineTo(triangleHeight / 2, -triangleWidth / 2);
    shape.closePath();
  } else {
    shape.moveTo(0, -triangleHeight / 2);
    shape.lineTo(triangleWidth / 2, triangleHeight / 2);
    shape.lineTo(-triangleWidth / 2, triangleHeight / 2);
    shape.closePath();
  }

  const extrudeSettings = { depth: 0.12, bevelEnabled: false };
  const triangleGeom = new three.ExtrudeGeometry(shape, extrudeSettings);
  const triangle = new three.Mesh(triangleGeom, bodyMaterial);
  triangle.position.copy(toVec3(three, triangleCenter, COMPONENT_HEIGHT));
  
  if (metrics.orientation === "horizontal") {
    triangle.rotation.y = Math.PI / 2;
    triangle.position.z -= 0.06;
  } else {
    triangle.rotation.x = -Math.PI / 2;
    triangle.position.x -= 0.06;
  }
  group.add(triangle);

  const cathodeGeom = metrics.orientation === "horizontal"
    ? new three.BoxGeometry(0.08, triangleWidth, 0.12)
    : new three.BoxGeometry(0.12, triangleWidth, 0.08);
  const cathode = new three.Mesh(cathodeGeom, cathodeMaterial);
  cathode.position.copy(toVec3(three, cathodeCenter, COMPONENT_HEIGHT));
  group.add(cathode);

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

  if (startLead) {
    group.add(startLead);
  }
  if (endLead) {
    group.add(endLead);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "D", LABEL_COLOR, options, "diode");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(
        toVec3(three, element.start, COMPONENT_HEIGHT),
        toVec3(three, element.end, COMPONENT_HEIGHT)
      ).multiplyScalar(0.5);
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

  GROUND_SPEC.barWidths.forEach((width, index) => {
    const geometry = createAxisAlignedBoxGeometry(
      three,
      element.orientation,
      width,
      GROUND_SPEC.barThickness,
      GROUND_SPEC.barThickness
    );
    const bar = new three.Mesh(geometry, lineMaterial);
    const heightOffset = -GROUND_SPEC.barSpacing * index;
    bar.position.set(
      element.position.x,
      COMPONENT_HEIGHT + heightOffset,
      element.position.z
    );
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
