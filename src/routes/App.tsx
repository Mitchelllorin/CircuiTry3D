import { Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Pricing from "../pages/Pricing";
import Community from "../pages/Community";
import Account from "../pages/Account";
import UnifiedNav from "../components/UnifiedNav";
import "../styles/layout.css";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Builder />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/community" element={<Community />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 24, color: "var(--text-primary)", background: "var(--bg-darker)", minHeight: "100vh" }}>
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

  const shellClass = isLanding ? "app-shell is-landing" : "app-shell";
  const contentClass = isLanding ? "app-content is-landing" : "app-content";

  return (
    <div className={shellClass}>
      {!isLanding && !isWorkspace && (
        <UnifiedNav />
      )}
      <main className={contentClass}>
        <Outlet />
      </main>
    </div>
  );
}
