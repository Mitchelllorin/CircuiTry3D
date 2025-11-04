import { GroundElement, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const WIRE_RADIUS = 0.08;
export const RESISTOR_RADIUS = 0.085;
export const NODE_RADIUS = 0.14;
export const WIRE_HEIGHT = 0.18;
export const COMPONENT_HEIGHT = 0.22;
export const LABEL_HEIGHT = 0.55;

type BuildOptions = {
  preview?: boolean;
  highlight?: boolean;
};

type BuildResult = {
  group: any;
  terminals: Vec2[];
};

const COLOR_HELPERS = {
  wire: 0x8ec9ff,
  wireEmissive: 0x1d4ed8,
  resistor: 0xffe4b5,
  resistorEmissive: 0x7a431f,
  node: 0xffb3c6,
  nodeEmissive: 0xff7aa7,
  batteryPositive: 0x9be5ff,
  batteryPositiveEmissive: 0x38bdf8,
  batteryNegative: 0x3a4f6d,
  batteryNegativeEmissive: 0x233547,
  capacitorPlate: 0xb9c9ff,
  capacitorDielectric: 0x1a2747,
  inductorBody: 0xffd29b,
  inductorEmissive: 0xb87333,
  lampGlass: 0xfdf5d3,
  lampGlow: 0xf8c468,
  switchMetal: 0xb5c9ff,
  switchBlade: 0xe3ad7b,
  groundLine: 0xaec4ff
} as const;

const LABEL_COLOR = "#dbe9ff";

const SNAP_EPSILON = 1e-6;

const toVec3 = (three: any, point: Vec2, height = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

const styliseMaterial = (three: any, material: any, options: BuildOptions) => {
  if (!material) {
    return;
  }
  if (options.preview) {
    material.transparent = true;
    material.opacity = 0.45;
    material.depthWrite = false;
    const previewTint = new three.Color(0xffffff);
    material.color = material.color ? material.color.clone().lerp(previewTint, 0.25) : new three.Color(0xffffff);
    if (material.emissiveIntensity) {
      material.emissiveIntensity *= 0.4;
    }
  }
  if (options.highlight) {
    material.emissiveIntensity = (material.emissiveIntensity || 0) + 0.35;
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
  ctx.fillStyle = options.preview ? "rgba(6, 18, 42, 0.35)" : "rgba(6, 18, 42, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  const material = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });
  styliseMaterial(three, material, options);

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
  const resistorMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.resistor,
    metalness: 0.38,
    roughness: 0.4,
    emissive: COLOR_HELPERS.resistorEmissive,
    emissiveIntensity: 0.12
  });
  const wireMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });
  styliseMaterial(three, resistorMaterial, options);
  styliseMaterial(three, wireMaterial, options);

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

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
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
    color: COLOR_HELPERS.batteryPositive,
    metalness: 0.65,
    roughness: 0.28,
    emissive: COLOR_HELPERS.batteryPositiveEmissive,
    emissiveIntensity: 0.55
  });
  const negativeMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.batteryNegative,
    metalness: 0.5,
    roughness: 0.45,
    emissive: COLOR_HELPERS.batteryNegativeEmissive,
    emissiveIntensity: 0.2
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });

  styliseMaterial(three, positiveMaterial, options);
  styliseMaterial(three, negativeMaterial, options);
  styliseMaterial(three, leadMaterial, options);

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

  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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
    color: COLOR_HELPERS.capacitorPlate,
    metalness: 0.62,
    roughness: 0.28,
    emissive: 0x1e2f55,
    emissiveIntensity: 0.28
  });
  const dielectricMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.capacitorDielectric,
    metalness: 0.35,
    roughness: 0.55,
    emissive: 0x101a2c,
    emissiveIntensity: 0.18
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });

  styliseMaterial(three, plateMaterial, options);
  styliseMaterial(three, dielectricMaterial, options);
  styliseMaterial(three, leadMaterial, options);

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
  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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
    color: COLOR_HELPERS.inductorBody,
    metalness: 0.58,
    roughness: 0.32,
    emissive: COLOR_HELPERS.inductorEmissive,
    emissiveIntensity: 0.28
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });

  styliseMaterial(three, coilMaterial, options);
  styliseMaterial(three, leadMaterial, options);

  const coilCount = 4;
  const radius = 0.45;

  for (let i = 0; i < coilCount; i += 1) {
    const t = (i + 0.5) / coilCount;
    if (element.orientation === "horizontal") {
      const x = element.start.x + (element.end.x - element.start.x) * t;
      const torus = new three.TorusGeometry(radius, RESISTOR_RADIUS * 0.9, 18, 48, Math.PI * 1.15);
      const mesh = new three.Mesh(torus, coilMaterial);
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(x, COMPONENT_HEIGHT, element.start.z);
      group.add(mesh);
    } else {
      const z = element.start.z + (element.end.z - element.start.z) * t;
      const torus = new three.TorusGeometry(radius, RESISTOR_RADIUS * 0.9, 18, 48, Math.PI * 1.15);
      const mesh = new three.Mesh(torus, coilMaterial);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(element.start.x, COMPONENT_HEIGHT, z);
      group.add(mesh);
    }
  }

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT);
  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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
  const glassMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.lampGlass,
    metalness: 0.12,
    roughness: 0.2,
    emissive: COLOR_HELPERS.lampGlow,
    emissiveIntensity: options.preview ? 0.15 : 0.45,
    transparent: true,
    opacity: options.preview ? 0.5 : 0.75
  });
  const filamentMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.lampGlow,
    metalness: 0.3,
    roughness: 0.25,
    emissive: COLOR_HELPERS.lampGlow,
    emissiveIntensity: options.preview ? 0.45 : 0.85
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });

  styliseMaterial(three, leadMaterial, options);

  const bulbCenter = new three.Vector3(
    (element.start.x + element.end.x) / 2,
    COMPONENT_HEIGHT + 0.15,
    (element.start.z + element.end.z) / 2
  );
  const bulb = new three.Mesh(new three.SphereGeometry(0.65, 24, 16), glassMaterial);
  bulb.position.copy(bulbCenter);
  group.add(bulb);

  const filament = new three.Mesh(new three.TorusGeometry(0.28, 0.04, 16, 48), filamentMaterial);
  filament.rotation.x = Math.PI / 2;
  filament.position.copy(bulbCenter);
  group.add(filament);

  const startVec = toVec3(three, element.start, COMPONENT_HEIGHT - 0.1);
  const endVec = toVec3(three, element.end, COMPONENT_HEIGHT - 0.1);
  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
  if (leadStart) {
    group.add(leadStart);
  }
  if (leadEnd) {
    group.add(leadEnd);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "LAMP");
    if (labelSprite) {
      labelSprite.position.copy(bulbCenter.clone().setY(bulbCenter.y + 0.9));
      group.add(labelSprite);
    }
  }

  return { group, terminals: [element.start, element.end] };
};

const buildSwitchElement = (three: any, element: TwoTerminalElement, options: BuildOptions): BuildResult => {
  const group = new three.Group();
  group.name = `switch-${element.id}`;
  const postMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.switchMetal,
    metalness: 0.68,
    roughness: 0.35,
    emissive: 0x243a6b,
    emissiveIntensity: 0.22
  });
  const bladeMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.switchBlade,
    metalness: 0.64,
    roughness: 0.4,
    emissive: 0x8b5a35,
    emissiveIntensity: 0.25
  });
  const leadMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.wire,
    metalness: 0.55,
    roughness: 0.32,
    emissive: COLOR_HELPERS.wireEmissive,
    emissiveIntensity: 0.22
  });

  styliseMaterial(three, postMaterial, options);
  styliseMaterial(three, bladeMaterial, options);
  styliseMaterial(three, leadMaterial, options);

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

  const leadStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startVec, WIRE_RADIUS, leadMaterial);
  const leadEnd = cylinderBetween(three, endVec, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, leadMaterial);
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
    color: COLOR_HELPERS.groundLine,
    metalness: 0.42,
    roughness: 0.45,
    emissive: 0x1a2f57,
    emissiveIntensity: 0.24
  });
  styliseMaterial(three, lineMaterial, options);

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
    color: COLOR_HELPERS.node,
    emissive: COLOR_HELPERS.nodeEmissive,
    emissiveIntensity: options.preview ? 0.18 : 0.35,
    metalness: 0.25,
    roughness: 0.5
  });
  styliseMaterial(three, material, options);
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
