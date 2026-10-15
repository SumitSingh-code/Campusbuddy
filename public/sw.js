// Unigram — Service Worker v3
// Minimal SW: only here for PWA installability (Chrome requires a fetch handler).
// We intentionally do NOT intercept ANY request — no caching, no offline support for MVP.
// This avoids the sw.js blocking Supabase auth fetches or Next.js page loads.

const CACHE_NAME = 'unigram-sw-v3';

self.addEventListener('install', () => {
  // Activate immediately — skip waiting for old clients to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients + delete any old caches
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch handler is required for the PWA "Add to Home Screen" install prompt.
// We return early WITHOUT calling event.respondWith() — this means the browser
// handles every request natively. The SW acts as a pure pass-through.
// DO NOT add event.respondWith() here — it was blocking Supabase auth requests.
self.addEventListener('fetch', () => {
  // Intentionally empty — browser handles all requests natively.
  // Having this listener is enough for Chrome's PWA installability check.
});
