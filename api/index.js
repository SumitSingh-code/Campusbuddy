require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// ── Catch any crash that would silently kill the Vercel function ──────────────
process.on('uncaughtException',  (err) => console.error('[FATAL] uncaughtException:',  err.stack || err.message));
process.on('unhandledRejection', (r)   => console.error('[FATAL] unhandledRejection:', r?.stack   || r));

// ── Startup diagnostics ───────────────────────────────────────────────────────
console.log('[Startup] Campus Wall API initializing...');
console.log('[Startup] SUPABASE_URL set:              ', !!process.env.SUPABASE_URL);
console.log('[Startup] SUPABASE_SERVICE_ROLE_KEY set: ', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('[Startup] SUPABASE_ANON_KEY set:         ', !!process.env.SUPABASE_ANON_KEY);
console.log('[Startup] FRONTEND_URL:                  ', process.env.FRONTEND_URL || '(not set)');
console.log('[Startup] Node.js version:               ', process.version);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Route mounting ────────────────────────────────────────────────────────────
// Each require() uses a LITERAL string path so Vercel's static bundler can
// detect and include those files. The previous safeMount(path, variable)
// pattern prevented static analysis from detecting the modules, so src/**
// was never bundled → MODULE_NOT_FOUND at runtime → "Route unavailable" 503.
// Each block has its own try-catch so one bad route never kills the others.

try {
  app.use('/api/auth', require('../src/routes/auth'));
  console.log('[Startup] OK: /api/auth');
} catch (e) {
  console.error('[Startup] FAILED /api/auth:', e.message);
  app.use('/api/auth', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'auth', detail: e.message }));
}

try {
  app.use('/api/admin', require('../src/routes/admin'));
  console.log('[Startup] OK: /api/admin');
} catch (e) {
  console.error('[Startup] FAILED /api/admin:', e.message);
  app.use('/api/admin', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'admin', detail: e.message }));
}

try {
  app.use('/api/feed', require('../src/routes/feed'));
  console.log('[Startup] OK: /api/feed');
} catch (e) {
  console.error('[Startup] FAILED /api/feed:', e.message);
  app.use('/api/feed', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'feed', detail: e.message }));
}

try {
  app.use('/api/anon', require('../src/routes/anon'));
  console.log('[Startup] OK: /api/anon');
} catch (e) {
  console.error('[Startup] FAILED /api/anon:', e.message);
  app.use('/api/anon', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'anon', detail: e.message }));
}

try {
  app.use('/api/contributors', require('../src/routes/contributors'));
  console.log('[Startup] OK: /api/contributors');
} catch (e) {
  console.error('[Startup] FAILED /api/contributors:', e.message);
  app.use('/api/contributors', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'contributors', detail: e.message }));
}

try {
  app.use('/api/dm', require('../src/routes/dm'));
  console.log('[Startup] OK: /api/dm');
} catch (e) {
  console.error('[Startup] FAILED /api/dm:', e.message);
  app.use('/api/dm', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'dm', detail: e.message }));
}

try {
  app.use('/api/notifications', require('../src/routes/notifications'));
  console.log('[Startup] OK: /api/notifications');
} catch (e) {
  console.error('[Startup] FAILED /api/notifications:', e.message);
  app.use('/api/notifications', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'notifications', detail: e.message }));
}

try {
  app.use('/api/profile', require('../src/routes/profile'));
  console.log('[Startup] OK: /api/profile');
} catch (e) {
  console.error('[Startup] FAILED /api/profile:', e.message);
  app.use('/api/profile', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'profile', detail: e.message }));
}

try {
  app.use('/api/bookmarks', require('../src/routes/bookmarks'));
  console.log('[Startup] OK: /api/bookmarks');
} catch (e) {
  console.error('[Startup] FAILED /api/bookmarks:', e.message);
  app.use('/api/bookmarks', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'bookmarks', detail: e.message }));
}

try {
  app.use('/api/reports', require('../src/routes/reports'));
  console.log('[Startup] OK: /api/reports');
} catch (e) {
  console.error('[Startup] FAILED /api/reports:', e.message);
  app.use('/api/reports', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'reports', detail: e.message }));
}

try {
  app.use('/api/pyq', require('../src/routes/pyq'));
  console.log('[Startup] OK: /api/pyq');
} catch (e) {
  console.error('[Startup] FAILED /api/pyq:', e.message);
  app.use('/api/pyq', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'pyq', detail: e.message }));
}

try {
  app.use('/api/notices', require('../src/routes/notices'));
  console.log('[Startup] OK: /api/notices');
} catch (e) {
  console.error('[Startup] FAILED /api/notices:', e.message);
  app.use('/api/notices', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'notices', detail: e.message }));
}

try {
  app.use('/api/timetable', require('../src/routes/timetable'));
  console.log('[Startup] OK: /api/timetable');
} catch (e) {
  console.error('[Startup] FAILED /api/timetable:', e.message);
  app.use('/api/timetable', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'timetable', detail: e.message }));
}

try {
  app.use('/api/lostfound', require('../src/routes/lostfound'));
  console.log('[Startup] OK: /api/lostfound');
} catch (e) {
  console.error('[Startup] FAILED /api/lostfound:', e.message);
  app.use('/api/lostfound', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'lostfound', detail: e.message }));
}

try {
  app.use('/api/notes', require('../src/routes/notes'));
  console.log('[Startup] OK: /api/notes');
} catch (e) {
  console.error('[Startup] FAILED /api/notes:', e.message);
  app.use('/api/notes', (req, res) => res.status(503).json({ error: 'Route unavailable', route: 'notes', detail: e.message }));
}

console.log('[Startup] All route mounts attempted.');

// ── Public: App config (cover photo URL, etc.) ───────────────────────────────
// No auth required. Cached 60s on CDN. Called by profile page on load.
app.get('/api/config', async (req, res) => {
  try {
    const { supabaseAdmin } = require('../src/lib/supabase');
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value');
    if (error) return res.status(500).json({ error: 'DB error' });
    const config = {};
    (data || []).forEach(r => { config[r.key] = r.value; });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ data: config });
  } catch (err) {
    console.error('[/api/config]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Utility endpoints ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), version: '1.0.0' });
});

app.get('/api/debug', (req, res) => {
  res.json({
    status: 'ok',
    ts:      new Date().toISOString(),
    env: {
      SUPABASE_URL_set:              !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY_set:         !!process.env.SUPABASE_ANON_KEY,
      FRONTEND_URL:                  process.env.FRONTEND_URL || null,
      NODE_ENV:                      process.env.NODE_ENV    || null,
    },
  });
});

// ── Fallback / error handlers ─────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('[Error] Global handler:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
