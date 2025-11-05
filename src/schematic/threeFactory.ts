import { GroundElement, Orientation, SchematicElement, TwoTerminalElement, Vec2, WireElement } from "./types";

export const WIRE_RADIUS = 0.055;
export const RESISTOR_RADIUS = 0.05;
export const NODE_RADIUS = 0.12;
export const WIRE_HEIGHT = 0.12;
export const COMPONENT_HEIGHT = 0.16;
export const LABEL_HEIGHT = 0.4;

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
  const resistorMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  const wireMaterial = new three.MeshStandardMaterial({
    color: COLOR_HELPERS.stroke
  });
  styliseMaterial(three, resistorMaterial, options, COLOR_HELPERS.stroke);
  styliseMaterial(three, wireMaterial, options, COLOR_HELPERS.stroke);

  const { preferred, minimum, zigCount, amplitude } = SYMBOL_DEFAULTS.resistor;
  const layout = resolveSymbolBody(element, preferred, minimum);

  const points: Vec2[] = [];
  const baseAmplitude = amplitude * layout.scale;
  const maxAmplitude = layout.bodyLength / (zigCount * 1.5);
  const effectiveAmplitude = Math.min(baseAmplitude, maxAmplitude);

  for (let i = 0; i <= zigCount; i += 1) {
    const t = i / zigCount;
    if (layout.orientation === "horizontal") {
      const x = layout.bodyStart.x + (layout.bodyEnd.x - layout.bodyStart.x) * t;
      const zOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? -effectiveAmplitude : effectiveAmplitude);
      points.push({ x, z: layout.crossAxis + zOffset });
    } else {
      const z = layout.bodyStart.z + (layout.bodyEnd.z - layout.bodyStart.z) * t;
      const xOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? effectiveAmplitude : -effectiveAmplitude);
      points.push({ x: layout.crossAxis + xOffset, z });
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

  const startTop = toVec3(three, element.start, COMPONENT_HEIGHT);
  const endTop = toVec3(three, element.end, COMPONENT_HEIGHT);
  const bodyStartTop = toVec3(three, layout.bodyStart, COMPONENT_HEIGHT);
  const bodyEndTop = toVec3(three, layout.bodyEnd, COMPONENT_HEIGHT);

  const leadVerticalStart = cylinderBetween(three, toVec3(three, element.start, WIRE_HEIGHT), startTop, WIRE_RADIUS, wireMaterial);
  const leadVerticalEnd = cylinderBetween(three, endTop, toVec3(three, element.end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
  if (leadVerticalStart) {
    group.add(leadVerticalStart);
  }
  if (leadVerticalEnd) {
    group.add(leadVerticalEnd);
  }

  const leadIn = cylinderBetween(three, startTop, bodyStartTop, WIRE_RADIUS, wireMaterial);
  const leadOut = cylinderBetween(three, bodyEndTop, endTop, WIRE_RADIUS, wireMaterial);
  if (leadIn) {
    group.add(leadIn);
  }
  if (leadOut) {
    group.add(leadOut);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
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

  const { preferred, minimum, plateSpacing, longPlate, shortPlate } = SYMBOL_DEFAULTS.battery;
  const layout = resolveSymbolBody(element, preferred, minimum);

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

  const gap = Math.min(plateSpacing * layout.scale, layout.bodyLength * 0.6);
  const axisStart = layout.axis === "x" ? layout.bodyStart.x : layout.bodyStart.z;
  const axisEnd = layout.axis === "x" ? layout.bodyEnd.x : layout.bodyEnd.z;
  const centerAxis = (axisStart + axisEnd) / 2;
  const positiveAxis = centerAxis + layout.direction * gap * 0.5;
  const negativeAxis = centerAxis - layout.direction * gap * 0.5;
  const scale = Math.max(layout.scale, 0.35);
  const longSize = longPlate * scale;
  const shortSize = shortPlate * scale;
  const thickness = WIRE_RADIUS * 2.1;
  const plateHeight = 0.18;

  const cross = layout.crossAxis;

  const makePlate = (length: number, axisPosition: number, material: any, isPositive: boolean) => {
    const geometry = new three.BoxGeometry(thickness, plateHeight, length);
    const mesh = new three.Mesh(geometry, material);
    if (layout.orientation === "vertical") {
      mesh.rotation.y = Math.PI / 2;
    }
    if (layout.axis === "x") {
      mesh.position.set(axisPosition, COMPONENT_HEIGHT, cross);
    } else {
      mesh.position.set(cross, COMPONENT_HEIGHT, axisPosition);
    }
    if (!options.preview) {
      const label = createLabelSprite(three, isPositive ? "+" : "−", "#111111", options);
      if (label) {
        const offsetAxis = axisPosition + (isPositive ? layout.direction * thickness : -layout.direction * thickness);
        if (layout.axis === "x") {
          label.position.set(offsetAxis, COMPONENT_HEIGHT + 0.12, cross + (isPositive ? length * 0.4 : -length * 0.4));
        } else {
          label.position.set(cross + (isPositive ? length * 0.4 : -length * 0.4), COMPONENT_HEIGHT + 0.12, offsetAxis);
        }
        label.scale.set(0.9, 0.9, 1);
        group.add(label);
      }
    }
    return mesh;
  };

  const positivePlate = makePlate(longSize, positiveAxis, positiveMaterial, true);
  const negativePlate = makePlate(shortSize, negativeAxis, negativeMaterial, false);
  group.add(positivePlate, negativePlate);

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "V");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
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

  const { preferred, minimum, plateSpacing, plateLength } = SYMBOL_DEFAULTS.capacitor;
  const layout = resolveSymbolBody(element, preferred, minimum);

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

  const { preferred, minimum, coilCount } = SYMBOL_DEFAULTS.inductor;
  const layout = resolveSymbolBody(element, preferred, minimum);

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

  for (let i = 0; i < coilCount; i += 1) {
    const t = (i + 0.5) / coilCount;
    const axisValue = layout.axis === "x"
      ? layout.bodyStart.x + (layout.bodyEnd.x - layout.bodyStart.x) * t
      : layout.bodyStart.z + (layout.bodyEnd.z - layout.bodyStart.z) * t;
    const coil = new three.TorusGeometry(radius, tubeRadius, 18, 60, Math.PI);
    const mesh = new three.Mesh(coil, coilMaterial);
    if (layout.orientation === "horizontal") {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(axisValue, COMPONENT_HEIGHT, layout.crossAxis);
    } else {
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(layout.crossAxis, COMPONENT_HEIGHT, axisValue);
    }
    group.add(mesh);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "L");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
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

  const layout = resolveSymbolBody(element, SYMBOL_DEFAULTS.lamp.preferred, SYMBOL_DEFAULTS.lamp.minimum);

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

  const radius = Math.min(layout.bodyLength * 0.45, 0.6 * Math.max(layout.scale, 0.5));
  const centerVec2 = layout.center;
  const center = toVec3(three, centerVec2, COMPONENT_HEIGHT);

  const disc = new three.Mesh(new three.CylinderGeometry(radius, radius, 0.04, 48), fillMaterial);
  disc.position.copy(center);
  group.add(disc);

  const ring = new three.Mesh(new three.TorusGeometry(radius, 0.02, 16, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center);
  group.add(ring);

  const crossLength = radius * 1.6;
  const crossGeom = new three.BoxGeometry(crossLength, 0.02, 0.02);
  const crossA = new three.Mesh(crossGeom, ringMaterial);
  crossA.position.copy(center);
  crossA.rotation.y = Math.PI / 4;
  const crossB = new three.Mesh(crossGeom, ringMaterial);
  crossB.position.copy(center);
  crossB.rotation.y = -Math.PI / 4;
  group.add(crossA, crossB);

  const entryOffset = radius;
  const entryStart: Vec2 = layout.axis === "x"
    ? { x: centerVec2.x - layout.direction * entryOffset, z: layout.crossAxis }
    : { x: layout.crossAxis, z: centerVec2.z - layout.direction * entryOffset };
  const entryEnd: Vec2 = layout.axis === "x"
    ? { x: centerVec2.x + layout.direction * entryOffset, z: layout.crossAxis }
    : { x: layout.crossAxis, z: centerVec2.z + layout.direction * entryOffset };

  const entryStartTop = toVec3(three, entryStart, COMPONENT_HEIGHT);
  const entryEndTop = toVec3(three, entryEnd, COMPONENT_HEIGHT);

  const leadInnerStart = cylinderBetween(three, bodyStartTop, entryStartTop, WIRE_RADIUS, leadMaterial);
  const leadInnerEnd = cylinderBetween(three, entryEndTop, bodyEndTop, WIRE_RADIUS, leadMaterial);
  if (leadInnerStart) {
    group.add(leadInnerStart);
  }
  if (leadInnerEnd) {
    group.add(leadInnerEnd);
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

  const layout = resolveSymbolBody(element, SYMBOL_DEFAULTS.switch.preferred, SYMBOL_DEFAULTS.switch.minimum);

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

  const pivotHeight = COMPONENT_HEIGHT + 0.18;
  const pivotSphere = new three.Mesh(new three.SphereGeometry(0.18, 20, 20), postMaterial);
  if (layout.axis === "x") {
    pivotSphere.position.set(layout.bodyStart.x, pivotHeight, layout.crossAxis);
  } else {
    pivotSphere.position.set(layout.crossAxis, pivotHeight, layout.bodyStart.z);
  }
  group.add(pivotSphere);

  const contactPost = new three.Mesh(new three.CylinderGeometry(0.16, 0.16, 0.36, 18), postMaterial);
  if (layout.axis === "x") {
    contactPost.position.set(layout.bodyEnd.x, COMPONENT_HEIGHT + 0.18, layout.crossAxis);
  } else {
    contactPost.position.set(layout.crossAxis, COMPONENT_HEIGHT + 0.18, layout.bodyEnd.z);
  }
  group.add(contactPost);

  const bladeLift = Math.min(0.9, 0.55 + layout.bodyLength * 0.15);
  const bladeGap = Math.min(0.35, layout.bodyLength * 0.25);
  const contactAxis = layout.axis === "x" ? layout.bodyEnd.x : layout.bodyEnd.z;
  const bladeAxisEnd = contactAxis - layout.direction * bladeGap;

  const pivotVec = toVec3(three, layout.bodyStart, pivotHeight - 0.06);
  const bladeTipVec2: Vec2 = layout.axis === "x"
    ? { x: bladeAxisEnd, z: layout.crossAxis + bladeLift }
    : { x: layout.crossAxis + bladeLift, z: bladeAxisEnd };
  const bladeTipVec = toVec3(three, bladeTipVec2, COMPONENT_HEIGHT + 0.1);
  const bladeMesh = cylinderBetween(three, pivotVec, bladeTipVec, WIRE_RADIUS, bladeMaterial);
  if (bladeMesh) {
    group.add(bladeMesh);
  }

  const contactStubVec2: Vec2 = layout.axis === "x"
    ? { x: contactAxis, z: layout.crossAxis + bladeLift }
    : { x: layout.crossAxis + bladeLift, z: contactAxis };
  const contactStubVec = toVec3(three, contactStubVec2, COMPONENT_HEIGHT + 0.02);
  const stub = cylinderBetween(three, bladeTipVec, contactStubVec, WIRE_RADIUS * 0.8, bladeMaterial);
  if (stub) {
    group.add(stub);
  }

  const dropBack = cylinderBetween(three, contactStubVec, bodyEndTop, WIRE_RADIUS * 0.75, leadMaterial);
  if (dropBack) {
    group.add(dropBack);
  }

  if (!options.preview) {
    const labelSprite = createLabelSprite(three, element.label ?? "S");
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(bodyStartTop, bodyEndTop).multiplyScalar(0.5);
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
