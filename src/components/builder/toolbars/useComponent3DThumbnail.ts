import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getComponent3D } from "../../circuit/Component3DLibrary";
import {
  buildElement,
  buildNodeMesh,
  disposeThreeObject,
} from "../../../schematic/threeFactory";

const THUMBNAIL_SIZE_PX = 200;
const THUMBNAIL_CACHE = new Map<string, string>();
const THUMBNAIL_IN_FLIGHT = new Map<string, Promise<string>>();

type SharedThumbnailRenderer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
};

let sharedRenderer: SharedThumbnailRenderer | null = null;
let renderQueue: Promise<void> = Promise.resolve();

type ThumbnailKind = string;

const COMPONENT_3D_TYPE_MAP: Record<string, string> = {
  bjt: "transistor-bjt",
  "bjt-npn": "transistor-bjt-npn",
  "bjt-pnp": "transistor-bjt-pnp",
  darlington: "darlington-pair",
  mosfet: "transistor-mosfet",
};

const resolveComponent3DType = (kind: string) =>
  COMPONENT_3D_TYPE_MAP[kind] ?? kind;

function buildLegacyThumbnailElement(kind: ThumbnailKind): any {
  if (kind === "junction") {
    return { kind: "junction" };
  }

  if (kind === "ground") {
    return {
      id: "thumb-ground",
      kind: "ground",
      orientation: "horizontal",
      position: { x: 0, z: 0 },
    };
  }

  if (kind === "opamp" || kind === "transformer") {
    // Minimal multi-terminal elements: terminals are enough for the 3D builders.
    return {
      id: `thumb-${kind}`,
      kind,
      terminals:
        kind === "opamp"
          ? [
              { x: -1.0, z: -0.5 }, // in-
              { x: -1.0, z: 0.5 }, // in+
              { x: 1.2, z: 0.0 }, // out
            ]
          : [
              { x: -1.0, z: -0.6 },
              { x: -1.0, z: 0.6 },
              { x: 1.0, z: -0.6 },
              { x: 1.0, z: 0.6 },
            ],
      label: "",
    };
  }

  if (
    kind === "bjt" ||
    kind === "bjt-npn" ||
    kind === "bjt-pnp" ||
    kind === "darlington" ||
    kind === "mosfet" ||
    kind === "potentiometer"
  ) {
    return {
      id: `thumb-${kind}`,
      kind,
      collector: { x: 1.0, z: 0.6 },
      base: { x: -1.0, z: 0.0 },
      emitter: { x: 1.0, z: -0.6 },
      transistorType: kind === "bjt-pnp" ? "pnp" : "npn",
      label: "",
    };
  }

  // Default: two terminal component.
  return {
    id: `thumb-${kind}`,
    kind,
    orientation: "horizontal",
    start: { x: -1.2, z: 0 },
    end: { x: 1.2, z: 0 },
    label: "",
  };
}

function buildComponentLibraryGroup(kind: ThumbnailKind): THREE.Object3D | null {
  const componentType = resolveComponent3DType(kind);
  const componentDef = getComponent3D(componentType);
  if (!componentDef) {
    return null;
  }

  const group = new THREE.Group();
  group.name = `thumb-${componentType}`;
  const segments = 28;

  componentDef.geometry.shapes.forEach((shapeDef) => {
    let geometry: THREE.BufferGeometry | null = null;

    switch (shapeDef.type) {
      case "box":
        geometry = new THREE.BoxGeometry(
          shapeDef.scale?.[0] ?? 1,
          shapeDef.scale?.[1] ?? 1,
          shapeDef.scale?.[2] ?? 1
        );
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(
          shapeDef.scale?.[0] ?? 0.5,
          shapeDef.scale?.[0] ?? 0.5,
          shapeDef.scale?.[1] ?? 1,
          segments
        );
        break;
      case "sphere":
        geometry = new THREE.SphereGeometry(
          shapeDef.scale?.[0] ?? 0.5,
          segments,
          segments
        );
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(
          shapeDef.scale?.[0] ?? 0.5,
          shapeDef.scale?.[1] ?? 1,
          segments
        );
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(
          shapeDef.scale?.[0] ?? 0.5,
          shapeDef.scale?.[1] ?? 0.2,
          Math.max(8, Math.floor(segments / 2)),
          segments * 3
        );
        break;
      default:
        break;
    }

    if (!geometry) {
      return;
    }

    const material = new THREE.MeshStandardMaterial({
      color: shapeDef.color ?? "#888888",
      metalness: 0.3,
      roughness: 0.4,
      transparent: shapeDef.opacity !== undefined,
      opacity: shapeDef.opacity ?? 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      shapeDef.position[0],
      shapeDef.position[1],
      shapeDef.position[2]
    );

    if (shapeDef.rotation) {
      mesh.rotation.set(
        shapeDef.rotation[0],
        shapeDef.rotation[1],
        shapeDef.rotation[2]
      );
    }

    group.add(mesh);
  });

  componentDef.geometry.leads.forEach((leadDef) => {
    const geometry = new THREE.CylinderGeometry(
      leadDef.radius,
      leadDef.radius,
      leadDef.length,
      Math.max(8, Math.floor(segments / 2))
    );

    const material = new THREE.MeshStandardMaterial({
      color: leadDef.color ?? "#C0C0C0",
      metalness: 0.8,
      roughness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      leadDef.position[0],
      leadDef.position[1],
      leadDef.position[2]
    );

    group.add(mesh);
  });

  return group;
}

function renderComponentThumbnail(kind: ThumbnailKind): string {
  if (typeof document === "undefined") {
    return "";
  }

  // Creating too many WebGL contexts (one per thumbnail) will fail on many devices.
  // Reuse a single renderer/canvas for all thumbnails.
  if (!sharedRenderer) {
    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_SIZE_PX;
    canvas.height = THUMBNAIL_SIZE_PX;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if ("outputColorSpace" in renderer && (THREE as any).SRGBColorSpace) {
      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
    } else if ("outputEncoding" in renderer && (THREE as any).sRGBEncoding) {
      (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    }
    if ("toneMapping" in renderer && (THREE as any).ACESFilmicToneMapping) {
      (renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping;
      (renderer as any).toneMappingExposure = 1.0;
    }
    if ("physicallyCorrectLights" in renderer) {
      (renderer as any).physicallyCorrectLights = true;
    }
    renderer.setSize(THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX, false);
    renderer.setPixelRatio(1);
    sharedRenderer = { canvas, renderer };
  }

  const { canvas, renderer } = sharedRenderer;

  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88ccff, 0.35);
  fill.position.set(-3, 2, -3);
  scene.add(fill);

  let root: THREE.Object3D | null = null;
  try {
    const libraryGroup = buildComponentLibraryGroup(kind);

    if (libraryGroup) {
      root = libraryGroup;
    } else if (kind === "junction") {
      root = new THREE.Group();
      root.add(buildNodeMesh(THREE, { x: 0, z: 0 }, { preview: true }));
    } else {
      const element = buildLegacyThumbnailElement(kind);
      const built = buildElement(THREE, element, { preview: true });
      root = built.group as THREE.Object3D;
    }

    // Fit camera to content.
    scene.add(root);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    const distance = maxDim * 2.6;
    camera.position.set(center.x + distance, center.y + distance * 0.9, center.z + distance);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    return canvas.toDataURL("image/png");
  } finally {
    if (root) {
      disposeThreeObject(root);
    }
  }
}

export function useComponent3DThumbnail(builderType?: string): string | undefined {
  const kind = useMemo(() => {
    if (!builderType) return undefined;
    return builderType as ThumbnailKind;
  }, [builderType]);

  const [src, setSrc] = useState<string | undefined>(() => {
    if (!kind) return undefined;
    return THUMBNAIL_CACHE.get(kind);
  });

  useEffect(() => {
    if (!kind) return;

    const cached = THUMBNAIL_CACHE.get(kind);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;

    // Defer the expensive WebGL work off the click path.
    const schedule =
      typeof (window as any).requestIdleCallback === "function"
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 350 })
        : (cb: () => void) => window.setTimeout(cb, 0);

    const handle = schedule(() => {
      const existing = THUMBNAIL_IN_FLIGHT.get(kind);
      const job =
        existing ??
        (async () => {
          // Ensure renders happen one-at-a-time to avoid resource spikes.
          await (renderQueue = renderQueue.then(async () => {
            // If someone else already cached it while we waited, use that.
            const cachedNow = THUMBNAIL_CACHE.get(kind);
            if (cachedNow) return;
            const dataUrl = renderComponentThumbnail(kind);
            if (!dataUrl) return;
            THUMBNAIL_CACHE.set(kind, dataUrl);
          }));
          return THUMBNAIL_CACHE.get(kind) ?? "";
        })();

      if (!existing) {
        THUMBNAIL_IN_FLIGHT.set(kind, job);
      }

      job
        .then((dataUrl) => {
          if (cancelled || !dataUrl) return;
          setSrc(dataUrl);
        })
        .catch(() => {
          // Thumbnail is a non-critical enhancement; ignore failures gracefully.
        })
        .finally(() => {
          // Best-effort: clear in-flight entry once completed.
          const current = THUMBNAIL_IN_FLIGHT.get(kind);
          if (current === job) {
            THUMBNAIL_IN_FLIGHT.delete(kind);
          }
        });
    });

    return () => {
      cancelled = true;
      if (typeof handle === "number") {
        window.clearTimeout(handle);
      }
      // requestIdleCallback cancellation is best-effort; ignore if unsupported.
    };
  }, [kind]);

  return src;
}

