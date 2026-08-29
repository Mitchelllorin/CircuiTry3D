import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import { useTheme } from "../context/ThemeContext";
import type { WorkspaceMode } from "./builder/types";
import "../styles/builder-ui.css";
import wireResourceLogo from "../assets/wire-resource-logo.svg";
import { Logo3D } from "./builder/branding/Logo3D";
import { Icon3D } from "./icons3d/Icon3D";
import { ICON_MODELS, type Icon3DName } from "./icons3d/iconModels";

const has3DIcon = (mode: string): mode is Icon3DName =>
  Object.prototype.hasOwnProperty.call(ICON_MODELS, mode);

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
  { mode: "learn",        icon: "🎓", label: "Learn",       title: "Take the guided tour, or build a circuit with me" },
  { mode: "help",         icon: "📚", label: "Help",        title: "W.I.R.E. guide, shortcuts, and reference" },
  { mode: "wire-guide",   icon: "",   label: "Wire Guide",  title: "Wire guide, formulas, and gauge recommendations" },
  { mode: "textbook",     icon: "📖", label: "Textbook",    title: "Year 1 & Year 2 Electrical Studies Textbook" },
  { mode: "pricing",      icon: "💳", label: "Pricing",     title: "Pricing" },
  { mode: "arcade",       icon: "🎯", label: "Arcade",      title: "Circuit Arcade" },
  { mode: "classroom",    icon: "🏫", label: "Classroom",   title: "Classroom" },
  { mode: "community",    icon: "🌐", label: "Community",   title: "Community" },
  { mode: "gallery",      icon: "🎬", label: "Gallery",     title: "Cinematic gallery — your captured shots and fly-throughs" },
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
  // The tab currently under the middle of the strip while it is being scrolled.
  // Null when the strip is at rest, at which point the caption falls back to
  // whichever mode is actually open.
  const [peekMode, setPeekMode] = useState<WorkspaceMode | null>(null);
  const peekTimer = useRef<number | null>(null);

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

  /**
   * Name whatever tab is under the middle of the strip as it scrolls.
   *
   * On a phone only one label is printed (see the caption below), and tying it to
   * the ACTIVE tab alone left a hole: scroll the strip and the one labelled tab
   * slides off, leaving thirteen unnamed objects and no way to ask what they are.
   * So the caption follows the scroll as well as the selection.
   *
   * Nearest-to-centre rather than first-visible, because a strip that fits
   * thirteen tabs always has plenty visible; the middle is the only position that
   * corresponds to what someone is actually looking at.
   */
  const trackPeek = useCallback(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    const middle = container.scrollLeft + container.clientWidth / 2;
    let nearest: WorkspaceMode | null = null;
    let nearestGap = Infinity;
    container.querySelectorAll<HTMLElement>("[data-mode]").forEach((el) => {
      const gap = Math.abs(el.offsetLeft + el.offsetWidth / 2 - middle);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = (el.dataset.mode as WorkspaceMode) ?? null;
      }
    });
    setPeekMode(nearest);
    // Hand the caption back to the open mode once the strip settles, so it ends
    // up telling you where you ARE rather than where you last looked.
    if (peekTimer.current !== null) {
      window.clearTimeout(peekTimer.current);
    }
    peekTimer.current = window.setTimeout(() => setPeekMode(null), 1400);
  }, []);

  useEffect(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    const onScroll = () => {
      checkModeBarScroll();
      trackPeek();
    };
    checkModeBarScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", checkModeBarScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkModeBarScroll);
      if (peekTimer.current !== null) {
        window.clearTimeout(peekTimer.current);
      }
    };
  }, [checkModeBarScroll, trackPeek]);

  const handleModeClick = useCallback(
    (mode: WorkspaceMode) => {
      setWorkspaceMode(mode);
      // Gallery has its own standalone page; navigate directly.
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

  const captionMode = peekMode ?? workspaceMode;
  const captionLabel =
    NAV_TABS.find((tab) => tab.mode === captionMode)?.label ??
    (captionMode === "settings" ? "Settings" : null);

  return (
    <>
      {modeBarScrollState.canScrollLeft && (
        <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--left" aria-hidden="true">
          <span className="scroll-indicator-arrow">‹</span>
        </div>
      )}
      <div
        className="workspace-mode-bar workspace-mode-bar--global"
        ref={modeBarRef}
        // Drives the edge fade that replaced the scrollbar. Naming which edge
        // rather than just "scrollable" matters: fading an end you are already
        // at dims a tab that is right there and reachable.
        data-can-scroll={
          modeBarScrollState.canScrollLeft && modeBarScrollState.canScrollRight
            ? "both"
            : modeBarScrollState.canScrollLeft
              ? "left"
              : modeBarScrollState.canScrollRight
                ? "right"
                : undefined
        }
      >
        {/* Brand home link */}
        <Link
          to="/"
          className="mode-tab mode-tab--icon-only mode-tab--brand"
          aria-label="CircuiTry3D – Home"
          title="Home"
        >
          <Logo3D className="mode-brand-logo" />
        </Link>

        {NAV_TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            className="mode-tab"
            data-mode={tab.mode}
            data-active={workspaceMode === tab.mode ? "true" : undefined}
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
            ) : has3DIcon(tab.mode) ? (
              // Modelled icons replace the emoji one tab at a time. The emoji
              // stays as the fallback, so a tab looks right from the first
              // paint and stays right if the render never lands.
              <Icon3D
                name={tab.mode}
                className="mode-icon mode-icon--3d"
                fallback={<span className="mode-icon" aria-hidden="true">{tab.icon}</span>}
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

        {/* Settings — opens as a workspace panel (like every other section),
            pinned to the right end. */}
        <button
          type="button"
          className="mode-tab mode-tab--settings"
          data-mode="settings"
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

      {/* The caption, and it deliberately lives OUTSIDE the scroller.
          Revealing a label inside a tab widens that tab, which shifts the strip
          underneath the thumb that is scrolling it - and a scroller whose content
          resizes while you drag it is unusable. Out here it is one fixed slot,
          so naming a tab costs no layout at all.
          aria-hidden because it only ever repeats a name the focused tab already
          carries in its aria-label; announcing it twice is noise. */}
      {captionLabel && (
        <div className="mode-bar-caption" aria-hidden="true">
          {captionLabel}
        </div>
      )}
    </>
  );
}

export default GlobalModeBar;
