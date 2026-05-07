import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';

const BTN: React.CSSProperties = {
  background: 'rgba(10,20,40,0.88)',
  border: '1px solid rgba(136,204,255,0.35)',
  color: '#88ccff',
  borderRadius: '8px',
  padding: '7px 13px',
  cursor: 'pointer',
  fontSize: '0.82rem',
};

// ── Colours ─────────────────────────────────────────────────────────────────
const CAR   = 0x2b52a8;   // body blue (lighter)
const DARK  = 0x1a3055;   // trim / pillars
const GLASS = 0x2a4f7a;   // window tint
const TI    = 0x181818;   // rubber tyre
const RIM   = 0xaabbcc;   // alloy rim (brighter)

export default function CarCircuit() {
  // ── Core ─────────────────────────────────────────────────────────────────
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef    = useRef<any>(null);
  const animIdRef   = useRef<number | null>(null);
  const roRef       = useRef<ResizeObserver | null>(null);
  const resizeFnRef = useRef<(() => void) | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);

  // ── Live refs ─────────────────────────────────────────────────────────────
  const hlOnRef    = useRef(false);
  const tlOnRef    = useRef(false);
  const ignOnRef   = useRef(false);
  const hornRef    = useRef(false);
  const fuseRef    = useRef(false);

  // ── Mesh / light refs ─────────────────────────────────────────────────────
  const hlLMatRef   = useRef<any>(null);
  const hlRMatRef   = useRef<any>(null);
  const hlLLightRef = useRef<any>(null);
  const hlRLightRef = useRef<any>(null);
  const tlLMatRef   = useRef<any>(null);
  const tlRMatRef   = useRef<any>(null);
  const tlLLightRef = useRef<any>(null);
  const tlRLightRef = useRef<any>(null);
  const ignMatRef   = useRef<any>(null);
  const hornMatRef  = useRef<any>(null);
  const fuseMatRef  = useRef<any>(null);
  const dashMatRef  = useRef<any>(null);
  const intLightRef = useRef<any>(null);
  const hlWireL     = useRef<any>(null);
  const hlWireR     = useRef<any>(null);
  const chargeWire  = useRef<any>(null);

  const pSetsRef = useRef<Array<{
    offsets: Float32Array; positions: Float32Array; geo: any; curve: any;
  }>>([]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [hlOn,    setHlOn]    = useState(false);
  const [tlOn,    setTlOn]    = useState(false);
  const [ignOn,   setIgnOn]   = useState(false);
  const [horn,    setHorn]    = useState(false);
  const [fuse,    setFuse]    = useState(false);
  const hornTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { hlOnRef.current  = hlOn;  }, [hlOn]);
  useEffect(() => { tlOnRef.current  = tlOn;  }, [tlOn]);
  useEffect(() => { ignOnRef.current = ignOn; }, [ignOn]);
  useEffect(() => { hornRef.current  = horn;  }, [horn]);
  useEffect(() => { fuseRef.current  = fuse;  }, [fuse]);

  const handleHorn = () => {
    if (hornTimerRef.current) return;
    setHorn(true);
    hornTimerRef.current = setTimeout(() => { setHorn(false); hornTimerRef.current = null; }, 500);
  };
  useEffect(() => () => { if (hornTimerRef.current) clearTimeout(hornTimerRef.current); }, []);

  const handleFuse = () => {
    setFuse((v) => {
      if (!v) setHlOn(false);
      return !v;
    });
  };

  // ── Scene setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let alive = true;
    const canvas = canvasRef.current;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, { OrbitControls }]) => {
      if (!alive || !canvas) return;

      const W = canvas.clientWidth  || canvas.offsetWidth  || 400;
      const H = canvas.clientHeight || canvas.offsetHeight || 400;

      // Scene — well-lit day/dusk parking lot
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1e2a3e);
      scene.fog = new THREE.Fog(0x1e2a3e, 30, 60);
      sceneRef.current = scene;

      // Camera — 3/4 view from front-right
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 80);
      camera.position.set(5, 4, 7);
      camera.lookAt(0, 0.6, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      rendererRef.current = renderer;

      // Orbit
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 28;
      controls.maxPolarAngle = Math.PI / 2 + 0.08;
      controls.target.set(0, 0.6, 0);
      controls.update();
      controlsRef.current = controls;

      // Lights — bright ambient so the whole car is readable
      scene.add(new THREE.AmbientLight(0x88aacc, 0.75));
      const moon = new THREE.DirectionalLight(0xccddee, 1.3);
      moon.position.set(-6, 10, 4);
      moon.castShadow = true;
      moon.shadow.mapSize.width = 2048;
      moon.shadow.mapSize.height = 2048;
      scene.add(moon);
      // Second fill from opposite side for the engine bay
      const fill = new THREE.DirectionalLight(0x9aabbb, 0.5);
      fill.position.set(4, 5, -6);
      scene.add(fill);

      // Helper — returns {mesh, mat}
      const mkBox = (
        w: number, h: number, d: number,
        color: number, x: number, y: number, z: number,
        opts?: Record<string, unknown>,
      ) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color, ...opts });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return { mesh, mat };
      };

      // ── GROUND / PARKING LOT ─────────────────────────────────────────────
      mkBox(18, 0.12, 26, 0x2a2e3e, 0, -0.08, 0);
      // Lane markings
      mkBox(0.08, 0.01, 5.2, 0x8899aa, -2.8, 0.03, 0);
      mkBox(0.08, 0.01, 5.2, 0x8899aa,  2.8, 0.03, 0);

      // ── CAR BODY ─────────────────────────────────────────────────────────
      // Front of car = -Z, rear = +Z, ground = y=0, wheelbase y=0.37

      // Lower body: chassis floor + sills (full-length base)
      mkBox(2.02, 0.20, 4.7, CAR, 0, 0.36, 0);

      // Front fenders (around front wheels)
      mkBox(0.20, 0.52, 1.22, CAR, -1.02, 0.60, -1.40);
      mkBox(0.20, 0.52, 1.22, CAR,  1.02, 0.60, -1.40);

      // Rear fenders (around rear wheels)
      mkBox(0.20, 0.56, 1.14, CAR, -1.02, 0.62, 1.50);
      mkBox(0.20, 0.56, 1.14, CAR,  1.02, 0.62, 1.50);

      // Hood (flat engine cover, lower than cabin)
      mkBox(1.86, 0.10, 1.56, CAR, 0, 0.60, -1.44);

      // Front bumper lower
      mkBox(2.05, 0.38, 0.18, DARK, 0, 0.38, -2.30);
      // Front upper fascia / grille area
      mkBox(1.62, 0.24, 0.16, DARK, 0, 0.70, -2.28);
      // Grille insert (dark mesh look)
      mkBox(1.02, 0.17, 0.08, 0x06060e, 0, 0.62, -2.36);

      // ─ Cabin / greenhouse ─
      // Door panels (sides, full height of doors)
      mkBox(0.14, 0.45, 2.08, DARK, -1.02, 0.85, 0.04);
      mkBox(0.14, 0.45, 2.08, DARK,  1.02, 0.85, 0.04);
      // Roofline sides (above windows)
      mkBox(0.12, 0.16, 1.90, CAR, -1.00, 1.16, 0.04);
      mkBox(0.12, 0.16, 1.90, CAR,  1.00, 1.16, 0.04);
      // Roof slab
      mkBox(1.74, 0.10, 1.86, CAR, 0, 1.32, 0.04);

      // A-pillars (front roof support)
      mkBox(0.10, 0.62, 0.12, DARK, -0.88, 1.00, -0.86);
      mkBox(0.10, 0.62, 0.12, DARK,  0.88, 1.00, -0.86);
      // C-pillars (rear roof support)
      mkBox(0.10, 0.62, 0.12, DARK, -0.88, 1.00,  0.96);
      mkBox(0.10, 0.62, 0.12, DARK,  0.88, 1.00,  0.96);

      // Side windows (semi-transparent glass)
      mkBox(0.07, 0.47, 1.66, GLASS, -0.90, 0.99, 0.04,
        { transparent: true, opacity: 0.44 });
      mkBox(0.07, 0.47, 1.66, GLASS,  0.90, 0.99, 0.04,
        { transparent: true, opacity: 0.44 });

      // Windshield (tilted ~32° back)
      const ws = mkBox(1.68, 0.52, 0.08, GLASS, 0, 1.00, -0.88,
        { transparent: true, opacity: 0.48 });
      ws.mesh.rotation.x = 0.55;

      // Rear window (tilted ~30° forward)
      const rw = mkBox(1.60, 0.46, 0.08, GLASS, 0, 1.00, 1.00,
        { transparent: true, opacity: 0.44 });
      rw.mesh.rotation.x = -0.50;

      // Trunk lid
      mkBox(1.84, 0.14, 0.92, CAR, 0, 0.74, 1.90);
      // Rear bumper
      mkBox(2.08, 0.38, 0.18, DARK, 0, 0.38, 2.30);
      // Rear spoiler
      mkBox(1.55, 0.07, 0.12, DARK, 0, 0.82, 2.22);

      // Door handles
      mkBox(0.03, 0.06, 0.18, 0x668899, -1.10, 0.88, -0.28);
      mkBox(0.03, 0.06, 0.18, 0x668899, -1.10, 0.88,  0.62);
      mkBox(0.03, 0.06, 0.18, 0x668899,  1.10, 0.88, -0.28);
      mkBox(0.03, 0.06, 0.18, 0x668899,  1.10, 0.88,  0.62);

      // Side mirrors
      mkBox(0.08, 0.09, 0.22, CAR, -1.10, 1.04, -1.08);
      mkBox(0.08, 0.09, 0.22, CAR,  1.10, 1.04, -1.08);

      // License plate (rear)
      mkBox(0.52, 0.13, 0.02, 0xdddddd, 0, 0.48, 2.42);
      // License plate (front)
      mkBox(0.52, 0.13, 0.02, 0xdddddd, 0, 0.48, -2.40);

      // Exhaust pipe
      mkBox(0.08, 0.06, 0.12, 0x445566, -0.48, 0.18, 2.38);

      // ── WHEELS ───────────────────────────────────────────────────────────
      // rotation.z = PI/2 → cylinder axis runs left-right (X), correct for wheels
      const wheelY = 0.37;
      const wheelCoords: [number, number][] = [ [-1.10, -1.40], [1.10, -1.40], [-1.10, 1.50], [1.10, 1.50] ];
      wheelCoords
        .forEach(([wx, wz]) => {
          // Tyre
          const tGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.26, 22);
          const tMat = new THREE.MeshStandardMaterial({ color: TI, roughness: 0.95 });
          const tMesh = new THREE.Mesh(tGeo, tMat);
          tMesh.position.set(wx, wheelY, wz);
          tMesh.rotation.z = Math.PI / 2;
          tMesh.castShadow = true; tMesh.receiveShadow = true;
          scene.add(tMesh);

          // Alloy rim
          const rGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 8);
          const rMat = new THREE.MeshStandardMaterial({ color: RIM, metalness: 0.75, roughness: 0.35 });
          const rMesh = new THREE.Mesh(rGeo, rMat);
          rMesh.position.set(wx, wheelY, wz);
          rMesh.rotation.z = Math.PI / 2;
          rMesh.castShadow = true;
          scene.add(rMesh);

          // Centre cap
          const cGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.29, 8);
          const cMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.90 });
          const cMesh = new THREE.Mesh(cGeo, cMat);
          cMesh.position.set(wx, wheelY, wz);
          cMesh.rotation.z = Math.PI / 2;
          scene.add(cMesh);

          // Wheel arch shadow fill
          const aGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.30, 12, 1, true, 0, Math.PI);
          const aMat = new THREE.MeshStandardMaterial({ color: 0x05050d, side: 2 });
          const aMesh = new THREE.Mesh(aGeo, aMat);
          aMesh.position.set(wx, wheelY + 0.08, wz);
          aMesh.rotation.z = Math.PI / 2;
          scene.add(aMesh);
        });

      // ── ENGINE BAY (visible under hood when looking from front) ──────────
      // Battery
      mkBox(0.55, 0.38, 0.75, 0x223344, -0.64, 0.73, -1.50);
      mkBox(0.08, 0.06, 0.06, 0xcc2222, -0.88, 0.94, -1.50);  // + terminal
      mkBox(0.08, 0.06, 0.06, 0x111111, -0.40, 0.94, -1.50);  // − terminal

      // Alternator
      mkBox(0.44, 0.36, 0.44, 0x334422, 0.56, 0.73, -1.50);

      // Fuse box
      const { mat: fuseBoxMat } = mkBox(0.52, 0.14, 0.38, 0x443322, 0, 0.72, -0.96);
      fuseMatRef.current = fuseBoxMat;

      // Engine block
      mkBox(1.18, 0.28, 0.88, 0x22303f, 0, 0.68, -1.82);
      // Air filter
      mkBox(0.38, 0.25, 0.38, 0x334466, 0.52, 0.82, -2.02);

      // ── INTERIOR ─────────────────────────────────────────────────────────
      // Dashboard
      mkBox(1.54, 0.15, 0.35, 0x0d1220, 0, 0.76, -0.84);
      // Instrument cluster (glows)
      const { mat: dashM } = mkBox(1.18, 0.04, 0.18, 0x001122, 0, 0.82, -0.76,
        { emissive: new THREE.Color(0x001122), emissiveIntensity: 0.3 });
      dashMatRef.current = dashM;
      // Centre console
      mkBox(0.36, 0.26, 0.06, 0x1a1a2e, 0, 0.78, -0.94);
      // Steering wheel
      mkBox(0.04, 0.32, 0.32, 0x111122, -0.30, 0.96, -0.74);
      // Front seats
      mkBox(0.68, 0.35, 0.62, 0x1a2235, -0.48, 0.75, 0.05);
      mkBox(0.68, 0.35, 0.62, 0x1a2235,  0.48, 0.75, 0.05);
      mkBox(0.64, 0.52, 0.12, 0x1a2235, -0.48, 0.98, 0.32);
      mkBox(0.64, 0.52, 0.12, 0x1a2235,  0.48, 0.98, 0.32);
      // Rear seat
      mkBox(1.58, 0.30, 0.54, 0x162030, 0, 0.75, 0.84);
      mkBox(1.58, 0.45, 0.12, 0x162030, 0, 0.95, 1.06);

      // Interior map light (ceiling)
      mkBox(0.24, 0.04, 0.16, 0x44445a, 0, 1.32, 0.18);
      const intPt = new THREE.PointLight(0xfff8e0, 0, 3);
      intPt.position.set(0, 1.28, 0.18);
      intPt.castShadow = false;
      scene.add(intPt);
      intLightRef.current = intPt;

      // Ignition switch
      const { mat: ignM } = mkBox(0.10, 0.10, 0.10, 0x223344, 0.40, 0.82, -0.78,
        { emissive: new THREE.Color(0x222222), emissiveIntensity: 1 });
      ignMatRef.current = ignM;

      // Horn (in engine bay)
      const { mat: hornM } = mkBox(0.18, 0.08, 0.18, 0x334422, 0.30, 0.74, -1.97,
        { emissive: new THREE.Color(0x111111), emissiveIntensity: 1 });
      hornMatRef.current = hornM;

      // ── HEADLIGHTS ───────────────────────────────────────────────────────
      const { mat: hlLM } = mkBox(0.38, 0.17, 0.10, 0x223344, -0.76, 0.67, -2.36,
        { emissive: new THREE.Color(0x111111), emissiveIntensity: 1 });
      hlLMatRef.current = hlLM;
      const { mat: hlRM } = mkBox(0.38, 0.17, 0.10, 0x223344,  0.76, 0.67, -2.36,
        { emissive: new THREE.Color(0x111111), emissiveIntensity: 1 });
      hlRMatRef.current = hlRM;

      // DRL strips (chrome look)
      mkBox(0.36, 0.04, 0.04, 0x889aaa, -0.76, 0.78, -2.35);
      mkBox(0.36, 0.04, 0.04, 0x889aaa,  0.76, 0.78, -2.35);

      const hlLL = new THREE.PointLight(0xffffff, 0, 8);
      hlLL.position.set(-0.76, 0.72, -2.4);
      scene.add(hlLL); hlLLightRef.current = hlLL;

      const hlRL = new THREE.PointLight(0xffffff, 0, 8);
      hlRL.position.set(0.76, 0.72, -2.4);
      scene.add(hlRL); hlRLightRef.current = hlRL;

      // ── TAIL LIGHTS ──────────────────────────────────────────────────────
      const { mat: tlLM } = mkBox(0.44, 0.22, 0.08, 0x220000, -0.72, 0.66, 2.36,
        { emissive: new THREE.Color(0x330000), emissiveIntensity: 1 });
      tlLMatRef.current = tlLM;
      const { mat: tlRM } = mkBox(0.44, 0.22, 0.08, 0x220000,  0.72, 0.66, 2.36,
        { emissive: new THREE.Color(0x330000), emissiveIntensity: 1 });
      tlRMatRef.current = tlRM;

      const tlLL = new THREE.PointLight(0xff1100, 0, 4);
      tlLL.position.set(-0.72, 0.70, 2.4);
      scene.add(tlLL); tlLLightRef.current = tlLL;

      const tlRL = new THREE.PointLight(0xff1100, 0, 4);
      tlRL.position.set(0.72, 0.70, 2.4);
      scene.add(tlRL); tlRLightRef.current = tlRL;

      // ── WIRING ───────────────────────────────────────────────────────────
      const mkWire = (pts: any[], color: number, emissiveSeed = 0x221100) => {
        const curve = new THREE.CatmullRomCurve3(pts);
        const mat   = new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(emissiveSeed),
          emissiveIntensity: 2.0,
        });
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 8, false), mat));
        return { curve, mat };
      };

      // Battery → fuse box
      mkWire([
        new THREE.Vector3(-0.64, 0.94, -1.50),
        new THREE.Vector3(-0.30, 0.72, -1.20),
        new THREE.Vector3(0, 0.72, -0.96),
      ], 0xff5555, 0x661111);

      // Fuse → headlight L
      const { curve: hcL, mat: hcLMat } = mkWire([
        new THREE.Vector3(0, 0.72, -0.96),
        new THREE.Vector3(-0.50, 0.68, -1.70),
        new THREE.Vector3(-0.76, 0.68, -2.36),
      ], 0xff5555, 0x441100);
      hlWireL.current = hcLMat;

      // Fuse → headlight R
      const { curve: hcR, mat: hcRMat } = mkWire([
        new THREE.Vector3(0, 0.72, -0.96),
        new THREE.Vector3(0.50, 0.68, -1.70),
        new THREE.Vector3(0.76, 0.68, -2.36),
      ], 0xff5555, 0x441100);
      hlWireR.current = hcRMat;

      // Alternator → battery (charging)
      const { curve: cc, mat: ccMat } = mkWire([
        new THREE.Vector3(0.56, 0.94, -1.50),
        new THREE.Vector3(0.0,  0.94, -1.50),
        new THREE.Vector3(-0.64, 0.94, -1.50),
      ], 0xffcc00, 0x664400);
      chargeWire.current = ccMat;

      // Ground (static, always dark grey)
      mkWire([
        new THREE.Vector3(-0.64, 0.20, -1.50),
        new THREE.Vector3(-0.64, 0.08, -1.50),
        new THREE.Vector3(0, 0.06, 0),
      ], 0x556677, 0x223344);

      // ── PARTICLES ────────────────────────────────────────────────────────
      const mkPS = (curve: any, n: number) => {
        const offsets   = new Float32Array(n).map((_, i) => i / n);
        const positions = new Float32Array(n * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        scene.add(new THREE.Points(geo,
          new THREE.PointsMaterial({ color: 0xffcc88, size: 0.08, sizeAttenuation: true })));
        return { offsets, positions, geo, curve };
      };
      pSetsRef.current = [mkPS(hcL, 8), mkPS(hcR, 8), mkPS(cc, 6)];

      // ── ANIMATION LOOP ────────────────────────────────────────────────────
      let lastTime = -1;
      const animate = (now: number) => {
        if (!alive) return;
        animIdRef.current = requestAnimationFrame(animate);
        if (lastTime < 0) { lastTime = now; return; }
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (controlsRef.current) controlsRef.current.update();

        const hl   = hlOnRef.current  && !fuseRef.current;
        const tl   = tlOnRef.current;
        const ign  = ignOnRef.current;
        const hrnA = hornRef.current;
        const fuze = fuseRef.current;

        // Headlights
        if (hlLMatRef.current) hlLMatRef.current.emissive.set(hl ? 0xffffff : 0x223344);
        if (hlRMatRef.current) hlRMatRef.current.emissive.set(hl ? 0xffffff : 0x223344);
        if (hlLLightRef.current) {
          const t = hl ? 3.5 : 0;
          hlLLightRef.current.intensity += (t - hlLLightRef.current.intensity) * 0.12;
        }
        if (hlRLightRef.current) {
          const t = hl ? 3.5 : 0;
          hlRLightRef.current.intensity += (t - hlRLightRef.current.intensity) * 0.12;
        }

        // Tail lights
        if (tlLMatRef.current) tlLMatRef.current.emissive.set(tl ? 0xff3300 : 0x440000);
        if (tlRMatRef.current) tlRMatRef.current.emissive.set(tl ? 0xff3300 : 0x440000);
        if (tlLLightRef.current) {
          const t = tl ? 2.0 : 0;
          tlLLightRef.current.intensity += (t - tlLLightRef.current.intensity) * 0.12;
        }
        if (tlRLightRef.current) {
          const t = tl ? 2.0 : 0;
          tlRLightRef.current.intensity += (t - tlRLightRef.current.intensity) * 0.12;
        }

        // Ignition / dashboard
        if (ignMatRef.current) ignMatRef.current.emissive.set(ign ? 0x00ff66 : 0x222222);
        if (dashMatRef.current) {
          const t = ign ? 0.65 : 0.3;
          dashMatRef.current.emissiveIntensity += (t - dashMatRef.current.emissiveIntensity) * 0.08;
        }
        if (intLightRef.current) {
          const t = ign ? 0.8 : 0;
          intLightRef.current.intensity += (t - intLightRef.current.intensity) * 0.10;
        }

        // Horn
        if (hornMatRef.current) hornMatRef.current.emissive.set(hrnA ? 0xff6600 : 0x111111);

        // Fuse box
        if (fuseMatRef.current) fuseMatRef.current.emissive.set(fuze ? 0xff2200 : 0x000000);

        // Wire glow — always visible, pulse bright when active
        if (hlWireL.current) hlWireL.current.emissive.set(hl ? 0xff3311 : 0x441100);
        if (hlWireR.current) hlWireR.current.emissive.set(hl ? 0xff3311 : 0x441100);
        if (chargeWire.current) chargeWire.current.emissive.set(ign ? 0xff9900 : 0x664400);

        // Current-flow particles
        const pActive = [hl, hl, ign];
        pSetsRef.current.forEach(({ offsets, positions, geo, curve }, idx) => {
          const active = pActive[idx];
          for (let i = 0; i < offsets.length; i++) {
            if (active) offsets[i] = (offsets[i] + dt * 0.22) % 1.0;
            const pt = curve.getPoint(offsets[i]);
            positions[i * 3] = pt.x; positions[i * 3 + 1] = pt.y; positions[i * 3 + 2] = pt.z;
          }
          geo.attributes.position.needsUpdate = true;
        });

        renderer.render(scene, camera);
      };
      animIdRef.current = requestAnimationFrame(animate);

      // Resize
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
    }).catch((err) => console.error('CarCircuit load error:', err));

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

  // Derived values
  const bv       = ignOn ? 13.8 : 12.6;
  const hlI      = (hlOn && !fuse) ? 8 : 0;
  const tlI      = tlOn ? 2 : 0;
  const hornI    = horn ? 3 : 0;
  const intI     = ignOn ? 1 : 0;
  const total    = hlI + tlI + hornI + intI;
  const circuits = [
    hlOn && !fuse && 'Headlights (8A)',
    tlOn && 'Tail lights (2A)',
    horn && 'Horn (3A)',
    ignOn && 'Interior (1A)',
    fuse && '⚠ Fuse blown',
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', background: '#1e2a3e' }}>
      <canvas ref={canvasRef} style={{ flex: 1, minHeight: 0, display: 'block', width: '100%' }} />

      {/* Telemetry */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(8,8,20,0.88)', border: '1px solid rgba(136,204,255,0.25)',
        borderRadius: 8, padding: '8px 12px', color: '#88ccff', fontSize: '0.78rem', lineHeight: 1.7,
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>🚗 Car Circuit</div>
        <div>Battery: <span style={{ color: '#fff' }}>{bv} V</span></div>
        <div>Total draw: <span style={{ color: total > 10 ? '#ff8888' : '#fff' }}>{total} A</span></div>
        {circuits.length > 0 && (
          <div style={{ marginTop: 4, color: fuse ? '#ff6666' : '#88ccff' }}>
            {(circuits as string[]).map((c, i) => <div key={i}>{c}</div>)}
          </div>
        )}
      </div>

      {/* Orbit hint */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(8,8,20,0.70)', border: '1px solid rgba(136,204,255,0.18)',
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
          style={{ ...BTN, ...(hlOn && !fuse ? { borderColor:'rgba(255,255,120,0.6)', color:'#ffffaa' } : {}) }}
          onClick={() => { if (!fuse) setHlOn((v) => !v); }}
        >
          💡 Headlights
        </button>
        <button
          style={{ ...BTN, ...(tlOn ? { borderColor:'rgba(255,80,80,0.5)', color:'#ff8888' } : {}) }}
          onClick={() => setTlOn((v) => !v)}
        >
          🔴 Tail Lights
        </button>
        <button
          style={{ ...BTN, ...(ignOn ? { borderColor:'rgba(0,255,100,0.5)', color:'#88ffaa' } : {}) }}
          onClick={() => setIgnOn((v) => !v)}
        >
          🔑 Ignition
        </button>
        <button style={BTN} onClick={handleHorn}>
          {horn ? '📯 BEEP!' : '📯 Horn'}
        </button>
        <button
          style={{ ...BTN, ...(fuse ? { borderColor:'rgba(255,80,80,0.5)', color:'#ff8888' } : {}) }}
          onClick={handleFuse}
        >
          {fuse ? '🔧 Fix Fuse' : '⚡ Blow Fuse'}
        </button>
      </div>
    </div>
  );
}
