'use strict';

// Campus Wall — Notifications Route

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(authGuard);

// ─── GET / — Paginated notifications (newest first) ──────────────────────────

router.get('/', async (req, res) => {
  try {
    const uid    = req.profile.id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const before = req.query.before || new Date().toISOString();

    const { data: notifs, error } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, body, ref_id, ref_type, is_read, created_at')
      .eq('user_id', uid)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[notifications GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = notifs.length > limit;
    const slice       = has_more ? notifs.slice(0, limit) : notifs;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    res.json({ data: slice, next_cursor, has_more });
  } catch (err) {
    console.error('[notifications GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /unread-count — Just the unread count (for nav badge) ────────────────

router.get('/unread-count', async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.profile.id)
      .eq('is_read', false);

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ count: count || 0 });
  } catch (err) {
    console.error('[notifications GET /unread-count]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/read — Mark one notification as read ─────────────────────────

router.patch('/:id/read', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.profile.id); // ensures ownership

    if (error) {
      console.error('[notifications PATCH /:id/read]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications PATCH /:id/read]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /read-all — Mark all notifications as read ────────────────────────

router.patch('/read-all', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.profile.id)
      .eq('is_read', false);

    if (error) {
      console.error('[notifications PATCH /read-all]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications PATCH /read-all]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Delete a notification ─────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.profile.id);

    if (error) {
      console.error('[notifications DELETE /:id]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
