import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.COMMIT_SHA ??
  'dev';
const buildRef =
  process.env.VERCEL_GIT_COMMIT_REF ??
  process.env.GITHUB_REF_NAME ??
  process.env.CF_PAGES_BRANCH ??
  process.env.BRANCH_NAME ??
  'local';
const buildTime = process.env.VERCEL_BUILD_TIME ?? new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths only for Capacitor builds (app:// scheme).
  // For web deployments (dev, preview, production), use absolute paths.
  // This prevents asset loading issues in both environments.
  base: mode === 'capacitor' ? './' : '/',
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_REF__: JSON.stringify(buildRef),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
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
