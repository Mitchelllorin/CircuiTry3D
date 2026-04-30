import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';

const BTN: React.CSSProperties = {
  background: 'rgba(10,20,40,0.88)',
  border: '1px solid rgba(136,204,255,0.35)',
  color: '#88ccff',
  borderRadius: '8px',
  padding: '7px 14px',
  cursor: 'pointer',
  fontSize: '0.82rem',
};
const BTN_ADD: React.CSSProperties = {
  ...BTN,
  borderColor: 'rgba(100,255,150,0.35)',
  color: '#88ffaa',
};

export default function HomeCircuit() {
  // ── Core rendering refs ──────────────────────────────────────────────────
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rendererRef   = useRef<any>(null);
  const sceneRef      = useRef<any>(null);
  const animIdRef     = useRef<number | null>(null);
  const roRef         = useRef<ResizeObserver | null>(null);
  const resizeFnRef   = useRef<(() => void) | null>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef   = useRef<OrbitControlsType | null>(null);

  // ── Live state refs (read inside animation loop) ─────────────────────────
  const lightOnRef    = useRef(false);
  const overloadRef   = useRef(false);
  const fanAddedRef   = useRef(false);
  const lampAddedRef  = useRef(false);
  const tvAddedRef    = useRef(false);

  // ── Three.js object refs ─────────────────────────────────────────────────
  const ceilingLightRef   = useRef<any>(null);
  const bulbMatRef        = useRef<any>(null);
  const switchLeverRef    = useRef<any>(null);
  const hotWireMatRef     = useRef<any>(null);
  const neutralWireMatRef = useRef<any>(null);
  const pPosRef           = useRef<Float32Array | null>(null);
  const pGeoRef           = useRef<any>(null);
  const pOffsRef          = useRef<Float32Array | null>(null);
  const overloadLightRef  = useRef<any>(null);
  const overloadTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wireCurveRef      = useRef<any>(null);
  const bgColorRef        = useRef<any>(null);

  // add-on component refs
  const fanGroupRef       = useRef<any>(null);
  const fanBladesRef      = useRef<any>(null);
  const lampGroupRef      = useRef<any>(null);
  const lampLightRef      = useRef<any>(null);
  const lampShadeMatRef   = useRef<any>(null);
  const tvGroupRef        = useRef<any>(null);
  const tvScreenMatRef    = useRef<any>(null);

  // ── React state ──────────────────────────────────────────────────────────
  const [lightOn,   setLightOn]   = useState(false);
  const [overload,  setOverload]  = useState(false);
  const [fanAdded,  setFanAdded]  = useState(false);
  const [lampAdded, setLampAdded] = useState(false);
  const [tvAdded,   setTvAdded]   = useState(false);

  useEffect(() => { lightOnRef.current   = lightOn;   }, [lightOn]);
  useEffect(() => { overloadRef.current  = overload;  }, [overload]);
  useEffect(() => { fanAddedRef.current  = fanAdded;  }, [fanAdded]);
  useEffect(() => { lampAddedRef.current = lampAdded; }, [lampAdded]);
  useEffect(() => { tvAddedRef.current   = tvAdded;   }, [tvAdded]);

  const handleOverload = () => {
    if (overloadRef.current) return;
    setOverload(true);
    overloadTimerRef.current = setTimeout(() => {
      overloadTimerRef.current = null;
      if (overloadLightRef.current && sceneRef.current) {
        sceneRef.current.remove(overloadLightRef.current);
        overloadLightRef.current = null;
      }
      setOverload(false);
    }, 2200);
  };
  useEffect(() => () => {
    if (overloadTimerRef.current) clearTimeout(overloadTimerRef.current);
  }, []);

  // ── Scene setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let alive = true;
    const canvas = canvasRef.current;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (!alive || !canvas) return;

      pOffsRef.current = new Float32Array(20).map((_, i) => i / 20);
      const W = canvas.clientWidth  || canvas.offsetWidth  || 400;
      const H = canvas.clientHeight || canvas.offsetHeight || 400;

      // Scene
      const scene = new THREE.Scene();
      const bgColor = new THREE.Color(0x06060e);
      scene.background = bgColor;
      bgColorRef.current = bgColor;
      scene.fog = new THREE.Fog(0x06060e, 14, 28);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 60);
      camera.position.set(6, 7, 8);
      camera.lookAt(0, 1.2, 0);

      // Renderer — PCFSoft for natural room shadows
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      rendererRef.current = renderer;

      // Orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 22;
      controls.maxPolarAngle = Math.PI / 2 + 0.05;
      controls.target.set(0, 1.2, 0);
      controls.update();
      controlsRef.current = controls;

      // Very dim ambient — room is genuinely dark without the ceiling light
      scene.add(new THREE.AmbientLight(0x223366, 0.06));

      // Helper: add a box, return {mesh, mat}
      const mkBox = (
        w: number, h: number, d: number,
        color: number, x: number, y: number, z: number,
        opts?: Record<string, unknown>,
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

      // ── Room ─────────────────────────────────────────────────────────────
      // Walls / floor / ceiling in warm mid-tone so light visibly illuminates them
      mkBox(8, 0.14, 8, 0x252535, 0, 0, 0);               // floor
      mkBox(0.12, 3.1, 8, 0x2a2a42, -4, 1.55, 0);          // left wall
      mkBox(0.12, 3.1, 8, 0x2a2a42, 4, 1.55, 0);           // right wall
      mkBox(8, 3.1, 0.12, 0x2a2a42, 0, 1.55, -4);          // back wall
      mkBox(8, 3.1, 0.12, 0x1e1e30, 0, 1.55, 4);           // front wall (faint)
      mkBox(8, 0.12, 8, 0x1a1a2c, 0, 3.06, 0);             // ceiling

      // Skirting boards
      mkBox(8, 0.1, 0.06, 0x1c2c3c, 0, 0.05, -3.97);
      mkBox(8, 0.1, 0.06, 0x1c2c3c, 0, 0.05, 3.97);
      mkBox(0.06, 0.1, 8, 0x1c2c3c, -3.97, 0.05, 0);
      mkBox(0.06, 0.1, 8, 0x1c2c3c, 3.97, 0.05, 0);

      // Subtle grid on floor
      const grid = new THREE.GridHelper(8, 8, 0x1a2840, 0x0f1830);
      grid.position.y = 0.08;
      scene.add(grid);

      // ── Breaker panel (left wall, rear) ──────────────────────────────────
      mkBox(0.12, 1.3, 0.9, 0x2a3344, -3.94, 1.3, -1.5);
      mkBox(0.10, 1.1, 0.7, 0x1e3388, -3.88, 1.3, -1.5);
      [0x3355aa, 0x4477bb, 0x3355aa, 0x4477bb, 0x3355aa, 0x4477bb].forEach(
        (c, i) => mkBox(0.07, 0.09, 0.5, c, -3.82, 0.75 + i * 0.18, -1.5),
      );

      // ── Ceiling light fixture ─────────────────────────────────────────────
      const fixtureGeo = new THREE.CylinderGeometry(0.34, 0.28, 0.16, 16);
      const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.55 });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(0, 2.99, 0);
      fixture.receiveShadow = true;
      scene.add(fixture);

      // Bulb (emissive)
      const bulbGeo = new THREE.SphereGeometry(0.13, 14, 14);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: new THREE.Color(0x111100),
        emissiveIntensity: 0.4,
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 2.93, 0);
      scene.add(bulb);
      bulbMatRef.current = bulbMat;

      // Main point light — HIGH intensity so it genuinely illuminates the room
      const ceilingPt = new THREE.PointLight(0xfff5cc, 0, 14);
      ceilingPt.position.set(0, 2.9, 0);
      ceilingPt.castShadow = true;
      ceilingPt.shadow.mapSize.width  = 1024;
      ceilingPt.shadow.mapSize.height = 1024;
      ceilingPt.shadow.camera.near = 0.1;
      ceilingPt.shadow.camera.far  = 15;
      scene.add(ceilingPt);
      ceilingLightRef.current = ceilingPt;

      // ── Light switch (back wall) ──────────────────────────────────────────
      mkBox(0.07, 0.24, 0.15, 0x334455, -2.2, 1.2, -3.93);
      const leverGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);
      const leverMat = new THREE.MeshStandardMaterial({ color: 0x99bbcc });
      const lever = new THREE.Mesh(leverGeo, leverMat);
      lever.position.set(-2.2, 1.2, -3.9);
      scene.add(lever);
      switchLeverRef.current = lever;

      // ── Wall outlets (right wall) ─────────────────────────────────────────
      [-0.5, 1.5].forEach((z) => {
        mkBox(0.07, 0.14, 0.12, 0x334455, 3.94, 0.52, z);
        mkBox(0.04, 0.04, 0.06, 0x111122, 3.91, 0.55, z);
        mkBox(0.04, 0.04, 0.06, 0x111122, 3.91, 0.49, z);
      });

      // ── Furniture ────────────────────────────────────────────────────────
      // Sofa (left wall)
      mkBox(2.8, 0.55, 1.0, 0x1e2d45, -2, 0.28, 1.5);
      mkBox(2.8, 0.70, 0.22, 0x243560, -2, 0.62, 1.98);
      mkBox(0.22, 0.55, 1.0, 0x243560, -3.3, 0.28, 1.5);
      mkBox(0.22, 0.55, 1.0, 0x243560, -0.7, 0.28, 1.5);
      // Coffee table
      mkBox(1.0, 0.05, 0.6, 0x334455, -2, 0.38, 0.7);
      [[-2.4, 0.4], [-1.6, 0.4], [-2.4, 1.0], [-1.6, 1.0]].forEach(
        ([tx, tz]) => mkBox(0.06, 0.35, 0.06, 0x2a3550, tx, 0.18, tz),
      );

      // ── Wiring ───────────────────────────────────────────────────────────
      const hotPts = [
        new THREE.Vector3(-3.84, 1.3, -1.5),
        new THREE.Vector3(-3.84, 2.88, -1.5),
        new THREE.Vector3(-2.2, 2.92, -1.5),
        new THREE.Vector3(-2.2, 2.92, -3.9),
        new THREE.Vector3(-2.2, 2.92, -2.0),
        new THREE.Vector3(0, 2.92, 0),
        new THREE.Vector3(0, 2.88, 0),
      ];
      const hotCurve = new THREE.CatmullRomCurve3(hotPts);
      wireCurveRef.current = hotCurve;
      const neuCurve = new THREE.CatmullRomCurve3(
        hotPts.map((p) => new THREE.Vector3(p.x, p.y, p.z + 0.05)),
      );

      const mkWire = (curve: any, color: number, emissive: number) => {
        const geo = new THREE.TubeGeometry(curve, 24, 0.018, 6, false);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(emissive),
          emissiveIntensity: 1,
        });
        scene.add(new THREE.Mesh(geo, mat));
        return mat;
      };
      hotWireMatRef.current     = mkWire(hotCurve, 0x3366dd, 0x001133);
      neutralWireMatRef.current = mkWire(neuCurve,  0x445566, 0x000811);

      // Current-flow particles
      const pPos = new Float32Array(20 * 3);
      pPosRef.current = pPos;
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      pGeoRef.current = pGeo;
      scene.add(new THREE.Points(pGeo,
        new THREE.PointsMaterial({ color: 0x88ccff, size: 0.06, sizeAttenuation: true }),
      ));

      // ── Add-on: CEILING FAN ───────────────────────────────────────────────
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, 2.86, 0);
      fanGroup.visible = false;
      scene.add(fanGroup);
      fanGroupRef.current = fanGroup;

      const metalMat = new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.55 });
      const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 14), metalMat);
      hubMesh.castShadow = true;
      fanGroup.add(hubMesh);
      const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.13, 8), metalMat);
      rodMesh.position.y = 0.17;
      fanGroup.add(rodMesh);

      const fanBlades = new THREE.Group();
      fanBlades.position.y = -0.07;
      fanGroup.add(fanBlades);
      fanBladesRef.current = fanBlades;
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9a7755 });
      for (let i = 0; i < 5; i++) {
        const wrap = new THREE.Group();
        wrap.rotation.y = (i / 5) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.72), bladeMat);
        blade.position.set(0, 0, 0.42);
        blade.rotation.x = -0.08;
        blade.castShadow = true;
        wrap.add(blade);
        fanBlades.add(wrap);
      }

      // ── Add-on: FLOOR LAMP ────────────────────────────────────────────────
      const lampGroup = new THREE.Group();
      lampGroup.position.set(-3.2, 0, 3.2);
      lampGroup.visible = false;
      scene.add(lampGroup);
      lampGroupRef.current = lampGroup;

      const lMetal = new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.7, roughness: 0.3 });
      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.07, 14), lMetal);
      lBase.position.y = 0.04; lBase.castShadow = true; lampGroup.add(lBase);
      const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.85, 8), lMetal);
      lPole.position.y = 0.97; lPole.castShadow = true; lampGroup.add(lPole);

      const lShadeMat = new THREE.MeshStandardMaterial({
        color: 0xcc9944,
        emissive: new THREE.Color(0x110800),
        emissiveIntensity: 0.2,
        side: 2,
        transparent: true,
        opacity: 0.92,
      });
      const lShade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.38, 16, 1, true), lShadeMat);
      lShade.rotation.x = Math.PI;
      lShade.position.y = 2.1;
      lampGroup.add(lShade);
      lampShadeMatRef.current = lShadeMat;

      const lBulbMat = new THREE.MeshStandardMaterial({
        color: 0xffffaa, emissive: new THREE.Color(0x221100), emissiveIntensity: 1,
      });
      const lBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lBulbMat);
      lBulb.position.y = 1.98;
      lampGroup.add(lBulb);

      const lampPt = new THREE.PointLight(0xffcc66, 0, 5);
      lampPt.position.y = 1.9;
      lampPt.castShadow = true;
      lampGroup.add(lampPt);
      lampLightRef.current = lampPt;

      // ── Add-on: TELEVISION ────────────────────────────────────────────────
      const tvGroup = new THREE.Group();
      tvGroup.position.set(3.92, 1.5, -1.5);
      tvGroup.rotation.y = -Math.PI / 2;
      tvGroup.visible = false;
      scene.add(tvGroup);
      tvGroupRef.current = tvGroup;

      const tvBodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
      const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 1.6), tvBodyMat);
      tvBody.castShadow = true;
      tvGroup.add(tvBody);

      const tvScreenMat = new THREE.MeshStandardMaterial({
        color: 0x001122,
        emissive: new THREE.Color(0x001122),
        emissiveIntensity: 0.08,
      });
      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 1.44), tvScreenMat);
      tvScreen.position.x = 0.016;
      tvGroup.add(tvScreen);
      tvScreenMatRef.current = tvScreenMat;

      const tvStand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.18), tvBodyMat);
      tvStand.position.y = -0.6;
      tvGroup.add(tvStand);
      const tvBase2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.55), tvBodyMat);
      tvBase2.position.y = -0.77;
      tvGroup.add(tvBase2);

      // ── Animation loop ────────────────────────────────────────────────────
      let lastTime = -1;
      const bgOff = new THREE.Color(0x06060e);
      const bgOn  = new THREE.Color(0x161630);

      const animate = (now: number) => {
        if (!alive) return;
        animIdRef.current = requestAnimationFrame(animate);
        if (lastTime < 0) { lastTime = now; return; }
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (controlsRef.current) controlsRef.current.update();

        const on   = lightOnRef.current;
        const fan  = fanAddedRef.current;
        const lamp = lampAddedRef.current;
        const tv   = tvAddedRef.current;

        // Background gently lightens when ceiling light is on
        if (bgColorRef.current) bgColorRef.current.lerp(on ? bgOn : bgOff, 0.06);

        // Switch lever tilts
        if (switchLeverRef.current) {
          const tgt = on ? -0.5 : 0.5;
          switchLeverRef.current.rotation.x += (tgt - switchLeverRef.current.rotation.x) * 0.15;
        }

        // Ceiling light — smooth fade in/out to 5.8 intensity
        if (ceilingLightRef.current) {
          const tgt = on ? 5.8 : 0;
          ceilingLightRef.current.intensity += (tgt - ceilingLightRef.current.intensity) * 0.10;
        }

        // Bulb glow
        if (bulbMatRef.current) {
          bulbMatRef.current.emissive.set(on ? 0xffffaa : 0x111100);
          bulbMatRef.current.emissiveIntensity = on ? 3.5 : 0.3;
        }

        // Wire glow
        if (hotWireMatRef.current)     hotWireMatRef.current.emissive.set(on ? 0x0055cc : 0x001133);
        if (neutralWireMatRef.current) neutralWireMatRef.current.emissive.set(on ? 0x223355 : 0x000811);

        // Overload flash
        if (overloadRef.current && !overloadLightRef.current && sceneRef.current) {
          const rl = new THREE.PointLight(0xff2200, 4.5, 4);
          rl.position.set(-3.84, 1.3, -1.5);
          sceneRef.current.add(rl);
          overloadLightRef.current = rl;
        }

        // Current-flow particles
        if (pPosRef.current && wireCurveRef.current && pGeoRef.current && pOffsRef.current) {
          const offs = pOffsRef.current;
          const pos  = pPosRef.current;
          for (let i = 0; i < 20; i++) {
            if (on) offs[i] = (offs[i] + dt * 0.18) % 1.0;
            const pt = wireCurveRef.current.getPoint(offs[i]);
            pos[i * 3] = pt.x; pos[i * 3 + 1] = pt.y; pos[i * 3 + 2] = pt.z;
          }
          pGeoRef.current.attributes.position.needsUpdate = true;
        }

        // Fan
        if (fanGroupRef.current) {
          fanGroupRef.current.visible = fan;
          if (fanBladesRef.current && fan && on) {
            fanBladesRef.current.rotation.y += dt * 3.5;
          }
        }

        // Floor lamp
        if (lampGroupRef.current) {
          lampGroupRef.current.visible = lamp;
          if (lampLightRef.current) {
            const tgt = (lamp && on) ? 2.2 : 0;
            lampLightRef.current.intensity += (tgt - lampLightRef.current.intensity) * 0.1;
          }
          if (lampShadeMatRef.current) {
            lampShadeMatRef.current.emissive.set((lamp && on) ? 0x441800 : 0x110800);
          }
        }

        // TV
        if (tvGroupRef.current) {
          tvGroupRef.current.visible = tv;
          if (tvScreenMatRef.current) {
            const tgt = (tv && on) ? 0.72 : 0.08;
            tvScreenMatRef.current.emissiveIntensity +=
              (tgt - tvScreenMatRef.current.emissiveIntensity) * 0.08;
          }
        }

        renderer.render(scene, camera);
      };
      animIdRef.current = requestAnimationFrame(animate);

      // Resize handler
      const onResize = () => {
        if (!alive || !canvas) return;
        const w = canvas.clientWidth  || canvas.offsetWidth  || 400;
        const h = canvas.clientHeight || canvas.offsetHeight || 400;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      };
      resizeFnRef.current = onResize;
      window.addEventListener('resize', onResize);
      timerRef.current = setTimeout(() => { if (alive) onResize(); }, 100);
      if (typeof ResizeObserver !== 'undefined') {
        roRef.current = new ResizeObserver(() => { if (alive) onResize(); });
        roRef.current.observe(canvas);
      }
    }).catch((err) => console.error('HomeCircuit load error:', err));

    return () => {
      alive = false;
      if (timerRef.current)   { clearTimeout(timerRef.current); timerRef.current = null; }
      if (resizeFnRef.current){ window.removeEventListener('resize', resizeFnRef.current); resizeFnRef.current = null; }
      if (roRef.current)      { roRef.current.disconnect(); roRef.current = null; }
      if (animIdRef.current !== null) { cancelAnimationFrame(animIdRef.current); animIdRef.current = null; }
      if (controlsRef.current){ controlsRef.current.dispose(); controlsRef.current = null; }
      if (rendererRef.current){ rendererRef.current.dispose(); rendererRef.current = null; }
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

  // Derived power metrics
  const voltage  = 120;
  const currentA = (lightOn ? 0.83 : 0)
    + (fanAdded  && lightOn ? 0.50 : 0)
    + (lampAdded && lightOn ? 0.42 : 0)
    + (tvAdded   && lightOn ? 0.83 : 0);
  const power = currentA * voltage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', background: '#06060e' }}>
      <canvas ref={canvasRef} style={{ flex: 1, minHeight: 0, display: 'block', width: '100%' }} />

      {/* Telemetry overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(6,6,20,0.88)', border: '1px solid rgba(136,204,255,0.25)',
        borderRadius: 8, padding: '8px 12px', color: '#88ccff', fontSize: '0.78rem', lineHeight: 1.6,
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>🏠 Home Circuit</div>
        <div>Voltage: <span style={{ color: '#fff' }}>{voltage} V AC</span></div>
        <div>Current: <span style={{ color: '#fff' }}>{currentA.toFixed(2)} A</span></div>
        <div>Power:   <span style={{ color: power > 300 ? '#ff8888' : '#fff' }}>{power.toFixed(0)} W</span></div>
        {overload && <div style={{ color: '#ff4444', marginTop: 3 }}>⚠ Overload!</div>}
      </div>

      {/* Orbit hint */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(6,6,20,0.70)', border: '1px solid rgba(136,204,255,0.18)',
        borderRadius: 8, padding: '6px 10px', color: 'rgba(136,204,255,0.70)', fontSize: '0.70rem',
        lineHeight: 1.5, pointerEvents: 'none',
      }}>
        <div>🖱 Drag to orbit</div>
        <div>🔍 Scroll to zoom</div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '96vw',
      }}>
        <button
          style={{ ...BTN, ...(lightOn ? { borderColor: 'rgba(255,255,120,0.6)', color: '#ffffaa' } : {}) }}
          onClick={() => setLightOn((v) => !v)}
        >
          {lightOn ? '💡 Light ON' : '🔦 Toggle Light'}
        </button>
        <button
          style={{ ...BTN_ADD, ...(fanAdded ? { borderColor: 'rgba(100,200,255,0.6)', color: '#99ddff' } : {}) }}
          onClick={() => setFanAdded((v) => !v)}
        >
          {fanAdded ? '🌀 Fan: ON' : '➕ Add Fan'}
        </button>
        <button
          style={{ ...BTN_ADD, ...(lampAdded ? { borderColor: 'rgba(255,200,80,0.6)', color: '#ffcc66' } : {}) }}
          onClick={() => setLampAdded((v) => !v)}
        >
          {lampAdded ? '🪔 Lamp: ON' : '➕ Add Lamp'}
        </button>
        <button
          style={{ ...BTN_ADD, ...(tvAdded ? { borderColor: 'rgba(80,150,255,0.6)', color: '#88aaff' } : {}) }}
          onClick={() => setTvAdded((v) => !v)}
        >
          {tvAdded ? '📺 TV: ON' : '➕ Add TV'}
        </button>
        <button
          style={{ ...BTN, ...(overload ? { color: '#ff6666', borderColor: 'rgba(255,80,80,0.5)' } : {}) }}
          onClick={handleOverload}
          disabled={overload}
        >
          {overload ? '🔥 Tripping…' : '⚡ Overload Demo'}
        </button>
      </div>
    </div>
  );
}
