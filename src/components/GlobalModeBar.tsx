import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import { useTheme } from "../context/ThemeContext";
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

/* All navigation tabs rendered directly in the scrollable bar */
const NAV_TABS: TabConfig[] = [
  { mode: "build",        icon: "🔧", label: "Build",       title: "Component builder and circuit designer" },
  { mode: "practice",     icon: "📝", label: "Practice",    title: "Guided worksheets and W.I.R.E. problems" },
  { mode: "troubleshoot", icon: "🩺", label: "Troubleshoot",title: "Fix broken circuits and restore current flow" },
  { mode: "arena",        icon: "⚡", label: "Arena",       title: "Component testing and advanced simulation" },
  { mode: "help",         icon: "📚", label: "Help",        title: "Guides, tutorials, and support resources" },
  { mode: "wire-guide",   icon: "",   label: "Wire Guide",  title: "Wire guide, formulas, and gauge recommendations" },
  { mode: "textbook",     icon: "📖", label: "Textbook",    title: "Year 1 & Year 2 Electrical Studies Textbook" },
  { mode: "pricing",      icon: "💳", label: "Pricing",     title: "Pricing" },
  { mode: "arcade",       icon: "🎯", label: "Arcade",      title: "Circuit Arcade" },
  { mode: "classroom",    icon: "🎓", label: "Classroom",   title: "Classroom" },
  { mode: "community",    icon: "🌐", label: "Community",   title: "Community" },
  { mode: "gallery",      icon: "🎬", label: "Gallery",     title: "Cinematic gallery — your captured shots and fly-throughs" },
  { mode: "home-circuit", icon: "🏠", label: "Home",        title: "Home electrical circuits — 3D room wiring simulator" },
  { mode: "car-circuit",  icon: "🚗", label: "Car",         title: "Automotive circuits — 3D vehicle electrical simulator" },
  { mode: "account",      icon: "👤", label: "Account",     title: "Account" },
];

export function GlobalModeBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, setWorkspaceMode } = useWorkspaceMode();
  const { theme, toggleTheme } = useTheme();
  const modeBarRef = useRef<HTMLDivElement>(null);
  const [modeBarScrollState, setModeBarScrollState] = useState<ModeBarScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const isWorkspacePage = location.pathname === "/app";
  const isArenaPage = location.pathname === "/arena";
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

  const handleModeClick = useCallback(
    (mode: WorkspaceMode) => {
      setWorkspaceMode(mode);
      // Arena and Gallery have their own standalone pages; navigate directly.
      if (mode === "arena") {
        navigate("/arena");
        return;
      }
      if (mode === "gallery") {
        navigate("/gallery");
        return;
      }
      // Keep all top-nav workflows anchored to the main workspace shell.
      if (!isWorkspacePage) {
        navigate("/app");
      }
    },
    [setWorkspaceMode, navigate, isWorkspacePage],
  );

  // Don't show on landing page — all hooks must be called above this guard.
  if (isLandingPage) {
    return null;
  }

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

        {NAV_TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            className="mode-tab"
            data-active={(workspaceMode === tab.mode || (tab.mode === "arena" && isArenaPage)) ? "true" : undefined}
            onClick={() => handleModeClick(tab.mode)}
            aria-label={`${tab.label} mode`}
            title={tab.title}
          >
            {tab.mode === "wire-guide" ? (
              <img
                src={wireResourceLogo}
                alt=""
                className="mode-icon mode-icon--svg mode-icon--wire-guide"
                aria-hidden="true"
              />
            ) : (
              <span className="mode-icon" aria-hidden="true">{tab.icon}</span>
            )}
            <span className="mode-label">{tab.label}</span>
          </button>
        ))}

        {modeBarScrollState.canScrollRight && (
          <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--inline" aria-hidden="true">
            <span className="scroll-indicator-arrow">›</span>
          </div>
        )}

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
