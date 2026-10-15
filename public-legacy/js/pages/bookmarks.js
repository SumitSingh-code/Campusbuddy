// Campus Wall — Bookmarks Page
// Two tabs: Feed bookmarks | Anon bookmarks.
// Renders post cards (reuses component renderers). Remove-bookmark via × button.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons } from '../utils.js';
import { renderPostCard, renderAnonPostCard } from '../components.js';

let _activeTab  = 'feed';
let _cursor     = null;
let _hasMore    = true;
let _loading    = false;

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header">
      <h1>🔖 Bookmarks</h1>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;padding:0 0 var(--s4);border-bottom:1px solid var(--border);margin-bottom:var(--s4);">
      <button class="btn btn-ghost bookmark-tab-btn active" data-tab="feed" id="bm-feed-tab">
        📰 Feed
      </button>
      <button class="btn btn-ghost bookmark-tab-btn" data-tab="anon" id="bm-anon-tab">
        👻 Anonymous
      </button>
    </div>

    <div id="bm-list" aria-live="polite">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="bm-sentinel" style="height:1px;"></div>
  `;
}

export async function init() {
  _activeTab = 'feed'; _cursor = null; _hasMore = true; _loading = false;

  // Tab switching
  document.querySelectorAll('.bookmark-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      document.querySelectorAll('.bookmark-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === _activeTab));
      _cursor = null; _hasMore = true; _loading = false;
      _load(true);
    });
  });

  // Infinite scroll
  const sentinel = document.getElementById('bm-sentinel');
  if (sentinel) {
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _load(); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
  }

  // Action delegation (unbookmark, vote, etc.)
  document.getElementById('bm-list')?.addEventListener('click', _handleClick);

  await _load(true);
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function _load(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;
  const listEl = document.getElementById('bm-list');
  if (!listEl) return;

  if (initial) {
    listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  } else {
    listEl.insertAdjacentHTML('beforeend', '<div id="bm-spin" class="empty-state" style="padding:1rem;"><div class="spinner"></div></div>');
  }

  try {
    const params = new URLSearchParams({ limit: 15 });
    if (_cursor) params.set('before', _cursor);

    const endpoint = _activeTab === 'feed' ? `/bookmarks/feed?${params}` : `/bookmarks/anon?${params}`;
    const { data, has_more, next_cursor } = await API.get(endpoint);
    _hasMore = has_more;
    _cursor  = next_cursor;

    document.getElementById('bm-spin')?.remove();

    if (initial) {
      listEl.innerHTML = '';
      if (!data?.length) {
        listEl.innerHTML = `
          <div class="empty-state" style="padding:3rem;">
            <div class="empty-state-icon">🔖</div>
            <h3>No ${_activeTab === 'feed' ? 'feed' : 'anonymous'} bookmarks yet</h3>
            <p class="text-muted">Tap the bookmark icon on any post to save it here.</p>
          </div>
        `;
      } else {
        data.forEach(bm => listEl.insertAdjacentHTML('beforeend', _renderBookmarkItem(bm)));
      }
    } else {
      data?.forEach(bm => listEl.insertAdjacentHTML('beforeend', _renderBookmarkItem(bm)));
    }
  } catch (err) {
    document.getElementById('bm-spin')?.remove();
    if (initial) {
      const listEl = document.getElementById('bm-list');
      if (listEl) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
    }
  } finally {
    _loading = false;
  }
}

// ─── Render Bookmark Item ─────────────────────────────────────────────────────

function _renderBookmarkItem(bm) {
  if (!bm.content) return ''; // deleted post
  const c = bm.content;

  // Shared wrapper with remove button
  const inner = bm.ref_type === 'post'
    ? _renderFeedCard(c)
    : _renderAnonCard(c);

  return `
    <div class="bookmark-item" data-bookmark-id="${escHtml(bm.bookmark_id)}" data-ref-type="${escHtml(bm.ref_type)}">
      ${inner}
      <div class="bookmark-item__footer">
        <span class="text-subtle" style="font-size:11px;font-family:var(--font-mono);">🔖 Saved ${timeAgo(bm.bookmarked_at)}</span>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);font-size:.75rem;" data-action="remove-bookmark" data-bm-id="${escHtml(bm.bookmark_id)}">
          ${Icons.x} Remove
        </button>
      </div>
    </div>
  `;
}

function _renderFeedCard(post) {
  const authorName = post.author?.full_name || 'Campus Wall User';
  const dept       = post.author?.department || '';
  const initials   = authorName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return `
    <div class="post-card" style="border-radius:var(--r-xl) var(--r-xl) 0 0;border-bottom:none;">
      <div class="post-card__header">
        <div class="avatar">${escHtml(initials)}</div>
        <div class="post-card__author-info">
          <div class="post-card__author-name">${escHtml(authorName)}</div>
          <div class="post-card__meta">${escHtml(dept)} · ${timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div class="post-card__body">
        <p class="post-card__text">${escHtml(post.content || '')}</p>
        ${post.image_url ? `<img class="post-card__image" src="${escHtml(post.image_url)}" alt="Post image" loading="lazy">` : ''}
      </div>
      <div class="post-card__footer">
        <span class="text-subtle" style="font-size:.75rem;">⬆ ${post.upvotes || 0} · 💬 ${post.comments_count || 0}</span>
      </div>
    </div>
  `;
}

function _renderAnonCard(post) {
  return `
    <div class="anon-post-card" style="border-radius:var(--r-xl) var(--r-xl) 0 0;border-bottom:none;">
      <div class="post-card__header">
        <div class="avatar ghost-avatar">👻</div>
        <div class="post-card__author-info">
          <div class="post-card__author-name">Anonymous</div>
          <div class="post-card__meta">${timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div class="post-card__body">
        <p class="post-card__text">${escHtml(post.content || '')}</p>
      </div>
      <div class="post-card__footer">
        <span class="text-subtle" style="font-size:.75rem;">⬆ ${post.upvotes || 0} · 💬 ${post.comments_count || 0}</span>
      </div>
    </div>
  `;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function _handleClick(e) {
  const btn = e.target.closest('[data-action="remove-bookmark"]');
  if (!btn) return;
  const bmId = btn.dataset.bmId;
  btn.disabled = true;
  try {
    await API.delete(`/bookmarks/${bmId}`);
    const item = btn.closest('.bookmark-item');
    if (item) {
      item.style.opacity = '0';
      item.style.transition = 'opacity .15s';
      setTimeout(() => item.remove(), 150);
    }
    showToast('Bookmark removed.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}
