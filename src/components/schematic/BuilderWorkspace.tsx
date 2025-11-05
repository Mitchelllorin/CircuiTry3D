import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BoardLimits,
  CatalogEntry,
  GroundElement,
  Orientation,
  SchematicElement,
  TwoTerminalElement,
  Vec2,
  WireElement,
} from "../../schematic/types";
import { COMPONENT_CATALOG } from "../../schematic/catalog";
import { SymbolStandard } from "../../schematic/standards";
import BuilderViewport from "./BuilderViewport";
import ComponentDrawer from "./ComponentDrawer";

const SNAP_STEP = 0.5;
const MIN_SEGMENT_LENGTH = SNAP_STEP;

const BOARD_LIMITS: BoardLimits = {
  minX: -7.5,
  maxX: 7.5,
  minZ: -5.5,
  maxZ: 5.5,
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snapValue = (value: number, step = SNAP_STEP) => Math.round(value / step) * step;

const clampPoint = (point: Vec2): Vec2 => ({
  x: clampValue(snapValue(point.x), BOARD_LIMITS.minX, BOARD_LIMITS.maxX),
  z: clampValue(snapValue(point.z), BOARD_LIMITS.minZ, BOARD_LIMITS.maxZ),
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
      length: Math.abs(end.x - snappedStart.x),
    };
  }
  const end: Vec2 = { x: snappedStart.x, z: snappedTarget.z };
  return {
    start: snappedStart,
    end,
    orientation: "vertical" as Orientation,
    length: Math.abs(end.z - snappedStart.z),
  };
};

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `element-${Math.random().toString(36).slice(2, 10)}`;

const pointKey = (point: Vec2) => `${point.x.toFixed(3)}|${point.z.toFixed(3)}`;

const formatPoint = (point: Vec2) => `(${point.x.toFixed(1)}, ${point.z.toFixed(1)})`;

type BuilderWorkspaceProps = {
  symbolStandard: SymbolStandard;
};

export function BuilderWorkspace({ symbolStandard }: BuilderWorkspaceProps) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(COMPONENT_CATALOG[0]?.id ?? "");
  const [elements, setElements] = useState<SchematicElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ mode: "two-point"; entry: CatalogEntry; start: Vec2; current: Vec2 } | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [labelCounters, setLabelCounters] = useState<Record<string, number>>({});
  const [singleNodeOrientation, setSingleNodeOrientation] = useState<Orientation>("horizontal");

  const selectedCatalogEntry = useMemo(() => {
    const entry = COMPONENT_CATALOG.find((item) => item.id === selectedCatalogId);
    return entry ?? COMPONENT_CATALOG[0];
  }, [selectedCatalogId]);

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedElementId) ?? null,
    [elements, selectedElementId]
  );

  const instructions = draft
    ? `Move the cursor to set the ${draft.entry.name.toLowerCase()} span, then click to confirm placement.`
    : `Choose from the component drawer, then click the board to place a ${selectedCatalogEntry.name.toLowerCase()}.`;

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
        current: snapped,
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
          orientation: singleNodeOrientation,
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
          path: [resolved.start, resolved.end],
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
            [prefix]: nextIndex,
          }));
        }

        const newComponent: TwoTerminalElement = {
          id: createId(),
          kind: entry.kind as TwoTerminalElement["kind"],
          label,
          start: resolved.start,
          end: resolved.end,
          orientation: resolved.orientation,
        };
        setElements((prev) => [...prev, newComponent]);
        setSelectedElementId(newComponent.id);
        setFeedbackMessage(
          `${entry.name} placed ${formatPoint(resolved.start)} → ${formatPoint(resolved.end)}.`
        );
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
        path: [resolved.start, resolved.end],
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
      orientation: resolved.orientation,
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
            detail: `${formatPoint(wire.path[0])} → ${formatPoint(wire.path[wire.path.length - 1])}`,
          };
        }
        if (element.kind === "ground") {
          const ground = element as GroundElement;
          return {
            id: element.id,
            title: "Ground",
            detail: `${formatPoint(ground.position)} · ${ground.orientation}`,
          };
        }
        const component = element as TwoTerminalElement;
        return {
          id: element.id,
          title: component.label,
          detail: `${formatPoint(component.start)} → ${formatPoint(component.end)}`,
        };
      }),
    [elements]
  );

  return (
    <div className="schematic-workspace builder-mode">
      <ComponentDrawer
        entries={COMPONENT_CATALOG}
        selectedId={selectedCatalogEntry?.id ?? null}
        onSelect={handleCatalogSelect}
        description="Tap a component to arm placement, then click two snapped points on the board."
        defaultOpen
      />

      <section className="schematic-stage" aria-live="polite">
        <BuilderViewport
          elements={elements}
          previewElement={previewElement}
          selectedElementId={selectedElementId}
          draftAnchor={draft ? draft.start : null}
          hoverPoint={hoverPoint}
          onBoardPointClick={handleBoardClick}
          onBoardPointMove={handleBoardHover}
          onElementClick={handleElementClick}
          symbolStandard={symbolStandard}
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
                      {formatPoint(
                        (selectedElement as WireElement).path[(selectedElement as WireElement).path.length - 1]
                      )}
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
                      className={
                        element.id === selectedElementId ? "element-button is-selected" : "element-button"
                      }
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
  );
}

export default BuilderWorkspace;
