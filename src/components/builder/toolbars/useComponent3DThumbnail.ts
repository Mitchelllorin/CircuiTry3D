import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getComponent3D } from "../../circuit/Component3DLibrary";

// Render at a higher resolution than we display for sharper thumbnails.
const THUMBNAIL_SIZE_PX = 256;
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
let sharedRendererFailed = false;
let renderQueue: Promise<void> = Promise.resolve();

type ThumbnailKind = string;

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
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    // Render thumbnails at a higher DPR for sharpness, while keeping the displayed
    // CSS size small in the component library.
    const dpr = Math.min((window.devicePixelRatio || 1), 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX, false);
    // Improve clarity on high-DPI screens, but avoid extreme memory usage.
    const dpr =
      typeof window !== "undefined" && typeof window.devicePixelRatio === "number"
        ? Math.min(2, Math.max(1, window.devicePixelRatio))
        : 1;
    renderer.setPixelRatio(dpr);
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(4, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88ccff, 0.35);
  fill.position.set(-4, 2.5, -3);
  scene.add(fill);

  // Always add fill light for better dimensional appearance
  const fill = new THREE.DirectionalLight(0x88ccff, 0.5);
  fill.position.set(-3, 2, -3);
  scene.add(fill);

  let root: THREE.Object3D | null = null;
  let pivot: THREE.Group | null = null;
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

    // Fit camera to content (tight framing so the model looks big in the same container).
    scene.add(root);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.001);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
    const halfFovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
    // Smaller = more zoom (fills more of the thumbnail).
    const padding = 1.12;
    const distance = (radius / Math.sin(halfFovRad)) * padding;

    const viewDir = new THREE.Vector3(1, 0.85, 1).normalize();
    camera.position.copy(center).addScaledVector(viewDir, distance);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 100;
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    renderer.clear();
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

    const hasIdleCallback =
      typeof (window as any).requestIdleCallback === "function" &&
      typeof (window as any).cancelIdleCallback === "function";
    const fallbackDelayMs = isMobile() ? 80 : 32;
    const schedule = (cb: () => void) => {
      if (hasIdleCallback) {
        return {
          kind: "idle" as const,
          id: (window as any).requestIdleCallback(cb, { timeout: 1200 }),
        };
      }

      return {
        kind: "timeout" as const,
        id: window.setTimeout(cb, fallbackDelayMs),
      };
    };

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
      if (handle.kind === "timeout") {
        window.clearTimeout(handle.id);
      } else if (hasIdleCallback) {
        (window as any).cancelIdleCallback(handle.id);
      }
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

