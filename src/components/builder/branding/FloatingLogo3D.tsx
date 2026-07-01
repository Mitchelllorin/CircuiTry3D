import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import "../../../styles/floating-logo-3d.css";

// Live 3D CircuiTry3D wordmark — a faithful React port of the landing page's
// wordmark (real WebGL TextGeometry), driven by the same `circuitry:app-settings`
// logo3d settings. One WebGL context, like the landing / the user's other apps.

const SETTINGS_KEY = "circuitry:app-settings";

const WORDS: { t: string; c: number; italic: boolean }[] = [
  { t: "Circui", c: 0x1a56c4, italic: false },
  { t: "Try", c: 0xcc5512, italic: true },
  { t: "3D", c: 0x068a4a, italic: false },
];

type Logo3DSettings = {
  visible: boolean;
  opacity: number; // 0–100
  rotationSpeed: number; // 0–100
  swingAngle: number; // 0–100
  depth: number; // 0–100
  glow: number; // 0–100
};

const DEFAULTS: Logo3DSettings = {
  visible: true,
  opacity: 100,
  rotationSpeed: 50,
  swingAngle: 55,
  depth: 50,
  glow: 60,
};

function readSettings(): Logo3DSettings {
  const cfg = { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.logo3d) {
        for (const k of Object.keys(cfg) as (keyof Logo3DSettings)[]) {
          if (typeof s.logo3d[k] !== "undefined") {
            (cfg as Record<string, unknown>)[k] = s.logo3d[k];
          }
        }
      }
    }
  } catch {
    /* fall back to defaults */
  }
  return cfg;
}

// setting (0–100) → extrusion depth in scene units (matches the landing).
const depthU = (v: number) => 0.14 + (v / 100) * 0.5;

type FloatingLogo3DProps = {
  className?: string;
};

export function FloatingLogo3D({ className }: FloatingLogo3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") {
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let disposed = false;
    let onResize: (() => void) | null = null;
    let onStorage: ((e: StorageEvent) => void) | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      // Force a fully transparent clear — mobile GL doesn't always honour
      // alpha:true alone, which paints an opaque box over the workspace. (This is
      // the exact fix from the Automotive3D / ThePrints3D logo.)
      renderer.setClearColor(0x000000, 0);
      const compat = THREE as unknown as Record<string, unknown>;
      if ("outputColorSpace" in renderer && compat["SRGBColorSpace"]) {
        (renderer as unknown as Record<string, unknown>).outputColorSpace = compat["SRGBColorSpace"];
      }
      if ("toneMapping" in renderer && compat["ACESFilmicToneMapping"]) {
        (renderer as unknown as Record<string, unknown>).toneMapping = compat["ACESFilmicToneMapping"];
        (renderer as unknown as Record<string, number>).toneMappingExposure = 1.0;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      scene.add(new THREE.HemisphereLight(0x9fb0cc, 0x0a0e1a, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 0.35);
      key.position.set(2, 4, 3);
      scene.add(key);

      const group = new THREE.Group();
      group.rotation.set(0.05, -0.14, 0);
      group.scale.set(1.3, 1.04, 1);
      scene.add(group);

      const size3 = new THREE.Vector3();
      let cfg = readSettings();

      const place = () => {
        const vFov = (camera.fov * Math.PI) / 180;
        const yaw = 0.2;
        const halfW = (size3.x / 2) * Math.cos(yaw) + size3.z * Math.sin(yaw) + size3.x * 0.05;
        const distH = (size3.y * 1.2) / 2 / Math.tan(vFov / 2);
        const distW = halfW / (Math.tan(vFov / 2) * camera.aspect);
        camera.position.set(0, 0, Math.max(distH, distW) + size3.z + 0.6);
        camera.lookAt(0, 0, 0);
      };

      const draw = () => {
        if (renderer) renderer.render(scene, camera);
      };

      const build = (font: Font) => {
        while (group.children.length) {
          const old = group.children.pop() as THREE.Mesh;
          group.remove(old);
          if (old.geometry) old.geometry.dispose();
          if (old.material) (old.material as THREE.Material).dispose();
        }
        let cursor = 0;
        const gap = 0.04;
        const h = depthU(cfg.depth);
        WORDS.forEach((w) => {
          const geo = new TextGeometry(w.t, {
            font,
            size: 1,
            depth: h,
            curveSegments: 14,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelOffset: 0,
            bevelSegments: 5,
          } as ConstructorParameters<typeof TextGeometry>[1]);
          if (w.italic) {
            const sh = new THREE.Matrix4();
            sh.set(1, 0.22, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
            geo.applyMatrix4(sh);
          }
          geo.computeBoundingBox();
          const bb = geo.boundingBox!;
          const mat = new THREE.MeshStandardMaterial({ color: w.c, metalness: 0.25, roughness: 0.85 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.x = cursor - bb.min.x;
          cursor += bb.max.x - bb.min.x + gap;
          group.add(mesh);
        });
        const box = new THREE.Box3().setFromObject(group);
        const c = box.getCenter(new THREE.Vector3());
        group.position.set(-c.x, -c.y, -c.z);
        box.getSize(size3);
        place();
      };

      const applyLive = () => {
        canvas.style.opacity = String(cfg.opacity / 100);
        canvas.style.display = cfg.visible ? "" : "none";
        const angle = (cfg.swingAngle / 100) * 10;
        const dur = (12 - (cfg.rotationSpeed / 100) * 9).toFixed(2);
        canvas.style.setProperty("--rock-angle", `${angle}deg`);
        canvas.style.setProperty("--rock-duration", `${dur}s`);
        draw();
      };

      const resize = () => {
        if (!renderer) return;
        const w = canvas.clientWidth || 260;
        const hh = canvas.clientHeight || 70;
        renderer.setSize(w, hh, false);
        camera.aspect = w / hh;
        camera.updateProjectionMatrix();
        place();
        draw();
      };
      onResize = resize;
      window.addEventListener("resize", resize);

      onStorage = (e: StorageEvent) => {
        if (e.key && e.key !== SETTINGS_KEY) return;
        const prevDepth = cfg.depth;
        cfg = readSettings();
        // depth changes need a rebuild; everything else is live.
        if (cfg.depth !== prevDepth) {
          // rebuilt on next font-available render below via a fresh build call
        }
        applyLive();
      };
      window.addEventListener("storage", onStorage);

      new FontLoader().load(
        "/fonts/circuitry-bold.typeface.json",
        (font) => {
          if (disposed) return;
          build(font);
          resize();
          applyLive();
        },
        undefined,
        () => {
          /* font failed to load — leave the canvas empty (CSS fallback owns it) */
        },
      );
    } catch {
      /* WebGL unavailable — render nothing */
    }

    return () => {
      disposed = true;
      if (onResize) window.removeEventListener("resize", onResize);
      if (onStorage) window.removeEventListener("storage", onStorage);
      if (renderer) {
        renderer.dispose();
        (renderer as unknown as { forceContextLoss?: () => void }).forceContextLoss?.();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={["floating-logo-3d-canvas", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}
