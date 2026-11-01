'use strict';

// Campus Wall — Profile Route
// GET /me → own full profile
// PATCH /me → update bio, phone_number, avatar_url
// GET /:id → public profile of another user
// GET /me/posts → own posts (paginated, newest first)

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');

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
        notification_preferences, created_at, updated_at
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

    if (req.body.full_name !== undefined) {
      const name = String(req.body.full_name).trim();
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
      }
      updates.full_name = name;
    }

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

    if (req.body.notification_preferences !== undefined && typeof req.body.notification_preferences === 'object') {
      updates.notification_preferences = req.body.notification_preferences;
    }

    let { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.profile.id)
      .select('id, full_name, bio, phone_number, avatar_url, updated_at')
      .single();

    // If notification_preferences column does not exist yet in DB schema, safely fallback
    if (error && error.code === '42703' && updates.notification_preferences !== undefined) {
      delete updates.notification_preferences;
      if (Object.keys(updates).length === 0) {
        return res.json({ data: req.profile });
      }
      const fallback = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', req.profile.id)
        .select('id, full_name, bio, phone_number, avatar_url, updated_at')
        .single();
      updated = fallback.data;
      error = fallback.error;
    }

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

// ─── Helper: enrich posts with author, comments, vote + bookmark state ────────
async function enrichProfilePosts(posts, profile) {
  if (!posts || posts.length === 0) return [];
  const postIds = posts.map(p => p.id);
  const userId  = profile.id;

  const [{ data: votes }, { data: bookmarks }] = await Promise.all([
    supabaseAdmin
      .from('user_votes')
      .select('post_id, vote_type')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabaseAdmin
      .from('bookmarks')
      .select('ref_id')
      .eq('user_id', userId)
      .eq('ref_type', 'post')
      .in('ref_id', postIds),
  ]);

  const voteMap = {};
  (votes || []).forEach(v => { voteMap[v.post_id] = v.vote_type; });
  const bookmarkSet = new Set((bookmarks || []).map(b => b.ref_id));

  const fallbackAuthor = {
    id: profile.id,
    full_name: profile.full_name || 'Student',
    department: profile.department || '',
    avatar_url: profile.avatar_url || null,
    role: profile.role || 'student',
    karma: profile.karma ?? 0,
  };

  return posts.map(p => ({
    id:           p.id,
    content:      p.content,
    image_url:    p.image_url,
    upvotes:      p.upvotes ?? 0,
    downvotes:    p.downvotes ?? 0,
    status:       p.status || 'published',
    created_at:   p.created_at,
    updated_at:   p.updated_at,
    author:       p.author || fallbackAuthor,
    comment_count: parseInt(p.comments?.[0]?.count ?? p.comments_count ?? 0, 10),
    my_vote:       voteMap[p.id] || null,
    is_bookmarked: bookmarkSet.has(p.id),
  }));
}

// ─── GET /me/posts — Own post history ────────────────────────────────────────

router.get('/me/posts', async (req, res) => {
  try {
    const uid   = req.profile.id;
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 20));
    const before = req.query.before || new Date().toISOString();

    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, content, image_url, upvotes, downvotes, status, comments_count, created_at, updated_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role, karma ),
        comments ( count )
      `)
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

    const data = await enrichProfilePosts(slice, req.profile);

    res.json({ data, next_cursor, has_more });
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
      .select('id, full_name, roll_number, department, bio, avatar_url, karma, posts_count, notes_uploaded, notification_preferences, created_at')
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

// ─── GET /config — Public app config (cover URL) ─────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value');
    if (error) return res.json({ data: {} });
    const config = {};
    (data || []).forEach(row => { config[row.key] = row.value; });
    res.json({ data: { cover_url: config.profile_cover_url || null } });
  } catch {
    res.json({ data: {} });
  }
});

module.exports = router;
