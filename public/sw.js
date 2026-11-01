// Unigram — Service Worker v5
// Minimal SW: only here for PWA installability + Web Push notifications.
// We intentionally do NOT intercept ANY request — no caching, no offline support for MVP.
// This avoids the sw.js blocking Supabase auth fetches or Next.js page loads.

const CACHE_NAME = 'unigram-sw-v5';

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

// ─── Web Push Notifications Handler ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'UniGram', body: event.data ? event.data.text() : 'New campus update' };
  }

  const title = data.title || 'UniGram';
  const tag = data.tag || 'unigram-alert-' + Date.now();
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-32x32.png',
    vibrate: [200, 100, 200],
    tag: tag,
    renotify: true,
    data: {
      url: data.url || '/feed'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click Handler (Deep-link into app) ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/feed';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate to destination
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
