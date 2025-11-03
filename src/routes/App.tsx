import { Routes, Route, Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Arena from "../pages/Arena";
import WireDemo from "../pages/WireDemo";
import Pricing from "../pages/Pricing";
import Practice from "../pages/Practice";
import Community from "../pages/Community";
import Account from "../pages/Account";
import { useAuth } from "../context/AuthContext";
import "../styles/layout.css";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Builder />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/wire-demo" element={<WireDemo />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/community" element={<Community />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 24, color: "#fff", background: "#0f172a", minHeight: "100vh" }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
}

function AppLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const buildNavClass = ({ isActive }: { isActive: boolean }) => (isActive ? "app-nav-link is-active" : "app-nav-link");

  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(" ")
        .map((segment) => segment.trim()[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  const shellClass = isLanding ? "app-shell is-landing" : "app-shell";
  const contentClass = isLanding ? "app-content is-landing" : "app-content";

  return (
    <div className={shellClass}>
      {!isLanding && (
        <header className="app-header">
          <Link to="/" className="app-brand">
            Circui<span>Try</span>3D
          </Link>
          <nav className="app-nav">
            <NavLink end to="/" className={buildNavClass}>
              Home
            </NavLink>
            <NavLink to="/app" className={buildNavClass}>
              Builder
            </NavLink>
            <NavLink to="/arena" className={buildNavClass}>
              Arena
            </NavLink>
            <NavLink to="/practice" className={buildNavClass}>
              Practice
            </NavLink>
            <NavLink to="/pricing" className={buildNavClass}>
              Pricing
            </NavLink>
            <NavLink to="/community" className={buildNavClass}>
              Community
            </NavLink>
          </nav>
          <div className="app-account">
            <Link to="/account" className={currentUser ? "account-link is-auth" : "account-link"}>
              {currentUser ? (
                <>
                  <span
                    className="account-avatar"
                    aria-hidden="true"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    {initials ?? currentUser.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="account-label">{currentUser.displayName}</span>
                </>
              ) : (
                <>
                  <span className="account-label">Sign In</span>
                </>
              )}
            </Link>
          </div>
        </header>
      )}
      <main className={contentClass}>
        <Outlet />
      </main>
    </div>
  );
}
