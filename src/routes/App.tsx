import { useLayoutEffect, useRef } from "react";
import { Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Arena from "../pages/Arena";
import WireDemo from "../pages/WireDemo";
import Pricing from "../pages/Pricing";
import Community from "../pages/Community";
import Account from "../pages/Account";
import SchematicMode from "../pages/SchematicMode";
import Classroom from "../pages/Classroom";
import UnifiedNav from "../components/UnifiedNav";
import BrandMark from "../components/BrandMark";
import GlobalModeBar from "../components/GlobalModeBar";
import { WorkspaceModeProvider } from "../context/WorkspaceModeContext";
import "../styles/layout.css";

export default function App() {
  return (
    <WorkspaceModeProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Builder />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/community" element={<Community />} />
          <Route path="/account" element={<Account />} />
          <Route path="/classroom" element={<Classroom />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </WorkspaceModeProvider>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 24, color: "var(--text-primary)", background: "var(--bg-darker)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16 }}>
        <BrandMark size="md" withWordmark />
      </div>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/" style={{ color: "var(--brand-primary)" }}>Go Home</Link>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isWorkspace = location.pathname === "/app";
  const shellRef = useRef<HTMLDivElement>(null);

  const shellClass = [
    "app-shell",
    isLanding && "is-landing",
    isWorkspace && "is-workspace",
  ].filter(Boolean).join(" ");
  const contentClass = isLanding ? "app-content is-landing" : "app-content";

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const nav = shell.querySelector<HTMLElement>(".unified-nav");
    const modeBar = shell.querySelector<HTMLElement>(".workspace-mode-bar--global");

    const updateLayoutVars = () => {
      const navHeight = nav?.offsetHeight ?? 0;
      const modeBarHeight = modeBar?.offsetHeight ?? 0;
      shell.style.setProperty("--app-nav-height", `${navHeight}px`);
      shell.style.setProperty("--app-mode-bar-height", `${modeBarHeight}px`);
    };

    updateLayoutVars();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateLayoutVars);
      return () => window.removeEventListener("resize", updateLayoutVars);
    }

    const observer = new ResizeObserver(updateLayoutVars);
    if (nav) {
      observer.observe(nav);
    }
    if (modeBar) {
      observer.observe(modeBar);
    }
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className={shellClass} ref={shellRef}>
      {/* Global Mode Bar - shown on all pages except landing */}
      {!isLanding && <GlobalModeBar />}
      {!isLanding && !isWorkspace && (
        <UnifiedNav />
      )}
      <main className={contentClass}>
        <Outlet />
      </main>
    </div>
  );
}
