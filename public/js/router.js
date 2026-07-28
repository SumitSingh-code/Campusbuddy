// Campus Wall — Client-Side SPA Router
// Hash-based routing: #/feed, #/anon, #/dm, etc.
import Auth from './auth.js';
import { updateNavActive, showToast } from './utils.js';

// ─── Route definitions ───────────────────────────────────────────────────────
// Each route: { render: async () => htmlString, init?: async () => void, title, requiresAuth }
const routes = {};

function registerRoute(path, { render, init = null, title = 'Campus Wall', requiresAuth = true }) {
  routes[path] = { render, init, title, requiresAuth };
}

// ─── Page registrations ──────────────────────────────────────────────────────
// Feed: real implementation (Phase 2)
import * as FeedPage from './pages/feed.js';
registerRoute('/feed', {
  title: 'Campus Feed — Campus Wall',
  render: FeedPage.render,
  init:   FeedPage.init,
});

// Anon Feed: real implementation (Phase 3)
import * as AnonPage from './pages/anon.js';
registerRoute('/anon', {
  title: 'Anonymous Feed — Campus Wall',
  render: AnonPage.render,
  init:   AnonPage.init,
});
// DM: real implementation (Phase 4)
import * as DmPage from './pages/dm.js';
registerRoute('/dm', {
  title: 'Messages — Campus Wall',
  render: DmPage.render,
  init:   DmPage.init,
});

// Notifications: real implementation (Phase 4)
import * as NotifsPage from './pages/notifications.js';
registerRoute('/notifications', {
  title: 'Notifications — Campus Wall',
  render: NotifsPage.render,
  init:   NotifsPage.init,
});
// Profile: real implementation (Phase 7) — see import below
// PYQ: real implementation (Phase 6)
import * as PYQPage from './pages/pyq.js';
registerRoute('/pyq', {
  title: 'Previous Year Questions — Campus Wall',
  render: PYQPage.render,
  init:   PYQPage.init,
});

// Notices: real implementation (Phase 6)
import * as NoticesPage from './pages/notices.js';
registerRoute('/notices', {
  title: 'Notices — Campus Wall',
  render: NoticesPage.render,
  init:   NoticesPage.init,
});

// Timetable: real implementation (Phase 6)
import * as TimetablePage from './pages/timetable.js';
registerRoute('/timetable', {
  title: 'Timetable — Campus Wall',
  render: TimetablePage.render,
  init:   TimetablePage.init,
});

// Lost & Found: real implementation (Phase 6)
import * as LostFoundPage from './pages/lostfound.js';
registerRoute('/lost-found', {
  title: 'Lost & Found — Campus Wall',
  render: LostFoundPage.render,
  init:   LostFoundPage.init,
});

// Notes: real implementation (Phase 6)
import * as NotesPage from './pages/notes.js';
registerRoute('/notes', {
  title: 'Study Notes — Campus Wall',
  render: NotesPage.render,
  init:   NotesPage.init,
});
// Bookmarks: real implementation (Phase 7)
import * as BookmarksPage from './pages/bookmarks.js';
registerRoute('/bookmarks', {
  title: 'Bookmarks — Campus Wall',
  render: BookmarksPage.render,
  init:   BookmarksPage.init,
});

// Profile: real implementation (Phase 7)
import * as ProfilePage from './pages/profile.js';
registerRoute('/profile', {
  title: 'Profile — Campus Wall',
  render: ProfilePage.render,
  init:   ProfilePage.init,
});

// Admin Panel: real implementation (Phase 5)
import * as AdminPage from './pages/admin.js';
registerRoute('/admin', {
  title: 'Admin Panel — Campus Wall',
  render: AdminPage.render,
  init:   AdminPage.init,
  requiresAuth: true,
});

// ─── Router core ─────────────────────────────────────────────────────────────
export const Router = {
  async init() {
    // Handle initial route
    await this.navigate(window.location.hash || '#/feed');

    // Handle hash changes
    window.addEventListener('hashchange', async () => {
      await this.navigate(window.location.hash);
    });
  },

  async navigate(hash) {
    const rawPath = (hash || '#/feed').replace(/^#/, '') || '/feed';
    // Strip query params for route lookup; pages read window.location.hash for ?id= params
    const path = rawPath.split('?')[0];
    const content = document.getElementById('page-content');
    if (!content) return;

    const route = routes[path] || routes['/feed'];

    // Auth guard
    if (route.requiresAuth && !Auth.isActive()) {
      // If logged in but pending → stays on pending screen (handled in index.html init)
      // If not logged in → redirect to auth
      if (!Auth.isLoggedIn()) {
        window.location.href = '/auth.html';
        return;
      }
    }

    // Update document title
    document.title = route.title;

    // Scroll to top
    window.scrollTo(0, 0);

    // Update nav highlight
    updateNavActive(path);

    // Show loading state briefly for feel
    content.style.opacity = '0';

    try {
      const html = await route.render();
      content.innerHTML = html;

      // Call page init if provided (after HTML is in DOM)
      if (typeof route.init === 'function') {
        await route.init();
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

    // Fade in
    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.15s ease';
      content.style.opacity = '1';
    });
  },
};

export default Router;

// ─── Stub page renderers ──────────────────────────────────────────────────────

function renderStubPage(title, icon, message, emoji) {
  return `
    <div class="page-header">
      <h1>${title}</h1>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">${emoji}</div>
      <h3>${title}</h3>
      <p class="text-muted">${message}</p>
      <p class="text-subtle" style="margin-top:.5rem;font-size:.75rem;">Phase 2 complete — Feed is live ✓</p>
    </div>
  `;
}

function renderProfileStub() {
  const p = Auth.getProfile();
  const u = Auth.getUser();
  if (!p) return renderStubPage('Profile', 'user', 'Profile page coming in Phase 7!', '👤');

  return `
    <div class="page-header">
      <h1>My Profile</h1>
    </div>
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-body" style="text-align:center;padding-block:2rem;">
        <div class="avatar avatar--xl" style="margin:0 auto 1rem;">${(p.full_name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
        <h2 style="margin-bottom:.25rem;">${p.full_name}</h2>
        <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:.5rem;">
          <span class="dept-pill dept-pill--0">${p.department}</span>
          ${p.semester ? `<span class="badge badge--muted">Sem ${p.semester}</span>` : ''}
        </div>
        <p class="text-muted" style="font-size:.875rem;">${p.roll_number} · ${p.university_name}</p>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem;">
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;text-align:center;">
          <div>
            <div class="stat-card__value">${p.karma}</div>
            <div class="stat-card__label">Karma</div>
          </div>
          <div>
            <div class="stat-card__value">${p.posts_count}</div>
            <div class="stat-card__label">Posts</div>
          </div>
          <div>
            <div class="stat-card__value">${p.notes_uploaded}</div>
            <div class="stat-card__label">Notes</div>
          </div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:2rem;">
      <button class="btn btn-secondary" id="btn-signout">Sign Out</button>
    </div>
    <script>
      document.getElementById('btn-signout')?.addEventListener('click', () => {
        import('/js/auth.js').then(m => m.default.signOut());
      });
    </script>
  `;
}
