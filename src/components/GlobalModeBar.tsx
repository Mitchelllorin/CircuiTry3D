import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import { useDemoMode, DEMO_WORKSPACE_MODES } from "../context/DemoModeContext";
import type { GatedFeature } from "../context/DemoModeContext";
import type { WorkspaceMode } from "./builder/types";
import BrandMark from "./BrandMark";
import "../styles/builder-ui.css";
import wireResourceLogo from "../assets/wire-resource-logo.svg";

type TabConfig = {
  mode: WorkspaceMode;
  icon: string;
  label: string;
  title: string;
};

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

/** Maps navigation paths to gated features for Demo Mode */
const PATH_FEATURE_MAP: Record<string, GatedFeature> = {
  "/arcade": "arcade",
  "/classroom": "classroom",
  "/community": "community",
};

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode, isWireLibraryPanelOpen, setWireLibraryPanelOpen } = useWorkspaceMode();
  const { isDemoMode, isFeatureLocked, showUpgradePrompt } = useDemoMode();
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [modeBarScrollState, setModeBarScrollState] = useState<ModeBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const isWorkspacePage = location.pathname === "/app";
  const isLandingPage = location.pathname === "/";

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
    // In Demo Mode, gate the troubleshoot mode
    if (isDemoMode && !DEMO_WORKSPACE_MODES.has(mode)) {
      showUpgradePrompt("troubleshoot-mode");
      return;
    }
    setWorkspaceMode(mode);
    // Navigate to workspace if not already there
    if (!isWorkspacePage) {
      navigate("/app");
    }
  }, [setWorkspaceMode, navigate, isWorkspacePage, isDemoMode, showUpgradePrompt]);

  const handleNavigateTo = useCallback((path: string) => {
    // Check if this path is gated in Demo Mode
    const gatedFeature = PATH_FEATURE_MAP[path];
    if (gatedFeature && isFeatureLocked(gatedFeature)) {
      showUpgradePrompt(gatedFeature);
      return;
    }
    // If leaving the workspace, ensure any workspace-only panels don't stay "active".
    setWireLibraryPanelOpen(false);
    navigate(path);
  }, [navigate, setWireLibraryPanelOpen, isFeatureLocked, showUpgradePrompt]);

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

  const isTroubleshootLocked = isDemoMode && !DEMO_WORKSPACE_MODES.has("troubleshoot");
  const isArcadeLocked = isDemoMode;
  const isClassroomLocked = isDemoMode;
  const isCommunityLocked = isDemoMode;

  return (
    <>
      {modeBarScrollState.canScrollLeft && (
        <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--left" aria-hidden="true">
          <span className="scroll-indicator-arrow">‹</span>
        </div>
      )}
      <div className="workspace-mode-bar workspace-mode-bar--global" ref={modeBarRef}>
        {isDemoMode && (
          <span className="demo-mode-badge" title="Running in Demo Mode">
            DEMO
          </span>
        )}
        <button
          type="button"
          className="mode-tab mode-tab--icon-only"
          data-active={isWorkspacePage ? "true" : undefined}
          onClick={() => handleNavigateTo("/app")}
          aria-label="Open workspace"
          title="Workspace hub"
        >
          <BrandMark size="xs" decorative />
        </Link>
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
          className={`mode-tab${isTroubleshootLocked ? " mode-tab--locked" : ""}`}
          data-active={workspaceMode === "troubleshoot" ? "true" : undefined}
          onClick={handleTroubleshootClick}
          aria-label="Troubleshoot mode"
          title={isTroubleshootLocked ? "Troubleshoot — Full Version" : "Fix broken circuits and restore current flow"}
        >
          <span className="mode-icon" aria-hidden="true">🩺</span>
          <span className="mode-label">Troubleshoot</span>
          {isTroubleshootLocked && <span className="mode-lock" aria-hidden="true">🔒</span>}
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
          className={`mode-tab${isArcadeLocked ? " mode-tab--locked" : ""}`}
          data-active={isArcadePage ? "true" : undefined}
          onClick={() => handleNavigateTo("/arcade")}
          aria-label="Arcade"
          title={isArcadeLocked ? "Arcade — Full Version" : "Circuit Arcade"}
        >
          <span className="mode-icon" aria-hidden="true">🎯</span>
          <span className="mode-label">Arcade</span>
          {isArcadeLocked && <span className="mode-lock" aria-hidden="true">🔒</span>}
        </button>
        <button
          type="button"
          className={`mode-tab${isClassroomLocked ? " mode-tab--locked" : ""}`}
          data-active={isClassroomPage ? "true" : undefined}
          onClick={() => handleNavigateTo("/classroom")}
          aria-label="Classroom"
          title={isClassroomLocked ? "Classroom — Full Version" : "Classroom"}
        >
          <span className="mode-icon" aria-hidden="true">🎓</span>
          <span className="mode-label">Classroom</span>
          {isClassroomLocked && <span className="mode-lock" aria-hidden="true">🔒</span>}
        </button>
        <button
          type="button"
          className={`mode-tab${isCommunityLocked ? " mode-tab--locked" : ""}`}
          data-active={isCommunityPage ? "true" : undefined}
          onClick={() => handleNavigateTo("/community")}
          aria-label="Community"
          title={isCommunityLocked ? "Community — Full Version" : "Community"}
        >
          <span className="mode-icon" aria-hidden="true">🌐</span>
          <span className="mode-label">Community</span>
          {isCommunityLocked && <span className="mode-lock" aria-hidden="true">🔒</span>}
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
        <button
          type="button"
          className="mode-tab"
          data-active={workspaceMode === "textbook" ? "true" : undefined}
          onClick={() => handleModeClick("textbook")}
          aria-label="Electrical Textbook — Year 1 and Year 2 reference"
          title="Year 1 & Year 2 Electrical Studies Textbook"
        >
          <span className="mode-icon" aria-hidden="true">📖</span>
          <span className="mode-label">Textbook</span>
        </button>
        {isDemoMode && (
          <button
            type="button"
            className="mode-tab mode-tab--upgrade"
            onClick={() => showUpgradePrompt("advanced-components")}
            aria-label="Upgrade to Full Version"
            title="Upgrade to Full Version"
          >
            <span className="mode-icon" aria-hidden="true">⬆</span>
            <span className="mode-label">Upgrade</span>
          </button>
        )}
        {modeBarScrollState.canScrollRight && (
          <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--inline" aria-hidden="true">
            <span className="scroll-indicator-arrow">›</span>
          </div>
        )}

        {/* Settings — opens as a workspace panel (like every other section),
            pinned to the right end. */}
        <button
          type="button"
          className="mode-tab mode-tab--settings"
          data-active={workspaceMode === "settings" ? "true" : undefined}
          onClick={() => handleModeClick("settings")}
          aria-label="Settings"
          title="App settings — logo, graphics, workspace, accessibility"
        >
          <span className="mode-icon" aria-hidden="true">⚙️</span>
          <span className="mode-label">Settings</span>
        </button>

        {/* Theme toggle — pinned to the right end of the bar */}
        <button
          type="button"
          className="mode-tab mode-tab--theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="mode-icon" aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="mode-label">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </>
  );
}

export default GlobalModeBar;
