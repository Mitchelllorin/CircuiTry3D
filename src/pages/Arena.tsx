import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type ArenaMessage = {
  type?: string;
  path?: string;
};

export default function Arena() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ArenaMessage>) => {
      // Only accept messages from the same origin (arena.html is served from
      // the same origin as the host app).
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

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
    <div className="arena-page-wrapper">
      <iframe
        ref={iframeRef}
        title="Component Arena"
        src="arena.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
