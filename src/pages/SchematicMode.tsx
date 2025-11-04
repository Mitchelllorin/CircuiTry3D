import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/schematic.css";
import { COMPONENT_CATALOG } from "../schematic/catalog";
import {
  BoardLimits,
  CatalogEntry,
  Orientation,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
  GroundElement
} from "../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../schematic/threeFactory";

declare global {
  interface Window {
    THREE?: any;
  }
}

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r161/three.min.js";
let threeLoaderPromise: Promise<any> | null = null;

const SNAP_STEP = 0.5;
const MIN_SEGMENT_LENGTH = SNAP_STEP;

const BOARD_LIMITS: BoardLimits = {
  minX: -7.5,
  maxX: 7.5,
  minZ: -5.5,
  maxZ: 5.5
};

type PlacementDraft = {
  mode: "two-point";
  entry: CatalogEntry;
  start: Vec2;
  current: Vec2;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snapValue = (value: number, step = SNAP_STEP) => Math.round(value / step) * step;

const clampPoint = (point: Vec2): Vec2 => ({
  x: clampValue(snapValue(point.x), BOARD_LIMITS.minX, BOARD_LIMITS.maxX),
  z: clampValue(snapValue(point.z), BOARD_LIMITS.minZ, BOARD_LIMITS.maxZ)
});

const resolveAxisPlacement = (start: Vec2, target: Vec2) => {
  const snappedStart = clampPoint(start);
  const snappedTarget = clampPoint(target);
  const dx = Math.abs(snappedTarget.x - snappedStart.x);
  const dz = Math.abs(snappedTarget.z - snappedStart.z);
  if (dx >= dz) {
    const end: Vec2 = { x: snappedTarget.x, z: snappedStart.z };
    return {
      start: snappedStart,
      end,
      orientation: "horizontal" as Orientation,
      length: Math.abs(end.x - snappedStart.x)
    };
  }
  const end: Vec2 = { x: snappedStart.x, z: snappedTarget.z };
  return {
    start: snappedStart,
    end,
    orientation: "vertical" as Orientation,
    length: Math.abs(end.z - snappedStart.z)
  };
};

const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `element-${Math.random().toString(36).slice(2, 10)}`);

const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

const formatPoint = (point: Vec2) => `(${point.x.toFixed(1)}, ${point.z.toFixed(1)})`;

export default function SchematicMode() {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(COMPONENT_CATALOG[0]?.id ?? "");
  const [elements, setElements] = useState<SchematicElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlacementDraft | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [labelCounters, setLabelCounters] = useState<Record<string, number>>({});
  const [singleNodeOrientation, setSingleNodeOrientation] = useState<Orientation>("horizontal");

  const selectedCatalogEntry = useMemo(() => {
    const entry = COMPONENT_CATALOG.find((item) => item.id === selectedCatalogId);
    return entry ?? COMPONENT_CATALOG[0];
  }, [selectedCatalogId]);

  const selectedElement = useMemo(() => elements.find((element) => element.id === selectedElementId) ?? null, [elements, selectedElementId]);

  const instructions = draft
    ? `Move the cursor to set the ${draft.entry.name.toLowerCase()} span, then click to confirm placement.`
    : `Click on the board to place a ${selectedCatalogEntry.name.toLowerCase()}.`;

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedbackMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedbackMessage]);

  const handleCatalogSelect = useCallback((entry: CatalogEntry) => {
    setSelectedCatalogId(entry.id);
    setDraft(null);
    setSelectedElementId(null);
    setFeedbackMessage(`${entry.name} ready for placement.`);
  }, []);

  const handleBoardHover = useCallback((point: Vec2 | null) => {
    if (!point) {
      setHoverPoint(null);
      return;
    }
    const snapped = clampPoint(point);
    setHoverPoint(snapped);
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        current: snapped
      };
    });
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (!selectedElementId) {
      return;
    }
    setElements((prev) => prev.filter((element) => element.id !== selectedElementId));
    setSelectedElementId(null);
    setFeedbackMessage("Selected component removed.");
  }, [selectedElementId]);

  const handleClearBoard = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
    setDraft(null);
    setLabelCounters({});
    setFeedbackMessage("Board cleared.");
  }, []);

  const toggleSingleNodeOrientation = useCallback(() => {
    setSingleNodeOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedElementId) {
        event.preventDefault();
        handleRemoveSelected();
      }
      if (event.key === "Escape") {
        setDraft(null);
        setSelectedElementId(null);
        setFeedbackMessage("Placement cancelled.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, handleRemoveSelected]);

  const handleBoardClick = useCallback(
    (point: Vec2) => {
      const entry = selectedCatalogEntry;
      if (!entry) {
        return;
      }

      const snapped = clampPoint(point);

      if (entry.placement === "single-point") {
        const newElement: GroundElement = {
          id: createId(),
          kind: "ground",
          position: snapped,
          orientation: singleNodeOrientation
        };
        setElements((prev) => [...prev, newElement]);
        setSelectedElementId(newElement.id);
        setFeedbackMessage(`${entry.name} placed ${formatPoint(snapped)}.`);
        return;
      }

      if (!draft || draft.entry.id !== entry.id) {
        setDraft({ mode: "two-point", entry, start: snapped, current: snapped });
        setSelectedElementId(null);
        setFeedbackMessage("Anchor set. Choose a second point to complete placement.");
        return;
      }

      const resolved = resolveAxisPlacement(draft.start, snapped);
      if (resolved.length < MIN_SEGMENT_LENGTH) {
        setFeedbackMessage("Segment too short. Extend the component before placing.");
        return;
      }

      if (entry.kind === "wire") {
        const newWire: WireElement = {
          id: createId(),
          kind: "wire",
          path: [resolved.start, resolved.end]
        };
        setElements((prev) => [...prev, newWire]);
        setSelectedElementId(newWire.id);
        setFeedbackMessage("Wire segment placed.");
      } else {
        const prefix = entry.defaultLabelPrefix;
        let label = entry.name;
        if (prefix) {
          const nextIndex = (labelCounters[prefix] ?? 0) + 1;
          label = `${prefix}${nextIndex}`;
          setLabelCounters((prev) => ({
            ...prev,
            [prefix]: nextIndex
          }));
        }

        const newComponent: TwoTerminalElement = {
          id: createId(),
          kind: entry.kind as TwoTerminalElement["kind"],
          label,
          start: resolved.start,
          end: resolved.end,
          orientation: resolved.orientation
        };
        setElements((prev) => [...prev, newComponent]);
        setSelectedElementId(newComponent.id);
        setFeedbackMessage(`${entry.name} placed ${formatPoint(resolved.start)} → ${formatPoint(resolved.end)}.`);
      }

      setDraft(null);
    },
    [selectedCatalogEntry, draft, labelCounters, singleNodeOrientation]
  );

  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
    setDraft(null);
    setFeedbackMessage("Component selected.");
  }, []);

  const previewElement = useMemo<SchematicElement | null>(() => {
    if (!draft) {
      return null;
    }
    const resolved = resolveAxisPlacement(draft.start, draft.current);
    if (resolved.length < MIN_SEGMENT_LENGTH) {
      return null;
    }

    if (draft.entry.kind === "wire") {
      const previewWire: WireElement = {
        id: "preview-wire",
        kind: "wire",
        path: [resolved.start, resolved.end]
      };
      return previewWire;
    }

    const prefix = draft.entry.defaultLabelPrefix;
    const suggestion = prefix ? `${prefix}${(labelCounters[prefix] ?? 0) + 1}` : draft.entry.name;

    const previewComponent: TwoTerminalElement = {
      id: "preview-component",
      kind: draft.entry.kind as TwoTerminalElement["kind"],
      label: suggestion,
      start: resolved.start,
      end: resolved.end,
      orientation: resolved.orientation
    };
    return previewComponent;
  }, [draft, labelCounters]);

  const elementSummaries = useMemo(
    () =>
      elements.map((element) => {
        if (element.kind === "wire") {
          const wire = element as WireElement;
          return {
            id: element.id,
            title: "Wire",
            detail: `${formatPoint(wire.path[0])} → ${formatPoint(wire.path[wire.path.length - 1])}`
          };
        }
        if (element.kind === "ground") {
          const ground = element as GroundElement;
          return {
            id: element.id,
            title: "Ground",
            detail: `${formatPoint(ground.position)} · ${ground.orientation}`
          };
        }
        const component = element as TwoTerminalElement;
        return {
          id: element.id,
          title: component.label,
          detail: `${formatPoint(component.start)} → ${formatPoint(component.end)}`
        };
      }),
    [elements]
  );

  return (
    <div className="schematic-shell">
      <header className="schematic-header">
        <div>
          <h1>3D Schematic Builder</h1>
          <p>
            Assemble custom DC circuits using a catalog of three-dimensional schematic symbols. Pick a component, snap it to the
            placement grid, and watch battery plates, resistive bodies, inductive coils, and more take shape in the viewport.
          </p>
        </div>
      </header>

      <div className="schematic-workspace">
        <section className="schematic-stage" aria-live="polite">
          <SchematicViewport
            elements={elements}
            previewElement={previewElement}
            selectedElementId={selectedElementId}
            draftAnchor={draft ? draft.start : null}
            hoverPoint={hoverPoint}
            onBoardPointClick={handleBoardClick}
            onBoardPointMove={handleBoardHover}
            onElementClick={handleElementClick}
          />
          <div className="schematic-overlay">
            <div className="schematic-instructions">{instructions}</div>
            <div className="schematic-readout">
              <span>Snapped: {hoverPoint ? formatPoint(hoverPoint) : "—"}</span>
              <span>Tool: {selectedCatalogEntry.name}</span>
            </div>
            {feedbackMessage && <div className="schematic-feedback">{feedbackMessage}</div>}
          </div>
        </section>

        <aside className="schematic-sidebar">
          <div className="schematic-catalog">
            <h2>Component Catalog</h2>
            <div className="catalog-grid" role="list">
              {COMPONENT_CATALOG.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="listitem"
                  className={entry.id === selectedCatalogEntry.id ? "catalog-entry is-selected" : "catalog-entry"}
                  onClick={() => handleCatalogSelect(entry)}
                >
                  <span className="catalog-icon">{entry.icon}</span>
                  <span className="catalog-name">{entry.name}</span>
                  <span className="catalog-desc">{entry.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="schematic-panel">
            <div className="schematic-panel-section">
              <h3>Board Controls</h3>
              <div className="schematic-actions">
                <button type="button" onClick={handleClearBoard} disabled={!elements.length}>
                  Clear Board
                </button>
                <button type="button" onClick={handleRemoveSelected} disabled={!selectedElementId}>
                  Remove Selected
                </button>
                <button type="button" onClick={toggleSingleNodeOrientation} className="schematic-secondary">
                  Rotate Ground ({singleNodeOrientation === "horizontal" ? "⇔" : "⇕"})
                </button>
              </div>
            </div>

            <div className="schematic-panel-section">
              <h3>Selection</h3>
              {selectedElement ? (
                <ul className="schematic-selection">
                  {selectedElement.kind === "ground" ? (
                    <>
                      <li>Kind: Ground</li>
                      <li>Position: {formatPoint((selectedElement as GroundElement).position)}</li>
                      <li>Orientation: {(selectedElement as GroundElement).orientation}</li>
                    </>
                  ) : selectedElement.kind === "wire" ? (
                    <>
                      <li>Kind: Wire</li>
                      <li>
                        Path: {formatPoint((selectedElement as WireElement).path[0])} →
                        {formatPoint((selectedElement as WireElement).path[(selectedElement as WireElement).path.length - 1])}
                      </li>
                    </>
                  ) : (
                    <>
                      <li>Label: {(selectedElement as TwoTerminalElement).label}</li>
                      <li>
                        Span: {formatPoint((selectedElement as TwoTerminalElement).start)} →
                        {formatPoint((selectedElement as TwoTerminalElement).end)}
                      </li>
                      <li>Orientation: {(selectedElement as TwoTerminalElement).orientation}</li>
                    </>
                  )}
                </ul>
              ) : (
                <p className="schematic-empty">No component selected.</p>
              )}
            </div>

            <div className="schematic-panel-section">
              <h3>Placed Components</h3>
              {elements.length === 0 ? (
                <p className="schematic-empty">Board is empty. Start by placing a component.</p>
              ) : (
                <ul className="schematic-element-list">
                  {elementSummaries.map((element) => (
                    <li key={element.id}>
                      <button
                        type="button"
                        className={element.id === selectedElementId ? "element-button is-selected" : "element-button"}
                        onClick={() => setSelectedElementId(element.id)}
                      >
                        <span className="element-title">{element.title}</span>
                        <span className="element-detail">{element.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type SchematicViewportProps = {
  elements: SchematicElement[];
  previewElement: SchematicElement | null;
  selectedElementId: string | null;
  draftAnchor: Vec2 | null;
  hoverPoint: Vec2 | null;
  onBoardPointClick: (point: Vec2, event: PointerEvent) => void;
  onBoardPointMove: (point: Vec2 | null) => void;
  onElementClick: (elementId: string, event: PointerEvent) => void;
};

function SchematicViewport({
  elements,
  previewElement,
  selectedElementId,
  draftAnchor,
  hoverPoint,
  onBoardPointClick,
  onBoardPointMove,
  onElementClick
}: SchematicViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const threeRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const boardMeshRef = useRef<any>(null);
  const componentGroupRef = useRef<any>(null);
  const nodeGroupRef = useRef<any>(null);
  const previewGroupRef = useRef<any>(null);
  const anchorGroupRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const pointerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  const rebuildSceneContent = useCallback(() => {
    const three = threeRef.current;
    const scene = sceneRef.current;
    if (!three || !scene) {
      return;
    }

    const tagWithElementId = (root: any, elementId: string) => {
      if (!root || typeof root.traverse !== "function") {
        return;
      }
      root.traverse((child: any) => {
        child.userData = { ...(child.userData || {}), elementId };
      });
    };

    if (componentGroupRef.current) {
      scene.remove(componentGroupRef.current);
      disposeThreeObject(componentGroupRef.current);
      componentGroupRef.current = null;
    }

    if (nodeGroupRef.current) {
      scene.remove(nodeGroupRef.current);
      disposeThreeObject(nodeGroupRef.current);
      nodeGroupRef.current = null;
    }

    if (previewGroupRef.current) {
      scene.remove(previewGroupRef.current);
      disposeThreeObject(previewGroupRef.current);
      previewGroupRef.current = null;
    }

    if (anchorGroupRef.current) {
      scene.remove(anchorGroupRef.current);
      disposeThreeObject(anchorGroupRef.current);
      anchorGroupRef.current = null;
    }

    if (hoverMarkerRef.current) {
      scene.remove(hoverMarkerRef.current);
      disposeThreeObject(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }

    const elementGroup = new three.Group();
    const terminalKeys = new Set<string>();
    const terminalPoints: Vec2[] = [];

    elements.forEach((element) => {
      const { group, terminals } = buildElement(three, element, { highlight: element.id === selectedElementId });
      tagWithElementId(group, element.id);
      elementGroup.add(group);
      terminals.forEach((point) => {
        const key = pointKey(point);
        if (!terminalKeys.has(key)) {
          terminalKeys.add(key);
          terminalPoints.push(point);
        }
      });
    });

    scene.add(elementGroup);
    componentGroupRef.current = elementGroup;

    const nodesGroup = new three.Group();
    terminalPoints.forEach((point) => {
      const mesh = buildNodeMesh(three, point, {});
      nodesGroup.add(mesh);
    });
    scene.add(nodesGroup);
    nodeGroupRef.current = nodesGroup;

    if (previewElement) {
      const { group, terminals } = buildElement(three, previewElement, { preview: true });
      tagWithElementId(group, previewElement.id);
      if (terminals.length) {
        terminals.forEach((point) => {
          const mesh = buildNodeMesh(three, point, { preview: true });
          group.add(mesh);
        });
      }
      scene.add(group);
      previewGroupRef.current = group;
    }

    if (draftAnchor) {
      const anchorGroup = new three.Group();
      const anchorMesh = buildNodeMesh(three, draftAnchor, { preview: true, highlight: true });
      anchorGroup.add(anchorMesh);
      scene.add(anchorGroup);
      anchorGroupRef.current = anchorGroup;
    }

    if (hoverPoint) {
      const geometry = new three.RingGeometry(0.18, 0.26, 36);
      const material = new three.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.65, side: three.DoubleSide });
      const hoverMesh = new three.Mesh(geometry, material);
      hoverMesh.rotation.x = -Math.PI / 2;
      hoverMesh.position.set(hoverPoint.x, 0.02, hoverPoint.z);
      scene.add(hoverMesh);
      hoverMarkerRef.current = hoverMesh;
    }
  }, [elements, previewElement, selectedElementId, draftAnchor, hoverPoint]);

  useEffect(() => {
    rebuildSceneContent();
  }, [rebuildSceneContent]);

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
        board.name = "schematic-board";
        board.userData.isBoard = true;
        scene.add(board);

        const grid = new three.GridHelper(12, 12, 0x1d95ff, 0x144472);
        grid.position.y = 0.02;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.22;
        }
        scene.add(grid);

        threeRef.current = three;
        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        boardMeshRef.current = board;

        raycasterRef.current = new three.Raycaster();
        pointerRef.current = new three.Vector2();

        const handleResize = () => {
          if (!container) {
            return;
          }
          renderer.setSize(container.clientWidth, container.clientHeight);
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
        };

        const updateRaycasterFromEvent = (event: PointerEvent) => {
          const pointer = pointerRef.current;
          const raycaster = raycasterRef.current;
          if (!pointer || !raycaster) {
            return;
          }
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
        };

        const intersectBoard = () => {
          const raycaster = raycasterRef.current;
          const boardMesh = boardMeshRef.current;
          if (!raycaster || !boardMesh) {
            return null;
          }
          const hits = raycaster.intersectObject(boardMesh, false);
          return hits.length > 0 ? hits[0] : null;
        };

        const pickComponent = () => {
          const raycaster = raycasterRef.current;
          const group = componentGroupRef.current;
          if (!raycaster || !group) {
            return null;
          }
          const hits = raycaster.intersectObjects(group.children, true);
          for (const hit of hits) {
            if (hit.object && hit.object.userData && hit.object.userData.elementId) {
              return hit.object.userData.elementId as string;
            }
          }
          return null;
        };

        const handlePointerMove = (event: PointerEvent) => {
          updateRaycasterFromEvent(event);
          const boardHit = intersectBoard();
          if (boardHit) {
            onBoardPointMove({ x: boardHit.point.x, z: boardHit.point.z });
          } else {
            onBoardPointMove(null);
          }
        };

        const handlePointerDown = (event: PointerEvent) => {
          if (event.button !== 0) {
            return;
          }
          updateRaycasterFromEvent(event);
          const elementId = pickComponent();
          if (elementId) {
            onElementClick(elementId, event);
            return;
          }
          const boardHit = intersectBoard();
          if (boardHit) {
            onBoardPointClick({ x: boardHit.point.x, z: boardHit.point.z }, event);
          }
        };

        const handlePointerLeave = () => {
          onBoardPointMove(null);
        };

        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

        rebuildSceneContent();

        const animate = () => {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };

        animate();

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrameRef.current);
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
          renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
          if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          disposeThreeObject(scene);
          renderer.dispose();
          threeRef.current = null;
          rendererRef.current = null;
          sceneRef.current = null;
          cameraRef.current = null;
          boardMeshRef.current = null;
          componentGroupRef.current = null;
          nodeGroupRef.current = null;
          previewGroupRef.current = null;
          anchorGroupRef.current = null;
          hoverMarkerRef.current = null;
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
  }, [onBoardPointClick, onBoardPointMove, onElementClick, rebuildSceneContent]);

  return (
    <div className="schematic-viewport">
      <div ref={containerRef} className="schematic-canvas" />
      {loading && !error && <div className="schematic-status">Loading 3D engine…</div>}
      {error && <div className="schematic-status schematic-error">{error}</div>}
    </div>
  );
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
