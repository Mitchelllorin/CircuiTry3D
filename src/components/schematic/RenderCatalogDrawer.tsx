import { useEffect, useMemo, useRef } from "react";
import { loadThree } from "../../schematic/threeLoader";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../../schematic/threeFactory";
import type {
  CatalogEntry,
  GroundElement,
  Orientation,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../../schematic/types";

type RenderCatalogDrawerProps = {
  open: boolean;
  entries: CatalogEntry[];
  onClose: () => void;
  onSelectEntry?: (entry: CatalogEntry) => void;
};

export default function RenderCatalogDrawer({ open, entries, onClose, onSelectEntry }: RenderCatalogDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="schematic-drawer" role="presentation">
      <button
        type="button"
        className="schematic-drawer__backdrop"
        aria-label="Close render catalog"
        onClick={onClose}
      />
      <aside className="schematic-drawer__panel" role="dialog" aria-modal="true" aria-label="Schematic 3D render catalog">
        <header className="schematic-drawer__header">
          <div>
            <p className="schematic-drawer__eyebrow">Asset Library</p>
            <h2 className="schematic-drawer__title">Schematic 3D Renders</h2>
            <p className="schematic-drawer__subtitle">
              Browse every component render used in schematic mode. Click to inspect each symbol before placing it on the board.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="schematic-drawer__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="schematic-drawer__content">
          {entries.map((entry) => (
            <article key={entry.id} className="schematic-drawer__item">
              <div className="schematic-drawer__preview" aria-hidden="true">
                <CatalogPreview entry={entry} />
              </div>
              <div className="schematic-drawer__info">
                <div className="schematic-drawer__info-header">
                  <h3>{entry.name}</h3>
                  <span className="schematic-drawer__chip">{formatPlacement(entry.placement)}</span>
                </div>
                <p className="schematic-drawer__description">{entry.description}</p>
                {entry.tags?.length ? (
                  <ul className="schematic-drawer__tags">
                    {entry.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : null}
                {onSelectEntry ? (
                  <button
                    type="button"
                    className="schematic-drawer__select"
                    onClick={() => onSelectEntry(entry)}
                  >
                    Use {entry.name}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

type CatalogPreviewProps = {
  entry: CatalogEntry;
};

function CatalogPreview({ entry }: CatalogPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<SchematicElement | null>(null);

  const previewElement = useMemo(() => createPreviewElement(entry), [entry]);

  useEffect(() => {
    elementRef.current = previewElement;
  }, [previewElement]);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    if (typeof window === "undefined") {
      return () => undefined;
    }

    loadThree()
      .then((three) => {
        if (!isMounted) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        const width = container.clientWidth || 220;
        const height = container.clientHeight || 160;

        const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x030a1a, 1);
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();

        const camera = new three.PerspectiveCamera(32, width / height, 0.1, 50);
        camera.position.set(4.2, 3.4, 6.2);
        camera.lookAt(new three.Vector3(0, 0.8, 0));

        const ambient = new three.AmbientLight(0xffffff, 0.78);
        scene.add(ambient);
        const key = new three.DirectionalLight(0x7fb7ff, 0.7);
        key.position.set(5, 6, 6);
        scene.add(key);
        const rim = new three.DirectionalLight(0xffc285, 0.32);
        rim.position.set(-4, 5, -6);
        scene.add(rim);

        const baseGeometry = new three.CircleGeometry(2.6, 60);
        const baseMaterial = new three.MeshStandardMaterial({
          color: 0x07142a,
          metalness: 0,
          roughness: 1,
          transparent: true,
          opacity: 0.85,
        });
        const base = new three.Mesh(baseGeometry, baseMaterial);
        base.rotation.x = -Math.PI / 2;
        base.position.y = -0.18;
        scene.add(base);

        const pivot = new three.Group();
        scene.add(pivot);

        const currentElement = elementRef.current;
        if (!currentElement) {
          return;
        }

        const { group, terminals } = buildElement(three, currentElement, { preview: true });
        pivot.add(group);

        terminals.forEach((point) => {
          const node = buildNodeMesh(three, point, { preview: true });
          pivot.add(node);
        });

        pivot.position.y = -0.05;

        const frameRef = { current: 0 } as { current: number };
        const animate = () => {
          pivot.rotation.y += 0.01;
          renderer.render(scene, camera);
          frameRef.current = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
          if (!container) {
            return;
          }
          const nextWidth = container.clientWidth || width;
          const nextHeight = container.clientHeight || height;
          renderer.setSize(nextWidth, nextHeight, false);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
        };
        handleResize();

        const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
        if (resizeObserver) {
          resizeObserver.observe(container);
        } else {
          window.addEventListener("resize", handleResize);
        }

        cleanup = () => {
          cancelAnimationFrame(frameRef.current);
          if (resizeObserver) {
            resizeObserver.disconnect();
          } else {
            window.removeEventListener("resize", handleResize);
          }
          if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          disposeThreeObject(scene);
          renderer.dispose();
        };
      })
      .catch((error) => {
        if (typeof import.meta !== "undefined" && import.meta?.env?.DEV) {
          // eslint-disable-next-line no-console
          console.error("Failed to load three.js for render preview", error);
        }
      });

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [previewElement]);

  return <div ref={containerRef} className="schematic-drawer__preview-canvas" />;
}

function createPreviewElement(entry: CatalogEntry): SchematicElement {
  const baseId = `preview-${entry.id}`;

  const makeTwoTerminal = (kind: TwoTerminalElement["kind"], orientation: Orientation = "horizontal"): TwoTerminalElement => {
    const start: Vec2 = orientation === "horizontal" ? { x: -1.5, z: 0 } : { x: 0, z: -1.5 };
    const end: Vec2 = orientation === "horizontal" ? { x: 1.5, z: 0 } : { x: 0, z: 1.5 };
    return {
      id: baseId,
      kind,
      label: entry.defaultLabelPrefix ? `${entry.defaultLabelPrefix}1` : entry.name,
      start,
      end,
      orientation,
    };
  };

  switch (entry.kind) {
    case "wire":
      return {
        id: baseId,
        kind: "wire",
        path: [
          { x: -1.8, z: 0 },
          { x: -0.2, z: 0 },
          { x: 0.2, z: 0.6 },
          { x: 1.8, z: 0.6 },
        ],
      } satisfies WireElement;
    case "ground":
      return {
        id: baseId,
        kind: "ground",
        position: { x: 0, z: 0 },
        orientation: "horizontal",
      } satisfies GroundElement;
    case "battery":
      return makeTwoTerminal("battery");
    case "capacitor":
      return makeTwoTerminal("capacitor");
    case "inductor":
      return makeTwoTerminal("inductor");
    case "lamp":
      return makeTwoTerminal("lamp");
    case "switch":
      return makeTwoTerminal("switch");
    case "resistor":
    default:
      return makeTwoTerminal("resistor");
  }
}

function formatPlacement(placement: CatalogEntry["placement"]): string {
  switch (placement) {
    case "single-point":
      return "Single node";
    case "two-point":
      return "Two node span";
    default:
      return placement;
  }
}

