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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 4173
  }
}));
