import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Routes, Route, Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Home from "../pages/Home";
import BrandSignature from "../components/BrandSignature";
import GlobalModeBar from "../components/GlobalModeBar";
import TipsTicker from "../components/TipsTicker";
import ErrorBoundary from "../components/ErrorBoundary";
import DemoBanner from "../components/DemoBanner";
import { WorkspaceModeProvider } from "../context/WorkspaceModeContext";
import { ThemeProvider } from "../context/ThemeContext";
import { AppSettingsProvider } from "../context/AppSettingsContext";
import { IS_DEMO_MODE } from "../utils/demoMode";
import "../styles/layout.css";

// Lazy-load heavy pages so they are code-split into separate chunks.
// This drastically reduces the initial JS bundle size — the Builder page
// alone pulls in Three.js, the schematic engine, wire routing, etc.
const Builder = lazy(() => import("../pages/Builder"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const DataSafety = lazy(() => import("../pages/DataSafety"));
const AppAccess = lazy(() => import("../pages/AppAccess"));
const PlayStoreCompliance = lazy(() => import("../pages/PlayStoreCompliance"));
const DeleteAccount = lazy(() => import("../pages/DeleteAccount"));
const Screenshots = lazy(() => import("../pages/Screenshots"));
const Partnerships = lazy(() => import("../pages/Partnerships"));
const Promo = lazy(() => import("../pages/Promo"));
const Promo2 = lazy(() => import("../pages/Promo2"));
const Promo3 = lazy(() => import("../pages/Promo3"));
const Promo4 = lazy(() => import("../pages/Promo4"));
const Promo5 = lazy(() => import("../pages/Promo5"));
const Promo7 = lazy(() => import("../pages/Promo7"));
const Promo9 = lazy(() => import("../pages/Promo9"));
const Upgrade = lazy(() => import("../pages/Upgrade"));
const ContactSales = lazy(() => import("../pages/ContactSales"));
const EducatorPilot = lazy(() => import("../pages/EducatorPilot"));
const OwnerAccess = lazy(() => import("../pages/OwnerAccess"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));
const Settings = lazy(() => import("../pages/Settings"));

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "rgba(200,220,255,0.7)" }}>
      <span>{t("common.loading")}</span>
    </div>
  );
}

export default function App() {
  // Dispatch ctapp:ready after the first render so the initial-loader in
  // index.html is removed precisely when React has painted its first frame.
  // The event is also dispatched earlier in main.tsx (when the module script
  // runs) as an additional safety net.
  useEffect(() => {
    document.dispatchEvent(new CustomEvent('ctapp:ready'));
  }, []);

  return (
    <ThemeProvider>
    <AppSettingsProvider>
    <WorkspaceModeProvider>
      <ErrorBoundary>
      {/* Fixed demo-version banner – rendered above the entire app shell */}
      <DemoBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Builder />} />
            <Route path="/practice" element={<Navigate to="/app?mode=practice" replace />} />
            <Route path="/troubleshoot" element={<Navigate to="/app?mode=troubleshoot" replace />} />
            <Route path="/pricing" element={<Navigate to="/app?mode=pricing" replace />} />
            <Route path="/community" element={<Navigate to="/app?mode=community" replace />} />
            <Route path="/account" element={<Navigate to="/app?mode=account" replace />} />
            <Route path="/classroom" element={<Navigate to="/app?mode=classroom" replace />} />
            <Route path="/arcade" element={<Navigate to="/app?mode=arcade" replace />} />
            <Route path="/wire-guide" element={<Navigate to="/app?mode=wire-guide" replace />} />
            <Route path="/textbook" element={<Navigate to="/app?mode=textbook" replace />} />
            <Route path="/gallery" element={<Navigate to="/app?mode=gallery" replace />} />
            <Route path="/home-circuit" element={<Navigate to="/app?mode=home-circuit" replace />} />
            <Route path="/car-circuit" element={<Navigate to="/app?mode=car-circuit" replace />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/data-safety" element={<DataSafety />} />
            <Route path="/app-access" element={<AppAccess />} />
            <Route path="/play-store" element={<PlayStoreCompliance />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/screenshots" element={<Screenshots />} />
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/promo2" element={<Promo2 />} />
            <Route path="/promo3" element={<Promo3 />} />
            <Route path="/promo4" element={<Promo4 />} />
            <Route path="/promo5" element={<Promo5 />} />
            <Route path="/promo7" element={<Promo7 />} />
            <Route path="/promo9" element={<Promo9 />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/contact-sales" element={<ContactSales />} />
            <Route path="/educator-pilot" element={<EducatorPilot />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/owner" element={<OwnerAccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </WorkspaceModeProvider>
    </AppSettingsProvider>
    </ThemeProvider>
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
      {/* Tips & facts ticker - shown on all pages except landing and arena */}
      {!isLanding && !isArena && <TipsTicker />}
      {/* Site footer with legal links - shown on all pages except landing, workspace, and arena */}
      {!isLanding && !isWorkspace && !isArena && (
        <footer className="app-footer">
          <Link to="/privacy" className="app-footer-link">{t("footer.privacyPolicy")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/data-safety" className="app-footer-link">{t("footer.dataSafety")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/settings" className="app-footer-link">Settings</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/app-access" className="app-footer-link">{t("footer.getTheApp")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/play-store" className="app-footer-link">{t("footer.playStoreCompliance")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/delete-account" className="app-footer-link">{t("footer.deleteAccount")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/partnerships" className="app-footer-link">{t("footer.partnerships")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/terms" className="app-footer-link">{t("footer.terms")}</Link>
        </footer>
      )}
    </div>
  );
}
