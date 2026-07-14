import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuilderInvokeAction,
  BuilderMessage,
  LegacyModeState,
  LegacyMeterState,
  BuilderToolId,
  ArenaExportStatus,
  ArenaExportSummary,
  LegacyCircuitState,
  LegacyMeterState,
} from "../../components/builder/types";
import { createId } from "../../utils/id";

export type LegacySimulationPayload = {
  success: boolean;
  result?: unknown;
  error?: string;
};

export type CinematicFramePayload = {
  dataUrl: string;
  circuitName: string;
  timestamp: number;
};

export type CinematicVideoPayload = {
  dataUrl: string;
  circuitName: string;
  timestamp: number;
  durationMs: number;
};

const DEFAULT_METER_STATE: LegacyMeterState = {
  mode: "voltage",
  armed: false,
  reading: "—",
  subreading: "",
  instructions: "Enable probes to begin measuring.",
  probeA: "—",
  probeB: "—",
};

interface UseBuilderFrameOptions {
  appBasePath: string;
  onModeStateChange: (state: Partial<LegacyModeState>) => void;
  onToolChange: (tool: BuilderToolId) => void;
  onSimulationPulse: () => void;
  onCinematicFrame?: (payload: CinematicFramePayload) => void;
  onCinematicVideo?: (payload: CinematicVideoPayload) => void;
}

export function useBuilderFrame({
  appBasePath,
  onModeStateChange,
  onToolChange,
  onSimulationPulse,
  onCinematicFrame,
  onCinematicVideo,
}: UseBuilderFrameOptions) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingMessages = useRef<BuilderMessage[]>([]);
  const pendingArenaRequests = useRef<Map<string, { openWindow: boolean }>>(
    new Map(),
  );
  const simulationPulseTimer = useRef<number | null>(null);

  const [isFrameReady, setFrameReady] = useState(false);
  const [arenaExportStatus, setArenaExportStatus] =
    useState<ArenaExportStatus>("idle");
  const [arenaExportError, setArenaExportError] = useState<string | null>(null);
  const [lastArenaExport, setLastArenaExport] =
    useState<ArenaExportSummary | null>(null);
  const [lastSimulation, setLastSimulation] =
    useState<LegacySimulationPayload | null>(null);
  const [circuitState, setCircuitState] = useState<LegacyCircuitState | null>(
    null,
  );
  const [lastSimulationAt, setLastSimulationAt] = useState<string | null>(null);
  const [meterState, setMeterState] = useState<LegacyMeterState | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;

      // Strict source check: prefer event.source identity, but fall back to
      // checking the message shape when source is null/mismatched.  On some
      // Android WebViews (Capacitor), event.source can be null or a different
      // object reference even when the message genuinely originates from our
      // iframe.  Accepting well-typed "legacy:*" messages avoids the 15-second
      // ping-timeout fallback that previously locked users out.
      const msgType =
        event.data && typeof event.data === "object"
          ? (event.data as { type?: unknown }).type
          : undefined;
      const isLegacyProtocol =
        typeof msgType === "string" && msgType.startsWith("legacy:");

      if (!iframeWindow) {
        return;
      }
      if (event.source !== iframeWindow && !isLegacyProtocol) {
        return;
      }

      const { data } = event;
      if (!data || typeof data !== "object") {
        return;
      }

      const { type, payload } = data as { type?: string; payload?: unknown };

      if (type === "legacy:diag") {
        console.log("[CT3D-REACT] Diag from legacy:", event.data);
      }

      if (type === "legacy:ready") {
        setFrameReady(true);
        return;
      }

      if (type === "legacy:tool-state") {
        const tool =
          typeof (payload as { tool?: string })?.tool === "string"
            ? (payload as { tool?: string }).tool
            : undefined;
        if (tool === "wire" || tool === "measure" || tool === "junction") {
          onToolChange(tool);
        } else {
          onToolChange("select");
        }

        onModeStateChange({
          isWireMode: tool === "wire",
          isMeasureMode: tool === "measure",
          isRotateMode: tool === "rotate",
        });
        return;
      }

      if (type === "legacy:mode-state") {
        if (!payload || typeof payload !== "object") {
          return;
        }

        const next = payload as Partial<LegacyModeState>;
        onModeStateChange(next);
        return;
      }

      if (type === "legacy:simulation") {
        if (simulationPulseTimer.current !== null) {
          window.clearTimeout(simulationPulseTimer.current);
        }
        if (payload && typeof payload === "object") {
          setLastSimulation(payload as LegacySimulationPayload);
        } else {
          setLastSimulation(null);
        }
        onSimulationPulse();
        simulationPulseTimer.current = window.setTimeout(() => {
          simulationPulseTimer.current = null;
        }, 1400);
        setLastSimulationAt(new Date().toISOString());
        return;
      }

      if (type === "legacy:circuit-state") {
        if (!payload || typeof payload !== "object") {
          return;
        }
        setCircuitState(payload as LegacyCircuitState);
        return;
      }

      if (type === "legacy:meter-state") {
        if (!payload || typeof payload !== "object") {
          return;
        }
        setMeterState(payload as LegacyMeterState);
        return;
      }

      if (type === "legacy:arena-export") {
        const summary = (payload || {}) as ArenaExportSummary | undefined;
        if (summary && typeof summary.sessionId === "string") {
          setArenaExportStatus("ready");
          setArenaExportError(null);
          setLastArenaExport(summary);

          const requestId =
            typeof summary.requestId === "string"
              ? summary.requestId
              : undefined;
          let shouldOpenWindow = false;

          if (requestId) {
            const meta = pendingArenaRequests.current.get(requestId);
            if (meta) {
              shouldOpenWindow = Boolean(meta.openWindow);
              pendingArenaRequests.current.delete(requestId);
            }
          } else {
            shouldOpenWindow = true;
          }

          if (shouldOpenWindow && typeof window !== "undefined") {
            const targetUrl = `${appBasePath}arena?session=${encodeURIComponent(summary.sessionId)}`;
            window.open(targetUrl, "_blank", "noopener");
          }
        } else {
          setArenaExportStatus("error");
          setArenaExportError("Arena export returned an unexpected response");
        }
        return;
      }

      if (type === "legacy:cinematic-frame") {
        const p = (payload || {}) as CinematicFramePayload;
        if (onCinematicFrame && p.dataUrl) {
          onCinematicFrame(p);
        }
        return;
      }

      if (type === "legacy:cinematic-video") {
        const p = (payload || {}) as CinematicVideoPayload;
        if (onCinematicVideo && p.dataUrl) {
          onCinematicVideo(p);
        }
        return;
      }

      if (type === "legacy:arena-export:error") {
        const errorPayload = (payload || {}) as {
          message?: string;
          requestId?: string;
        };
        setArenaExportStatus("error");
        setArenaExportError(errorPayload?.message || "Arena export failed");
        if (errorPayload?.requestId) {
          pendingArenaRequests.current.delete(errorPayload.requestId);
        }
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [appBasePath, onModeStateChange, onToolChange, onSimulationPulse, onCinematicFrame, onCinematicVideo]);

  // On Android/Capacitor the iframe is served from the local bundle and can
  // fire its "legacy:ready" message before React's useEffect has registered
  // the window message listener (race condition).  To recover, we poll the
  // iframe with a lightweight "builder:ping" message every 800 ms until it
  // replies with "legacy:ready".  The interval is cleared as soon as the
  // frame signals readiness.
  useEffect(() => {
    if (isFrameReady) return;

    const PING_INTERVAL_MS = 300;
    const PING_TIMEOUT_MS = 4_000; // give up after 4 seconds and unlock the UI

    const intervalId = window.setInterval(() => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow) return;
      try {
        frameWindow.postMessage({ type: "builder:ping" }, "*");
      } catch {
        // iframe not yet accessible — retry on next tick
      }
    }, PING_INTERVAL_MS);

    // Safety-net: if the iframe never responds, unlock the UI anyway so the
    // app doesn't remain permanently disabled.
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setFrameReady(true);
    }, PING_TIMEOUT_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [isFrameReady]);

  useEffect(() => {
    return () => {
      if (simulationPulseTimer.current !== null) {
        window.clearTimeout(simulationPulseTimer.current);
        simulationPulseTimer.current = null;
      }
    };
  }, []);

  const postToBuilder = useCallback(
    (message: BuilderMessage, options: { allowQueue?: boolean } = {}) => {
      const { allowQueue = true } = options;
      const frameWindow = iframeRef.current?.contentWindow;

      if (!frameWindow || !isFrameReady) {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }

      try {
        console.log("[CT3D-REACT] postToBuilder:", message.type, message);
        frameWindow.postMessage(message, "*");
        return true;
      } catch {
        if (allowQueue) {
          pendingMessages.current.push(message);
        }
        return false;
      }
    },
    [isFrameReady],
  );

  useEffect(() => {
    if (!isFrameReady) {
      return;
    }

    // Flush actions that were queued while the iframe was still loading.
    const frameWindow = iframeRef.current?.contentWindow;
    if (frameWindow && pendingMessages.current.length > 0) {
      const queuedMessages = pendingMessages.current.splice(0);
      queuedMessages.forEach((message) => {
        try {
          frameWindow.postMessage(message, "*");
        } catch (error) {
          console.warn("Failed to flush pending builder message", message, error);
          pendingMessages.current.push(message);
        }
      });
    }

    postToBuilder(
      { type: "builder:request-mode-state" },
      { allowQueue: false },
    );
    // Sync the initial routing mode from Builder to legacy.
    // Builder defaults to freeform; legacy may have a cached mode in localStorage.
    // By not sending an override here, we let legacy report its actual mode back
    // via the mode-state response above, keeping both sides in sync.
    console.log("[CT3D-REACT] Frame ready — requested mode state sync from legacy");
  }, [isFrameReady, postToBuilder]);

  const triggerBuilderAction = useCallback(
    (action: BuilderInvokeAction, data?: Record<string, unknown>) => {
      postToBuilder({
        type: "builder:invoke-action",
        payload: { action, data },
      });
    },
    [postToBuilder],
  );

  const handleArenaSync = useCallback(
    (
      options: {
        openWindow?: boolean;
        sessionName?: string;
        testVariables?: Record<string, unknown>;
      } = {},
    ) => {
      const openWindow = options.openWindow ?? true;
      const requestId = createId("arena");
      pendingArenaRequests.current.set(requestId, { openWindow });
      setArenaExportStatus("exporting");
      setArenaExportError(null);

      triggerBuilderAction("export-arena", {
        sessionName: options.sessionName || "Circuit Session",
        requestId,
        ...options.testVariables,
      });
    },
    [triggerBuilderAction],
  );

  return {
    iframeRef,
    isFrameReady,
    arenaExportStatus,
    arenaExportError,
    lastArenaExport,
    circuitState,
    lastSimulationAt,
    lastSimulation,
    meterState,
    postToBuilder,
    triggerBuilderAction,
    handleArenaSync,
  };
}
