'use strict';

// Campus Wall — Profile Route
// GET /me → own full profile
// PATCH /me → update bio, phone_number, avatar_url
// GET /:id → public profile of another user
// GET /me/posts → own posts (paginated, newest first)

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(authGuard);

// ─── GET /me — Own full profile ────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, roll_number, department, phone_number, email,
        bio, avatar_url, karma, posts_count, notes_uploaded,
        auth_provider, status, role, must_change_password,
        created_at, updated_at
      `)
      .eq('id', req.profile.id)
      .single();

    if (error || !profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ data: profile });
  } catch (err) {
    console.error('[profile GET /me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /me — Update own profile ──────────────────────────────────────────

router.patch('/me', async (req, res) => {
  try {
    const { bio, phone_number, avatar_url } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    if (bio !== undefined) {
      if (bio.length > 200) return res.status(400).json({ error: 'Bio must be 200 characters or less' });
      updates.bio = bio.trim();
    }

    if (phone_number !== undefined) {
      const cleaned = String(phone_number).replace(/\D/g, '');
      if (cleaned.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be 10 digits' });
      }
      // Check uniqueness (exclude self)
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone_number', cleaned)
        .neq('id', req.profile.id)
        .maybeSingle();
      if (existing) return res.status(409).json({ error: 'Phone number already registered to another account' });
      updates.phone_number = cleaned;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url?.trim() || null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.profile.id)
      .select('id, full_name, bio, phone_number, avatar_url, updated_at')
      .single();

    if (error) {
      console.error('[profile PATCH /me]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('[profile PATCH /me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /me/posts — Own post history ────────────────────────────────────────

router.get('/me/posts', async (req, res) => {
  try {
    const uid   = req.profile.id;
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 20));
    const before = req.query.before || new Date().toISOString();

    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, content, image_url, upvotes, downvotes, comments_count, created_at, updated_at')
      .eq('user_id', uid)
      .eq('status', 'published')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[profile GET /me/posts]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = posts.length > limit;
    const slice       = has_more ? posts.slice(0, limit) : posts;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    res.json({ data: slice, next_cursor, has_more });
  } catch (err) {
    console.error('[profile GET /me/posts]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id — Public profile of another user ────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, department, bio, avatar_url, karma, posts_count, notes_uploaded, created_at')
      .eq('id', req.params.id)
      .eq('status', 'active')
      .single();

    if (error || !profile) return res.status(404).json({ error: 'User not found' });
    res.json({ data: profile });
  } catch (err) {
    console.error('[profile GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
