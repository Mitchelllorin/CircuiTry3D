import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./routes/App";
import { AuthProvider } from "./context/AuthContext";
import { EngagementProvider } from "./context/EngagementContext";
import { GalleryProvider } from "./context/GalleryContext";
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
  if (
    message?.includes("ResizeObserver loop limit exceeded") ||
    message?.includes("ResizeObserver loop completed with undelivered notifications")
  ) {
    return;
  }
  const stack = event.error instanceof Error ? event.error.stack : undefined;

  // If React has already mounted (root has children), do not destroy the app — the
  // React ErrorBoundary will catch rendering errors and show a recovery UI.  Only
  // show the full-screen fatal overlay when React has never rendered (blank screen).
  const rootEl = document.getElementById("root");
  if (rootEl && rootEl.childElementCount > 0) {
    console.error("[App] Uncaught error:", message, stack);
    return;
  }

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

  // Never replace a running React app with a full-screen overlay on a promise
  // rejection.  Unhandled rejections from Capacitor plugins, billing, i18next,
  // or transient network calls must not kill the UI.  Log only.
  console.error("[App] Unhandled promise rejection:", message, stack);
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
      // Re-sync data or refresh state if needed
    },
    onPause: () => {
      // Save state or pause animations if needed
    }
  }).catch((error) => {
    console.warn('[App] Android initialization failed:', error);
  });

  // On Android, initialize the Play Store billing client and restore any
  // active subscriptions and one-time purchases so stored state is correct
  // before the UI renders.
  if (isAndroidApp()) {
    initBilling()
      .then(() => {
        restorePurchases().catch((error) => {
          console.warn('[App] Subscription restore failed:', error);
        });
        restoreProPurchases().catch((error) => {
          console.warn('[App] Pro unlock restore failed:', error);
        });
        // Restore the live one-time Premium Unlock ($6.99) too — without this,
        // a user who already bought premium_unlock stays locked in demo mode
        // after a reinstall / data clear until they manually hit "Restore".
        restorePremiumPurchases().catch((error) => {
          console.warn('[App] Premium unlock restore failed:', error);
        });
      })
      .catch((error) => {
        console.warn('[App] Billing initialization failed:', error);
      });

    // NEW: ensure Android-specific sim systems are bootstrapped
    setupAndroidSimBootstrap();
  }

  createRoot(container).render(
    <HashRouter>
      <AuthProvider>
        <EngagementProvider>
          <App />
        </EngagementProvider>
      </AuthProvider>
    </HashRouter>
  );

  // Signal the inline fallback script (index.html) that the module bundle
  // loaded and React is mounting — this removes the initial-loader via the
  // ctapp:ready handler registered in the plain <script> block.  We also
  // keep a short setTimeout as a belt-and-suspenders guard.
  document.dispatchEvent(new CustomEvent('ctapp:ready'));
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();
  }, 300);
} catch (error) {
  renderFatalOverlay({
    title: "React Initialization Error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
