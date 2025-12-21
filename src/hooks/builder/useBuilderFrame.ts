import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuilderInvokeAction,
  BuilderMessage,
  LegacyModeState,
  BuilderToolId,
  ArenaExportStatus,
  ArenaExportSummary,
  LegacyCircuitState,
} from "../../components/builder/types";

interface UseBuilderFrameOptions {
  appBasePath: string;
  onModeStateChange: (state: Partial<LegacyModeState>) => void;
  onToolChange: (tool: BuilderToolId) => void;
  onSimulationPulse: () => void;
}

export function useBuilderFrame({
  appBasePath,
  onModeStateChange,
  onToolChange,
  onSimulationPulse,
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
  const [circuitState, setCircuitState] = useState<LegacyCircuitState | null>(
    null,
  );
  const [lastSimulationAt, setLastSimulationAt] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      const { data } = event;
      if (!data || typeof data !== "object") {
        return;
      }

      const { type, payload } = data as { type?: string; payload?: unknown };

      if (type === "legacy:ready") {
        setFrameReady(true);
        return;
      }

      if (type === "legacy:tool-state") {
        const tool =
          typeof (payload as { tool?: string })?.tool === "string"
            ? (payload as { tool?: string }).tool
            : undefined;
        if (tool === "wire" || tool === "measure") {
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
  }, [appBasePath, onModeStateChange, onToolChange, onSimulationPulse]);

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

    postToBuilder(
      { type: "builder:request-mode-state" },
      { allowQueue: false },
    );
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
      const requestId = `arena-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
    postToBuilder,
    triggerBuilderAction,
    handleArenaSync,
  };
}
