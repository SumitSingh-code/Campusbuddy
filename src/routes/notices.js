'use strict';

// Campus Wall — Notices Route
// Admins create/edit/delete notices. All authenticated users can read.
// Notices have: title, body, category, is_important, pinned, expires_at.

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase');

router.use(authGuard);

// ─── GET / — List active notices ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { category = '', page = 1, limit = 30 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;
    const now      = new Date().toISOString();

    let query = supabaseAdmin
      .from('notices')
      .select('id, title, body, category, is_important, pinned, created_by, expires_at, created_at, updated_at', { count: 'exact' })
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned',      { ascending: false })
      .order('is_important', { ascending: false })
      .order('created_at',  { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category) query = query.eq('category', category);

    const { data, count, error } = await query;
    if (error) {
      console.error('[notices GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data: data || [], total: count || 0, page: pageNum, limit: pageSize, has_more: offset + pageSize < (count || 0) });
  } catch (err) {
    console.error('[notices GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create notice (admin only) ──────────────────────────────────────

router.post('/', adminGuard, async (req, res) => {
  try {
    const { title, body, category, is_important, pinned, expires_at } = req.body;
    if (!title?.trim() || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!body?.trim()) return res.status(400).json({ error: 'Body is required' });

    const validCategories = ['academic', 'exam', 'event', 'administrative', 'general'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
    }

    const { data: row, error } = await supabaseAdmin
      .from('notices')
      .insert({
        title:        title.trim(),
        body:         body.trim(),
        category:     category || 'general',
        is_important: !!is_important,
        pinned:       !!pinned,
        expires_at:   expires_at || null,
        created_by:   req.profile.id,
        status:       'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[notices POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: row });
  } catch (err) {
    console.error('[notices POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id — Update notice (admin only) ──────────────────────────────────

router.patch('/:id', adminGuard, async (req, res) => {
  try {
    const { title, body, category, is_important, pinned, expires_at, status } = req.body;
    const updates = {};
    if (title !== undefined)        updates.title        = title.trim();
    if (body !== undefined)         updates.body         = body.trim();
    if (category !== undefined)     updates.category     = category;
    if (is_important !== undefined) updates.is_important = !!is_important;
    if (pinned !== undefined)       updates.pinned       = !!pinned;
    if (expires_at !== undefined)   updates.expires_at   = expires_at;
    if (status !== undefined)       updates.status       = status;
    updates.updated_at = new Date().toISOString();

    const { data: row, error } = await supabaseAdmin
      .from('notices')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !row) return res.status(404).json({ error: 'Notice not found' });
    res.json({ data: row });
  } catch (err) {
    console.error('[notices PATCH /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Archive notice (admin only) ────────────────────────────────

router.delete('/:id', adminGuard, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notices')
      .update({ status: 'archived' })
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  } catch (err) {
    console.error('[notices DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
