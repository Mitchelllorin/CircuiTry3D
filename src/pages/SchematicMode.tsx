import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/schematic.css";

type CircuitTopology = "series" | "parallel" | "combination";

declare global {
  interface Window {
    THREE?: any;
  }
}

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r161/three.min.js";
let threeLoaderPromise: Promise<any> | null = null;

type TopologyInfo = {
  title: string;
  summary: string;
  bulletPoints: string[];
};

const TOPOLOGY_CONTENT: Record<CircuitTopology, TopologyInfo> = {
  series: {
    title: "Series Circuit",
    summary: "Single current path with elements chained end-to-end. Current is identical through every component while voltage divides proportionally to resistance.",
    bulletPoints: [
      "Current is constant at every point in the loop.",
      "Voltage drops add to the source voltage (Kirchhoff's Voltage Law).",
      "Equivalent resistance is the algebraic sum of individual resistances."
    ]
  },
  parallel: {
    title: "Parallel Circuit",
    summary: "Multiple branches share the same voltage across each load. Total current equals the sum of branch currents, inversely related to branch resistances.",
    bulletPoints: [
      "Voltage across every branch equals the source voltage.",
      "Branch currents sum to the source current (Kirchhoff's Current Law).",
      "Equivalent resistance follows the reciprocal rule 1/Rₜ = Σ(1/Rᵢ)."
    ]
  },
  combination: {
    title: "Series-Parallel Combination",
    summary: "Series sections feed a parallel network before recombining. Total behaviour blends series voltage division with parallel current splitting.",
    bulletPoints: [
      "Identify series portions and solve sequentially for total resistance.",
      "At the parallel node, voltage is common while branch currents diverge.",
      "Recombine branch currents and continue series analysis back to the source."
    ]
  }
};

const LEGEND_ITEMS = [
  {
    label: "Resistor",
    description: "Rendered with a 3D zig-zag symbol aligned to the connection axis and labelled R₁, R₂, R₃, etc."
  },
  {
    label: "Battery",
    description: "Twin plates with the longer positive terminal and explicit + / − identifiers on the supply side."
  },
  {
    label: "Node",
    description: "Glowing junction spheres emphasise connection points and branch nodes within the topology."
  },
  {
    label: "Wire",
    description: "Cylindrical conductors follow the schematic path, hovering above the reference plane for clear depth separation."
  }
];

export default function SchematicMode() {
  const [topology, setTopology] = useState<CircuitTopology>("series");

  const info = useMemo(() => TOPOLOGY_CONTENT[topology], [topology]);

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Mode</h1>
          <p>
            Explore canonical DC circuit topologies rendered with accurate schematic symbols in a three-dimensional staging area.
            Swap between series, parallel, and combination layouts to see how current paths and component placement change.
          </p>
        </div>
        <div className="schematic-controls" role="tablist" aria-label="Circuit topology selector">
          {(
            ["series", "parallel", "combination"] as CircuitTopology[]
          ).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={topology === option}
              className={topology === option ? "schematic-toggle is-active" : "schematic-toggle"}
              onClick={() => setTopology(option)}
            >
              {TOPOLOGY_CONTENT[option].title}
            </button>
          ))}
        </div>
      </header>

      <section className="schematic-stage" aria-live="polite">
        <SchematicViewport topology={topology} />
      </section>

      <section className="schematic-summary">
        <div className="schematic-summary-card">
          <h2>{info.title}</h2>
          <p>{info.summary}</p>
          <ul>
            {info.bulletPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <aside className="schematic-legend">
          <h3>Symbol Legend</h3>
          <ul>
            {LEGEND_ITEMS.map((item) => (
              <li key={item.label}>
                <span className="legend-term">{item.label}</span>
                <span className="legend-desc">{item.description}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}

type ViewportProps = {
  topology: CircuitTopology;
};

function SchematicViewport({ topology }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topologyRef = useRef<CircuitTopology>(topology);
  topologyRef.current = topology;

  const applyTopologyRef = useRef<((mode: CircuitTopology) => void) | null>(null);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    loadThree()
      .then((three) => {
        if (!isMounted) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        setLoading(false);

        const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x050c19, 1);
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();
        scene.background = new three.Color(0x050c19);

        const camera = new three.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 200);
        camera.position.set(9.5, 7.8, 12.4);
        camera.lookAt(new three.Vector3(0, 0, 0));

        const ambient = new three.AmbientLight(0xffffff, 0.75);
        scene.add(ambient);

        const hemi = new three.HemisphereLight(0x98c7ff, 0x0a1326, 0.55);
        hemi.position.set(0, 6, 0);
        scene.add(hemi);

        const key = new three.DirectionalLight(0x6bb7ff, 0.7);
        key.position.set(8, 12, 6);
        scene.add(key);

        const fill = new three.DirectionalLight(0xf4c163, 0.4);
        fill.position.set(-6, 7, -4);
        scene.add(fill);

        const boardGeometry = new three.PlaneGeometry(16, 12, 1, 1);
        const boardMaterial = new three.MeshStandardMaterial({
          color: 0x0b1a33,
          metalness: 0.25,
          roughness: 0.75,
          transparent: true,
          opacity: 0.96,
          side: three.DoubleSide
        });
        const board = new three.Mesh(boardGeometry, boardMaterial);
        board.rotation.x = -Math.PI / 2;
        board.position.y = -0.05;
        scene.add(board);

        const grid = new three.GridHelper(12, 12, 0x1d95ff, 0x144472);
        grid.position.y = 0.02;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.22;
        }
        scene.add(grid);

        let circuitGroup: any = null;

        const setCircuit = (mode: CircuitTopology) => {
          if (circuitGroup) {
            scene.remove(circuitGroup);
            disposeThreeObject(circuitGroup);
            circuitGroup = null;
          }
          circuitGroup = buildCircuit(three, mode);
          scene.add(circuitGroup);
        };

        applyTopologyRef.current = setCircuit;
        setCircuit(topologyRef.current);

        const clock = new three.Clock();
        let animationFrame = 0;

        const animate = () => {
          animationFrame = window.requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          if (circuitGroup) {
            const wobble = Math.sin(elapsed * 0.35) * 0.12;
            circuitGroup.rotation.y = wobble;
            circuitGroup.position.y = Math.sin(elapsed * 0.45) * 0.04;
          }
          renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
          if (!container) {
            return;
          }
          renderer.setSize(container.clientWidth, container.clientHeight);
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          window.removeEventListener("resize", handleResize);
          if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          disposeThreeObject(scene);
          renderer.dispose();
        };
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        console.error("Failed to initialise schematic viewport", err);
        setError("Unable to load the WebGL renderer. Please ensure WebGL is supported and try again.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (applyTopologyRef.current) {
      applyTopologyRef.current(topology);
    }
  }, [topology]);

  return (
    <div className="schematic-viewport">
      <div ref={containerRef} className="schematic-canvas" />
      {loading && !error && <div className="schematic-status">Loading 3D engine…</div>}
      {error && <div className="schematic-status schematic-error">{error}</div>}
    </div>
  );
}

type Vec2 = {
  x: number;
  z: number;
};

const WIRE_RADIUS = 0.08;
const RESISTOR_RADIUS = 0.085;
const NODE_RADIUS = 0.14;
const WIRE_HEIGHT = 0.18;
const COMPONENT_HEIGHT = 0.22;
const LABEL_HEIGHT = 0.55;

function buildCircuit(three: any, topology: CircuitTopology) {
  const group = new three.Group();
  group.name = `circuit-${topology}`;

  const wireMaterial = new three.MeshStandardMaterial({
    color: 0x8ec9ff,
    metalness: 0.55,
    roughness: 0.32,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.2
  });

  const resistorMaterial = new three.MeshStandardMaterial({
    color: 0xffe4b5,
    metalness: 0.38,
    roughness: 0.4,
    emissive: 0x7a431f,
    emissiveIntensity: 0.12
  });

  const nodeMaterial = new three.MeshStandardMaterial({
    color: 0xffb3c6,
    emissive: 0xff7aa7,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.5
  });

  const batteryPositiveMaterial = new three.MeshStandardMaterial({
    color: 0x9be5ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    metalness: 0.65,
    roughness: 0.28
  });

  const batteryNegativeMaterial = new three.MeshStandardMaterial({
    color: 0x3a4f6d,
    emissive: 0x233547,
    emissiveIntensity: 0.2,
    metalness: 0.5,
    roughness: 0.45
  });

  const toVec3 = (point: Vec2, height = WIRE_HEIGHT) => new three.Vector3(point.x, height, point.z);

  const addNode = (point: Vec2) => {
    const geometry = new three.SphereGeometry(NODE_RADIUS, 28, 20);
    const mesh = new three.Mesh(geometry, nodeMaterial);
    mesh.position.copy(toVec3(point, COMPONENT_HEIGHT + 0.08));
    group.add(mesh);
  };

  const cylinderBetween = (startVec: any, endVec: any, radius: number, material: any) => {
    const direction = new three.Vector3().subVectors(endVec, startVec);
    const length = direction.length();
    if (length <= 1e-6) {
      return null;
    }
    const geometry = new three.CylinderGeometry(radius, radius, length, 24, 1, true);
    const mesh = new three.Mesh(geometry, material);
    const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    const quaternion = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), direction.clone().normalize());
    mesh.setRotationFromQuaternion(quaternion);
    return mesh;
  };

  const addWireSegment = (start: Vec2, end: Vec2) => {
    const startVec = toVec3(start, WIRE_HEIGHT);
    const endVec = toVec3(end, WIRE_HEIGHT);
    const mesh = cylinderBetween(startVec, endVec, WIRE_RADIUS, wireMaterial);
    if (mesh) {
      group.add(mesh);
    }
  };

  const createLabelSprite = (text: string, color = "#dbe9ff") => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.fillStyle = "rgba(6, 18, 42, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = "bold 150px 'Inter', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 12);
    const texture = new three.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const material = new three.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new three.Sprite(material);
    sprite.scale.set(1.4, 0.7, 1);
    sprite.userData.texture = texture;
    return sprite;
  };

  const createResistor = (start: Vec2, end: Vec2, label: string) => {
    const resistorGroup = new three.Group();
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.z - start.z);
    const zigCount = 6;
    const amplitude = 0.35;

    const points: Vec2[] = [];
    for (let i = 0; i <= zigCount; i += 1) {
      const t = i / zigCount;
      if (horizontal) {
        const x = start.x + (end.x - start.x) * t;
        const zOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? -amplitude : amplitude);
        points.push({ x, z: start.z + zOffset });
      } else {
        const z = start.z + (end.z - start.z) * t;
        const xOffset = i === 0 || i === zigCount ? 0 : (i % 2 === 0 ? amplitude : -amplitude);
        points.push({ x: start.x + xOffset, z });
      }
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const segStart = toVec3(points[i], COMPONENT_HEIGHT);
      const segEnd = toVec3(points[i + 1], COMPONENT_HEIGHT);
      const mesh = cylinderBetween(segStart, segEnd, RESISTOR_RADIUS, resistorMaterial);
      if (mesh) {
        resistorGroup.add(mesh);
      }
    }

    const startVec = toVec3(start, COMPONENT_HEIGHT);
    const endVec = toVec3(end, COMPONENT_HEIGHT);
    const leadStart = cylinderBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = cylinderBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
    if (leadStart) {
      resistorGroup.add(leadStart);
    }
    if (leadEnd) {
      resistorGroup.add(leadEnd);
    }

    const labelSprite = createLabelSprite(label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      resistorGroup.add(labelSprite);
    }

    group.add(resistorGroup);
  };

  const createBattery = (start: Vec2, end: Vec2) => {
    const batteryGroup = new three.Group();
    const startVec = toVec3(start, COMPONENT_HEIGHT - 0.05);
    const endVec = toVec3(end, COMPONENT_HEIGHT - 0.05);
    const vertical = Math.abs(end.x - start.x) < Math.abs(end.z - start.z);

    if (vertical) {
      const centerZ = (start.z + end.z) / 2;
      const x = start.x;
      const longPlate = new three.Mesh(new three.BoxGeometry(1.0, 0.18, 0.9), batteryPositiveMaterial);
      longPlate.position.set(x, COMPONENT_HEIGHT, centerZ + 0.4);
      const shortPlate = new three.Mesh(new three.BoxGeometry(0.8, 0.18, 0.45), batteryNegativeMaterial);
      shortPlate.position.set(x, COMPONENT_HEIGHT, centerZ - 0.4);
      batteryGroup.add(longPlate, shortPlate);

      const plusLabel = createLabelSprite("+", "#ffffff");
      if (plusLabel) {
        plusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ + 0.6);
        plusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(plusLabel);
      }
      const minusLabel = createLabelSprite("−", "#cdd6f4");
      if (minusLabel) {
        minusLabel.position.set(x + 0.8, COMPONENT_HEIGHT + 0.12, centerZ - 0.6);
        minusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(minusLabel);
      }
    } else {
      const centerX = (start.x + end.x) / 2;
      const z = start.z;
      const longPlate = new three.Mesh(new three.BoxGeometry(0.9, 0.18, 1.0), batteryPositiveMaterial);
      longPlate.position.set(centerX + 0.4, COMPONENT_HEIGHT, z);
      const shortPlate = new three.Mesh(new three.BoxGeometry(0.45, 0.18, 0.8), batteryNegativeMaterial);
      shortPlate.position.set(centerX - 0.4, COMPONENT_HEIGHT, z);
      batteryGroup.add(longPlate, shortPlate);

      const plusLabel = createLabelSprite("+", "#ffffff");
      if (plusLabel) {
        plusLabel.position.set(centerX + 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        plusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(plusLabel);
      }
      const minusLabel = createLabelSprite("−", "#cdd6f4");
      if (minusLabel) {
        minusLabel.position.set(centerX - 0.6, COMPONENT_HEIGHT + 0.12, z + 0.8);
        minusLabel.scale.set(0.9, 0.9, 1);
        batteryGroup.add(minusLabel);
      }
    }

    const leadStart = cylinderBetween(toVec3(start, WIRE_HEIGHT), startVec, WIRE_RADIUS, wireMaterial);
    const leadEnd = cylinderBetween(endVec, toVec3(end, WIRE_HEIGHT), WIRE_RADIUS, wireMaterial);
    if (leadStart) {
      batteryGroup.add(leadStart);
    }
    if (leadEnd) {
      batteryGroup.add(leadEnd);
    }

    group.add(batteryGroup);
  };

  const addSegmentNodes = (points: Vec2[]) => {
    points.forEach((point) => addNode(point));
  };

  const buildSeries = () => {
    const start: Vec2 = { x: -4, z: -2.6 };
    const batteryStart: Vec2 = { x: -4, z: -1.6 };
    const batteryEnd: Vec2 = { x: -4, z: 1.6 };
    const topLeft: Vec2 = { x: -4, z: 2.6 };
    const r1Start: Vec2 = { x: -3.2, z: 2.6 };
    const r1End: Vec2 = { x: -0.6, z: 2.6 };
    const topRight: Vec2 = { x: 2.6, z: 2.6 };
    const r2Start: Vec2 = { x: 2.6, z: 2.1 };
    const r2End: Vec2 = { x: 2.6, z: -0.2 };
    const bottomRight: Vec2 = { x: 2.6, z: -2.6 };
    const r3Start: Vec2 = { x: 1.1, z: -2.6 };
    const r3End: Vec2 = { x: -2.4, z: -2.6 };

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd);
    addWireSegment(batteryEnd, topLeft);
    addWireSegment(topLeft, r1Start);
    createResistor(r1Start, r1End, "R1");
    addWireSegment(r1End, topRight);
    addWireSegment(topRight, r2Start);
    createResistor(r2Start, r2End, "R2");
    addWireSegment(r2End, bottomRight);
    addWireSegment(bottomRight, r3Start);
    createResistor(r3Start, r3End, "R3");
    addWireSegment(r3End, start);

    addSegmentNodes([batteryStart, batteryEnd, topLeft, topRight, bottomRight, start]);
  };

  const buildParallel = () => {
    const leftBottom: Vec2 = { x: -2.2, z: -2.2 };
    const batteryStart: Vec2 = { x: -2.2, z: -1.4 };
    const batteryEnd: Vec2 = { x: -2.2, z: 1.4 };
    const leftTop: Vec2 = { x: -2.2, z: 2.2 };
    const rightTop: Vec2 = { x: 3.6, z: 2.2 };
    const rightBottom: Vec2 = { x: 3.6, z: -2.2 };

    addWireSegment(leftBottom, batteryStart);
    createBattery(batteryStart, batteryEnd);
    addWireSegment(batteryEnd, leftTop);
    addWireSegment(leftTop, rightTop);
    addWireSegment(leftBottom, rightBottom);

    const branchXs = [0, 1.8, 3.2];
    branchXs.forEach((x, index) => {
      const topNode: Vec2 = { x, z: 2.2 };
      const bottomNode: Vec2 = { x, z: -2.2 };
      const resistorStart: Vec2 = { x, z: 1.5 };
      const resistorEnd: Vec2 = { x, z: -1.5 };
      addWireSegment(topNode, resistorStart);
      createResistor(resistorStart, resistorEnd, `R${index + 1}`);
      addWireSegment(resistorEnd, bottomNode);
      addNode(topNode);
      addNode(bottomNode);
    });

    addSegmentNodes([leftTop, rightTop, leftBottom, rightBottom, batteryStart, batteryEnd]);
  };

  const buildCombination = () => {
    const start: Vec2 = { x: -4, z: -2.3 };
    const batteryStart: Vec2 = { x: -4, z: -1.4 };
    const batteryEnd: Vec2 = { x: -4, z: 1.4 };
    const topLeft: Vec2 = { x: -4, z: 2.3 };
    const r1Start: Vec2 = { x: -3.2, z: 2.3 };
    const r1End: Vec2 = { x: -0.8, z: 2.3 };
    const branchTop: Vec2 = { x: 1.5, z: 2.3 };
    const branchRightTop: Vec2 = { x: 3, z: 2.3 };
    const branchBottom: Vec2 = { x: 1.5, z: -0.4 };
    const branchRightBottom: Vec2 = { x: 3, z: -0.4 };
    const dropNode: Vec2 = { x: 1.5, z: -2.3 };
    const r4Start: Vec2 = { x: 1.5, z: -2.3 };
    const r4End: Vec2 = { x: -1.2, z: -2.3 };

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd);
    addWireSegment(batteryEnd, topLeft);
    addWireSegment(topLeft, r1Start);
    createResistor(r1Start, r1End, "R1");
    addWireSegment(r1End, branchTop);
    createResistor(branchTop, branchBottom, "R2");
    addWireSegment(branchTop, branchRightTop);
    createResistor(branchRightTop, branchRightBottom, "R3");
    addWireSegment(branchRightBottom, branchBottom);
    addWireSegment(branchBottom, dropNode);
    createResistor(r4Start, r4End, "R4");
    addWireSegment(r4End, start);

    addNode(branchTop);
    addNode(branchBottom);
    addNode(branchRightTop);
    addNode(branchRightBottom);
    addNode(dropNode);
    addSegmentNodes([batteryStart, batteryEnd, start, topLeft]);
  };

  switch (topology) {
    case "series":
      buildSeries();
      break;
    case "parallel":
      buildParallel();
      break;
    case "combination":
      buildCombination();
      break;
    default:
      buildSeries();
      break;
  }

  return group;
}

function disposeThreeObject(root: any) {
  const disposeMaterial = (material: any) => {
    if (!material) {
      return;
    }
    if (Array.isArray(material)) {
      material.forEach((mat) => disposeMaterial(mat));
      return;
    }
    if (material.dispose && typeof material.dispose === "function") {
      material.dispose();
    }
  };

  root.traverse((child: any) => {
    if (child.geometry && typeof child.geometry.dispose === "function") {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
    if (child.userData && child.userData.texture && typeof child.userData.texture.dispose === "function") {
      child.userData.texture.dispose();
    }
  });
}

function loadThree(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("three.js can only be loaded in a browser environment"));
  }

  if (window.THREE) {
    return Promise.resolve(window.THREE);
  }

  if (threeLoaderPromise) {
    return threeLoaderPromise;
  }

  threeLoaderPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.THREE) {
        resolve(window.THREE);
      } else {
        reject(new Error("three.js failed to initialise"));
      }
    };

    const script = document.createElement("script");
    script.src = THREE_CDN;
    script.async = true;

    let attemptedFallback = false;

    script.addEventListener("load", finish);
    script.addEventListener("error", () => {
      if (attemptedFallback) {
        reject(new Error("Failed to load three.js from CDN and local fallback."));
        return;
      }
      attemptedFallback = true;
      const fallback = document.createElement("script");
      const base = (typeof import.meta !== "undefined" && import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : "/";
      const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
      fallback.src = `${normalizedBase}/vendor/three.min.js`;
      fallback.async = true;
      fallback.addEventListener("load", finish);
      fallback.addEventListener("error", () => reject(new Error("Failed to load three.js from both CDN and packaged fallback.")));
      document.body.appendChild(fallback);
    });

    document.body.appendChild(script);
  });

  return threeLoaderPromise;
}
