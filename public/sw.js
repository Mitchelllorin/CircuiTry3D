// CircuiTry3D Service Worker
// Provides offline capability and caching for the PWA

const CACHE_NAME = 'circuitry3d-v4';
const STATIC_CACHE = 'circuitry3d-static-v4';
const DYNAMIC_CACHE = 'circuitry3d-dynamic-v4';

// Install event - cache core assets relative to this SW's scope.
// Using self.registration.scope makes the paths work on both the root domain
// (e.g. '/') and GitHub Pages sub-paths (e.g. '/CircuiTry3D/') without
// hard-coding the base URL into the SW file.
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope; // e.g. 'https://host/CircuiTry3D/'
      const scopePath = new URL(scope).pathname; // e.g. '/CircuiTry3D/'

      const staticAssets = [
        scope,                              // root (serves index.html)
        `${scopePath}index.html`,
        `${scopePath}manifest.json`,
        `${scopePath}icons/icon-192.png`,
        `${scopePath}icons/icon-512.png`,
      ];

      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('[SW] Caching static assets');
        // addAll rejects if any asset 404s; use individual puts so a missing
        // optional asset (e.g. icon) does not abort the whole install.
        await Promise.allSettled(
          staticAssets.map((url) =>
            fetch(url).then((res) => {
              if (res.ok) return cache.put(url, res);
            })
          )
        );
        console.log('[SW] Static assets cached');
      } catch (err) {
        console.error('[SW] Failed to cache static assets:', err);
      }
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old version caches
              return name.startsWith('circuitry3d-') &&
                     name !== STATIC_CACHE &&
                     name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip external requests (APIs, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // HTML files (including those loaded in iframes like legacy.html, landing.html,
  // arena.html) must always be fetched from the network first so that merged
  // changes are immediately visible after a deploy.  Navigation requests get
  // the same treatment.
  const isHtmlRequest = request.mode === 'navigate' || url.pathname.endsWith('.html');
  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return cached index.html for SPA routing
              // Use the SW scope to build the correct path (works on both
              // '/' and GitHub Pages sub-paths like '/CircuiTry3D/').
              const scopePath = new URL(self.registration.scope).pathname;
              return caches.match(`${scopePath}index.html`) ||
                     caches.match(self.registration.scope);
            });
        })
    );
    return;
  }

  // For other assets, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response and update cache in background
          event.waitUntil(
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, networkResponse);
                  });
                }
              })
              .catch(() => {
                // Network failed, but we have cached response
              })
          );
          return cachedResponse;
        }

        // No cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Return offline fallback for failed requests
            if (request.destination === 'image') {
              // Return a placeholder for images
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1e293b" width="100" height="100"/><text fill="#64748b" x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="12">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            // Return empty response for other failed requests
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
