import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceMode } from "../../context/WorkspaceModeContext";
import "../../styles/arena.css";
import type { ArenaViewProps } from "./types";

const ARENA_SESSION_STORAGE_PREFIX = "circuitry:arena-session:";
const ARENA_LAST_SESSION_KEY = `${ARENA_SESSION_STORAGE_PREFIX}last`;
const BASE_URL = import.meta.env.BASE_URL || "/";

function getArenaBasePath(): string {
  return BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
}

function readArenaSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const localSessionId = window.localStorage.getItem(ARENA_LAST_SESSION_KEY)?.trim();
  if (localSessionId) {
    return localSessionId;
  }

  const sessionSessionId = window.sessionStorage
    .getItem(ARENA_LAST_SESSION_KEY)
    ?.trim();
  return sessionSessionId || null;
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
      <div className="arena-workspace-shell">
        <iframe
          key={`${activeSessionId ?? "fallback"}-${reloadToken}`}
          className={`arena-workspace-iframe${isLoaded ? " is-loaded" : ""}`}
          src={arenaSrc}
          title="CircuiTry3D Arena"
          loading="eager"
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
        />

        {!isLoaded && (
          <div className="arena-workspace-status" role="status" aria-live="polite">
            Loading arena systems…
          </div>
        )}

        {hasError && (
          <div className="arena-workspace-status arena-workspace-status--error" role="alert">
            Arena failed to load. Try reloading.
          </div>
        )}

        <div className="arena-workspace-controls">
          <button
            type="button"
            className="arena-button arena-button--ghost"
            onClick={handleExitComplete}
          >
            Return to Workspace
          </button>
          {showOpenBuilderButton ? (
            <button
              type="button"
              className="arena-button arena-button--secondary"
              onClick={onOpenBuilder}
            >
              Open Builder
            </button>
          ) : null}
          <button
            type="button"
            className="arena-button arena-button--secondary"
            onClick={handleReloadArena}
          >
            Reload Arena
          </button>
        </div>
      </div>
    </section>
  );
}
