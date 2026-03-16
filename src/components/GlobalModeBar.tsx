import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import type { WorkspaceMode } from "./builder/types";
import BrandMark from "./BrandMark";
import "../styles/builder-ui.css";
import wireResourceLogo from "../assets/wire-resource-logo.svg";

type SecondaryTab = {
  mode: WorkspaceMode;
  icon: string;
  label: string;
  title: string;
};

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

/* Secondary / less-used tabs grouped under the "More ⋯" button */
const SECONDARY_TABS: SecondaryTab[] = [
  { mode: "arcade",    icon: "🎯", label: "Arcade",    title: "Circuit Arcade" },
  { mode: "classroom", icon: "🎓", label: "Classroom", title: "Classroom" },
  { mode: "community", icon: "🌐", label: "Community", title: "Community" },
  { mode: "account",   icon: "👤", label: "Account",   title: "Account" },
  { mode: "pricing",   icon: "💳", label: "Pricing",   title: "Pricing" },
  { mode: "textbook",  icon: "📖", label: "Textbook",  title: "Year 1 & Year 2 Electrical Studies Textbook" },
];

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode } = useWorkspaceMode();
  const modeBarRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [modeBarScrollState, setModeBarScrollState] = useState<ModeBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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

  /* Close the More dropdown when clicking outside it */
  useEffect(() => {
    if (!isMoreOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMoreOpen]);

  const handleModeClick = useCallback(
    (mode: WorkspaceMode) => {
      setWorkspaceMode(mode);
      setIsMoreOpen(false);
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

  /* Whether any secondary tab is the active mode (so the More button appears highlighted) */
  const isSecondaryActive = SECONDARY_TABS.some((t) => t.mode === workspaceMode);

  return (
    <>
      {modeBarScrollState.canScrollLeft && (
        <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--left" aria-hidden="true">
          <span className="scroll-indicator-arrow">‹</span>
        </div>
      )}
      <div className="workspace-mode-bar workspace-mode-bar--global" ref={modeBarRef}>
        {/* Brand home link */}
        <Link
          to="/"
          className="mode-tab mode-tab--icon-only mode-tab--brand"
          aria-label="CircuiTry3D – Home"
          title="Home"
        >
          <BrandMark size="xs" decorative />
        </Link>

        {/* ── Primary tabs ── */}
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

        {/* ── Secondary tabs behind "More" dropdown ── */}
        <div className="mode-tab--more" ref={moreMenuRef}>
          <button
            type="button"
            className="mode-tab"
            data-active={isSecondaryActive ? "true" : undefined}
            onClick={() => setIsMoreOpen((o) => !o)}
            aria-label="More pages"
            aria-expanded={isMoreOpen}
            title="Arcade, Classroom, Community, Account, Pricing, Textbook"
          >
            <span className="mode-icon" aria-hidden="true">⋯</span>
            <span className="mode-label">More</span>
          </button>
          {isMoreOpen && (
            <div className="mode-more-dropdown" role="menu">
              {SECONDARY_TABS.map((tab) => (
                <button
                  key={tab.mode}
                  type="button"
                  className="mode-tab"
                  data-active={workspaceMode === tab.mode ? "true" : undefined}
                  onClick={() => handleModeClick(tab.mode)}
                  aria-label={tab.label}
                  title={tab.title}
                  role="menuitem"
                >
                  <span className="mode-icon" aria-hidden="true">{tab.icon}</span>
                  <span className="mode-label">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
