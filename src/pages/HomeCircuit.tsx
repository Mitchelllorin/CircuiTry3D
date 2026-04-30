import { useEffect, useRef, useState } from 'react';

const BTN_STYLE: React.CSSProperties = {
  background: 'rgba(10,20,40,0.85)',
  border: '1px solid rgba(136,204,255,0.35)',
  color: '#88ccff',
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

export default function HomeCircuit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const handleResizeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<any>(null);

  // Live refs read by animation loop — avoids stale closure
  const lightOnRef = useRef(false);
  const overloadingRef = useRef(false);

  // Three.js object refs updated during scene construction
  const pointLightRef = useRef<any>(null);
  const lightSphereMatRef = useRef<any>(null);
  const switchLeverRef = useRef<any>(null);
  const hotWireMatRef = useRef<any>(null);
  const neutralWireMatRef = useRef<any>(null);
  const particlePositionsRef = useRef<Float32Array | null>(null);
  const particleGeoRef = useRef<any>(null);
  const particleOffsetsRef = useRef<Float32Array | null>(null);
  const overloadLightRef = useRef<any>(null);
  const overloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wire curve for particle travel
  const wireCurveRef = useRef<any>(null);

  const [lightOn, setLightOn] = useState(false);
  const [overloading, setOverloading] = useState(false);

  // Keep live refs in sync with state
  useEffect(() => { lightOnRef.current = lightOn; }, [lightOn]);
  useEffect(() => { overloadingRef.current = overloading; }, [overloading]);

  // Overload demo handler
  const handleOverload = () => {
    if (overloadingRef.current) return;
    setOverloading(true);
    // The scene effect detects overloadingRef and adds the red light;
    // we store the light on a ref for removal
    overloadTimerRef.current = setTimeout(() => {
      overloadTimerRef.current = null;
      if (overloadLightRef.current && sceneRef.current) {
        sceneRef.current.remove(overloadLightRef.current);
        overloadLightRef.current = null;
      }
      setOverloading(false);
    }, 2000);
  };

  // Clean up overload timer on unmount
  useEffect(() => () => {
    if (overloadTimerRef.current) {
      clearTimeout(overloadTimerRef.current);
      overloadTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let isMounted = true;
    const canvas = canvasRef.current;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (!isMounted || !canvas) return;

      // Initialize particle offsets (evenly spaced around the wire curve)
      particleOffsetsRef.current = new Float32Array(20).map((_, i) => i / 20);

      const width = canvas.clientWidth || canvas.offsetWidth || 400;
      const height = canvas.clientHeight || canvas.offsetHeight || 400;

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07071a);
      scene.fog = new THREE.Fog(0x07071a, 10, 30);
      sceneRef.current = scene;

      // ── Camera ─────────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(7, 9, 7);
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
      controls.minDistance = 3;
      controls.maxDistance = 25;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controlsRef.current = controls;

      // ── Lights ─────────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x88ccff, 0.35));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 8, 3);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // ── Room ───────────────────────────────────────────────────────────────
      const mkBox = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, opts?: any) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color, ...opts });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
        return mesh;
      };

      mkBox(8, 0.1, 8, 0x1a1a2e, 0, 0, 0);                           // floor
      mkBox(0.1, 3, 8, 0x16213e, -4, 1.5, 0);                         // left wall
      mkBox(0.1, 3, 8, 0x16213e, 4, 1.5, 0);                          // right wall
      mkBox(8, 3, 0.1, 0x16213e, 0, 1.5, -4);                         // back wall
      mkBox(8, 0.1, 8, 0x0f0f1a, 0, 3, 0, { transparent: true, opacity: 0.6 }); // ceiling

      const grid = new THREE.GridHelper(8, 8, 0x223355, 0x112244);
      grid.position.y = 0.06;
      scene.add(grid);

      // ── Breaker panel (left wall) ──────────────────────────────────────────
      mkBox(0.1, 1.2, 0.8, 0x334455, -3.9, 1.2, -1);
      mkBox(0.08, 1.0, 0.6, 0x2244aa, -3.84, 1.2, -1);
      const breakerColors = [0x556677, 0x4488aa, 0x556677, 0x4488aa, 0x556677];
      breakerColors.forEach((c, i) => mkBox(0.06, 0.08, 0.45, c, -3.78, 0.75 + i * 0.18, -1));

      // ── Ceiling light fixture ──────────────────────────────────────────────
      const fixtureCylGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
      const fixtureCylMat = new THREE.MeshStandardMaterial({ color: 0x888899 });
      const fixtureCyl = new THREE.Mesh(fixtureCylGeo, fixtureCylMat);
      fixtureCyl.position.set(0, 2.95, 0);
      scene.add(fixtureCyl);

      const pointLight = new THREE.PointLight(0xffffcc, 0, 8);
      pointLight.position.set(0, 2.7, 0);
      pointLight.castShadow = true;
      scene.add(pointLight);
      pointLightRef.current = pointLight;

      const sphereGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xffffaa,
        emissive: new THREE.Color(0x222222),
        emissiveIntensity: 1,
      });
      const lightSphere = new THREE.Mesh(sphereGeo, sphereMat);
      lightSphere.position.set(0, 2.95, 0);
      scene.add(lightSphere);
      lightSphereMatRef.current = sphereMat;

      // ── Light switch (back wall) ───────────────────────────────────────────
      mkBox(0.05, 0.2, 0.12, 0x445566, -2, 1.2, -3.9);
      const leverGeo = new THREE.BoxGeometry(0.06, 0.1, 0.04);
      const leverMat = new THREE.MeshStandardMaterial({ color: 0x88aacc });
      const lever = new THREE.Mesh(leverGeo, leverMat);
      lever.position.set(-2, 1.2, -3.87);
      scene.add(lever);
      switchLeverRef.current = lever;

      // ── Wall outlets (right wall) ──────────────────────────────────────────
      [-1, 1].forEach((z) => {
        mkBox(0.05, 0.12, 0.1, 0x334455, 3.9, 0.5, z);
        const torusGeo = new THREE.TorusGeometry(0.025, 0.008, 6, 12);
        const torusMat = new THREE.MeshStandardMaterial({ color: 0x223344 });
        [-0.025, 0.025].forEach((dx) => {
          const t = new THREE.Mesh(torusGeo, torusMat);
          t.position.set(3.87, 0.5 + dx, z);
          t.rotation.y = Math.PI / 2;
          scene.add(t);
        });
      });

      // ── Wire paths ─────────────────────────────────────────────────────────
      // Hot wire: panel → up left wall → across ceiling → down to fixture
      const hotPoints = [
        new THREE.Vector3(-3.85, 1.2, -1),
        new THREE.Vector3(-3.85, 2.8, -1),
        new THREE.Vector3(-3.85, 2.88, -1),
        new THREE.Vector3(-2, 2.88, -1),
        new THREE.Vector3(0, 2.88, 0),
        new THREE.Vector3(0, 2.88, 0),
        new THREE.Vector3(0, 2.75, 0),
      ];
      const hotCurve = new THREE.CatmullRomCurve3(hotPoints);
      wireCurveRef.current = hotCurve;

      const neutralPoints = hotPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z + 0.04));
      const neutralCurve = new THREE.CatmullRomCurve3(neutralPoints);

      const mkWire = (curve: any, color: number) => {
        const geo = new THREE.TubeGeometry(curve, 20, 0.02, 6, false);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(0x002244),
          emissiveIntensity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        return mat;
      };

      hotWireMatRef.current = mkWire(hotCurve, 0x4488ff);
      neutralWireMatRef.current = mkWire(neutralCurve, 0x556677);

      // ── Current-flow particles ─────────────────────────────────────────────
      const particleCount = 20;
      const positions = new Float32Array(particleCount * 3);
      particlePositionsRef.current = positions;

      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeoRef.current = particleGeo;

      const particleMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.06, sizeAttenuation: true });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // ── Animation loop ─────────────────────────────────────────────────────
      let lastTime = -1;
      const animate = (now: number) => {
        if (!isMounted) return;
        animationIdRef.current = requestAnimationFrame(animate);
        if (lastTime < 0) { lastTime = now; return; }
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (controlsRef.current) controlsRef.current.update();

        const on = lightOnRef.current;

        // Switch lever rotation
        if (switchLeverRef.current) {
          const targetRot = on ? -0.4 : 0.4;
          switchLeverRef.current.rotation.x += (targetRot - switchLeverRef.current.rotation.x) * 0.15;
        }

        // Point light intensity lerp
        if (pointLightRef.current) {
          const target = on ? 2.0 : 0;
          pointLightRef.current.intensity += (target - pointLightRef.current.intensity) * 0.1;
        }

        // Sphere emissive
        if (lightSphereMatRef.current) {
          const targetEmissive = on ? 0xffffaa : 0x222222;
          lightSphereMatRef.current.emissive.set(targetEmissive);
        }

        // Wire emissive
        if (hotWireMatRef.current) hotWireMatRef.current.emissive.set(on ? 0x0066cc : 0x002244);
        if (neutralWireMatRef.current) neutralWireMatRef.current.emissive.set(on ? 0x224455 : 0x001122);

        // Overload red light — spawn when overloading just turned on
        if (overloadingRef.current && !overloadLightRef.current && sceneRef.current) {
          const redLight = new THREE.PointLight(0xff2200, 3, 4);
          redLight.position.set(-3.85, 1.2, -1);
          sceneRef.current.add(redLight);
          overloadLightRef.current = redLight;
        }

        // Particle travel
        if (particlePositionsRef.current && wireCurveRef.current && particleGeoRef.current) {
          const offsets = particleOffsetsRef.current;
          const pos = particlePositionsRef.current;
          for (let i = 0; i < particleCount; i++) {
            if (on) {
              offsets[i] = (offsets[i] + dt * 0.18) % 1.0;
            }
            const pt = wireCurveRef.current.getPoint(offsets[i]);
            pos[i * 3] = pt.x;
            pos[i * 3 + 1] = pt.y;
            pos[i * 3 + 2] = pt.z;
          }
          particleGeoRef.current.attributes.position.needsUpdate = true;
        }

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
  const voltage = 120;
  const current = lightOn ? 0.83 : 0;
  const power = lightOn ? 100 : 0;

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
        color: '#88ccff', fontSize: '0.78rem', lineHeight: 1.6,
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🏠 Home Circuit</div>
        <div>Voltage: <span style={{ color: '#fff' }}>{voltage} V AC</span></div>
        <div>Current: <span style={{ color: '#fff' }}>{current.toFixed(2)} A</span></div>
        <div>Power:   <span style={{ color: '#fff' }}>{power} W</span></div>
        {overloading && <div style={{ color: '#ff4444', marginTop: 4 }}>⚠ Overload!</div>}
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
        display: 'flex', gap: 10,
      }}>
        <button style={BTN_STYLE} onClick={() => setLightOn((v) => !v)}>
          {lightOn ? '💡 Light ON' : '🔦 Toggle Light'}
        </button>
        <button
          style={{ ...BTN_STYLE, ...(overloading ? { color: '#ff6666', borderColor: 'rgba(255,80,80,0.5)' } : {}) }}
          onClick={handleOverload}
          disabled={overloading}
        >
          {overloading ? '🔥 Tripping…' : '⚡ Overload Demo'}
        </button>
      </div>
    </div>
  );
}
