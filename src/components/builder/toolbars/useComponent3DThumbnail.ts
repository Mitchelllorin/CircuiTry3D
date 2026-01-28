import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getComponent3D } from "../../circuit/Component3DLibrary";
import {
  buildElement,
  buildNodeMesh,
  disposeThreeObject,
} from "../../../schematic/threeFactory";
import { getPerformanceTier, isMobile } from "../../../utils/mobilePerformance";

const THUMBNAIL_CACHE = new Map<string, string>();
const THUMBNAIL_IN_FLIGHT = new Map<string, Promise<string>>();
const THUMBNAIL_ANIMATION_FRAME_MS = 300;
const THUMBNAIL_ANIMATION_SECONDS_PER_REV = 24;
const THUMBNAIL_ANIMATION_SPEED =
  (Math.PI * 2) / THUMBNAIL_ANIMATION_SECONDS_PER_REV;

// Performance-aware settings - balanced for visual quality
const getPerformanceSettings = () => {
  const tier = getPerformanceTier();
  const mobile = isMobile();

  // Even on low-end/mobile, maintain decent visual quality
  if (tier === 'low') {
    return {
      segments: 16,          // Increased from 8 - smooth enough to look good
      thumbnailSize: 150,    // Increased from 100 - visible detail
      batchSize: 2,
      renderDelayMs: 0,
      maxConcurrent: 1,
    };
  }

  if (tier === 'medium' || mobile) {
    return {
      segments: 22,          // Increased from 16
      thumbnailSize: 175,    // Increased from 150
      batchSize: 4,
      renderDelayMs: 0,
      maxConcurrent: 2,
    };
  }

  return {
    segments: 28,
    thumbnailSize: 200,
    batchSize: 8,
    renderDelayMs: 0,
    maxConcurrent: 4,
  };
};

type SharedThumbnailRenderer = {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
};

let sharedRenderer: SharedThumbnailRenderer | null = null;
let renderQueue: Promise<void> = Promise.resolve();

type ThumbnailKind = string;

type ThumbnailListener = (dataUrl: string) => void;

const THUMBNAIL_ANIMATION_LISTENERS = new Map<
  ThumbnailKind,
  Set<ThumbnailListener>
>();
const THUMBNAIL_ANIMATION_ROTATIONS = new Map<ThumbnailKind, number>();
let animationFrameHandle: number | null = null;
let lastAnimationTime = 0;
let isAnimationRenderQueued = false;

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

  // Use performance-aware segment count instead of fixed 28
  const perfSettings = getPerformanceSettings();
  const segments = perfSettings.segments;

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

function renderComponentThumbnail(
  kind: ThumbnailKind,
  rotationY = 0
): string {
  if (typeof document === "undefined") {
    return "";
  }

  const perfSettings = getPerformanceSettings();
  const thumbnailSize = perfSettings.thumbnailSize;

  // Creating too many WebGL contexts (one per thumbnail) will fail on many devices.
  // Reuse a single renderer/canvas for all thumbnails.
  if (!sharedRenderer) {
    const canvas = document.createElement("canvas");
    canvas.width = thumbnailSize;
    canvas.height = thumbnailSize;

    // Enable antialiasing for smoother edges (even on lower-tier devices)
    const useAntialias = true; // Always enable for visual quality

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: useAntialias,
      preserveDrawingBuffer: true,
      powerPreference: isMobile() ? 'low-power' : 'default',
    });
    if ("outputColorSpace" in renderer && (THREE as any).SRGBColorSpace) {
      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
    } else if ("outputEncoding" in renderer && (THREE as any).sRGBEncoding) {
      (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    }
    if ("toneMapping" in renderer && (THREE as any).ACESFilmicToneMapping) {
      (renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping;
      (renderer as any).toneMappingExposure = 1.15;
    }
    if ("physicallyCorrectLights" in renderer) {
      (renderer as any).physicallyCorrectLights = true;
    }
    renderer.setSize(thumbnailSize, thumbnailSize, false);
    renderer.setPixelRatio(1);
    sharedRenderer = { canvas, renderer };
  }

  const { canvas, renderer } = sharedRenderer;

  // Resize canvas if needed (in case performance tier changed)
  if (canvas.width !== thumbnailSize) {
    canvas.width = thumbnailSize;
    canvas.height = thumbnailSize;
    renderer.setSize(thumbnailSize, thumbnailSize, false);
  }

  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(3, 4, 3);
  scene.add(key);

  // Always add fill light for better dimensional appearance
  const fill = new THREE.DirectionalLight(0x88ccff, 0.5);
  fill.position.set(-3, 2, -3);
  scene.add(fill);

  let root: THREE.Object3D | null = null;
  let pivot: THREE.Group | null = null;
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
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    pivot = new THREE.Group();
    pivot.name = `thumb-pivot-${kind}`;
    root.position.sub(center);
    pivot.add(root);
    pivot.rotation.y = rotationY;
    scene.add(pivot);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    const distance = maxDim * 2.35;
    camera.position.set(distance, distance * 0.9, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    return canvas.toDataURL("image/png");
  } finally {
    if (pivot) {
      disposeThreeObject(pivot);
    } else if (root) {
      disposeThreeObject(root);
    }
  }
}

function startThumbnailAnimationLoop() {
  if (animationFrameHandle !== null) {
    return;
  }

  const tick = (time: number) => {
    if (THUMBNAIL_ANIMATION_LISTENERS.size === 0) {
      animationFrameHandle = null;
      lastAnimationTime = 0;
      return;
    }

    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      lastAnimationTime = time;
      animationFrameHandle = requestAnimationFrame(tick);
      return;
    }

    const elapsed = time - lastAnimationTime;
    if (lastAnimationTime !== 0 && elapsed < THUMBNAIL_ANIMATION_FRAME_MS) {
      animationFrameHandle = requestAnimationFrame(tick);
      return;
    }

    const deltaSeconds =
      lastAnimationTime === 0
        ? THUMBNAIL_ANIMATION_FRAME_MS / 1000
        : elapsed / 1000;
    lastAnimationTime = time;

    if (!isAnimationRenderQueued) {
      isAnimationRenderQueued = true;
      renderQueue = renderQueue
        .then(async () => {
          for (const [kind, listeners] of THUMBNAIL_ANIMATION_LISTENERS) {
            if (!listeners.size) {
              continue;
            }

            const nextAngle =
              ((THUMBNAIL_ANIMATION_ROTATIONS.get(kind) ?? 0) +
                deltaSeconds * THUMBNAIL_ANIMATION_SPEED) %
              (Math.PI * 2);
            THUMBNAIL_ANIMATION_ROTATIONS.set(kind, nextAngle);

            const dataUrl = renderComponentThumbnail(kind, nextAngle);
            if (!dataUrl) {
              continue;
            }

            THUMBNAIL_CACHE.set(kind, dataUrl);
            listeners.forEach((listener) => listener(dataUrl));
          }
        })
        .finally(() => {
          isAnimationRenderQueued = false;
        });
    }

    animationFrameHandle = requestAnimationFrame(tick);
  };

  animationFrameHandle = requestAnimationFrame(tick);
}

function subscribeToThumbnailAnimation(
  kind: ThumbnailKind,
  listener: ThumbnailListener
) {
  const listeners =
    THUMBNAIL_ANIMATION_LISTENERS.get(kind) ?? new Set<ThumbnailListener>();
  listeners.add(listener);
  THUMBNAIL_ANIMATION_LISTENERS.set(kind, listeners);

  startThumbnailAnimationLoop();

  return () => {
    const current = THUMBNAIL_ANIMATION_LISTENERS.get(kind);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (!current.size) {
      THUMBNAIL_ANIMATION_LISTENERS.delete(kind);
      THUMBNAIL_ANIMATION_ROTATIONS.delete(kind);
    }
  };
}

type ThumbnailOptions = {
  animated?: boolean;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => {
        mediaQuery.removeEventListener("change", updatePreference);
      };
    }

    mediaQuery.addListener(updatePreference);
    return () => {
      mediaQuery.removeListener(updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

export function useComponent3DThumbnail(
  builderType?: string,
  options: ThumbnailOptions = {}
): string | undefined {
  const kind = useMemo(() => {
    if (!builderType) return undefined;
    return builderType as ThumbnailKind;
  }, [builderType]);

  const [src, setSrc] = useState<string | undefined>(() => {
    if (!kind) return undefined;
    return THUMBNAIL_CACHE.get(kind);
  });

  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = Boolean(options.animated && !prefersReducedMotion);

  useEffect(() => {
    if (!kind) return;

    const cached = THUMBNAIL_CACHE.get(kind);
    if (cached) {
      setSrc(cached);
      return;
    }

    if (THUMBNAIL_IN_FLIGHT.has(kind)) {
      // Already rendering - wait for completion and then update
      const inFlightJob = THUMBNAIL_IN_FLIGHT.get(kind);
      if (inFlightJob) {
        inFlightJob.then((dataUrl) => {
          if (dataUrl) setSrc(dataUrl);
        });
      }
      return;
    }

    let cancelled = false;

    // Use immediate scheduling on mobile to avoid artificial delays
    // On desktop, use requestIdleCallback with a shorter timeout
    const mobile = isMobile();
    const schedule = mobile
      ? (cb: () => void) => window.setTimeout(cb, 0)
      : typeof (window as any).requestIdleCallback === "function"
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 50 })
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

  useEffect(() => {
    if (!kind || !shouldAnimate) {
      return;
    }

    return subscribeToThumbnailAnimation(kind, setSrc);
  }, [kind, shouldAnimate]);

  return src;
}

