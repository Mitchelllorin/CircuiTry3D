import { useEffect, useMemo, useRef } from "react";
import type {
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three";
import { getComponent3D } from "../circuit/Component3DLibrary";
import {
  getGeometrySegments,
  getMobilePixelRatio,
  getMobileRendererOptions,
  getTargetFrameRate,
} from "../../utils/mobilePerformance";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaViewTransitionPhase,
  ArenaViewVariant,
  FuseAnalysisResult,
  FuseRiskLevel,
} from "./types";

type ArenaSceneProps = {
  agents: ArenaBattleAgent[];
  activeAgentId: string | null;
  highlight: ArenaBattleHighlight | null;
  fuseResults: FuseAnalysisResult[];
  winnerId: string | null;
  transitionPhase: ArenaViewTransitionPhase;
  variant?: ArenaViewVariant;
  onExitTransitionComplete: () => void;
};

type OrbitControlsInstance = {
  enabled: boolean;
  enablePan: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  target: { set: (x: number, y: number, z: number) => void };
  update: () => void;
  dispose: () => void;
};

type ThreeModule = typeof import("three");

// FUSE™ risk → colour / intensity mapping, aligned with the CSS --fuse-* tokens.
const RISK_COLORS: Record<FuseRiskLevel, string> = {
  safe: "#22c55e",
  stressed: "#eab308",
  warning: "#f97316",
  critical: "#ef4444",
  failed: "#a855f7",
};

const RISK_INTENSITY: Record<FuseRiskLevel, number> = {
  safe: 0,
  stressed: 0.22,
  warning: 0.5,
  critical: 0.82,
  failed: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type CameraFraming = {
  distance: number;
  targetY: number;
  position: [number, number, number];
};

// Frame the full combatant line within the viewport, adapting to combatant
// count and aspect ratio so every component stays visible (incl. portrait).
function computeFraming(
  count: number,
  aspect: number,
  variant: ArenaViewVariant,
): CameraFraming {
  const n = Math.max(count, 1);
  const spacing = agentSpacing(n);
  const halfSpan = (spacing * (n - 1)) / 2;
  const componentHalf = 1.7;
  const halfWidth = halfSpan + componentHalf;
  const portrait = aspect < 1;

  const vfov = (45 * Math.PI) / 180;
  const safeAspect = Math.max(aspect, 0.42);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * safeAspect);

  // The combatants span ~0 (pedestal) to ~3.2 (lead/dome tips); centre ~1.55.
  // The overlay stat cards float over the upper-centre of the canvas, so aim
  // the camera *above* the group centre by `drop` to settle the combatants
  // into the clear lower band beneath the cards, standing on the floor.
  // Vertical coverage is widened by the same amount so the group never clips
  // off the bottom edge.
  const groupCenterY = 1.55;
  const groupHalfHeight = 2.0;
  const drop = variant === "embedded"
    ? (portrait ? 1.15 : 1.4)
    : (portrait ? 0.7 : 0.9);

  const halfHeight = groupHalfHeight + drop;
  const distForHeight = halfHeight / Math.tan(vfov / 2);
  const distForWidth = halfWidth / Math.tan(hfov / 2);

  const margin = variant === "embedded" ? 1.03 : 1.08;
  const distance = clamp(Math.max(distForWidth, distForHeight) * margin, 8, 60);

  const elevation = portrait ? 0.24 : 0.3;
  const targetY = groupCenterY + drop;
  const camY = targetY + distance * Math.sin(elevation);
  const camZ = distance * Math.cos(elevation);

  return { distance, targetY, position: [0, camY, camZ] };
}

function agentSpacing(count: number): number {
  if (count <= 1) return 0;
  if (count <= 2) return 3.5;
  if (count <= 3) return 3.1;
  if (count <= 4) return 2.8;
  return 2.5;
}

// Combatants stand on a shallow forward arc (centre nearest the camera) so the
// group reads as a clustered line-up rather than a scattered ring.
function agentBasePosition(index: number, count: number): [number, number, number] {
  const spacing = agentSpacing(count);
  const offset = index - (count - 1) / 2;
  const x = offset * spacing;
  const z = -Math.abs(offset) * 0.55;
  return [x, 0, z];
}

function createCanvasTexture(THREE: ThreeModule, fillStyle: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, fillStyle);
    gradient.addColorStop(0.35, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(64, 64, 64, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

type AgentVisual = {
  group: Group;
  core: Group;
  ring: Mesh;
  pedestalMaterial: MeshStandardMaterial;
  ringMaterial: MeshStandardMaterial;
  glowMaterial: MeshStandardMaterial;
  smoke: Points;
  smokeMaterial: PointsMaterial;
  smokeAges: Float32Array;
  smokeLife: Float32Array;
  smokeVel: Float32Array;
  smokeCount: number;
  base: [number, number, number];
  destroyed: boolean;
  lastLevel: FuseRiskLevel | null;
};

function createComponentVisual(
  THREE: ThreeModule,
  componentType: string,
  accent: string,
  smokeTexture: CanvasTexture,
): AgentVisual {
  const componentDef = getComponent3D(componentType) ?? getComponent3D("resistor");
  const group = new THREE.Group();
  const radialSegments = getGeometrySegments(28);

  // Glow disc beneath the pedestal — grounds the component on the neon floor.
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: new THREE.Color(accent).multiplyScalar(1.4),
    transparent: true,
    opacity: 0.5,
    metalness: 0.1,
    roughness: 0.4,
  });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.6, radialSegments), glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  group.add(glow);

  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.8,
    roughness: 0.26,
    emissive: new THREE.Color(accent).multiplyScalar(0.22),
  });
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.12, 0.34, radialSegments),
    pedestalMaterial,
  );
  pedestal.position.y = 0.17;
  group.add(pedestal);

  const pedestalTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.05, 10, radialSegments),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(1.1),
      metalness: 0.4,
      roughness: 0.2,
    }),
  );
  pedestalTrim.rotation.x = Math.PI / 2;
  pedestalTrim.position.y = 0.34;
  group.add(pedestalTrim);

  const core = new THREE.Group();
  if (componentDef) {
    const cylSegments = getGeometrySegments(24);
    const sphereSegments = getGeometrySegments(24);
    componentDef.geometry.shapes.forEach((shape) => {
      let geometry: import("three").BufferGeometry | null = null;
      switch (shape.type) {
        case "box":
          geometry = new THREE.BoxGeometry(
            shape.scale?.[0] ?? 1,
            shape.scale?.[1] ?? 1,
            shape.scale?.[2] ?? 1,
          );
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(
            shape.scale?.[0] ?? 0.5,
            shape.scale?.[0] ?? 0.5,
            shape.scale?.[1] ?? 1,
            cylSegments,
          );
          break;
        case "sphere":
          geometry = new THREE.SphereGeometry(
            shape.scale?.[0] ?? 0.5,
            sphereSegments,
            Math.max(12, Math.floor(sphereSegments * 0.75)),
          );
          break;
        case "cone":
          geometry = new THREE.ConeGeometry(shape.scale?.[0] ?? 0.5, shape.scale?.[1] ?? 1, cylSegments);
          break;
        case "torus":
          geometry = new THREE.TorusGeometry(
            shape.scale?.[0] ?? 0.5,
            shape.scale?.[1] ?? 0.2,
            getGeometrySegments(16),
            getGeometrySegments(36),
          );
          break;
      }

      if (!geometry) {
        return;
      }

      const material = new THREE.MeshStandardMaterial({
        color: shape.color ?? "#cbd5f5",
        metalness: 0.55,
        roughness: 0.32,
        transparent: typeof shape.opacity === "number",
        opacity: shape.opacity ?? 1,
        emissive: new THREE.Color(accent).multiplyScalar(0.08),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(shape.position[0], shape.position[1] + 1.05, shape.position[2]);
      if (shape.rotation) {
        mesh.rotation.set(shape.rotation[0], shape.rotation[1], shape.rotation[2]);
      }
      core.add(mesh);
    });

    componentDef.geometry.leads.forEach((lead) => {
      const geometry = new THREE.CylinderGeometry(
        lead.radius,
        lead.radius,
        lead.length,
        getGeometrySegments(12),
      );
      const material = new THREE.MeshStandardMaterial({
        color: lead.color ?? "#e2e8f0",
        metalness: 0.92,
        roughness: 0.16,
        emissive: new THREE.Color(accent).multiplyScalar(0.05),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(lead.position[0], lead.position[1] + 1.05, lead.position[2]);
      core.add(mesh);
    });
  }
  core.scale.setScalar(1.18);
  group.add(core);

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: new THREE.Color(accent).multiplyScalar(1.25),
    metalness: 0.2,
    roughness: 0.15,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.05, 12, getGeometrySegments(48)), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.26;
  group.add(ring);

  // FUSE™ overstress smoke/heat plume — hidden until the component is stressed.
  const smokeCount = getGeometrySegments(18);
  const smokePositions = new Float32Array(smokeCount * 3);
  const smokeAges = new Float32Array(smokeCount);
  const smokeLife = new Float32Array(smokeCount);
  const smokeVel = new Float32Array(smokeCount * 3);
  for (let i = 0; i < smokeCount; i += 1) {
    seedSmokeParticle(i, smokePositions, smokeAges, smokeLife, smokeVel, true);
  }
  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(smokePositions, 3));
  const smokeMaterial = new THREE.PointsMaterial({
    color: RISK_COLORS.warning,
    size: 0.55,
    map: smokeTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  group.add(smoke);

  return {
    group,
    core,
    ring,
    pedestalMaterial,
    ringMaterial,
    glowMaterial,
    smoke,
    smokeMaterial,
    smokeAges,
    smokeLife,
    smokeVel,
    smokeCount,
    base: [0, 0, 0],
    destroyed: false,
    lastLevel: null,
  };
}

function seedSmokeParticle(
  index: number,
  positions: Float32Array,
  ages: Float32Array,
  life: Float32Array,
  velocities: Float32Array,
  randomizeAge: boolean,
): void {
  const stride = index * 3;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 0.35;
  positions[stride] = Math.cos(angle) * radius;
  positions[stride + 1] = 2.1 + Math.random() * 0.3;
  positions[stride + 2] = Math.sin(angle) * radius;
  velocities[stride] = (Math.random() - 0.5) * 0.0006;
  velocities[stride + 1] = 0.0016 + Math.random() * 0.0018;
  velocities[stride + 2] = (Math.random() - 0.5) * 0.0006;
  life[index] = 900 + Math.random() * 900;
  ages[index] = randomizeAge ? Math.random() * life[index] : 0;
}

export function ArenaScene({
  agents,
  activeAgentId,
  highlight,
  fuseResults,
  winnerId,
  transitionPhase,
  variant = "page",
  onExitTransitionComplete,
}: ArenaSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const healthBarsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const agentsRef = useRef<ArenaBattleAgent[]>(agents);
  const phaseRef = useRef<ArenaViewTransitionPhase>(transitionPhase);
  const activeAgentIdRef = useRef<string | null>(activeAgentId);
  const highlightRef = useRef<ArenaBattleHighlight | null>(highlight);
  const fuseResultsRef = useRef<FuseAnalysisResult[]>(fuseResults);
  const winnerIdRef = useRef<string | null>(winnerId);
  const lastHighlightTokenRef = useRef<number | null>(highlight?.token ?? null);
  const onExitCompleteRef = useRef(onExitTransitionComplete);

  const healthBarAgents = useMemo(() => agents, [agents]);
  const sceneAgentSignature = useMemo(
    () => agents.map((agent) => `${agent.id}:${agent.renderType}`).join("|"),
    [agents],
  );

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    phaseRef.current = transitionPhase;
  }, [transitionPhase]);

  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  useEffect(() => {
    highlightRef.current = highlight;
    if (!highlight) {
      lastHighlightTokenRef.current = null;
    }
  }, [highlight]);

  useEffect(() => {
    fuseResultsRef.current = fuseResults;
  }, [fuseResults]);

  useEffect(() => {
    winnerIdRef.current = winnerId;
  }, [winnerId]);

  useEffect(() => {
    onExitCompleteRef.current = onExitTransitionComplete;
  }, [onExitTransitionComplete]);

  useEffect(() => {
    if (!rootRef.current || !canvasRef.current) {
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let exitCompleteFired = false;
    let renderer: WebGLRenderer | null = null;
    let controls: OrbitControlsInstance | null = null;
    let particleTexture: CanvasTexture | null = null;
    let smokeTexture: CanvasTexture | null = null;

    const agentVisuals = new Map<string, AgentVisual>();
    const lastHealth = new Map<string, number>();
    const cleanupRef = { current: null as null | (() => void) };

    void Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, controlsModule]) => {
      if (isDisposed || !rootRef.current || !canvasRef.current) {
        return;
      }

      const { OrbitControls } = controlsModule;
      const root = rootRef.current;
      const canvas = canvasRef.current;
      const rendererOptions = getMobileRendererOptions();

      const scene: Scene = new THREE.Scene();
      scene.background = new THREE.Color("#020617");
      scene.fog = new THREE.FogExp2("#020617", 0.03);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: rendererOptions.antialias,
        alpha: false,
        powerPreference: rendererOptions.powerPreference,
        precision: rendererOptions.precision,
      });
      renderer.setPixelRatio(getMobilePixelRatio());
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const agentCount = agentsRef.current.length;
      const initialAspect =
        root.clientWidth / Math.max(root.clientHeight, 1) || 1.6;
      let framing = computeFraming(agentCount, initialAspect, variant);

      const camera: PerspectiveCamera = new THREE.PerspectiveCamera(45, initialAspect, 0.1, 200);
      const entryPosition = new THREE.Vector3(
        framing.position[0],
        framing.position[1] + 7,
        framing.position[2] + 10,
      );
      const arenaPosition = new THREE.Vector3(...framing.position);
      camera.position.copy(entryPosition);

      controls = new OrbitControls(camera, renderer.domElement) as OrbitControlsInstance;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = framing.distance * 0.55;
      controls.maxDistance = framing.distance * 1.9;
      controls.minPolarAngle = Math.PI / 6;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.target.set(0, framing.targetY, 0);

      const ambientLight = new THREE.AmbientLight("#93c5fd", 1.35);
      scene.add(ambientLight);

      const blueLight = new THREE.PointLight("#60a5fa", 90, 48, 2);
      blueLight.position.set(-12, 11, 14);
      scene.add(blueLight);

      const orangeLight = new THREE.PointLight("#fb923c", 80, 42, 2);
      orangeLight.position.set(13, 8, -12);
      scene.add(orangeLight);

      const rimLight = new THREE.DirectionalLight("#e2e8f0", 2.4);
      rimLight.position.set(0, 14, 10);
      scene.add(rimLight);

      const keySpot = new THREE.SpotLight("#f8fafc", 140, 60, Math.PI / 6, 0.4, 1.4);
      keySpot.position.set(0, 18, 6);
      keySpot.target.position.set(0, 1.5, 0);
      scene.add(keySpot);
      scene.add(keySpot.target);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(16, getGeometrySegments(72)),
        new THREE.MeshStandardMaterial({
          color: "#020617",
          emissive: new THREE.Color("#0b1120"),
          metalness: 0.55,
          roughness: 0.55,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      scene.add(floor);

      const grid = new THREE.GridHelper(32, 32, "#60a5fa", "#f97316");
      const gridMaterial = grid.material as import("three").Material & {
        opacity?: number;
        transparent?: boolean;
      };
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.32;
      scene.add(grid);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(12, 0.09, 16, getGeometrySegments(96)),
        new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          emissive: new THREE.Color("#38bdf8").multiplyScalar(2.1),
          roughness: 0.22,
          metalness: 0.28,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      scene.add(ring);

      const particleCount = getGeometrySegments(220);
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        const stride = index * 3;
        const radius = 5 + Math.random() * 11;
        const angle = Math.random() * Math.PI * 2;
        particlePositions[stride] = Math.cos(angle) * radius;
        particlePositions[stride + 1] = 1.5 + Math.random() * 8;
        particlePositions[stride + 2] = Math.sin(angle) * radius;
      }
      particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
      particleTexture = createCanvasTexture(THREE, "rgba(96, 165, 250, 0.95)");
      const particleMaterial = new THREE.PointsMaterial({
        color: "#bfdbfe",
        size: 0.3,
        transparent: true,
        opacity: 0.78,
        map: particleTexture,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      smokeTexture = createCanvasTexture(THREE, "rgba(248, 250, 252, 0.95)");

      agentsRef.current.forEach((agent, index) => {
        const visual = createComponentVisual(THREE, agent.renderType, agent.accent, smokeTexture!);
        const base = agentBasePosition(index, agentsRef.current.length);
        visual.base = base;
        visual.group.position.set(base[0], 0, base[2]);
        const faceOffset = index - (agentsRef.current.length - 1) / 2;
        visual.group.rotation.y = -faceOffset * 0.14;
        scene.add(visual.group);
        agentVisuals.set(agent.id, visual);
        lastHealth.set(agent.id, agent.health);
      });

      // ── Transient VFX (attack sparks, beams, defeat explosions) ──────────────
      type Burst = {
        points: Points;
        velocities: Float32Array;
        life: number;
        maxLife: number;
        gravity: number;
      };
      type Beam = { mesh: Mesh; life: number; maxLife: number };
      type Shock = { mesh: Mesh; life: number; maxLife: number; scaleTo: number };
      const bursts: Burst[] = [];
      const beams: Beam[] = [];
      const shocks: Shock[] = [];

      const spawnBurst = (
        origin: import("three").Vector3,
        color: string,
        count: number,
        speed: number,
        size: number,
        maxLife: number,
        gravity: number,
      ) => {
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
          const stride = i * 3;
          positions[stride] = origin.x;
          positions[stride + 1] = origin.y;
          positions[stride + 2] = origin.z;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const v = speed * (0.4 + Math.random() * 0.6);
          velocities[stride] = Math.sin(phi) * Math.cos(theta) * v;
          velocities[stride + 1] = Math.abs(Math.cos(phi)) * v + speed * 0.2;
          velocities[stride + 2] = Math.sin(phi) * Math.sin(theta) * v;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
          color,
          size,
          map: particleTexture,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        bursts.push({ points, velocities, life: maxLife, maxLife, gravity });
      };

      const spawnBeam = (
        from: import("three").Vector3,
        to: import("three").Vector3,
        color: string,
      ) => {
        const direction = new THREE.Vector3().subVectors(to, from);
        const length = direction.length();
        if (length < 0.001) return;
        const geometry = new THREE.CylinderGeometry(0.04, 0.12, length, 8, 1, true);
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize(),
        );
        scene.add(mesh);
        beams.push({ mesh, life: 320, maxLife: 320 });
      };

      const spawnShockwave = (origin: import("three").Vector3, color: string) => {
        const geometry = new THREE.TorusGeometry(0.5, 0.08, 10, getGeometrySegments(40));
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(origin.x, 0.4, origin.z);
        scene.add(mesh);
        shocks.push({ mesh, life: 760, maxLife: 760, scaleTo: 7 });
      };

      const disposePoints = (points: Points) => {
        scene.remove(points);
        points.geometry.dispose();
        (points.material as PointsMaterial).dispose();
      };
      const disposeMesh = (mesh: Mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as import("three").Material).dispose();
      };

      const resize = () => {
        if (!rootRef.current || !renderer) {
          return;
        }
        const width = rootRef.current.clientWidth;
        const height = rootRef.current.clientHeight;
        renderer.setSize(width, height, false);
        const aspect = width / Math.max(height, 1);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();

        framing = computeFraming(agentsRef.current.length, aspect, variant);
        arenaPosition.set(...framing.position);
        entryPosition.set(
          framing.position[0],
          framing.position[1] + 7,
          framing.position[2] + 10,
        );
        if (controls) {
          controls.minDistance = framing.distance * 0.55;
          controls.maxDistance = framing.distance * 1.9;
          controls.target.set(0, framing.targetY, 0);
        }
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);

      const tempVector = new THREE.Vector3();
      const tempActor = new THREE.Vector3();
      const tempTarget = new THREE.Vector3();
      const attackFlashUntil = new Map<string, number>();
      const targetFps = getTargetFrameRate();
      const frameInterval = 1000 / targetFps;
      let lastFrameTime = 0;
      let phaseStartTime = 0;
      let lastPhase = phaseRef.current;

      const animate = (time: number) => {
        if (isDisposed) {
          return;
        }
        animationFrameId = window.requestAnimationFrame(animate);

        if (time - lastFrameTime < frameInterval) {
          return;
        }
        const delta = lastFrameTime ? Math.min(time - lastFrameTime, 80) : 16;
        lastFrameTime = time;

        const phase = phaseRef.current;
        if (phase !== lastPhase) {
          lastPhase = phase;
          phaseStartTime = time;
          if (phase === "exiting") {
            exitCompleteFired = false;
          }
        }
        if (phaseStartTime === 0) {
          phaseStartTime = time;
        }
        const phaseElapsed = time - phaseStartTime;

        if (phase === "entering") {
          const t = Math.min(phaseElapsed / 1800, 1);
          camera.position.lerpVectors(entryPosition, arenaPosition, easeOutCubic(t));
        } else if (phase === "exiting") {
          const t = 1 - Math.min(phaseElapsed / 900, 1);
          camera.position.lerpVectors(entryPosition, arenaPosition, t);
        }
        if (controls) {
          controls.enabled = phase === "active";
          controls.update();
        }

        ring.rotation.z += 0.0015 * (delta / 16);
        particles.rotation.y += 0.0011 * (delta / 16);

        const highlightState = highlightRef.current;
        if (highlightState && highlightState.token !== lastHighlightTokenRef.current) {
          lastHighlightTokenRef.current = highlightState.token;
          attackFlashUntil.set(highlightState.actorId, time + 260);
          attackFlashUntil.set(highlightState.targetId, time + 420);

          const actorVisual = agentVisuals.get(highlightState.actorId);
          const targetVisual = agentVisuals.get(highlightState.targetId);
          if (actorVisual && targetVisual) {
            tempActor.set(actorVisual.base[0], 1.7, actorVisual.base[2]);
            tempTarget.set(targetVisual.base[0], 1.7, targetVisual.base[2]);
            const actorAgent = agentsRef.current.find((a) => a.id === highlightState.actorId);
            spawnBeam(tempActor, tempTarget, actorAgent?.accent ?? "#bae6fd");
            spawnBurst(tempTarget, "#fde68a", getGeometrySegments(22), 0.02, 0.2, 620, 0.00004);
          }
        }

        const fuseMap = fuseResultsRef.current;
        const currentWinnerId = winnerIdRef.current;

        agentsRef.current.forEach((agent) => {
          const visual = agentVisuals.get(agent.id);
          if (!visual) {
            return;
          }

          // Defeat / revival detection.
          const previousHealth = lastHealth.get(agent.id) ?? agent.health;
          if (previousHealth > 0 && agent.health <= 0 && !visual.destroyed) {
            visual.destroyed = true;
            tempVector.set(visual.base[0], 1.6, visual.base[2]);
            spawnBurst(tempVector, "#fb923c", getGeometrySegments(42), 0.03, 0.34, 900, 0.00006);
            spawnBurst(tempVector, "#f8fafc", getGeometrySegments(26), 0.024, 0.24, 760, 0.00006);
            spawnShockwave(tempVector, "#f97316");
          } else if (previousHealth <= 0 && agent.health > 0 && visual.destroyed) {
            visual.destroyed = false;
          }
          lastHealth.set(agent.id, agent.health);

          const isActive = activeAgentIdRef.current === agent.id;
          const isFlashing = (attackFlashUntil.get(agent.id) ?? 0) > time;
          const isWinner = currentWinnerId === agent.id;
          const fuse = fuseMap.find((result) => result.agentId === agent.id);
          const riskLevel: FuseRiskLevel = fuse?.riskLevel ?? "safe";
          const riskIntensity = RISK_INTENSITY[riskLevel];
          const riskColor = RISK_COLORS[riskLevel];

          const pulse = 1 + Math.sin(time * 0.004 + visual.base[0]) * 0.025;

          if (visual.destroyed) {
            visual.group.position.y = THREE.MathUtils.lerp(visual.group.position.y, -0.25, 0.08);
            const targetScale = 0.55;
            const s = THREE.MathUtils.lerp(visual.group.scale.x, targetScale, 0.08);
            visual.group.scale.setScalar(s);
            visual.core.rotation.z = THREE.MathUtils.lerp(visual.core.rotation.z, 0.5, 0.05);
            visual.pedestalMaterial.emissiveIntensity = 0.05;
            visual.ringMaterial.emissive.set("#1f2937");
            visual.glowMaterial.opacity = THREE.MathUtils.lerp(visual.glowMaterial.opacity, 0.08, 0.08);
            visual.smokeMaterial.opacity = THREE.MathUtils.lerp(visual.smokeMaterial.opacity, 0.85, 0.05);
            visual.smokeMaterial.color.set("#475569");
          } else {
            const lift = isActive ? 0.24 + Math.sin(time * 0.01) * 0.08 : 0.04 * pulse;
            const winnerLift = isWinner ? 0.35 + Math.sin(time * 0.005) * 0.12 : 0;
            visual.group.position.y = lift + winnerLift;
            const scale = isWinner ? 1.16 : isActive ? 1.08 : pulse;
            visual.group.scale.setScalar(THREE.MathUtils.lerp(visual.group.scale.x, scale, 0.18));
            visual.core.rotation.y += 0.0035 * (delta / 16);
            visual.core.rotation.z = THREE.MathUtils.lerp(visual.core.rotation.z, 0, 0.1);

            const flashBoost = isFlashing ? 1.2 : 0;
            visual.pedestalMaterial.emissiveIntensity = 0.25 + flashBoost + (isActive ? 0.4 : 0);

            // FUSE™ risk drives ring colour + glow; winner overrides to gold.
            if (isWinner) {
              visual.ringMaterial.color.set("#fbbf24");
              visual.ringMaterial.emissive.set("#f59e0b");
              visual.ringMaterial.emissiveIntensity = 1.6 + Math.sin(time * 0.008) * 0.4;
            } else if (riskIntensity > 0) {
              const blink = 1 + Math.sin(time * (0.006 + riskIntensity * 0.012)) * riskIntensity;
              visual.ringMaterial.color.set(riskColor);
              visual.ringMaterial.emissive.set(riskColor);
              visual.ringMaterial.emissiveIntensity = 0.8 + riskIntensity * blink;
            } else {
              visual.ringMaterial.color.set(agent.accent);
              visual.ringMaterial.emissive.set(agent.accent);
              visual.ringMaterial.emissiveIntensity = 1.0;
            }

            visual.glowMaterial.opacity = THREE.MathUtils.lerp(
              visual.glowMaterial.opacity,
              0.4 + (isActive ? 0.25 : 0) + riskIntensity * 0.3,
              0.1,
            );

            // Overstress smoke plume.
            const targetSmokeOpacity = riskIntensity > 0 ? 0.25 + riskIntensity * 0.55 : 0;
            visual.smokeMaterial.opacity = THREE.MathUtils.lerp(
              visual.smokeMaterial.opacity,
              targetSmokeOpacity,
              0.08,
            );
            if (visual.lastLevel !== riskLevel) {
              visual.lastLevel = riskLevel;
              if (riskIntensity > 0) {
                visual.smokeMaterial.color.set(riskColor);
              }
            }
          }

          updateSmoke(visual, delta, riskIntensity > 0 || visual.destroyed);

          const healthBar = healthBarsRef.current[agent.id];
          if (healthBar) {
            tempVector.set(visual.group.position.x, 3.4, visual.group.position.z);
            tempVector.project(camera);
            const x = (tempVector.x * 0.5 + 0.5) * root.clientWidth;
            const y = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
            const isVisible = tempVector.z < 1.2 && tempVector.z > -1;
            healthBar.style.opacity = isVisible ? "1" : "0";
            healthBar.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          }
        });

        // Update transient bursts.
        for (let i = bursts.length - 1; i >= 0; i -= 1) {
          const burst = bursts[i];
          burst.life -= delta;
          const positions = burst.points.geometry.getAttribute("position") as import("three").BufferAttribute;
          const array = positions.array as Float32Array;
          for (let p = 0; p < array.length; p += 3) {
            burst.velocities[p + 1] -= burst.gravity * delta;
            array[p] += burst.velocities[p] * delta;
            array[p + 1] += burst.velocities[p + 1] * delta;
            array[p + 2] += burst.velocities[p + 2] * delta;
          }
          positions.needsUpdate = true;
          (burst.points.material as PointsMaterial).opacity = Math.max(0, burst.life / burst.maxLife);
          if (burst.life <= 0) {
            disposePoints(burst.points);
            bursts.splice(i, 1);
          }
        }

        for (let i = beams.length - 1; i >= 0; i -= 1) {
          const beam = beams[i];
          beam.life -= delta;
          (beam.mesh.material as import("three").MeshBasicMaterial).opacity = Math.max(
            0,
            (beam.life / beam.maxLife) * 0.9,
          );
          if (beam.life <= 0) {
            disposeMesh(beam.mesh);
            beams.splice(i, 1);
          }
        }

        for (let i = shocks.length - 1; i >= 0; i -= 1) {
          const shock = shocks[i];
          shock.life -= delta;
          const progress = 1 - shock.life / shock.maxLife;
          const scale = 1 + progress * shock.scaleTo;
          shock.mesh.scale.set(scale, scale, scale);
          (shock.mesh.material as import("three").MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
          if (shock.life <= 0) {
            disposeMesh(shock.mesh);
            shocks.splice(i, 1);
          }
        }

        if (phase === "exiting" && phaseElapsed > 950 && !exitCompleteFired) {
          exitCompleteFired = true;
          onExitCompleteRef.current();
        }

        renderer?.render(scene, camera);
      };

      animationFrameId = window.requestAnimationFrame(animate);

      // Cleanup helpers captured for disposal.
      cleanupRef.current = () => {
        bursts.forEach((burst) => disposePoints(burst.points));
        beams.forEach((beam) => disposeMesh(beam.mesh));
        shocks.forEach((shock) => disposeMesh(shock.mesh));
        scene.traverse((object) => {
          const mesh = object as Partial<Mesh> & { geometry?: import("three").BufferGeometry; material?: unknown };
          mesh.geometry?.dispose?.();
          const material = mesh.material;
          if (Array.isArray(material)) {
            material.forEach((m) => (m as import("three").Material).dispose?.());
          } else if (material) {
            (material as import("three").Material).dispose?.();
          }
        });
      };
    });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      controls?.dispose();
      cleanupRef.current?.();
      particleTexture?.dispose();
      smokeTexture?.dispose();
      renderer?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneAgentSignature, variant]);

  return (
    <div ref={rootRef} className="arena-scene">
      <canvas ref={canvasRef} className="arena-scene__canvas" />
      <div className="arena-scene__healthbars">
        {healthBarAgents.map((agent) => {
          const healthPercent = Math.max(0, (agent.health / agent.maxHealth) * 100);
          return (
            <div
              key={agent.id}
              ref={(element) => {
                healthBarsRef.current[agent.id] = element;
              }}
              className={`arena-healthbar${agent.health <= 0 ? " is-defeated" : ""}`}
            >
              <span className="arena-healthbar__label">{agent.name}</span>
              <div className="arena-healthbar__track">
                <span style={{ width: `${healthPercent}%`, backgroundColor: agent.accent }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function updateSmoke(visual: AgentVisual, delta: number, active: boolean): void {
  const positions = visual.smoke.geometry.getAttribute("position") as import("three").BufferAttribute;
  const array = positions.array as Float32Array;
  for (let i = 0; i < visual.smokeCount; i += 1) {
    const stride = i * 3;
    visual.smokeAges[i] += delta;
    if (visual.smokeAges[i] >= visual.smokeLife[i]) {
      if (active) {
        seedSmokeParticle(i, array, visual.smokeAges, visual.smokeLife, visual.smokeVel, false);
      } else {
        visual.smokeAges[i] = 0;
      }
      continue;
    }
    array[stride] += visual.smokeVel[stride] * delta;
    array[stride + 1] += visual.smokeVel[stride + 1] * delta;
    array[stride + 2] += visual.smokeVel[stride + 2] * delta;
  }
  positions.needsUpdate = true;
}
