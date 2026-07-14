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
    <section className={containerClassName}>
      <ArenaScene
        agents={agents}
        activeAgentId={currentTurnAgentId}
        highlight={highlight}
        fuseResults={fuseResults}
        winnerId={winnerId}
        transitionPhase={transitionPhase}
        variant={variant}
        onExitTransitionComplete={handleExitComplete}
      />
      <ArenaOverlay
        agents={agents}
        battleLog={battleLog}
        currentTurnAgentId={currentTurnAgentId}
        environment={environment}
        fuseResults={fuseResults}
        onEnvironmentChange={setEnvironment}
        onLoadCatalogComponent={handleLoadCatalogComponent}
        onResetBattle={resetBattle}
        onReturnToWorkspace={handleReturnToWorkspace}
        onOpenBuilder={showOpenBuilderButton ? onOpenBuilder : undefined}
        round={round}
        sessionLabel={sessionPayload?.sessionName ?? "CircuiTry3D Arena"}
        status={status}
        transitionPhase={transitionPhase}
        winnerName={winnerName}
      />
    </section>
  );
}
