import { useEffect, useMemo, useRef } from "react";
import { getComponent3D } from "../circuit/Component3DLibrary";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaViewTransitionPhase,
} from "./types";

type ArenaSceneProps = {
  agents: ArenaBattleAgent[];
  activeAgentId: string | null;
  highlight: ArenaBattleHighlight | null;
  transitionPhase: ArenaViewTransitionPhase;
  onExitTransitionComplete: () => void;
};

type OrbitControlsInstance = {
  enabled: boolean;
  enablePan: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  target: { set: (x: number, y: number, z: number) => void };
  update: () => void;
  dispose: () => void;
};

const ARENA_RADIUS = 7.5;

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
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(1.25),
      metalness: 0.2,
      roughness: 0.15,
    }),
  );
  outlineRing.rotation.x = Math.PI / 2;
  outlineRing.position.y = 0.24;

  core.scale.setScalar(1.15);
  group.add(core);
  group.add(outlineRing);

  return group;
}

export function ArenaScene({
  agents,
  activeAgentId,
  highlight,
  transitionPhase,
  onExitTransitionComplete,
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

    const agentObjects = new Map<string, { group: import("three").Group }>();

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

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
      const entryPosition = new THREE.Vector3(0, 17, 24);
      const arenaPosition = new THREE.Vector3(11, 8.5, 11);
      camera.position.copy(entryPosition);

      controls = new OrbitControls(
        camera,
        renderer.domElement,
      ) as OrbitControlsInstance;
      controls.enablePan = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 38;
      // Full 360° freedom — orbit all the way over the top and down underneath.
      // A tiny epsilon at the poles avoids the gimbal flip you get when the
      // camera looks straight up/down the Y axis.
      controls.minPolarAngle = 0.001;
      controls.maxPolarAngle = Math.PI - 0.001;
      controls.target.set(0, 1.6, 0);

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

      agentsRef.current.forEach((agent) => {
        const group = createComponentGroup(THREE, agent.renderType, agent.accent);
        const radius = ARENA_RADIUS + (agent.health <= 0 ? 0.15 : 0);
        group.position.set(
          Math.cos(agent.spawnAngle) * radius,
          0,
          Math.sin(agent.spawnAngle) * radius,
        );
        group.rotation.y = -agent.spawnAngle + Math.PI / 2;
        scene.add(group);
        agentObjects.set(agent.id, { group });
      });

      const resize = () => {
        if (!rootRef.current) {
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
      const attackFlashUntil = new Map<string, number>();
      let phaseStartTime = 0;
      let lastPhase = phaseRef.current;

      const animate = (time: number) => {
        if (isDisposed) {
          return;
        }

        animationFrameId = window.requestAnimationFrame(animate);

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
        const cinematicT =
          phase === "entering"
            ? Math.min(phaseElapsed / 1800, 1)
            : phase === "exiting"
              ? 1 - Math.min(phaseElapsed / 900, 1)
              : 1;
        // During the cinematic entry/exit we drive the camera along a fixed
        // path. Once the battle is "active" we hand the camera fully over to
        // OrbitControls — otherwise this line would yank it back to a fixed
        // vantage every frame and free-orbit could never take hold.
        if (phase !== "active") {
          camera.position.lerpVectors(entryPosition, arenaPosition, cinematicT);
        }
        controls.enabled = phase === "active";
        controls.update();

        ring.rotation.z += 0.0015;
        particles.rotation.y += 0.0011;

        const highlightState = highlightRef.current;
        if (highlightState && highlightState.token !== lastHighlightTokenRef.current) {
          lastHighlightTokenRef.current = highlightState.token;
          attackFlashUntil.set(highlightState.actorId, time + 260);
          attackFlashUntil.set(highlightState.targetId, time + 400);
        }

        agentsRef.current.forEach((agent) => {
          const objectEntry = agentObjects.get(agent.id);
          if (!objectEntry) {
            return;
          }

          const { group } = objectEntry;
          const isActive = activeAgentIdRef.current === agent.id;
          const isFlashing = (attackFlashUntil.get(agent.id) ?? 0) > time;
          const pulse = 1 + Math.sin(time * 0.004 + agent.spawnAngle * 4) * 0.025;
          group.position.y = isActive ? 0.22 + Math.sin(time * 0.01) * 0.08 : 0.04 * pulse;
          group.scale.setScalar(agent.health > 0 ? (isActive ? 1.08 : pulse) : 0.92);

          const platform = group.children[0];
          if (platform && "material" in platform) {
            const material = platform.material as import("three").MeshStandardMaterial;
            material.emissiveIntensity = isFlashing ? 1.2 : isActive ? 0.6 : 0.25;
          }

          const healthBar = healthBarsRef.current[agent.id];
          if (!healthBar) {
            return;
          }

          tempVector.set(group.position.x, 3.2, group.position.z);
          tempVector.project(camera);

          const x = (tempVector.x * 0.5 + 0.5) * root.clientWidth;
          const y = (-tempVector.y * 0.5 + 0.5) * root.clientHeight;
          const isVisible = tempVector.z < 1.2 && tempVector.z > -1;
          healthBar.style.opacity = isVisible ? "1" : "0";
          healthBar.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        });

        if (phase === "exiting" && phaseElapsed > 950 && !exitCompleteFired) {
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
