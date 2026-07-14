import { useCallback, useEffect, useRef, useState } from "react";
import type { SymbolStandard } from "../../schematic/standards";
import type { SchematicElement, Vec2 } from "../../schematic/types";
import { buildElement, buildNodeMesh, disposeThreeObject } from "../../schematic/threeFactory";
import { loadThree } from "../../schematic/threeLoader";

export type BuilderViewportProps = {
  elements: SchematicElement[];
  previewElement: SchematicElement | null;
  selectedElementId: string | null;
  draftAnchor: Vec2 | null;
  hoverPoint: Vec2 | null;
  onBoardPointClick: (point: Vec2, event: PointerEvent) => void;
  onBoardPointMove: (point: Vec2 | null) => void;
  onElementClick: (elementId: string, event: PointerEvent) => void;
  symbolStandard: SymbolStandard;
};

const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 12;

const tagWithElementId = (root: any, elementId: string) => {
  if (!root || typeof root.traverse !== "function") {
    return;
  }
  root.traverse((child: any) => {
    child.userData = { ...(child.userData || {}), elementId };
  });
};

export function BuilderViewport({
  elements,
  previewElement,
  selectedElementId,
  draftAnchor,
  hoverPoint,
  onBoardPointClick,
  onBoardPointMove,
  onElementClick,
  symbolStandard,
}: BuilderViewportProps) {
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
      const { group, terminals } = buildElement(three, element, {
        highlight: element.id === selectedElementId,
        standard: symbolStandard,
      });
      tagWithElementId(group, element.id);
      elementGroup.add(group);
      terminals.forEach((point) => {
        const key = `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;
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
      const mesh = buildNodeMesh(three, point, { standard: symbolStandard });
      nodesGroup.add(mesh);
    });
    scene.add(nodesGroup);
    nodeGroupRef.current = nodesGroup;

    if (previewElement) {
      const { group, terminals } = buildElement(three, previewElement, {
        preview: true,
        standard: symbolStandard,
      });
      tagWithElementId(group, previewElement.id);
      if (terminals.length) {
        terminals.forEach((point) => {
          const mesh = buildNodeMesh(three, point, { preview: true, standard: symbolStandard });
          group.add(mesh);
        });
      }
      scene.add(group);
      previewGroupRef.current = group;
    }

    if (draftAnchor) {
      const anchorGroup = new three.Group();
      const anchorMesh = buildNodeMesh(three, draftAnchor, {
        preview: true,
        highlight: true,
        standard: symbolStandard,
      });
      anchorGroup.add(anchorMesh);
      scene.add(anchorGroup);
      anchorGroupRef.current = anchorGroup;
    }

    if (hoverPoint) {
      const geometry = new three.RingGeometry(0.18, 0.26, 36);
      const material = new three.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.65,
        side: three.DoubleSide,
      });
      const hoverMesh = new three.Mesh(geometry, material);
      hoverMesh.rotation.x = -Math.PI / 2;
      hoverMesh.position.set(hoverPoint.x, 0.02, hoverPoint.z);
      scene.add(hoverMesh);
      hoverMarkerRef.current = hoverMesh;
    }
  }, [elements, previewElement, selectedElementId, draftAnchor, hoverPoint, symbolStandard]);

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
        renderer.setClearColor(0xfdfdfd, 1);
        container.appendChild(renderer.domElement);

        const scene = new three.Scene();
        scene.background = new three.Color(0xfdfdfd);

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

        const boardGeometry = new three.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT, 1, 1);
        const boardMaterial = new three.MeshStandardMaterial({
          color: 0xf3f4f6,
          metalness: 0,
          roughness: 0.95,
          transparent: true,
          opacity: 0.98,
          side: three.DoubleSide,
        });
        const board = new three.Mesh(boardGeometry, boardMaterial);
        board.rotation.x = -Math.PI / 2;
        board.position.y = -0.05;
        board.name = "schematic-board";
        board.userData.isBoard = true;
        scene.add(board);

        const grid = new three.GridHelper(BOARD_HEIGHT, BOARD_HEIGHT, 0xcbd5f5, 0xe2e8f0);
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

export default BuilderViewport;
