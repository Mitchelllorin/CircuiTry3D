import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Home from "../pages/Home";
import BrandSignature from "../components/BrandSignature";
import GlobalModeBar from "../components/GlobalModeBar";
import TipsTicker from "../components/TipsTicker";
import ErrorBoundary from "../components/ErrorBoundary";
import DemoBanner from "../components/DemoBanner";
import { WorkspaceModeProvider } from "../context/WorkspaceModeContext";
import { ThemeProvider } from "../context/ThemeContext";
import { IS_DEMO_MODE } from "../utils/demoMode";
import "../styles/layout.css";

// Lazy-load heavy pages so they are code-split into separate chunks.
// This drastically reduces the initial JS bundle size — the Builder page
// alone pulls in Three.js, the schematic engine, wire routing, etc.
const Builder = lazy(() => import("../pages/Builder"));
const Practice = lazy(() => import("../pages/Practice"));
const Pricing = lazy(() => import("../pages/Pricing"));
const Community = lazy(() => import("../pages/Community"));
const Account = lazy(() => import("../pages/Account"));
const Classroom = lazy(() => import("../pages/Classroom"));
const Arcade = lazy(() => import("../pages/Arcade"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const DataSafety = lazy(() => import("../pages/DataSafety"));
const AppAccess = lazy(() => import("../pages/AppAccess"));
const PlayStoreCompliance = lazy(() => import("../pages/PlayStoreCompliance"));
const DeleteAccount = lazy(() => import("../pages/DeleteAccount"));
const Textbook = lazy(() => import("../pages/Textbook"));
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
const Gallery = lazy(() => import("../pages/Gallery"));
const EducatorPilot = lazy(() => import("../pages/EducatorPilot"));
const OwnerAccess = lazy(() => import("../pages/OwnerAccess"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "rgba(200,220,255,0.7)" }}>
      <span>{t("common.loading")}</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <WorkspaceModeProvider>
      <ErrorBoundary>
      {/* Fixed demo-version banner – rendered above the entire app shell */}
      <DemoBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Builder />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/community" element={<Community />} />
            <Route path="/account" element={<Account />} />
            <Route path="/classroom" element={<Classroom />} />
            <Route path="/arcade" element={<Arcade />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/data-safety" element={<DataSafety />} />
            <Route path="/app-access" element={<AppAccess />} />
            <Route path="/play-store" element={<PlayStoreCompliance />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/textbook" element={<Textbook />} />
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
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/educator-pilot" element={<EducatorPilot />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Route>
          <Route path="/owner" element={<OwnerAccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </WorkspaceModeProvider>
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
  const isPromo = location.pathname === "/promo";
  const isPromo2 = location.pathname === "/promo2";
  const isPromo3 = location.pathname === "/promo3";
  const isPromo4 = location.pathname === "/promo4";
  const isPromo5 = location.pathname === "/promo5";
  const isPromo7 = location.pathname === "/promo7";
  const isPromo9 = location.pathname === "/promo9";
  const isAnyPromo = isPromo || isPromo2 || isPromo3 || isPromo4 || isPromo5 || isPromo7 || isPromo9;
  const shellRef = useRef<HTMLDivElement>(null);

  const shellClass = [
    "app-shell",
    isLanding && "is-landing",
    isWorkspace && "is-workspace",
    isPromo && "is-promo",
    isPromo2 && "is-promo2",
    isPromo3 && "is-promo3",
    isPromo4 && "is-promo4",
    isPromo5 && "is-promo5",
    isPromo7 && "is-promo7",
    isPromo9 && "is-promo9",
  ].filter(Boolean).join(" ");
  const contentClass = isLanding || isAnyPromo ? "app-content is-landing" : "app-content";

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
      {/* Global Mode Bar - shown on all pages except landing and promo */}
      {!isLanding && !isAnyPromo && <GlobalModeBar />}
      <main className={contentClass}>
        <Outlet />
      </main>
      {/* Tips & facts ticker - workspace only */}
      {isWorkspace && <TipsTicker />}
      {/* Site footer with legal links - shown on all pages except landing, workspace & promo */}
      {!isLanding && !isWorkspace && !isAnyPromo && (
        <footer className="app-footer">
          <Link to="/privacy" className="app-footer-link">{t("footer.privacyPolicy")}</Link>
          <span className="app-footer-sep" aria-hidden="true">·</span>
          <Link to="/data-safety" className="app-footer-link">{t("footer.dataSafety")}</Link>
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
