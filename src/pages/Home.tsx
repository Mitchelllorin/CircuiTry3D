import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type LandingMessage = {
  type?: string;
  path?: string;
};

/**
 * When VITE_DEMO_APP_URL is set at build time, the landing page "Launch Builder"
 * buttons open the external demo in a new tab instead of navigating in-app.
 * The demo build has VITE_DEMO_MODE=true, which limits the component
 * library to the six free components and shows the paywall for the rest.
 */
const DEMO_APP_URL: string = (import.meta.env.VITE_DEMO_APP_URL ?? "").trim();

export default function Home() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LandingMessage>) => {
      // Only accept messages from the landing page iframe.  Checking
      // event.source is more reliable than event.origin because some
      // browsers/environments report a sandboxed iframe's origin as "null"
      // even when allow-same-origin is set, which would silently block the
      // message while event.preventDefault() has already suppressed the
      // fallback link navigation.
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type !== "landing:navigate") {
        return;
      }

      const nextPath = typeof message.path === "string" && message.path.trim().length > 0 ? message.path : "/";

      // If an external demo URL is configured and the user is trying to open
      // the builder, send them to that deployment in a new tab instead.
      if (DEMO_APP_URL && nextPath === "/app") {
        window.open(DEMO_APP_URL, "_blank", "noopener,noreferrer");
        return;
      }

      navigate(nextPath);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <div className="home-page">
      <iframe
        ref={iframeRef}
        title="CircuiTry3D Landing"
        src="landing.html"
        style={{ width: "100%", height: "100dvh", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
