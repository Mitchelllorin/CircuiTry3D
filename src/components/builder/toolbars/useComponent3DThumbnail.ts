import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../../../schematic/threeFactory";

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

function buildThumbnailElement(kind: ThumbnailKind): any {
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

  if (kind === "bjt" || kind === "bjt-npn" || kind === "bjt-pnp" || kind === "darlington" || kind === "mosfet" || kind === "potentiometer") {
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 3);
  scene.add(key);

  let root: THREE.Object3D | null = null;
  try {
    if (kind === "junction") {
      root = new THREE.Group();
      root.add(buildNodeMesh(THREE, { x: 0, z: 0 }, { preview: true }));
    } else {
      const element = buildThumbnailElement(kind);
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
    const distance = maxDim * 3.2;
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

