// Campus Wall — Service Worker
// Installability-only: no offline caching.
// A fetch handler is required for Chrome's PWA installability check.

const CACHE_NAME = 'campus-wall-v1';

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients so this SW controls the page immediately
  event.waitUntil(self.clients.claim());
});

// Fetch handler is required for "Add to Home Screen" prompt on Android Chrome.
// We simply pass through all requests — no caching.
self.addEventListener('fetch', (event) => {
  // Only intercept same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Pass through — no offline caching needed for MVP
  event.respondWith(fetch(event.request));
});
