'use strict';

// Campus Wall — Anonymous Feed API
// Privacy contract:
//   • user_id is NEVER sent to non-admin clients
//   • is_own = (post.user_id === req.profile.id) — computed server-side, safe to expose
//   • /reveal (adminGuard) returns full author profile for moderation
//   • Daily limit: 3 anon posts/day (vs 5 named)
//   • Comments on anon posts are also anonymous (no author info exposed)

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase');
const { containsProfanity } = require('../lib/profanity');

router.use(authGuard);

// ─── Helper: format an anon post for client consumption ──────────────────────

function formatPost(post, currentUserId, isAdmin) {
  const base = {
    id:            post.id,
    content:       post.content,
    image_url:     post.image_url,
    upvotes:       post.upvotes,
    downvotes:     post.downvotes,
    status:        post.status,
    created_at:    post.created_at,
    updated_at:    post.updated_at,
    comment_count: parseInt(post.anon_comments?.[0]?.count ?? 0, 10),
    is_own:        post.user_id === currentUserId,
    // Enriched after query:
    my_vote:       null,
    is_bookmarked: false,
  };
  // Admins get the raw user_id for moderation (reveal is a separate endpoint)
  if (isAdmin) base.user_id = post.user_id;
  return base;
}

function formatComment(comment, currentUserId, isAdmin) {
  return {
    id:           comment.id,
    anon_post_id: comment.post_id,
    content:      comment.content,
    status:       comment.status,
    created_at:   comment.created_at,
    is_own:       comment.user_id === currentUserId,
    // Admins get user_id for moderation
    ...(isAdmin ? { user_id: comment.user_id } : {}),
  };
}

// ─── Helper: enrich posts with vote + bookmark state ─────────────────────────

async function enrichPosts(formatted, rawPosts, userId) {
  if (!formatted.length) return formatted;
  const postIds = formatted.map(p => p.id);

  const [{ data: votes }, { data: bookmarks }] = await Promise.all([
    supabaseAdmin
      .from('anon_votes')
      .select('post_id, vote_type')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabaseAdmin
      .from('bookmarks')
      .select('ref_id')
      .eq('user_id', userId)
      .eq('ref_type', 'anon_post')
      .in('ref_id', postIds),
  ]);

  const voteMap     = {};
  (votes || []).forEach(v => { voteMap[v.post_id] = v.vote_type; });
  const bookmarkSet = new Set((bookmarks || []).map(b => b.ref_id));

  return formatted.map(p => ({
    ...p,
    my_vote:       voteMap[p.id] || null,
    is_bookmarked: bookmarkSet.has(p.id),
  }));
}

// ─── GET / — Paginated anon feed ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const before = req.query.before || new Date().toISOString();
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);

    const { data: posts, error } = await supabaseAdmin
      .from('anon_posts')
      .select('id, user_id, content, image_url, upvotes, downvotes, status, created_at, updated_at, anon_comments(count)')
      .eq('status', 'published')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[anon GET /] DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = posts.length > limit;
    const slice       = has_more ? posts.slice(0, limit) : posts;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const formatted = slice.map(p => formatPost(p, req.profile.id, isAdmin));
    const data      = await enrichPosts(formatted, slice, req.profile.id);

    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[anon GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Create anon post ────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { content, image_url } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }
    const trimmed = content.trim();
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Post must be 1000 characters or less' });
    }
    if (containsProfanity(trimmed)) {
      return res.status(400).json({
        error: 'Your post contains language that violates our community guidelines.',
        code: 'PROFANITY',
      });
    }

    // Daily limit: 3 anon posts/day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount, error: countError } = await supabaseAdmin
      .from('anon_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.profile.id)
      .neq('status', 'deleted')
      .gte('created_at', todayStart.toISOString());

    if (countError) {
      console.error('[anon POST /] Count error:', countError);
      return res.status(500).json({ error: 'Database error' });
    }

    if ((todayCount || 0) >= 3) {
      return res.status(429).json({
        error: 'You have reached your daily anonymous post limit (3 posts/day). Try again tomorrow.',
        code: 'DAILY_LIMIT',
      });
    }

    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('anon_posts')
      .insert({
        user_id:   req.profile.id,
        content:   trimmed,
        image_url: image_url || null,
        status:    'published',
      })
      .select('id, user_id, content, image_url, upvotes, downvotes, status, created_at, updated_at, anon_comments(count)')
      .single();

    if (insertError) {
      console.error('[anon POST /] Insert error:', insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    const formatted = formatPost(newPost, req.profile.id, isAdmin);
    const [enriched] = await enrichPosts([formatted], [newPost], req.profile.id);

    res.status(201).json({ data: enriched });
  } catch (err) {
    console.error('[anon POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id — Single anon post ─────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    const { data: post, error } = await supabaseAdmin
      .from('anon_posts')
      .select('id, user_id, content, image_url, upvotes, downvotes, status, created_at, updated_at, anon_comments(count)')
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    const formatted = formatPost(post, req.profile.id, isAdmin);
    const [enriched] = await enrichPosts([formatted], [post], req.profile.id);
    res.json({ data: enriched });
  } catch (err) {
    console.error('[anon GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Hard delete + storage cleanup ───────────────────────────────
// No edit endpoint — anonymous posts cannot be edited (protects integrity)

router.delete('/:id', async (req, res) => {
  try {
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('anon_posts')
      .select('id, user_id, status, image_url')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isOwner = post.user_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Cascade: delete comments, votes, bookmarks
    await supabaseAdmin.from('anon_comments').delete().eq('post_id', req.params.id);
    await supabaseAdmin.from('votes').delete().eq('post_id', req.params.id);
    await supabaseAdmin.from('bookmarks').delete().eq('post_id', req.params.id);

    // Hard delete post row from Supabase
    const { error } = await supabaseAdmin
      .from('anon_posts')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('[anon DELETE /:id]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Clean up image from Supabase Storage
    if (post.image_url) {
      try {
        const url   = new URL(post.image_url);
        // Try both bucket names used historically
        for (const bucket of ['anon-post-images', 'post-images']) {
          const parts = url.pathname.split(`/${bucket}/`);
          if (parts[1]) {
            await supabaseAdmin.storage.from(bucket).remove([decodeURIComponent(parts[1])]);
            break;
          }
        }
      } catch (storageErr) {
        console.warn('[anon DELETE /:id] storage cleanup failed:', storageErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[anon DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── GET /:id/reveal — Reveal author identity (admin only) ───────────────────

router.get('/:id/reveal', adminGuard, async (req, res) => {
  try {
    const { data: post, error: postError } = await supabaseAdmin
      .from('anon_posts')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .single();

    if (postError || !post || post.status === 'deleted') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number, department, phone_number, email, status, karma, posts_count')
      .eq('id', post.user_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Author profile not found' });
    }

    // Log that this admin revealed the author (for accountability)
    console.info(`[REVEAL] Admin ${req.profile.id} (${req.profile.full_name}) revealed author of anon post ${req.params.id} → ${profile.full_name} (${profile.roll_number})`);

    res.json({ author: profile });
  } catch (err) {
    console.error('[anon GET /:id/reveal]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id/comments — Anon comments list ───────────────────────────────────

router.get('/:id/comments', async (req, res) => {
  try {
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const before = req.query.before || new Date().toISOString();
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);

    const { data: post } = await supabaseAdmin
      .from('anon_posts')
      .select('id')
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { data: comments, error } = await supabaseAdmin
      .from('anon_comments')
      .select('id, post_id, user_id, content, status, created_at')
      .eq('post_id', req.params.id)
      .eq('status', 'published')
      .lt('created_at', before)
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (error) {
      console.error('[anon GET /:id/comments]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = comments.length > limit;
    const slice       = has_more ? comments.slice(0, limit) : comments;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const data = slice.map(c => formatComment(c, req.profile.id, isAdmin));
    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[anon GET /:id/comments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/comments — Add anon comment ────────────────────────────────────

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
      return res.status(400).json({
        error: 'Comment contains language that violates our guidelines.',
        code: 'PROFANITY',
      });
    }

    const { data: post } = await supabaseAdmin
      .from('anon_posts')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('anon_comments')
      .insert({
        post_id: req.params.id,
        user_id:      req.profile.id,
        content:      trimmed,
        status:       'published',
      })
      .select('id, post_id, user_id, content, status, created_at')
      .single();

    if (error) {
      console.error('[anon POST /:id/comments]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    res.status(201).json({ data: formatComment(comment, req.profile.id, isAdmin) });
  } catch (err) {
    console.error('[anon POST /:id/comments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id/comments/:cid ────────────────────────────────────────────────

router.delete('/:id/comments/:cid', async (req, res) => {
  try {
    const { data: comment } = await supabaseAdmin
      .from('anon_comments')
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
      .from('anon_comments')
      .update({ status: 'deleted' })
      .eq('id', req.params.cid);

    if (error) {
      console.error('[anon DELETE comment]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[anon DELETE comment]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/vote — Upsert vote ────────────────────────────────────────────

router.post('/:id/vote', async (req, res) => {
  try {
    const { vote_type } = req.body;
    if (!['up', 'down'].includes(vote_type)) {
      return res.status(400).json({ error: 'vote_type must be "up" or "down"' });
    }

    const { data: post } = await supabaseAdmin
      .from('anon_posts')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .single();

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found' });
    }

    // No self-voting (checked server-side — user_id never exposed to client)
    if (post.user_id === req.profile.id) {
      return res.status(400).json({ error: 'You cannot vote on your own post', code: 'SELF_VOTE' });
    }

    const { data: existing } = await supabaseAdmin
      .from('anon_votes')
      .select('id, vote_type')
      .eq('post_id', req.params.id)
      .eq('user_id', req.profile.id)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === vote_type) {
        return res.json({ success: true, my_vote: vote_type, changed: false });
      }
      const { error } = await supabaseAdmin
        .from('anon_votes')
        .update({ vote_type })
        .eq('id', existing.id);
      if (error) {
        console.error('[anon POST /:id/vote] update:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      const { error } = await supabaseAdmin
        .from('anon_votes')
        .insert({ post_id: req.params.id, user_id: req.profile.id, vote_type });
      if (error) {
        console.error('[anon POST /:id/vote] insert:', error);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    const { data: updated } = await supabaseAdmin
      .from('anon_posts')
      .select('upvotes, downvotes')
      .eq('id', req.params.id)
      .single();

    res.json({ success: true, my_vote: vote_type, changed: true, ...updated });
  } catch (err) {
    console.error('[anon POST /:id/vote]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id/vote — Remove vote ──────────────────────────────────────────

router.delete('/:id/vote', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('anon_votes')
      .delete()
      .eq('post_id', req.params.id)
      .eq('user_id', req.profile.id);

    if (error) {
      console.error('[anon DELETE /:id/vote]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const { data: updated } = await supabaseAdmin
      .from('anon_posts')
      .select('upvotes, downvotes')
      .eq('id', req.params.id)
      .single();

    res.json({ success: true, my_vote: null, ...updated });
  } catch (err) {
    console.error('[anon DELETE /:id/vote]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/bookmark — Toggle bookmark ────────────────────────────────────

router.post('/:id/bookmark', async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('bookmarks')
      .select('id')
      .eq('user_id', req.profile.id)
      .eq('ref_id', req.params.id)
      .eq('ref_type', 'anon_post')
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from('bookmarks').delete().eq('id', existing.id);
      return res.json({ success: true, is_bookmarked: false });
    }

    const { data: post } = await supabaseAdmin
      .from('anon_posts')
      .select('id')
      .eq('id', req.params.id)
      .neq('status', 'deleted')
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    await supabaseAdmin.from('bookmarks').insert({
      user_id:  req.profile.id,
      ref_id:   req.params.id,
      ref_type: 'anon_post',
    });

    res.json({ success: true, is_bookmarked: true });
  } catch (err) {
    console.error('[anon POST /:id/bookmark]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/report — Report anon post ─────────────────────────────────────

router.post('/:id/report', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a reason (at least 5 characters)' });
    }

    const { data: existing } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reporter_id', req.profile.id)
      .eq('ref_id', req.params.id)
      .eq('ref_type', 'anon_post')
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You have already reported this post', code: 'DUPLICATE_REPORT' });
    }

    const { error } = await supabaseAdmin.from('reports').insert({
      reporter_id: req.profile.id,
      ref_id:      req.params.id,
      ref_type:    'anon_post',
      reason:      reason.trim(),
    });

    if (error) {
      console.error('[anon POST /:id/report]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[anon POST /:id/report]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
