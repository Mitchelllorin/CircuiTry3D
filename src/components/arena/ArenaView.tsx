import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import "../../styles/arena.css";
import type { ArenaViewProps } from "./types";

const ARENA_SESSION_STORAGE_PREFIX = "circuitry:arena-session:";
const ARENA_LAST_SESSION_KEY = `${ARENA_SESSION_STORAGE_PREFIX}last`;
const BASE_URL = import.meta.env.BASE_URL || "/";
const EMPTY_ARENA_SESSION_KEY = "no-session";

function getArenaBasePath(): string {
  return BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
}

function readArenaSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const localStorageSessionId = window.localStorage
    .getItem(ARENA_LAST_SESSION_KEY)
    ?.trim();
  if (localStorageSessionId) {
    return localStorageSessionId;
  }

  const sessionStorageSessionId = window.sessionStorage
    .getItem(ARENA_LAST_SESSION_KEY)
    ?.trim();
  return sessionStorageSessionId || null;
}

export default function ArenaView({
  variant = "page",
  onNavigateBack,
  onOpenBuilder,
  sessionId,
}: ArenaViewProps) {
  const { setWorkspaceMode } = useWorkspaceMode();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => sessionId ?? readArenaSessionId(),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const refreshSessionId = () => {
      setActiveSessionId(readArenaSessionId());
    };

    refreshSessionId();
    window.addEventListener("storage", refreshSessionId);
    window.addEventListener("focus", refreshSessionId);

    return () => {
      window.removeEventListener("storage", refreshSessionId);
      window.removeEventListener("focus", refreshSessionId);
    };
  }, []);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [reloadToken, activeSessionId]);

  const handleExitComplete = useCallback(() => {
    if (typeof onNavigateBack === "function") {
      onNavigateBack();
    }
  }, [onNavigateBack]);
  const handleOpenBuilderClick = useCallback(() => {
    if (typeof onOpenBuilder === "function") {
      onOpenBuilder();
    }
  }, [onOpenBuilder]);
  const showOpenBuilderButton =
    typeof onOpenBuilder === "function" && !isWorkspace;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sampleFallbackAppliedRef = useRef(false);

  const [importPayload, setImportPayload] = useState<ArenaPayload | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(DEFAULT_STATUS);
  const [manualImportText, setManualImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [recentImportSource, setRecentImportSource] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importPending, setImportPending] = useState(false);
  // ── F.U.S.E.™ state (analysis results from hidden arena.html iframe) ─────────
  const [fuseEvents, setFuseEvents] = useState<FuseFailureEvent[]>([]);
  const [fusePhysicsMetrics, setFusePhysicsMetrics] = useState<FusePhysicsMetrics | null>(null);
  const [fuseAnalysisReady, setFuseAnalysisReady] = useState(false);
  const [fuseRunning, setFuseRunning] = useState(false);
  const [fuseAlertLevel, setFuseAlertLevel] = useState<FuseAlertLevel>("none");
  const [showdownSelection, setShowdownSelection] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });
  const [battleState, setBattleState] = useState<"idle" | "battling" | "complete">("idle");
  const [battleWinner, setBattleWinner] = useState<"left" | "right" | "tie" | null>(null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [beforeMetrics, setBeforeMetrics] = useState<{ left: ComponentTelemetryEntry[] | null; right: ComponentTelemetryEntry[] | null }>({
    left: null,
    right: null
  });
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [varianceEnabled, setVarianceEnabled] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(["all"]));
  const [afterMetrics, setAfterMetrics] = useState<{ left: ComponentTelemetryEntry[] | null; right: ComponentTelemetryEntry[] | null }>({
    left: null,
    right: null
  });
  const [selectedScenario, setSelectedScenario] = useState<string>("standard");
  const [battleScore, setBattleScore] = useState<{ leftWins: number; rightWins: number; ties: number; totalRounds: number } | null>(null);
  const [nameplateTick, setNameplateTick] = useState(0);
  const battleSeedRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNameplateTick((previous) => (previous + 1) % 1000000);
    }, 900);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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

  const applyResolvedPayload = useCallback(
    (payload: ArenaPayload, meta: { statusMessage?: string; sourceOverride?: string; persist?: boolean } = {}) => {
      const enriched: ArenaPayload = {
        ...payload,
        source: meta.sourceOverride ?? payload.source ?? "external",
        generatedAt: payload.generatedAt ?? Date.now(),
        summary: payload.summary ?? buildSummaryFromComponents(payload.state?.components)
      };

      setImportPayload(enriched);
      setBridgeStatus(meta.statusMessage ?? `Loaded ${enriched.label ?? "component import"}.`);
      setImportError(null);
      const sourceBadgeParts = [enriched.source, enriched.label].filter(Boolean);
      setRecentImportSource(sourceBadgeParts.length ? sourceBadgeParts.join(" · ") : enriched.source ?? null);

      if (typeof window !== "undefined" && meta.persist !== false) {
        try {
          window.localStorage?.setItem(ARENA_STORAGE_KEY, JSON.stringify(enriched));
        } catch (error) {
          console.warn("Arena: unable to persist import payload", error);
        }
      }

      if (frameReady) {
        sendArenaMessage({ type: "arena:import", payload: enriched });
      }
    },
    [frameReady, sendArenaMessage]
  );

  const readLatestPayload = useCallback(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }

    return parseArenaPayload(window.localStorage.getItem(ARENA_STORAGE_KEY));
  }, []);

  const handleExternalImport = useCallback(
    (raw: unknown, meta: { label?: string; source: string; statusMessage?: string; persist?: boolean }) => {
      const normalised = normaliseImportPayload(raw, { label: meta.label, source: meta.source });
      if (!normalised) {
        setImportError("We couldn't find any components in that dataset.");
        setBridgeStatus("Import failed. Please verify the dataset format.");
        return false;
      }

      const enriched: ArenaPayload = {
        ...normalised,
        source: meta.source,
        label: normalised.label ?? meta.label,
        generatedAt: normalised.generatedAt ?? Date.now(),
        summary: normalised.summary ?? buildSummaryFromComponents(normalised.state?.components)
      };

      applyResolvedPayload(enriched, {
        sourceOverride: meta.source,
        statusMessage: meta.statusMessage,
        persist: meta.persist
      });
      return true;
    },
    [applyResolvedPayload]
  );

  const processImportFile = useCallback(
    (file: File) => {
      setImportPending(true);
      setImportError(null);
      setBridgeStatus(`Processing ${file.name}...`);

      const reader = new FileReader();
      reader.onload = () => {
        setImportPending(false);
        try {
          const text = typeof reader.result === "string" ? reader.result : new TextDecoder().decode(reader.result as ArrayBuffer);
          const parsed = JSON.parse(text);
          const success = handleExternalImport(parsed, {
            source: "upload",
            label: file.name.replace(/\.[^.]+$/u, ""),
            statusMessage: `Imported components from ${file.name}.`
          });
          if (!success) {
            setImportError("Uploaded file did not contain any components.");
          }
        } catch (error) {
          console.warn("Arena: file import parse failed", error);
          setImportError("Invalid JSON file. Please export from the builder or use the Arena JSON schema.");
          setBridgeStatus("Import failed. Invalid JSON dataset.");
        }
      };
      reader.onerror = () => {
        setImportPending(false);
        setImportError("Couldn't read the selected file. Please try again.");
        setBridgeStatus("Import failed while reading file.");
      };
      reader.onloadend = () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsText(file);
    },
    [handleExternalImport]
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      processImportFile(file);
    },
    [processImportFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
      event.dataTransfer?.clearData();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        processImportFile(file);
      }
    },
    [processImportFile]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsDragActive(false);
  }, []);

  const handleManualImportSubmit = useCallback(() => {
    if (!manualImportText.trim()) {
      setImportError("Paste a JSON payload to import components.");
      return;
    }

    setWorkspaceMode("build");
  }, [onNavigateBack, setWorkspaceMode]);

  const handleReloadArena = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const arenaSrc = useMemo(() => {
    const arenaPath = `${getArenaBasePath()}arena.html`;
    return activeSessionId
      ? `${arenaPath}?session=${encodeURIComponent(activeSessionId)}`
      : arenaPath;
  }, [activeSessionId]);

  const containerClassName = `arena-view arena-view--${variant} arena-view--active`;
  const showOpenBuilderButton =
    typeof onOpenBuilder === "function" && variant !== "workspace";

  return (
    <div
      className={`arena-page${isEmbedded ? " arena-page--embedded" : ""}${isWorkspace ? " arena-page--workspace" : ""}`}
    >
      <header className="arena-header">
        <div className="arena-header-left">
          {!isEmbedded && !isWorkspace && (
            <button className="arena-btn ghost" type="button" onClick={handleBackClick}>
              ← Back
            </button>
          )}
          <WordMark size="md" decorative />
          <div className="arena-title-group">
            <h1>Component Arena</h1>
            <p>Test and compare components side-by-side</p>
          </div>
        </div>
        <div className="arena-header-right">
          {showOpenBuilderButton ? (
            <button className="arena-btn outline" type="button" onClick={handleOpenBuilderClick}>
              Open Builder
            </button>
          ) : null}
        </div>
      </header>

      <div className={`arena-body${isWorkspace ? " arena-body--workspace-split" : ""}`}>

        <section className="arena-import-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>Import Components</h2>
            </div>
            <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
              <button className="arena-btn solid" type="button" onClick={handleSyncFromStorage} disabled={importPending}>
                Pull from Builder
              </button>
              <button className="arena-btn outline" type="button" onClick={handleClipboardImport} disabled={importPending}>
                Paste from Clipboard
              </button>
              {sampleImports.map((sample) => (
                <button
                  key={sample.id}
                  className="arena-btn ghost"
                  type="button"
                  onClick={() => handleSampleImport(sample.payload)}
                  disabled={importPending}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            {importError && <p className="arena-status-text arena-status-error" style={{marginTop: '12px'}}>{importError}</p>}
            {recentImportSource && (
              <p style={{marginTop: '12px', fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.9)'}}>Loaded: {recentImportSource}</p>
            )}
          </div>
        </section>

        <section className="arena-selectors-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>Select Components for Testing</h2>
            </div>
            {componentProfiles.length > 0 ? (
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
            ) : (
              <p className="arena-empty">No components loaded. Use the import section above to load components.</p>
            )}
          </div>
        </section>

        <section className="arena-metrics-selector-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>⚔️ Battle Metrics Selection</h2>
              <p style={{fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.85)', margin: '8px 0 0 0'}}>
                Choose which metrics to test in battle
              </p>
            </div>
            <div className="arena-metric-toggles">
              <button
                className={`arena-metric-toggle${selectedMetrics.has("all") ? " active" : ""}`}
                onClick={() => handleMetricToggle("all")}
                type="button"
              >
                <span className="toggle-icon">✨</span>
                <span className="toggle-label">ALL METRICS</span>
              </button>
              {TELEMETRY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`arena-metric-toggle${selectedMetrics.has(preset.id) ? " active" : ""}`}
                  onClick={() => handleMetricToggle(preset.id)}
                  type="button"
                >
                  <span className="toggle-icon">{preset.icon}</span>
                  <span className="toggle-label">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="arena-scenario-selector-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>🌍 Environmental Test Scenario</h2>
              <p style={{fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.85)', margin: '8px 0 0 0'}}>
                Select environmental conditions to test components under different operating scenarios
              </p>
            </div>
            <div className="arena-scenario-grid">
              {ENVIRONMENTAL_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  className={`arena-scenario-card${selectedScenario === scenario.id ? " active" : ""}`}
                  onClick={() => setSelectedScenario(scenario.id)}
                  type="button"
                >
                  <div className="scenario-icon">{scenario.icon}</div>
                  <div className="scenario-name">{scenario.name}</div>
                  <div className="scenario-description">{scenario.description}</div>
                  <div className="scenario-conditions">
                    {scenario.conditions.temperature !== undefined && (
                      <span className="condition-badge">🌡️ {scenario.conditions.temperature}°C</span>
                    )}
                    {scenario.conditions.voltage !== undefined && (
                      <span className="condition-badge">⚡ {scenario.conditions.voltage}%</span>
                    )}
                    {scenario.conditions.load !== undefined && (
                      <span className="condition-badge">💪 {scenario.conditions.load}%</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {selectedScenario !== "standard" && (
              <div className="arena-scenario-active-notice">
                <div className="notice-icon">{currentScenario.icon}</div>
                <div className="notice-content">
                  <div className="notice-title">Active Scenario: {currentScenario.name}</div>
                  <div className="notice-description">{currentScenario.description}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="arena-battle-section">
          <div className="arena-card">
            <div className="arena-card-header">
              <h2>Battle Stats</h2>
            </div>
            {battleState === "complete" && battleScore && battleScore.totalRounds > 0 ? (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '0.9rem'}}>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Battle Result (A)</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{formatShowdownRecord(battleScore.leftWins, battleScore.rightWins, battleScore.ties)}</div>
                </div>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Total Rounds</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{battleScore.totalRounds}</div>
                </div>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Battle Result (B)</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{formatShowdownRecord(battleScore.rightWins, battleScore.leftWins, battleScore.ties)}</div>
                </div>
              </div>
            ) : hasShowdown ? (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '0.9rem'}}>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Component A Record</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{leftRecord}</div>
                </div>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Total Rounds</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{showdownScore.totalRounds}</div>
                </div>
                <div>
                  <div style={{color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Component B Record</div>
                  <div style={{fontSize: '1.5rem', fontWeight: '600'}}>{rightRecord}</div>
                </div>
              </div>
            ) : (
              <p className="arena-empty">Select two components above to see battle stats</p>
            )}
          </div>

          <div className={`arena-battle-stage${battleState === "battling" ? " battling" : ""}${battleState === "complete" ? " battle-complete" : ""}`}>
            {/* Battle Effects Overlay - Lightning, Sparks, Energy Waves */}
            <div className="arena-battle-effects">
              {/* Lightning Bolts */}
              <div className="arena-lightning-container">
                <svg className="arena-lightning-bolt bolt-1" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M45 5 L42 25 L48 28 L35 50 L43 52 L25 95" />
                </svg>
                <svg className="arena-lightning-bolt bolt-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M55 10 L58 30 L52 33 L65 55 L57 58 L75 90" />
                </svg>
                <svg className="arena-lightning-bolt bolt-3" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M50 0 L47 20 L53 22 L45 45 L52 47 L48 70 L55 72 L50 100" />
                </svg>
              </div>

              {/* Electrical Arc along center divider */}
              <div className="arena-electrical-arc" />

              {/* Spark Particles */}
              <div className="arena-sparks-container">
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
                <div className="arena-spark" />
              </div>

              {/* Energy Wave Pulses */}
              <div className="arena-energy-waves">
                <div className="arena-energy-wave" />
                <div className="arena-energy-wave" />
                <div className="arena-energy-wave" />
              </div>

              {/* Screen Flash */}
              <div className="arena-battle-flash" />

              {/* Electric Crackle at top and bottom */}
              <div className="arena-electric-crackle top">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M30 0 L35 15 L45 10 L50 25 L55 15 L65 20 L70 0" />
                </svg>
              </div>
              <div className="arena-electric-crackle bottom">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M30 0 L35 15 L45 10 L50 25 L55 15 L65 20 L70 0" />
                </svg>
              </div>
            </div>

            {renderBattlePanel("left", {
              profile: componentAProfile,
              telemetry: componentATelemetry,
              warnings: componentAWarnings,
              highlightMetrics: leftHighlightMetrics,
              opponentMetricMap: componentBMetricMap,
              record: hasShowdown ? leftRecord : null,
              isChampion: teamAChampion,
              isTie: showdownTie,
              tag: "Component A"
            })}

            <div className="arena-battle-overlay">
              <div className="arena-toggle-controls">
                <button
                  className="arena-btn ghost small"
                  type="button"
                  onClick={() => setRotationEnabled((prev) => !prev)}
                  title={rotationEnabled ? "Stop component rotation" : "Enable component rotation"}
                >
                  {rotationEnabled ? "Rotation: On" : "Rotation: Off"}
                </button>
                <button
                  className="arena-btn ghost small"
                  type="button"
                  onClick={() => setVarianceEnabled((prev) => !prev)}
                  title={varianceEnabled ? "Disable randomness (more repeatable)" : "Enable variance (more realistic)"}
                >
                  {varianceEnabled ? "Variance: On" : "Variance: Off"}
                </button>
              </div>
              <button 
                className={`arena-battle-btn${battleState === "battling" ? " battling" : ""}${battleState === "complete" ? " complete" : ""}`}
                onClick={handleBattle}
                disabled={battleState === "battling" || !componentAProfile || !componentBProfile}
                type="button"
              >
                {battleState === "idle" ? "⚔️ BATTLE" : battleState === "battling" ? "TESTING..." : "BATTLE COMPLETE"}
              </button>
              
              {battleState === "complete" && battleWinner && (
                <div className="arena-winner-banner">
                  <div className="winner-label">🏆 WINNER 🏆</div>
                  <div className="winner-name">
                    {battleWinner === "left" ? componentAProfile?.name : battleWinner === "right" ? componentBProfile?.name : "TIE"}
                  </div>
                  {battleScore && battleScore.totalRounds > 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "rgba(226, 232, 240, 0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {battleScore.leftWins}-{battleScore.rightWins}{battleScore.ties > 0 ? `-${battleScore.ties}` : ""} · {battleScore.totalRounds} metric{battleScore.totalRounds === 1 ? "" : "s"}
                    </div>
                  ) : null}
                  <button className="arena-btn ghost small" onClick={handleResetBattle} type="button">Reset Battle</button>
                </div>
              )}
            </div>

            {renderBattlePanel("right", {
              profile: componentBProfile,
              telemetry: componentBTelemetry,
              warnings: componentBWarnings,
              highlightMetrics: rightHighlightMetrics,
              opponentMetricMap: componentAMetricMap,
              record: hasShowdown ? rightRecord : null,
              isChampion: teamBChampion,
              isTie: showdownTie,
              tag: "Component B"
            })}
          </div>
        </section>
      </div>

      <div className="arena-frame-wrapper" style={{display: 'none'}}>
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
    </div>
  );
}
