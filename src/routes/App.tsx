import { Routes, Route, Link } from "react-router-dom";
import Home from "../pages/Home";
import Builder from "../pages/Builder";
import Arena from "../pages/Arena";
import WireDemo from "../pages/WireDemo";

export default function App() {
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
  return (
    <div style={{ padding: 24, color: "#fff", background: "#0f172a", minHeight: "100vh" }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
}
