import { GroundElement, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const WIRE_RADIUS = 0.06;
export const RESISTOR_RADIUS = 0.06;
export const NODE_RADIUS = 0.12;
export const WIRE_HEIGHT = 0.12;
export const COMPONENT_HEIGHT = 0.12;
export const LABEL_HEIGHT = 0.4;

const STROKE_WIDTH = WIRE_RADIUS * 2;
const STROKE_DEPTH = 0.05;

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
  ground: 0x111111
} as const;

const LABEL_COLOR = "#111111";

const SNAP_EPSILON = 1e-6;

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
    const mesh = strokeBetween(three, element.path[i], element.path[i + 1], WIRE_HEIGHT, material);
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
  const resistorMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);

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
    const mesh = strokeBetween(three, points[i], points[i + 1], COMPONENT_HEIGHT, resistorMaterial, STROKE_WIDTH, STROKE_DEPTH);
    if (mesh) {
      group.add(mesh);
    }
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

const buildBatteryElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `battery-${element.id}`;
  const positiveMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const negativeMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

  styliseMaterial(three, positiveMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, negativeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const isVertical = element.orientation === "vertical";
  const axisStart = isVertical ? element.start.z : element.start.x;
  const axisEnd = isVertical ? element.end.z : element.end.x;
  const axisMid = (axisStart + axisEnd) / 2;
  const axisLength = Math.abs(axisEnd - axisStart);
  const direction = Math.sign(axisEnd - axisStart) || 1;
  const perpendicular = isVertical ? element.start.x : element.start.z;

  const halfLength = axisLength / 2;
  const baseOffset = Math.min(halfLength * 0.6, 0.55);
  const offsetLimit = Math.max(halfLength - STROKE_WIDTH * 0.4, STROKE_WIDTH * 0.2);
  const plateOffset = Math.max(Math.min(baseOffset, offsetLimit), STROKE_WIDTH * 0.3);

  const positiveCenterAxis = axisMid + direction * plateOffset;
  const negativeCenterAxis = axisMid - direction * plateOffset;

  const longPlateSpan = 1.4;
  const shortPlateSpan = 0.8;
  const plateThickness = STROKE_WIDTH;
  const plateDepth = STROKE_DEPTH;

  if (isVertical) {
    const positivePlate = new three.Mesh(
      new three.BoxGeometry(longPlateSpan, plateDepth, plateThickness),
      positiveMaterial
    );
    positivePlate.position.set(perpendicular, COMPONENT_HEIGHT, positiveCenterAxis);
    const negativePlate = new three.Mesh(
      new three.BoxGeometry(shortPlateSpan, plateDepth, plateThickness),
      negativeMaterial
    );
    negativePlate.position.set(perpendicular, COMPONENT_HEIGHT, negativeCenterAxis);
    group.add(positivePlate, negativePlate);

    const negativeLeadTarget: Vec2 = {
      x: element.start.x,
      z: negativeCenterAxis - direction * (plateThickness / 2)
    };
    const positiveLeadTarget: Vec2 = {
      x: element.end.x,
      z: positiveCenterAxis + direction * (plateThickness / 2)
    };

    const leadA = strokeBetween(three, element.start, negativeLeadTarget, COMPONENT_HEIGHT, leadMaterial);
    const leadB = strokeBetween(three, positiveLeadTarget, element.end, COMPONENT_HEIGHT, leadMaterial);
    if (leadA) {
      group.add(leadA);
    }
    if (leadB) {
      group.add(leadB);
    }
  } else {
    const positivePlate = new three.Mesh(
      new three.BoxGeometry(plateThickness, plateDepth, longPlateSpan),
      positiveMaterial
    );
    positivePlate.position.set(positiveCenterAxis, COMPONENT_HEIGHT, perpendicular);
    const negativePlate = new three.Mesh(
      new three.BoxGeometry(plateThickness, plateDepth, shortPlateSpan),
      negativeMaterial
    );
    negativePlate.position.set(negativeCenterAxis, COMPONENT_HEIGHT, perpendicular);
    group.add(positivePlate, negativePlate);

    const negativeLeadTarget: Vec2 = {
      x: negativeCenterAxis - direction * (plateThickness / 2),
      z: element.start.z
    };
    const positiveLeadTarget: Vec2 = {
      x: positiveCenterAxis + direction * (plateThickness / 2),
      z: element.end.z
    };

    const leadA = strokeBetween(three, element.start, negativeLeadTarget, COMPONENT_HEIGHT, leadMaterial);
    const leadB = strokeBetween(three, positiveLeadTarget, element.end, COMPONENT_HEIGHT, leadMaterial);
    if (leadA) {
      group.add(leadA);
    }
    if (leadB) {
      group.add(leadB);
    }
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "V");
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

const buildCapacitorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `capacitor-${element.id}`;
  const plateMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const dielectricMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.dielectric
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, dielectricMaterial, options, COLOR_HELPERS.dielectric);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const isVertical = element.orientation === "vertical";
  const axisStart = isVertical ? element.start.z : element.start.x;
  const axisEnd = isVertical ? element.end.z : element.end.x;
  const axisMid = (axisStart + axisEnd) / 2;
  const axisLength = Math.abs(axisEnd - axisStart);
  const direction = Math.sign(axisEnd - axisStart) || 1;
  const perpendicular = isVertical ? element.start.x : element.start.z;

  const halfLength = axisLength / 2;
  const plateOffset = Math.max(Math.min(halfLength * 0.5, 0.45), STROKE_WIDTH * 0.3);

  const frontCenter = axisMid - direction * plateOffset;
  const backCenter = axisMid + direction * plateOffset;

  const plateSpan = 1.25;
  const dielectricThickness = STROKE_WIDTH * 0.6;
  const plateDepth = STROKE_DEPTH;

  if (isVertical) {
    const plateNear = new three.Mesh(
      new three.BoxGeometry(plateSpan, plateDepth, STROKE_WIDTH),
      plateMaterial
    );
    plateNear.position.set(perpendicular, COMPONENT_HEIGHT, frontCenter);
    const plateFar = new three.Mesh(
      new three.BoxGeometry(plateSpan, plateDepth, STROKE_WIDTH),
      plateMaterial
    );
    plateFar.position.set(perpendicular, COMPONENT_HEIGHT, backCenter);
    const dielectric = new three.Mesh(
      new three.BoxGeometry(plateSpan - STROKE_WIDTH * 0.3, plateDepth * 0.9, dielectricThickness),
      dielectricMaterial
    );
    dielectric.position.set(perpendicular, COMPONENT_HEIGHT, axisMid);
    group.add(plateNear, plateFar, dielectric);

    const leadA = strokeBetween(
      three,
      element.start,
      { x: element.start.x, z: frontCenter - direction * (STROKE_WIDTH / 2) },
      COMPONENT_HEIGHT,
      leadMaterial
    );
    const leadB = strokeBetween(
      three,
      { x: element.end.x, z: backCenter + direction * (STROKE_WIDTH / 2) },
      element.end,
      COMPONENT_HEIGHT,
      leadMaterial
    );
    if (leadA) {
      group.add(leadA);
    }
    if (leadB) {
      group.add(leadB);
    }
  } else {
    const plateNear = new three.Mesh(
      new three.BoxGeometry(STROKE_WIDTH, plateDepth, plateSpan),
      plateMaterial
    );
    plateNear.position.set(frontCenter, COMPONENT_HEIGHT, perpendicular);
    const plateFar = new three.Mesh(
      new three.BoxGeometry(STROKE_WIDTH, plateDepth, plateSpan),
      plateMaterial
    );
    plateFar.position.set(backCenter, COMPONENT_HEIGHT, perpendicular);
    const dielectric = new three.Mesh(
      new three.BoxGeometry(dielectricThickness, plateDepth * 0.9, plateSpan - STROKE_WIDTH * 0.3),
      dielectricMaterial
    );
    dielectric.position.set(axisMid, COMPONENT_HEIGHT, perpendicular);
    group.add(plateNear, plateFar, dielectric);

    const leadA = strokeBetween(
      three,
      element.start,
      { x: frontCenter - direction * (STROKE_WIDTH / 2), z: element.start.z },
      COMPONENT_HEIGHT,
      leadMaterial
    );
    const leadB = strokeBetween(
      three,
      { x: backCenter + direction * (STROKE_WIDTH / 2), z: element.end.z },
      element.end,
      COMPONENT_HEIGHT,
      leadMaterial
    );
    if (leadA) {
      group.add(leadA);
    }
    if (leadB) {
      group.add(leadB);
    }
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "C");
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

const buildInductorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `inductor-${element.id}`;
  const coilMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

  styliseMaterial(three, coilMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const coilCount = 4;
  const isVertical = element.orientation === "vertical";
  const axisStart = isVertical ? element.start.z : element.start.x;
  const axisEnd = isVertical ? element.end.z : element.end.x;
  const axisLength = Math.abs(axisEnd - axisStart);
  const axisDir = Math.sign(axisEnd - axisStart) || 1;
  const baseline = isVertical ? element.start.x : element.start.z;

  const availableLength = Math.max(axisLength - STROKE_WIDTH * 1.2, STROKE_WIDTH * 2.5);
  const rawRadius = availableLength / (coilCount * 2);
  const coilRadius = Math.max(Math.min(rawRadius, 0.55), STROKE_WIDTH * 0.8);
  const totalCoilWidth = coilCount * coilRadius * 2;
  const spacingTotal = Math.max(axisLength - totalCoilWidth, coilRadius * 0.4);
  const spacing = spacingTotal / (coilCount + 1);

  const centers: number[] = [];
  for (let i = 0; i < coilCount; i += 1) {
    const offset = spacing * (i + 1) + coilRadius * (2 * i + 1);
    centers.push(axisStart + axisDir * offset);
  }

  const samples = 18;
  centers.forEach((centerAxis) => {
    for (let s = 0; s < samples; s += 1) {
      const theta0 = Math.PI - (s * Math.PI) / samples;
      const theta1 = Math.PI - ((s + 1) * Math.PI) / samples;
      let pointA: Vec2;
      let pointB: Vec2;

      if (isVertical) {
        pointA = {
          x: baseline + coilRadius * Math.sin(theta0),
          z: centerAxis + axisDir * coilRadius * Math.cos(theta0)
        };
        pointB = {
          x: baseline + coilRadius * Math.sin(theta1),
          z: centerAxis + axisDir * coilRadius * Math.cos(theta1)
        };
      } else {
        pointA = {
          x: centerAxis + axisDir * coilRadius * Math.cos(theta0),
          z: baseline + coilRadius * Math.sin(theta0)
        };
        pointB = {
          x: centerAxis + axisDir * coilRadius * Math.cos(theta1),
          z: baseline + coilRadius * Math.sin(theta1)
        };
      }

      const segment = strokeBetween(three, pointA, pointB, COMPONENT_HEIGHT, coilMaterial, STROKE_WIDTH, STROKE_DEPTH);
      if (segment) {
        group.add(segment);
      }
    }
  });

  const startTargetAxis = centers.length ? centers[0] - axisDir * coilRadius : axisEnd;
  const endTargetAxis = centers.length ? centers[centers.length - 1] + axisDir * coilRadius : axisStart;

  const startTarget: Vec2 = isVertical
    ? { x: baseline, z: startTargetAxis }
    : { x: startTargetAxis, z: baseline };
  const endTarget: Vec2 = isVertical
    ? { x: baseline, z: endTargetAxis }
    : { x: endTargetAxis, z: baseline };

  const leadA = strokeBetween(three, element.start, startTarget, COMPONENT_HEIGHT, leadMaterial);
  const leadB = strokeBetween(three, endTarget, element.end, COMPONENT_HEIGHT, leadMaterial);
  if (leadA) {
    group.add(leadA);
  }
  if (leadB) {
    group.add(leadB);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "L");
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

const buildLampElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `lamp-${element.id}`;
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
  const disc = new three.Mesh(new three.CylinderGeometry(0.55, 0.55, 0.02, 32), fillMaterial);
  disc.position.copy(center);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(0.55, 0.02, 16, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center);
  group.add(ring);

  const diag = 0.55 * Math.SQRT1_2;
  const crossA = strokeBetween(
    three,
    { x: center.x - diag, z: center.z - diag },
    { x: center.x + diag, z: center.z + diag },
    COMPONENT_HEIGHT,
    ringMaterial,
    STROKE_WIDTH * 0.75,
    STROKE_DEPTH * 0.8
  );
  const crossB = strokeBetween(
    three,
    { x: center.x - diag, z: center.z + diag },
    { x: center.x + diag, z: center.z - diag },
    COMPONENT_HEIGHT,
    ringMaterial,
    STROKE_WIDTH * 0.75,
    STROKE_DEPTH * 0.8
  );
  if (crossA) {
    group.add(crossA);
  }
  if (crossB) {
    group.add(crossB);
  }

  const axisDir = element.orientation === "horizontal"
    ? Math.sign(element.end.x - element.start.x) || 1
    : Math.sign(element.end.z - element.start.z) || 1;
  const radius = 0.55;
  const leadStartTarget: Vec2 = element.orientation === "horizontal"
    ? { x: center.x - axisDir * radius, z: center.z }
    : { x: center.x, z: center.z - axisDir * radius };
  const leadEndTarget: Vec2 = element.orientation === "horizontal"
    ? { x: center.x + axisDir * radius, z: center.z }
    : { x: center.x, z: center.z + axisDir * radius };

  const leadStart = strokeBetween(three, element.start, leadStartTarget, COMPONENT_HEIGHT, leadMaterial);
  const leadEnd = strokeBetween(three, leadEndTarget, element.end, COMPONENT_HEIGHT, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP");
    if (labelSprite) {
      const labelPosition = center.clone();
      labelPosition.y += LABEL_HEIGHT;
      labelSprite.position.copy(labelPosition);
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildSwitchElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `switch-${element.id}`;
  const postMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const bladeMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

  styliseMaterial(three, postMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, bladeMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const isVertical = element.orientation === "vertical";
  const axisStart = isVertical ? element.start.z : element.start.x;
  const axisEnd = isVertical ? element.end.z : element.end.x;
  const axisLength = Math.abs(axisEnd - axisStart);
  const axisDir = Math.sign(axisEnd - axisStart) || 1;
  const baseline = isVertical ? element.start.x : element.start.z;

  const pivotOffset = Math.min(axisLength * 0.25, 0.7);
  const contactOffset = Math.min(axisLength * 0.15, 0.45);
  const bladeLift = Math.max(Math.min(axisLength * 0.35, 0.7), STROKE_WIDTH * 1.4);

  const pivot: Vec2 = isVertical
    ? { x: baseline, z: axisStart + axisDir * pivotOffset }
    : { x: axisStart + axisDir * pivotOffset, z: baseline };
  const contactBase: Vec2 = isVertical
    ? { x: baseline, z: axisEnd - axisDir * contactOffset }
    : { x: axisEnd - axisDir * contactOffset, z: baseline };
  const bladeTip: Vec2 = isVertical
    ? { x: baseline + bladeLift, z: contactBase.z - axisDir * STROKE_WIDTH * 0.1 }
    : { x: contactBase.x - axisDir * STROKE_WIDTH * 0.1, z: baseline + bladeLift };

  const startLead = strokeBetween(three, element.start, pivot, COMPONENT_HEIGHT, leadMaterial);
  const fixedLead = strokeBetween(three, contactBase, element.end, COMPONENT_HEIGHT, postMaterial);
  const blade = strokeBetween(three, pivot, bladeTip, COMPONENT_HEIGHT, bladeMaterial, STROKE_WIDTH, STROKE_DEPTH);

  if (startLead) {
    group.add(startLead);
  }
  if (fixedLead) {
    group.add(fixedLead);
  }
  if (blade) {
    group.add(blade);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S");
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

const buildGroundElement = (three: any, element: GroundElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `ground-${element.id}`;
  const lineMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.ground
  });
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
