require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// ── Startup diagnostics (visible in Vercel Function logs on cold start) ────────
console.log('[Startup] Campus Wall API initializing...');
console.log('[Startup] SUPABASE_URL set:              ', !!process.env.SUPABASE_URL);
console.log('[Startup] SUPABASE_SERVICE_ROLE_KEY set: ', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('[Startup] SUPABASE_ANON_KEY set:         ', !!process.env.SUPABASE_ANON_KEY);
console.log('[Startup] FRONTEND_URL:                  ', process.env.FRONTEND_URL || '(not set — defaulting to reflect origin)');
console.log('[Startup] NODE_ENV:                      ', process.env.NODE_ENV || 'not set');

const app = express();

// Reflect origin (safer than * with credentials, works for same-origin Vercel deploys)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Mount all routes (files live in src/routes/ — outside api/ so Vercel
// treats only api/index.js as a serverless function, not each route file)
app.use('/api/auth',          require('../src/routes/auth'));
app.use('/api/admin',         require('../src/routes/admin'));
app.use('/api/feed',          require('../src/routes/feed'));
app.use('/api/anon',          require('../src/routes/anon'));
app.use('/api/dm',            require('../src/routes/dm'));
app.use('/api/notifications', require('../src/routes/notifications'));
app.use('/api/profile',       require('../src/routes/profile'));
app.use('/api/bookmarks',     require('../src/routes/bookmarks'));
app.use('/api/reports',       require('../src/routes/reports'));
app.use('/api/pyq',           require('../src/routes/pyq'));
app.use('/api/notices',       require('../src/routes/notices'));
app.use('/api/timetable',     require('../src/routes/timetable'));
app.use('/api/lostfound',     require('../src/routes/lostfound'));
app.use('/api/notes',         require('../src/routes/notes'));

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
