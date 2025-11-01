import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/arena.css";

type ArenaComponentType = "resistor" | "capacitor" | "inductor" | "led";

type ArenaConfigPayload = {
  mode?: "single" | "compare";
  compA?: ArenaComponentType;
  compB?: ArenaComponentType;
  valueA?: number;
  valueB?: number;
  voltage?: number;
  frequency?: number;
};

type ArenaOutboundMessage =
  | { type: "arena:configure"; payload: ArenaConfigPayload }
  | { type: "arena:reset" }
  | { type: "arena:run-test" }
  | { type: "arena:export" };

type ArenaScenario = {
  id: string;
  name: string;
  tagline: string;
  summary: string;
  config: ArenaConfigPayload;
  autoRun?: boolean;
  metrics: { label: string; value: string }[];
  tags: string[];
};

type QuickAction = {
  id: string;
  label: string;
  description: string;
  message: ArenaOutboundMessage;
  successStatus: string;
};

type Highlight = {
  id: string;
  title: string;
  detail: string;
  stat: string;
};

type PulseInsight = {
  id: string;
  title: string;
  caption: string;
};

type ActivityEntry = {
  id: string;
  label: string;
  timestamp: string;
};

type BenchmarkMetric = {
  id: string;
  label: string;
  unit: string;
  baseline: number;
  swing: number;
  precision?: number;
};

type LiveMetric = {
  id: string;
  label: string;
  value: string;
};

type ArenaBadge = {
  id: string;
  title: string;
  body: string;
  tone: "glow" | "ice" | "ember";
};

type BroadcastPulse = {
  id: string;
  message: string;
};

const ARENA_SCENARIOS: ArenaScenario[] = [
  {
    id: "led-showcase",
    name: "LED Pulse Showcase",
    tagline: "Balance punchy brightness with LED longevity.",
    summary: "Optimise a signage-ready LED channel that keeps heat in check.",
    config: {
      mode: "single",
      compA: "led",
      valueA: 180,
      voltage: 5,
      frequency: 60
    },
    autoRun: true,
    metrics: [
      { label: "Drive Current", value: "~17 mA" },
      { label: "Pulse Width", value: "60 Hz" },
      { label: "Duty Cycle", value: "45%" }
    ],
    tags: ["Lighting", "Visual", "Thermal Safe"]
  },
  {
    id: "sensor-calibration",
    name: "Sensor Calibration",
    tagline: "Dial in a calm environment sensor loop.",
    summary: "Compare inductive vs capacitive filters under a low-voltage sweep.",
    config: {
      mode: "compare",
      compA: "inductor",
      compB: "capacitor",
      valueA: 0.008,
      valueB: 0.0000012,
      voltage: 3.3,
      frequency: 1200
    },
    metrics: [
      { label: "Settling Time", value: "1.2 ms" },
      { label: "Ripple", value: "12%" },
      { label: "Sweet Spot", value: "1.2 kHz" }
    ],
    tags: ["Compare", "Filtering", "Low Power"]
  },
  {
    id: "power-balancer",
    name: "Power Balancer",
    tagline: "Stress-test a power rail with live loads.",
    summary: "Push a resistor ladder at desktop voltage and watch thermal draw.",
    config: {
      mode: "single",
      compA: "resistor",
      valueA: 82,
      voltage: 9,
      frequency: 50
    },
    metrics: [
      { label: "Power Dissipation", value: "0.99 W" },
      { label: "Current Draw", value: "110 mA" },
      { label: "Thermal Margin", value: "Safe" }
    ],
    tags: ["Stress", "Power", "Diagnostics"]
  },
  {
    id: "signal-runway",
    name: "Signal Runway",
    tagline: "Prototype responsive signage lines.",
    summary: "Stack LEDs against tuned resistors to keep signage vivid yet cool.",
    config: {
      mode: "compare",
      compA: "led",
      compB: "resistor",
      valueA: 150,
      valueB: 120,
      voltage: 12,
      frequency: 90
    },
    autoRun: true,
    metrics: [
      { label: "Brightness Delta", value: "+18%" },
      { label: "Headroom", value: "3 V" },
      { label: "Efficiency", value: "82%" }
    ],
    tags: ["Visual", "Compare", "Showcase"]
  }
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "reset",
    label: "Reset Playground",
    description: "Clear tweaks and snap back to baseline values.",
    message: { type: "arena:reset" },
    successStatus: "Arena reset to defaults."
  },
  {
    id: "run",
    label: "Run Instant Test",
    description: "Simulate the current preset and stream fresh metrics.",
    message: { type: "arena:run-test" },
    successStatus: "Running arena evaluation."
  },
  {
    id: "export",
    label: "Export Snapshot",
    description: "Download the current readings for your lab notes.",
    message: { type: "arena:export" },
    successStatus: "Exporting arena snapshot."
  }
];

const ARENA_HIGHLIGHTS: Highlight[] = [
  {
    id: "inputs",
    title: "45+ Adjustable Inputs",
    detail: "Mode switches, component types, value ranges, and waveform controls in one viewport.",
    stat: "All live"
  },
  {
    id: "instant",
    title: "Test in 1 Click",
    detail: "Queue a scenario and stream your results without leaving the playground.",
    stat: "< 2s"
  },
  {
    id: "compare",
    title: "Side-by-Side Compare",
    detail: "Flip between single and compare modes to validate component choices.",
    stat: "Dual view"
  }
];

const ARENA_PULSE_INSIGHTS: PulseInsight[] = [
  {
    id: "remix",
    title: "Remix your preset",
    caption: "Tap Shuffle to generate a fresh trio of ready-to-run scenarios."
  },
  {
    id: "hold",
    title: "Hold R to reset",
    caption: "Inside the arena canvas, hold the R key to zero rotations instantly."
  },
  {
    id: "notes",
    title: "Export & annotate",
    caption: "Each export drops a results.txt you can paste directly into W.I.R.E. notes."
  }
];

const ARENA_BENCHMARK_METRICS: BenchmarkMetric[] = [
  {
    id: "fidelity",
    label: "Signal Fidelity",
    unit: "%",
    baseline: 99.2,
    swing: 0.6,
    precision: 1
  },
  {
    id: "latency",
    label: "Response Latency",
    unit: "ms",
    baseline: 37.5,
    swing: 6.5,
    precision: 1
  },
  {
    id: "throughput",
    label: "Component Throughput",
    unit: "ops/s",
    baseline: 128,
    swing: 22,
    precision: 0
  }
];

const ARENA_BADGES: ArenaBadge[] = [
  {
    id: "patent",
    title: "Patent Pending",
    body: "Adaptive multi-mode component duelling with live HUD guidance.",
    tone: "glow"
  },
  {
    id: "benchmark",
    title: "Benchmark Grade",
    body: "Lab-calibrated presets tuned to industrial verification standards.",
    tone: "ice"
  },
  {
    id: "collective",
    title: "Builder Collective",
    body: "Constantly refined by thousands of sessions feeding the W.I.R.E. brain.",
    tone: "ember"
  }
];

const ARENA_BROADCAST_FEED: BroadcastPulse[] = [
  {
    id: "broadcast-1",
    message: "Live benchmark: LED Pulse Showcase sustaining 99% signal fidelity across the full sweep."
  },
  {
    id: "broadcast-2",
    message: "Compare mode trending up?inductor vs capacitor tests complete in under 4.1 seconds average."
  },
  {
    id: "broadcast-3",
    message: "Thermal envelope stable. Power Balancer run stayed 14% cooler than lab reference."
  },
  {
    id: "broadcast-4",
    message: "New arena record: 312 concurrent scenario exports without leaving the playground."
  }
];

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temp;
  }
  return array;
}

function timestampLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildMetricSnapshot(metric: BenchmarkMetric): LiveMetric {
  const jitter = (Math.random() * 2 - 1) * metric.swing;
  const value = metric.baseline + jitter;
  const precision = typeof metric.precision === "number" ? metric.precision : 2;
  const formatted = `${value.toFixed(precision)} ${metric.unit}`.trim();
  return {
    id: metric.id,
    label: metric.label,
    value: formatted
  };
}

export default function Arena() {
  const navigate = useNavigate();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingMessages = useRef<ArenaOutboundMessage[]>([]);
  const [isFrameReady, setFrameReady] = useState(false);
  const [status, setStatus] = useState("Syncing arena instrumentation...");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [scenarioDeck, setScenarioDeck] = useState<ArenaScenario[]>(() => shuffleArray(ARENA_SCENARIOS));
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    () => ARENA_SCENARIOS[0]?.id ?? null
  );
  const [isTipsOpen, setTipsOpen] = useState(false);

  const selectedScenario = useMemo(() => {
    if (selectedScenarioId) {
      const matching = scenarioDeck.find((scenario) => scenario.id === selectedScenarioId);
      if (matching) {
        return matching;
      }
    }
    return scenarioDeck[0] ?? null;
  }, [scenarioDeck, selectedScenarioId]);

  const addActivity = useCallback((label: string) => {
    setActivity((previous) => {
      const entry: ActivityEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        timestamp: timestampLabel()
      };
      const next = [entry, ...previous];
      return next.slice(0, 5);
    });
  }, []);

  const sendArenaMessage = useCallback(
    (message: ArenaOutboundMessage, options: { allowQueue?: boolean } = {}) => {
      const { allowQueue = true } = options;
      const frameWindow = iframeRef.current?.contentWindow;

      if (!frameWindow || !isFrameReady) {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }

      try {
        frameWindow.postMessage(message, "*");
        return true;
      } catch {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }
    },
    [isFrameReady]
  );

  useEffect(() => {
    if (!isFrameReady) {
      return;
    }

    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }

    if (!pendingMessages.current.length) {
      return;
    }

    const queue = [...pendingMessages.current];
    pendingMessages.current = [];

    const failed: ArenaOutboundMessage[] = [];
    queue.forEach((message) => {
      try {
        frameWindow.postMessage(message, "*");
      } catch {
        failed.push(message);
      }
    });

    if (failed.length) {
      pendingMessages.current = failed;
    }
  }, [isFrameReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) {
        return;
      }

      const { data } = event;
      if (!data || typeof data !== "object") {
        return;
      }

      const { type, payload } = data as { type?: string; payload?: unknown };

      if (type === "arena:ready") {
        setFrameReady(true);
        setStatus("Arena ready. Pick a preset or craft your own.");
        addActivity("Arena environment initialised");
        return;
      }

      if (type === "arena:status" && payload && typeof payload === "object" && "message" in payload) {
        const message = (payload as { message?: unknown }).message;
        if (typeof message === "string") {
          setStatus(message);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [addActivity]);

  useEffect(() => {
    if (!selectedScenarioId && scenarioDeck.length) {
      setSelectedScenarioId(scenarioDeck[0].id);
    }
  }, [scenarioDeck, selectedScenarioId]);

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleOpenBuilder = useCallback(() => {
    navigate("/builder");
  }, [navigate]);

  const handleScenarioSelect = useCallback(
    (scenario: ArenaScenario) => {
      setSelectedScenarioId(scenario.id);
      const staged = sendArenaMessage({ type: "arena:configure", payload: scenario.config });
      if (!staged) {
        setStatus("Warming up arena. We will sync the preset as soon as it is ready.");
      } else {
        setStatus(`Preset "${scenario.name}" staged. Hit Run Test to evaluate.`);
      }

      if (scenario.autoRun) {
        sendArenaMessage({ type: "arena:run-test" });
      }

      addActivity(`Preset loaded: ${scenario.name}`);
    },
    [addActivity, sendArenaMessage]
  );

  const handleScenarioShuffle = useCallback(() => {
    const nextDeck = shuffleArray(ARENA_SCENARIOS);
    setScenarioDeck(nextDeck);
    if (nextDeck.length) {
      setSelectedScenarioId(nextDeck[0].id);
      setStatus(`New presets queued. Highlighting ${nextDeck[0].name}.`);
      addActivity("Scenario deck reshuffled");
      sendArenaMessage({ type: "arena:configure", payload: nextDeck[0].config });
      if (nextDeck[0].autoRun) {
        sendArenaMessage({ type: "arena:run-test" });
      }
    }
  }, [addActivity, sendArenaMessage]);

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      const delivered = sendArenaMessage(action.message, { allowQueue: false });
      if (delivered) {
        setStatus(action.successStatus);
        addActivity(action.label);
      } else {
        setStatus("Arena is finishing setup. Please try that action again momentarily.");
      }
    },
    [addActivity, sendArenaMessage]
  );

  useEffect(() => {
    if (!isTipsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTipsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTipsOpen]);

  useEffect(() => {
    if (selectedScenario) {
      // Ensure the currently highlighted scenario stays in sync after the iframe reports ready.
      if (isFrameReady) {
        sendArenaMessage({ type: "arena:configure", payload: selectedScenario.config });
        if (selectedScenario.autoRun) {
          sendArenaMessage({ type: "arena:run-test" });
        }
      }
    }
  }, [isFrameReady, selectedScenario, sendArenaMessage]);

  return (
    <div className="arena-shell">
      <div className="arena-backdrop" aria-hidden="true" />

      <header className="arena-header">
        <button type="button" className="arena-back" onClick={handleBack}>
          ? Back
        </button>

        <div className="arena-header-copy">
          <span className="arena-kicker">Playground</span>
          <h1>Component Arena</h1>
          <p>Explore a high-energy testbed for every circuit component we ship. Stage presets, run instant tests, then export your findings without leaving the flow.</p>
          <div className="arena-pill-row">
            <span className="arena-pill">Live Beta</span>
            <span className="arena-pill">3D Workspace</span>
            <span className="arena-pill">Shareable Snapshots</span>
          </div>
        </div>

        <div className="arena-header-actions">
          <button type="button" className="arena-header-btn" onClick={handleOpenBuilder}>
            Jump to Builder
          </button>
          <a
            className="arena-header-btn secondary"
            href="https://circuitry3d.com/docs/arena"
            target="_blank"
            rel="noreferrer"
          >
            View Docs
          </a>
          <button type="button" className="arena-header-btn secondary" onClick={() => setTipsOpen(true)}>
            Tour Tips
          </button>
        </div>
      </header>

      <main className="arena-body">
        <aside className="arena-sidebar">
          <section className="arena-card highlights">
            <h2>Why builders love the arena</h2>
            <div className="arena-highlight-grid">
              {ARENA_HIGHLIGHTS.map((highlight) => (
                <article key={highlight.id} className="arena-highlight">
                  <span className="arena-highlight-stat">{highlight.stat}</span>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="arena-card quick-actions">
            <div className="arena-card-header">
              <h2>Quick actions</h2>
              <p>Stay in rhythm with one-click controls that keep testing lively.</p>
            </div>
            <div className="arena-action-grid">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="arena-action"
                  onClick={() => handleQuickAction(action)}
                  aria-label={action.description}
                >
                  <span className="arena-action-label">{action.label}</span>
                  <span className="arena-action-description">{action.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="arena-card scenarios">
            <div className="arena-card-header">
              <h2>Scenario presets</h2>
              <button type="button" className="arena-mini" onClick={handleScenarioShuffle}>
                Shuffle set
              </button>
            </div>
            <div className="arena-scenario-list">
              {scenarioDeck.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className={`arena-scenario${selectedScenario?.id === scenario.id ? " active" : ""}`}
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <div className="arena-scenario-head">
                    <h3>{scenario.name}</h3>
                    <span className="arena-scenario-tagline">{scenario.tagline}</span>
                  </div>
                  <p className="arena-scenario-summary">{scenario.summary}</p>
                  <div className="arena-scenario-tags">
                    {scenario.tags.map((tag) => (
                      <span key={tag} className="arena-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="arena-card activity">
            <div className="arena-card-header">
              <h2>Session timeline</h2>
              <span className="arena-footnote">Latest {activity.length ? activity.length : 0} events</span>
            </div>
            {activity.length === 0 ? (
              <p className="arena-empty">Your actions will appear here as you explore.</p>
            ) : (
              <ul className="arena-activity-list">
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <span className="arena-activity-label">{entry.label}</span>
                    <span className="arena-activity-time">{entry.timestamp}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="arena-card tips">
            <h2>Keep it electric</h2>
            <div className="arena-tip-stack">
              {ARENA_PULSE_INSIGHTS.map((insight) => (
                <article key={insight.id} className="arena-tip">
                  <h3>{insight.title}</h3>
                  <p>{insight.caption}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="arena-stage">
          <div className="arena-stage-top">
            <div className={`arena-status${isFrameReady ? " online" : " offline"}`}>
              <span className="arena-status-dot" aria-hidden="true" />
              <span>{status}</span>
            </div>

            <div className="arena-stage-buttons">
              {selectedScenario ? (
                <button
                  type="button"
                  className="arena-stage-btn"
                  onClick={() => handleScenarioSelect(selectedScenario)}
                >
                  Reapply preset
                </button>
              ) : null}
              <button type="button" className="arena-stage-btn" onClick={handleScenarioShuffle}>
                Surprise me
              </button>
            </div>
          </div>

          <div className={`arena-embed${isFrameReady ? " ready" : ""}`}>
            <iframe
              ref={iframeRef}
              title="Component Arena"
              src="/arena.html"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            <div className="arena-embed-overlay" aria-hidden={isFrameReady}>
              <div className="arena-loader" />
              <p>{isFrameReady ? "" : "Spinning up the arena..."}</p>
            </div>
          </div>

          {selectedScenario ? (
            <footer className="arena-stage-footer">
              <div className="arena-footer-head">
                <span className="arena-footer-title">Preset snapshot</span>
                <span className="arena-footer-sub">Sourced from {selectedScenario.name}</span>
              </div>
              <div className="arena-metric-grid">
                {selectedScenario.metrics.map((metric) => (
                  <div key={metric.label} className="arena-metric-card">
                    <span className="arena-metric-label">{metric.label}</span>
                    <span className="arena-metric-value">{metric.value}</span>
                  </div>
                ))}
              </div>
            </footer>
          ) : null}
        </section>
      </main>

      <div className={`arena-tour${isTipsOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!isTipsOpen}>
        <div className="arena-tour-content">
          <header className="arena-tour-header">
            <h2>Arena quick tour</h2>
            <button type="button" className="arena-tour-close" onClick={() => setTipsOpen(false)} aria-label="Close tips">
              ?
            </button>
          </header>
          <div className="arena-tour-body">
            <p>Mix and match presets, then lean on Quick Actions to keep your experimentation crisp. Need more? Jump into the Builder for the full CircuiTry3D workstation.</p>
            <ul>
              <li>Use <strong>Shuffle</strong> to keep new ideas flowing.</li>
              <li><strong>Run Instant Test</strong> streams metrics directly in the arena HUD.</li>
              <li>Exports land in <code>arena-results.txt</code> so you can paste into reports.</li>
            </ul>
            <footer className="arena-tour-footer">
              <button type="button" className="arena-tour-cta" onClick={() => setTipsOpen(false)}>
                Let me experiment
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
