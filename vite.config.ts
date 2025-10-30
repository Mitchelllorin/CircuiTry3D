import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative paths so assets load correctly inside Capacitor (app:// scheme)
  // Without this, Android may appear stuck after the system splash because the
  // WebView can't resolve absolute "/assets" URLs.
  // NOTE: Vite recommends './' for truly relative asset URLs in file/protocol environments
  base: './',
  plugins: [react()],
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
});
