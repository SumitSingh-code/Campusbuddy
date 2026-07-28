'use strict';

// Campus Wall — Bookmarks Route
// Bookmarks join to actual post content (feed posts or anon posts).
// Anon posts: user_id stripped, is_own computed server-side for privacy.

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(authGuard);

// ─── GET / — All bookmarks (paginated, newest first) ─────────────────────────

router.get('/', async (req, res) => {
  try {
    const uid    = req.profile.id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const before = req.query.before || new Date().toISOString();

    const { data: bookmarks, error } = await supabaseAdmin
      .from('bookmarks')
      .select('id, ref_type, ref_id, created_at')
      .eq('user_id', uid)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[bookmarks GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = bookmarks.length > limit;
    const slice       = has_more ? bookmarks.slice(0, limit) : bookmarks;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const data = await _enrichBookmarks(slice, uid);
    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[bookmarks GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /feed — Feed post bookmarks only ────────────────────────────────────

router.get('/feed', async (req, res) => {
  try {
    const uid    = req.profile.id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const before = req.query.before || new Date().toISOString();

    const { data: bookmarks, error } = await supabaseAdmin
      .from('bookmarks')
      .select('id, ref_type, ref_id, created_at')
      .eq('user_id', uid)
      .eq('ref_type', 'post')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) return res.status(500).json({ error: 'Database error' });

    const has_more    = bookmarks.length > limit;
    const slice       = has_more ? bookmarks.slice(0, limit) : bookmarks;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const data = await _enrichBookmarks(slice, uid);
    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[bookmarks GET /feed]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /anon — Anon post bookmarks only ────────────────────────────────────

router.get('/anon', async (req, res) => {
  try {
    const uid    = req.profile.id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const before = req.query.before || new Date().toISOString();

    const { data: bookmarks, error } = await supabaseAdmin
      .from('bookmarks')
      .select('id, ref_type, ref_id, created_at')
      .eq('user_id', uid)
      .eq('ref_type', 'anon_post')
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) return res.status(500).json({ error: 'Database error' });

    const has_more    = bookmarks.length > limit;
    const slice       = has_more ? bookmarks.slice(0, limit) : bookmarks;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    const data = await _enrichBookmarks(slice, uid);
    res.json({ data, next_cursor, has_more });
  } catch (err) {
    console.error('[bookmarks GET /anon]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Remove a bookmark ─────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.profile.id); // ownership enforced

    if (error) {
      console.error('[bookmarks DELETE /:id]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[bookmarks DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /by-ref — Remove bookmark by ref (for "unbookmark" from feed) ────

router.delete('/by-ref/:refType/:refId', async (req, res) => {
  try {
    const { refType, refId } = req.params;
    if (!['post', 'anon_post'].includes(refType)) {
      return res.status(400).json({ error: 'Invalid refType' });
    }

    const { error } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('user_id', req.profile.id)
      .eq('ref_type', refType)
      .eq('ref_id', refId);

    if (error) {
      console.error('[bookmarks DELETE /by-ref]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[bookmarks DELETE /by-ref]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helper: Enrich bookmarks with post content ───────────────────────────────

async function _enrichBookmarks(bookmarks, uid) {
  if (!bookmarks || bookmarks.length === 0) return [];

  const postIds     = bookmarks.filter(b => b.ref_type === 'post').map(b => b.ref_id);
  const anonPostIds = bookmarks.filter(b => b.ref_type === 'anon_post').map(b => b.ref_id);

  const [postsResult, anonPostsResult] = await Promise.all([
    postIds.length > 0
      ? supabaseAdmin
          .from('posts')
          .select(`
            id, content, image_url, upvotes, downvotes, comments_count, created_at, status,
            author:profiles!user_id ( id, full_name, department, avatar_url ),
            user_votes ( vote_type ),
            bookmarks ( id )
          `)
          .in('id', postIds)
          .eq('status', 'published')
      : { data: [] },

    anonPostIds.length > 0
      ? supabaseAdmin
          .from('anon_posts')
          .select('id, content, upvotes, downvotes, comments_count, created_at, user_id, status')
          .in('id', anonPostIds)
          .eq('status', 'published')
      : { data: [] },
  ]);

  const postMap = {};
  (postsResult.data || []).forEach(p => { postMap[p.id] = p; });

  const anonPostMap = {};
  (anonPostsResult.data || []).forEach(p => { anonPostMap[p.id] = p; });

  return bookmarks.map(bm => {
    let content = null;
    if (bm.ref_type === 'post') {
      const post = postMap[bm.ref_id];
      if (post) {
        content = {
          ...post,
          is_own:       post.author?.id === uid,
          is_bookmarked: true,
          bookmark_id:  bm.id,
          // user_votes is an array from joined table (only the current user's vote RLS would filter)
          vote_type:    post.user_votes?.[0]?.vote_type || null,
        };
        // Remove the joined arrays from the spread
        delete content.user_votes;
        delete content.bookmarks;
      }
    } else if (bm.ref_type === 'anon_post') {
      const post = anonPostMap[bm.ref_id];
      if (post) {
        content = {
          id:            post.id,
          content:       post.content,
          upvotes:       post.upvotes,
          downvotes:     post.downvotes,
          comments_count: post.comments_count,
          created_at:    post.created_at,
          is_own:        post.user_id === uid,  // computed; user_id not sent
          is_bookmarked: true,
          bookmark_id:   bm.id,
          vote_type:     null,
        };
      }
    }

    return {
      bookmark_id: bm.id,
      ref_type:    bm.ref_type,
      ref_id:      bm.ref_id,
      bookmarked_at: bm.created_at,
      content,        // null if post was deleted
    };
  }).filter(b => b.content !== null); // filter out deleted posts
}

module.exports = router;
