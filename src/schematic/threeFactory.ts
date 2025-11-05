import { GroundElement, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const NODE_RADIUS = 0.12;
export const WIRE_HEIGHT = 0.1;
export const COMPONENT_HEIGHT = 0.1;
export const LABEL_HEIGHT = 0.42;

const STROKE_DEPTH = 0.06;
const WIRE_STROKE_WIDTH = 0.12;
const COMPONENT_STROKE_WIDTH = 0.16;

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

const createStrokeBetween = (
  three: any,
  start: Vec2,
  end: Vec2,
  material: any,
  options: { height?: number; width?: number; depth?: number } = {}
) => {
  const { height = WIRE_HEIGHT, width = WIRE_STROKE_WIDTH, depth = STROKE_DEPTH } = options;
  const startVec = toVec3(three, start, height);
  const endVec = toVec3(three, end, height);
  const direction = new three.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  if (length <= SNAP_EPSILON) {
    return null;
  }
  const geometry = new three.BoxGeometry(length, depth, width);
  const mesh = new three.Mesh(geometry, material);
  const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const quaternion = new three.Quaternion().setFromUnitVectors(
    new three.Vector3(1, 0, 0),
    direction.clone().normalize()
  );
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
    const mesh = createStrokeBetween(three, element.path[i], element.path[i + 1], material, {
      height: WIRE_HEIGHT,
      width: WIRE_STROKE_WIDTH,
      depth: STROKE_DEPTH,
    });
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

  const zigCount = 6;
  const leadFraction = 0.18;
  let leadLength = Math.min(totalLength * leadFraction, 0.65);
  const targetBodyLength = Math.max(totalLength * 0.62, Math.min(2.4, totalLength));
  let bodyLength = totalLength - 2 * leadLength;

  if (bodyLength < targetBodyLength) {
    const available = Math.max(totalLength - targetBodyLength, 0);
    leadLength = Math.max(available / 2, totalLength * 0.08);
    bodyLength = totalLength - 2 * leadLength;
  }

  if (bodyLength <= SNAP_EPSILON) {
    const mesh = createStrokeBetween(three, element.start, element.end, bodyMaterial, {
      height: COMPONENT_HEIGHT,
      width: COMPONENT_STROKE_WIDTH,
    });
    if (mesh) {
      group.add(mesh);
    }
  } else {
    const bodyStartAxis = axisStart + axisDirection * leadLength;
    const bodyEndAxis = axisEnd - axisDirection * leadLength;
    const amplitude = Math.min(bodyLength * 0.26, 0.45);
    const bodyPoints: Vec2[] = [];

    for (let i = 0; i <= zigCount; i += 1) {
      const t = i / zigCount;
      const axisValue = bodyStartAxis + axisDirection * bodyLength * t;
      const offset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? -amplitude : amplitude);
      bodyPoints.push(makePoint(axisValue, offset));
    }

    const firstBodyPoint = bodyPoints[0];
    const lastBodyPoint = bodyPoints[bodyPoints.length - 1];

    if (Math.abs(leadLength) > SNAP_EPSILON) {
      const leadStartMesh = createStrokeBetween(three, element.start, firstBodyPoint, leadMaterial, {
        height: COMPONENT_HEIGHT,
        width: WIRE_STROKE_WIDTH,
      });
      if (leadStartMesh) {
        group.add(leadStartMesh);
      }
    }

    for (let i = 0; i < bodyPoints.length - 1; i += 1) {
      const seg = createStrokeBetween(three, bodyPoints[i], bodyPoints[i + 1], bodyMaterial, {
        height: COMPONENT_HEIGHT,
        width: COMPONENT_STROKE_WIDTH,
      });
      if (seg) {
        group.add(seg);
      }
    }

    if (Math.abs(leadLength) > SNAP_EPSILON) {
      const leadEndMesh = createStrokeBetween(three, lastBodyPoint, element.end, leadMaterial, {
        height: COMPONENT_HEIGHT,
        width: WIRE_STROKE_WIDTH,
      });
      if (leadEndMesh) {
        group.add(leadEndMesh);
      }
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

  const leadStartMesh = createStrokeBetween(three, element.start, toPoint(negativeAxis), leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  const leadEndMesh = createStrokeBetween(three, toPoint(positiveAxis), element.end, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });

  if (leadStartMesh) {
    group.add(leadStartMesh);
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

  const plateMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });
  const dielectricMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.dielectric });
  const leadMaterial = new three.MeshStandardMaterial({ color: COLOR_HELPERS.stroke });

  styliseMaterial(three, plateMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, dielectricMaterial, options, COLOR_HELPERS.dielectric);
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

  const leadStartMesh = createStrokeBetween(three, element.start, toPoint(plateAAxis), leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  const leadEndMesh = createStrokeBetween(three, toPoint(plateBAxis), element.end, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });

  if (leadStartMesh) {
    group.add(leadStartMesh);
  }
  if (leadEndMesh) {
    group.add(leadEndMesh);
  }

  if (!options.preview) {
    const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
    const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
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
  const coilMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

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

  for (let i = 0; i < coilCount; i += 1) {
    const axisValue = bodyStartAxis + axisDirection * spacing * (i + 1);
    const torus = new three.TorusGeometry(coilRadius, coilTube, 18, 48, Math.PI);
    const mesh = new three.Mesh(torus, coilMaterial);
    if (element.orientation === "horizontal") {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(axisValue, COMPONENT_HEIGHT, baseCross);
    } else {
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(baseCross, COMPONENT_HEIGHT, axisValue);
    }
    group.add(mesh);
  }

  const toPoint = (axisValue: number): Vec2 =>
    element.orientation === "horizontal"
      ? { x: axisValue, z: baseCross }
      : { x: baseCross, z: axisValue };

  const firstCoilAxis = bodyStartAxis + axisDirection * spacing;
  const lastCoilAxis = bodyStartAxis + axisDirection * spacing * coilCount;

  const leadStartMesh = createStrokeBetween(three, element.start, toPoint(firstCoilAxis - axisDirection * coilRadius), leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  const leadEndMesh = createStrokeBetween(three, toPoint(lastCoilAxis + axisDirection * coilRadius), element.end, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });

  if (leadStartMesh) {
    group.add(leadStartMesh);
  }
  if (leadEndMesh) {
    group.add(leadEndMesh);
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
  const disc = new three.Mesh(new three.CylinderGeometry(0.55, 0.55, STROKE_DEPTH * 0.6, 32), fillMaterial);
  disc.position.copy(center);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(0.55, 0.02, 16, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center);
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

  crossPoints.forEach(([start, end]) => {
    const cross = createStrokeBetween(three, start, end, ringMaterial, {
      height: COMPONENT_HEIGHT,
      width: COMPONENT_STROKE_WIDTH * 0.3,
      depth: STROKE_DEPTH * 0.6,
    });
    if (cross) {
      group.add(cross);
    }
  });

  const orientation = Math.abs(element.end.x - element.start.x) >= Math.abs(element.end.z - element.start.z)
    ? "horizontal"
    : "vertical";

  const axisDirection = orientation === "horizontal"
    ? element.end.x >= element.start.x ? 1 : -1
    : element.end.z >= element.start.z ? 1 : -1;

  const ringRadius = 0.55;
  const leadStartTarget: Vec2 =
    orientation === "horizontal"
      ? { x: center.x - axisDirection * ringRadius, z: center.z }
      : { x: center.x, z: center.z - axisDirection * ringRadius };
  const leadEndTarget: Vec2 =
    orientation === "horizontal"
      ? { x: center.x + axisDirection * ringRadius, z: center.z }
      : { x: center.x, z: center.z + axisDirection * ringRadius };

  const leadStart = createStrokeBetween(three, element.start, leadStartTarget, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  const leadEnd = createStrokeBetween(three, leadEndTarget, element.end, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
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

  const postAPoint: Vec2 = { x: postA.position.x, z: postA.position.z };
  const postBPoint: Vec2 = { x: postB.position.x, z: postB.position.z };

  const leadStart = createStrokeBetween(three, element.start, postAPoint, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  const leadEnd = createStrokeBetween(three, postBPoint, element.end, leadMaterial, {
    height: COMPONENT_HEIGHT,
    width: WIRE_STROKE_WIDTH,
  });
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S");
    if (labelSprite) {
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
