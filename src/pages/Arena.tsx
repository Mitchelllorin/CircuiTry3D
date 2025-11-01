import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/arena.css";

type ArenaComponentType = "resistor" | "capacitor" | "inductor" | "led";

type ManufacturerComponentMetric = {
  label: string;
  value: string;
  unit?: string;
};

type ManufacturerComponent = {
  id: string;
  manufacturer: string;
  name: string;
  family: string;
  type: ArenaComponentType;
  footprint: string;
  datasheet: string;
  highlight: string;
  rating: number;
  metrics: ManufacturerComponentMetric[];
};

type ArenaMatchup = {
  id: string;
  title: string;
  summary: string;
  componentA: ManufacturerComponent;
  componentB: ManufacturerComponent;
  status: "queued" | "live" | "complete";
  focusMetric: string;
};

type ArenaConfigPayload = {
  mode?: "single" | "compare";
  compA?: ArenaComponentType;
  compB?: ArenaComponentType;
  valueA?: number;
  valueB?: number;
  voltage?: number;
  frequency?: number;
  componentIdA?: string;
  componentIdB?: string;
  manufacturerNameA?: string;
  manufacturerNameB?: string;
};

type ArenaOutboundMessage =
  | { type: "arena:configure"; payload: ArenaConfigPayload }
  | { type: "arena:reset" }
  | { type: "arena:run-test" }
  | { type: "arena:export" }
  | { type: "arena:register-components"; payload: { components: ManufacturerComponent[] } };

type ArenaScenario = {
  id: string;
  name: string;
  tagline: string;
  summary: string;
  config: ArenaConfigPayload;
  autoRun?: boolean;
  metrics: { label: string; value: string }[];
  tags: string[];
  manufacturerComponentIdA?: string;
  manufacturerComponentIdB?: string;
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
    tags: ["Lighting", "Visual", "Thermal Safe"],
    manufacturerComponentIdA: "lumatek-lumeon-180"
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
    tags: ["Compare", "Filtering", "Low Power"],
    manufacturerComponentIdA: "kinetic-precision-08",
    manufacturerComponentIdB: "quantacap-12"
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
    tags: ["Stress", "Power", "Diagnostics"],
    manufacturerComponentIdA: "ohmega-trace-82"
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
    tags: ["Visual", "Compare", "Showcase"],
    manufacturerComponentIdA: "aurion-photonedge-95",
    manufacturerComponentIdB: "ohmega-trace-82"
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
    message: "Compare mode trending up - inductor vs capacitor tests complete in under 4.1 seconds average."
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

const BROADCAST_INTERVAL_MS = 9000;
const MATCH_ROTATION_MS = 12000;
const BENCHMARK_REFRESH_MS = 11000;

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

function formatWithUnit(value: number, precision: number, unit: string): string {
  const trimmedUnit = unit?.trim();
  if (trimmedUnit) {
    return `${value.toFixed(precision)} ${trimmedUnit}`;
  }
  return value.toFixed(precision);
}

function createBenchmarkSnapshot(): LiveMetric[] {
  return ARENA_BENCHMARK_METRICS.map((metric) => {
    const jitter = (Math.random() - 0.5) * metric.swing;
    const reading = metric.baseline + jitter;
    const precision = metric.precision ?? 2;
    const direction = jitter >= 0 ? "?" : "?";
    return {
      id: metric.id,
      label: metric.label,
      value: `${formatWithUnit(reading, precision, metric.unit)} ${direction}`.trim()
    };
  });
}

function createMatchups(roster: ManufacturerComponent[]): ArenaMatchup[] {
  if (!Array.isArray(roster) || roster.length < 2) {
    return [];
  }

  const generated: ArenaMatchup[] = [];
  for (let index = 0; index < roster.length; index += 2) {
    const componentA = roster[index];
    const componentB = roster[(index + 1) % roster.length];

    if (!componentA || !componentB || componentA.id === componentB.id) {
      continue;
    }

    const focusMetric = componentA.metrics[0]?.label ?? componentB.metrics[0]?.label ?? "Signal";
    generated.push({
      id: `${componentA.id}-vs-${componentB.id}`,
      title: `${componentA.name} vs ${componentB.name}`,
      summary: `${componentA.manufacturer} ${componentA.family} faces ${componentB.manufacturer} ${componentB.family} on ${focusMetric.toLowerCase()}.`,
      componentA,
      componentB,
      status: index === 0 ? "live" : "queued",
      focusMetric
    });
  }

  return generated;
}

const SHOWCASE_MANUFACTURERS: ManufacturerComponent[] = [
  {
    id: "lumatek-lumeon-180",
    manufacturer: "Lumatek Labs",
    name: "Lumeon 180",
    family: "L-Drive Series",
    type: "led",
    footprint: "1206",
    datasheet: "https://lumatek.example.com/lumeon-180",
    highlight: "Poster-grade luminous flux with adaptive thermal throttling.",
    rating: 4.9,
    metrics: [
      { label: "Forward Vf", value: "2.1", unit: "V" },
      { label: "Max Current", value: "22", unit: "mA" },
      { label: "Flux", value: "24", unit: "lm" }
    ]
  },
  {
    id: "aurion-photonedge-95",
    manufacturer: "Aurion Optics",
    name: "PhotonEdge 95",
    family: "SpectraMax",
    type: "led",
    footprint: "3535",
    datasheet: "https://aurion.example.com/photonedge-95",
    highlight: "Spectrally balanced signage emitter optimised for long throws.",
    rating: 4.8,
    metrics: [
      { label: "CRI", value: "95" },
      { label: "Luminous Eff.", value: "182", unit: "lm/W" },
      { label: "Thermal Rise", value: "+9", unit: "degC" }
    ]
  },
  {
    id: "quantacap-12",
    manufacturer: "QuantaCap",
    name: "Q12 NanoCap",
    family: "Stability Core",
    type: "capacitor",
    footprint: "0603",
    datasheet: "https://quantacap.example.com/q12",
    highlight: "Ultra-low ESR ceramic capacitor tuned for precision filters.",
    rating: 4.7,
    metrics: [
      { label: "Capacitance", value: "1.2", unit: "uF" },
      { label: "ESR", value: "24", unit: "mOhm" },
      { label: "Temp Drift", value: "+/-2", unit: "%" }
    ]
  },
  {
    id: "kinetic-precision-08",
    manufacturer: "Kinetic Coilworks",
    name: "Precision 0.8",
    family: "VectorPulse",
    type: "inductor",
    footprint: "1210",
    datasheet: "https://kinetic.example.com/precision-08",
    highlight: "Low-profile inductor delivering razor-flat ripple control.",
    rating: 4.6,
    metrics: [
      { label: "Inductance", value: "8", unit: "mH" },
      { label: "Q Factor", value: "92" },
      { label: "Saturation", value: "2.4", unit: "A" }
    ]
  },
  {
    id: "ohmega-trace-82",
    manufacturer: "Ohmega Systems",
    name: "Trace 82",
    family: "Precision Ladder",
    type: "resistor",
    footprint: "0805",
    datasheet: "https://ohmega.example.com/trace-82",
    highlight: "Tight tolerance resistor engineered for thermal stability under load.",
    rating: 4.8,
    metrics: [
      { label: "Resistance", value: "82", unit: "Ohm" },
      { label: "Tolerance", value: "+/-0.1", unit: "%" },
      { label: "Temp Coeff.", value: "25", unit: "ppm" }
    ]
  }
];

const PARTNER_PREVIEW_PACK: ManufacturerComponent[] = [
  {
    id: "nova-link-210",
    manufacturer: "NovaLink",
    name: "Flux 210",
    family: "HelioWave",
    type: "led",
    footprint: "2835",
    datasheet: "https://novalink.example.com/flux-210",
    highlight: "Partner preview: hyper-uniform signage LED with auto bin-matching.",
    rating: 4.95,
    metrics: [
      { label: "Vf", value: "1.9", unit: "V" },
      { label: "Max Load", value: "28", unit: "mA" },
      { label: "Efficiency", value: "198", unit: "lm/W" }
    ]
  },
  {
    id: "resolute-guardian-33",
    manufacturer: "Resolute Circuits",
    name: "Guardian 33",
    family: "LoadShield",
    type: "resistor",
    footprint: "1206",
    datasheet: "https://resolute.example.com/guardian-33",
    highlight: "Partner preview: heat-distributing resistor for live competition harnesses.",
    rating: 4.85,
    metrics: [
      { label: "Resistance", value: "33", unit: "Ohm" },
      { label: "Pulse Tol.", value: "350", unit: "V" },
      { label: "Power", value: "0.75", unit: "W" }
    ]
  }
];

const DEFAULT_MATCHUPS = createMatchups(SHOWCASE_MANUFACTURERS);

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
  const [manufacturerRoster, setManufacturerRoster] = useState<ManufacturerComponent[]>(() => SHOWCASE_MANUFACTURERS);
  const [matchups, setMatchups] = useState<ArenaMatchup[]>(() => DEFAULT_MATCHUPS);
  const [matchIndex, setMatchIndex] = useState(0);
  const [benchmarkMetrics, setBenchmarkMetrics] = useState<LiveMetric[]>(() => createBenchmarkSnapshot());
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [isRosterSynced, setRosterSynced] = useState(false);

  const selectedScenario = useMemo(() => {
    if (selectedScenarioId) {
      const matching = scenarioDeck.find((scenario) => scenario.id === selectedScenarioId);
      if (matching) {
        return matching;
      }
    }
    return scenarioDeck[0] ?? null;
  }, [scenarioDeck, selectedScenarioId]);

  const broadcastMessage = useMemo(() => {
    if (!ARENA_BROADCAST_FEED.length) {
      return "Arena feed warming up.";
    }
    const index = broadcastIndex % ARENA_BROADCAST_FEED.length;
    return ARENA_BROADCAST_FEED[index]?.message ?? "Arena feed warming up.";
  }, [broadcastIndex]);

  const liveMatch = useMemo(() => {
    if (!matchups.length) {
      return null;
    }
    const index = matchIndex % matchups.length;
    return matchups[index] ?? null;
  }, [matchIndex, matchups]);

  const upcomingMatches = useMemo(() => {
    if (!matchups.length) {
      return [];
    }
    const index = matchIndex % matchups.length;
    return matchups.filter((_, idx) => idx !== index);
  }, [matchIndex, matchups]);

  const rosterCount = manufacturerRoster.length;
  const syncActionLabel = isRosterSynced ? "Resync manufacturer bench" : "Sync manufacturer bench";
  const syncActionDescription = isRosterSynced
    ? "Push the latest roster updates into the arena HUD."
    : "Send staged manufacturer components into the arena for live duels.";
  const rosterStatusLabel = isRosterSynced ? "Synced with arena" : "Staged locally";

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

  const scenarioToPayload = useCallback(
    (scenario: ArenaScenario): ArenaConfigPayload => {
      const payload: ArenaConfigPayload = { ...scenario.config };

      if (scenario.manufacturerComponentIdA) {
        payload.componentIdA = scenario.manufacturerComponentIdA;
        const recordA = manufacturerRoster.find((component) => component.id === scenario.manufacturerComponentIdA);
        if (recordA) {
          payload.manufacturerNameA = recordA.manufacturer;
        }
      }

      if (scenario.manufacturerComponentIdB) {
        payload.componentIdB = scenario.manufacturerComponentIdB;
        const recordB = manufacturerRoster.find((component) => component.id === scenario.manufacturerComponentIdB);
        if (recordB) {
          payload.manufacturerNameB = recordB.manufacturer;
        }
      }

      return payload;
    },
    [manufacturerRoster]
  );

  const integrateManufacturerFeed = useCallback(
    (components: ManufacturerComponent[], sourceLabel: string) => {
      if (!Array.isArray(components) || components.length === 0) {
        return;
      }

      setManufacturerRoster((previous) => {
        const map = new Map(previous.map((component) => [component.id, component]));
        components.forEach((component) => {
          if (component && component.id) {
            map.set(component.id, component);
          }
        });
        return Array.from(map.values());
      });

      addActivity(`Integrated ${components.length} components via ${sourceLabel}`);
      setRosterSynced(false);
    },
    [addActivity]
  );

  const handlePartnerPreview = useCallback(() => {
    integrateManufacturerFeed(PARTNER_PREVIEW_PACK, "partner preview pack");
    setStatus("Partner preview components staged. Resync to push them into the arena.");
  }, [integrateManufacturerFeed]);

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

  const handleSyncManufacturers = useCallback(() => {
    const delivered = sendArenaMessage(
      { type: "arena:register-components", payload: { components: manufacturerRoster } },
      { allowQueue: false }
    );

    if (delivered) {
      setRosterSynced(true);
      setStatus(`Synced ${manufacturerRoster.length} manufacturer components to the arena.`);
      addActivity(`Synced ${manufacturerRoster.length} manufacturer components with arena`);
    } else {
      setStatus("Arena is finishing setup. We'll sync manufacturer data as soon as it is ready.");
      addActivity("Queued manufacturer sync");
    }
  }, [addActivity, manufacturerRoster, sendArenaMessage]);

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
    setMatchups(createMatchups(manufacturerRoster));
    setMatchIndex(0);
  }, [manufacturerRoster]);

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

      if (type === "arena:components-registered") {
        setRosterSynced(true);

        const detail = payload && typeof payload === "object" ? (payload as { count?: unknown }) : undefined;
        const countValue = detail && typeof detail.count === "number" ? detail.count : undefined;

        if (typeof countValue === "number") {
          setStatus(`Arena acknowledged manufacturer roster (${countValue} components).`);
          addActivity(`Arena registered ${countValue} manufacturer components`);
        } else {
          setStatus("Arena acknowledged manufacturer roster sync.");
        }

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
    if (!ARENA_BROADCAST_FEED.length) {
      return undefined;
    }

    const ticker = window.setInterval(() => {
      setBroadcastIndex((index) => (index + 1) % ARENA_BROADCAST_FEED.length);
    }, BROADCAST_INTERVAL_MS);

    return () => {
      window.clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (!matchups.length) {
      return undefined;
    }

    const rotation = window.setInterval(() => {
      setMatchIndex((index) => (index + 1) % matchups.length);
    }, MATCH_ROTATION_MS);

    return () => {
      window.clearInterval(rotation);
    };
  }, [matchups]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBenchmarkMetrics(createBenchmarkSnapshot());
    }, BENCHMARK_REFRESH_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedScenarioId && scenarioDeck.length) {
      setSelectedScenarioId(scenarioDeck[0].id);
    }
  }, [scenarioDeck, selectedScenarioId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ components?: ManufacturerComponent[]; source?: string }>;
      if (!customEvent.detail) {
        return;
      }

      const { components, source } = customEvent.detail;
      if (Array.isArray(components) && components.length) {
        integrateManufacturerFeed(components, source ?? "external feed");
      }
    };

    window.addEventListener("arena:ingest-manufacturers", handler as EventListener);
    return () => {
      window.removeEventListener("arena:ingest-manufacturers", handler as EventListener);
    };
  }, [integrateManufacturerFeed]);

  useEffect(() => {
    if (!isFrameReady || isRosterSynced) {
      return;
    }

    const delivered = sendArenaMessage({
      type: "arena:register-components",
      payload: { components: manufacturerRoster }
    });

    if (delivered) {
      setRosterSynced(true);
      setStatus(`Manufacturer roster synced (${manufacturerRoster.length} components).`);
      addActivity(`Synced ${manufacturerRoster.length} manufacturer components with arena`);
    }
  }, [addActivity, isFrameReady, isRosterSynced, manufacturerRoster, sendArenaMessage]);

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleOpenBuilder = useCallback(() => {
    navigate("/builder");
  }, [navigate]);

  const handleScenarioSelect = useCallback(
    (scenario: ArenaScenario) => {
      setSelectedScenarioId(scenario.id);
      const payload = scenarioToPayload(scenario);
      const staged = sendArenaMessage({ type: "arena:configure", payload });
      if (!staged) {
        setStatus("Warming up arena. We will sync the preset as soon as it is ready.");
      } else {
        const manufacturerLabel = [payload.manufacturerNameA, payload.manufacturerNameB]
          .filter(Boolean)
          .join(" vs ");
        const statusMessage = manufacturerLabel
          ? `Preset "${scenario.name}" staged (${manufacturerLabel}). Hit Run Test to evaluate.`
          : `Preset "${scenario.name}" staged. Hit Run Test to evaluate.`;
        setStatus(statusMessage);
      }

      if (scenario.autoRun) {
        sendArenaMessage({ type: "arena:run-test" });
      }

      addActivity(`Preset loaded: ${scenario.name}`);
    },
    [addActivity, scenarioToPayload, sendArenaMessage]
  );

  const handleScenarioShuffle = useCallback(() => {
    const nextDeck = shuffleArray(ARENA_SCENARIOS);
    setScenarioDeck(nextDeck);
    if (nextDeck.length) {
      setSelectedScenarioId(nextDeck[0].id);
      const payload = scenarioToPayload(nextDeck[0]);
      const manufacturerLabel = [payload.manufacturerNameA, payload.manufacturerNameB]
        .filter(Boolean)
        .join(" vs ");
      setStatus(
        manufacturerLabel
          ? `New presets queued. Highlighting ${nextDeck[0].name} (${manufacturerLabel}).`
          : `New presets queued. Highlighting ${nextDeck[0].name}.`
      );
      addActivity("Scenario deck reshuffled");
      sendArenaMessage({ type: "arena:configure", payload });
      if (nextDeck[0].autoRun) {
        sendArenaMessage({ type: "arena:run-test" });
      }
    }
  }, [addActivity, scenarioToPayload, sendArenaMessage]);

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
        const payload = scenarioToPayload(selectedScenario);
        sendArenaMessage({ type: "arena:configure", payload });
        if (selectedScenario.autoRun) {
          sendArenaMessage({ type: "arena:run-test" });
        }
      }
    }
  }, [isFrameReady, scenarioToPayload, selectedScenario, sendArenaMessage]);

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
              <button
                type="button"
                className="arena-action accent"
                onClick={handleSyncManufacturers}
                aria-label={syncActionDescription}
              >
                <span className="arena-action-label">{syncActionLabel}</span>
                <span className="arena-action-description">{syncActionDescription}</span>
              </button>
            </div>
            <div className="arena-roster-cta">
              <button type="button" className="arena-chip" onClick={handlePartnerPreview}>
                Load partner preview pack
              </button>
              <span className="arena-footnote">Want your catalogue here? Dispatch a custom event to `arena:ingest-manufacturers`.</span>
            </div>
          </section>

          <section className="arena-card roster">
            <div className="arena-card-header">
              <h2>Manufacturer roster</h2>
              <button type="button" className="arena-mini" onClick={handleSyncManufacturers}>
                {isRosterSynced ? "Push update" : "Sync now"}
              </button>
            </div>
            <p className="arena-footnote">{rosterStatusLabel} - {rosterCount} components staged</p>
            <div className="arena-roster-list">
              {manufacturerRoster.map((component) => (
                <article key={component.id} className="arena-roster-card">
                  <div className="arena-roster-top">
                    <span className="arena-roster-manufacturer">{component.manufacturer}</span>
                    <span className="arena-roster-rating">
                      {typeof component.rating === "number" ? `${component.rating.toFixed(2)}*` : "n/a"}
                    </span>
                  </div>
                  <div className="arena-roster-name">{component.name}</div>
                  <p className="arena-roster-highlight">{component.highlight}</p>
                  <dl className="arena-roster-metric-grid">
                    {component.metrics.map((metric) => (
                      <div key={`${component.id}-${metric.label}`} className="arena-roster-metric">
                        <dt>{metric.label}</dt>
                        <dd>
                          {metric.value}
                          {metric.unit ? <span className="arena-roster-unit">{metric.unit}</span> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
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

          <div className="arena-broadcast">
            <span className="arena-broadcast-label">Global feed</span>
            <p className="arena-broadcast-text">{broadcastMessage}</p>
          </div>

          <section className="arena-stage-summaries">
            <div className="arena-benchmark-matrix">
              {benchmarkMetrics.map((metric) => (
                <article key={metric.id} className="arena-benchmark-card">
                  <span className="arena-benchmark-label">{metric.label}</span>
                  <span className="arena-benchmark-value">{metric.value}</span>
                </article>
              ))}
            </div>
            <div className="arena-badge-stack">
              {ARENA_BADGES.map((badge) => (
                <article key={badge.id} className={`arena-badge ${badge.tone}`}>
                  <h3>{badge.title}</h3>
                  <p>{badge.body}</p>
                </article>
              ))}
            </div>
          </section>

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

          <section className="arena-matchups">
            <div className="arena-matchups-head">
              <div>
                <span className="arena-footnote">Manufacturer championship</span>
                <h2>Live component duel</h2>
              </div>
              <button type="button" className="arena-mini" onClick={handleSyncManufacturers}>
                Push roster to arena
              </button>
            </div>
            {liveMatch ? (
              <div className="arena-live-match">
                <div className="arena-live-card">
                  <div className="arena-live-side">
                    <span className="arena-live-manufacturer">{liveMatch.componentA.manufacturer}</span>
                    <span className="arena-live-name">{liveMatch.componentA.name}</span>
                    <ul className="arena-live-metrics">
                      {liveMatch.componentA.metrics.slice(0, 2).map((metric) => (
                        <li key={`${liveMatch.componentA.id}-${metric.label}`}>
                          <span className="arena-live-metric-label">{metric.label}</span>
                          <span className="arena-live-metric-value">
                            {metric.value}
                            {metric.unit ? ` ${metric.unit}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="arena-live-versus">vs</div>
                  <div className="arena-live-side">
                    <span className="arena-live-manufacturer">{liveMatch.componentB.manufacturer}</span>
                    <span className="arena-live-name">{liveMatch.componentB.name}</span>
                    <ul className="arena-live-metrics">
                      {liveMatch.componentB.metrics.slice(0, 2).map((metric) => (
                        <li key={`${liveMatch.componentB.id}-${metric.label}`}>
                          <span className="arena-live-metric-label">{metric.label}</span>
                          <span className="arena-live-metric-value">
                            {metric.value}
                            {metric.unit ? ` ${metric.unit}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="arena-live-summary">{liveMatch.summary}</p>
                <span className="arena-footnote">Focus metric: {liveMatch.focusMetric}</span>
              </div>
            ) : (
              <p className="arena-empty">Add at least two manufacturer components to generate matchups.</p>
            )}
            {upcomingMatches.length ? (
              <ul className="arena-match-list">
                {upcomingMatches.map((match) => (
                  <li key={match.id} className="arena-match-card">
                    <div className="arena-match-teams">
                      <span className="arena-match-manufacturer">{match.componentA.manufacturer}</span>
                      <strong>{match.componentA.name}</strong>
                      <span className="arena-match-divider">vs</span>
                      <span className="arena-match-manufacturer">{match.componentB.manufacturer}</span>
                      <strong>{match.componentB.name}</strong>
                    </div>
                    <div className="arena-match-details">
                      <span className="arena-match-metric">Focus: {match.focusMetric}</span>
                      <span className="arena-match-summary">{match.summary}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </section>
      </main>

      <div className={`arena-tour${isTipsOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!isTipsOpen}>
        <div className="arena-tour-content">
          <header className="arena-tour-header">
            <h2>Arena quick tour</h2>
            <button type="button" className="arena-tour-close" onClick={() => setTipsOpen(false)} aria-label="Close tips">
              x
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
