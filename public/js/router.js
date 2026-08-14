// Unigram — Client-Side SPA Router
// Hash-based routing: #/feed, #/anon, #/dm, etc.
//
// PERFORMANCE FEATURES:
// 1. Lazy module loading — JS bundles downloaded on first visit and cached
// 2. Stale-while-revalidate HTML cache — return visits show cached content
//    instantly while fresh data loads in background
// 3. Navigation generation counter — prevents race condition where an
//    in-flight init() from a previous route corrupts the current page's DOM
//    or poisons the HTML cache with the wrong page's content
// 4. Module pre-warm — after initial page loads, silently download all page
//    module bundles in background so every subsequent navigation is instant

import Auth from './auth.js';
import { updateNavActive } from './utils.js';

// ─── Route registry ────────────────────────────────────────────────────────────
// Each route: { load: () => Promise<module>, title, requiresAuth, _mod (cache) }
const routes = {};

function registerRoute(path, { load, title = 'Unigram', requiresAuth = true }) {
  routes[path] = { load, title, requiresAuth, _mod: null };
}

// ─── Page registrations (lazy dynamic imports) ─────────────────────────────────

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

// ─── Module loader (with per-route JS module cache) ────────────────────────────
async function loadRoute(route) {
  if (!route._mod) {
    route._mod = await route.load();
  }
  return route._mod;
}

// ─── HTML cache (stale-while-revalidate) ───────────────────────────────────────
// Keyed by route path → { html: string, time: number }
// Entries expire after CACHE_TTL ms. /settings and /admin always bypass.
const _htmlCache      = new Map();
const CACHE_TTL       = 5 * 60 * 1000; // 5 minutes
const NO_CACHE_ROUTES = new Set(['/settings', '/admin']);

// ─── Navigation generation counter ─────────────────────────────────────────────
// Incremented on every navigate() call. Each navigation captures its own
// generation number (myGen). Before writing to cache or setting _currentMod,
// the navigation checks if _navGen still equals myGen. If not, a newer
// navigation started during the async init() — we abort to avoid:
//   1. Poisoning the cache with the new page's HTML under the old page's key
//   2. Setting _currentMod to a stale module whose destroy() was already called
let _navGen    = 0;
let _currentMod = null;

// ─── Module pre-warmer ─────────────────────────────────────────────────────────
// After the initial page fully renders, silently download all other page module
// bundles. This makes subsequent navigations instant (no JS download needed).
// Uses requestIdleCallback so it runs only when the browser is idle.
function _prewarmModules(currentPath) {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(() => {
    // Warm all routes except the one already loaded
    const order = ['/feed', '/anon', '/dm', '/profile', '/pyq', '/notices',
                   '/timetable', '/lost-found', '/notes', '/bookmarks', '/settings'];
    let i = 0;
    function next() {
      if (i >= order.length) return;
      const path = order[i++];
      if (path === currentPath) { next(); return; } // already loaded
      const route = routes[path];
      if (!route || route._mod) { next(); return; } // already cached
      idle(() => {
        route.load()
          .then(mod => { route._mod = mod; })
          .catch(() => {}) // silent fail — pre-warm is best-effort
          .finally(next);
      });
    }
    next();
  });
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const Router = {
  async init() {
    await this.navigate(window.location.hash || '#/feed');
    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash);
    });
  },

  async navigate(hash) {
    // ── Step 1: resolve path ───────────────────────────────────────────────────
    const rawPath = (hash || '#/feed').replace(/^#/, '') || '/feed';
    const path    = rawPath.split('?')[0];
    const content = document.getElementById('page-content');
    if (!content) return;

    const route = routes[path] || routes['/feed'];

    // ── Step 2: auth guard ─────────────────────────────────────────────────────
    if (route.requiresAuth && !Auth.isActive()) {
      if (!Auth.isLoggedIn()) {
        window.location.href = '/auth.html';
        return;
      }
    }

    // ── Step 3: capture navigation generation BEFORE any async work ────────────
    // If the user navigates again during our async operations, _navGen will have
    // incremented. Checking myGen === _navGen at key points lets us abort safely.
    const myGen = ++_navGen;

    // ── Step 4: teardown previous page ────────────────────────────────────────
    try { _currentMod?.destroy?.(); } catch (_) {}
    document.body.style.overflow = '';
    document.title    = route.title;
    updateNavActive(path);

    // ── Step 5: cache lookup ───────────────────────────────────────────────────
    const cached   = _htmlCache.get(path);
    const cacheHit = !NO_CACHE_ROUTES.has(path)
                  && cached !== undefined
                  && (Date.now() - cached.time) < CACHE_TTL;

    if (cacheHit) {
      // ── CACHE HIT ─────────────────────────────────────────────────────────────
      // Paint cached HTML instantly — no skeleton flash, no opacity transition.
      content.style.transition = '';
      content.style.opacity    = '1';
      content.innerHTML        = cached.html;

      // Revalidate in background: load module then run init() to refresh data.
      try {
        const mod = await loadRoute(route);

        // Abort check: did user navigate away while we were awaiting loadRoute?
        if (_navGen !== myGen) return;

        _currentMod = mod; // set before init so destroy() works if user leaves

        if (typeof mod.init === 'function') {
          await mod.init(); // updates DOM in-place as fresh data arrives
        }

        // ── CRITICAL: check generation before cache write ──────────────────────
        // If the user navigated away during init(), content.innerHTML now
        // belongs to the NEW page. Writing it here would poison the cache:
        // next visit to this path would show the WRONG page's content.
        if (_navGen !== myGen) return; // abort — do NOT write stale content

        _htmlCache.set(path, { html: content.innerHTML, time: Date.now() });
      } catch (err) {
        console.error('[Router] Revalidation error:', err);
        // Cache hit rendered fine — revalidation failure is non-fatal.
        // User sees stale data until next navigation or TTL expiry.
      }

    } else {
      // ── CACHE MISS ────────────────────────────────────────────────────────────
      window.scrollTo(0, 0);
      content.style.opacity = '0'; // brief fade-out

      try {
        const mod = await loadRoute(route);

        // Abort check after async module load
        if (_navGen !== myGen) return;

        const html = mod.render();
        content.innerHTML = html;

        _currentMod = mod; // set before init so destroy() works if user leaves

        if (typeof mod.init === 'function') {
          await mod.init();
        }

        // ── CRITICAL: check generation before cache write ──────────────────────
        if (_navGen !== myGen) return; // user left during init — don't cache stale

        // Store post-init HTML for instant rendering next visit
        if (!NO_CACHE_ROUTES.has(path)) {
          _htmlCache.set(path, { html: content.innerHTML, time: Date.now() });
        }
      } catch (err) {
        console.error('[Router] Render error:', err);
        if (_navGen !== myGen) return; // navigation changed — skip error UI
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

      // ── Pre-warm all other page modules after first load ─────────────────────
      // Only runs once (on first navigation). Subsequent navigations skip because
      // modules are already cached (route._mod is set).
      _prewarmModules(path);
    }
  },
};

export default Router;
