import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import type { WorkspaceMode } from "./builder/types";
import "../styles/builder-ui.css";
import wireResourceLogo from "../assets/wire-resource-logo.svg";

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode } = useWorkspaceMode();
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

  const handleModeClick = useCallback(
    (mode: WorkspaceMode) => {
      setWorkspaceMode(mode);
      // Keep all top-nav workflows anchored to the main workspace shell.
      if (!isWorkspacePage) {
        navigate("/app");
      }
    },
    [setWorkspaceMode, navigate, isWorkspacePage],
  );

  const handleBuildClick = useCallback(() => {
    handleModeClick("build");
  }, [handleModeClick]);

  const handlePracticeClick = useCallback(() => {
    handleModeClick("practice");
  }, [handleModeClick]);

  const handleTroubleshootClick = useCallback(() => {
    handleModeClick("troubleshoot");
  }, [handleModeClick]);

  const handleArenaClick = useCallback(() => {
    handleModeClick("arena");
  }, [handleModeClick]);

  const handleHelpClick = useCallback(() => {
    handleModeClick("help");
  }, [handleModeClick]);

  const handleWireGuideClick = useCallback(() => {
    handleModeClick("wire-guide");
  }, [handleModeClick]);

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
          className="mode-tab mode-tab--icon-only"
          data-active={
            isWorkspacePage && workspaceMode === "build" ? "true" : undefined
          }
          onClick={handleBuildClick}
          aria-label="Open workspace"
          title="Workspace hub"
        >
          <span className="mode-icon" aria-hidden="true">🏠</span>
        </button>
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
          data-active={workspaceMode === "troubleshoot" ? "true" : undefined}
          onClick={handleTroubleshootClick}
          aria-label="Troubleshoot mode"
          title="Fix broken circuits and restore current flow"
        >
          <span className="mode-icon" aria-hidden="true">🩺</span>
          <span className="mode-label">Troubleshoot</span>
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
          aria-label="Help mode"
          title="Guides, tutorials, and support resources"
        >
          <span className="mode-icon" aria-hidden="true">📚</span>
          <span className="mode-label">Help</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "arcade" ? "true" : undefined}
          onClick={() => handleModeClick("arcade")}
          aria-label="Arcade"
          title="Circuit Arcade"
        >
          <span className="mode-icon" aria-hidden="true">🎯</span>
          <span className="mode-label">Arcade</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "classroom" ? "true" : undefined}
          onClick={() => handleModeClick("classroom")}
          aria-label="Classroom"
          title="Classroom"
        >
          <span className="mode-icon" aria-hidden="true">🎓</span>
          <span className="mode-label">Classroom</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "community" ? "true" : undefined}
          onClick={() => handleModeClick("community")}
          aria-label="Community"
          title="Community"
        >
          <span className="mode-icon" aria-hidden="true">🌐</span>
          <span className="mode-label">Community</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "account" ? "true" : undefined}
          onClick={() => handleModeClick("account")}
          aria-label="Account"
          title="Account"
        >
          <span className="mode-icon" aria-hidden="true">👤</span>
          <span className="mode-label">Account</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "pricing" ? "true" : undefined}
          onClick={() => handleModeClick("pricing")}
          aria-label="Pricing"
          title="Pricing"
        >
          <span className="mode-icon" aria-hidden="true">💳</span>
          <span className="mode-label">Pricing</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "wire-guide" ? "true" : undefined}
          onClick={handleWireGuideClick}
          aria-label="Wire guide mode"
          title="Wire guide, formulas, and gauge recommendations"
        >
          <img
            src={wireResourceLogo}
            alt=""
            className="mode-icon mode-icon--svg mode-icon--wire-guide"
            aria-hidden="true"
          />
          <span className="mode-label">Wire Guide</span>
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
