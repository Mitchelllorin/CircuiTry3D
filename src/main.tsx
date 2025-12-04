import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./routes/App";
import { AuthProvider } from "./context/AuthContext";
import { EngagementProvider } from "./context/EngagementContext";
import { CircuitStorageProvider } from "./context/CircuitStorageContext";
import { GamificationProvider } from "./context/GamificationContext";
import { initializeAndroid, registerServiceWorker, isCapacitor } from "./hooks/capacitor/useAndroidInit";

window.addEventListener('error', (event) => {
  document.body.style.background = '#1a0000';
  document.body.innerHTML = `
    <div style="color: white; padding: 20px; font-family: monospace;">
      <h1>Application Error</h1>
      <p><strong>Message:</strong> ${event.error?.message || event.message}</p>
      <p><strong>Stack:</strong></p>
      <pre style="background: #000; padding: 10px; overflow: auto;">${event.error?.stack || 'No stack trace'}</pre>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  document.body.style.background = '#1a0000';
  document.body.innerHTML = `
    <div style="color: white; padding: 20px; font-family: monospace;">
      <h1>Unhandled Promise Rejection</h1>
      <p><strong>Reason:</strong> ${event.reason}</p>
    </div>
  `;
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
        <AuthProvider>
          <EngagementProvider>
            <CircuitStorageProvider>
              <GamificationProvider>
                <App />
              </GamificationProvider>
            </CircuitStorageProvider>
          </EngagementProvider>
        </AuthProvider>
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
  document.body.style.background = '#1a0000';
  document.body.innerHTML = `
    <div style="color: white; padding: 20px; font-family: monospace;">
      <h1>React Initialization Error</h1>
      <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
      <pre style="background: #000; padding: 10px; overflow: auto;">${error instanceof Error && error.stack ? error.stack : 'No stack trace'}</pre>
    </div>
  `;
}
