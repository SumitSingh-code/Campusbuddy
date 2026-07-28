require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const frontendUrl = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

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
    ts: new Date().toISOString(),
    version: '1.0.0'
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
