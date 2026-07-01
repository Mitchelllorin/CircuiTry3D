import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

// Real 3D CircuiTry3D wordmark — reproduces the landing page's TextGeometry logo,
// but rendered ONCE on a single shared WebGL context and cached as an image. A
// cached <img> costs nothing to display, so the genuine-3D logo can appear
// everywhere (headers, the floating workspace mark, …) for the price of one frame.
// (Same pattern the component thumbnails use to render many 3D parts cheaply.)

const WORDS: { t: string; c: number; italic: boolean }[] = [
  { t: "Circui", c: 0x1a56c4, italic: false }, // deep electric blue
  { t: "Try", c: 0xcc5512, italic: true }, //    rich burnt orange
  { t: "3D", c: 0x068a4a, italic: false }, //    deep emerald
];

// High-res so it stays crisp when scaled down into small headers.
const CANVAS_W = 1024;
const CANVAS_H = 248;
const EXTRUDE_DEPTH = 0.39; // matches the landing default (depth 50 → 0.14 + .25)

let fontPromise: Promise<Font> | null = null;
let sharedRenderer: { canvas: HTMLCanvasElement; renderer: THREE.WebGLRenderer } | null = null;
let cachedDataUrl: string | null = null;
let renderFailed = false;

function loadFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = new Promise<Font>((resolve, reject) => {
      new FontLoader().load("/fonts/circuitry-bold.typeface.json", resolve, undefined, reject);
    });
  }
  return fontPromise;
}

function getRenderer() {
  if (sharedRenderer) {
    return sharedRenderer;
  }
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
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
    (renderer as unknown as Record<string, number>).toneMappingExposure = 1.0;
  }
  renderer.setSize(CANVAS_W, CANVAS_H, false);
  renderer.setPixelRatio(1);
  sharedRenderer = { canvas, renderer };
  return sharedRenderer;
}

function buildWordmark(font: Font): THREE.Group {
  const group = new THREE.Group();
  let cursor = 0;
  const gap = 0.04;
  WORDS.forEach((w) => {
    const geo = new TextGeometry(w.t, {
      font,
      size: 1,
      depth: EXTRUDE_DEPTH,
      curveSegments: 14,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 5,
    } as ConstructorParameters<typeof TextGeometry>[1]);
    if (w.italic) {
      const shear = new THREE.Matrix4();
      shear.set(1, 0.22, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      geo.applyMatrix4(shear);
    }
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const material = new THREE.MeshStandardMaterial({
      color: w.c,
      metalness: 0.25,
      roughness: 0.85,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.x = cursor - bb.min.x;
    cursor += bb.max.x - bb.min.x + gap;
    group.add(mesh);
  });
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.set(-center.x, -center.y, -center.z);
  return group;
}

async function renderLogo(): Promise<string> {
  if (cachedDataUrl) {
    return cachedDataUrl;
  }
  if (renderFailed || typeof document === "undefined") {
    return "";
  }
  try {
    const font = await loadFont();
    const { canvas, renderer } = getRenderer();

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0x9fb0cc, 0x0a0e1a, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.35);
    key.position.set(2, 4, 3);
    scene.add(key);

    const pivot = new THREE.Group();
    pivot.add(buildWordmark(font));
    pivot.rotation.set(0.05, -0.14, 0); // static 3/4 tilt so the extrusion reads
    pivot.scale.set(1.3, 1.04, 1);
    scene.add(pivot);

    const size = new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(32, CANVAS_W / CANVAS_H, 0.1, 100);
    const vFov = (camera.fov * Math.PI) / 180;
    const yaw = 0.2;
    const halfW = (size.x / 2) * Math.cos(yaw) + size.z * Math.sin(yaw) + size.x * 0.05;
    const distH = (size.y * 1.2) / 2 / Math.tan(vFov / 2);
    const distW = halfW / (Math.tan(vFov / 2) * camera.aspect);
    camera.position.set(0, 0, Math.max(distH, distW) + size.z + 0.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    cachedDataUrl = canvas.toDataURL("image/png");

    pivot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    });

    // The logo renders exactly once — free the WebGL context immediately so it
    // can never compete with the builder/arena contexts (scarce on mobile). The
    // cached image stays; every future WordMark just uses it.
    renderer.dispose();
    (renderer as unknown as { forceContextLoss?: () => void }).forceContextLoss?.();
    sharedRenderer = null;
    return cachedDataUrl;
  } catch (err) {
    console.warn("[CT3D] 3D logo render failed — branding falls back to none", err);
    renderFailed = true;
    return "";
  }
}

/** Returns the cached data URL of the rendered 3D wordmark (undefined until ready). */
export function useLogo3D(): string | undefined {
  const [src, setSrc] = useState<string | undefined>(cachedDataUrl ?? undefined);
  useEffect(() => {
    if (cachedDataUrl) {
      setSrc(cachedDataUrl);
      return;
    }
    let cancelled = false;
    const run = () => {
      renderLogo().then((url) => {
        if (!cancelled && url) {
          setSrc(url);
        }
      });
    };
    // Defer the CPU-heavy render (TextGeometry extrude + toDataURL) until the app
    // has settled — otherwise it stalls the builder iframe's init / first circuit
    // load on slower devices (Android).
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
  }, []);
  return src;
}


type Logo3DProps = {
  className?: string;
  style?: CSSProperties;
};

/** The real 3D CircuiTry3D wordmark as an image — drop it anywhere branding goes. */
export function Logo3D({ className, style }: Logo3DProps) {
  const src = useLogo3D();
  if (!src) {
    return null;
  }
  return (
    <img
      src={src}
      alt="CircuiTry3D"
      className={className}
      style={style}
      draggable={false}
    />
  );
}
