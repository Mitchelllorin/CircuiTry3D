import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import type {
  ArenaContextState,
  ArenaOutboundMessage,
  FuseAlertLevel,
} from "../types/manufacturer-component";

// ── Context value shape ───────────────────────────────────────────────────────

interface ArenaContextValue extends ArenaContextState {
  /** Ref to the arena iframe — set by Arena.tsx */
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** Send a command string to the arena iframe (e.g. "run-test", "reset") */
  sendCommand: (command: string) => void;
  /** Post an arbitrary payload to the arena iframe */
  postToArena: (message: Record<string, unknown>) => void;
  /** Called by Arena.tsx when it receives an inbound message from the iframe */
  _handleArenaMessage: (msg: ArenaOutboundMessage) => void;
}

const DEFAULT_STATE: ArenaContextState = {
  activeComponentId: null,
  fuseAlertLevel: "none",
  testRunning: false,
  lastExportAt: null,
  componentCount: 0,
};

const ArenaContext = createContext<ArenaContextValue>({
  ...DEFAULT_STATE,
  iframeRef: { current: null },
  sendCommand: () => undefined,
  postToArena: () => undefined,
  _handleArenaMessage: () => undefined,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ArenaProvider({ children }: { children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<ArenaContextState>(DEFAULT_STATE);

  const postToArena = useCallback((message: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage(message, window.location.origin);
  }, []);

  const sendCommand = useCallback(
    (command: string) => {
      postToArena({ type: "arena:command", payload: { command } });
    },
    [postToArena],
  );

  const _handleArenaMessage = useCallback((msg: ArenaOutboundMessage) => {
    switch (msg.type) {
      case "arena:metrics-update":
        setState((prev) => ({
          ...prev,
          activeComponentId: msg.componentId,
          testRunning: false,
        }));
        break;

      case "arena:fuse-event": {
        // Escalate alert level — never de-escalate automatically (user must reset)
        const levelOrder: FuseAlertLevel[] = ["none", "warn", "critical"];
        setState((prev) => {
          const incoming = levelOrder.indexOf(msg.severity);
          const existing = levelOrder.indexOf(prev.fuseAlertLevel);
          return {
            ...prev,
            fuseAlertLevel: incoming > existing ? msg.severity : prev.fuseAlertLevel,
            activeComponentId: msg.componentId,
          };
        });
        break;
      }

      case "arena:status":
        setState((prev) => ({
          ...prev,
          testRunning: msg.testRunning,
          componentCount: msg.componentCount,
          // Reset FUSE alert when arena reports a clean state
          fuseAlertLevel:
            !msg.testRunning && msg.message.toLowerCase().includes("reset")
              ? "none"
              : prev.fuseAlertLevel,
        }));
        break;

      default:
        break;
    }
  }, []);

  // Reset FUSE alert when navigating away from the arena
  useEffect(() => {
    return () => {
      setState(DEFAULT_STATE);
    };
  }, []);

  return (
    <ArenaContext.Provider
      value={{
        ...state,
        iframeRef,
        sendCommand,
        postToArena,
        _handleArenaMessage,
      }}
    >
      {children}
    </ArenaContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArena() {
  return useContext(ArenaContext);
}

export default ArenaContext;
