import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./routes/App";
import { AuthProvider } from "./context/AuthContext";
import { EngagementProvider } from "./context/EngagementContext";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

createRoot(container).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <EngagementProvider>
          <App />
        </EngagementProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
