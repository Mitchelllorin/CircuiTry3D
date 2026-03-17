import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type PromoMessage = {
  type?: string;
  path?: string;
};

/**
 * Gameplay Reel promo page (Part VII).
 *
 * A cinematic, full-viewport scene-based slideshow built around the
 * footage recorded by the CircuiTry3D circuit bot (scripts/circuit-bot.js).
 * Each scene plays a bot-recorded gameplay clip as a full-screen video
 * background with animated text overlays, scanlines, and the shared
 * circuit-network canvas animation.
 *
 * Scenes:
 *   0 — Title / Hook
 *   1 — Series Circuit (scene-01-series.webm)
 *   2 — Parallel Circuit (scene-02-parallel.webm)
 *   3 — Overload / Thermal Failure (scene-03-overload.webm)
 *   4 — Mixed Series-Parallel (scene-04-mixed.webm)
 *   5 — Promo Page Sweep (scene-05-promo.webm)
 *   6 — Zoom Tiers Explainer
 *   7 — CTA
 *
 * Same iframe pattern as the other Promo pages. The iframe can post
 * a `promo:navigate` message to trigger client-side navigation in
 * the parent SPA.
 */
export default function Promo7() {
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
        title="CircuiTry3D — Gameplay Reel"
        src="promo7.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
