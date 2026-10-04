// Service worker — cache-first ONLY for fingerprinted build assets.
// Never caches index.html (stale app shell) or /api (failed logins, signed-out
// states and 401s must never come from cache). Fonts are cache-first; all
// other requests are network-first with a cache fallback for offline.
//
// NOTE: web-push handling moved to the dashboard app (it owns the persistent
// session and the push opt-in UI). Accounts no longer registers for push; the
// app unregisters this worker + any legacy push subscriptions on boot, so the
// worker only exists to let those cleanup paths run and then disappear.
const CACHE_NAME = 'tirbeo-auth-v8';

const PRECACHE = [
  '/index.html',
  '/logo-opt.png',
  '/favicon-48.png',
  '/background.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // 1) API: network-only (never serve stale/failed login responses)
  if (url.pathname.startsWith('/api/')) return;

  // 2) Fingerprinted build assets: cache-first, refresh in background
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || network;
      })
    );
    return;
  }

  // 3) Fonts: cache-first (immutable in practice)
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // 4) Everything else (HTML, images, sw.js itself): network-first with
  //    cache fallback so updates ship immediately and offline still works.
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
