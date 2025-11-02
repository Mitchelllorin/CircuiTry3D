import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PartialWireMetrics, WireMetricKey, WireMetrics } from "../../utils/electrical";
import { formatMetricValue, formatNumber } from "../../utils/electrical";

export const METRIC_ORDER: WireMetricKey[] = ["watts", "current", "resistance", "voltage"];

export const METRIC_HEADERS: Record<WireMetricKey, { label: string; description: string }> = {
  watts: { label: "W", description: "Watts" },
  current: { label: "I", description: "Current (A)" },
  resistance: { label: "R", description: "Resistance (Ω)" },
  voltage: { label: "E", description: "Voltage (V)" },
};

export const METRIC_UNITS: Record<WireMetricKey, string> = {
  watts: "W",
  current: "A",
  resistance: "Ω",
  voltage: "V",
};

export const METRIC_PRECISION: Record<WireMetricKey, number> = {
  watts: 2,
  current: 3,
  resistance: 2,
  voltage: 2,
};

export type WorksheetEntryStatus = "given" | "blank" | "invalid" | "correct" | "incorrect";

export type WorksheetEntry = {
  raw: string;
  value: number | null;
  status: WorksheetEntryStatus;
  given: boolean;
};

export type WorksheetEntries = Record<string, Record<WireMetricKey, WorksheetEntry>>;

export type WireTableRow = {
  id: string;
  label: string;
  role: "source" | "load" | "total";
  givens?: PartialWireMetrics;
  metrics: WireMetrics;
};

export type WireTableProps = {
  rows: WireTableRow[];
  revealAll: boolean;
  highlight?: { rowId: string; key: WireMetricKey };
  entries: WorksheetEntries;
  onChange(rowId: string, key: WireMetricKey, raw: string): void;
};

const formatWorksheetNumber = (value: number, key: WireMetricKey) => formatNumber(value, METRIC_PRECISION[key]);

const buildGridTemplate = (columnCount: number) =>
  `var(--worksheet-metric-width, 140px) repeat(${columnCount}, minmax(0, 1fr))`;

type CellStatus = WorksheetEntryStatus | "revealed";

export default function WireTable({ rows, revealAll, highlight, entries, onChange }: WireTableProps) {
  const gridTemplateColumns = buildGridTemplate(rows.length);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);

  type EditableCell = {
    id: string;
    metric: WireMetricKey;
    rowId: string;
    columnIndex: number;
    metricIndex: number;
  };

  const editableCells = useMemo<EditableCell[]>(() => {
    if (revealAll) {
      return [];
    }

    const result: EditableCell[] = [];

    METRIC_ORDER.forEach((metric, metricIndex) => {
      rows.forEach((row, columnIndex) => {
        const entry = entries[row.id]?.[metric];
        const givenFromRow = typeof row.givens?.[metric] === "number" && Number.isFinite(row.givens[metric]);
        const isGiven = entry?.given ?? givenFromRow;
        if (!isGiven) {
          result.push({
            id: `${row.id}:${metric}`,
            metric,
            rowId: row.id,
            columnIndex,
            metricIndex,
          });
        }
      });
    });

    return result;
  }, [entries, revealAll, rows]);

  const editableCellMap = useMemo(() => {
    const map = new Map<string, EditableCell>();
    editableCells.forEach((cell) => {
      map.set(cell.id, cell);
    });
    return map;
  }, [editableCells]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const registerInput = useCallback((cellId: string) => {
    return (node: HTMLInputElement | null) => {
      if (node) {
        inputRefs.current[cellId] = node;
      } else {
        delete inputRefs.current[cellId];
      }
    };
  }, []);

  const focusCell = useCallback((cellId: string | null) => {
    if (!cellId) {
      return;
    }
    const node = inputRefs.current[cellId];
    if (node) {
      window.requestAnimationFrame(() => {
        node.focus();
        node.select?.();
      });
    }
  }, []);

  const findDirectionalCell = useCallback(
    (current: EditableCell, direction: "left" | "right" | "up" | "down") => {
      if (!editableCells.length) {
        return null;
      }

      const horizontal = direction === "left" || direction === "right";
      const sameLine = editableCells
        .filter((cell) =>
          horizontal
            ? cell.metricIndex === current.metricIndex
            : cell.columnIndex === current.columnIndex
        )
        .sort((a, b) =>
          horizontal ? a.columnIndex - b.columnIndex : a.metricIndex - b.metricIndex
        );

      if (!sameLine.length) {
        return null;
      }

      if (horizontal) {
        const iterator = direction === "right" ? sameLine : [...sameLine].reverse();
        const candidate = iterator.find((cell) =>
          direction === "right"
            ? cell.columnIndex > current.columnIndex
            : cell.columnIndex < current.columnIndex
        );
        return candidate ?? iterator[0] ?? null;
      }

      // vertical
      const iterator = direction === "down" ? sameLine : [...sameLine].reverse();
      const candidate = iterator.find((cell) =>
        direction === "down"
          ? cell.metricIndex > current.metricIndex
          : cell.metricIndex < current.metricIndex
      );
      return candidate ?? iterator[0] ?? null;
    },
    [editableCells]
  );

  const moveFocus = useCallback(
    (currentId: string, direction: "left" | "right" | "up" | "down") => {
      const current = editableCellMap.get(currentId);
      if (!current) {
        focusCell(editableCells[0]?.id ?? null);
        return;
      }
      const nextCell = findDirectionalCell(current, direction);
      if (!nextCell || nextCell.id === current.id) {
        return;
      }
      focusCell(nextCell.id);
    },
    [editableCellMap, editableCells, findDirectionalCell, focusCell]
  );

  const handleNavigationKey = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>, cellId: string) => {
      if (!editableCellMap.size) {
        return;
      }

      switch (event.key) {
        case "Enter": {
          event.preventDefault();
          moveFocus(cellId, event.shiftKey ? "up" : "down");
          return;
        }
        case "ArrowDown": {
          event.preventDefault();
          moveFocus(cellId, "down");
          return;
        }
        case "ArrowUp": {
          event.preventDefault();
          moveFocus(cellId, "up");
          return;
        }
        case "ArrowRight": {
          event.preventDefault();
          moveFocus(cellId, "right");
          return;
        }
        case "ArrowLeft": {
          event.preventDefault();
          moveFocus(cellId, "left");
          return;
        }
        default:
          return;
      }
    },
    [editableCellMap, moveFocus]
  );

  const getColumnLetter = useCallback((index: number) => {
    let remainder = index;
    let label = "";
    while (remainder >= 0) {
      label = String.fromCharCode(65 + (remainder % 26)) + label;
      remainder = Math.floor(remainder / 26) - 1;
    }
    return label;
  }, []);

  const renderCell = (
    row: WireTableRow,
    key: WireMetricKey,
    metricIndex: number,
    columnIndex: number
  ) => {
    const entry = entries[row.id]?.[key];
    const expected = row.metrics[key];
    const expectedDisplay = Number.isFinite(expected) ? formatWorksheetNumber(expected, key) : "—";
    const givenFromRow = typeof row.givens?.[key] === "number" && Number.isFinite(row.givens[key]);
    const isGiven = entry?.given ?? givenFromRow;
    const highlightActive = highlight && highlight.rowId === row.id && highlight.key === key;
    const statusBase: WorksheetEntryStatus | "blank" = entry?.status ?? (isGiven ? "given" : "blank");
    const cellStatus: CellStatus = revealAll ? "revealed" : statusBase;
    const unit = METRIC_UNITS[key];
    const ariaLabel = `${row.label} ${METRIC_HEADERS[key].description}`;
    const rawValue = entry?.raw ?? "";
    const inputInvalid = entry?.status === "invalid";
    const cellId = `${row.id}:${key}`;
    const isActive = activeCellId === cellId;
    const showInput = !revealAll && !isGiven;

    const statusHint = (() => {
      if (revealAll) {
        return "Revealed";
      }
      if (isGiven) {
        return "Given from schematic";
      }
      if (!entry || entry.status === "blank") {
        return "Enter a value";
      }
      if (entry.status === "correct") {
        return "Correct";
      }
      if (entry.status === "incorrect") {
        return "Check your math";
      }
      if (entry.status === "invalid") {
        return "Invalid number";
      }
      return "";
    })();

    return (
      <div
        key={key}
        className={`practice-table-cell worksheet-cell status-${cellStatus} role-${row.role} ${
          highlightActive ? "highlight" : ""
        }`}
        data-given={isGiven ? "true" : undefined}
        data-reveal={revealAll ? "true" : undefined}
        data-active={isActive ? "true" : undefined}
        role="gridcell"
        data-column={columnIndex}
        data-metric-index={metricIndex}
      >
        {showInput ? (
          <div className="worksheet-input-wrapper">
            <input
              ref={registerInput(cellId)}
              type="text"
              className="worksheet-input"
              inputMode="decimal"
              value={rawValue}
              placeholder="—"
              onChange={(event) => onChange(row.id, key, event.target.value)}
              onFocus={() => setActiveCellId(cellId)}
              onBlur={() => {
                setActiveCellId((current) => (current === cellId ? null : current));
              }}
              onKeyDown={(event) => handleNavigationKey(event, cellId)}
              aria-label={ariaLabel}
              aria-invalid={inputInvalid ? "true" : undefined}
            />
            <span className="worksheet-unit" aria-hidden="true">
              {unit}
            </span>
          </div>
        ) : (
          <span className="worksheet-value" aria-label={`${ariaLabel} ${formatMetricValue(expected, key)}`}>
            <span>{expectedDisplay}</span>
            <span className="worksheet-unit" aria-hidden="true">
              {unit}
            </span>
          </span>
        )}
        {isGiven ? <span className="worksheet-chip">Given</span> : null}
        {statusHint ? <span className={`worksheet-hint hint-${cellStatus}`}>{statusHint}</span> : null}
      </div>
    );
  };

  return (
    <div className="practice-table" role="grid" aria-label="W.I.R.E. worksheet">
      <div className="practice-table-header" role="row" style={{ gridTemplateColumns }}>
        <div className="practice-table-cell heading metric-heading" role="columnheader">
          <span className="metric-heading-title">Metric</span>
          <span className="metric-caption">W · I · R · E</span>
        </div>
        {rows.map((row, columnIndex) => (
          <div
            key={row.id}
            className={`practice-table-cell heading component-heading role-${row.role}`}
            role="columnheader"
          >
            <span className="column-letter" aria-hidden="true">
              {getColumnLetter(columnIndex)}
            </span>
            <span className="component-label">{row.label}</span>
            <span className="component-caption">
              {row.role === "source" ? "Source" : row.role === "total" ? "Totals" : "Component"}
            </span>
          </div>
        ))}
      </div>
      <div className="practice-table-body">
        {METRIC_ORDER.map((metric, metricIndex) => (
          <div
            key={metric}
            className="practice-table-row metric-row"
            role="row"
            style={{ gridTemplateColumns }}
            data-metric={metric}
          >
            <div className="practice-table-cell metric-label" role="rowheader">
              <span className="row-index" aria-hidden="true">
                {metricIndex + 1}
              </span>
              <span className={`metric-pill metric-${metric}`}>{METRIC_HEADERS[metric].label}</span>
              <span className="metric-caption">{METRIC_HEADERS[metric].description}</span>
            </div>
            {rows.map((row, columnIndex) => renderCell(row, metric, metricIndex, columnIndex))}
          </div>
        ))}
      </div>
    </div>
  );
}

