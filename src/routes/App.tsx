import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import BrandSignature from "../components/BrandSignature";
import GlobalModeBar from "../components/GlobalModeBar";
import { WorkspaceModeProvider } from "../context/WorkspaceModeContext";
import "../styles/layout.css";

// Lazy-load heavy pages so they are code-split into separate chunks.
// This drastically reduces the initial JS bundle size — the Builder page
// alone pulls in Three.js, the schematic engine, wire routing, etc.
const Builder = lazy(() => import("../pages/Builder"));
const Pricing = lazy(() => import("../pages/Pricing"));
const Community = lazy(() => import("../pages/Community"));
const Account = lazy(() => import("../pages/Account"));
const Classroom = lazy(() => import("../pages/Classroom"));
const Arcade = lazy(() => import("../pages/Arcade"));

function PageFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "rgba(200,220,255,0.7)" }}>
      <span>Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceModeProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Builder />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/community" element={<Community />} />
            <Route path="/account" element={<Account />} />
            <Route path="/classroom" element={<Classroom />} />
            <Route path="/arcade" element={<Arcade />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </WorkspaceModeProvider>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 24, color: "var(--text-primary)", background: "var(--bg-darker)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16 }}>
        <BrandSignature size="md" />
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

    const modeBar = shell.querySelector<HTMLElement>(".workspace-mode-bar--global");

    const updateLayoutVars = () => {
      const modeBarHeight = modeBar?.offsetHeight ?? 0;
      shell.style.setProperty("--app-mode-bar-height", `${modeBarHeight}px`);
    };

    updateLayoutVars();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateLayoutVars);
      return () => window.removeEventListener("resize", updateLayoutVars);
    }

    const observer = new ResizeObserver(updateLayoutVars);
    if (modeBar) {
      observer.observe(modeBar);
    }
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className={shellClass} ref={shellRef}>
      {/* Global Mode Bar - shown on all pages except landing */}
      {!isLanding && <GlobalModeBar />}
      <main className={contentClass}>
        <Outlet />
      </main>
    </div>
  );
}
