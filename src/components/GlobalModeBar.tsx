import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspaceMode } from "../context/WorkspaceModeContext";
import { useTheme } from "../context/ThemeContext";
import type { WorkspaceMode } from "./builder/types";
import "../styles/builder-ui.css";
import { Logo3D } from "./builder/branding/Logo3D";
import { NavGlyph } from "./navGlyphs";

type TabConfig = {
  mode: WorkspaceMode;
  label: string;
  title: string;
};

type ModeBarScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

/**
 * The tab the strip is currently showing in the middle of the screen, and its
 * centre in CSS px.
 *
 * The caption used to be fixed dead-centre in the viewport and name whatever
 * mode was ACTIVE, so on a phone it floated over empty strip three tabs away
 * from the icon it was describing. Reading the centre tab instead makes the
 * caption and the highlight describe the same thing, and the label can never
 * drift from its mark because both come from the same rect.
 */
type ModeBarPeek = {
  key: string;
  label: string;
  x: number;
};

/* All navigation tabs rendered directly in the scrollable bar.
   Every tab is a drawn glyph plus its printed name: one visual language for the
   whole row, so nothing in it is the odd coloured blob. */
const NAV_TABS: TabConfig[] = [
  { mode: "build",        label: "Build",       title: "Component builder and circuit designer" },
  { mode: "practice",     label: "Practice",    title: "Guided worksheets and W.I.R.E. problems" },
  { mode: "troubleshoot", label: "Troubleshoot",title: "Fix broken circuits and restore current flow" },
  { mode: "arena",        label: "Arena",       title: "Component testing and advanced simulation" },
  { mode: "learn",        label: "Learn",       title: "Take the guided tour" },
  { mode: "help",         label: "Help",        title: "W.I.R.E. guide, shortcuts, and reference" },
  { mode: "wire-guide",   label: "Wire Guide",  title: "Wire guide, formulas, and gauge recommendations" },
  { mode: "textbook",     label: "Textbook",    title: "Year 1 & Year 2 Electrical Studies Textbook" },
  { mode: "pricing",      label: "Pricing",     title: "Pricing" },
  { mode: "arcade",       label: "Arcade",      title: "Circuit Arcade" },
  { mode: "classroom",    label: "Classroom",   title: "Classroom" },
  { mode: "community",    label: "Community",   title: "Community" },
  { mode: "gallery",      label: "Gallery",     title: "Cinematic gallery — your captured shots and fly-throughs" },
  { mode: "account",      label: "Account",     title: "Account" },
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

  const [peek, setPeek] = useState<ModeBarPeek | null>(null);

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
   * Name the tab nearest the middle of the strip, and where that tab's centre
   * sits on screen. Every labelled tab carries `data-nav-key` — including
   * Settings and the theme toggle, which have no workspace mode of their own —
   * so the last two destinations get a caption like everything else.
   */
  const readPeek = useCallback(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const middle = containerRect.left + containerRect.width / 2;
    let best: ModeBarPeek | null = null;
    let bestGap = Infinity;
    const tabs = Array.from(container.querySelectorAll<HTMLElement>("[data-nav-key]"));
    for (const tab of tabs) {
      const rect = tab.getBoundingClientRect();
      const gap = Math.abs(rect.left + rect.width / 2 - middle);
      if (gap >= bestGap) {
        continue;
      }
      bestGap = gap;
      best = {
        key: tab.dataset.navKey ?? "",
        label:
          tab.querySelector(".mode-label")?.textContent?.trim() ||
          tab.getAttribute("aria-label") ||
          "",
        x: rect.left + rect.width / 2,
      };
    }
    setPeek(best);
  }, []);

  useEffect(() => {
    const container = modeBarRef.current;
    if (!container) {
      return;
    }
    const onScroll = () => {
      checkModeBarScroll();
      readPeek();
    };
    const onResize = () => {
      checkModeBarScroll();
      readPeek();
    };
    checkModeBarScroll();
    readPeek();
    // The first frame can measure before webfonts settle the tab widths; one
    // re-read after layout is cheap and stops the caption sitting off-centre.
    const raf = window.requestAnimationFrame(readPeek);
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [checkModeBarScroll, readPeek]);

  const handleModeClick = useCallback(
    (mode: WorkspaceMode) => {
      setWorkspaceMode(mode);

      // Standalone pages with dedicated routes
      if (mode === "gallery") {
        navigate("/gallery");
        return;
      }
      // The arena is a workspace mode of the builder, not a page of its own:
      // Builder mounts ArenaView itself when the mode is "arena", and the
      // /arena route it used to have is gone. It therefore falls through to the
      // anchor below with every other workspace tool — set the mode, make sure
      // we are on /app, and let the workspace open it. Sending it to a route of
      // its own is what made the mode bar and the arena disagree about which
      // surface was on screen.

      // Keep all workspace-bound tools anchored to the main workspace shell
      if (!isWorkspacePage) {
        navigate("/app");
      }
    },
    [setWorkspaceMode, navigate, isWorkspacePage],
  );

  // Don't show on landing page
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
      <div
        className="workspace-mode-bar workspace-mode-bar--global"
        ref={modeBarRef}
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
            data-nav-key={tab.mode}
            data-active={workspaceMode === tab.mode ? "true" : undefined}
            data-peek={peek?.key === tab.mode ? "true" : undefined}
            onClick={() => handleModeClick(tab.mode)}
            aria-label={`${tab.label} mode`}
            title={tab.title}
          >
            <NavGlyph name={tab.mode} className="mode-icon mode-icon--glyph" />
            <span className="mode-label">{tab.label}</span>
          </button>
        ))}

        {modeBarScrollState.canScrollRight && (
          <div className="mode-bar-scroll-indicator mode-bar-scroll-indicator--inline" aria-hidden="true">
            <span className="scroll-indicator-arrow">›</span>
          </div>
        )}

        {/* Settings */}
        <button
          type="button"
          className="mode-tab mode-tab--settings"
          data-mode="settings"
          data-nav-key="settings"
          data-active={workspaceMode === "settings" ? "true" : undefined}
          data-peek={peek?.key === "settings" ? "true" : undefined}
          onClick={() => handleModeClick("settings")}
          aria-label="Settings"
          title="App settings — logo, graphics, workspace, accessibility"
        >
          <NavGlyph name="settings" className="mode-icon mode-icon--glyph" />
          <span className="mode-label">Settings</span>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          className="mode-tab mode-tab--theme-toggle"
          data-nav-key="theme"
          data-peek={peek?.key === "theme" ? "true" : undefined}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <NavGlyph
            name={theme === "dark" ? "sun" : "moon"}
            className="mode-icon mode-icon--glyph"
          />
          <span className="mode-label">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>

      {/* The caption rides the tab it names, clamped inside the viewport so a
          label near either end still reads in full. */}
      {peek && peek.label && (
        <div
          className="mode-bar-caption"
          aria-hidden="true"
          style={{ left: `clamp(52px, ${Math.round(peek.x)}px, calc(100vw - 52px))` }}
        >
          {peek.label}
        </div>
      )}
    </>
  );
}

export default GlobalModeBar;
