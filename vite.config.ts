import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // VITE_BASE_PATH is set by CI workflows so each deployment (production or
  // PR preview) gets the correct sub-path.  Defaults to the GitHub Pages repo
  // root path so local dev and manual builds work without any extra env setup.
  base: process.env.VITE_BASE_PATH ?? '/CircuiTry3D/',
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
