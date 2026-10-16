'use strict';

// Campus Wall — Notices Route
// Admins create/edit/delete notices. All authenticated users can read.
// Notices have: title, body, category, is_important, pinned, expires_at.

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase-admin');

router.use(authGuard);

// Helper: normalize category to ensure Postgres check constraint compliance
function normalizeCategory(cat) {
  if (!cat) return 'general';
  const c = String(cat).toLowerCase().trim();
  if (['academic', 'exam', 'event', 'administrative', 'general'].includes(c)) return c;
  if (c === 'holiday') return 'administrative';
  if (c === 'admission') return 'academic';
  if (c === 'other') return 'general';
  return 'general';
}

function formatNotice(n) {
  if (!n) return n;
  return {
    id:           n.id,
    title:        n.title,
    body:         n.body,
    content:      n.body, // ensure frontend notice.content works seamlessly
    category:     n.category,
    is_important: !!n.is_important,
    pinned:       !!n.pinned,
    created_by:   n.created_by,
    poster_name:  n.poster?.full_name || 'Admin',
    expires_at:   n.expires_at,
    status:       n.status,
    created_at:   n.created_at,
    updated_at:   n.updated_at,
  };
}

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
      .select(`
        id, title, body, category, is_important, pinned, created_by, expires_at, status, created_at, updated_at,
        poster:profiles!created_by ( id, full_name, role )
      `, { count: 'exact' })
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned',      { ascending: false })
      .order('is_important', { ascending: false })
      .order('created_at',  { ascending: false })
      .range(offset, offset + pageSize - 1);

    const filterCat = category ? String(category).toLowerCase().trim() : '';
    if (filterCat && filterCat !== 'all') {
      if (filterCat === 'holiday') {
        query = query.or('category.eq.administrative,category.eq.general');
      } else if (filterCat === 'admission') {
        query = query.eq('category', 'academic');
      } else if (['academic', 'exam', 'event', 'administrative', 'general'].includes(filterCat)) {
        query = query.eq('category', filterCat);
      }
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('[notices GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const formatted = (data || []).map(formatNotice);

    res.json({
      data: formatted,
      total: count || 0,
      page: pageNum,
      limit: pageSize,
      has_more: offset + pageSize < (count || 0)
    });
  } catch (err) {
    console.error('[notices GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create notice (admin only) ──────────────────────────────────────

router.post('/', adminGuard, async (req, res) => {
  try {
    const { title, body, content, category, is_important, pinned, expires_at } = req.body;
    const noticeTitle = (title || '').trim();
    const noticeBody  = (body || content || '').trim();

    if (!noticeTitle || noticeTitle.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!noticeBody) {
      return res.status(400).json({ error: 'Notice content is required' });
    }

    const cleanCategory = normalizeCategory(category);

    const { data: row, error } = await supabaseAdmin
      .from('notices')
      .insert({
        title:        noticeTitle,
        body:         noticeBody,
        category:     cleanCategory,
        is_important: !!is_important,
        pinned:       !!pinned,
        expires_at:   expires_at || null,
        created_by:   req.profile.id,
        status:       'active',
      })
      .select(`
        id, title, body, category, is_important, pinned, created_by, expires_at, status, created_at, updated_at,
        poster:profiles!created_by ( id, full_name, role )
      `)
      .single();

    if (error) {
      console.error('[notices POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: formatNotice(row) });
  } catch (err) {
    console.error('[notices POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id — Update notice (admin only) ──────────────────────────────────

router.patch('/:id', adminGuard, async (req, res) => {
  try {
    const { title, body, content, category, is_important, pinned, expires_at, status } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (body !== undefined || content !== undefined) {
      const b = (body !== undefined ? body : content);
      updates.body = String(b).trim();
    }
    if (category !== undefined)     updates.category     = normalizeCategory(category);
    if (is_important !== undefined) updates.is_important = !!is_important;
    if (pinned !== undefined)       updates.pinned       = !!pinned;
    if (expires_at !== undefined)   updates.expires_at   = expires_at;
    if (status !== undefined)       updates.status       = status;
    updates.updated_at = new Date().toISOString();

    const { data: row, error } = await supabaseAdmin
      .from('notices')
      .update(updates)
      .eq('id', req.params.id)
      .select(`
        id, title, body, category, is_important, pinned, created_by, expires_at, status, created_at, updated_at,
        poster:profiles!created_by ( id, full_name, role )
      `)
      .single();

    if (error || !row) return res.status(404).json({ error: 'Notice not found' });
    res.json({ data: formatNotice(row) });
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
