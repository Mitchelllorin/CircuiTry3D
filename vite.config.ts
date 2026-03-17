import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths only for Capacitor builds (app:// scheme).
  // For web deployments (dev, preview, production), use absolute paths.
  // This prevents asset loading issues in both environments.
  base: mode === 'capacitor' ? './' : '/',
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
