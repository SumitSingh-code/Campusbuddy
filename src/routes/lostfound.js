'use strict';

// Campus Wall — Lost & Found Route
// Students post lost/found items. Owner or admin can close/delete.
// Optional image upload via Supabase Storage.

const express = require('express');
const router  = express.Router();
const { authGuard }         = require('../middleware/authGuard');
const { adminGuard }        = require('../middleware/adminGuard');
const { supabaseAdmin }     = require('../lib/supabase-admin');
const { containsProfanity } = require('../lib/profanity');

router.use(authGuard);

function formatLostItem(item) {
  if (!item) return item;
  return {
    id:            item.id,
    type:          item.type,
    title:         item.title,
    description:   item.description,
    location:      item.location,
    image_url:     item.image_url,
    contact_info:  item.contact_info,
    status:        item.status,
    is_resolved:   item.status === 'closed',
    posted_by:     item.poster_id || item.poster?.id,
    poster_name:   item.poster?.full_name || 'Anonymous',
    poster_avatar: item.poster?.avatar_url || null,
    created_at:    item.created_at,
  };
}

// ─── GET / — List items ───────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      type   = '',     // 'all' | 'lost' | 'found'
      page   = 1,
      limit  = 50,
      before,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let query = supabaseAdmin
      .from('lost_found')
      .select(`
        id, type, title, description, location, image_url,
        contact_info, status, poster_id, created_at,
        poster:profiles!poster_id ( id, full_name, department, avatar_url )
      `, { count: 'exact' })
      .in('status', ['open', 'closed'])
      .order('created_at', { ascending: false });

    if (before) {
      query = query.lt('created_at', before);
    }

    if (type === 'lost' || type === 'found') {
      query = query.eq('type', type);
    }

    query = query.range(offset, offset + pageSize);

    const { data, count, error } = await query;
    if (error) {
      console.error('[lostfound GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more = (data || []).length > pageSize;
    const slice    = has_more ? data.slice(0, pageSize) : (data || []);
    const formatted = slice.map(formatLostItem);
    const next_cursor = has_more ? formatted[formatted.length - 1]?.created_at : null;

    res.json({
      data: formatted,
      total: count || 0,
      page: pageNum,
      limit: pageSize,
      next_cursor,
      has_more
    });
  } catch (err) {
    console.error('[lostfound GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create a lost/found post ───────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { type, title, description, location, image_url, contact_info } = req.body;

    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'type must be "lost" or "found"' });
    }
    if (!title?.trim() || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!description?.trim() || description.trim().length < 5) {
      return res.status(400).json({ error: 'Description must be at least 5 characters' });
    }
    if (containsProfanity(title + ' ' + description)) {
      return res.status(400).json({ error: 'Content violates community guidelines', code: 'PROFANITY' });
    }

    const { data: row, error } = await supabaseAdmin
      .from('lost_found')
      .insert({
        type,
        title:        title.trim(),
        description:  description.trim(),
        location:     location?.trim() || null,
        image_url:    image_url?.trim() || null,
        contact_info: contact_info?.trim() || null,
        poster_id:    req.profile.id,
        status:       'open',
      })
      .select(`
        id, type, title, description, location, image_url, contact_info, status, poster_id, created_at,
        poster:profiles!poster_id ( id, full_name, department, avatar_url )
      `)
      .single();

    if (error) {
      console.error('[lostfound POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: formatLostItem(row) });
  } catch (err) {
    console.error('[lostfound POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id & PATCH /:id/close — Mark as resolved/closed (owner or admin) ──

async function handleCloseOrUpdate(req, res) {
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('lost_found')
      .select('id, poster_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !row) return res.status(404).json({ error: 'Item not found' });

    const isOwner = row.poster_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    const targetStatus = req.body?.is_resolved === false ? 'open' : 'closed';

    const { data: updated, error } = await supabaseAdmin
      .from('lost_found')
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(`
        id, type, title, description, location, image_url, contact_info, status, poster_id, created_at,
        poster:profiles!poster_id ( id, full_name, department, avatar_url )
      `)
      .single();

    if (error) {
      console.error('[lostfound PATCH]', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, data: formatLostItem(updated) });
  } catch (err) {
    console.error('[lostfound PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.patch('/:id/close', handleCloseOrUpdate);
router.patch('/:id', handleCloseOrUpdate);

// ─── DELETE /:id — Delete item (owner or admin) ───────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('lost_found')
      .select('id, poster_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !row) return res.status(404).json({ error: 'Item not found' });

    const isOwner = row.poster_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    const { error } = await supabaseAdmin
      .from('lost_found')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) {
      console.error('[lostfound DELETE /:id]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[lostfound DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
