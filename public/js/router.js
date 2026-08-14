// Unigram — Client-Side SPA Router
// Hash-based routing: #/feed, #/anon, #/dm, etc.
// All page modules are loaded lazily (dynamic import) on first visit and cached —
// reduces initial JS payload from ~203KB to just this file + auth.js + utils.js.
import Auth from './auth.js';
import { updateNavActive } from './utils.js';

// ─── Route registry ───────────────────────────────────────────────────────────
// Each route: { load: () => Promise<module>, title, requiresAuth, _mod (cache) }
const routes = {};

function registerRoute(path, { load, title = 'Unigram', requiresAuth = true }) {
  routes[path] = { load, title, requiresAuth, _mod: null };
}

// ─── Page registrations (lazy dynamic imports) ────────────────────────────────

registerRoute('/feed', {
  title: 'Campus Feed — Unigram',
  load: () => import('./pages/feed.js'),
});

registerRoute('/anon', {
  title: 'Anonymous Feed — Unigram',
  load: () => import('./pages/anon.js'),
});

registerRoute('/dm', {
  title: 'Messages — Unigram',
  load: () => import('./pages/dm.js'),
});

// HIDDEN: notifications route temporarily disabled — re-enable by uncommenting
// registerRoute('/notifications', {
//   title: 'Notifications — Unigram',
//   load: () => import('./pages/notifications.js'),
// });


registerRoute('/pyq', {
  title: 'Previous Year Questions — Unigram',
  load: () => import('./pages/pyq.js'),
});

registerRoute('/notices', {
  title: 'Notices — Unigram',
  load: () => import('./pages/notices.js'),
});

registerRoute('/timetable', {
  title: 'Timetable — Unigram',
  load: () => import('./pages/timetable.js'),
});

registerRoute('/lost-found', {
  title: 'Lost & Found — Unigram',
  load: () => import('./pages/lostfound.js'),
});

registerRoute('/notes', {
  title: 'Study Notes — Unigram',
  load: () => import('./pages/notes.js'),
});

registerRoute('/bookmarks', {
  title: 'Bookmarks — Unigram',
  load: () => import('./pages/bookmarks.js'),
});

registerRoute('/profile', {
  title: 'Profile — Unigram',
  load: () => import('./pages/profile.js'),
});

registerRoute('/settings', {
  title: 'Settings — Unigram',
  load: () => import('./pages/settings.js'),
});

registerRoute('/about', {
  title: 'About — Unigram',
  load: () => import('./pages/about.js'),
});

registerRoute('/privacy', {
  title: 'Privacy Policy — Unigram',
  load: () => import('./pages/privacy.js'),
});

registerRoute('/terms', {
  title: 'Terms & Conditions — Unigram',
  load: () => import('./pages/terms.js'),
});

registerRoute('/contact', {
  title: 'Contact Us — Unigram',
  load: () => import('./pages/contact.js'),
});

registerRoute('/admin', {
  title: 'Admin Panel — Unigram',
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

// ─── HTML cache (stale-while-revalidate) ─────────────────────────────────────
// Keyed by route path → { html: string, time: number }
const _htmlCache     = new Map();
const CACHE_TTL      = 5 * 60 * 1000; // 5 minutes
const NO_CACHE_ROUTES = new Set(['/settings', '/admin']);

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
    updateNavActive(path);

    // ── Cache look-up ────────────────────────────────────────────────────────
    const cached  = _htmlCache.get(path);
    const cacheHit = !NO_CACHE_ROUTES.has(path)
                  && cached !== undefined
                  && (Date.now() - cached.time) < CACHE_TTL;

    if (cacheHit) {
      // ── CACHE HIT: paint instantly, revalidate in the background ──────────
      content.style.transition = '';
      content.style.opacity    = '1';
      content.innerHTML        = cached.html;

      try {
        const mod = await loadRoute(route);
        if (typeof mod.init === 'function') {
          await mod.init(); // re-fetches fresh data, updates DOM in-place
        }
        // Refresh cache with post-init HTML so next visit gets updated markup
        _htmlCache.set(path, { html: content.innerHTML, time: Date.now() });
        _currentMod = mod;
      } catch (err) {
        console.error('[Router] Revalidation error:', err);
      }
    } else {
      // ── CACHE MISS: existing behavior — skeleton → init → cache ───────────
      window.scrollTo(0, 0);

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

        // Store post-init HTML for the next visit (skip no-cache routes)
        if (!NO_CACHE_ROUTES.has(path)) {
          _htmlCache.set(path, { html: content.innerHTML, time: Date.now() });
        }
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
    }
  },
};

export default Router;
