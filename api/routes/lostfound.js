'use strict';

// Campus Wall — Lost & Found Route
// Students post lost/found items. Owner or admin can close/delete.
// Optional image upload via Supabase Storage (client-side upload → send URL here).

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase');
const { containsProfanity } = require('../lib/profanity');

router.use(authGuard);

// ─── GET / — List active items ────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      type   = '',     // 'lost' | 'found'
      page   = 1,
      limit  = 20,
      before = new Date().toISOString(),
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));

    let query = supabaseAdmin
      .from('lost_found')
      .select(`
        id, type, title, description, location, image_url,
        contact_info, status, created_at,
        poster:profiles!poster_id ( id, full_name, department )
      `, { count: 'exact' })
      .eq('status', 'open')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(pageSize + 1);

    if (type === 'lost' || type === 'found') query = query.eq('type', type);

    const { data, count, error } = await query;
    if (error) {
      console.error('[lostfound GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = data.length > pageSize;
    const slice       = has_more ? data.slice(0, pageSize) : data;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    res.json({ data: slice || [], next_cursor, has_more });
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
    if (!description?.trim() || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
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
        id, type, title, description, location, image_url, contact_info, status, created_at,
        poster:profiles!poster_id ( id, full_name, department )
      `)
      .single();

    if (error) {
      console.error('[lostfound POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: row });
  } catch (err) {
    console.error('[lostfound POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/close — Mark as resolved/closed (owner or admin) ──────────────

router.patch('/:id/close', async (req, res) => {
  try {
    const { data: row } = await supabaseAdmin
      .from('lost_found')
      .select('id, poster_id')
      .eq('id', req.params.id)
      .single();

    if (!row) return res.status(404).json({ error: 'Item not found' });

    const isOwner = row.poster_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    const { error } = await supabaseAdmin
      .from('lost_found')
      .update({ status: 'closed' })
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  } catch (err) {
    console.error('[lostfound PATCH /:id/close]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Delete item (owner or admin) ───────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { data: row } = await supabaseAdmin
      .from('lost_found')
      .select('id, poster_id')
      .eq('id', req.params.id)
      .single();

    if (!row) return res.status(404).json({ error: 'Item not found' });

    const isOwner = row.poster_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    await supabaseAdmin.from('lost_found').update({ status: 'deleted' }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[lostfound DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
