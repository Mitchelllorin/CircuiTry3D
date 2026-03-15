import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type PromoMessage = {
  type?: string;
  path?: string;
};

/**
 * Feature-showcase promo page (Part III).
 *
 * Highlights actual gameplay functionality, the Arena Split-Screen UI, and
 * F.U.S.E.™ in action. Renders the cinematic promo in an iframe (same
 * pattern as Promo and Promo2). The iframe can post a `promo:navigate`
 * message to trigger client-side navigation in the parent SPA.
 */
export default function Promo3() {
  const navigate  = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<PromoMessage>) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== "promo:navigate") return;
      const nextPath =
        typeof msg.path === "string" && msg.path.trim().length > 0
          ? msg.path
          : "/";
      navigate(nextPath);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <div className="promo-page-wrapper" style={{ width: "100%", height: "100%" }}>
      <iframe
        ref={iframeRef}
        title="CircuiTry3D — In Action"
        src="promo3.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
