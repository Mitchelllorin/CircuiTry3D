import { useEffect, useMemo, useRef, useState } from "react";
import { COMPONENT_CATALOG } from "../../schematic/catalog";
import {
  CatalogEntry,
  GroundElement,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../../schematic/threeFactory";
import { loadThree } from "../../schematic/threeLoader";

type ComponentRenderDrawerProps = {
  open: boolean;
  onClose: () => void;
  initialComponentId?: string | null;
};

type ThreePreviewContext = {
  three: any;
  renderer: any;
  scene: any;
  camera: any;
  clock: any;
  animationFrame: number;
  resizeHandler: () => void;
};

export default function ComponentRenderDrawer({ open, onClose, initialComponentId }: ComponentRenderDrawerProps) {
  const [selectedId, setSelectedId] = useState<string>(initialComponentId || COMPONENT_CATALOG[0]?.id || "");

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedId((prev) => {
      if (prev) {
        return prev;
      }
      if (initialComponentId) {
        return initialComponentId;
      }
      return COMPONENT_CATALOG[0]?.id || "";
    });
  }, [open, initialComponentId]);

  const selectedEntry = useMemo<CatalogEntry | null>(() => {
    if (!selectedId) {
      return COMPONENT_CATALOG[0] ?? null;
    }
    return COMPONENT_CATALOG.find((entry) => entry.id === selectedId) ?? COMPONENT_CATALOG[0] ?? null;
  }, [selectedId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewGroupRef = useRef<any>(null);
  const contextRef = useRef<ThreePreviewContext | null>(null);

  const teardown = () => {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    window.cancelAnimationFrame(context.animationFrame);
    window.removeEventListener("resize", context.resizeHandler);

    if (previewGroupRef.current && context.scene) {
      context.scene.remove(previewGroupRef.current);
      disposeThreeObject(previewGroupRef.current);
      previewGroupRef.current = null;
    }

    if (context.renderer && context.renderer.domElement && context.renderer.domElement.parentNode) {
      context.renderer.domElement.parentNode.removeChild(context.renderer.domElement);
    }

    if (context.scene) {
      disposeThreeObject(context.scene);
    }
    if (context.renderer) {
      context.renderer.dispose();
    }

    contextRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      teardown();
      return;
    }

    let isMounted = true;

    loadThree()
      .then((three) => {
        if (!isMounted) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0xf8fafc, 1);
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();
        scene.background = new three.Color(0xf8fafc);

        const camera = new three.PerspectiveCamera(
          42,
          container.clientWidth / container.clientHeight,
          0.1,
          100
        );
        camera.position.set(5.5, 5.8, 7.5);
        camera.lookAt(new three.Vector3(0, 0, 0));

        const ambient = new three.AmbientLight(0xffffff, 0.8);
        scene.add(ambient);

        const keyLight = new three.DirectionalLight(0xdbeafe, 0.7);
        keyLight.position.set(6, 8, 5);
        scene.add(keyLight);

        const fillLight = new three.DirectionalLight(0xfef3c7, 0.4);
        fillLight.position.set(-6, 6, -4);
        scene.add(fillLight);

        const boardGeometry = new three.PlaneGeometry(6.5, 4.5, 1, 1);
        const boardMaterial = new three.MeshStandardMaterial({
          color: 0xf1f5f9,
          metalness: 0,
          roughness: 0.95,
          transparent: true,
          opacity: 0.98,
          side: three.DoubleSide,
        });
        const boardMesh = new three.Mesh(boardGeometry, boardMaterial);
        boardMesh.rotation.x = -Math.PI / 2;
        boardMesh.position.y = -0.12;
        scene.add(boardMesh);

        const grid = new three.GridHelper(4.5, 9, 0xcbd5f5, 0xe2e8f0);
        grid.position.y = 0.01;
        if (grid.material) {
          grid.material.transparent = true;
          grid.material.opacity = 0.28;
        }
        scene.add(grid);

        const clock = new three.Clock();

        const resizeHandler = () => {
          if (!container) {
            return;
          }
          renderer.setSize(container.clientWidth, container.clientHeight);
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", resizeHandler);

        const context: ThreePreviewContext = {
          three,
          renderer,
          scene,
          camera,
          clock,
          animationFrame: 0,
          resizeHandler,
        };

        const animate = () => {
          context.animationFrame = window.requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          if (previewGroupRef.current) {
            previewGroupRef.current.rotation.y = Math.sin(elapsed * 0.35) * 0.4;
            previewGroupRef.current.position.y = Math.sin(elapsed * 0.45) * 0.04;
          }
          renderer.render(scene, camera);
        };

        contextRef.current = context;
        animate();
      })
      .catch((error) => {
        console.error("Failed to load three.js for component drawer", error);
      });

    return () => {
      isMounted = false;
      teardown();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const context = contextRef.current;
    const entry = selectedEntry;
    if (!context || !entry) {
      return;
    }

    if (previewGroupRef.current) {
      context.scene.remove(previewGroupRef.current);
      disposeThreeObject(previewGroupRef.current);
      previewGroupRef.current = null;
    }

    const element = createPreviewElement(entry);
    if (!element) {
      return;
    }

    const previewGroup = new context.three.Group();
    const { group, terminals } = buildElement(context.three, element, { highlight: true });
    previewGroup.add(group);

    terminals.forEach((point) => {
      const node = buildNodeMesh(context.three, point, {});
      previewGroup.add(node);
    });

    previewGroup.position.y = 0.08;
    previewGroupRef.current = previewGroup;
    context.scene.add(previewGroup);
  }, [open, selectedEntry]);

  if (!open) {
    return null;
  }

  const placementLabel = selectedEntry?.placement === "single-point" ? "Single-point placement" : "Two-point placement";

  return (
    <div className="schematic-drawer" role="dialog" aria-modal="true" aria-label="Component catalog">
      <button type="button" className="schematic-drawer-overlay" onClick={onClose} aria-label="Close component catalog" />
      <div className="schematic-drawer-panel">
        <header className="schematic-drawer-header">
          <div>
            <h2>3D Component Catalog</h2>
            <p>Browse every schematic element rendered in three dimensions. Select an item to preview the 3D build.</p>
          </div>
          <button type="button" className="schematic-drawer-close" onClick={onClose} aria-label="Close catalog">
            ✕
          </button>
        </header>

        <div className="schematic-drawer-content">
          <nav className="schematic-drawer-list" aria-label="Component list">
            {COMPONENT_CATALOG.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={isSelected ? "schematic-drawer-item is-selected" : "schematic-drawer-item"}
                  onClick={() => setSelectedId(entry.id)}
                  aria-pressed={isSelected}
                >
                  <span className="drawer-item-icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                  <span className="drawer-item-body">
                    <span className="drawer-item-title">{entry.name}</span>
                    <span className="drawer-item-description">{entry.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="schematic-drawer-preview" aria-live="polite">
            <div ref={containerRef} className="schematic-drawer-canvas" role="presentation" />
            {selectedEntry && (
              <div className="schematic-drawer-meta">
                <div className="drawer-meta-row">
                  <strong>Placement</strong>
                  <span>{placementLabel}</span>
                </div>
                {selectedEntry.defaultLabelPrefix && (
                  <div className="drawer-meta-row">
                    <strong>Default label</strong>
                    <span>{selectedEntry.defaultLabelPrefix}…</span>
                  </div>
                )}
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="drawer-meta-row">
                    <strong>Tags</strong>
                    <span>
                      {selectedEntry.tags.map((tag) => (
                        <span key={tag} className="drawer-tag">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  function createPreviewElement(entry: CatalogEntry): SchematicElement | null {
    const start: Vec2 = { x: -1.4, z: 0 };
    const end: Vec2 = { x: 1.4, z: 0 };

    if (entry.kind === "wire") {
      const wire: WireElement = {
        id: "preview-wire",
        kind: "wire",
        path: [start, end],
      };
      return wire;
    }

    if (entry.kind === "ground") {
      const ground: GroundElement = {
        id: "preview-ground",
        kind: "ground",
        position: { x: 0, z: 0 },
        orientation: "horizontal",
      };
      return ground;
    }

    const component: TwoTerminalElement = {
      id: "preview-component",
      kind: entry.kind as TwoTerminalElement["kind"],
      label: entry.defaultLabelPrefix ? `${entry.defaultLabelPrefix}1` : entry.name,
      start,
      end,
      orientation: "horizontal",
    };
    return component;
  }
}

