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

// Mount all routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Stubs
app.use('/api/feed', require('./routes/feed'));
app.use('/api/anon', require('./routes/anon'));
app.use('/api/dm', require('./routes/dm'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/pyq', require('./routes/pyq'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/notes', require('./routes/notes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    version: '1.0.0-phase1'
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
