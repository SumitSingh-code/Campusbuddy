// Campus Wall — Client-Side SPA Router
// Hash-based routing: #/feed, #/anon, #/dm, etc.
// All page modules are loaded lazily (dynamic import) on first visit and cached —
// reduces initial JS payload from ~203KB to just this file + auth.js + utils.js.
import Auth from './auth.js';
import { updateNavActive } from './utils.js';

// ─── Route registry ───────────────────────────────────────────────────────────
// Each route: { load: () => Promise<module>, title, requiresAuth, _mod (cache) }
const routes = {};

function registerRoute(path, { load, title = 'Campus Wall', requiresAuth = true }) {
  routes[path] = { load, title, requiresAuth, _mod: null };
}

// ─── Page registrations (lazy dynamic imports) ────────────────────────────────

registerRoute('/feed', {
  title: 'Campus Feed — Campus Wall',
  load: () => import('./pages/feed.js'),
});

registerRoute('/anon', {
  title: 'Anonymous Feed — Campus Wall',
  load: () => import('./pages/anon.js'),
});

registerRoute('/dm', {
  title: 'Messages — Campus Wall',
  load: () => import('./pages/dm.js'),
});

registerRoute('/notifications', {
  title: 'Notifications — Campus Wall',
  load: () => import('./pages/notifications.js'),
});

registerRoute('/pyq', {
  title: 'Previous Year Questions — Campus Wall',
  load: () => import('./pages/pyq.js'),
});

registerRoute('/notices', {
  title: 'Notices — Campus Wall',
  load: () => import('./pages/notices.js'),
});

registerRoute('/timetable', {
  title: 'Timetable — Campus Wall',
  load: () => import('./pages/timetable.js'),
});

registerRoute('/lost-found', {
  title: 'Lost & Found — Campus Wall',
  load: () => import('./pages/lostfound.js'),
});

registerRoute('/notes', {
  title: 'Study Notes — Campus Wall',
  load: () => import('./pages/notes.js'),
});

registerRoute('/bookmarks', {
  title: 'Bookmarks — Campus Wall',
  load: () => import('./pages/bookmarks.js'),
});

registerRoute('/profile', {
  title: 'Profile — Campus Wall',
  load: () => import('./pages/profile.js'),
});

registerRoute('/admin', {
  title: 'Admin Panel — Campus Wall',
  load: () => import('./pages/admin.js'),
  requiresAuth: true,
});

// ─── Module loader (with per-route cache) ────────────────────────────────────
async function loadRoute(route) {
  if (!route._mod) {
    route._mod = await route.load();
  }
  return route._mod;
}

// ─── Router core ──────────────────────────────────────────────────────────────
// Tracks the currently mounted page module so we can call destroy() on navigation.
let _currentMod = null;

export const Router = {
  async init() {
    await this.navigate(window.location.hash || '#/feed');
    window.addEventListener('hashchange', async () => {
      await this.navigate(window.location.hash);
    });
  },

  async navigate(hash) {
    const rawPath = (hash || '#/feed').replace(/^#/, '') || '/feed';
    const path    = rawPath.split('?')[0];
    const content = document.getElementById('page-content');
    if (!content) return;

    const route = routes[path] || routes['/feed'];

    // Auth guard — all pages require an active (approved) session
    if (route.requiresAuth && !Auth.isActive()) {
      if (!Auth.isLoggedIn()) {
        window.location.href = '/auth.html';
        return;
      }
    }

    // Tear down previous page (disconnect observers, remove realtime channels, etc.)
    try { _currentMod?.destroy?.(); } catch (_) {}
    // Reset scroll-lock that may have been set by an open modal
    document.body.style.overflow = '';

    document.title = route.title;
    window.scrollTo(0, 0);
    updateNavActive(path);

    // Brief fade-out for feel
    content.style.opacity = '0';

    try {
      const mod  = await loadRoute(route);
      const html = await mod.render();
      content.innerHTML = html;

      if (typeof mod.init === 'function') {
        await mod.init();
      }
      _currentMod = mod; // save for teardown on next navigation
    } catch (err) {
      console.error('[Router] Render error:', err);
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>${err.message || 'Failed to load this page.'}</p>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='/feed'">Go to Feed</button>
        </div>
      `;
    }

    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.15s ease';
      content.style.opacity    = '1';
    });
  },
};

export default Router;
