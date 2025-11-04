import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/schematic.css";
import "../styles/practice.css";
import practiceProblems, {
  DEFAULT_PRACTICE_PROBLEM,
  findPracticeProblemById,
} from "../data/practiceProblems";
import type { PracticeProblem, PracticeTopology } from "../model/practice";
import type { WireMetricKey } from "../utils/electrical";
import { formatMetricValue, formatNumber } from "../utils/electrical";
import { solvePracticeProblem, type SolveResult } from "../utils/practiceSolver";
import WireTable, {
  METRIC_ORDER,
  METRIC_PRECISION,
  type WireTableRow,
  type WorksheetEntry,
} from "../components/practice/WireTable";
import SolutionSteps from "../components/practice/SolutionSteps";

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

const TOPOLOGY_CONTENT: Record<PracticeTopology, TopologyInfo> = {
  series: {
    title: "Series Circuit",
    summary:
      "Single current path with elements chained end-to-end. Current is identical through every component while voltage divides proportionally to resistance.",
    bulletPoints: [
      "Current is constant at every point in the loop.",
      "Voltage drops add to the source voltage (Kirchhoff's Voltage Law).",
      "Equivalent resistance is the algebraic sum of individual resistances.",
    ],
  },
  parallel: {
    title: "Parallel Circuit",
    summary:
      "Multiple branches share the same voltage across each load. Total current equals the sum of branch currents, inversely related to branch resistances.",
    bulletPoints: [
      "Voltage across every branch equals the source voltage.",
      "Branch currents sum to the source current (Kirchhoff's Current Law).",
      "Equivalent resistance follows the reciprocal rule 1/Rₜ = Σ(1/Rᵢ).",
    ],
  },
  combination: {
    title: "Series-Parallel Combination",
    summary:
      "Series sections feed a parallel network before recombining. Total behaviour blends series voltage division with parallel current splitting.",
    bulletPoints: [
      "Identify series portions and solve sequentially for total resistance.",
      "At the parallel node, voltage is common while branch currents diverge.",
      "Recombine branch currents and continue series analysis back to the source.",
    ],
  },
};

const LEGEND_ITEMS = [
  {
    label: "Resistor",
    description:
      "Rendered with a 3D zig-zag symbol aligned to the connection axis and labelled R₁, R₂, R₃, etc.",
  },
  {
    label: "Battery",
    description:
      "Twin plates with the longer positive terminal and explicit + / − identifiers on the supply side.",
  },
  {
    label: "Node",
    description:
      "Glowing junction spheres emphasise connection points and branch nodes within the topology.",
  },
  {
    label: "Wire",
    description:
      "Cylindrical conductors follow the schematic path, hovering above the reference plane for clear depth separation.",
  },
];

const TOPOLOGY_ORDER: PracticeTopology[] = ["series", "parallel", "combination"];

const TOPOLOGY_LABEL: Record<PracticeTopology, string> = {
  series: "Series",
  parallel: "Parallel",
  combination: "Combination",
};

const DIFFICULTY_LABEL: Record<PracticeProblem["difficulty"], string> = {
  intro: "Intro",
  standard: "Standard",
  challenge: "Challenge",
};

type GroupedProblems = Record<PracticeTopology, PracticeProblem[]>;

type WorksheetState = Record<string, Record<WireMetricKey, WorksheetEntry>>;

const groupProblems = (problems: PracticeProblem[]): GroupedProblems =>
  problems.reduce<GroupedProblems>(
    (acc, problem) => {
      acc[problem.topology] = acc[problem.topology] || [];
      acc[problem.topology].push(problem);
      return acc;
    },
    { series: [], parallel: [], combination: [] }
  );

const ensureProblem = (problem: PracticeProblem | null): PracticeProblem => {
  if (problem) {
    return problem;
  }
  if (!DEFAULT_PRACTICE_PROBLEM) {
    throw new Error("No practice problems available");
  }
  return DEFAULT_PRACTICE_PROBLEM;
};

const resolveProblem = (id: string | null): PracticeProblem => ensureProblem(findPracticeProblemById(id));

const buildTableRows = (problem: PracticeProblem, solution: SolveResult): WireTableRow[] => {
  const componentRows = problem.components.map((component) => ({
    id: component.id,
    label: component.label,
    role: "load" as const,
    givens: component.givens,
    metrics: solution.components[component.id],
  }));

  return [
    {
      id: problem.source.id,
      label: problem.source.label,
      role: "source" as const,
      givens: problem.source.givens,
      metrics: solution.source,
    },
    ...componentRows,
    {
      id: "totals",
      label: "Circuit Totals",
      role: "total" as const,
      givens: problem.totalsGivens,
      metrics: solution.totals,
    },
  ];
};

const resolveTarget = (problem: PracticeProblem, solution: SolveResult) => {
  const { componentId, key } = problem.targetMetric;

  if (componentId === "totals") {
    return solution.totals[key];
  }

  if (componentId === "source" || componentId === problem.source.id) {
    return solution.source[key];
  }

  return solution.components[componentId]?.[key];
};

const parseMetricInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const numericMatch = trimmed.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (numericMatch) {
    const candidate = Number(numericMatch[0]);
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  const fallback = Number(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
};

const withinTolerance = (expected: number, actual: number, tolerance = 0.01): boolean => {
  const absoluteExpected = Math.abs(expected);
  const absoluteDiff = Math.abs(expected - actual);

  if (absoluteExpected < 1e-4) {
    return absoluteDiff <= 1e-3;
  }

  return absoluteDiff / absoluteExpected <= tolerance;
};

const formatSeedValue = (value: number, key: WireMetricKey) => formatNumber(value, METRIC_PRECISION[key]);

export default function SchematicMode() {
  const grouped = useMemo(() => groupProblems(practiceProblems), []);
  const fallbackProblemId = practiceProblems[0]?.id ?? null;

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(fallbackProblemId);
  const [tableRevealed, setTableRevealed] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [worksheetEntries, setWorksheetEntries] = useState<WorksheetState>({});
  const [worksheetComplete, setWorksheetComplete] = useState(false);

  const selectedProblem = useMemo(() => resolveProblem(selectedProblemId), [selectedProblemId]);
  const solution = useMemo(() => solvePracticeProblem(selectedProblem), [selectedProblem]);
  const tableRows = useMemo(
    () => buildTableRows(selectedProblem, solution),
    [selectedProblem, solution]
  );
  const stepPresentations = useMemo(
    () => selectedProblem.steps.map((step) => step(solution.stepContext)),
    [selectedProblem, solution]
  );

  const expectedValues = useMemo(() => {
    const map: Record<string, Record<WireMetricKey, number>> = {};

    tableRows.forEach((row) => {
      map[row.id] = {
        watts: row.metrics.watts,
        current: row.metrics.current,
        resistance: row.metrics.resistance,
        voltage: row.metrics.voltage,
      };
    });

    return map;
  }, [tableRows]);

  const baselineWorksheet = useMemo(() => {
    const baseline: WorksheetState = {};

    tableRows.forEach((row) => {
      baseline[row.id] = {} as Record<WireMetricKey, WorksheetEntry>;

      METRIC_ORDER.forEach((key) => {
        const given = typeof row.givens?.[key] === "number" && Number.isFinite(row.givens[key]);
        const expected = expectedValues[row.id]?.[key];
        baseline[row.id][key] = {
          raw: given && Number.isFinite(expected) ? formatSeedValue(expected!, key) : "",
          value: given && Number.isFinite(expected) ? expected! : null,
          status: given ? "given" : "blank",
          given,
        };
      });
    });

    return baseline;
  }, [expectedValues, tableRows]);

  useEffect(() => {
    setWorksheetEntries(baselineWorksheet);
    setWorksheetComplete(false);
    setTableRevealed(false);
    setStepsVisible(false);
    setAnswerRevealed(false);
  }, [baselineWorksheet, selectedProblem.id]);

  useEffect(() => {
    if (worksheetComplete && !answerRevealed) {
      setAnswerRevealed(true);
    }
  }, [worksheetComplete, answerRevealed]);

  const targetValue = resolveTarget(selectedProblem, solution);

  const highlightRowId = (() => {
    const id = selectedProblem.targetMetric.componentId;
    if (id === "source") {
      return selectedProblem.source.id;
    }
    return id;
  })();

  const highlightKey = selectedProblem.targetMetric.key as WireMetricKey;

  const computeWorksheetComplete = (state: WorksheetState) =>
    tableRows.every((row) =>
      METRIC_ORDER.every((metric) => {
        const cell = state[row.id]?.[metric];
        if (!cell || cell.given) {
          return true;
        }
        return cell.status === "correct";
      })
    );

  const handleWorksheetChange = (rowId: string, key: WireMetricKey, raw: string) => {
    setWorksheetEntries((prev) => {
      const next: WorksheetState = { ...prev };
      const previousRow = prev[rowId] ?? {};
      const row: Record<WireMetricKey, WorksheetEntry> = {
        ...previousRow,
      } as Record<WireMetricKey, WorksheetEntry>;

      const matchingRow = tableRows.find((entry) => entry.id === rowId);
      const givenFromRow =
        typeof matchingRow?.givens?.[key] === "number" && Number.isFinite(matchingRow.givens[key]);

      if (givenFromRow) {
        return prev;
      }

      const baseCell: WorksheetEntry = row[key] ?? {
        raw: "",
        value: null,
        status: "blank",
        given: false,
      };

      if (baseCell.given) {
        return prev;
      }

      const parsed = parseMetricInput(raw);
      const expected = expectedValues[rowId]?.[key];

      let status: WorksheetEntry["status"] = "blank";
      let value: number | null = null;

      if (!raw.trim()) {
        status = "blank";
      } else if (parsed === null) {
        status = "invalid";
      } else if (expected === undefined) {
        status = "incorrect";
        value = parsed;
      } else if (withinTolerance(expected, parsed)) {
        status = "correct";
        value = parsed;
      } else {
        status = "incorrect";
        value = parsed;
      }

      row[key] = {
        raw,
        value,
        status,
        given: baseCell.given,
      };

      next[rowId] = row;

      const complete = computeWorksheetComplete(next);
      setWorksheetComplete(complete);

      return next;
    });
  };

  const advanceToNextProblem = () => {
    const bucket = grouped[selectedProblem.topology] ?? practiceProblems;
    const currentIndex = bucket.findIndex((problem) => problem.id === selectedProblem.id);
    const nextProblem =
      (currentIndex >= 0 && bucket[(currentIndex + 1) % bucket.length]) || practiceProblems[0] || null;

    if (nextProblem) {
      setSelectedProblemId(nextProblem.id);
    }
  };

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Mode</h1>
          <p>
            Load practice presets, manipulate the W.I.R.E. worksheet, and see the schematic rendered as floating 3D symbols.
            Each preset mirrors the classic practice mode but presents the circuit in a playful spatial scene.
          </p>
        </div>
      </header>

      <div className="schematic-body">
        <aside className="schematic-sidebar" aria-label="Practice preset selection">
          <h2>Practice Presets</h2>
          {TOPOLOGY_ORDER.map((topology) => {
            const bucket = grouped[topology];
            if (!bucket.length) {
              return null;
            }
            return (
              <section key={topology} className="schematic-problem-group">
                <h3>{TOPOLOGY_LABEL[topology]}</h3>
                <div className="problem-list">
                  {bucket.map((problem) => (
                    <button
                      key={problem.id}
                      type="button"
                      className="problem-button"
                      data-active={problem.id === selectedProblem.id ? "true" : undefined}
                      onClick={() => setSelectedProblemId(problem.id)}
                    >
                      <strong>{problem.title}</strong>
                      <small>
                        {TOPOLOGY_LABEL[problem.topology]} · {DIFFICULTY_LABEL[problem.difficulty]}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </aside>

        <section className="schematic-main" aria-live="polite">
          <header className="schematic-main-header">
            <div>
              <h2>{selectedProblem.title}</h2>
              <div className="schematic-meta">
                <span className="difficulty-pill">{DIFFICULTY_LABEL[selectedProblem.difficulty]}</span>
                <span className="schematic-chip">{TOPOLOGY_LABEL[selectedProblem.topology]}</span>
                {selectedProblem.conceptTags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="schematic-stage">
            <SchematicViewport problem={selectedProblem} />
          </div>

          <div className="schematic-main-grid">
            <article className="schematic-card">
              <h3>Practice Prompt</h3>
              <p>{selectedProblem.prompt}</p>
            </article>
            <article className="schematic-card target-card">
              <h3>Target Metric</h3>
              <p className="target-question">{selectedProblem.targetQuestion}</p>
              <div className="target-answer" aria-live="polite">
                {answerRevealed && Number.isFinite(targetValue) ? (
                  <strong>
                    {formatMetricValue(targetValue as number, selectedProblem.targetMetric.key)}
                  </strong>
                ) : (
                  <span>Reveal the answer once your worksheet is complete.</span>
                )}
              </div>
              <button
                type="button"
                className="target-toggle"
                onClick={() => setAnswerRevealed((value) => !value)}
              >
                {answerRevealed ? "Hide Final Answer" : "Reveal Final Answer"}
              </button>
            </article>
            <article className="schematic-card">
              <h3>{TOPOLOGY_CONTENT[selectedProblem.topology].title}</h3>
              <p>{TOPOLOGY_CONTENT[selectedProblem.topology].summary}</p>
              <ul>
                {TOPOLOGY_CONTENT[selectedProblem.topology].bulletPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <aside className="schematic-panel">
          <div className="worksheet-controls">
            <button type="button" onClick={() => setTableRevealed((value) => !value)}>
              {tableRevealed ? "Hide Worksheet Answers" : "Reveal Worksheet"}
            </button>
            <button type="button" onClick={() => setStepsVisible((value) => !value)}>
              {stepsVisible ? "Hide Steps" : "Show Solving Steps"}
            </button>
            <button
              type="button"
              onClick={advanceToNextProblem}
              disabled={!worksheetComplete}
              className="next-problem"
            >
              {worksheetComplete ? "Next Problem" : "Solve to Unlock Next"}
            </button>
          </div>

          <div
            className="worksheet-status-banner"
            role="status"
            aria-live="polite"
            data-complete={worksheetComplete ? "true" : undefined}
          >
            <div className="worksheet-status-header">
              <strong>{worksheetComplete ? "Worksheet Complete" : "Fill the W.I.R.E. table"}</strong>
            </div>
            <span>
              {worksheetComplete
                ? "Every unknown matches the solved circuit. Advance when you're ready."
                : "Enter the missing watts, amps, ohms, and volts using the 3D schematic as your guide."}
            </span>
          </div>

          <div className="worksheet-sync" role="status" aria-live="polite">
            <strong>Synced to schematic</strong>
            <span>
              {`Preset givens from ${selectedProblem.title} are locked in. Update only the unknowns and compare against the 3D layout.`}
            </span>
          </div>

          <div className="schematic-worksheet-wrapper">
            <WireTable
              rows={tableRows}
              revealAll={tableRevealed}
              highlight={{ rowId: highlightRowId, key: highlightKey }}
              entries={worksheetEntries}
              onChange={handleWorksheetChange}
            />
          </div>

          <SolutionSteps steps={stepPresentations} visible={stepsVisible} />

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
        </aside>
      </div>
    </div>
  );
}

type ViewportProps = {
  problem: PracticeProblem;
};

function SchematicViewport({ problem }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const problemRef = useRef<PracticeProblem>(problem);
  problemRef.current = problem;

  const applyProblemRef = useRef<((nextProblem: PracticeProblem) => void) | null>(null);

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

        const camera = new three.PerspectiveCamera(
          44,
          container.clientWidth / container.clientHeight,
          0.1,
          200
        );
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
          side: three.DoubleSide,
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

        const setCircuit = (practiceProblem: PracticeProblem) => {
          if (circuitGroup) {
            scene.remove(circuitGroup);
            disposeThreeObject(circuitGroup);
            circuitGroup = null;
          }
          circuitGroup = buildCircuit(three, practiceProblem);
          scene.add(circuitGroup);
        };

        applyProblemRef.current = setCircuit;
        setCircuit(problemRef.current);

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
    if (applyProblemRef.current) {
      applyProblemRef.current(problem);
    }
  }, [problem]);

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

function buildCircuit(three: any, problem: PracticeProblem) {
  const group = new three.Group();
  group.name = `circuit-${problem.id}`;

  const wireMaterial = new three.MeshStandardMaterial({
    color: 0x8ec9ff,
    metalness: 0.55,
    roughness: 0.32,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.2,
  });

  const resistorMaterial = new three.MeshStandardMaterial({
    color: 0xffe4b5,
    metalness: 0.38,
    roughness: 0.4,
    emissive: 0x7a431f,
    emissiveIntensity: 0.12,
  });

  const nodeMaterial = new three.MeshStandardMaterial({
    color: 0xffb3c6,
    emissive: 0xff7aa7,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.5,
  });

  const batteryPositiveMaterial = new three.MeshStandardMaterial({
    color: 0x9be5ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    metalness: 0.65,
    roughness: 0.28,
  });

  const batteryNegativeMaterial = new three.MeshStandardMaterial({
    color: 0x3a4f6d,
    emissive: 0x233547,
    emissiveIntensity: 0.2,
    metalness: 0.5,
    roughness: 0.45,
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
    const quaternion = new three.Quaternion().setFromUnitVectors(
      new three.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
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
    const material = new three.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new three.Sprite(material);
    sprite.scale.set(1.4, 0.7, 1);
    sprite.userData.texture = texture;
    return sprite;
  };

  const createComponentLabel = (label: string) => {
    const sprite = createLabelSprite(label);
    if (sprite) {
      sprite.scale.set(1.4, 0.6, 1);
    }
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
        const zOffset = i === 0 || i === zigCount ? 0 : i % 2 === 0 ? -amplitude : amplitude;
        points.push({ x, z: start.z + zOffset });
      } else {
        const z = start.z + (end.z - start.z) * t;
        const xOffset = i === 0 || i === zigCount ? 0 : i % 2 === 0 ? amplitude : -amplitude;
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

    const labelSprite = createComponentLabel(label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      resistorGroup.add(labelSprite);
    }

    group.add(resistorGroup);
  };

  const createBattery = (start: Vec2, end: Vec2, label: string) => {
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

    const labelSprite = createComponentLabel(label);
    if (labelSprite) {
      const midpoint = new three.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      labelSprite.position.copy(midpoint);
      labelSprite.position.y += LABEL_HEIGHT;
      batteryGroup.add(labelSprite);
    }

    group.add(batteryGroup);
  };

  const addSegmentNodes = (points: Vec2[]) => {
    points.forEach((point) => addNode(point));
  };

  const sourceLabel = problem.source.label ?? "Source";
  const componentLabels = new Map(problem.components.map((component) => [component.id, component.label]));

  const buildSeries = () => {
    const left = -4.4;
    const right = 4.4;
    const top = 2.7;
    const bottom = -2.7;

    const start: Vec2 = { x: left, z: bottom };
    const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
    const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
    const topLeft: Vec2 = { x: left, z: top };
    const topRight: Vec2 = { x: right, z: top };
    const bottomRight: Vec2 = { x: right, z: bottom };

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, topLeft);

    const componentCount = Math.max(problem.components.length, 1);
    const segmentWidth = (topRight.x - topLeft.x) / componentCount;
    const margin = Math.min(segmentWidth * 0.2, 0.5);

    let previousPoint = topLeft;
    problem.components.forEach((component, index) => {
      const startX = topLeft.x + index * segmentWidth + margin;
      const endX = topLeft.x + (index + 1) * segmentWidth - margin;
      const resistorStart: Vec2 = { x: startX, z: top };
      const resistorEnd: Vec2 = { x: endX, z: top };
      addWireSegment(previousPoint, resistorStart);
      createResistor(resistorStart, resistorEnd, component.label ?? component.id);
      addNode(resistorStart);
      addNode(resistorEnd);
      previousPoint = resistorEnd;
    });

    addWireSegment(previousPoint, topRight);
    addWireSegment(topRight, bottomRight);
    addWireSegment(bottomRight, start);

    addSegmentNodes([start, batteryStart, batteryEnd, topLeft, topRight, bottomRight]);
  };

  const buildParallel = () => {
    const left = -2.6;
    const right = 3.8;
    const top = 2.5;
    const bottom = -2.5;

    const leftBottom: Vec2 = { x: left, z: bottom };
    const batteryStart: Vec2 = { x: left, z: bottom + 0.9 };
    const batteryEnd: Vec2 = { x: left, z: top - 0.9 };
    const leftTop: Vec2 = { x: left, z: top };
    const rightTop: Vec2 = { x: right, z: top };
    const rightBottom: Vec2 = { x: right, z: bottom };

    addWireSegment(leftBottom, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, leftTop);
    addWireSegment(leftTop, rightTop);
    addWireSegment(leftBottom, rightBottom);

    const branchCount = Math.max(problem.components.length, 1);
    const spacing = (right - left) / (branchCount + 1);
    const branchSpan = Math.min(Math.abs(top - bottom) - 1, 4.2);
    const offset = Math.max((Math.abs(top - bottom) - branchSpan) / 2, 0.6);

    problem.components.forEach((component, index) => {
      const x = left + spacing * (index + 1);
      const topNode: Vec2 = { x, z: top };
      const bottomNode: Vec2 = { x, z: bottom };
      const resistorStart: Vec2 = { x, z: top - offset };
      const resistorEnd: Vec2 = { x, z: bottom + offset };

      addWireSegment(topNode, resistorStart);
      createResistor(resistorStart, resistorEnd, component.label ?? component.id);
      addWireSegment(resistorEnd, bottomNode);

      addNode(topNode);
      addNode(bottomNode);
    });

    addSegmentNodes([leftTop, rightTop, leftBottom, rightBottom, batteryStart, batteryEnd]);
  };

  const buildCombination = () => {
    const start: Vec2 = { x: -4.2, z: -2.3 };
    const batteryStart: Vec2 = { x: -4.2, z: -1.5 };
    const batteryEnd: Vec2 = { x: -4.2, z: 1.5 };
    const topLeft: Vec2 = { x: -4.2, z: 2.3 };
    const topMid: Vec2 = { x: -1.2, z: 2.3 };
    const branchTop: Vec2 = { x: 1.4, z: 2.3 };
    const branchRightTop: Vec2 = { x: 3.2, z: 2.3 };
    const branchBottom: Vec2 = { x: 1.4, z: -0.3 };
    const branchRightBottom: Vec2 = { x: 3.2, z: -0.3 };
    const dropNode: Vec2 = { x: 1.4, z: -2.3 };
    const bottomLeft: Vec2 = { x: -2.0, z: -2.3 };

    const labelFor = (id: string) => componentLabels.get(id) ?? id;

    addWireSegment(start, batteryStart);
    createBattery(batteryStart, batteryEnd, sourceLabel);
    addWireSegment(batteryEnd, topLeft);
    addWireSegment(topLeft, topMid);

    const seriesTop: Vec2 = { x: 0.4, z: 2.3 };
    const r1Start: Vec2 = topMid;
    const r1End: Vec2 = seriesTop;
    createResistor(r1Start, r1End, labelFor("R1"));

    addWireSegment(seriesTop, branchTop);

    const r2Start: Vec2 = { x: branchTop.x, z: branchTop.z };
    const r2End: Vec2 = { x: branchBottom.x, z: branchBottom.z };
    createResistor(r2Start, r2End, labelFor("R2"));

    addWireSegment(branchTop, branchRightTop);

    const r3Start: Vec2 = { x: branchRightTop.x, z: branchRightTop.z };
    const r3End: Vec2 = { x: branchRightBottom.x, z: branchRightBottom.z };
    createResistor(r3Start, r3End, labelFor("R3"));

    addWireSegment(branchRightBottom, branchBottom);
    addWireSegment(branchBottom, dropNode);

    const r4Start: Vec2 = { x: dropNode.x, z: dropNode.z };
    const r4End: Vec2 = { x: bottomLeft.x, z: bottomLeft.z };
    createResistor(r4Start, r4End, labelFor("R4"));

    addWireSegment(r4End, start);

    addNode(seriesTop);
    addNode(branchTop);
    addNode(branchBottom);
    addNode(branchRightTop);
    addNode(branchRightBottom);
    addNode(dropNode);
    addSegmentNodes([topLeft, start, batteryStart, batteryEnd]);
  };

  const presetKey = problem.presetHint ?? problem.topology;

  switch (presetKey) {
    case "parallel_basic":
      buildParallel();
      break;
    case "mixed_circuit":
      buildCombination();
      break;
    case "series_basic":
    default:
      if (problem.topology === "parallel") {
        buildParallel();
      } else if (problem.topology === "combination") {
        buildCombination();
      } else {
        buildSeries();
      }
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
      const base =
        typeof import.meta !== "undefined" && import.meta && import.meta.env && import.meta.env.BASE_URL
          ? import.meta.env.BASE_URL
          : "/";
      const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
      fallback.src = `${normalizedBase}/vendor/three.min.js`;
      fallback.async = true;
      fallback.addEventListener("load", finish);
      fallback.addEventListener("error", () =>
        reject(new Error("Failed to load three.js from both CDN and packaged fallback."))
      );
      document.body.appendChild(fallback);
    });

    document.body.appendChild(script);
  });

  return threeLoaderPromise;
}
