import { DEFAULT_SYMBOL_STANDARD, STANDARD_PROFILES, SymbolStandard } from "./standards";
import { GroundElement, MultiTerminalElement, Orientation, SchematicElement, ThreeTerminalElement, TwoTerminalElement, Vec2, WireElement } from "./types";
import {
  THREE_COLORS,
  THREE_STROKE_RADII,
  HEIGHT_LAYERS,
} from "./visualConstants";

// Use centralized visual constants for 3D rendering
export const WIRE_RADIUS = THREE_STROKE_RADII.wire;
export const RESISTOR_RADIUS = THREE_STROKE_RADII.resistor;
export const NODE_RADIUS = THREE_STROKE_RADII.node;
export const WIRE_HEIGHT = HEIGHT_LAYERS.wire;
export const COMPONENT_HEIGHT = HEIGHT_LAYERS.component;
export const LABEL_HEIGHT = HEIGHT_LAYERS.label;

type BuildOptions = {
  preview?: boolean;
  highlight?: boolean;
  highlightColor?: number;
  standard?: SymbolStandard;
};

type BuildResult = {
  group: any;
  terminals: Vec2[];
};

// Use centralized color constants for 3D rendering
const COLOR_HELPERS = {
  stroke: THREE_COLORS.stroke,
  highlight: THREE_COLORS.highlight,
  preview: THREE_COLORS.preview,
  nodeFill: THREE_COLORS.nodeFill,
  plate: THREE_COLORS.plate,
  dielectric: THREE_COLORS.dielectric,
  lampRing: THREE_COLORS.lampRing,
  lampFill: THREE_COLORS.lampFill,
  ground: THREE_COLORS.ground
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

type AxisMetrics = {
  orientation: Orientation;
  length: number;
  direction: 1 | -1;
  offsetPoint: (distance: number) => Vec2;
  start: Vec2;
  end: Vec2;
};

const computeAxisMetrics = (element: TwoTerminalElement): AxisMetrics => {
  const orientation = element.orientation;
  if (orientation === "horizontal") {
    const delta = element.end.x - element.start.x;
    const direction: 1 | -1 = (delta >= 0 ? 1 : -1);
    const length = Math.abs(delta);
    const baseZ = element.start.z;
    return {
      orientation,
      length,
      direction,
      start: element.start,
      end: element.end,
      offsetPoint: (distance: number) => ({ x: element.start.x + distance * direction, z: baseZ }),
    };
  }

  const delta = element.end.z - element.start.z;
  const direction: 1 | -1 = (delta >= 0 ? 1 : -1);
  const length = Math.abs(delta);
  const baseX = element.start.x;
  return {
    orientation,
    length,
    direction,
    start: element.start,
    end: element.end,
    offsetPoint: (distance: number) => ({ x: baseX, z: element.start.z + distance * direction }),
  };
};

const resolveProfile = (standard?: SymbolStandard) => STANDARD_PROFILES[standard ?? DEFAULT_SYMBOL_STANDARD];

const toVec3 = (three: any, point: Vec2, height: number = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

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

const cylinderBetween = (three: any, startVec: any, endVec: any, radius: number, material: any) => {
  const direction = new three.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  if (length <= SNAP_EPSILON) {
    return null;
  }
  const geometry = new three.CylinderGeometry(radius, radius, length, 24, 1, true);
  const mesh = new three.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);
  return mesh;
};

const createLabelSprite = (three: any, text: string, color: string = LABEL_COLOR, options: BuildOptions = {}, componentKind?: string) => {
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
  sprite.userData.componentKind = componentKind;
  return sprite;
};

const buildWireElement = (three: any, element: WireElement, options: BuildOptions): BuildResult => {
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

// Resistor color code helper for standard resistor values
const getResistorColorBands = (label: string): number[] | null => {
  // Extract resistance value from label (e.g., "R1", "100Ω", "1k")
  const match = label.match(/(\d+\.?\d*)\s*(k|K|M|m)?/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const multiplierChar = match[2];

  let resistance = value;
  if (multiplierChar === 'k' || multiplierChar === 'K') resistance *= 1000;
  if (multiplierChar === 'M' || multiplierChar === 'm') resistance *= 1000000;

  // Standard resistor color code: 0-9 = black, brown, red, orange, yellow, green, blue, violet, grey, white
  const colorCode = [0x000000, 0x964b00, 0xff0000, 0xffa500, 0xffff00, 0x00ff00, 0x0000ff, 0x9400d3, 0x808080, 0xffffff];

  // Get first two significant digits and multiplier
  const str = resistance.toExponential().replace('.', '');
  const digits = str.match(/(\d)(\d).*e\+?(-?\d+)/);
  if (!digits) return null;

  const d1 = parseInt(digits[1]);
  const d2 = parseInt(digits[2]);
  const exp = parseInt(digits[3]) - 1;

  if (d1 > 9 || d2 > 9 || exp < 0 || exp > 9) return null;

  return [colorCode[d1], colorCode[d2], colorCode[exp]];
};

const buildResistorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `resistor-${element.id}`;

  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;
  const bodyRadius = wireRadius * 0.92;

  const resistorMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const wireMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, wireMaterial, options, COLOR_HELPERS.stroke);

  const suggestedLead = clamp(
    metrics.length * profile.resistor.leadFraction,
    profile.general.leadMin,
    Math.min(profile.general.leadMax, metrics.length / 2)
  );
  let leadLength = Math.min(suggestedLead, metrics.length / 2);
  let bodyLength = Math.max(metrics.length - 2 * leadLength, 0);

  if (bodyLength < profile.resistor.minBodyLength && metrics.length > profile.resistor.minBodyLength) {
    bodyLength = profile.resistor.minBodyLength;
    leadLength = Math.max((metrics.length - bodyLength) / 2, profile.general.leadMin * 0.6);
  }

  if (metrics.length <= profile.resistor.minBodyLength) {
    bodyLength = Math.max(metrics.length * 0.62, metrics.length - 2 * profile.general.leadMin);
    leadLength = Math.max((metrics.length - bodyLength) / 2, metrics.length * 0.18);
  }

  leadLength = clamp(leadLength, 0, metrics.length / 2);
  bodyLength = clamp(bodyLength, SNAP_EPSILON, Math.max(metrics.length - 2 * leadLength, SNAP_EPSILON));

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);

  const leadStartVec = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStart, COMPONENT_HEIGHT),
    wireRadius,
    wireMaterial
  );
  const leadEndVec = cylinderBetween(
    three,
    toVec3(three, bodyEnd, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
    wireMaterial
  );

  if (leadStartVec) {
    group.add(leadStartVec);
  }
  if (leadEndVec) {
    group.add(leadEndVec);
  }

  if (profile.resistor.bodyStyle === "zigzag") {
    const segments = profile.resistor.zigzagSegments;
    const amplitudeLimit = bodyLength / (segments * 1.4);
    const amplitude = Math.min(profile.resistor.zigzagAmplitude, amplitudeLimit);
    const points: Vec2[] = [];

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const distance = leadLength + bodyLength * t;
      const basePoint = metrics.offsetPoint(distance);
      if (i === 0 || i === segments || amplitude <= SNAP_EPSILON) {
        points.push(basePoint);
        continue;
      }
      const polarity = i % 2 === 0 ? -1 : 1;
      if (metrics.orientation === "horizontal") {
        points.push({ x: basePoint.x, z: basePoint.z + amplitude * polarity });
      } else {
        points.push({ x: basePoint.x + amplitude * polarity, z: basePoint.z });
      }
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const segStart = toVec3(three, points[i], COMPONENT_HEIGHT);
      const segEnd = toVec3(three, points[i + 1], COMPONENT_HEIGHT);
      const mesh = cylinderBetween(three, segStart, segEnd, bodyRadius, resistorMaterial);
      if (mesh) {
        group.add(mesh);
      }
    }
  } else {
    const centerDistance = leadLength + bodyLength / 2;
    const centerPoint = metrics.offsetPoint(centerDistance);
    const thickness = profile.resistor.bodyThickness;
    const depth = profile.resistor.bodyDepth;
    const geometry = metrics.orientation === "horizontal"
      ? new three.BoxGeometry(bodyLength, thickness, depth)
      : new three.BoxGeometry(depth, thickness, bodyLength);
    const mesh = new three.Mesh(geometry, resistorMaterial);
    mesh.position.copy(toVec3(three, centerPoint, COMPONENT_HEIGHT));
    group.add(mesh);
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  // Add color bands for IEC (rectangular body) resistors
  if (!options.preview && profile.resistor.bodyStyle === "rectangle") {
    const colorBands = getResistorColorBands(element.label);
    if (colorBands && bodyLength > 0.4) {
      const bandWidth = 0.06;
      const bandHeight = profile.resistor.bodyThickness * 1.2;
      const bandDepth = profile.resistor.bodyDepth * 1.2;
      const spacing = bodyLength / 5;

      colorBands.forEach((color, index) => {
        const bandOffset = leadLength + spacing * (index + 1);
        const bandPos = metrics.offsetPoint(bandOffset);
        const bandGeometry = metrics.orientation === "horizontal"
          ? new three.BoxGeometry(bandWidth, bandHeight, bandDepth)
          : new three.BoxGeometry(bandDepth, bandHeight, bandWidth);
        const bandMaterial = new three.MeshStandardMaterial({
          color,
          metalness: 0.1,
          roughness: 0.4
        });
        const band = new three.Mesh(bandGeometry, bandMaterial);
        band.position.copy(toVec3(three, bandPos, COMPONENT_HEIGHT + 0.01));
        group.add(band);
      });
    }
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label, LABEL_COLOR, options, "resistor");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildBatteryElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `battery-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const positiveMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const negativeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, positiveMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, negativeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const plateThickness = profile.battery.plateThickness;
  const plateHeight = profile.battery.plateHeight;
  const maxGap = Math.max(metrics.length - plateThickness * 2, plateThickness * 0.4);
  const gapBetweenFaces = clamp(profile.battery.plateGap, plateThickness * 0.4, Math.max(maxGap, plateThickness * 0.4));
  const assemblyLength = Math.min(gapBetweenFaces + plateThickness * 2, metrics.length);
  const offsetStart = (metrics.length - assemblyLength) / 2;
  const negativeOuterS = offsetStart;
  const positiveOuterS = offsetStart + assemblyLength;
  const negativeCenterS = negativeOuterS + plateThickness / 2;
  const positiveCenterS = positiveOuterS - plateThickness / 2;

  const negativeCenter = metrics.offsetPoint(negativeCenterS);
  const positiveCenter = metrics.offsetPoint(positiveCenterS);
  const positiveWidth = profile.battery.positivePlateWidth;
  const negativeWidth = profile.battery.negativePlateWidth;

  const positiveGeometry = metrics.orientation === "horizontal"
    ? new three.BoxGeometry(plateThickness, plateHeight, positiveWidth)
    : new three.BoxGeometry(positiveWidth, plateHeight, plateThickness);
  const negativeGeometry = metrics.orientation === "horizontal"
    ? new three.BoxGeometry(plateThickness, plateHeight, negativeWidth)
    : new three.BoxGeometry(negativeWidth, plateHeight, plateThickness);

  const positivePlate = new three.Mesh(positiveGeometry, positiveMaterial);
  const negativePlate = new three.Mesh(negativeGeometry, negativeMaterial);
  positivePlate.position.copy(toVec3(three, positiveCenter, COMPONENT_HEIGHT));
  negativePlate.position.copy(toVec3(three, negativeCenter, COMPONENT_HEIGHT));
  group.add(positivePlate, negativePlate);

  const startLeadPoint = metrics.offsetPoint(negativeOuterS);
  const endLeadPoint = metrics.offsetPoint(positiveOuterS);

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

  if (startLead) {
    group.add(startLead);
  }
  if (endLead) {
    group.add(endLead);
  }

  if (!options.preview && profile.battery.showPolarityMarkers) {
    // Position polarity markers centered above (+) and below (-) the battery (our standard)
    const batteryMidpoint = new three.Vector3().addVectors(
      toVec3(three, positiveCenter, 0),
      toVec3(three, negativeCenter, 0)
    ).multiplyScalar(0.5);

    const markerHeight = COMPONENT_HEIGHT + 0.12;
    const markerOffset = Math.max(positiveWidth, negativeWidth) / 2 + 0.25;

    const plusSprite = createLabelSprite(three, "+", "#0f172a");
    const minusSprite = createLabelSprite(three, "−", "#0f172a");

    if (plusSprite) {
      plusSprite.position.set(batteryMidpoint.x, markerHeight, batteryMidpoint.z);
      // Position above the battery (in the +z direction for horizontal, +x for vertical)
      if (metrics.orientation === "horizontal") {
        plusSprite.position.z += markerOffset;
      } else {
        plusSprite.position.x += markerOffset;
      }
      plusSprite.scale.set(0.9, 0.9, 1);
      group.add(plusSprite);
    }
    if (minusSprite) {
      minusSprite.position.set(batteryMidpoint.x, markerHeight, batteryMidpoint.z);
      // Position below the battery (in the -z direction for horizontal, -x for vertical)
      if (metrics.orientation === "horizontal") {
        minusSprite.position.z -= markerOffset;
      } else {
        minusSprite.position.x -= markerOffset;
      }
      minusSprite.scale.set(0.9, 0.9, 1);
      group.add(minusSprite);
    }
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  if (!options.preview) {
    const labelText = element.label ?? "V";
    const labelSprite = createLabelSprite(three, labelText, LABEL_COLOR, options, "battery");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildCapacitorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `capacitor-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const plateThickness = profile.capacitor.plateThickness;
  const plateHeight = profile.capacitor.plateHeight;
  const plateWidth = profile.capacitor.plateWidth;
  const desiredGap = profile.capacitor.plateGap;
  const maxGap = Math.max(metrics.length - plateThickness * 2, plateThickness * 0.25);
  const gapBetweenFaces = clamp(desiredGap, plateThickness * 0.25, Math.max(maxGap, plateThickness * 0.25));
  const assemblyLength = Math.min(gapBetweenFaces + 2 * plateThickness, metrics.length);
  let leadLength = (metrics.length - assemblyLength) / 2;
  const minLead = profile.general.leadMin * 0.6;
  leadLength = clamp(leadLength, minLead, profile.general.leadMax);
  if (leadLength * 2 + assemblyLength > metrics.length) {
    leadLength = Math.max((metrics.length - assemblyLength) / 2, minLead);
  }

  const leftOuterS = leadLength;
  const rightOuterS = metrics.length - leadLength;
  const leftCenterS = leftOuterS + plateThickness / 2;
  const rightCenterS = rightOuterS - plateThickness / 2;

  const leftCenter = metrics.offsetPoint(leftCenterS);
  const rightCenter = metrics.offsetPoint(rightCenterS);

  const plateGeometry = metrics.orientation === "horizontal"
    ? new three.BoxGeometry(plateThickness, plateHeight, plateWidth)
    : new three.BoxGeometry(plateWidth, plateHeight, plateThickness);

  const plateA = new three.Mesh(plateGeometry, plateMaterial);
  const plateB = new three.Mesh(plateGeometry.clone(), plateMaterial);
  plateA.position.copy(toVec3(three, leftCenter, COMPONENT_HEIGHT));
  plateB.position.copy(toVec3(three, rightCenter, COMPONENT_HEIGHT));
  group.add(plateA, plateB);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, metrics.offsetPoint(leftOuterS), COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, metrics.offsetPoint(rightOuterS), COMPONENT_HEIGHT),
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

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "C", LABEL_COLOR, options, "capacitor");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildInductorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `inductor-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const coilMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, coilMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const coilCount = Math.max(profile.inductor.coilCount, 1);
  const suggestedLead = clamp(
    metrics.length * profile.inductor.leadFraction,
    profile.general.leadMin,
    Math.min(profile.general.leadMax, metrics.length / 2)
  );
  let leadLength = Math.min(suggestedLead, metrics.length / 2);
  let bodyLength = Math.max(metrics.length - 2 * leadLength, SNAP_EPSILON);
  if (bodyLength < profile.inductor.coilRadius * 1.2 && metrics.length > profile.inductor.coilRadius * 1.2) {
    bodyLength = profile.inductor.coilRadius * 1.2;
    leadLength = Math.max((metrics.length - bodyLength) / 2, profile.general.leadMin * 0.6);
  }

  const coilSpacing = bodyLength / coilCount;
  const tubeRadius = profile.inductor.coilTubeRadius;
  for (let i = 0; i < coilCount; i += 1) {
    const centerOffset = leadLength + coilSpacing * (i + 0.5);
    const centerPoint = metrics.offsetPoint(centerOffset);
    const torus = new three.TorusGeometry(
      profile.inductor.coilRadius,
      tubeRadius,
      20,
      64,
      profile.inductor.coilArc
    );
    const mesh = new three.Mesh(torus, coilMaterial);
    if (metrics.orientation === "horizontal") {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(centerPoint.x, COMPONENT_HEIGHT, centerPoint.z);
    } else {
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(centerPoint.x, COMPONENT_HEIGHT, centerPoint.z);
    }
    group.add(mesh);
  }

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, metrics.offsetPoint(leadLength < SNAP_EPSILON ? 0 : leadLength), COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, metrics.offsetPoint(metrics.length - (leadLength < SNAP_EPSILON ? 0 : leadLength)), COMPONENT_HEIGHT),
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

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "L", LABEL_COLOR, options, "inductor");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildLampElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `lamp-${element.id}`;
  const profile = resolveProfile(options.standard);
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
  const disc = new three.Mesh(
    new three.CylinderGeometry(profile.lamp.ringRadius, profile.lamp.ringRadius, profile.lamp.discThickness, 40),
    fillMaterial
  );
  disc.position.copy(center);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(profile.lamp.ringRadius, profile.lamp.ringTube, 24, 80), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center);
  group.add(ring);

  const crossGeom = new three.BoxGeometry(profile.lamp.ringRadius * 1.7, profile.lamp.crossThickness, profile.lamp.crossThickness);
  const crossA = new three.Mesh(crossGeom, ringMaterial);
  crossA.position.copy(center);
  crossA.rotation.y = Math.PI / 4;
  const crossB = new three.Mesh(crossGeom, ringMaterial);
  crossB.position.copy(center);
  crossB.rotation.y = -Math.PI / 4;
  group.add(crossA, crossB);

  // Add glow point light for lamps when not in preview mode
  if (!options.preview) {
    const glowLight = new three.PointLight(0xffeb99, 0.8, 2.5);
    glowLight.position.copy(center);
    glowLight.position.y += 0.1;
    group.add(glowLight);
  }

  const wireRadius = profile.general.strokeRadius;
  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.02);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.02);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    startVec,
    wireRadius,
    leadMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    endVec,
    toVec3(three, element.end, WIRE_HEIGHT),
    wireRadius,
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
      labelSprite.position.copy(center.clone().setY(center.y + 0.9));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildSwitchElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `switch-${element.id}`;
  const profile = resolveProfile(options.standard);
  const metrics = computeAxisMetrics(element);
  const wireRadius = profile.general.strokeRadius;

  const postMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const bladeMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, postMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, bladeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const leadLength = clamp(
    metrics.length * profile.switch.leadFraction,
    profile.general.leadMin,
    Math.min(profile.general.leadMax, metrics.length / 2)
  );
  const pivotOffset = leadLength;
  const contactOffset = Math.max(metrics.length - leadLength, pivotOffset + profile.switch.contactGap);
  const pivotPoint = metrics.offsetPoint(pivotOffset);
  const contactPoint = metrics.offsetPoint(contactOffset);

  const contactPost = new three.Mesh(
    new three.CylinderGeometry(profile.switch.contactRadius, profile.switch.contactRadius, 0.42, 24),
    postMaterial
  );
  contactPost.position.copy(toVec3(three, contactPoint, COMPONENT_HEIGHT + 0.1));
  group.add(contactPost);

  const pivotPost = new three.Mesh(
    new three.CylinderGeometry(profile.switch.contactRadius, profile.switch.contactRadius, 0.42, 24),
    postMaterial
  );
  pivotPost.position.copy(toVec3(three, pivotPoint, COMPONENT_HEIGHT + 0.1));
  group.add(pivotPost);

  const bladeLength = Math.max(contactOffset - pivotOffset - profile.switch.contactGap, profile.switch.bladeWidth * 1.2);
  const bladeGeometry = metrics.orientation === "horizontal"
    ? new three.BoxGeometry(bladeLength, profile.switch.bladeThickness, profile.switch.bladeWidth)
    : new three.BoxGeometry(profile.switch.bladeWidth, profile.switch.bladeThickness, bladeLength);
  const blade = new three.Mesh(bladeGeometry, bladeMaterial);
  const bladePivot = new three.Group();
  bladePivot.position.copy(toVec3(three, pivotPoint, COMPONENT_HEIGHT + 0.1));

  if (metrics.orientation === "horizontal") {
    blade.position.x = (bladeLength / 2) * metrics.direction;
    blade.rotation.y = 0;
    bladePivot.rotation.y = profile.switch.bladeAngle * (metrics.direction === 1 ? 1 : -1);
  } else {
    blade.position.z = (bladeLength / 2) * metrics.direction;
    bladePivot.rotation.x = -profile.switch.bladeAngle * (metrics.direction === 1 ? 1 : -1);
  }
  bladePivot.add(blade);
  group.add(bladePivot);

  const startLead = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, pivotPoint, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const endLead = cylinderBetween(
    three,
    toVec3(three, contactPoint, COMPONENT_HEIGHT),
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
    const labelSprite = createLabelSprite(three, element.label ?? "S", LABEL_COLOR, options, "switch");
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
  // @ts-expect-error TS6133
  const bodyRadius = wireRadius * 1.1;

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);

  const triangleHeight = bodyLength * 0.7;
  const triangleWidth = bodyLength * 0.5;
  // @ts-expect-error TS6133
  const cathodeBarWidth = triangleWidth;

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

const buildBJTElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `bjt-${element.id}`;

  const bodyMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const arrowMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, bodyMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, arrowMaterial, options, COLOR_HELPERS.stroke);

  const center = {
    x: element.base.x,
    z: element.base.z
  };

  const circleRadius = 0.35;
  const circleGeom = new three.CylinderGeometry(circleRadius, circleRadius, 0.08, 32);
  const circle = new three.Mesh(circleGeom, bodyMaterial);
  circle.position.set(center.x, COMPONENT_HEIGHT, center.z);
  circle.rotation.x = Math.PI / 2;
  group.add(circle);

  const wireRadius = 0.04;
  const baseLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const collectorLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.collector, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const emitterLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.emitter, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (baseLead) {
    group.add(baseLead);
  }
  if (collectorLead) {
    group.add(collectorLead);
  }
  if (emitterLead) {
    group.add(emitterLead);
  }

  const arrowDir = new three.Vector3(
    element.emitter.x - center.x,
    0,
    element.emitter.z - center.z
  ).normalize();
  
  const arrowLength = 0.15;
  const arrowCone = new three.ConeGeometry(0.08, arrowLength, 8);
  const arrow = new three.Mesh(arrowCone, arrowMaterial);
  
  const arrowPos = new three.Vector3(
    center.x + arrowDir.x * circleRadius * 0.5,
    COMPONENT_HEIGHT,
    center.z + arrowDir.z * circleRadius * 0.5
  );
  arrow.position.copy(arrowPos);
  
  const angle = Math.atan2(arrowDir.z, arrowDir.x);
  arrow.rotation.z = -Math.PI / 2 - angle;
  
  if (element.transistorType === "pnp") {
    arrow.rotation.z += Math.PI;
  }
  
  group.add(arrow);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "Q", LABEL_COLOR, options, "bjt");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

// NPN Transistor builder - TO-92 package style with distinct visual
const buildBJTNPNElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `bjt-npn-${element.id}`;

  // TO-92 package colors
  const bodyColor = 0x1a1a1a; // Dark package body
  const leadColor = 0xc0c0c0; // Silver leads
  const dotColor = 0xffffff; // White pin 1 indicator

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.8 });
  const leadMaterial = new three.MeshStandardMaterial({ color: leadColor, metalness: 0.6, roughness: 0.3 });
  const arrowMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, arrowMaterial, options, COLOR_HELPERS.stroke);

  const center = {
    x: element.base.x,
    z: element.base.z
  };

  // TO-92 body - half cylinder shape
  const bodyRadius = 0.28;
  const bodyHeight = 0.18;
  const bodyGeom = new three.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 32, 1, false, 0, Math.PI);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + 0.05, center.z);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Flat face on top
  const flatGeom = new three.BoxGeometry(bodyRadius * 2, bodyHeight, 0.02);
  const flat = new three.Mesh(flatGeom, bodyMaterial);
  flat.position.set(center.x, COMPONENT_HEIGHT + 0.05, center.z - bodyRadius * 0.5);
  group.add(flat);

  // Pin 1 indicator dot (white)
  if (!options.preview) {
    const dotGeom = new three.SphereGeometry(0.04, 12, 12);
    const dotMat = new three.MeshStandardMaterial({ color: dotColor });
    const dot = new three.Mesh(dotGeom, dotMat);
    dot.position.set(center.x - bodyRadius * 0.5, COMPONENT_HEIGHT + 0.15, center.z);
    group.add(dot);
  }

  const wireRadius = 0.035;
  const baseLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const collectorLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.collector, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const emitterLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.emitter, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (baseLead) group.add(baseLead);
  if (collectorLead) group.add(collectorLead);
  if (emitterLead) group.add(emitterLead);

  // NPN arrow pointing outward from emitter
  const arrowDir = new three.Vector3(
    element.emitter.x - center.x,
    0,
    element.emitter.z - center.z
  ).normalize();

  const arrowLength = 0.12;
  const arrowCone = new three.ConeGeometry(0.06, arrowLength, 8);
  const arrow = new three.Mesh(arrowCone, arrowMaterial);

  const arrowPos = new three.Vector3(
    center.x + arrowDir.x * bodyRadius * 0.6,
    COMPONENT_HEIGHT,
    center.z + arrowDir.z * bodyRadius * 0.6
  );
  arrow.position.copy(arrowPos);

  const angle = Math.atan2(arrowDir.z, arrowDir.x);
  arrow.rotation.z = -Math.PI / 2 - angle;
  group.add(arrow);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "Q", LABEL_COLOR, options, "bjt-npn");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

// PNP Transistor builder - TO-92 package with red indicator
const buildBJTPNPElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `bjt-pnp-${element.id}`;

  // TO-92 package colors for PNP
  const bodyColor = 0x1a1a1a; // Dark package body
  const leadColor = 0xc0c0c0; // Silver leads
  const dotColor = 0xff4444; // Red pin 1 indicator to distinguish from NPN

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.8 });
  const leadMaterial = new three.MeshStandardMaterial({ color: leadColor, metalness: 0.6, roughness: 0.3 });
  const arrowMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, arrowMaterial, options, COLOR_HELPERS.stroke);

  const center = {
    x: element.base.x,
    z: element.base.z
  };

  // TO-92 body - half cylinder shape
  const bodyRadius = 0.28;
  const bodyHeight = 0.18;
  const bodyGeom = new three.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 32, 1, false, 0, Math.PI);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + 0.05, center.z);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Flat face on top
  const flatGeom = new three.BoxGeometry(bodyRadius * 2, bodyHeight, 0.02);
  const flat = new three.Mesh(flatGeom, bodyMaterial);
  flat.position.set(center.x, COMPONENT_HEIGHT + 0.05, center.z - bodyRadius * 0.5);
  group.add(flat);

  // Pin 1 indicator dot (red for PNP)
  if (!options.preview) {
    const dotGeom = new three.SphereGeometry(0.04, 12, 12);
    const dotMat = new three.MeshStandardMaterial({ color: dotColor });
    const dot = new three.Mesh(dotGeom, dotMat);
    dot.position.set(center.x - bodyRadius * 0.5, COMPONENT_HEIGHT + 0.15, center.z);
    group.add(dot);
  }

  const wireRadius = 0.035;
  const baseLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const collectorLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.collector, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const emitterLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.emitter, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (baseLead) group.add(baseLead);
  if (collectorLead) group.add(collectorLead);
  if (emitterLead) group.add(emitterLead);

  // PNP arrow pointing inward toward base
  const arrowDir = new three.Vector3(
    element.emitter.x - center.x,
    0,
    element.emitter.z - center.z
  ).normalize();

  const arrowLength = 0.12;
  const arrowCone = new three.ConeGeometry(0.06, arrowLength, 8);
  const arrow = new three.Mesh(arrowCone, arrowMaterial);

  const arrowPos = new three.Vector3(
    center.x + arrowDir.x * bodyRadius * 0.6,
    COMPONENT_HEIGHT,
    center.z + arrowDir.z * bodyRadius * 0.6
  );
  arrow.position.copy(arrowPos);

  const angle = Math.atan2(arrowDir.z, arrowDir.x);
  arrow.rotation.z = -Math.PI / 2 - angle + Math.PI; // Reversed for PNP
  group.add(arrow);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "Q", LABEL_COLOR, options, "bjt-pnp");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

// Darlington Pair builder - TO-220 power package style
const buildDarlingtonElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `darlington-${element.id}`;

  // TO-220 package colors
  const bodyColor = 0x1a1a1a; // Dark package body
  const heatsinkColor = 0x808080; // Gray heatsink tab
  const leadColor = 0xc0c0c0; // Silver leads
  const dotColor = 0x3b82f6; // Blue indicator dots for dual transistors

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.8 });
  const heatsinkMaterial = new three.MeshStandardMaterial({ color: heatsinkColor, metalness: 0.7, roughness: 0.3 });
  const leadMaterial = new three.MeshStandardMaterial({ color: leadColor, metalness: 0.6, roughness: 0.3 });
  const arrowMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, arrowMaterial, options, COLOR_HELPERS.stroke);

  const center = {
    x: element.base.x,
    z: element.base.z
  };

  // TO-220 body - larger rectangular package
  const bodyWidth = 0.45;
  const bodyDepth = 0.2;
  const bodyHeight = 0.35;
  const bodyGeom = new three.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + bodyHeight / 2, center.z);
  group.add(body);

  // Metal heatsink tab on top
  const tabWidth = bodyWidth * 1.2;
  const tabHeight = 0.03;
  const tabDepth = bodyDepth * 1.5;
  const tabGeom = new three.BoxGeometry(tabWidth, tabHeight, tabDepth);
  const tab = new three.Mesh(tabGeom, heatsinkMaterial);
  tab.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + tabHeight / 2, center.z);
  group.add(tab);

  // Mounting hole in heatsink tab
  if (!options.preview) {
    const holeGeom = new three.TorusGeometry(0.06, 0.015, 8, 16);
    const holeMat = new three.MeshStandardMaterial({ color: 0x404040 });
    const hole = new three.Mesh(holeGeom, holeMat);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + tabHeight + 0.01, center.z);
    group.add(hole);
  }

  // Dual indicator dots (blue) representing two internal transistors
  if (!options.preview) {
    const dotGeom = new three.SphereGeometry(0.035, 12, 12);
    const dotMat = new three.MeshStandardMaterial({ color: dotColor, emissive: dotColor, emissiveIntensity: 0.3 });

    const dot1 = new three.Mesh(dotGeom, dotMat);
    dot1.position.set(center.x - 0.1, COMPONENT_HEIGHT + bodyHeight * 0.7, center.z + bodyDepth / 2 + 0.01);
    group.add(dot1);

    const dot2 = new three.Mesh(dotGeom, dotMat);
    dot2.position.set(center.x + 0.1, COMPONENT_HEIGHT + bodyHeight * 0.7, center.z + bodyDepth / 2 + 0.01);
    group.add(dot2);
  }

  const wireRadius = 0.04;
  const baseLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const collectorLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.collector, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );
  const emitterLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.emitter, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (baseLead) group.add(baseLead);
  if (collectorLead) group.add(collectorLead);
  if (emitterLead) group.add(emitterLead);

  // Arrow pointing outward (NPN-based Darlington)
  const arrowDir = new three.Vector3(
    element.emitter.x - center.x,
    0,
    element.emitter.z - center.z
  ).normalize();

  const arrowLength = 0.15;
  const arrowCone = new three.ConeGeometry(0.07, arrowLength, 8);
  const arrow = new three.Mesh(arrowCone, arrowMaterial);

  const arrowPos = new three.Vector3(
    center.x + arrowDir.x * bodyWidth * 0.6,
    COMPONENT_HEIGHT,
    center.z + arrowDir.z * bodyWidth * 0.6
  );
  arrow.position.copy(arrowPos);

  const angle = Math.atan2(arrowDir.z, arrowDir.x);
  arrow.rotation.z = -Math.PI / 2 - angle;
  group.add(arrow);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "Q", LABEL_COLOR, options, "darlington");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.2, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

// MOSFET builder - TO-220 power package style with gate symbol
const buildMOSFETElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `mosfet-${element.id}`;

  // TO-220 package colors for MOSFET
  const bodyColor = 0x1a1a1a; // Dark package body
  const heatsinkColor = 0x808080; // Gray heatsink tab
  const leadColor = 0xc0c0c0; // Silver leads
  const gateColor = 0x22c55e; // Green indicator for gate/voltage-controlled

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.8 });
  const heatsinkMaterial = new three.MeshStandardMaterial({ color: heatsinkColor, metalness: 0.7, roughness: 0.3 });
  const leadMaterial = new three.MeshStandardMaterial({ color: leadColor, metalness: 0.6, roughness: 0.3 });
  const arrowMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, arrowMaterial, options, COLOR_HELPERS.stroke);

  const center = {
    x: element.base.x, // For MOSFET: base = gate
    z: element.base.z
  };

  // TO-220 body - rectangular package
  const bodyWidth = 0.45;
  const bodyDepth = 0.22;
  const bodyHeight = 0.38;
  const bodyGeom = new three.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + bodyHeight / 2, center.z);
  group.add(body);

  // Metal heatsink tab on top
  const tabWidth = bodyWidth * 1.2;
  const tabHeight = 0.03;
  const tabDepth = bodyDepth * 1.5;
  const tabGeom = new three.BoxGeometry(tabWidth, tabHeight, tabDepth);
  const tab = new three.Mesh(tabGeom, heatsinkMaterial);
  tab.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + tabHeight / 2, center.z);
  group.add(tab);

  // Mounting hole in heatsink tab
  if (!options.preview) {
    const holeGeom = new three.TorusGeometry(0.06, 0.015, 8, 16);
    const holeMat = new three.MeshStandardMaterial({ color: 0x404040 });
    const hole = new three.Mesh(holeGeom, holeMat);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + tabHeight + 0.01, center.z);
    group.add(hole);
  }

  // Gate indicator stripe (green) - distinguishes from BJT
  if (!options.preview) {
    const stripeGeom = new three.BoxGeometry(bodyWidth * 0.8, 0.04, 0.01);
    const stripeMat = new three.MeshStandardMaterial({ color: gateColor, emissive: gateColor, emissiveIntensity: 0.2 });
    const stripe = new three.Mesh(stripeGeom, stripeMat);
    stripe.position.set(center.x, COMPONENT_HEIGHT + bodyHeight * 0.6, center.z + bodyDepth / 2 + 0.01);
    group.add(stripe);

    // "M" marking for MOSFET identification
    const markGeom = new three.BoxGeometry(0.12, 0.12, 0.01);
    const markMat = new three.MeshStandardMaterial({ color: 0x3a3a3a });
    const mark = new three.Mesh(markGeom, markMat);
    mark.position.set(center.x, COMPONENT_HEIGHT + bodyHeight * 0.35, center.z + bodyDepth / 2 + 0.01);
    group.add(mark);
  }

  const wireRadius = 0.04;
  // Gate lead (replaces base in BJT terminology)
  const gateLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );
  // Drain lead (replaces collector)
  const drainLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.collector, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );
  // Source lead (replaces emitter)
  const sourceLead = cylinderBetween(
    three,
    toVec3(three, center, COMPONENT_HEIGHT),
    toVec3(three, element.emitter, WIRE_HEIGHT),
    wireRadius,
    leadMaterial
  );

  if (gateLead) group.add(gateLead);
  if (drainLead) group.add(drainLead);
  if (sourceLead) group.add(sourceLead);

  // Arrow pointing inward (N-channel MOSFET style)
  const arrowDir = new three.Vector3(
    element.emitter.x - center.x,
    0,
    element.emitter.z - center.z
  ).normalize();

  const arrowLength = 0.14;
  const arrowCone = new three.ConeGeometry(0.065, arrowLength, 8);
  const arrow = new three.Mesh(arrowCone, arrowMaterial);

  const arrowPos = new three.Vector3(
    center.x + arrowDir.x * bodyWidth * 0.55,
    COMPONENT_HEIGHT,
    center.z + arrowDir.z * bodyWidth * 0.55
  );
  arrow.position.copy(arrowPos);

  const angle = Math.atan2(arrowDir.z, arrowDir.x);
  // Arrow points inward for N-channel MOSFET
  arrow.rotation.z = -Math.PI / 2 - angle + Math.PI;
  group.add(arrow);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "M", LABEL_COLOR, options, "mosfet");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.2, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

const buildPotentiometerElement = (three: any, element: ThreeTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `potentiometer-${element.id}`;

  // Potentiometer colors
  const bodyColor = 0x2563eb; // Blue body
  const trackColor = 0x1e1e1e; // Dark resistive track
  const wiperColor = 0xc0c0c0; // Silver wiper
  const shaftColor = 0x404040; // Dark gray shaft

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.7 });
  const trackMaterial = new three.MeshStandardMaterial({ color: trackColor, metalness: 0.2, roughness: 0.8 });
  const wiperMaterial = new three.MeshStandardMaterial({ color: wiperColor, metalness: 0.6, roughness: 0.3 });
  const shaftMaterial = new three.MeshStandardMaterial({ color: shaftColor, metalness: 0.3, roughness: 0.5 });
  const leadMaterial = new three.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.6, roughness: 0.3 });

  styliseMaterial(three, bodyMaterial, options, bodyColor);
  styliseMaterial(three, trackMaterial, options, trackColor);
  styliseMaterial(three, wiperMaterial, options, wiperColor);
  styliseMaterial(three, shaftMaterial, options, shaftColor);
  styliseMaterial(three, leadMaterial, options, 0xc0c0c0);

  // Center position (base terminal is the wiper)
  const center = {
    x: element.base.x,
    z: element.base.z
  };

  // Circular body (pot housing)
  const bodyRadius = 0.35;
  const bodyHeight = 0.25;
  const bodyGeom = new three.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 24);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + bodyHeight / 2, center.z);
  group.add(body);

  // Resistive track ring on top
  if (!options.preview) {
    const trackGeom = new three.TorusGeometry(bodyRadius * 0.65, 0.03, 8, 24);
    const track = new three.Mesh(trackGeom, trackMaterial);
    track.rotation.x = Math.PI / 2;
    track.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + 0.02, center.z);
    group.add(track);
  }

  // Wiper shaft on top
  const shaftRadius = 0.08;
  const shaftHeight = 0.18;
  const shaftGeom = new three.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
  const shaft = new three.Mesh(shaftGeom, shaftMaterial);
  shaft.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + shaftHeight / 2, center.z);
  group.add(shaft);

  // Wiper indicator line on shaft
  if (!options.preview) {
    const indicatorGeom = new three.BoxGeometry(shaftRadius * 2.2, 0.02, 0.015);
    const indicator = new three.Mesh(indicatorGeom, wiperMaterial);
    indicator.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + shaftHeight, center.z);
    group.add(indicator);
  }

  const wireRadius = 0.04;

  // Terminal 1 lead (one end of resistive element) - collector position
  const lead1 = cylinderBetween(
    three,
    toVec3(three, element.collector, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );

  // Terminal 2 lead (other end of resistive element) - emitter position
  const lead2 = cylinderBetween(
    three,
    toVec3(three, element.emitter, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    leadMaterial
  );

  // Wiper lead (center tap) - base position
  const wiperLead = cylinderBetween(
    three,
    toVec3(three, element.base, WIRE_HEIGHT),
    toVec3(three, center, COMPONENT_HEIGHT),
    wireRadius,
    wiperMaterial
  );

  if (lead1) group.add(lead1);
  if (lead2) group.add(lead2);
  if (wiperLead) group.add(wiperLead);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "POT", LABEL_COLOR, options, "potentiometer");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.3, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
};

const buildOpampElement = (three: any, element: any, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `opamp-${element.id}`;

  // Op-amp colors (DIP package style)
  const bodyColor = 0x1a1a1a; // Black IC body
  const notchColor = 0x2a2a2a; // Slightly lighter notch
  const pinColor = 0xc0c0c0; // Silver pins
  const markColor = 0xffffff; // White markings

  const bodyMaterial = new three.MeshStandardMaterial({ color: bodyColor, metalness: 0.1, roughness: 0.8 });
  const notchMaterial = new three.MeshStandardMaterial({ color: notchColor, metalness: 0.1, roughness: 0.9 });
  const pinMaterial = new three.MeshStandardMaterial({ color: pinColor, metalness: 0.6, roughness: 0.3 });
  const markMaterial = new three.MeshStandardMaterial({ color: markColor, metalness: 0, roughness: 0.9 });

  styliseMaterial(three, bodyMaterial, options, bodyColor);
  styliseMaterial(three, notchMaterial, options, notchColor);
  styliseMaterial(three, pinMaterial, options, pinColor);
  styliseMaterial(three, markMaterial, options, markColor);

  // Calculate center from terminals (expect at least 3: inverting, non-inverting, output)
  const terminals: Vec2[] = element.terminals || [];
  let center: Vec2;
  if (terminals.length >= 3) {
    center = {
      x: (terminals[0].x + terminals[1].x + terminals[2].x) / 3,
      z: (terminals[0].z + terminals[1].z + terminals[2].z) / 3
    };
  } else {
    center = terminals[0] || { x: 0, z: 0 };
  }

  // DIP-8 package body
  const bodyWidth = 0.55;
  const bodyDepth = 0.35;
  const bodyHeight = 0.22;
  const bodyGeom = new three.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
  const body = new three.Mesh(bodyGeom, bodyMaterial);
  body.position.set(center.x, COMPONENT_HEIGHT + bodyHeight / 2, center.z);
  group.add(body);

  // Orientation notch (semicircle indent)
  if (!options.preview) {
    const notchGeom = new three.CylinderGeometry(0.05, 0.05, 0.02, 16, 1, false, 0, Math.PI);
    const notch = new three.Mesh(notchGeom, notchMaterial);
    notch.rotation.x = Math.PI / 2;
    notch.rotation.z = Math.PI / 2;
    notch.position.set(center.x - bodyWidth / 2 + 0.01, COMPONENT_HEIGHT + bodyHeight, center.z);
    group.add(notch);

    // Triangle symbol for op-amp on body
    const triangleShape = new three.Shape();
    triangleShape.moveTo(-0.08, -0.06);
    triangleShape.lineTo(0.08, 0);
    triangleShape.lineTo(-0.08, 0.06);
    triangleShape.lineTo(-0.08, -0.06);
    const triangleGeom = new three.ShapeGeometry(triangleShape);
    const triangle = new three.Mesh(triangleGeom, markMaterial);
    triangle.rotation.x = -Math.PI / 2;
    triangle.position.set(center.x, COMPONENT_HEIGHT + bodyHeight + 0.01, center.z);
    group.add(triangle);
  }

  const wireRadius = 0.035;

  // Connect all terminals to center
  terminals.forEach((terminal, _index) => {
    const lead = cylinderBetween(
      three,
      toVec3(three, terminal, WIRE_HEIGHT),
      toVec3(three, center, COMPONENT_HEIGHT),
      wireRadius,
      pinMaterial
    );
    if (lead) group.add(lead);
  });

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "U", LABEL_COLOR, options, "opamp");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.15, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals };
};

const buildTransformerElement = (three: any, element: any, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `transformer-${element.id}`;

  // Transformer colors
  const coreColor = 0x4a4a4a; // Dark gray iron core
  const primaryColor = 0xb45309; // Copper/amber for primary winding
  const secondaryColor = 0xb45309; // Copper/amber for secondary winding
  const leadColor = 0xc0c0c0; // Silver leads

  const coreMaterial = new three.MeshStandardMaterial({ color: coreColor, metalness: 0.4, roughness: 0.6 });
  const primaryMaterial = new three.MeshStandardMaterial({ color: primaryColor, metalness: 0.5, roughness: 0.4 });
  const secondaryMaterial = new three.MeshStandardMaterial({ color: secondaryColor, metalness: 0.5, roughness: 0.4 });
  const leadMaterial = new three.MeshStandardMaterial({ color: leadColor, metalness: 0.6, roughness: 0.3 });

  styliseMaterial(three, coreMaterial, options, coreColor);
  styliseMaterial(three, primaryMaterial, options, primaryColor);
  styliseMaterial(three, secondaryMaterial, options, secondaryColor);
  styliseMaterial(three, leadMaterial, options, leadColor);

  // Calculate center from terminals (expect 4: 2 primary, 2 secondary)
  const terminals: Vec2[] = element.terminals || [];
  let center: Vec2;
  if (terminals.length >= 4) {
    center = {
      x: (terminals[0].x + terminals[1].x + terminals[2].x + terminals[3].x) / 4,
      z: (terminals[0].z + terminals[1].z + terminals[2].z + terminals[3].z) / 4
    };
  } else if (terminals.length > 0) {
    center = {
      x: terminals.reduce((sum, t) => sum + t.x, 0) / terminals.length,
      z: terminals.reduce((sum, t) => sum + t.z, 0) / terminals.length
    };
  } else {
    center = { x: 0, z: 0 };
  }

  // Core - E-I laminated core style
  const coreWidth = 0.5;
  const coreHeight = 0.45;
  const coreDepth = 0.3;
  const coreGeom = new three.BoxGeometry(coreWidth, coreHeight, coreDepth);
  const core = new three.Mesh(coreGeom, coreMaterial);
  core.position.set(center.x, COMPONENT_HEIGHT + coreHeight / 2, center.z);
  group.add(core);

  // Primary winding (left side coil)
  const coilRadius = 0.12;
  const coilHeight = coreHeight * 0.7;
  const primaryGeom = new three.CylinderGeometry(coilRadius, coilRadius, coilHeight, 16);
  const primary = new three.Mesh(primaryGeom, primaryMaterial);
  primary.position.set(center.x - coreWidth * 0.25, COMPONENT_HEIGHT + coreHeight / 2, center.z);
  group.add(primary);

  // Secondary winding (right side coil)
  const secondaryGeom = new three.CylinderGeometry(coilRadius, coilRadius, coilHeight, 16);
  const secondary = new three.Mesh(secondaryGeom, secondaryMaterial);
  secondary.position.set(center.x + coreWidth * 0.25, COMPONENT_HEIGHT + coreHeight / 2, center.z);
  group.add(secondary);

  // Magnetic coupling lines between windings
  if (!options.preview) {
    const lineGeom = new three.BoxGeometry(0.01, coreHeight * 0.5, 0.01);
    const lineMat = new three.MeshStandardMaterial({ color: 0x666666 });
    for (let i = 0; i < 2; i++) {
      const line = new three.Mesh(lineGeom, lineMat);
      line.position.set(center.x, COMPONENT_HEIGHT + coreHeight / 2, center.z + (i === 0 ? 0.04 : -0.04));
      group.add(line);
    }
  }

  const wireRadius = 0.04;

  // Connect all terminals to center
  terminals.forEach((terminal) => {
    const lead = cylinderBetween(
      three,
      toVec3(three, terminal, WIRE_HEIGHT),
      toVec3(three, center, COMPONENT_HEIGHT),
      wireRadius,
      leadMaterial
    );
    if (lead) group.add(lead);
  });

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "T", LABEL_COLOR, options, "transformer");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT + 0.35, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals };
};

const buildGroundElement = (three: any, element: GroundElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `ground-${element.id}`;
  const lineMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.ground
  });
  styliseMaterial(three, lineMaterial, options, COLOR_HELPERS.ground);

  const widths = [1.2, 0.8, 0.4];
  const heights = [0, -0.18, -0.34];

  widths.forEach((width, index) => {
    const geometry = element.orientation === "horizontal"
      ? new three.BoxGeometry(width, 0.08, 0.12)
      : new three.BoxGeometry(0.12, 0.08, width);
    const bar = new three.Mesh(geometry, lineMaterial);
    if (element.orientation === "horizontal") {
      bar.position.set(element.position.x, COMPONENT_HEIGHT + heights[index], element.position.z);
    } else {
      bar.position.set(element.position.x, COMPONENT_HEIGHT + heights[index], element.position.z);
    }
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

export const buildElement = (three: any, element: SchematicElement, options: BuildOptions = {}): BuildResult => {
  const standard = options.standard ?? DEFAULT_SYMBOL_STANDARD;
  const effective: BuildOptions = { ...options, standard };
  if (element.kind === "wire") {
    return buildWireElement(three, element as WireElement, effective);
  }
  if (element.kind === "ground") {
    return buildGroundElement(three, element as GroundElement, effective);
  }
  if (element.kind === "bjt") {
    return buildBJTElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "bjt-npn") {
    return buildBJTNPNElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "bjt-pnp") {
    return buildBJTPNPElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "darlington") {
    return buildDarlingtonElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "mosfet") {
    return buildMOSFETElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "potentiometer") {
    return buildPotentiometerElement(three, element as ThreeTerminalElement, effective);
  }
  if (element.kind === "opamp") {
    return buildOpampElement(three, element as MultiTerminalElement, effective);
  }
  if (element.kind === "transformer") {
    return buildTransformerElement(three, element as MultiTerminalElement, effective);
  }
  return buildTwoTerminalElement(three, element as TwoTerminalElement, effective);
};

export const buildNodeMesh = (three: any, point: Vec2, options: BuildOptions) => {
  const profile = resolveProfile(options.standard);
  const material = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.nodeFill
  });
  styliseMaterial(three, material, options, COLOR_HELPERS.nodeFill);
  const geometry = new three.SphereGeometry(profile.general.nodeRadius, 28, 20);
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
    if (material.dispose && typeof material.dispose === "function") {
      material.dispose();
    }
  };

  root.traverse((child: any) => {
    if (child.geometry && typeof child.geometry.dispose === "function") {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
    if (child.userData && child.userData.texture && typeof child.userData.texture.dispose === "function") {
      child.userData.texture.dispose();
    }
  });
};
