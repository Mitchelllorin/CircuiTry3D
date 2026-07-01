/**
 * Live 3D CircuiTry3D wordmark — ported from the (phone-proven) Automotive3D /
 * ThePrints3D logo: r3f <Canvas> + drei <Text3D>, with the critical transparent-
 * clear fix so mobile GL never paints an opaque box. "Circui" (blue) · "Try"
 * (orange, italic) · "3D" (green), beveled metal.
 *
 *  - <WorkspaceLogo3D> — drifting watermark clone in the workspace.
 *  - <HeaderLogo3D>    — fixed brand mark for headers (gentle turn only).
 */
import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D } from "@react-three/drei";
import * as THREE from "three";
import "../../../styles/floating-logo-3d.css";

const FONT = "/fonts/circuitry-bold.typeface.json";

const SEGMENTS = [
  { t: "Circui", color: "#1a56c4", italic: false },
  { t: "Try", color: "#cc5512", italic: true },
  { t: "3D", color: "#068a4a", italic: false },
];

// Drift FX for the workspace clone (hardcoded for now; wired to logo3d settings later).
const FX = { speed: 1, bounce: 1 };

function LogoMesh({ bouncing = false }: { bouncing?: boolean }) {
  const rod = useRef<THREE.Group>(null);
  const layout = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useLayoutEffect(() => {
    let x = 0;
    const gap = 0.06;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      if (SEGMENTS[i].italic) {
        m.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0.28, 0, 0, 0));
      }
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!;
      m.position.x = x - bb.min.x;
      x += bb.max.x - bb.min.x + gap;
    });
    if (layout.current) layout.current.position.x = -x / 2;
  }, []);

  useFrame((state) => {
    if (!rod.current) return;
    const t = state.clock.elapsedTime;
    if (bouncing) {
      const { speed, bounce } = FX;
      rod.current.rotation.y = Math.sin(t * 0.5 * speed) * 0.5;
      rod.current.rotation.x = -0.05 + Math.sin(t * 0.32 * speed) * 0.06;
      rod.current.position.x = Math.sin(t * 0.37 * speed) * 1.8 * bounce;
      rod.current.position.y = Math.sin(t * 0.95 * speed + 0.6) * 0.9 * bounce;
    } else {
      rod.current.rotation.y = Math.sin(t * 0.4) * 0.3;
      rod.current.rotation.x = -0.07 + Math.sin(t * 0.26) * 0.025;
    }
  });

  return (
    <group ref={rod}>
      <group ref={layout}>
        {SEGMENTS.map((s, i) => (
          <Text3D
            key={s.t}
            ref={(el) => {
              meshes.current[i] = el as unknown as THREE.Mesh;
            }}
            font={FONT}
            size={1}
            height={0.32}
            bevelEnabled
            bevelSize={0.025}
            bevelThickness={0.05}
            bevelSegments={2}
            curveSegments={4}
          >
            {s.t}
            <meshStandardMaterial
              color={s.color}
              metalness={0.45}
              roughness={0.28}
              emissive={s.color}
              emissiveIntensity={0.16}
            />
          </Text3D>
        ))}
      </group>
    </group>
  );
}

function LogoCanvas({ bouncing, camZ, fov }: { bouncing: boolean; camZ: number; fov: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0, camZ], fov }}
      dpr={1.5}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
      // Force a fully transparent clear — mobile GL doesn't always honour
      // alpha:true alone, which paints an opaque box.
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 5, 6]} intensity={2.6} />
      <directionalLight position={[-5, 1, 3]} intensity={1.1} color="#9ec9ff" />
      <Suspense fallback={null}>
        <LogoMesh bouncing={bouncing} />
      </Suspense>
    </Canvas>
  );
}

/** Drifting watermark clone in the workspace. */
export function WorkspaceLogo3D() {
  return (
    <div className="workspace-logo-3d" aria-hidden="true">
      <LogoCanvas bouncing camZ={12} fov={28} />
    </div>
  );
}

/** Fixed brand mark for headers (gentle turn, no drift). */
export function HeaderLogo3D() {
  return (
    <div className="header-logo-3d" aria-hidden="true">
      <LogoCanvas bouncing={false} camZ={9} fov={26} />
    </div>
  );
}
