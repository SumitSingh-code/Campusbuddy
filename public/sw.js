// Unigram — Service Worker
// PWA installability: a fetch handler is required for Chrome's "Add to Home Screen" prompt.
// Strategy:
//   /api/* → bypass SW entirely (no event.respondWith) — browser handles natively.
//             Previously respondWith(fetch(req)) caused EVERY API call to appear twice
//             in DevTools (once from api.js, once from sw.js) = double round-trips.
//   static  → pass-through (no caching for MVP; add cache-first later if needed).

const CACHE_NAME = 'unigram-sw-v2';

self.addEventListener('install', () => {
  // Activate immediately — no need to wait for old SW clients to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients so this SW controls the page right away
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ① API requests — never intercept. Let the browser handle them directly.
  //   If we call event.respondWith(fetch(request)) here, DevTools shows the
  //   request twice: once from the page's fetch() and once from the SW's fetch().
  //   That was the "double-fetch" bug. Returning without calling respondWith
  //   makes the browser handle the request natively with zero SW overhead.
  if (url.includes('/api/')) return;

  // ② Cross-origin requests — never intercept (Supabase, CDN, etc.)
  if (!url.startsWith(self.location.origin)) return;

  // ③ Same-origin static assets — pass-through (no caching for MVP)
  //   Uncomment and extend the cache strategy here when offline support is needed.
  event.respondWith(fetch(event.request));
});
