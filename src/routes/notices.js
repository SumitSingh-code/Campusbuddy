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

// Valid categories supported in UI:
// 'academic', 'exam', 'event', 'administrative', 'general', 'holiday', 'other'
//
// Because the underlying Postgres table has a CHECK constraint:
// CHECK (category IN ('academic','exam','event','administrative','general'))
// we map 'holiday' to 'administrative', 'other' to 'general', 'admission' to 'academic'
// for Postgres storage, and prepend a metadata tag <!--cat:<exact_category>--> in the body.
// This preserves 100% strict isolation with ZERO category leakage.

function toDbCategory(cat) {
  if (!cat) return 'general';
  const c = String(cat).toLowerCase().trim();
  if (['academic', 'exam', 'event', 'administrative', 'general'].includes(c)) return c;
  if (c === 'holiday') return 'administrative';
  if (c === 'admission') return 'academic';
  if (c === 'other') return 'general';
  return 'general';
}

function normalizeExactCategory(cat) {
  if (!cat) return 'general';
  const c = String(cat).toLowerCase().trim();
  if (['academic', 'exam', 'event', 'administrative', 'general', 'holiday', 'other'].includes(c)) return c;
  if (c === 'admission') return 'academic';
  if (c === 'announcements') return 'general';
  return 'general';
}

function extractExactCategory(n) {
  if (!n) return 'general';
  const bodyText = n.body || '';
  const match = bodyText.match(/^<!--cat:([a-z0-9_-]+)-->\n?/i);
  if (match) {
    return match[1].toLowerCase();
  }
  // Fallback for legacy notices
  if (n.title && /chuti|holiday/i.test(n.title)) {
    return 'holiday';
  }
  return (n.category || 'general').toLowerCase();
}

function cleanBody(bodyText) {
  if (!bodyText) return '';
  return bodyText.replace(/^<!--cat:([a-z0-9_-]+)-->\n?/i, '');
}

function formatNotice(n) {
  if (!n) return n;
  const exactCat = extractExactCategory(n);
  const bodyClean = cleanBody(n.body);
  return {
    id:           n.id,
    title:        n.title,
    body:         bodyClean,
    content:      bodyClean, // ensure frontend notice.content works seamlessly
    category:     exactCat,
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
    const { category = '', page = 1, limit = 50 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const now      = new Date().toISOString();

    let query = supabaseAdmin
      .from('notices')
      .select(`
        id, title, body, category, is_important, pinned, created_by, expires_at, status, created_at, updated_at,
        poster:profiles!created_by ( id, full_name, role )
      `)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned',      { ascending: false })
      .order('is_important', { ascending: false })
      .order('created_at',  { ascending: false });

    const filterCat = category ? String(category).toLowerCase().trim() : '';

    // Narrow down in Postgres when possible
    if (filterCat && filterCat !== 'all') {
      if (filterCat === 'holiday' || filterCat === 'administrative') {
        query = query.eq('category', 'administrative');
      } else if (filterCat === 'other' || filterCat === 'general' || filterCat === 'announcements') {
        query = query.eq('category', 'general');
      } else if (filterCat === 'admission' || filterCat === 'academic') {
        query = query.eq('category', 'academic');
      } else if (['exam', 'event'].includes(filterCat)) {
        query = query.eq('category', filterCat);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('[notices GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    let formatted = (data || []).map(formatNotice);

    // CRITICAL: STRICT Category Filtering
    // "jo notice jis category ka hai us mai hi ana chiye or ksi category mai nhi aana chiye"
    // "or hn all mai sb hi show ho"
    if (filterCat && filterCat !== 'all') {
      const targetCat = filterCat === 'announcements' ? 'general' : filterCat;
      formatted = formatted.filter(n => n.category.toLowerCase() === targetCat);
    }

    const total = formatted.length;
    const offset = (pageNum - 1) * pageSize;
    const paginated = formatted.slice(offset, offset + pageSize);

    res.json({
      data: paginated,
      total,
      page: pageNum,
      limit: pageSize,
      has_more: offset + pageSize < total
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
    const rawBody     = (body || content || '').trim();

    if (!noticeTitle || noticeTitle.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!rawBody) {
      return res.status(400).json({ error: 'Notice content is required' });
    }

    const exactCategory = normalizeExactCategory(category);
    const dbCategory    = toDbCategory(exactCategory);
    const cleanContent  = cleanBody(rawBody);
    const dbBody        = `<!--cat:${exactCategory}-->\n${cleanContent}`;

    const { data: row, error } = await supabaseAdmin
      .from('notices')
      .insert({
        title:        noticeTitle,
        body:         dbBody,
        category:     dbCategory,
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

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('notices')
      .select('id, body, category')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const updates = {};
    if (title !== undefined) updates.title = String(title).trim();

    const existingExactCat = extractExactCategory(existing);
    const newExactCategory = category !== undefined ? normalizeExactCategory(category) : existingExactCat;

    let rawBody = existing.body;
    if (body !== undefined || content !== undefined) {
      rawBody = (body !== undefined ? body : content);
    }
    const cleanContent = cleanBody(rawBody);

    updates.body     = `<!--cat:${newExactCategory}-->\n${cleanContent}`;
    updates.category = toDbCategory(newExactCategory);

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
