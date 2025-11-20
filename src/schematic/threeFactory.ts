import { DEFAULT_SYMBOL_STANDARD, STANDARD_PROFILES, SymbolStandard } from "./standards";
import { GroundElement, Orientation, SchematicElement, ThreeTerminalElement, TwoTerminalElement, Vec2, WireElement } from "./types";

const DEFAULT_PROFILE = STANDARD_PROFILES[DEFAULT_SYMBOL_STANDARD];

export const WIRE_RADIUS = DEFAULT_PROFILE.general.strokeRadius;
export const RESISTOR_RADIUS = DEFAULT_PROFILE.general.strokeRadius;
export const NODE_RADIUS = DEFAULT_PROFILE.general.nodeRadius;
export const WIRE_HEIGHT = 0.12;
export const COMPONENT_HEIGHT = 0.16;
export const LABEL_HEIGHT = 0.4;

type BuildOptions = {
  preview?: boolean;
  highlight?: boolean;
  standard?: SymbolStandard;
};

type BuildResult = {
  group: any;
  terminals: Vec2[];
};

const COLOR_HELPERS = {
  stroke: 0x111111,
  highlight: 0x2563eb,
  preview: 0x94a3b8,
  nodeFill: 0x111111,
  plate: 0x111111,
  dielectric: 0xededed,
  lampRing: 0x111111,
  lampFill: 0xffffff,
  ground: 0x111111
} as const;

const LABEL_COLOR = "#111111";

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

const toVec3 = (three: any, point: Vec2, height = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

const styliseMaterial = (three: any, material: any, options: BuildOptions, baseColor: number) => {
  if (!material) {
    return;
  }

  const base = new three.Color(baseColor);
  if (options.highlight) {
    material.color = new three.Color(COLOR_HELPERS.highlight);
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
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.setRotationFromQuaternion(quaternion);
  return mesh;
};

const createLabelSprite = (three: any, text: string, color = LABEL_COLOR, options: BuildOptions = {}) => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!options.preview) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.font = "bold 150px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 12);
  const texture = new three.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new three.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: options.preview ? 0.6 : 1
  });
  const sprite = new three.Sprite(material);
  sprite.scale.set(1.4, 0.7, 1);
  sprite.userData.texture = texture;
  sprite.userData.material = material;
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

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label);
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
    const labelHeight = COMPONENT_HEIGHT + 0.12;
    const plusSprite = createLabelSprite(three, "+", "#0f172a");
    const minusSprite = createLabelSprite(three, "−", "#0f172a");
    if (plusSprite) {
      const pos = toVec3(three, positiveCenter, 0);
      plusSprite.position.set(pos.x, labelHeight, pos.z);
      if (metrics.orientation === "horizontal") {
        plusSprite.position.z += positiveWidth / 2 + 0.2;
      } else {
        plusSprite.position.x += positiveWidth / 2 + 0.2;
      }
      plusSprite.scale.set(0.9, 0.9, 1);
      group.add(plusSprite);
    }
    if (minusSprite) {
      const pos = toVec3(three, negativeCenter, 0);
      minusSprite.position.set(pos.x, labelHeight, pos.z);
      if (metrics.orientation === "horizontal") {
        minusSprite.position.z -= negativeWidth / 2 + 0.2;
      } else {
        minusSprite.position.x -= negativeWidth / 2 + 0.2;
      }
      minusSprite.scale.set(0.9, 0.9, 1);
      group.add(minusSprite);
    }
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);

  if (!options.preview) {
    const labelText = element.label ?? "V";
    const labelSprite = createLabelSprite(three, labelText);
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
    const labelSprite = createLabelSprite(three, element.label ?? "C");
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
    const labelSprite = createLabelSprite(three, element.label ?? "L");
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
  const fillMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.lampFill });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, ringMaterial, options, COLOR_HELPERS.lampRing);
  styliseMaterial(three, fillMaterial, options, COLOR_HELPERS.lampFill);
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
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP");
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
    const labelSprite = createLabelSprite(three, element.label ?? "S");
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
  const bodyRadius = wireRadius * 1.1;

  const bodyStart = metrics.offsetPoint(leadLength);
  const bodyEnd = metrics.offsetPoint(metrics.length - leadLength);

  const triangleHeight = bodyLength * 0.7;
  const triangleWidth = bodyLength * 0.5;
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
    const labelSprite = createLabelSprite(three, element.label ?? "D");
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
    const labelSprite = createLabelSprite(three, element.label ?? "Q");
    if (labelSprite) {
      labelSprite.position.set(center.x, COMPONENT_HEIGHT + LABEL_HEIGHT, center.z);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.collector, element.base, element.emitter] };
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

const buildTwoTerminalElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  switch (element.kind) {
    case "resistor":
      return buildResistorElement(three, element, options);
    case "battery":
      return buildBatteryElement(three, element, options);
    case "capacitor":
      return buildCapacitorElement(three, element, options);
    case "inductor":
      return buildInductorElement(three, element, options);
    case "lamp":
      return buildLampElement(three, element, options);
    case "switch":
      return buildSwitchElement(three, element, options);
    case "diode":
      return buildDiodeElement(three, element, options);
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
    if (material.map && typeof material.map.dispose === "function") {
      material.map.dispose();
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
    if (child.userData && child.userData.material && typeof child.userData.material.dispose === "function") {
      disposeMaterial(child.userData.material);
    }
  });
};
