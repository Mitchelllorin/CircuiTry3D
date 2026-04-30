import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';

const BTN_STYLE: React.CSSProperties = {
  background: 'rgba(10,20,40,0.85)',
  border: '1px solid rgba(136,204,255,0.35)',
  color: '#88ccff',
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

export default function CarCircuit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const handleResizeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);

  // Live refs — animation loop reads these, no stale closures
  const headlightsOnRef = useRef(false);
  const ignitionOnRef = useRef(false);
  const hornActiveRef = useRef(false);
  const fuseBlownRef = useRef(false);

  // Three.js object refs
  const headlightLMatRef = useRef<any>(null);
  const headlightRMatRef = useRef<any>(null);
  const headlightLLightRef = useRef<any>(null);
  const headlightRLightRef = useRef<any>(null);
  const ignitionMatRef = useRef<any>(null);
  const hornMatRef = useRef<any>(null);
  const fuseBoxMatRef = useRef<any>(null);
  const interiorLightRef = useRef<any>(null);
  const hotWireL_MatRef = useRef<any>(null);
  const hotWireR_MatRef = useRef<any>(null);
  const chargingWireMatRef = useRef<any>(null);
  // Particle data per wire [L headlight, R headlight, charging]
  const particleSetsRef = useRef<Array<{
    offsets: Float32Array;
    positions: Float32Array;
    geo: any;
    curve: any;
  }>>([]);

  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [ignitionOn, setIgnitionOn] = useState(false);
  const [hornActive, setHornActive] = useState(false);
  const [fuseBlown, setFuseBlown] = useState(false);
  const hornTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync live refs
  useEffect(() => { headlightsOnRef.current = headlightsOn; }, [headlightsOn]);
  useEffect(() => { ignitionOnRef.current = ignitionOn; }, [ignitionOn]);
  useEffect(() => { hornActiveRef.current = hornActive; }, [hornActive]);
  useEffect(() => { fuseBlownRef.current = fuseBlown; }, [fuseBlown]);

  const handleHorn = () => {
    if (hornTimerRef.current) return;
    setHornActive(true);
    hornTimerRef.current = setTimeout(() => {
      setHornActive(false);
      hornTimerRef.current = null;
    }, 500);
  };

  // Clean up horn timer on unmount
  useEffect(() => () => {
    if (hornTimerRef.current) {
      clearTimeout(hornTimerRef.current);
      hornTimerRef.current = null;
    }
  }, []);

  const handleFuseToggle = () => {
    setFuseBlown((v) => {
      const next = !v;
      if (next) setHeadlightsOn(false);
      return next;
    });
  };

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let isMounted = true;
    const canvas = canvasRef.current;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (!isMounted || !canvas) return;

      const width = canvas.clientWidth || canvas.offsetWidth || 400;
      const height = canvas.clientHeight || canvas.offsetHeight || 400;

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07071a);
      scene.fog = new THREE.Fog(0x07071a, 15, 35);
      sceneRef.current = scene;

      // ── Camera ─────────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 12, 10);
      camera.lookAt(0, 0, 0);

      // ── Renderer ───────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      rendererRef.current = renderer;

      // ── Orbit Controls ─────────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 4;
      controls.maxDistance = 30;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controlsRef.current = controls;

      // ── Lights ─────────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xff9966, 0.2));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(5, 10, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // ── Helpers ────────────────────────────────────────────────────────────
      const mkBox = (
        w: number, h: number, d: number,
        color: number,
        x: number, y: number, z: number,
        opts?: any
      ) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color, ...opts });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
        return { mesh, mat };
      };

      // ── Car chassis ────────────────────────────────────────────────────────
      mkBox(3, 0.2, 6, 0x1a2035, 0, 0, 0);
      mkBox(3, 0.25, 2, 0x0d1520, 0, 0.05, -2);
      mkBox(2.8, 0.6, 2.5, 0x141828, 0, 0.35, 0.2, { transparent: true, opacity: 0.7 });
      mkBox(3, 0.7, 0.1, 0x334466, 0, 0.3, -1);
      mkBox(2.8, 0.15, 0.4, 0x2a3550, 0, 0.6, -0.8);

      // Wheel arches
      const archPositions: [number, number, number][] = [
        [-1.6, 0.05, -2], [1.6, 0.05, -2],
        [-1.6, 0.05, 2],  [1.6, 0.05, 2],
      ];
      archPositions.forEach(([x, y, z]) => {
        const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x111122 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);
      });

      // ── Battery ────────────────────────────────────────────────────────────
      mkBox(0.6, 0.4, 0.8, 0x223344, -1, 0.3, -2.5);
      mkBox(0.1, 0.08, 0.08, 0xcc2222, -1.2, 0.52, -2.5); // + terminal
      mkBox(0.1, 0.08, 0.08, 0x111111, -0.8, 0.52, -2.5); // - terminal

      // ── Alternator ─────────────────────────────────────────────────────────
      mkBox(0.5, 0.4, 0.5, 0x334422, 0.8, 0.3, -2.5);

      // ── Fuse box ───────────────────────────────────────────────────────────
      const { mat: fuseBoxMat } = mkBox(0.5, 0.15, 0.4, 0x443322, 0, 0.2, -1.8);
      fuseBoxMatRef.current = fuseBoxMat;

      // ── Headlights ─────────────────────────────────────────────────────────
      const { mat: hlLMat } = mkBox(0.3, 0.15, 0.1, 0x223344, -1.4, 0.2, -3.2, {
        emissive: new THREE.Color(0x111111), emissiveIntensity: 1,
      });
      headlightLMatRef.current = hlLMat;

      const { mat: hlRMat } = mkBox(0.3, 0.15, 0.1, 0x223344, 1.4, 0.2, -3.2, {
        emissive: new THREE.Color(0x111111), emissiveIntensity: 1,
      });
      headlightRMatRef.current = hlRMat;

      const hlLLight = new THREE.PointLight(0xffffff, 0, 6);
      hlLLight.position.set(-1.4, 0.3, -3.2);
      scene.add(hlLLight);
      headlightLLightRef.current = hlLLight;

      const hlRLight = new THREE.PointLight(0xffffff, 0, 6);
      hlRLight.position.set(1.4, 0.3, -3.2);
      scene.add(hlRLight);
      headlightRLightRef.current = hlRLight;

      // ── Starter ────────────────────────────────────────────────────────────
      mkBox(0.4, 0.3, 0.4, 0x332211, 0, 0.2, -2.8);

      // ── Horn ───────────────────────────────────────────────────────────────
      const { mat: hornMat } = mkBox(0.2, 0.1, 0.2, 0x443311, 0, 0.2, -3.1, {
        emissive: new THREE.Color(0x111111), emissiveIntensity: 1,
      });
      hornMatRef.current = hornMat;

      // ── Ignition switch ────────────────────────────────────────────────────
      const { mat: ignMat } = mkBox(0.12, 0.12, 0.12, 0x223344, 0, 0.65, -0.85, {
        emissive: new THREE.Color(0x222222), emissiveIntensity: 1,
      });
      ignitionMatRef.current = ignMat;

      // ── Interior light ─────────────────────────────────────────────────────
      mkBox(0.3, 0.05, 0.2, 0x444455, 0, 0.95, 0.2);
      const interiorPt = new THREE.PointLight(0xfff8e0, 0, 3);
      interiorPt.position.set(0, 0.9, 0.2);
      scene.add(interiorPt);
      interiorLightRef.current = interiorPt;

      // ── Wire paths ─────────────────────────────────────────────────────────
      const mkWire = (points: THREE.Vector3[], color: number) => {
        const curve = new THREE.CatmullRomCurve3(points);
        const geo = new THREE.TubeGeometry(curve, 20, 0.015, 6, false);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(0x110000),
          emissiveIntensity: 1,
        });
        scene.add(new THREE.Mesh(geo, mat));
        return { curve, mat };
      };

      // Battery → fuse box
      mkWire([
        new THREE.Vector3(-1, 0.52, -2.5),
        new THREE.Vector3(-0.5, 0.28, -2.2),
        new THREE.Vector3(0, 0.28, -1.8),
      ], 0xff3333);

      // Fuse box → headlight L
      const { curve: wCurveL, mat: wMatL } = mkWire([
        new THREE.Vector3(0, 0.28, -1.8),
        new THREE.Vector3(-0.7, 0.28, -2.5),
        new THREE.Vector3(-1.4, 0.28, -3.0),
        new THREE.Vector3(-1.4, 0.28, -3.2),
      ], 0xff3333);
      hotWireL_MatRef.current = wMatL;

      // Fuse box → headlight R
      const { curve: wCurveR, mat: wMatR } = mkWire([
        new THREE.Vector3(0, 0.28, -1.8),
        new THREE.Vector3(0.7, 0.28, -2.5),
        new THREE.Vector3(1.4, 0.28, -3.0),
        new THREE.Vector3(1.4, 0.28, -3.2),
      ], 0xff3333);
      hotWireR_MatRef.current = wMatR;

      // Alternator → battery charging
      const { curve: chargeCurve, mat: chargeMat } = mkWire([
        new THREE.Vector3(0.8, 0.52, -2.5),
        new THREE.Vector3(-0.1, 0.52, -2.5),
        new THREE.Vector3(-1, 0.52, -2.5),
      ], 0xffaa00);
      chargingWireMatRef.current = chargeMat;

      // Ground lines (static, dim)
      mkWire([
        new THREE.Vector3(-1, 0.1, -2.5),
        new THREE.Vector3(-1, 0.02, -2.5),
        new THREE.Vector3(0, 0.02, 0),
      ], 0x333333);

      // ── Current-flow particles ─────────────────────────────────────────────
      const mkParticleSet = (curve: any, count: number) => {
        const offsets = new Float32Array(count).fill(0).map((_, i) => i / count);
        const positions = new Float32Array(count * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.05, sizeAttenuation: true });
        scene.add(new THREE.Points(geo, mat));
        return { offsets, positions, geo, curve };
      };

      particleSetsRef.current = [
        mkParticleSet(wCurveL, 8),
        mkParticleSet(wCurveR, 8),
        mkParticleSet(chargeCurve, 6),
      ];

      // ── Animation loop ─────────────────────────────────────────────────────
      let lastTime = -1;
      const animate = (now: number) => {
        if (!isMounted) return;
        animationIdRef.current = requestAnimationFrame(animate);
        if (lastTime < 0) { lastTime = now; return; }
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (controlsRef.current) controlsRef.current.update();

        const hl = headlightsOnRef.current && !fuseBlownRef.current;
        const ign = ignitionOnRef.current;
        const horn = hornActiveRef.current;
        const fuse = fuseBlownRef.current;

        // Headlight emissive + point lights
        if (headlightLMatRef.current) headlightLMatRef.current.emissive.set(hl ? 0xffffaa : 0x111111);
        if (headlightRMatRef.current) headlightRMatRef.current.emissive.set(hl ? 0xffffaa : 0x111111);
        if (headlightLLightRef.current) {
          const t = hl ? 1.5 : 0;
          headlightLLightRef.current.intensity += (t - headlightLLightRef.current.intensity) * 0.12;
        }
        if (headlightRLightRef.current) {
          const t = hl ? 1.5 : 0;
          headlightRLightRef.current.intensity += (t - headlightRLightRef.current.intensity) * 0.12;
        }

        // Ignition emissive
        if (ignitionMatRef.current) ignitionMatRef.current.emissive.set(ign ? 0x00ff66 : 0x222222);

        // Horn emissive
        if (hornMatRef.current) hornMatRef.current.emissive.set(horn ? 0xff6600 : 0x111111);

        // Fuse box emissive
        if (fuseBoxMatRef.current) fuseBoxMatRef.current.emissive.set(fuse ? 0xff2200 : 0x000000);

        // Interior light
        if (interiorLightRef.current) {
          const t = ign ? 0.8 : 0;
          interiorLightRef.current.intensity += (t - interiorLightRef.current.intensity) * 0.1;
        }

        // Wire emissive
        if (hotWireL_MatRef.current) hotWireL_MatRef.current.emissive.set(hl ? 0x661100 : 0x110000);
        if (hotWireR_MatRef.current) hotWireR_MatRef.current.emissive.set(hl ? 0x661100 : 0x110000);
        if (chargingWireMatRef.current) chargingWireMatRef.current.emissive.set(ign ? 0x664400 : 0x110000);

        // Particles
        const particleActive = [hl, hl, ign];
        particleSetsRef.current.forEach(({ offsets, positions, geo, curve }, idx) => {
          const active = particleActive[idx];
          const count = offsets.length;
          for (let i = 0; i < count; i++) {
            if (active) offsets[i] = (offsets[i] + dt * 0.2) % 1.0;
            const pt = curve.getPoint(offsets[i]);
            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;
          }
          geo.attributes.position.needsUpdate = true;
        });

        renderer.render(scene, camera);
      };
      animationIdRef.current = requestAnimationFrame(animate);

      // ── Resize ─────────────────────────────────────────────────────────────
      const handleResize = () => {
        if (!isMounted || !canvas) return;
        const w = canvas.clientWidth || canvas.offsetWidth || 400;
        const h = canvas.clientHeight || canvas.offsetHeight || 400;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      };
      handleResizeRef.current = handleResize;
      window.addEventListener('resize', handleResize);
      timeoutRef.current = setTimeout(() => { if (isMounted) handleResize(); }, 100);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(() => { if (isMounted) handleResize(); });
        resizeObserverRef.current.observe(canvas);
      }
    }).catch((err) => console.error('Three.js load error:', err));

    return () => {
      isMounted = false;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (handleResizeRef.current) { window.removeEventListener('resize', handleResizeRef.current); handleResizeRef.current = null; }
      if (resizeObserverRef.current) { resizeObserverRef.current.disconnect(); resizeObserverRef.current = null; }
      if (animationIdRef.current !== null) { cancelAnimationFrame(animationIdRef.current); animationIdRef.current = null; }
      if (controlsRef.current) { controlsRef.current.dispose(); controlsRef.current = null; }
      if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
      if (sceneRef.current) {
        sceneRef.current.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
            else obj.material.dispose();
          }
        });
        sceneRef.current = null;
      }
    };
  }, []);

  // Derived display values
  const batteryVoltage = ignitionOn ? 13.8 : 12.6;
  const hlCurrent = (headlightsOn && !fuseBlown) ? 8 : 0;
  const hornCurrent = hornActive ? 3 : 0;
  const interiorCurrent = ignitionOn ? 1 : 0;
  const totalCurrent = hlCurrent + hornCurrent + interiorCurrent;
  const activeCircuits = [
    headlightsOn && !fuseBlown && 'Headlights (8A)',
    hornActive && 'Horn (3A)',
    ignitionOn && 'Interior (1A)',
    fuseBlown && '⚠ Fuse blown',
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', background: '#07071a' }}>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, minHeight: 0, display: 'block', width: '100%' }}
      />

      {/* Info overlay — top-left */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(7,7,26,0.82)',
        border: '1px solid rgba(136,204,255,0.25)',
        borderRadius: 8, padding: '8px 12px',
        color: '#88ccff', fontSize: '0.78rem', lineHeight: 1.7,
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>🚗 Car Circuit</div>
        <div>Battery: <span style={{ color: '#fff' }}>{batteryVoltage} V</span></div>
        <div>Total draw: <span style={{ color: '#fff' }}>{totalCurrent} A</span></div>
        {activeCircuits.length > 0 && (
          <div style={{ marginTop: 4, color: fuseBlown ? '#ff6666' : '#88ccff' }}>
            {activeCircuits.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        )}
      </div>

      {/* Orbit hint — top-right */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(7,7,26,0.7)',
        border: '1px solid rgba(136,204,255,0.18)',
        borderRadius: 8, padding: '6px 10px',
        color: 'rgba(136,204,255,0.7)', fontSize: '0.7rem', lineHeight: 1.5,
        pointerEvents: 'none',
      }}>
        <div>🖱 Drag to orbit</div>
        <div>🔍 Scroll to zoom</div>
        <div>⇧ Right-drag to pan</div>
      </div>

      {/* Controls overlay — bottom */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <button
          style={{ ...BTN_STYLE, ...(headlightsOn && !fuseBlown ? { borderColor: 'rgba(255,255,150,0.6)', color: '#ffffaa' } : {}) }}
          onClick={() => { if (!fuseBlown) setHeadlightsOn((v) => !v); }}
        >
          💡 Headlights
        </button>
        <button
          style={{ ...BTN_STYLE, ...(ignitionOn ? { borderColor: 'rgba(0,255,100,0.5)', color: '#88ffaa' } : {}) }}
          onClick={() => setIgnitionOn((v) => !v)}
        >
          🔑 Ignition
        </button>
        <button style={BTN_STYLE} onClick={handleHorn}>
          {hornActive ? '📯 BEEP!' : '📯 Horn'}
        </button>
        <button
          style={{ ...BTN_STYLE, ...(fuseBlown ? { borderColor: 'rgba(255,80,80,0.5)', color: '#ff8888' } : {}) }}
          onClick={handleFuseToggle}
        >
          {fuseBlown ? '🔧 Fix Fuse' : '⚡ Blow Fuse'}
        </button>
      </div>
    </div>
  );
}
