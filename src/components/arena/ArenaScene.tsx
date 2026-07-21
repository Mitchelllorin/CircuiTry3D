import { useEffect, useMemo, useRef } from "react";
import { getComponent3D } from "../circuit/Component3DLibrary";
import { ArenaTestControls } from "./ArenaInstrumentation";
import { STRESS_MAX } from "./stressTest";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaBattleStatus,
  ArenaViewTransitionPhase,
} from "./types";

type ArenaSceneProps = {
  agents: ArenaBattleAgent[];
  /** The component currently under the most stress (subtle ring highlight). */
  activeAgentId: string | null;
  highlight: ArenaBattleHighlight | null;
  transitionPhase: ArenaViewTransitionPhase;
  /** Bench status — drives the global heat tint of the arena ring. */
  status?: ArenaBattleStatus;
  /** Current load multiple (1 → stressMax) — drives global heat. */
  stressFactor?: number;
  /** Peak of the active scenario's load ramp (× nominal). */
  stressMax?: number;
  /** Test progress 0→1 — feeds the in-scene load-ramp gauge. */
  progress?: number;
  /** Start/re-run the stress test (the in-scene BATTLE button). */
  onStartTest?: () => void;
  /** Name of the most-robust component, shown in the verdict. */
  winnerName?: string | null;
  /** How many components survived — shown in the verdict. */
  survivorCount?: number;
  onExitTransitionComplete: () => void;
  /**
   * When true the camera follows the workspace flow: it holds a framed preview
   * pose while the params panel is open, then cinematically sweeps into the
   * interactive pose (full orbit + zoom) once the panel collapses.
   */
  workspaceMode?: boolean;
  /** Workspace mode only: whether the params panel is currently expanded. */
  panelOpen?: boolean;
  /** Solo bench mode — the in-scene control reads "TEST" instead of "BATTLE". */
  solo?: boolean;
};

const PHASE_LABEL: Record<string, string> = {
  nominal: "OK",
  stressed: "STRESS",
  critical: "CRIT",
  failed: "FAILED",
};

function fmtAmps(amps: number): string {
  if (!Number.isFinite(amps)) return "—";
  return amps >= 1 ? `${amps.toFixed(2)}A` : `${Math.round(amps * 1000)}mA`;
}

/** Duration (ms) of the violent flash-punch when a component fails. */
const FAIL_POP_MS = 900;

type OrbitControlsInstance = {
  enabled: boolean;
  enablePan: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  target: import("three").Vector3;
  update: () => void;
  dispose: () => void;
  addEventListener: (type: string, listener: () => void) => void;
};

// How far the gladiators ring out from the centre. Kept fairly tight so parts
// stay clustered near the middle and their floating readouts don't drift off the
// frame edges (the dome/floor sizing is independent of this).
const ARENA_RADIUS = 4.5;

function createCanvasTexture(
  THREE: typeof import("three"),
  fillStyle: string,
): import("three").CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, fillStyle);
    gradient.addColorStop(0.35, "rgba(255,255,255,0.75)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(64, 64, 64, 0, Math.PI * 2);
    context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

function createComponentGroup(
  THREE: typeof import("three"),
  componentType: string,
  accent: string,
): import("three").Group {
  const componentDef = getComponent3D(componentType) ?? getComponent3D("resistor");
  const group = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.08, 0.32, 28),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.75,
      roughness: 0.28,
      emissive: new THREE.Color(accent).multiplyScalar(0.2),
    }),
  );
  pedestal.position.y = 0.16;
  group.add(pedestal);

  if (!componentDef) {
    return group;
  }

  const core = new THREE.Group();
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
          24,
        );
        break;
      case "sphere":
        geometry = new THREE.SphereGeometry(shape.scale?.[0] ?? 0.5, 24, 18);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[1] ?? 1,
          24,
        );
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(
          shape.scale?.[0] ?? 0.5,
          shape.scale?.[1] ?? 0.2,
          14,
          36,
        );
        break;
    }

    if (!geometry) {
      return;
    }

    const material = new THREE.MeshStandardMaterial({
      color: shape.color ?? "#94a3b8",
      metalness: 0.62,
      roughness: 0.35,
      transparent: typeof shape.opacity === "number",
      opacity: shape.opacity ?? 1,
      emissive: new THREE.Color(accent).multiplyScalar(0.06),
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(shape.position[0], shape.position[1] + 1.05, shape.position[2]);

    if (shape.rotation) {
      mesh.rotation.set(shape.rotation[0], shape.rotation[1], shape.rotation[2]);
    }

    core.add(mesh);
  });

  componentDef.geometry.leads.forEach((lead) => {
    const geometry = new THREE.CylinderGeometry(lead.radius, lead.radius, lead.length, 12);
    const material = new THREE.MeshStandardMaterial({
      color: lead.color ?? "#e2e8f0",
      metalness: 0.9,
      roughness: 0.18,
      emissive: new THREE.Color(accent).multiplyScalar(0.04),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(lead.position[0], lead.position[1] + 1.05, lead.position[2]);
    core.add(mesh);
  });

  const outlineRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.045, 12, 48),
    new THREE.MeshStandardMaterial({
      // Muted physical ring, NOT a lit halo — the bright accent glow here read as
      // a permanent "selected/highlighted blue" state on every part.
      color: "#475569",
      emissive: new THREE.Color(accent).multiplyScalar(0.12),
      metalness: 0.2,
      roughness: 0.15,
    }),
  );
  outlineRing.rotation.x = Math.PI / 2;
  outlineRing.position.y = 0.24;

  core.scale.setScalar(1.15);
  // Tag the component body so the stress animation can shake ONLY this — never
  // the pedestal/dais, ring, or the floating metrics anchored to the seat.
  core.name = "core";
  group.add(core);
  group.add(outlineRing);

  return group;
}

export function ArenaScene({
  agents,
  activeAgentId,
  highlight,
  transitionPhase,
  status = "ready",
  stressFactor = 1,
  stressMax = STRESS_MAX,
  progress = 0,
  onStartTest,
  winnerName = null,
  survivorCount = 0,
  onExitTransitionComplete,
  workspaceMode = false,
  panelOpen = false,
  solo = false,
}: ArenaSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const healthBarsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const agentsRef = useRef<ArenaBattleAgent[]>(agents);
  const phaseRef = useRef<ArenaViewTransitionPhase>(transitionPhase);
  const activeAgentIdRef = useRef<string | null>(activeAgentId);
  const highlightRef = useRef<ArenaBattleHighlight | null>(highlight);
  const lastHighlightTokenRef = useRef<number | null>(highlight?.token ?? null);
  const onExitCompleteRef = useRef(onExitTransitionComplete);
  const workspaceModeRef = useRef(workspaceMode);
  const panelOpenRef = useRef(panelOpen);
  const statusRef = useRef<ArenaBattleStatus>(status);
  const stressFactorRef = useRef(stressFactor);
  const stressMaxRef = useRef(stressMax);
  stressMaxRef.current = stressMax;

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
    onExitCompleteRef.current = onExitTransitionComplete;
  }, [onExitTransitionComplete]);

  useEffect(() => {
    workspaceModeRef.current = workspaceMode;
  }, [workspaceMode]);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    stressFactorRef.current = stressFactor;
  }, [stressFactor]);

  useEffect(() => {
    if (!rootRef.current || !canvasRef.current) {
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let exitCompleteFired = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let controls: OrbitControlsInstance | null = null;
    let particleTexture: import("three").CanvasTexture | null = null;

    const agentObjects = new Map<
      string,
      {
        group: import("three").Group;
        core: import("three").Object3D | null;
        materials: import("three").MeshStandardMaterial[];
        baseColor: import("three").Color;
      }
    >();

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

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#020617");
      scene.fog = new THREE.FogExp2("#020617", 0.032);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const isWorkspace = workspaceModeRef.current;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
      const entryPosition = new THREE.Vector3(0, 17, 24);
      // Pulled back so the WHOLE dome + all gladiators frame in by default; the
      // user can zoom in freely once they take control.
      const arenaPosition = new THREE.Vector3(14, 11, 14);
      // Workspace flow poses: a framed cinematic preview held behind the open
      // panel, and a pulled-back pose used for the exit sweep.
      const previewPosition = new THREE.Vector3(0, 17, 24);
      const exitPosition = new THREE.Vector3(0, 22, 32);
      const cameraTarget = new THREE.Vector3(0, 1.8, 0);
      camera.position.copy(isWorkspace ? previewPosition : entryPosition);

      controls = new OrbitControls(
        camera,
        renderer.domElement,
      ) as OrbitControlsInstance;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.copy(cameraTarget);
      if (isWorkspace) {
        // Flagship "full 3D 360°" control — the works: free orbit, deep zoom, pan.
        controls.enablePan = true;
        controls.minDistance = 4;
        controls.maxDistance = 42;
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = Math.PI * 0.88;
      } else {
        controls.enablePan = false;
        controls.minDistance = 8;
        controls.maxDistance = 26;
        controls.minPolarAngle = Math.PI / 5;
        controls.maxPolarAngle = Math.PI / 2.05;
      }

      // ── Cinematic idle sweep ──────────────────────────────────────────────
      // When nobody is touching the camera, the dome slowly orbits itself so the
      // scene is never a frozen still. The instant the user grabs it (OrbitControls
      // fires 'start'), the sweep cuts out and they get full manual 360°; it resumes
      // a couple of seconds after they let go. autoRotate is toggled per-frame in
      // the animate loop (only while the user actually holds control).
      const IDLE_RESUME_MS = 2600;
      let lastCameraInteract = Number.NEGATIVE_INFINITY;
      const orbit = controls; // non-null here; stable ref for the deferred listener
      orbit.autoRotate = false;
      orbit.autoRotateSpeed = 1.4;
      orbit.addEventListener("start", () => {
        lastCameraInteract = performance.now();
        orbit.autoRotate = false;
      });


      const ambientLight = new THREE.AmbientLight("#60a5fa", 1.6);
      scene.add(ambientLight);

      const blueLight = new THREE.PointLight("#60a5fa", 80, 40, 2);
      blueLight.position.set(-10, 9, 12);
      scene.add(blueLight);

      const orangeLight = new THREE.PointLight("#fb923c", 72, 36, 2);
      orangeLight.position.set(12, 7, -10);
      scene.add(orangeLight);

      const rimLight = new THREE.DirectionalLight("#e2e8f0", 2.6);
      rimLight.position.set(0, 12, 8);
      scene.add(rimLight);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(15, 72),
        new THREE.MeshStandardMaterial({
          color: "#020617",
          emissive: new THREE.Color("#0f172a"),
          metalness: 0.5,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      scene.add(floor);

      const grid = new THREE.GridHelper(30, 30, "#60a5fa", "#f97316");
      const gridMaterial = grid.material as import("three").Material & {
        opacity?: number;
        transparent?: boolean;
      };
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.34;
      scene.add(grid);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(11, 0.09, 16, 96),
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

      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(240 * 3);
      for (let index = 0; index < 240; index += 1) {
        const stride = index * 3;
        const radius = 5 + Math.random() * 11;
        const angle = Math.random() * Math.PI * 2;
        particlePositions[stride] = Math.cos(angle) * radius;
        particlePositions[stride + 1] = 1.5 + Math.random() * 8;
        particlePositions[stride + 2] = Math.sin(angle) * radius;
      }
      particleGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(particlePositions, 3),
      );
      particleTexture = createCanvasTexture(THREE, "rgba(96, 165, 250, 0.95)");
      const particleMaterial = new THREE.PointsMaterial({
        color: "#bfdbfe",
        size: 0.3,
        transparent: true,
        opacity: 0.8,
        map: particleTexture,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Solo bench (a single part on the floor) sits dead-centre so the camera
      // frames it head-on; battle mode rings the parts around the arena edge.
      const isSolo = agentsRef.current.length === 1;
      agentsRef.current.forEach((agent) => {
        const group = createComponentGroup(THREE, agent.renderType, agent.accent);
        group.position.set(
          isSolo ? 0 : Math.cos(agent.spawnAngle) * ARENA_RADIUS,
          0.04,
          isSolo ? 0 : Math.sin(agent.spawnAngle) * ARENA_RADIUS,
        );
        group.rotation.y = isSolo ? 0 : -agent.spawnAngle + Math.PI / 2;
        scene.add(group);
        // Collect every standard material so we can drive a heat glow across the
        // whole part (body, leads, ring) as its temperature climbs.
        const materials: import("three").MeshStandardMaterial[] = [];
        group.traverse((object) => {
          const mesh = object as import("three").Mesh;
          const material = mesh.material as
            | import("three").MeshStandardMaterial
            | undefined;
          if (material && (material as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) {
            materials.push(material);
          }
        });
        agentObjects.set(agent.id, {
          group,
          core: group.getObjectByName("core") ?? null,
          materials,
          // Resting emissive is a NEUTRAL near-black, NOT the accent — otherwise the
          // heat loop bathes the whole part in its team colour at rest (one all
          // orange, one all blue), which read as a permanent "highlighted" state.
          // Parts now show their real materials and only glow HOT (orange→white) as
          // they're actually stressed.
          baseColor: new THREE.Color("#141821"),
        });
      });

      const resize = () => {
        if (!rootRef.current || !renderer) {
          return;
        }
        const width = rootRef.current.clientWidth;
        const height = rootRef.current.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);

      const tempVector = new THREE.Vector3();
      // Reusable target for the panel-open preview: a slow cinematic sway that
      // keeps the framed hero shot feeling alive without handing over control.
      const previewDrift = new THREE.Vector3();
      const previewRadius = Math.hypot(previewPosition.x, previewPosition.z);
      const attackFlashUntil = new Map<string, number>();
      // Reusable colours for the per-frame thermal glow (avoid per-agent allocs).
      const heatHot = new THREE.Color("#ff5512");
      const heatWhite = new THREE.Color("#ffe2b0");
      const charColor = new THREE.Color("#140d06");
      const tmpHeatColor = new THREE.Color();
      const ringMaterial = ring.material as import("three").MeshStandardMaterial;
      const clampNum = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      let phaseStartTime = 0;
      let lastPhase = phaseRef.current;
      // Workspace flow: latches true once the cinematic sweep into the arena
      // finishes, after which the user holds full orbit control until the panel
      // re-opens (which resets it) or the arena exits.
      let workspaceSweepDone = false;

      const animate = (time: number) => {
        if (isDisposed) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(animate);

        if (!controls || !renderer) {
          return;
        }

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

        if (workspaceModeRef.current) {
          // Workspace flow — the camera is driven entirely by panel state.
          if (phase === "exiting") {
            controls.enabled = false;
            workspaceSweepDone = false;
            camera.position.lerp(exitPosition, 0.07);
            camera.lookAt(cameraTarget);
            if (!exitCompleteFired && camera.position.distanceTo(exitPosition) < 0.8) {
              exitCompleteFired = true;
              onExitCompleteRef.current();
            }
          } else if (panelOpenRef.current) {
            // Panel open: hold a slowly swaying cinematic preview, no user
            // control. The camera arcs ±18° around the arena and gently bobs so
            // the framed hero shot reads as alive rather than a frozen still.
            controls.enabled = false;
            workspaceSweepDone = false;
            const swayAngle = Math.sin(time * 0.00018) * 0.32;
            previewDrift.set(
              Math.sin(swayAngle) * previewRadius,
              previewPosition.y + Math.sin(time * 0.0003) * 0.6,
              Math.cos(swayAngle) * previewRadius,
            );
            camera.position.lerp(previewDrift, 0.04);
            camera.lookAt(cameraTarget);
          } else if (!workspaceSweepDone) {
            // Panel just collapsed: cinematic sweep into the interactive pose.
            controls.enabled = false;
            camera.position.lerp(arenaPosition, 0.06);
            camera.lookAt(cameraTarget);
            if (camera.position.distanceTo(arenaPosition) < 0.4) {
              workspaceSweepDone = true;
              controls.enabled = true;
              controls.update();
            }
          } else {
            // Sweep complete: full orbit + zoom in the user's hands, with the
            // cinematic idle sweep resuming whenever they haven't touched it.
            controls.enabled = true;
            controls.autoRotate = time - lastCameraInteract > IDLE_RESUME_MS;
            controls.update();
          }
        } else {
          // Non-workspace (full-screen) flow: drive the camera along the fixed
          // cinematic entry/exit path, then hand control to OrbitControls once
          // the battle is active so free-orbit can take hold.
          const cinematicT =
            phase === "entering"
              ? Math.min(phaseElapsed / 1800, 1)
              : phase === "exiting"
                ? 1 - Math.min(phaseElapsed / 900, 1)
                : 1;
          if (phase !== "active") {
            camera.position.lerpVectors(entryPosition, arenaPosition, cinematicT);
          }
          controls.enabled = phase === "active";
          controls.autoRotate =
            controls.enabled && time - lastCameraInteract > IDLE_RESUME_MS;
          controls.update();
        }


        ring.rotation.z += 0.0015;
        particles.rotation.y += 0.0011;

        // The arena ring heats up with the global load ramp — a calm cyan at
        // rest, glowing hot amber as the bench drives the components hard.
        const loadT =
          statusRef.current === "ready"
            ? 0
            : clampNum(
                (stressFactorRef.current - 1) /
                  Math.max(stressMaxRef.current - 1, 0.001),
                0,
                1,
              );
        ringMaterial.emissiveIntensity = 1.6 + loadT * 2.4;

        const highlightState = highlightRef.current;
        if (highlightState && highlightState.token !== lastHighlightTokenRef.current) {
          lastHighlightTokenRef.current = highlightState.token;
          attackFlashUntil.set(
            highlightState.agentId,
            time + (highlightState.kind === "fail" ? FAIL_POP_MS : 320),
          );
        }

        agentsRef.current.forEach((agent) => {
          const objectEntry = agentObjects.get(agent.id);
          if (!objectEntry) {
            return;
          }

          const { group, core, materials, baseColor } = objectEntry;
          // Only the component body (core) ever moves under stress — the dais,
          // ring and the metrics nameplate stay rock-steady at the seat.
          const shaker = core ?? group;
          const isFailed = agent.phase === "failed";
          const isMostStressed = activeAgentIdRef.current === agent.id && !isFailed;
          const isFlashing = (attackFlashUntil.get(agent.id) ?? 0) > time;
          const severity = agent.severity;
          const isSolo = agentsRef.current.length === 1;
          const seatX = isSolo ? 0 : Math.cos(agent.spawnAngle) * ARENA_RADIUS;
          const seatZ = isSolo ? 0 : Math.sin(agent.spawnAngle) * ARENA_RADIUS;
          const ph = agent.spawnAngle * 7;

          // How hot the part is running (also drives the glow). Beyond 1 = over
          // the junction limit.
          const heatT = clampNum(
            (agent.tempC - 40) / Math.max(agent.ratings.junctionLimitC - 40, 30),
            0,
            1.4,
          );

          if (isFailed) {
            // ── Death throes ── a violent white flash-punch as the part lets go,
            // then it collapses charred and dark onto its pedestal.
            const flashEnd = attackFlashUntil.get(agent.id) ?? 0;
            const popping = flashEnd > time;
            const popT = popping ? (flashEnd - time) / FAIL_POP_MS : 0; // 1 → 0
            // Dais stays put; the body alone convulses then collapses.
            group.position.set(seatX, 0.04, seatZ);
            const coreBase = core ? 1.15 : 1;
            const shake = popping ? 0.16 * popT : 0;
            shaker.position.x = (Math.random() - 0.5) * shake;
            shaker.position.z = (Math.random() - 0.5) * shake;
            shaker.position.y = popping ? 0.06 + popT * 0.35 : 0.0;
            shaker.rotation.z = popping ? (Math.random() - 0.5) * 0.22 * popT : 0;
            shaker.scale.setScalar(
              coreBase * (popping ? 0.85 + Math.sin(popT * Math.PI) * 0.55 : 0.85),
            );
            tmpHeatColor.copy(popping ? heatWhite : charColor);
            const failEmissive = popping ? 0.4 + popT * 2.4 : 0.05;
            for (const material of materials) {
              material.emissive.copy(tmpHeatColor);
              material.emissiveIntensity = failEmissive;
            }
          } else {
            // ── Live stress ── shake + heat ramp with how hard the part is being
            // driven (severity, temperature, OR percent-of-rating), so even a
            // robust part that never fails visibly strains as the load climbs.
            const stressLevel = clampNum(
              Math.max(severity / 2, heatT * 0.9, agent.loadPercent / 130),
              0,
              1.3,
            );
            // A small, quick tremor on the BODY only — reads as "straining" in
            // place. The dais and the metrics nameplate never move; the heat
            // glow (below) does the heavy lifting of showing stress.
            const coreBase = core ? 1.15 : 1;
            const jitterAmp = 0.006 + stressLevel * 0.03;
            const freq = 0.02 + stressLevel * 0.06;
            group.position.set(seatX, 0.04, seatZ);
            shaker.position.x = Math.sin(time * freq * 1.3 + ph) * jitterAmp;
            shaker.position.z = Math.cos(time * freq + ph) * jitterAmp;
            shaker.position.y = Math.abs(Math.sin(time * freq)) * stressLevel * 0.02;
            shaker.rotation.z = Math.sin(time * freq * 1.7 + ph) * stressLevel * 0.03;
            shaker.scale.setScalar(
              coreBase * ((isMostStressed ? 1.04 : 1.0) + stressLevel * 0.04),
            );

            if (heatT <= 1) {
              tmpHeatColor.copy(baseColor).lerp(heatHot, heatT);
            } else {
              tmpHeatColor.copy(heatHot).lerp(heatWhite, clampNum(heatT - 1, 0, 1) / 0.4);
            }
            const emissiveIntensity =
              0.22 +
              heatT * 1.3 +
              stressLevel * 0.5 +
              (isFlashing ? 0.9 : 0) +
              (isMostStressed ? 0.25 : 0);
            for (const material of materials) {
              material.emissive.copy(tmpHeatColor);
              material.emissiveIntensity = emissiveIntensity;
            }
          }

          const healthBar = healthBarsRef.current[agent.id];
          if (!healthBar) {
            return;
          }

          // Anchor the floating metric nameplate to the part's STABLE seat, not its
          // live (jittering) group position — so the component shakes under stress
          // but its readout stays put and legible.
          tempVector.set(seatX, 3.2, seatZ);
          tempVector.project(camera);

          const rawX = (tempVector.x * 0.5 + 0.5) * root.clientWidth;
          const rawY = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
          const isVisible = tempVector.z < 1.2 && tempVector.z > -1;
          // Keep the readout fully on-screen even when a part sits near the frame
          // edge — clamp the anchor inward by the plate's own half-size (+ margin)
          // so labels never clip off the left / right / top.
          const halfW = (healthBar.offsetWidth || 140) / 2 + 6;
          const halfH = (healthBar.offsetHeight || 44) / 2 + 6;
          const x = Math.min(Math.max(rawX, halfW), root.clientWidth - halfW);
          const y = Math.min(Math.max(rawY, halfH), root.clientHeight - halfH);
          healthBar.style.opacity = isVisible ? "1" : "0";
          healthBar.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        });

        if (
          !workspaceModeRef.current &&
          phase === "exiting" &&
          phaseElapsed > 950 &&
          !exitCompleteFired
        ) {
          exitCompleteFired = true;
          onExitCompleteRef.current();
        }

        renderer.render(scene, camera);
      };

      animationFrameId = window.requestAnimationFrame(animate);
    });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      controls?.dispose();
      particleTexture?.dispose();
      renderer?.dispose();
    };
  }, [sceneAgentSignature]);

  return (
    <div ref={rootRef} className="arena-scene">
      <canvas ref={canvasRef} className="arena-scene__canvas" />
      {/* F.U.S.E.™ mark — the engine powering the failure physics, same little
          corner watermark the main builder UI carries. */}
      <div
        className="arena-fuse-watermark"
        role="img"
        aria-label="Powered by F.U.S.E.™ — Failure Understanding Simulation Engine"
      >
        ⚡ F.U.S.E.™
        <span className="arena-fuse-watermark__sub">
          Failure Understanding Simulation Engine
        </span>
      </div>
      {/* The BATTLE control lives ON the 3D stage in immersive workspace mode, so
          the test is started and watched entirely in 3D. When the params panel is
          open the panel carries the controls instead. */}
      {workspaceMode && !panelOpen ? (
        <div className="arena-scene__console">
          <ArenaTestControls
            status={status}
            stressFactor={stressFactor}
            progress={progress}
            winnerName={winnerName}
            survivorCount={survivorCount}
            totalCount={agents.length}
            stressMax={stressMax}
            solo={solo}
            onStartTest={onStartTest ?? (() => undefined)}
          />
        </div>
      ) : null}
      <div className="arena-scene__healthbars">
        {healthBarAgents.map((agent) => {
          const isFailed = agent.phase === "failed";
          // Live current at the present load — a failed (open) part carries none.
          const liveAmps = isFailed ? 0 : agent.metrics.current * stressFactor;
          const overTemp = agent.tempC > agent.ratings.junctionLimitC;
          return (
            <div
              key={agent.id}
              ref={(element) => {
                healthBarsRef.current[agent.id] = element;
              }}
              className={`arena-nameplate arena-nameplate--${agent.phase}${
                isFailed ? " is-defeated" : ""
              }`}
            >
              <div className="arena-nameplate__head">
                <span className="arena-nameplate__name">
                  {(agent.componentType || "part").toUpperCase()}
                </span>
                <span className="arena-nameplate__status">{PHASE_LABEL[agent.phase]}</span>
              </div>
              <div className="arena-nameplate__ident">
                {agent.componentNumber ?? ""}
                {agent.name && agent.name !== agent.componentNumber
                  ? `${agent.componentNumber ? " · " : ""}${agent.name}`
                  : ""}
              </div>
              <div className="arena-nameplate__metrics">
                <span className={overTemp ? "is-hot" : undefined}>
                  <em>Temp</em>
                  <b>
                    {Math.round(agent.tempC)}°<i>/{Math.round(agent.ratings.junctionLimitC)}°</i>
                  </b>
                </span>
                <span className={agent.loadPercent > 100 ? "is-hot" : undefined}>
                  <em>Load</em>
                  <b>{Math.round(agent.loadPercent)}%</b>
                </span>
                <span className={isFailed ? "is-open" : undefined}>
                  <em>Current</em>
                  <b>{isFailed ? "OPEN" : fmtAmps(liveAmps)}</b>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
