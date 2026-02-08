import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./routes/App";
import { AuthProvider } from "./context/AuthContext";
import { EngagementProvider } from "./context/EngagementContext";
import { CircuitStorageProvider } from "./context/CircuitStorageContext";
import { GamificationProvider } from "./context/GamificationContext";
import { initializeAndroid, registerServiceWorker } from "./hooks/capacitor/useAndroidInit";
import { ClassroomProvider } from "./context/ClassroomContext";
import { DemoModeProvider } from "./context/DemoModeContext";

function renderFatalOverlay(payload: {
  title: string;
  message: string;
  stack?: string;
  details?: string;
}) {
  // Avoid throwing while trying to render an error UI
  try {
    document.body.style.background = "#1a0000";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    const root = document.createElement("div");
    root.style.color = "white";
    root.style.padding = "20px";
    root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

    const h1 = document.createElement("h1");
    h1.textContent = payload.title;
    root.appendChild(h1);

    const p = document.createElement("p");
    p.textContent = payload.message;
    root.appendChild(p);

    if (payload.details) {
      const details = document.createElement("pre");
      details.style.background = "#000";
      details.style.padding = "10px";
      details.style.overflow = "auto";
      details.textContent = payload.details;
      root.appendChild(details);
    }

    if (payload.stack) {
      const stackLabel = document.createElement("p");
      stackLabel.textContent = "Stack:";
      root.appendChild(stackLabel);

      const pre = document.createElement("pre");
      pre.style.background = "#000";
      pre.style.padding = "10px";
      pre.style.overflow = "auto";
      pre.textContent = payload.stack;
      root.appendChild(pre);
    }

    document.body.replaceChildren(root);
  } catch {
    // no-op
  }
}

window.addEventListener("error", (event) => {
  // Ignore resource loading errors (script/link/img) which are not application crashes.
  const target = (event as Event).target;
  if (
    target instanceof HTMLScriptElement ||
    target instanceof HTMLLinkElement ||
    target instanceof HTMLImageElement
  ) {
    return;
  }

  if (!(event instanceof ErrorEvent)) {
    return;
  }

  const message = event.error instanceof Error ? event.error.message : event.message;
  const stack = event.error instanceof Error ? event.error.stack : undefined;
  renderFatalOverlay({
    title: "Application Error",
    message: message || "An unexpected error occurred.",
    stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = (event as PromiseRejectionEvent).reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  renderFatalOverlay({
    title: "Unhandled Promise Rejection",
    message,
    stack,
  });
});

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

try {
  // Register service worker for PWA (web only)
  registerServiceWorker();

  // Initialize Android/Capacitor features
  initializeAndroid({
    onBackButton: () => {
      // Return false to use default back navigation
      // Return true to prevent default and handle custom behavior
      return false;
    },
    onResume: () => {
      console.log('[App] Resumed from background');
      // Re-sync data or refresh state if needed
    },
    onPause: () => {
      console.log('[App] Going to background');
      // Save state or pause animations if needed
    }
  }).catch((error) => {
    console.warn('[App] Android initialization failed:', error);
  });

  createRoot(container).render(
    <React.StrictMode>
      <HashRouter>
        <DemoModeProvider>
          <AuthProvider>
            <EngagementProvider>
              <CircuitStorageProvider>
                <GamificationProvider>
                  <ClassroomProvider>
                    <App />
                  </ClassroomProvider>
                </GamificationProvider>
              </CircuitStorageProvider>
            </EngagementProvider>
          </AuthProvider>
        </DemoModeProvider>
      </HashRouter>
    </React.StrictMode>
  );
  
  setTimeout(() => {
    const loader = document.querySelector('.initial-loader');
    if (loader) {
      loader.remove();
    }
  }, 100);
} catch (error) {
  renderFatalOverlay({
    title: "React Initialization Error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
