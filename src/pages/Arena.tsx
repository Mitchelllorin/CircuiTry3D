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

type ComponentMetricEntry = {
  key: string;
  label: string;
  displayValue: string;
  numericValue: number | null;
  unit: string | null;
};

type ComponentShowdownProfile = {
  uid: string;
  name: string;
  type: string;
  summary: string | null;
  metrics: ComponentMetricEntry[];
};

const METRIC_UNIT_MAP: Record<string, string> = {
  ambienthumiditypercent: "%",
  ambienttemperature: "C",
  capacitance: "F",
  capacitymah: "mAh",
  current: "A",
  currentpeak: "A",
  currentrms: "A",
  dutycyclepercent: "%",
  efficiency: "%",
  energydelivered: "J",
  energy: "J",
  forwardvoltage: "V",
  frequencyhz: "Hz",
  impedance: "Ω",
  inductance: "H",
  internalresistance: "Ω",
  loadimpedanceohms: "Ω",
  maxdischargecurrent: "A",
  operatingvoltage: "V",
  onresistance: "Ω",
  offresistance: "Ω",
  power: "W",
  powerdissipation: "W",
  reactance: "Ω",
  resistance: "Ω",
  seriesresistance: "Ω",
  storedenergy: "J",
  temperature: "C",
  thermalresistance: "C/W",
  thermalrise: "C",
  transitiontimems: "ms",
  voltage: "V",
  operatingtemperature: "C"
};

function normalisePropertyKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function scaleNumber(value: number): { scaled: number; prefix: string } {
  const abs = Math.abs(value);
  if (abs >= 1e6) {
    return { scaled: value / 1e6, prefix: "M" };
  }
  if (abs >= 1e3) {
    return { scaled: value / 1e3, prefix: "k" };
  }
  if (abs > 0 && abs < 1e-3) {
    return { scaled: value * 1e6, prefix: "u" };
  }
  if (abs > 0 && abs < 1) {
    return { scaled: value * 1e3, prefix: "m" };
  }
  return { scaled: value, prefix: "" };
}

function formatPropertyLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) {
    return "Metric";
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatNumericForProperty(key: string, value: number): { display: string; unit: string | null } {
  const normalisedKey = normalisePropertyKey(key);
  const unit = METRIC_UNIT_MAP[normalisedKey] ?? null;

  if (unit === "%") {
    const decimals = Math.abs(value) < 10 ? 1 : 0;
    return { display: `${value.toFixed(decimals)} %`, unit };
  }

  if (unit === "ms" || unit === "mAh" || unit === "s") {
    const decimals = Math.abs(value) < 10 ? 2 : Math.abs(value) < 100 ? 1 : 0;
    return { display: `${value.toFixed(decimals)} ${unit}`, unit };
  }

  const { scaled, prefix } = scaleNumber(value);
  const decimals = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
  const combinedUnit = unit ? `${prefix}${unit}` : prefix;
  const suffix = combinedUnit ? ` ${combinedUnit}` : "";

  return { display: `${scaled.toFixed(decimals)}${suffix}`, unit };
}

function truncate(value: string, maxLength = 60): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function formatPropertyValue(key: string, value: unknown): {
  displayValue: string;
  numericValue: number | null;
  unit: string | null;
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = formatNumericForProperty(key, value);
    return { displayValue: formatted.display, numericValue: value, unit: formatted.unit };
  }

  if (typeof value === "boolean") {
    return { displayValue: value ? "Yes" : "No", numericValue: null, unit: null };
  }

  if (typeof value === "string") {
    return { displayValue: value, numericValue: null, unit: null };
  }

  if (Array.isArray(value)) {
    return {
      displayValue: `${value.length} item${value.length === 1 ? "" : "s"}`,
      numericValue: null,
      unit: null
    };
  }

  if (value && typeof value === "object") {
    return { displayValue: truncate(JSON.stringify(value)), numericValue: null, unit: null };
  }

  return { displayValue: "—", numericValue: null, unit: null };
}

function buildComponentProfile(component: ArenaComponent, index: number, uid: string): ComponentShowdownProfile {
  const name = component.componentNumber || component.type || `Component ${index + 1}`;
  const type = component.type ?? "Unknown";
  const summary = summariseProperties(component.properties) ?? null;
  const properties = component.properties && typeof component.properties === "object" ? component.properties : {};

  const seen = new Set<string>();
  const metrics: ComponentMetricEntry[] = [];

  Object.entries(properties).forEach(([key, rawValue]) => {
    const normalisedKey = normalisePropertyKey(key);
    if (!normalisedKey || seen.has(normalisedKey)) {
      return;
    }

    const { displayValue, numericValue, unit } = formatPropertyValue(key, rawValue);
    if (displayValue === "—") {
      return;
    }

    metrics.push({
      key: normalisedKey,
      label: formatPropertyLabel(key),
      displayValue,
      numericValue,
      unit
    });
    seen.add(normalisedKey);
  });

  const numericMetrics = metrics
    .filter((entry) => entry.numericValue !== null)
    .sort((a, b) => {
      const priority = getMetricPriority(a.key) - getMetricPriority(b.key);
      if (priority !== 0) {
        return priority;
      }
      return Math.abs((b.numericValue as number)) - Math.abs((a.numericValue as number));
    });

  const descriptiveMetrics = metrics.filter((entry) => entry.numericValue === null);

  const orderedMetrics = [...numericMetrics, ...descriptiveMetrics].slice(0, 8);

  return {
    uid,
    name,
    type,
    summary,
    metrics: orderedMetrics
  };
}

function getMetricPriority(key: string): number {
  const priorities = [
    "power",
    "current",
    "voltage",
    "impedance",
    "resistance",
    "capacitance",
    "inductance",
    "efficiency",
    "thermal",
    "temperature",
    "duty",
    "frequency"
  ];

  const index = priorities.findIndex((token) => key.includes(token));
  return index === -1 ? priorities.length : index;
}

type ComparisonRow = {
  key: string;
  label: string;
  aValue: string;
  bValue: string;
  deltaLabel: string | null;
};

function formatDeltaLabel(metricKey: string, unitHint: string | null, numericA: number | null, numericB: number | null): string | null {
  if (numericA === null || numericB === null) {
    return null;
  }

  const difference = numericA - numericB;
  if (!Number.isFinite(difference) || Math.abs(difference) < 1e-9) {
    return null;
  }

  const normalisedKey = normalisePropertyKey(metricKey);
  const unit = unitHint ?? METRIC_UNIT_MAP[normalisedKey] ?? null;

  if (unit === "%") {
    const decimals = Math.abs(difference) < 10 ? 1 : 0;
    return `Δ ${difference > 0 ? "+" : ""}${difference.toFixed(decimals)} %`;
  }

  const baseline = Math.max(Math.abs(numericB), 1e-9);
  const percentDelta = ((numericA - numericB) / baseline) * 100;
  const percentLabel = `${percentDelta > 0 ? "+" : ""}${percentDelta.toFixed(Math.abs(percentDelta) < 10 ? 1 : 0)}%`;
  const formatted = formatNumericForProperty(metricKey, difference).display;
  return `Δ ${difference > 0 ? "+" : ""}${formatted.trim()} (${percentLabel})`;
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
  const [showdownSelection, setShowdownSelection] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });

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

  const resolvedComponents = useMemo(() => {
    const components = importPayload?.state?.components ?? [];
    return components.map((component, index) => {
      const uid = component.id && component.id.length > 0 ? component.id : `${component.type ?? "component"}-${index}`;
      return { component, uid, index };
    });
  }, [importPayload]);

  const componentProfiles = useMemo<ComponentShowdownProfile[]>(() => {
    return resolvedComponents.map(({ component, uid, index }) => buildComponentProfile(component, index, uid));
  }, [resolvedComponents]);

  useEffect(() => {
    if (componentProfiles.length === 0) {
      setShowdownSelection((prev) => {
        if (prev.left === null && prev.right === null) {
          return prev;
        }
        return { left: null, right: null };
      });
      return;
    }

    setShowdownSelection((prev) => {
      const fallbackLeft = componentProfiles[0]?.uid ?? null;
      const fallbackRight = componentProfiles.length > 1 ? componentProfiles[1]?.uid ?? null : null;

      const left = prev.left && componentProfiles.some((profile) => profile.uid === prev.left) ? prev.left : fallbackLeft;

      let nextRight: string | null;
      if (prev.right && componentProfiles.some((profile) => profile.uid === prev.right)) {
        nextRight = prev.right;
      } else {
        nextRight = fallbackRight && fallbackRight !== left ? fallbackRight : null;
      }

      const updated = {
        left,
        right: nextRight
      };

      if (prev.left === updated.left && prev.right === updated.right) {
        return prev;
      }

      return updated;
    });
  }, [componentProfiles]);

  const componentOptions = useMemo(
    () =>
      componentProfiles.map((profile) => ({
        uid: profile.uid,
        label: `${profile.name} (${profile.type})`
      })),
    [componentProfiles]
  );

  const componentAProfile = useMemo(() => {
    if (!componentProfiles.length) {
      return null;
    }
    if (showdownSelection.left) {
      const match = componentProfiles.find((profile) => profile.uid === showdownSelection.left);
      if (match) {
        return match;
      }
    }
    return componentProfiles[0] ?? null;
  }, [componentProfiles, showdownSelection.left]);

  const componentBProfile = useMemo(() => {
    if (!componentProfiles.length) {
      return null;
    }
    if (showdownSelection.right) {
      const match = componentProfiles.find((profile) => profile.uid === showdownSelection.right);
      if (match) {
        return match;
      }
    }
    return componentProfiles.length > 1 ? componentProfiles[1] : null;
  }, [componentProfiles, showdownSelection.right]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (!componentAProfile && !componentBProfile) {
      return [];
    }

    const orderedKeys: string[] = [];

    const registerKeys = (profile: ComponentShowdownProfile | null) => {
      profile?.metrics.forEach((metric) => {
        if (!orderedKeys.includes(metric.key)) {
          orderedKeys.push(metric.key);
        }
      });
    };

    registerKeys(componentAProfile);
    registerKeys(componentBProfile);

    return orderedKeys
      .map((key) => {
        const metricA = componentAProfile?.metrics.find((metric) => metric.key === key);
        const metricB = componentBProfile?.metrics.find((metric) => metric.key === key);
        if (!metricA && !metricB) {
          return null;
        }

        const label = metricA?.label ?? metricB?.label ?? formatPropertyLabel(key);
        const aValue = metricA?.displayValue ?? "—";
        const bValue = metricB?.displayValue ?? "—";
        const deltaLabel = metricA && metricB ? formatDeltaLabel(label, metricA.unit ?? metricB.unit ?? null, metricA.numericValue, metricB.numericValue) : null;

        return {
          key,
          label,
          aValue,
          bValue,
          deltaLabel
        };
      })
      .filter((row): row is ComparisonRow => row !== null);
  }, [componentAProfile, componentBProfile]);

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
    return componentProfiles.slice(0, 6).map((profile) => {
      const fallbackMetric = profile.metrics[0] ? `${profile.metrics[0].label}: ${profile.metrics[0].displayValue}` : null;
      return {
        id: profile.uid,
        name: profile.name,
        type: profile.type,
        details: profile.summary ?? fallbackMetric
      };
    });
  }, [componentProfiles]);

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
          <section className="arena-card arena-showdown-card">
            <div className="arena-card-header">
              <div>
                <h2>Component Showdown</h2>
                <p className="arena-showdown-intro">Pick two components from your import to compare their key metrics side by side.</p>
              </div>
            </div>

            {componentProfiles.length > 0 ? (
              <>
                <div className="arena-showdown-selects">
                  <label className="arena-showdown-select">
                    <span className="arena-showdown-select-label">Component A</span>
                    <select
                      aria-label="Component A selection"
                      value={componentAProfile?.uid ?? showdownSelection.left ?? ""}
                      onChange={(event) =>
                        setShowdownSelection((prev) => ({
                          left: event.target.value || null,
                          right: prev.right
                        }))
                      }
                    >
                      <option value="" disabled>
                        {componentProfiles.length ? "Select component" : "No components"}
                      </option>
                      {componentOptions.map((option) => (
                        <option key={option.uid} value={option.uid}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="arena-showdown-select">
                    <span className="arena-showdown-select-label">Component B</span>
                    <select
                      aria-label="Component B selection"
                      value={showdownSelection.right ?? ""}
                      onChange={(event) =>
                        setShowdownSelection((prev) => ({
                          left: prev.left,
                          right: event.target.value || null
                        }))
                      }
                    >
                      <option value="">Select component</option>
                      {componentOptions.map((option) => (
                        <option key={option.uid} value={option.uid}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="arena-showdown-competitors">
                  <div className="arena-showdown-team">
                    <span className="arena-showdown-tag">Component A</span>
                    <h3>{componentAProfile?.name ?? "Select a component"}</h3>
                    <span className="arena-showdown-type">{componentAProfile?.type ?? "—"}</span>
                    {componentAProfile?.summary && <p>{componentAProfile.summary}</p>}
                  </div>
                  <div className="arena-showdown-versus">VS</div>
                  <div className="arena-showdown-team">
                    <span className="arena-showdown-tag">Component B</span>
                    <h3>{componentBProfile?.name ?? "Select a component"}</h3>
                    <span className="arena-showdown-type">{componentBProfile?.type ?? "—"}</span>
                    {componentBProfile?.summary && <p>{componentBProfile.summary}</p>}
                  </div>
                </div>

                {componentProfiles.length < 2 && (
                  <p className="arena-showdown-hint">Only one component available. Pull another build to compare head-to-head.</p>
                )}

                {comparisonRows.length > 0 ? (
                  <ul className="arena-showdown-table">
                    {comparisonRows.map((row) => (
                      <li key={row.key}>
                        <div className="arena-showdown-value value-a">{row.aValue}</div>
                        <div className="arena-showdown-metric">
                          <span className="metric-name">{row.label}</span>
                          {row.deltaLabel && <span className="arena-showdown-delta">{row.deltaLabel}</span>}
                        </div>
                        <div className="arena-showdown-value value-b">{row.bValue}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="arena-empty">No comparable metrics found for the selected components.</p>
                )}
              </>
            ) : (
              <p className="arena-empty">Sync a builder snapshot to start comparing components.</p>
            )}
          </section>

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
