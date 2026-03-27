import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Always use '/' — Capacitor's https://localhost origin resolves absolute
  // paths identically to relative ones, and this matches the Vercel build
  // that is known to work.  The old './' for capacitor mode is no longer
  // needed with androidScheme: "https" in capacitor.config.json.
  // GitHub Pages deployments can still override via PAGES_BASE_PATH.
  base: process.env.PAGES_BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'three-vendor': ['three']
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
