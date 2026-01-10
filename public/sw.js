// Service Worker for Key Hunt Offline Support
const CACHE_NAME = 'key-hunt-cache-v1';
const OFFLINE_CACHE_NAME = 'key-hunt-offline-v1';

// Static assets to cache for Key Hunt
const STATIC_ASSETS = [
  '/key-hunt',
  '/offline.html',
];

// API routes to cache responses from
const CACHEABLE_API_ROUTES = [
  '/api/con-mode-lookup', // Still uses same API endpoint
  '/api/quick-lookup',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('offline.html')));
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => (name.startsWith('key-hunt-') || name.startsWith('con-mode-')) && name !== CACHE_NAME && name !== OFFLINE_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle Key Hunt page navigation
  if (url.pathname === '/key-hunt') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return cached version if offline
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline - Key Hunt not available', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }

  // Handle Next.js static assets (_next/static)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_LOOKUP_RESULT') {
    // Cache a lookup result sent from the main thread
    const { key, data } = event.data;
    caches.open(OFFLINE_CACHE_NAME).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(`/api/cached-lookup/${key}`, response);
    });
  }

  if (event.data && event.data.type === 'GET_CACHED_LOOKUP') {
    const { key } = event.data;
    caches.open(OFFLINE_CACHE_NAME).then((cache) => {
      cache.match(`/api/cached-lookup/${key}`).then((response) => {
        if (response) {
          response.json().then((data) => {
            event.ports[0].postMessage({ found: true, data });
          });
        } else {
          event.ports[0].postMessage({ found: false });
        }
      });
    });
  }
});

// Sync event for background sync (when back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Notify clients to sync
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' });
  });
}
