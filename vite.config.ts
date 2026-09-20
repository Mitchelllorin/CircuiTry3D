import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const sanitizedEnvBasePath = (process.env.VITE_BASE_PATH ?? '').trim();
  const webBasePath = sanitizedEnvBasePath || '/';

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
    /**
     * ONE APP, ONE PORT, ALWAYS - so a phone bookmark stays true.
     *
     * Every app here defaulted to 5173, so whichever dev server happened to be
     * running answered on the same address and a saved URL pointed at whatever
     * was up last. That is why a bookmark never held. One number per app, fixed,
     * and `strictPort` so a clash is reported rather than silently walked past:
     *
     *   3000  CircuiTry3D      5176  TheCell3D
     *   5173  ThePrints3D      5177  ThePyramids3D
     *   5174  AutoMotive3D     5178  AnyPlanet3D
     *   5175  AnyBody3D
     *
     * Reachable from the phone at http://rainmaker:<port> over Tailscale, which
     * is per-machine and already set up - nothing about it is per app. Vite
     * waves through IP addresses but NOT bare hostnames, so `rainmaker` and the
     * tailnet domain have to be named in allowedHosts or the phone gets
     * "Blocked request. This host is not allowed" and it reads like a broken
     * network instead of a host check doing its job.
     */
    server: {
      port: 3000,
      strictPort: true,
      open: true,
      // Bind to 0.0.0.0 so the dev server is reachable from phones/tablets on
      // the same LAN, and from the phone over Tailscale at http://rainmaker:3000.
      host: true,
      allowedHosts: ['rainmaker', '.ts.net', '.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.trycloudflare.com']
    },
    preview: {
      port: 4173
    }
  };
});
