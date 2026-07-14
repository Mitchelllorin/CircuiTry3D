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
      // Prefer strict source matching when available, but also accept
      // same-origin/"null" sandboxed origins for mobile browsers that may
      // report iframe sources inconsistently.
      const isFromLandingIframe = event.source === iframeRef.current?.contentWindow;
      const isTrustedOrigin =
        event.origin === window.location.origin || event.origin === "null";
      if (!isFromLandingIframe && !isTrustedOrigin) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type !== "landing:navigate") {
        return;
      }

      const requestedPath =
        typeof message.path === "string" && message.path.trim().length > 0
          ? message.path.trim()
          : "/";
      const nextPath = requestedPath.startsWith("/") ? requestedPath : "/";

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
