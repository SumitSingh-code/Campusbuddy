require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// ── Catch any unhandled crash that would otherwise silently kill the function ──
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason?.stack || reason);
});

// ── Startup diagnostics (visible in Vercel Function logs on cold start) ────────
console.log('[Startup] Campus Wall API initializing...');
console.log('[Startup] SUPABASE_URL set:              ', !!process.env.SUPABASE_URL);
console.log('[Startup] SUPABASE_SERVICE_ROLE_KEY set: ', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('[Startup] SUPABASE_ANON_KEY set:         ', !!process.env.SUPABASE_ANON_KEY);
console.log('[Startup] FRONTEND_URL:                  ', process.env.FRONTEND_URL || '(not set — defaulting to reflect origin)');
console.log('[Startup] NODE_ENV:                      ', process.env.NODE_ENV || 'not set');
console.log('[Startup] Node.js version:               ', process.version);

const app = express();

// Reflect origin (safer than * with credentials, works for same-origin Vercel deploys)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Safe route mount ──────────────────────────────────────────────────────────
// If any single route file throws on require(), this prevents it from
// crashing the entire Express app — that route returns 503, all others work.
function safeMount(routePath, modulePath) {
  try {
    app.use(routePath, require(modulePath));
    console.log('[Startup] OK:', routePath);
  } catch (err) {
    console.error('[Startup] FAILED to load', routePath, '->', err.message);
    app.use(routePath, (req, res) =>
      res.status(503).json({ error: 'Route unavailable', detail: err.message })
    );
  }
}

safeMount('/api/auth',          '../src/routes/auth');
safeMount('/api/admin',         '../src/routes/admin');
safeMount('/api/feed',          '../src/routes/feed');
safeMount('/api/anon',          '../src/routes/anon');
safeMount('/api/dm',            '../src/routes/dm');
safeMount('/api/notifications', '../src/routes/notifications');
safeMount('/api/profile',       '../src/routes/profile');
safeMount('/api/bookmarks',     '../src/routes/bookmarks');
safeMount('/api/reports',       '../src/routes/reports');
safeMount('/api/pyq',           '../src/routes/pyq');
safeMount('/api/notices',       '../src/routes/notices');
safeMount('/api/timetable',     '../src/routes/timetable');
safeMount('/api/lostfound',     '../src/routes/lostfound');
safeMount('/api/notes',         '../src/routes/notes');

console.log('[Startup] All route mounts attempted.');


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ts:      new Date().toISOString(),
    version: '1.0.0'
  });
});

// ── Debug endpoint: shows which env vars are set (values never exposed) ────────
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


app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
