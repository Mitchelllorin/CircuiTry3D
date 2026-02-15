import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import type { WorkspaceMode } from "./builder/types";
import {
  isWorkspaceSectionId,
  type WorkspaceSectionId,
} from "./workspaceSections";
import "../styles/builder-ui.css";
import wireResourceLogo from "../assets/wire-resource-logo.svg";

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode, isWireLibraryPanelOpen, setWireLibraryPanelOpen } = useWorkspaceMode();
  const activeWorkspaceSectionParam = new URLSearchParams(location.search).get(
    "section",
  );
  const activeWorkspaceSection = isWorkspaceSectionId(
    activeWorkspaceSectionParam,
  )
    ? activeWorkspaceSectionParam
    : null;
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [modeBarScrollState, setModeBarScrollState] = useState<ModeBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const isWorkspaceRoute = location.pathname === "/app";
  const isWorkspacePage = isWorkspaceRoute && !activeWorkspaceSection;
  const isLandingPage = location.pathname === "/";
  const isPricingPage = location.pathname === "/pricing";
  const isCommunityPage = location.pathname === "/community";
  const isAccountPage = location.pathname === "/account";
  const isClassroomPage = location.pathname === "/classroom";
  const isArcadePage = location.pathname === "/arcade";

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
    // Navigate to workspace if not already there or clear section overlays.
    if (!isWorkspaceRoute || activeWorkspaceSection) {
      navigate("/app");
    }
  }, [
    activeWorkspaceSection,
    isWorkspaceRoute,
    navigate,
    setWorkspaceMode,
  ]);

  const handleNavigateTo = useCallback((path: string) => {
    // If leaving the workspace, ensure any workspace-only panels don't stay "active".
    setWireLibraryPanelOpen(false);
    navigate(path);
  }, [navigate, setWireLibraryPanelOpen]);

  const handleWorkspaceSectionClick = useCallback(
    (section: WorkspaceSectionId) => {
      // Keep a single, unified workflow: open all major sections inside /app.
      setWireLibraryPanelOpen(false);
      setWorkspaceMode("build");
      navigate(`/app?section=${section}`);
    },
    [navigate, setWireLibraryPanelOpen, setWorkspaceMode],
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

  const handleLearnClick = useCallback(() => {
    handleModeClick("learn");
  }, [handleModeClick]);

  const handleWireLibraryClick = useCallback(() => {
    setWireLibraryPanelOpen(true);
    // Navigate to workspace if not already there or clear section overlays.
    if (!isWorkspaceRoute || activeWorkspaceSection) {
      navigate("/app");
    }
  }, [
    activeWorkspaceSection,
    isWorkspaceRoute,
    navigate,
    setWireLibraryPanelOpen,
  ]);

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
          data-active={isWorkspacePage ? "true" : undefined}
          onClick={() => handleNavigateTo("/app")}
          aria-label="Open workspace"
          title="Workspace hub"
        >
          <span className="mode-icon" aria-hidden="true">🏠</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isWorkspaceRoute &&
            !activeWorkspaceSection &&
            workspaceMode === "build"
              ? "true"
              : undefined
          }
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
          data-active={
            isWorkspaceRoute &&
            !activeWorkspaceSection &&
            workspaceMode === "practice"
              ? "true"
              : undefined
          }
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
          data-active={
            isWorkspaceRoute &&
            !activeWorkspaceSection &&
            workspaceMode === "troubleshoot"
              ? "true"
              : undefined
          }
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
          data-active={
            isWorkspaceRoute &&
            !activeWorkspaceSection &&
            workspaceMode === "arena"
              ? "true"
              : undefined
          }
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
          data-active={
            isWorkspaceRoute &&
            !activeWorkspaceSection &&
            workspaceMode === "learn"
              ? "true"
              : undefined
          }
          onClick={handleLearnClick}
          aria-label="Learn mode"
          title="Tutorials, guides, and help resources"
        >
          <span className="mode-icon" aria-hidden="true">📚</span>
          <span className="mode-label">Learn</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isArcadePage || activeWorkspaceSection === "arcade"
              ? "true"
              : undefined
          }
          onClick={() => handleWorkspaceSectionClick("arcade")}
          aria-label="Arcade"
          title="Circuit Arcade"
        >
          <span className="mode-icon" aria-hidden="true">🎯</span>
          <span className="mode-label">Arcade</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isClassroomPage || activeWorkspaceSection === "classroom"
              ? "true"
              : undefined
          }
          onClick={() => handleWorkspaceSectionClick("classroom")}
          aria-label="Classroom"
          title="Classroom"
        >
          <span className="mode-icon" aria-hidden="true">🎓</span>
          <span className="mode-label">Classroom</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isCommunityPage || activeWorkspaceSection === "community"
              ? "true"
              : undefined
          }
          onClick={() => handleWorkspaceSectionClick("community")}
          aria-label="Community"
          title="Community"
        >
          <span className="mode-icon" aria-hidden="true">🌐</span>
          <span className="mode-label">Community</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isAccountPage || activeWorkspaceSection === "account"
              ? "true"
              : undefined
          }
          onClick={() => handleWorkspaceSectionClick("account")}
          aria-label="Account"
          title="Account"
        >
          <span className="mode-icon" aria-hidden="true">👤</span>
          <span className="mode-label">Account</span>
        </button>
        <button
          type="button"
          className="mode-tab"
          data-active={
            isPricingPage || activeWorkspaceSection === "pricing"
              ? "true"
              : undefined
          }
          onClick={() => handleWorkspaceSectionClick("pricing")}
          aria-label="Pricing"
          title="Pricing"
        >
          <span className="mode-icon" aria-hidden="true">💳</span>
          <span className="mode-label">Pricing</span>
        </button>
        <button
          type="button"
          className="mode-tab mode-tab--icon-only"
          data-active={isWireLibraryPanelOpen ? "true" : undefined}
          onClick={handleWireLibraryClick}
          aria-label="Wire gauge library"
          title="Wire gauge library and specifications"
        >
          <img src={wireResourceLogo} alt="" className="mode-icon mode-icon--svg" aria-hidden="true" />
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
