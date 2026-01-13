import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getComponent3D } from "../../circuit/Component3DLibrary";

const THUMBNAIL_SIZE_PX = 160;
const THUMBNAIL_CACHE = new Map<string, string>();
const THUMBNAIL_IN_FLIGHT = new Map<string, Promise<string>>();

type SharedThumbnailRenderer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
};

let sharedRenderer: SharedThumbnailRenderer | null = null;
let renderQueue: Promise<void> = Promise.resolve();

type ThumbnailKind =
  | "battery"
  | "ac_source"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "lamp"
  | "motor"
  | "speaker"
  | "diode"
  | "led"
  | "switch"
  | "fuse"
  | "bjt"
  | "bjt-npn"
  | "bjt-pnp"
  | "darlington"
  | "mosfet"
  | "potentiometer"
  | "opamp"
  | "transformer"
  | "ground"
  | "junction";

function mapBuilderTypeToComponent3DType(kind: ThumbnailKind): string | null {
  switch (kind) {
    case "bjt":
      return "transistor-bjt-npn";
    case "bjt-npn":
      return "transistor-bjt-npn";
    case "bjt-pnp":
      return "transistor-bjt-pnp";
    case "darlington":
      return "darlington-pair";
    case "mosfet":
      return "transistor-mosfet";
    case "ac_source":
      return "ac_source";
    case "battery":
      return "battery";
    case "resistor":
      return "resistor";
    case "capacitor":
      return "capacitor";
    case "inductor":
      return "inductor";
    case "lamp":
      return "lamp";
    case "motor":
      return "motor";
    case "speaker":
      return "speaker";
    case "diode":
      return "diode";
    case "led":
      return "led";
    case "switch":
      return "switch";
    case "fuse":
      return "fuse";
    case "potentiometer":
      return "potentiometer";
    case "opamp":
      return "opamp";
    case "transformer":
      return "transformer";
    case "ground":
    case "junction":
    default:
      return null;
  }
}

function disposeThreeObject(root: THREE.Object3D) {
  root.traverse((object: any) => {
    if (object.geometry && typeof object.geometry.dispose === "function") {
      object.geometry.dispose();
    }
    const material = object.material;
    if (material) {
      if (Array.isArray(material)) {
        material.forEach((mat) => mat?.dispose?.());
      } else {
        material.dispose?.();
      }
    }
  });
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
    renderer.setSize(THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX, false);
    renderer.setPixelRatio(1);
    sharedRenderer = { canvas, renderer };
  }

  const { canvas, renderer } = sharedRenderer;

  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(4, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88ccff, 0.35);
  fill.position.set(-4, 2.5, -3);
  scene.add(fill);

  let root: THREE.Object3D | null = null;
  try {
    const mappedType = mapBuilderTypeToComponent3DType(kind);
    const def = mappedType ? getComponent3D(mappedType) : undefined;

    root = new THREE.Group();

    if (def) {
      const segments = 24;

      def.geometry.shapes.forEach((shapeDef) => {
        let geometry: THREE.BufferGeometry | null = null;
        switch (shapeDef.type) {
          case "box":
            geometry = new THREE.BoxGeometry(
              shapeDef.scale?.[0] ?? 1,
              shapeDef.scale?.[1] ?? 1,
              shapeDef.scale?.[2] ?? 1,
            );
            break;
          case "cylinder":
            geometry = new THREE.CylinderGeometry(
              shapeDef.scale?.[0] ?? 0.5,
              shapeDef.scale?.[0] ?? 0.5,
              shapeDef.scale?.[1] ?? 1,
              segments,
            );
            break;
          case "sphere":
            geometry = new THREE.SphereGeometry(shapeDef.scale?.[0] ?? 0.5, segments, segments);
            break;
          case "cone":
            geometry = new THREE.ConeGeometry(
              shapeDef.scale?.[0] ?? 0.5,
              shapeDef.scale?.[1] ?? 1,
              segments,
            );
            break;
          case "torus":
            geometry = new THREE.TorusGeometry(
              shapeDef.scale?.[0] ?? 0.5,
              shapeDef.scale?.[1] ?? 0.2,
              Math.max(8, Math.floor(segments / 2)),
              segments * 3,
            );
            break;
          default:
            geometry = null;
        }

        if (!geometry) return;

        const material = new THREE.MeshStandardMaterial({
          color: shapeDef.color ?? "#888888",
          metalness: 0.3,
          roughness: 0.45,
          transparent: shapeDef.opacity !== undefined,
          opacity: shapeDef.opacity ?? 1.0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(shapeDef.position[0], shapeDef.position[1], shapeDef.position[2]);
        if (shapeDef.rotation) {
          mesh.rotation.set(shapeDef.rotation[0], shapeDef.rotation[1], shapeDef.rotation[2]);
        }
        root.add(mesh);
      });

      def.geometry.leads.forEach((leadDef) => {
        const geometry = new THREE.CylinderGeometry(
          leadDef.radius,
          leadDef.radius,
          leadDef.length,
          Math.max(8, Math.floor(segments / 2)),
        );
        const material = new THREE.MeshStandardMaterial({
          color: leadDef.color ?? "#C0C0C0",
          metalness: 0.85,
          roughness: 0.25,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(leadDef.position[0], leadDef.position[1], leadDef.position[2]);
        root.add(mesh);
      });
    } else {
      // Fallback: generic cube if we don't have a 3D definition (e.g., ground/junction).
      const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const material = new THREE.MeshStandardMaterial({
        color: "#3b82f6",
        metalness: 0.2,
        roughness: 0.5,
      });
      root.add(new THREE.Mesh(geometry, material));
    }

    // Fit camera to content.
    scene.add(root);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    const distance = maxDim * 3.0;
    camera.position.set(center.x + distance, center.y + distance * 0.85, center.z + distance);
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

