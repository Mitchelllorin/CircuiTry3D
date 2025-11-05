import { GroundElement, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";
import {
  BATTERY_SPEC,
  CAPACITOR_SPEC,
  GROUND_SPEC,
  INDUCTOR_SPEC,
  LAMP_SPEC,
  RESISTOR_SPEC,
  SWITCH_SPEC,
  SYMBOL_DIMENSIONS,
  resolveAxialVec2,
} from "./standards";
import { axisCoordToVec2, computeAxisMetrics } from "./geometry";

export const WIRE_RADIUS = SYMBOL_DIMENSIONS.wireRadius;
export const RESISTOR_RADIUS = SYMBOL_DIMENSIONS.strokeRadius;
export const NODE_RADIUS = SYMBOL_DIMENSIONS.nodeRadius;
export const WIRE_HEIGHT = SYMBOL_DIMENSIONS.wireHeight;
export const COMPONENT_HEIGHT = SYMBOL_DIMENSIONS.componentHeight;
export const LABEL_HEIGHT = SYMBOL_DIMENSIONS.labelHeight;

type BuildOptions = {
  preview?: boolean;
  highlight?: boolean;
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
  ground: 0x111111,
} as const;

const LABEL_COLOR = "#111111";

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
  return sprite;
};

const buildWireElement = (three: any, element: WireElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `wire-${element.id}`;
  const material = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, material, options, COLOR_HELPERS.stroke);

  for (let i = 0; i < element.path.length - 1; i += 1) {
    const startVec = toVec3(three, element.path[i], WIRE_HEIGHT);
    const endVec = toVec3(three, element.path[i + 1], WIRE_HEIGHT);
    const mesh = cylinderBetween(three, startVec, endVec, WIRE_RADIUS, material);
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

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, RESISTOR_SPEC.axis);
  const resistorMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const wireMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const iecMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, wireMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, iecMaterial, options, COLOR_HELPERS.stroke);

  const amplitudeBase = axis.bodyLength * RESISTOR_SPEC.amplitudeRatio;
  const amplitude = clamp(amplitudeBase, RESISTOR_SPEC.amplitudeMin, RESISTOR_SPEC.amplitudeMax);
  const points: Vec2[] = [];

  for (let i = 0; i <= RESISTOR_SPEC.zigZagCount; i += 1) {
    const t = i / RESISTOR_SPEC.zigZagCount;
    const axisCoord = axis.bodyStartCoord + axis.direction * axis.bodyLength * t;
    if (element.orientation === "horizontal") {
      const zOffset = i === 0 || i === RESISTOR_SPEC.zigZagCount ? 0 : i % 2 === 0 ? -amplitude : amplitude;
      points.push({ x: axisCoord, z: axis.perpCoord + zOffset });
    } else {
      const xOffset = i === 0 || i === RESISTOR_SPEC.zigZagCount ? 0 : i % 2 === 0 ? amplitude : -amplitude;
      points.push({ x: axis.perpCoord + xOffset, z: axisCoord });
    }
  }

  const iecDepth = Math.max(RESISTOR_SPEC.iecBodyDepthMin, amplitude * 2 + RESISTOR_SPEC.iecBodyDepthPadding);
  const iecGeometry = createAxisAlignedBoxGeometry(
    three,
    element.orientation,
    axis.bodyLength,
    RESISTOR_SPEC.iecBodyHeight,
    iecDepth
  );
  const iecBody = new three.Mesh(iecGeometry, iecMaterial);
  positionOnAxis(iecBody, element.orientation, axis.centerCoord, axis.perpCoord, COMPONENT_HEIGHT - 0.01);
  group.add(iecBody);

  for (let i = 0; i < points.length - 1; i += 1) {
    const segStart = toVec3(three, points[i], COMPONENT_HEIGHT);
    const segEnd = toVec3(three, points[i + 1], COMPONENT_HEIGHT);
    const mesh = cylinderBetween(three, segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
    if (mesh) {
      group.add(mesh);
    }
  }

  const bodyStartVec2 = axisCoordToVec2(element.orientation, axis.bodyStartCoord, axis.perpCoord);
  const bodyEndVec2 = axisCoordToVec2(element.orientation, axis.bodyEndCoord, axis.perpCoord);
  const leadStart = cylinderBetween(
    three,
    toVec3(three, element.start, WIRE_HEIGHT),
    toVec3(three, bodyStartVec2, COMPONENT_HEIGHT),
    WIRE_RADIUS,
    wireMaterial
  );
  const leadEnd = cylinderBetween(
    three,
    toVec3(three, bodyEndVec2, COMPONENT_HEIGHT),
    toVec3(three, element.end, WIRE_HEIGHT),
    WIRE_RADIUS,
    wireMaterial
  );
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label);
    if (labelSprite) {
      const labelAnchor = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
      const labelPosition = toVec3(three, labelAnchor, COMPONENT_HEIGHT);
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
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
    const labelSprite = createLabelSprite(three, element.label ?? "V");
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

const buildCapacitorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `capacitor-${element.id}`;

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, CAPACITOR_SPEC.axis);
  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const dielectricMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.dielectric });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, dielectricMaterial, options, COLOR_HELPERS.dielectric);
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
    const labelSprite = createLabelSprite(three, element.label ?? "C");
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

const buildInductorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
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
    const labelSprite = createLabelSprite(three, element.label ?? "L");
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

const buildLampElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `lamp-${element.id}`;

  const axis = computeAxisMetrics(element.start, element.end, element.orientation, LAMP_SPEC.axis);
  const ringMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.lampRing });
  const fillMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.lampFill });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  styliseMaterial(three, ringMaterial, options, COLOR_HELPERS.lampRing);
  styliseMaterial(three, fillMaterial, options, COLOR_HELPERS.lampFill);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const center2D = axisCoordToVec2(element.orientation, axis.centerCoord, axis.perpCoord);
  const center3D = toVec3(three, center2D, COMPONENT_HEIGHT);
  const disc = new three.Mesh(
    new three.CylinderGeometry(LAMP_SPEC.discRadius, LAMP_SPEC.discRadius, LAMP_SPEC.discThickness, 32),
    fillMaterial
  );
  disc.position.copy(center3D);
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
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP");
    if (labelSprite) {
      const labelPosition = center3D.clone();
      labelPosition.y += LABEL_HEIGHT + 0.48;
      labelSprite.position.copy(labelPosition);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildSwitchElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
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
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S");
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

const buildGroundElement = (three: any, element: GroundElement, options: BuildOptions): BuildResult => {
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
    default:
      return buildResistorElement(three, element, options);
  }
};

export const buildElement = (three: any, element: SchematicElement, options: BuildOptions): BuildResult => {
  if (element.kind === "wire") {
    return buildWireElement(three, element as WireElement, options);
  }
  if (element.kind === "ground") {
    return buildGroundElement(three, element as GroundElement, options);
  }
  return buildTwoTerminalElement(three, element as TwoTerminalElement, options);
};

export const buildNodeMesh = (three: any, point: Vec2, options: BuildOptions) => {
  const material = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.nodeFill
  });
  styliseMaterial(three, material, options, COLOR_HELPERS.nodeFill);
  const geometry = new three.SphereGeometry(NODE_RADIUS, 28, 20);
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
