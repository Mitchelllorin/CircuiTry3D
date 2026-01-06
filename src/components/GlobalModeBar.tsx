import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import type { WorkspaceMode } from "./builder/types";
import "../styles/builder-ui.css";

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode, isWireLibraryPanelOpen, setWireLibraryPanelOpen } = useWorkspaceMode();
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [modeBarScrollState, setModeBarScrollState] = useState<ModeBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const isWorkspacePage = location.pathname === "/app";
  const isLandingPage = location.pathname === "/";

  // Don't show on landing page
  if (isLandingPage) {
    return null;
  }

  const checkModeBarScroll = useCallback(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    const tolerance = 2;
    const canScrollLeft = container.scrollLeft > tolerance;
    const canScrollRight = container.scrollLeft + container.clientWidth < container.scrollWidth - tolerance;
    setModeBarScrollState({ canScrollLeft, canScrollRight });
  }, []);

  useEffect(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    checkModeBarScroll();
    container.addEventListener("scroll", checkModeBarScroll, { passive: true });
    window.addEventListener("resize", checkModeBarScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", checkModeBarScroll);
      window.removeEventListener("resize", checkModeBarScroll);
    };
  }, [checkModeBarScroll]);

  const handleModeClick = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    // Navigate to workspace if not already there
    if (!isWorkspacePage) {
      navigate("/app");
    }
  }, [setWorkspaceMode, navigate, isWorkspacePage]);

  const handleBuildClick = useCallback(() => {
    handleModeClick("build");
  }, [handleModeClick]);

  const handlePracticeClick = useCallback(() => {
    handleModeClick("practice");
  }, [handleModeClick]);

  const handleArenaClick = useCallback(() => {
    handleModeClick("arena");
  }, [handleModeClick]);

  const handleHelpClick = useCallback(() => {
    handleModeClick("help");
  }, [handleModeClick]);

  const handleWireLibraryClick = useCallback(() => {
    setWireLibraryPanelOpen(true);
    // Navigate to workspace if not already there
    if (!isWorkspacePage) {
      navigate("/app");
    }
  }, [setWireLibraryPanelOpen, navigate, isWorkspacePage]);

  return (
    <>
      {modeBarScrollState.canScrollLeft && (
        <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--left" aria-hidden="true">
          <span className="scroll-indicator-arrow">‹</span>
        </div>
      )}
      <div className="workspace-mode-bar workspace-mode-bar--global" ref={modeBarRef}>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "build" ? "true" : undefined}
          onClick={handleBuildClick}
          aria-label="Build mode"
          title="Component builder and circuit designer"
        >
          <span className="mode-icon" aria-hidden="true">🔧</span>
          <span className="mode-label">Build</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "practice" ? "true" : undefined}
          onClick={handlePracticeClick}
          aria-label="Practice mode"
          title="Guided worksheets and W.I.R.E. problems"
        >
          <span className="mode-icon" aria-hidden="true">📝</span>
          <span className="mode-label">Practice</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "arena" ? "true" : undefined}
          onClick={handleArenaClick}
          aria-label="Arena mode"
          title="Component testing and advanced simulation"
        >
          <span className="mode-icon" aria-hidden="true">⚡</span>
          <span className="mode-label">Arena</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "help" ? "true" : undefined}
          onClick={handleHelpClick}
          aria-label="Help center"
          title="Support resources, guides, and documentation"
        >
          <span className="mode-icon" aria-hidden="true">❓</span>
          <span className="mode-label">Help</span>
        </button>
        <button
          type="button"
          className="mode-tab mode-tab--icon-only"
          data-active={isWireLibraryPanelOpen ? "true" : undefined}
          onClick={handleWireLibraryClick}
          aria-label="Wire gauge library"
          title="Wire gauge library and specifications"
        >
          <span className="mode-icon" aria-hidden="true">🔌</span>
        </button>
        {modeBarScrollState.canScrollRight && (
          <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--inline" aria-hidden="true">
            <span className="scroll-indicator-arrow">›</span>
          </div>
        )}
      </div>
    </>
  );
}

export default GlobalModeBar;
