import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/arena.css";

const ARENA_STORAGE_KEY = "circuiTry3d.arena.import";
const DEFAULT_STATUS = "Bring in your latest circuit to drill components.";

type ArenaMetrics = {
  voltage: number | null;
  current: number | null;
  resistance: number | null;
  power: number | null;
};

type ArenaSummary = {
  totalComponents: number;
  totalWires: number;
  totalJunctions: number;
  byType: Record<string, number>;
};

type ArenaComponent = {
  id?: string;
  type?: string;
  componentNumber?: string;
  properties?: Record<string, unknown>;
};

type ArenaState = {
  components?: ArenaComponent[];
  wires?: unknown[];
  junctions?: unknown[];
};

type ArenaPayload = {
  version?: string;
  source?: string;
  generatedAt?: number;
  metrics?: Partial<ArenaMetrics>;
  summary?: Partial<ArenaSummary>;
  state?: ArenaState;
};

type ArenaBridgeMessage =
  | { type: "arena:import"; payload: ArenaPayload }
  | { type: "arena:command"; payload: { command: string } };

function parseArenaPayload(value: string | null): ArenaPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ArenaPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Arena payload parse failed", error);
    return null;
  }
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const magnitude = Math.abs(value);
  let digits: number;

  if (magnitude >= 1000) {
    digits = 0;
  } else if (magnitude >= 100) {
    digits = 1;
  } else if (magnitude >= 10) {
    digits = 2;
  } else {
    digits = 3;
  }

  return `${value.toFixed(digits)} ${unit}`;
}

function summariseProperties(properties?: Record<string, unknown>): string | null {
  if (!properties) {
    return null;
  }

  if (typeof properties.value !== "undefined") {
    return `Value: ${properties.value}`;
  }

  const numericEntry = Object.entries(properties).find(([, propValue]) => typeof propValue === "number");
  if (numericEntry) {
    return `${numericEntry[0]}: ${numericEntry[1]}`;
  }

  const stringEntry = Object.entries(properties).find(([, propValue]) => typeof propValue === "string");
  if (stringEntry) {
    return `${stringEntry[0]}: ${stringEntry[1]}`;
  }

  return null;
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return "No sync yet";
  }

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "No sync yet";
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "No sync yet";
  }
}

export default function Arena() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [importPayload, setImportPayload] = useState<ArenaPayload | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(DEFAULT_STATUS);

  const sendArenaMessage = useCallback((message: ArenaBridgeMessage) => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) {
      return false;
    }

    try {
      frameWindow.postMessage(message, "*");
      return true;
    } catch (error) {
      console.warn("Arena bridge message failed", error);
      return false;
    }
  }, []);

  const readLatestPayload = useCallback(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }

    return parseArenaPayload(window.localStorage.getItem(ARENA_STORAGE_KEY));
  }, []);

  useEffect(() => {
    const existingPayload = readLatestPayload();
    if (existingPayload) {
      setImportPayload(existingPayload);
      setBridgeStatus("Loaded builder circuit snapshot.");
    }
  }, [readLatestPayload]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ARENA_STORAGE_KEY) {
        return;
      }

      const next = parseArenaPayload(event.newValue);
      if (next) {
        setImportPayload(next);
        setBridgeStatus("Synced new build from Builder.");
        if (frameReady) {
          sendArenaMessage({ type: "arena:import", payload: next });
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [frameReady, sendArenaMessage]);

  useEffect(() => {
    if (!frameReady || !importPayload) {
      return;
    }

    sendArenaMessage({ type: "arena:import", payload: importPayload });
  }, [frameReady, importPayload, sendArenaMessage]);

  const metrics = useMemo(() => {
    const base = importPayload?.metrics ?? {};
    return [
      { id: "power", letter: "W", label: "Watts", value: formatMetric(base.power ?? null, "W") },
      { id: "current", letter: "I", label: "Current", value: formatMetric(base.current ?? null, "A") },
      { id: "resistance", letter: "R", label: "Resistance", value: formatMetric(base.resistance ?? null, "Ω") },
      { id: "voltage", letter: "E", label: "Voltage", value: formatMetric(base.voltage ?? null, "V") }
    ];
  }, [importPayload]);

  const typeBreakdown = useMemo(() => {
    const byType = importPayload?.summary?.byType ?? {};
    return Object.entries(byType).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [importPayload]);

  const roster = useMemo(() => {
    const components = importPayload?.state?.components ?? [];
    return components.slice(0, 6).map((component, index) => {
      const name = component.componentNumber || component.type || `Component ${index + 1}`;
      const details = summariseProperties(component.properties);
      return {
        id: component.id ?? `${component.type ?? "component"}-${index}`,
        name,
        type: component.type ?? "Unknown",
        details
      };
    });
  }, [importPayload]);

  const circuitTotals = useMemo(() => {
    const summary = importPayload?.summary;
    if (!summary) {
      return [];
    }

    return [
      { label: "Components", value: summary.totalComponents ?? 0 },
      { label: "Wires", value: summary.totalWires ?? 0 },
      { label: "Junctions", value: summary.totalJunctions ?? 0 }
    ];
  }, [importPayload]);

  const handleSyncFromStorage = useCallback(() => {
    const latest = readLatestPayload();
    if (latest) {
      setImportPayload(latest);
      setBridgeStatus("Loaded builder circuit snapshot.");
      if (frameReady) {
        sendArenaMessage({ type: "arena:import", payload: latest });
      }
    } else {
      setBridgeStatus("No saved builder snapshot yet. Open Builder and choose Component Arena to sync.");
    }
  }, [frameReady, readLatestPayload, sendArenaMessage]);

  const handleCommand = useCallback(
    (command: "reset" | "run-test" | "export") => {
      const success = sendArenaMessage({ type: "arena:command", payload: { command } });
      setBridgeStatus(
        success ?
          (command === "reset"
            ? "Arena reset command sent."
            : command === "run-test"
            ? "Triggered quick test inside the arena."
            : "Requested arena export.")
          : "Unable to reach arena frame."
      );
    },
    [sendArenaMessage]
  );

  return (
    <div className="arena-page">
      <header className="arena-header">
        <div className="arena-header-left">
          <button className="arena-btn ghost" type="button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="arena-title-group">
            <h1>Component Arena</h1>
            <p>Lightning drills for your W.I.R.E. builds.</p>
          </div>
        </div>
        <div className="arena-header-right">
          <div className="arena-sync-meta">
            <span className="arena-sync-status">{importPayload ? "Builder linked" : "Waiting for builder import"}</span>
            <span className="arena-sync-timestamp">{formatTimestamp(importPayload?.generatedAt)}</span>
          </div>
          <button className="arena-btn outline" type="button" onClick={() => navigate("/app")}>Open Builder</button>
        </div>
      </header>

      <div className="arena-body">
        <aside className="arena-rail">
          <section className="arena-card">
            <div className="arena-card-header">
              <h2>W.I.R.E. Snapshot</h2>
              <button className="arena-btn link" type="button" onClick={handleSyncFromStorage}>
                {importPayload ? "Refresh" : "Sync"}
              </button>
            </div>
            <div className="arena-metric-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className={`arena-metric metric-${metric.letter.toLowerCase()}`}>
                  <div className="metric-letter">{metric.letter}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="arena-card">
            <div className="arena-card-header">
              <h2>Import Link</h2>
            </div>
            <p className="arena-status-text">{bridgeStatus}</p>
            <div className="arena-action-row">
              <button className="arena-btn solid" type="button" onClick={handleSyncFromStorage}>
                Pull Latest Builder State
              </button>
              <button className="arena-btn outline" type="button" onClick={() => handleCommand("export")}>
                Export Arena Stats
              </button>
            </div>
          </section>

          {circuitTotals.length > 0 && (
            <section className="arena-card">
              <div className="arena-card-header">
                <h2>Session Totals</h2>
              </div>
              <div className="arena-total-grid">
                {circuitTotals.map((item) => (
                  <div key={item.label} className="arena-total">
                    <span className="arena-total-label">{item.label}</span>
                    <span className="arena-total-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        <main className="arena-stage" aria-busy={!frameReady}>
          <div className="arena-toolbar">
            <button className="arena-btn ghost" type="button" onClick={() => handleCommand("reset")}>
              Reset Stage
            </button>
            <button className="arena-btn solid" type="button" onClick={() => handleCommand("run-test")}>
              Run Quick Test
            </button>
            <button className="arena-btn outline" type="button" onClick={() => handleCommand("export")}>
              Export Results
            </button>
          </div>
          <div className="arena-frame-wrapper">
            <iframe
              ref={iframeRef}
              className="arena-frame"
              title="Component Arena"
              src="arena.html"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onLoad={() => {
                setFrameReady(true);
                if (importPayload) {
                  sendArenaMessage({ type: "arena:import", payload: importPayload });
                }
              }}
            />
          </div>
        </main>

        <aside className="arena-details">
          <section className="arena-card">
            <div className="arena-card-header">
              <h2>Component Roster</h2>
            </div>
            {roster.length > 0 ? (
              <ul className="arena-roster">
                {roster.map((item) => (
                  <li key={item.id}>
                    <span className="roster-name">{item.name}</span>
                    <span className="roster-type">{item.type}</span>
                    {item.details && <span className="roster-detail">{item.details}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="arena-empty">No components imported yet.</p>
            )}
          </section>

          {typeBreakdown.length > 0 && (
            <section className="arena-card">
              <div className="arena-card-header">
                <h2>Type Breakdown</h2>
              </div>
              <ul className="arena-breakdown">
                {typeBreakdown.map(([type, count]) => (
                  <li key={type}>
                    <span className="breakdown-type">{type}</span>
                    <span className="breakdown-count">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
