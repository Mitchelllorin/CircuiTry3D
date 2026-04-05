import { useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useArena } from "../context/ArenaContext";
import type { ArenaOutboundMessage } from "../types/manufacturer-component";

export default function Arena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { iframeRef, _handleArenaMessage, postToArena } = useArena();

  // Build the iframe src — forward ?session= and ?component= deep-link params
  const iframeSrc = (() => {
    const params = new URLSearchParams();
    const session = searchParams.get("session");
    const component = searchParams.get("component");
    if (session) params.set("session", session);
    if (component) params.set("component", component);
    const qs = params.toString();
    return qs ? `arena.html?${qs}` : "arena.html";
  })();

  const sendInitMessage = useCallback(() => {
    // Tell the arena to hide its native header (React shell provides nav)
    // and pass theme / feature-flag context
    postToArena({
      type: "arena:init",
      hideNativeHeader: true,
      theme: "dark",
    });
  }, [postToArena]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ArenaOutboundMessage>) => {
      // Only accept messages from the same origin (arena.html is same-origin).
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        return;
      }

      if (message.type === "arena:navigate") {
        const msg = message as { type: string; path?: string };
        const nextPath =
          typeof msg.path === "string" && msg.path.trim().length > 0
            ? msg.path
            : "/";
        navigate(nextPath);
        return;
      }

      // Delegate all other arena messages to the context
      _handleArenaMessage(message);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, _handleArenaMessage]);

  const handleIframeLoad = useCallback(() => {
    // Once the iframe has loaded, send the initialisation message
    sendInitMessage();
  }, [sendInitMessage]);

  return (
    <div className="arena-page-wrapper">
      <iframe
        ref={iframeRef}
        title="Component Arena"
        src={iframeSrc}
        onLoad={handleIframeLoad}
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
