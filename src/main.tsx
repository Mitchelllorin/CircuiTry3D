import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./routes/App";
import { AuthProvider } from "./context/AuthContext";
import { EngagementProvider } from "./context/EngagementContext";

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
  createRoot(container).render(
    <HashRouter>
      <AuthProvider>
        <EngagementProvider>
          <App />
        </EngagementProvider>
      </AuthProvider>
    </HashRouter>
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
