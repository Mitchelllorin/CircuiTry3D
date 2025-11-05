import { GroundElement, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const WIRE_RADIUS = 0.055;
export const RESISTOR_RADIUS = 0.05;
export const NODE_RADIUS = 0.12;
export const WIRE_HEIGHT = 0.12;
export const COMPONENT_HEIGHT = 0.16;
export const LABEL_HEIGHT = 0.4;

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

const buildResistorElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `resistor-${element.id}`;
  const resistorMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const wireMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, wireMaterial, options, COLOR_HELPERS.stroke);

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
    const mesh = strokeBetween(three, segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
    if (mesh) {
      group.add(mesh);
    }
  }

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

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.05);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.05);

  if (element.orientation === "vertical") {
    const centerZ = (element.start.z + element.end.z) / 2;
    const x = element.start.x;
    const longPlate = new three.Mesh(new three.BoxGeometry(1.0, 0.18, 0.9), positiveMaterial);
    longPlate.position.set(x, COMPONENT_HEIGHT, centerZ + 0.4);
    const shortPlate = new three.Mesh(new three.BoxGeometry(0.8, 0.18, 0.45), negativeMaterial);
    shortPlate.position.set(x, COMPONENT_HEIGHT, centerZ - 0.4);
    group.add(longPlate, shortPlate);

    if (!options.preview) {
      const plusLabel = createLabelSprite(three, "+", "#ffffff");
      if (plusLabel) {
        plusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ + 0.6);
        plusLabel.scale.set(0.9, 0.9, 1);
        group.add(plusLabel);
      }
      const minusLabel = createLabelSprite(three, "−", "#cdd6f4");
      if (minusLabel) {
        minusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ - 0.6);
        minusLabel.scale.set(0.9, 0.9, 1);
        group.add(minusLabel);
      }
    }
  } else {
    const centerX = (element.start.x + element.end.x) / 2;
    const z = element.start.z;
    const longPlate = new three.Mesh(new three.BoxGeometry(0.9, 0.18, 1.0), positiveMaterial);
    longPlate.position.set(centerX + 0.4, COMPONENT_HEIGHT, z);
    const shortPlate = new three.Mesh(new three.BoxGeometry(0.45, 0.18, 0.8), negativeMaterial);
    shortPlate.position.set(centerX - 0.4, COMPONENT_HEIGHT, z);
    group.add(longPlate, shortPlate);

    if (!options.preview) {
      const plusLabel = createLabelSprite(three, "+", "#ffffff");
      if (plusLabel) {
        plusLabel.position.set(centerX + 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        plusLabel.scale.set(0.9, 0.9, 1);
        group.add(plusLabel);
      }
      const minusLabel = createLabelSprite(three, "−", "#cdd6f4");
      if (minusLabel) {
        minusLabel.position.set(centerX - 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        minusLabel.scale.set(0.9, 0.9, 1);
        group.add(minusLabel);
      }
    }
  }

  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
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

  const thickness = 0.08;
  if (element.orientation === "horizontal") {
    const centerX = (element.start.x + element.end.x) / 2;
    const z = element.start.z;
    const plateA = new three.Mesh(new three.BoxGeometry(thickness, 0.48, 1.2), plateMaterial);
    plateA.position.set(centerX - 0.3, COMPONENT_HEIGHT, z);
    const plateB = new three.Mesh(new three.BoxGeometry(thickness, 0.48, 1.2), plateMaterial);
    plateB.position.set(centerX + 0.3, COMPONENT_HEIGHT, z);
    const dielectric = new three.Mesh(new three.BoxGeometry(0.25, 0.38, 1.0), dielectricMaterial);
    dielectric.position.set(centerX, COMPONENT_HEIGHT, z);
    group.add(plateA, plateB, dielectric);
  } else {
    const x = element.start.x;
    const centerZ = (element.start.z + element.end.z) / 2;
    const plateA = new three.Mesh(new three.BoxGeometry(1.2, 0.48, thickness), plateMaterial);
    plateA.position.set(x, COMPONENT_HEIGHT, centerZ - 0.3);
    const plateB = new three.Mesh(new three.BoxGeometry(1.2, 0.48, thickness), plateMaterial);
    plateB.position.set(x, COMPONENT_HEIGHT, centerZ + 0.3);
    const dielectric = new three.Mesh(new three.BoxGeometry(1.0, 0.38, 0.25), dielectricMaterial);
    dielectric.position.set(x, COMPONENT_HEIGHT, centerZ);
    group.add(plateA, plateB, dielectric);
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

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
  const coilMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });

  styliseMaterial(three, coilMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, leadMaterial, options, COLOR_HELPERS.stroke);

  const coilCount = 4;
  const radius = 0.45;

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
  if (leadEnd) {
    group.add(leadEnd);
  }

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

  const crossGeom = new three.BoxGeometry(1.0, 0.02, 0.02);
  const crossA = new three.Mesh(crossGeom, ringMaterial);
  crossA.position.copy(center);
  crossA.rotation.y = Math.PI / 4;
  const crossB = new three.Mesh(crossGeom, ringMaterial);
  crossB.position.copy(center);
  crossB.rotation.y = -Math.PI / 4;
  group.add(crossA, crossB);

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.02);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.02);
  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.05);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.05);

  const postGeometry = new three.CylinderGeometry(0.18, 0.18, 0.6, 24);
  const postA = new three.Mesh(postGeometry, postMaterial);
  const postB = new three.Mesh(postGeometry, postMaterial);

  if (element.orientation === "horizontal") {
    postA.position.set(element.start.x + 0.2, COMPONENT_HEIGHT + 0.15, element.start.z);
    postB.position.set(element.end.x - 0.2, COMPONENT_HEIGHT + 0.15, element.end.z);
  } else {
    postA.position.set(element.start.x, COMPONENT_HEIGHT + 0.15, element.start.z + 0.2);
    postB.position.set(element.end.x, COMPONENT_HEIGHT + 0.15, element.end.z - 0.2);
  }

  const blade = new three.Mesh(new three.CylinderGeometry(0.12, 0.12, 1.8, 24), bladeMaterial);
  const bladePivot = new three.Object3D();
  bladePivot.position.copy(postA.position);
  blade.position.y = 0.9;
  blade.rotation.z = element.orientation === "horizontal" ? -Math.PI / 6 : 0;
  blade.rotation.x = element.orientation === "horizontal" ? 0 : Math.PI / 6;
  bladePivot.add(blade);

  group.add(postA, postB, bladePivot);

  const leadStart = strokeBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = strokeBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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
