import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type ArenaMessage = {
  type?: string;
  path?: string;
};

/**
 * Arena page — renders the standalone arena.html in a full-height iframe.
 *
 * arena.html is the canonical implementation of the FUSE™ Component Arena:
 * it owns the THREE.js 3D rendering, the FUSE™ failure engine, tier gating,
 * and all failure-analysis UI.  Keeping the page as an iframe (the same
 * pattern used by Home → landing.html) means every change committed to
 * arena.html is immediately visible here without any React-layer duplication.
 */
export default function Arena() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ArenaMessage>) => {
      // Only trust messages from the same origin.
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      // arena.html can request a React-router navigation via postMessage.
      if (message.type !== "arena:navigate") {
        return;
      }

      const nextPath =
        typeof message.path === "string" && message.path.trim().length > 0
          ? message.path
          : "/";
      navigate(nextPath);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <ArenaView
      variant="page"
      onOpenBuilder={() => navigate("/app")}
    />
  );
}
