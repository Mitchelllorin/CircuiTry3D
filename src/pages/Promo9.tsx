import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type PromoMessage = {
  type?: string;
  path?: string;
};

/**
 * Component Arena Reel promo page (Part IX).
 *
 * A cinematic, full-viewport scene-based slideshow built around
 * real in-app captures (steel shots) from the CircuiTry3D Component Arena.
 * Each scene uses an actual screenshot as a full-screen background with
 * animated text overlays, scanlines, and the shared circuit-network canvas.
 *
 * Scenes:
 *   0 — Title / Hook
 *   1 — Two Contenders, One 3D Stage   (arena-shot-1)
 *   2 — LIVE: FUSE™ Scores Every Round  (arena-shot-3)
 *   3 — Champion Crowned in 3D         (arena-shot-2)
 *   4 — The Results Speak for Themselves (arena-shot-4)
 *   5 — CTA
 *
 * Same iframe pattern as the other Promo pages. The iframe can post
 * a `promo:navigate` message to trigger client-side navigation in
 * the parent SPA.
 */
export default function Promo9() {
  const navigate = useNavigate();
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
        title="CircuiTry3D — Component Arena Reel"
        src="promo9.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
