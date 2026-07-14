import { Routes, Route, Link } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Pricing from "../pages/Pricing";
import Community from "../pages/Community";
import Account from "../pages/Account";
import Classroom from "../pages/Classroom";
import StudentView from "../pages/StudentView";
import UnifiedNav from "../components/UnifiedNav";
import BrandSignature from "../components/BrandSignature";
import GlobalModeBar from "../components/GlobalModeBar";
import BuildStamp from "../components/BuildStamp";
import { WorkspaceModeProvider } from "../context/WorkspaceModeContext";
import { UpgradePromptModal } from "../components/builder/modals/UpgradePromptModal";
import "../styles/layout.css";
import "../styles/demo-mode.css";

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
  const { t } = useTranslation();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/app" element={<Builder />} />
      <Route path="/arena" element={<Arena />} />
      <Route path="/wire-demo" element={<WireDemo />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: 24, color: "var(--text-primary)", background: "var(--bg-darker)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16 }}>
        <BrandSignature size="md" />
      </div>
      <h1>404</h1>
      <p>{t("common.pageNotFound")}</p>
      <Link to="/" style={{ color: "var(--brand-primary)" }}>{t("common.goHome")}</Link>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const isLanding = location.pathname === "/";
  const isWorkspace = location.pathname === "/app";
  // arena.html is a full-screen self-contained 3D app (like landing.html).
  // Hide the React shell chrome (GlobalModeBar, TipsTicker, footer) so
  // arena.html's own navigation is the only nav the user sees.
  const isArena = location.pathname === "/arena";
  const shellRef = useRef<HTMLDivElement>(null);

  const shellClass = [
    "app-shell",
    isLanding && "is-landing",
    isWorkspace && "is-workspace",
    isArena && "is-arena",
  ].filter(Boolean).join(" ");
  // Arena uses its own full-viewport CSS scoped to `.app-shell.is-arena` in layout.css.
  // Only landing.html needs the `is-landing` content class.
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
    <div
      className={shellClass}
      ref={shellRef}
      style={IS_DEMO_MODE ? { paddingTop: "var(--demo-banner-height, 38px)" } : undefined}
    >
      {/* Global Mode Bar - shown on all pages except landing and the arena (which has its own nav) */}
      {!isLanding && !isArena && <GlobalModeBar />}
      <main className={contentClass}>
        <Outlet />
      </main>
      {/* Global upgrade prompt modal */}
      <UpgradePromptModal />
    </div>
  );
}
