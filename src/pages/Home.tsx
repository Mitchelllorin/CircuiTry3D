import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { APP_BRAND_NAME } from "../constants/branding";

type LandingMessage = {
  type?: string;
  path?: string;
};

export default function Home() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LandingMessage>) => {
      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type !== "landing:navigate") {
        return;
      }

      const nextPath = typeof message.path === "string" && message.path.trim().length > 0 ? message.path : "/";
      navigate(nextPath);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <div className="home-page">
      <iframe
        ref={iframeRef}
        title={`${APP_BRAND_NAME} Landing`}
        src="landing.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
