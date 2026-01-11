import { Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Practice from "../pages/Practice";
import SchematicMode from "../pages/SchematicMode";
import Pricing from "../pages/Pricing";
import Community from "../pages/Community";
import Account from "../pages/Account";
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
          <Route path="/practice" element={<Practice />} />
          <Route path="/schematic" element={<SchematicMode />} />
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

  const shellClass = [
    "app-shell",
    isLanding && "is-landing",
    isWorkspace && "is-workspace",
  ].filter(Boolean).join(" ");
  const contentClass = isLanding ? "app-content is-landing" : "app-content";

  return (
    <div className={shellClass}>
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
