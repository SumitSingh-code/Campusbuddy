'use strict';

const express = require('express');
const router = express.Router();
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');
const { containsProfanity, getMatchedWord } = require('../lib/profanity');

// All feed routes require auth
router.use(authGuard);

// ─── Helper: enrich posts with vote + bookmark state ─────────────────────────

async function enrichPosts(posts, userId) {
  if (!posts || posts.length === 0) return [];
  const postIds = posts.map(p => p.id);

  const [{ data: votes }, { data: bookmarks }] = await Promise.all([
    supabaseAdmin
      .from('votes')
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

  return posts.map(p => ({
    id:           p.id,
    content:      p.content,
    image_url:    p.image_url,
    upvotes:      p.upvotes,
    downvotes:    p.downvotes,
    status:       p.status,
    created_at:   p.created_at,
    updated_at:   p.updated_at,
    author:       p.author,
    comment_count: parseInt(p.comments?.[0]?.count ?? 0, 10),
    my_vote:       voteMap[p.id] || null,
    is_bookmarked: bookmarkSet.has(p.id),
  }));
}

// ─── GET / — Paginated feed (cursor-based, newest first) ─────────────────────
// Query params: before (ISO timestamp cursor), limit (default 25, max 50)

router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const before = req.query.before || new Date().toISOString();

    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, content, image_url, upvotes, downvotes, status, created_at, updated_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role, karma ),
        comments ( count )
      `)
      .eq('status', 'published')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // fetch one extra to detect has_more

    if (error) {
      console.error('[feed GET /] DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more   = posts.length > limit;
    const slice      = has_more ? posts.slice(0, limit) : posts;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const data = await enrichPosts(slice, req.profile.id);
    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[feed GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create a post ───────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { content, image_url } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }
    const trimmed = content.trim();
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Post must be 1000 characters or less' });
    }

    // Profanity check
    if (containsProfanity(trimmed)) {
      return res.status(400).json({
        error: 'Your post contains language that violates our community guidelines.',
        code: 'PROFANITY',
      });
    }

    // Daily post limit (5 named posts per day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount, error: countError } = await supabaseAdmin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.profile.id)
      .neq('status', 'deleted')
      .gte('created_at', todayStart.toISOString());

    if (countError) {
      console.error('[feed POST /] Count error:', countError);
      return res.status(500).json({ error: 'Database error' });
    }

    if ((todayCount || 0) >= 5) {
      return res.status(429).json({
        error: 'You have reached your daily post limit (5 posts/day). Try again tomorrow.',
        code: 'DAILY_LIMIT',
      });
    }

    // Insert
    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id:   req.profile.id,
        content:   trimmed,
        image_url: image_url || null,
        status:    'published',
      })
      .select(`
        id, content, image_url, upvotes, downvotes, status, created_at, updated_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role, karma ),
        comments ( count )
      `)
      .single();

    if (insertError) {
      console.error('[feed POST /] Insert error:', insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    const [enriched] = await enrichPosts([newPost], req.profile.id);
    res.status(201).json({ data: enriched });
  } catch (err) {
    console.error('[feed POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id — Single post ───────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select(`
        id, content, image_url, upvotes, downvotes, status, created_at, updated_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role, karma ),
        comments ( count )
      `)
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (error || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [enriched] = await enrichPosts([post], req.profile.id);
    res.json({ data: enriched });
  } catch (err) {
    console.error('[feed GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id — Edit own post (within 5-minute window) ─────────────────────

router.patch('/:id', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }
    const trimmed = content.trim();
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Post must be 1000 characters or less' });
    }
    if (containsProfanity(trimmed)) {
      return res.status(400).json({ error: 'Content violates community guidelines.', code: 'PROFANITY' });
    }

    // Fetch post first to verify ownership + edit window
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id, created_at, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.profile.id) return res.status(403).json({ error: 'You can only edit your own posts' });
    if (post.status === 'deleted') return res.status(404).json({ error: 'Post not found' });

    // 5-minute edit window
    const ageMs = Date.now() - new Date(post.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      return res.status(403).json({
        error: 'Posts can only be edited within 5 minutes of posting.',
        code: 'EDIT_WINDOW_EXPIRED',
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('posts')
      .update({ content: trimmed })
      .eq('id', req.params.id)
      .select(`
        id, content, image_url, upvotes, downvotes, status, created_at, updated_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role, karma ),
        comments ( count )
      `)
      .single();

    if (updateError) {
      console.error('[feed PATCH /:id]', updateError);
      return res.status(500).json({ error: 'Database error' });
    }

    const [enriched] = await enrichPosts([updated], req.profile.id);
    res.json({ data: enriched });
  } catch (err) {
    console.error('[feed PATCH /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Soft-delete post (owner or admin) ─────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });
    if (post.status === 'deleted') return res.status(404).json({ error: 'Post not found' });

    const isOwner = post.user_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .update({ status: 'deleted' })
      .eq('id', req.params.id);

    if (deleteError) {
      console.error('[feed DELETE /:id]', deleteError);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[feed DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id/comments — Paginated comments ───────────────────────────────────

router.get('/:id/comments', async (req, res) => {
  try {
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const before = req.query.before || new Date().toISOString();

    // Verify post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select(`
        id, content, status, created_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role )
      `)
      .eq('post_id', req.params.id)
      .eq('status', 'published')
      .lt('created_at', before)
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (error) {
      console.error('[feed GET /:id/comments]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = comments.length > limit;
    const slice       = has_more ? comments.slice(0, limit) : comments;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    res.json({ data: slice, next_cursor, has_more });
  } catch (err) {
    console.error('[feed GET /:id/comments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/comments — Add a comment ──────────────────────────────────────

router.post('/:id/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    const trimmed = content.trim();
    if (trimmed.length > 500) {
      return res.status(400).json({ error: 'Comment must be 500 characters or less' });
    }
    if (containsProfanity(trimmed)) {
      return res.status(400).json({ error: 'Comment contains language that violates our guidelines.', code: 'PROFANITY' });
    }

    // Verify post exists and is published
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: req.params.id,
        user_id: req.profile.id,
        content: trimmed,
        status: 'published',
      })
      .select(`
        id, content, status, created_at,
        author:profiles!user_id ( id, full_name, department, avatar_url, role )
      `)
      .single();

    if (error) {
      console.error('[feed POST /:id/comments]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: comment });
  } catch (err) {
    console.error('[feed POST /:id/comments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id/comments/:cid — Delete comment (owner or admin) ──────────────

router.delete('/:id/comments/:cid', async (req, res) => {
  try {
    const { data: comment } = await supabaseAdmin
      .from('comments')
      .select('id, user_id, status')
      .eq('id', req.params.cid)
      .eq('post_id', req.params.id)
      .single();

    if (!comment || comment.status === 'deleted') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = comment.user_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    const { error } = await supabaseAdmin
      .from('comments')
      .update({ status: 'deleted' })
      .eq('id', req.params.cid);

    if (error) {
      console.error('[feed DELETE /:id/comments/:cid]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[feed DELETE /:id/comments/:cid]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/vote — Upsert vote (up or down) ───────────────────────────────

router.post('/:id/vote', async (req, res) => {
  try {
    const { vote_type } = req.body;
    if (!['up', 'down'].includes(vote_type)) {
      return res.status(400).json({ error: 'vote_type must be "up" or "down"' });
    }

    // Verify post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .single();

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Cannot vote on own post
    if (post.user_id === req.profile.id) {
      return res.status(400).json({ error: 'You cannot vote on your own post', code: 'SELF_VOTE' });
    }

    // Upsert (insert or update existing vote)
    const { data: existingVote } = await supabaseAdmin
      .from('votes')
      .select('id, vote_type')
      .eq('post_id', req.params.id)
      .eq('user_id', req.profile.id)
      .maybeSingle();

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Same vote — no-op, return current state
        return res.json({ success: true, my_vote: vote_type, changed: false });
      }
      // Different vote — update
      const { error } = await supabaseAdmin
        .from('votes')
        .update({ vote_type })
        .eq('id', existingVote.id);
      if (error) {
        console.error('[feed POST /:id/vote] update error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      // New vote
      const { error } = await supabaseAdmin
        .from('votes')
        .insert({ post_id: req.params.id, user_id: req.profile.id, vote_type });
      if (error) {
        console.error('[feed POST /:id/vote] insert error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    // Return fresh vote counts
    const { data: updated } = await supabaseAdmin
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', req.params.id)
      .single();

    res.json({ success: true, my_vote: vote_type, changed: true, ...updated });
  } catch (err) {
    console.error('[feed POST /:id/vote]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id/vote — Remove vote ──────────────────────────────────────────

router.delete('/:id/vote', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('votes')
      .delete()
      .eq('post_id', req.params.id)
      .eq('user_id', req.profile.id);

    if (error) {
      console.error('[feed DELETE /:id/vote]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Return fresh vote counts
    const { data: updated } = await supabaseAdmin
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', req.params.id)
      .single();

    res.json({ success: true, my_vote: null, ...updated });
  } catch (err) {
    console.error('[feed DELETE /:id/vote]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/bookmark — Toggle bookmark ────────────────────────────────────

router.post('/:id/bookmark', async (req, res) => {
  try {
    // Check if already bookmarked
    const { data: existing } = await supabaseAdmin
      .from('bookmarks')
      .select('id')
      .eq('user_id', req.profile.id)
      .eq('ref_id', req.params.id)
      .eq('ref_type', 'post')
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      await supabaseAdmin.from('bookmarks').delete().eq('id', existing.id);
      return res.json({ success: true, is_bookmarked: false });
    }

    // Verify post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    await supabaseAdmin.from('bookmarks').insert({
      user_id:  req.profile.id,
      ref_id:   req.params.id,
      ref_type: 'post',
    });

    res.json({ success: true, is_bookmarked: true });
  } catch (err) {
    console.error('[feed POST /:id/bookmark]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/report — Report a post ────────────────────────────────────────

router.post('/:id/report', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a reason (at least 5 characters)' });
    }

    // Prevent duplicate reports from same user
    const { data: existing } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reporter_id', req.profile.id)
      .eq('ref_id', req.params.id)
      .eq('ref_type', 'post')
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You have already reported this post', code: 'DUPLICATE_REPORT' });
    }

    const { error } = await supabaseAdmin.from('reports').insert({
      reporter_id: req.profile.id,
      ref_id:      req.params.id,
      ref_type:    'post',
      reason:      reason.trim(),
    });

    if (error) {
      console.error('[feed POST /:id/report]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[feed POST /:id/report]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
