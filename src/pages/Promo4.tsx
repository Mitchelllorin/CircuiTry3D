import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type PromoMessage = {
  type?: string;
  path?: string;
};

/**
 * Average-person engagement promo page (Part IV).
 *
 * A curiosity-first cinematic promo aimed at new users with no prior
 * electronics knowledge. Uses abstract electron/particle animation —
 * no circuit-building gameplay footage. Same iframe pattern as the
 * other Promo pages. The iframe can post a `promo:navigate` message to
 * trigger client-side navigation in the parent SPA.
 */
export default function Promo4() {
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
        title="CircuiTry3D — See Electricity Come Alive"
        src="promo4.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
