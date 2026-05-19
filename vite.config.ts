import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envBasePath = (process.env.VITE_BASE_PATH ?? '').trim();
  const webBasePath = envBasePath || '/';

  return {
    // Capacitor Android serves bundled files from app assets (no sub-path), so
    // use relative URLs in capacitor mode to avoid startup hangs on the loader.
    base: mode === 'capacitor' ? './' : webBasePath,
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
  };
});
