import { Routes, Route, Link, Navigate } from "react-router-dom";
// Home landing page intentionally bypassed to avoid second splash
import Builder from "../pages/Builder";
import Arena from "../pages/Arena";
import WireDemo from "../pages/WireDemo";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<Builder />} />
      <Route path="/arena" element={<Arena />} />
      <Route path="/wire-demo" element={<WireDemo />} />
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
