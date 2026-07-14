import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '/CircuiTry3D/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // VITE_BASE_PATH is set by CI workflows so each deployment (production or
  // PR preview) gets the correct sub-path. Defaults to root for the
  // production custom domain (www.circuitry3d.net).
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Three.js core is intentionally large for the 3D workspace.
    // Raise the warning threshold so expected chunk sizes don't trigger noise.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'three-vendor': ['three']
        }
      }
    },
    server: {
      port: 3000,
      open: true,
      // Bind to 0.0.0.0 so the dev server is reachable from phones/tablets on
      // the same LAN (e.g. Android testing via the QR code at http://<lan-ip>:3000).
      host: true
    },
    preview: {
      port: 4173
    }
  };
});
