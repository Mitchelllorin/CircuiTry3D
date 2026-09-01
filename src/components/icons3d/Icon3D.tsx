import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as THREE from "three";
import circuitLogo from "../../assets/circuit-logo.svg";
import { ICON_MODELS, ICON_NAMES, type Icon3DName } from "./iconModels";

// Real modelled 3D icons, rendered ONCE on a single shared WebGL context and
// cached as images — the same trick Logo3D uses for the wordmark, extended to a
// set. The whole icon set costs one context and one frame per icon, after which
// the context is destroyed and every icon anywhere is a plain cached <img>.
//
// Why it has to work this way: a live <Canvas> per icon would mean a dozen WebGL
// contexts fighting the builder's own scene and the arena's for the device's
// context budget — the exact thing that has blanked this app's workspace before.
// Icons are static. Rendering them every frame buys nothing.

const ICON_PX = 256;

/**
 * Icons that are a real artwork file, not a modelled mesh.
 *
 * Build is the app's own logo. A 3D model of it — however carefully matched —
 * is a redrawing, and a redrawing of your own mark is worse than the mark: the
 * whole value of using it here is that people already read it as this product.
 * So Build ships the actual file, background plate and labels and all, and the
 * other twelve stay modelled.
 */
const IMAGE_ICONS: Partial<Record<Icon3DName, string>> = {
  build: circuitLogo,
};

const cache: Partial<Record<Icon3DName, string>> = {};
let renderPromise: Promise<void> | null = null;
let renderFailed = false;

function makeRenderer() {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  const compat = THREE as unknown as Record<string, unknown>;
  if ("outputColorSpace" in renderer && compat["SRGBColorSpace"]) {
    (renderer as unknown as Record<string, unknown>).outputColorSpace = compat["SRGBColorSpace"];
  }
  if ("toneMapping" in renderer && compat["ACESFilmicToneMapping"]) {
    (renderer as unknown as Record<string, unknown>).toneMapping = compat["ACESFilmicToneMapping"];
    (renderer as unknown as Record<string, number>).toneMappingExposure = 1.05;
  }
  renderer.setSize(ICON_PX, ICON_PX, false);
  renderer.setPixelRatio(1);
  return { canvas, renderer };
}

/**
 * Lighting — a studio, not a room.
 *
 * A metal surface renders what it REFLECTS, and almost nothing else: diffuse light
 * barely touches it. So on a chrome icon the environment map is not a finishing
 * touch, it IS the shading, and whatever contrast the environment has is the only
 * contrast the icon will ever have.
 *
 * That is why RoomEnvironment was wrong here. It is a neutral, evenly-lit room —
 * bright from every direction at roughly the same value. Mirror an even grey box
 * and you get an even grey object: the icon came out milky and flat no matter what
 * the material said, which then invited turning metalness DOWN and emissive UP to
 * compensate, which flattens it further. The whole spiral starts with the room.
 *
 * Replaced with a lighting setup: one big bright softbox overhead, a key panel to
 * the left, a saturated cyan rim panel behind-right, a dim warm bounce underneath,
 * and everything else near-black. Reflect THAT and a curved bevel sweeps from a
 * blown highlight where it faces the softbox down to a deep shadow on its flank —
 * which is the entire reason a 26px icon reads as a solid object rather than a
 * sticker. The cyan rim draws the far edge of the silhouette in brand colour, and
 * the warm bounce keeps the undersides from dying to black.
 */
function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const studio = new THREE.Scene();

  // The 'unlit' part of the world, which for a mirror is most of the picture.
  // First pass had this near-black and the icon came out a dark blue lozenge:
  // correct as physics, useless as an icon, because chrome is only as bright as
  // its surroundings and it lives on a DARK nav bar. Lifting the surround to a
  // lit blue-grey is what makes the whole object read bright while the panels
  // below still supply the hot spots that make it read metal.
  studio.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(14, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x2b4c72, side: THREE.BackSide }),
    ),
  );

  // Emissive panels. Colour is deliberately scaled ABOVE 1 — PMREM renders to a
  // half-float target, so values over white survive, and it is that overexposure
  // that produces a highlight with a hot core instead of a flat grey patch.
  const panel = (
    w: number,
    h: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    mat.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    studio.add(mesh);
  };

  panel(10, 6, 0xffffff, 7.0, [0, 6.2, 0.8], [Math.PI / 2, 0, 0]);      // softbox, overhead
  panel(13, 13, 0xcfe4ff, 1.5, [0, 0, 6.6], [0, 0, 0]);                 // broad fill, camera side
  panel(3.4, 9, 0xe8f4ff, 4.2, [-6.2, 1.6, 1.6], [0, Math.PI / 2, 0]);  // key, left
  panel(2.6, 9, 0x5ad8ff, 3.6, [6.2, 0.6, -1.4], [0, -Math.PI / 2, 0]); // rim, right-rear
  panel(10, 5, 0xffb277, 0.85, [0, -6.2, 0], [-Math.PI / 2, 0, 0]);     // bounce, below

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio, 0.02).texture;
  pmrem.dispose();
  return env;
}

function lightScene(scene: THREE.Scene, env: THREE.Texture) {
  scene.environment = env;
  // Full strength now. The old 0.75 was compensating for a room that was making
  // everything grey; with a studio, dimming it only throws away the contrast the
  // studio exists to provide.
  scene.environmentIntensity = 1.35;

  // Direct lights still earn their place: at roughness 0.19 they add a tight
  // specular glint on the bevel edges that the (prefiltered, therefore soft)
  // environment cannot produce.
  const key = new THREE.DirectionalLight(0xfff4e2, 1.6);
  key.position.set(2.6, 3.6, 3.0);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5ad8ff, 1.8);
  rim.position.set(-2.8, -1.6, -1.4);
  scene.add(rim);
}

/** Frame whatever the model builder produced, so every icon comes out the same size. */
function frameCamera(object: THREE.Object3D): THREE.PerspectiveCamera {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const vFov = (camera.fov * Math.PI) / 180;
  // Fit the largest cross-section, then back off by the depth so a tilted model
  // can't poke through the near plane. The 1.08 is breathing room: a bevel that
  // touches the edge of the bitmap looks clipped once it's scaled down.
  const extent = Math.max(size.x, size.y) * 1.02;
  camera.position.set(0, 0, extent / 2 / Math.tan(vFov / 2) + size.z);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return camera;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else {
      mat?.dispose();
    }
  });
}

/** Render every registered icon in one pass, then throw the context away. */
function renderIcons(): Promise<void> {
  if (renderPromise) {
    return renderPromise;
  }
  renderPromise = (async () => {
    if (renderFailed || typeof document === "undefined") {
      return;
    }
    let renderer: THREE.WebGLRenderer | null = null;
    let env: THREE.Texture | null = null;
    try {
      const made = makeRenderer();
      renderer = made.renderer;
      env = makeEnvironment(renderer);

      for (const name of ICON_NAMES) {
        // An artwork icon has no mesh to render and no frame to spend.
        if (IMAGE_ICONS[name]) {
          continue;
        }
        const scene = new THREE.Scene();
        lightScene(scene, env);
        const model = ICON_MODELS[name]();
        scene.add(model);
        const camera = frameCamera(model);
        renderer.render(scene, camera);
        cache[name] = made.canvas.toDataURL("image/png");
        disposeTree(model);
      }
    } catch (err) {
      console.warn("[CT3D] 3D icon render failed — icons fall back to their glyphs", err);
      renderFailed = true;
    } finally {
      // One frame is all they need. Free the context immediately so it can never
      // compete with the builder or the arena for the device's WebGL budget.
      env?.dispose();
      renderer?.dispose();
      (renderer as unknown as { forceContextLoss?: () => void } | null)?.forceContextLoss?.();
    }
  })();
  return renderPromise;
}

/** The cached image for one icon — undefined until the set has rendered. */
export function useIcon3D(name: Icon3DName): string | undefined {
  const image = IMAGE_ICONS[name];
  const [src, setSrc] = useState<string | undefined>(image ?? cache[name]);


  useEffect(() => {
    // A file-backed icon is ready on the first render — no WebGL, no idle wait.
    if (image) {
      setSrc(image);
      return;
    }
    if (cache[name]) {
      setSrc(cache[name]);
      return;
    }
    if (renderFailed) {
      return;
    }
    let cancelled = false;
    const run = () => {
      renderIcons().then(() => {
        if (!cancelled && cache[name]) {
          setSrc(cache[name]);
        }
      });
    };
    // Extruding and rasterising the set is CPU work. Defer it until the app has
    // settled, or it competes with the builder iframe's first circuit load on
    // slower Android devices.
    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(run, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(run, 2500);
    }
    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [image, name]);

  return src;
}

type Icon3DProps = {
  name: Icon3DName;
  className?: string;
  style?: CSSProperties;
  /** Shown until the render lands, and for good if it fails. Keep it a glyph. */
  fallback?: ReactNode;
};

/** A modelled 3D icon. Decorative — label the control it sits in, not this. */
export function Icon3D({ name, className, style, fallback = null }: Icon3DProps) {
  const src = useIcon3D(name);
  if (!src) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      style={style}
      draggable={false}
    />
  );
}
