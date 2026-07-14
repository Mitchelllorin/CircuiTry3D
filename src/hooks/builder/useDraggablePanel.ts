import { useCallback, useRef, useState } from "react";

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface PanelLayout {
  position: PanelPosition | null; // null = CSS default (edge-pinned)
  size: PanelSize | null;         // null = CSS default
}

const STORAGE_PREFIX = "circuitry3d-panel-";

function loadLayout(id: string): PanelLayout {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (raw) return JSON.parse(raw) as PanelLayout;
  } catch {
    // ignore
  }
  return { position: null, size: null };
}

function saveLayout(id: string, layout: PanelLayout): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

/** Clamp a panel so at least 48 px of its drag handle stays on-screen. */
function clampPosition(pos: PanelPosition, vpW: number, vpH: number): PanelPosition {
  return {
    x: Math.max(-300, Math.min(vpW - 48, pos.x)),
    y: Math.max(0, Math.min(vpH - 48, pos.y)),
  };
}

export type ResizeDirection =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
}

export interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
}

export interface UseDraggablePanelReturn {
  /** True when the panel has a stored position (overrides CSS edge-pinning). */
  isFloating: boolean;
  /** Inline styles to merge onto the stage container element. */
  containerStyle: React.CSSProperties;
  /** Props to spread onto the drag-handle element. */
  dragHandleProps: DragHandleProps;
  /** Returns props to spread onto a resize-handle element for the given direction. */
  getResizeHandleProps: (direction: ResizeDirection) => ResizeHandleProps;
  /** Resets the panel to its original CSS-defined position and size. */
  resetLayout: () => void;
}

export function useDraggablePanel(id: string): UseDraggablePanelReturn {
  const [layout, setLayout] = useState<PanelLayout>(() => loadLayout(id));

  // ── drag state ───────────────────────────────────────────────────────────
  const dragActive = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // ── resize state ─────────────────────────────────────────────────────────
  const resizeActive = useRef<ResizeDirection | null>(null);
  const resizeOrigin = useRef({
    mx: 0, my: 0,
    x: 0, y: 0,
    w: 0, h: 0,
  });

  // ── persist helper ───────────────────────────────────────────────────────
  const persistLayout = useCallback(
    (next: PanelLayout) => {
      setLayout(next);
      saveLayout(id, next);
    },
    [id],
  );

  // ── drag handlers ────────────────────────────────────────────────────────
  const onDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Only primary button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      // Resolve current top-left from layout or live getBoundingClientRect
      const stageEl = (e.currentTarget as HTMLElement).closest(
        "[data-draggable-stage]",
      ) as HTMLElement | null;
      const rect = stageEl?.getBoundingClientRect() ?? { left: 0, top: 0 };

      dragActive.current = true;
      dragOrigin.current = {
        mx: e.clientX,
        my: e.clientY,
        px: layout.position?.x ?? rect.left,
        py: layout.position?.y ?? rect.top,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [layout.position],
  );

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragActive.current) return;
      const { mx, my, px, py } = dragOrigin.current;
      const raw: PanelPosition = {
        x: px + e.clientX - mx,
        y: py + e.clientY - my,
      };
      const clamped = clampPosition(raw, window.innerWidth, window.innerHeight);
      setLayout((prev) => ({ ...prev, position: clamped }));
    },
    [],
  );

  const onDragPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragActive.current) return;
      dragActive.current = false;
      const { mx, my, px, py } = dragOrigin.current;
      const raw: PanelPosition = {
        x: px + e.clientX - mx,
        y: py + e.clientY - my,
      };
      const clamped = clampPosition(raw, window.innerWidth, window.innerHeight);
      persistLayout({ ...layout, position: clamped });
    },
    [layout, persistLayout],
  );

  // ── resize handlers ──────────────────────────────────────────────────────
  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const dir = resizeActive.current;
      if (!dir) return;
      const { mx, my, x, y, w, h } = resizeOrigin.current;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;

      let nx = x, ny = y, nw = w, nh = h;
      if (dir.includes("e")) nw = Math.max(140, w + dx);
      if (dir.includes("w")) { nw = Math.max(140, w - dx); nx = x + (w - nw); }
      if (dir.includes("s")) nh = Math.max(100, h + dy);
      if (dir.includes("n")) { nh = Math.max(100, h - dy); ny = y + (h - nh); }

      setLayout({
        position: { x: nx, y: ny },
        size: { width: nw, height: nh },
      });
    },
    [],
  );

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const dir = resizeActive.current;
      if (!dir) return;
      resizeActive.current = null;
      const { mx, my, x, y, w, h } = resizeOrigin.current;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;

      let nx = x, ny = y, nw = w, nh = h;
      if (dir.includes("e")) nw = Math.max(140, w + dx);
      if (dir.includes("w")) { nw = Math.max(140, w - dx); nx = x + (w - nw); }
      if (dir.includes("s")) nh = Math.max(100, h + dy);
      if (dir.includes("n")) { nh = Math.max(100, h - dy); ny = y + (h - nh); }

      persistLayout({
        position: { x: nx, y: ny },
        size: { width: nw, height: nh },
      });
    },
    [persistLayout],
  );

  const getResizeHandleProps = useCallback(
    (direction: ResizeDirection): ResizeHandleProps => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const stageEl = (e.currentTarget as HTMLElement).closest(
          "[data-draggable-stage]",
        ) as HTMLElement | null;
        const rect = stageEl?.getBoundingClientRect() ?? {
          left: 0, top: 0, width: 200, height: 300,
        };

        resizeActive.current = direction;
        resizeOrigin.current = {
          mx: e.clientX,
          my: e.clientY,
          x: layout.position?.x ?? rect.left,
          y: layout.position?.y ?? rect.top,
          w: layout.size?.width ?? rect.width,
          h: layout.size?.height ?? rect.height,
        };

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      onPointerMove: onResizePointerMove,
      onPointerUp: onResizePointerUp,
    }),
    [layout, onResizePointerMove, onResizePointerUp],
  );

  // ── reset ────────────────────────────────────────────────────────────────
  const resetLayout = useCallback(() => {
    persistLayout({ position: null, size: null });
  }, [persistLayout]);

  // ── derived style ────────────────────────────────────────────────────────
  const isFloating = layout.position !== null;

  const containerStyle: React.CSSProperties = {};
  if (layout.position !== null) {
    containerStyle.left = layout.position.x;
    containerStyle.top = layout.position.y;
    containerStyle.right = "auto";
    containerStyle.bottom = "auto";
    containerStyle.transform = "none";
  }
  if (layout.size !== null) {
    containerStyle.width = layout.size.width;
    containerStyle.height = layout.size.height;
  }

  return {
    isFloating,
    containerStyle,
    dragHandleProps: {
      onPointerDown: onDragPointerDown,
      onPointerMove: onDragPointerMove,
      onPointerUp: onDragPointerUp,
    },
    getResizeHandleProps,
    resetLayout,
  };
}
