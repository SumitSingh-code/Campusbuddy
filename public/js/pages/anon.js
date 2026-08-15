// Campus Wall — Anonymous Feed Page Module
// Key differences from named feed:
//   • No author name/dept shown (users see "Anonymous")
//   • No edit (posts cannot be changed after posting — integrity)
//   • Admin sees "Reveal Author" in options menu (GET /api/anon/:id/reveal)
//   • Daily post limit: 3 (enforced by API)
//   • Comments are also anonymous

import API from '../api.js';
import supabase from '../supabase.js';
import Auth from '../auth.js';
import { showToast, compressImage, escHtml, timeAgo, fmtNum, skeletonPostCards, Icons, showConfirm } from '../utils.js';
import {
  renderAnonPostCard,
  renderAnonComment,
  renderAnonComposeArea,
  renderCommentsModal,
  renderReportModal,
  renderOptionsDropdown,
  renderAnonHeader,
} from '../components.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _cursor      = null;
let _loading     = false;
let _hasMore     = true;
let _currentUser  = null;
let _isAdmin      = false;
let _activePostId = null;
let _pendingImg   = null;
let _observer     = null;
let _anonChannel  = null;    // Supabase realtime channel for new anon posts
let _clickHandler = null;    // stored delegated handler (allows removal)

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  const profile = Auth.getProfile();
  return `
    ${renderAnonHeader()}
    ${renderAnonComposeArea(profile)}
    <div id="anon-list" role="feed" aria-label="Anonymous feed" aria-busy="true">
      ${skeletonPostCards(4)}
    </div>
    <div id="anon-sentinel" style="height:1px;"></div>
    <div id="anon-end-msg" style="display:none;text-align:center;padding:2rem 0;color:var(--ink-subtle);font-size:.8125rem;font-family:var(--font-heading);">
      You're all caught up ✓
    </div>
    ${renderCommentsModal()}
    ${renderReportModal()}
    ${_renderRevealModal()}
  `;
}

export async function init() {
  _currentUser = Auth.getUser();
  _isAdmin     = Auth.isAdmin();
  _cursor      = null;
  _hasMore     = true;

  _setupCompose();
  _setupCommentsModal();
  _setupReportModal();
  _setupRevealModal();
  _setupEventDelegation();
  _setupInfiniteScroll();
  _subscribeToAnonFeedUpdates();

  // Info button — explains anonymity to users
  document.getElementById('anon-info-btn')?.addEventListener('click', () => {
    showToast('🔒 Your identity is hidden from other students. Admins can reveal it if a post is reported for a violation.', 'info', 5000);
  });

  await _loadFeed(true);
}

// ── Exported teardown — called by router.js on navigation away ──
export function destroy() {
  if (_observer)    { _observer.disconnect(); _observer = null; }
  if (_anonChannel) { supabase.removeChannel(_anonChannel); _anonChannel = null; }
  const root = document.getElementById('page-content');
  if (root && _clickHandler) { root.removeEventListener('click', _clickHandler); _clickHandler = null; }
}

// ─── Reveal modal HTML ────────────────────────────────────────────────────────

function _renderRevealModal() {
  return `
    <div class="modal-overlay" id="reveal-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Reveal author">
      <div class="modal" style="max-width:420px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>👁️ Author Identity</h3>
          <button class="btn btn-ghost btn-icon" id="close-reveal-modal" aria-label="Close">${Icons.x}</button>
        </div>
        <div class="modal__body" id="reveal-body">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="close-reveal-btn">Close</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Feed Loading ─────────────────────────────────────────────────────────────

async function _loadFeed(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;

  const listEl = document.getElementById('anon-list');
  if (!listEl) return;

  if (!initial) {
    const spinner = document.createElement('div');
    spinner.id = 'anon-loading-more';
    spinner.className = 'empty-state';
    spinner.style.padding = '1rem 0';
    spinner.innerHTML = '<div class="spinner"></div>';
    listEl.appendChild(spinner);
  }

  try {
    const params = new URLSearchParams({ limit: 25 });
    if (_cursor) params.set('before', _cursor);

    const { data, next_cursor, has_more } = await API.get(`/anon?${params}`);

    _cursor  = next_cursor;
    _hasMore = has_more;

    document.getElementById('anon-loading-more')?.remove();

    if (initial) {
      listEl.setAttribute('aria-busy', 'false');
      if (!data || data.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🎭</div>
            <h3>No anonymous posts yet</h3>
            <p class="text-muted">Be the first to post anonymously!</p>
          </div>
        `;
        _hasMore = false;
        return;
      }
      listEl.innerHTML = data.map(p => renderAnonPostCard(p, _isAdmin)).join('');
    } else {
      if (data && data.length > 0) {
        data.forEach(p => listEl.insertAdjacentHTML('beforeend', renderAnonPostCard(p, _isAdmin)));
      }
    }

    if (!_hasMore) {
      document.getElementById('anon-end-msg').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('anon-loading-more')?.remove();
    if (initial) {
      const listEl = document.getElementById('anon-list');
      if (listEl) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
    } else {
      showToast('Failed to load more posts: ' + err.message, 'error');
    }
  } finally {
    _loading = false;
  }
}

// ─── Infinite Scroll ──────────────────────────────────────────────────────────

function _setupInfiniteScroll() {
  const sentinel = document.getElementById('anon-sentinel');
  if (!sentinel) return;
  if (_observer) { _observer.disconnect(); _observer = null; }
  _observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _loadFeed(false); },
    { rootMargin: '200px' }
  );
  _observer.observe(sentinel);
}

// ─── Compose ──────────────────────────────────────────────────────────────────

function _setupCompose() {
  const input   = document.getElementById('anon-compose-input');
  const submit  = document.getElementById('anon-compose-submit');
  const charCnt = document.getElementById('anon-compose-char-count');
  const imgInput = document.getElementById('anon-compose-image-input');
  const removeImg = document.getElementById('anon-compose-remove-img');

  if (!input || !submit) return;

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCnt.textContent = `${len} / 1000`;
    charCnt.className   = `char-count${len > 950 ? ' warn' : ''}${len >= 1000 ? ' over' : ''}`;
    submit.disabled     = len === 0 && !_pendingImg;
    // Auto-grow
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 240) + 'px';
  });

  imgInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10MB.', 'error'); return; }
    try {
      _pendingImg = await compressImage(file, 1200, 250);
      document.getElementById('anon-compose-preview-img').src = URL.createObjectURL(_pendingImg);
      document.getElementById('anon-compose-image-preview').style.display = 'block';
      submit.disabled = false;
    } catch { showToast('Failed to process image.', 'error'); }
  });

  removeImg?.addEventListener('click', () => {
    _pendingImg = null;
    imgInput.value = '';
    document.getElementById('anon-compose-image-preview').style.display = 'none';
    document.getElementById('anon-compose-preview-img').src = '';
    submit.disabled = input.value.trim().length === 0;
  });

  submit.addEventListener('click', _submitPost);
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !submit.disabled) _submitPost();
  });
}

async function _submitPost() {
  const input   = document.getElementById('anon-compose-input');
  const submit  = document.getElementById('anon-compose-submit');
  const errEl   = document.getElementById('anon-compose-error');
  const content = input.value.trim();

  errEl.style.display = 'none';
  if (!content && !_pendingImg) return;

  submit.disabled = true;
  submit.classList.add('btn-loading');

  try {
    let imageUrl = null;
    if (_pendingImg) {
      const userId   = _currentUser?.id;
      const filename = `${userId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('post-images')
        .upload(filename, _pendingImg, { contentType: 'image/jpeg', upsert: false });
      if (uploadErr) throw new Error('Image upload failed: ' + uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(uploadData.path);
      imageUrl = publicUrl;
    }

    const { data: newPost } = await API.post('/anon', { content, image_url: imageUrl });

    const listEl = document.getElementById('anon-list');
    if (listEl) {
      const emptyState = listEl.querySelector('.empty-state');
      if (emptyState) listEl.innerHTML = '';
      listEl.insertAdjacentHTML('afterbegin', renderAnonPostCard(newPost, _isAdmin));
    }

    // Reset compose
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('anon-compose-char-count').textContent = '0 / 1000';
    document.getElementById('anon-compose-image-preview').style.display = 'none';
    document.getElementById('anon-compose-preview-img').src = '';
    document.getElementById('anon-compose-image-input').value = '';
    _pendingImg = null;

    showToast('Posted anonymously!', 'success', 2000);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    submit.disabled = input.value.trim().length === 0 && !_pendingImg;
    submit.classList.remove('btn-loading');
  }
}

// ─── Event Delegation ─────────────────────────────────────────────────────────

function _setupEventDelegation() {
  const root = document.getElementById('page-content');
  if (!root) return;

  if (_clickHandler) root.removeEventListener('click', _clickHandler);

  _clickHandler = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) { _closeDropdown(); return; }

    const action = btn.dataset.action;
    const postId = btn.dataset.postId;

    switch (action) {
      case 'anon-vote':           await _handleVote(btn, postId, btn.dataset.type); break;
      case 'anon-open-comments':  _openComments(postId); break;
      case 'anon-bookmark':       await _handleBookmark(btn, postId); break;
      case 'anon-menu':           _openPostMenu(btn, postId, btn.dataset.isOwn === 'true'); break;
      case 'anon-delete-post':    _closeDropdown(); await _deletePost(postId); break;
      case 'anon-report-post':    _closeDropdown(); _openReportModal(postId); break;
      case 'anon-reveal-post':    _closeDropdown(); await _revealAuthor(postId); break;
      case 'anon-copy-link':      _closeDropdown(); _copyPostLink(postId); break;
      case 'anon-delete-comment': await _deleteComment(btn.dataset.commentId); break;
    }
  };
  root.addEventListener('click', _clickHandler);
}

// ─── Vote ─────────────────────────────────────────────────────────────────────

async function _handleVote(btn, postId, type) {
  const card    = document.getElementById(`anon-post-${postId}`);
  if (!card) return;
  const upBtn   = card.querySelector('.vote-btn.upvote');
  const downBtn = card.querySelector('.vote-btn.downvote');
  const current = btn.dataset.current;
  const isToggleOff = current === type;

  _setVoteUI(upBtn, downBtn, isToggleOff ? null : type);
  [upBtn, downBtn].forEach(b => b.disabled = true);

  try {
    let result;
    if (isToggleOff) {
      result = await API.delete(`/anon/${postId}/vote`);
    } else {
      result = await API.post(`/anon/${postId}/vote`, { vote_type: type });
    }
    upBtn.querySelector('.vote-count').textContent   = fmtNum(result.upvotes ?? 0);
    downBtn.querySelector('.vote-count').textContent = fmtNum(result.downvotes ?? 0);
    const newVote = result.my_vote || '';
    upBtn.dataset.current   = newVote;
    downBtn.dataset.current = newVote;
  } catch (err) {
    _setVoteUI(upBtn, downBtn, current || null);
    showToast(err.message === 'You cannot vote on your own post' ? '🚫 You can\'t vote on your own post' : err.message, 'error');
  } finally {
    [upBtn, downBtn].forEach(b => b.disabled = false);
  }
}

function _setVoteUI(upBtn, downBtn, activeType) {
  if (!upBtn || !downBtn) return;
  upBtn.classList.toggle('active', activeType === 'up');
  downBtn.classList.toggle('active', activeType === 'down');
  upBtn.setAttribute('aria-pressed', activeType === 'up');
  downBtn.setAttribute('aria-pressed', activeType === 'down');
}

// ─── Bookmark ─────────────────────────────────────────────────────────────────

async function _handleBookmark(btn, postId) {
  const wasBookmarked = btn.dataset.bookmarked === 'true';
  btn.disabled = true;
  btn.dataset.bookmarked = !wasBookmarked;
  btn.style.color = !wasBookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
  try {
    const { is_bookmarked } = await API.post(`/anon/${postId}/bookmark`);
    btn.dataset.bookmarked = is_bookmarked;
    btn.style.color = is_bookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
    showToast(is_bookmarked ? 'Bookmarked!' : 'Bookmark removed', 'success', 1800);
  } catch (err) {
    btn.dataset.bookmarked = wasBookmarked;
    btn.style.color = wasBookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
    showToast(err.message, 'error');
  } finally { btn.disabled = false; }
}

// ─── Post Options ─────────────────────────────────────────────────────────────

function _openPostMenu(triggerBtn, postId, isOwn) {
  _closeDropdown();

  const items = `
    ${isOwn ? `
      <button class="admin-nav-item" data-action="anon-delete-post" data-post-id="${escHtml(postId)}" style="color:var(--danger);">
        🗑️ Delete post
      </button>
    ` : ''}
    ${!isOwn ? `
      <button class="admin-nav-item" data-action="anon-report-post" data-post-id="${escHtml(postId)}" style="color:var(--ink-muted);">
        🚩 Report post
      </button>
    ` : ''}
    ${_isAdmin ? `
      <button class="admin-nav-item" data-action="anon-reveal-post" data-post-id="${escHtml(postId)}" style="color:var(--accent);">
        👁️ Reveal author
      </button>
      ${!isOwn ? `
        <button class="admin-nav-item" data-action="anon-delete-post" data-post-id="${escHtml(postId)}" style="color:var(--danger);">
          🗑️ Delete (admin)
        </button>
      ` : ''}
    ` : ''}
    <button class="admin-nav-item" data-action="anon-copy-link" data-post-id="${escHtml(postId)}" style="color:var(--ink-muted);">
      🔗 Copy link
    </button>
  `;

  const dropHtml = renderOptionsDropdown(postId, items);
  document.body.insertAdjacentHTML('beforeend', dropHtml);

  const drop = document.getElementById('options-dropdown');
  const rect = triggerBtn.getBoundingClientRect();
  const top  = Math.min(rect.bottom + 4, window.innerHeight - 200);
  const left = Math.max(8, Math.min(rect.right - 180, window.innerWidth - 196));
  drop.style.top  = `${top}px`;
  drop.style.left = `${left}px`;

  window.addEventListener('scroll', _closeDropdown, { once: true, passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _closeDropdown(); }, { once: true });
}

function _closeDropdown() { document.getElementById('options-dropdown')?.remove(); }
function _copyPostLink(postId) {
  const url = `${window.location.origin}/#/anon-post/${postId}`;
  navigator.clipboard?.writeText(url).then(() => showToast('Link copied!', 'success', 1800));
}

async function _deletePost(postId) {
  const ok = await showConfirm('Delete this anonymous post?\nThis cannot be undone.', 'Delete');
  if (!ok) return;
  try {
    await API.delete(`/anon/${postId}`);
    const card = document.getElementById(`anon-post-${postId}`);
    if (card) { card.style.opacity = '0'; setTimeout(() => card.remove(), 200); }
    showToast('Post deleted.', 'info', 2000);
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Comments Modal ───────────────────────────────────────────────────────────

function _setupCommentsModal() {
  document.getElementById('close-comments-modal')?.addEventListener('click', _closeComments);
  document.getElementById('comments-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'comments-modal') _closeComments();
  });
  const commentInput  = document.getElementById('comment-input');
  const commentSubmit = document.getElementById('comment-submit');
  commentInput?.addEventListener('input', () => {
    commentSubmit.disabled = commentInput.value.trim().length === 0;
  });
  commentInput?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !commentSubmit.disabled) _submitComment();
  });
  commentSubmit?.addEventListener('click', _submitComment);
}

function _openComments(postId) {
  _activePostId = postId;
  const modal   = document.getElementById('comments-modal');
  const body    = document.getElementById('comments-body');
  if (!modal) return;

  body.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  document.getElementById('comment-input').value    = '';
  document.getElementById('comment-submit').disabled = true;
  document.getElementById('comment-error').style.display = 'none';
  document.getElementById('comments-modal-title').textContent = 'Anonymous Comments';

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _loadComments(postId);
}

function _closeComments() {
  _activePostId = null;
  document.getElementById('comments-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _loadComments(postId) {
  const body = document.getElementById('comments-body');
  try {
    const { data: comments } = await API.get(`/anon/${postId}/comments?limit=50`);
    if (!comments || comments.length === 0) {
      body.innerHTML = '<div class="empty-state" style="padding:2rem 0;"><div class="empty-state-icon" style="font-size:2rem;">💬</div><p class="text-muted">No comments yet. Be first!</p></div>';
    } else {
      body.innerHTML = comments.map(c => renderAnonComment(c, _isAdmin)).join('');
    }
  } catch (err) {
    body.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  }
}

async function _submitComment() {
  if (!_activePostId) return;
  const input   = document.getElementById('comment-input');
  const submit  = document.getElementById('comment-submit');
  const errEl   = document.getElementById('comment-error');
  const content = input.value.trim();

  errEl.style.display = 'none';
  submit.disabled = true;
  submit.classList.add('btn-loading');

  try {
    const { data: comment } = await API.post(`/anon/${_activePostId}/comments`, { content });
    const body = document.getElementById('comments-body');
    const emptyState = body.querySelector('.empty-state');
    if (emptyState) body.innerHTML = '';
    body.insertAdjacentHTML('beforeend', renderAnonComment(comment, _isAdmin));
    body.scrollTop = body.scrollHeight;

    // Update comment count on card
    const card = document.getElementById(`anon-post-${_activePostId}`);
    const commentBtn = card?.querySelector('[data-action="anon-open-comments"]');
    if (commentBtn) {
      const span = commentBtn.querySelector('span');
      const prevCount = parseInt(span?.textContent) || 0;
      const newCount  = prevCount + 1;
      if (span) span.textContent = `${newCount} Comment${newCount !== 1 ? 's' : ''}`;
    }

    input.value = '';
    submit.disabled = true;
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
    submit.disabled     = false;
  } finally {
    submit.classList.remove('btn-loading');
  }
}

async function _deleteComment(commentId) {
  if (!_activePostId || !commentId) return;
  const ok = await showConfirm('Delete this comment?', 'Delete');
  if (!ok) return;
  try {
    await API.delete(`/anon/${_activePostId}/comments/${commentId}`);
    document.querySelector(`[data-comment-id="${commentId}"]`)?.remove();
    showToast('Comment deleted.', 'info', 1800);
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function _setupReportModal() {
  document.getElementById('close-report-modal')?.addEventListener('click', _closeReportModal);
  document.getElementById('cancel-report')?.addEventListener('click', _closeReportModal);
  document.getElementById('report-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'report-modal') _closeReportModal();
  });
  document.getElementById('submit-report')?.addEventListener('click', _submitReport);
}

function _openReportModal(postId) {
  _activePostId = postId;
  document.getElementById('report-reason').value = '';
  document.getElementById('report-error').style.display = 'none';
  document.getElementById('report-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function _closeReportModal() {
  document.getElementById('report-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitReport() {
  const reason = document.getElementById('report-reason').value.trim();
  const errEl  = document.getElementById('report-error');
  const btn    = document.getElementById('submit-report');
  errEl.style.display = 'none';
  if (!reason || reason.length < 5) {
    errEl.textContent   = 'Please provide a reason (at least 5 characters).';
    errEl.style.display = 'flex';
    return;
  }
  btn.classList.add('btn-loading');
  btn.disabled = true;
  try {
    await API.post(`/anon/${_activePostId}/report`, { reason });
    _closeReportModal();
    showToast('Report submitted. Thank you for keeping Campus Wall safe.', 'success', 4000);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

// ─── Reveal Author Modal (admin only) ─────────────────────────────────────────

function _setupRevealModal() {
  document.getElementById('close-reveal-modal')?.addEventListener('click', _closeRevealModal);
  document.getElementById('close-reveal-btn')?.addEventListener('click', _closeRevealModal);
  document.getElementById('reveal-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'reveal-modal') _closeRevealModal();
  });
}

async function _revealAuthor(postId) {
  if (!_isAdmin) return;

  const modal = document.getElementById('reveal-modal');
  const body  = document.getElementById('reveal-body');
  body.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    const { author } = await API.get(`/anon/${postId}/reveal`);
    body.innerHTML = `
      <div class="alert alert--warning" style="font-size:.8125rem;margin-bottom:1rem;">
        ⚠️ This information is visible to admins only. Handle with care.
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div>
          <div class="text-subtle" style="font-size:.75rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Full Name</div>
          <div style="font-family:var(--font-heading);font-weight:700;font-size:1rem;">${escHtml(author.full_name)}</div>
        </div>
        <div>
          <div class="text-subtle" style="font-size:.75rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Roll Number</div>
          <div style="font-family:var(--font-mono);font-size:.9375rem;">${escHtml(author.roll_number)}</div>
        </div>
        <div>
          <div class="text-subtle" style="font-size:.75rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Department</div>
          <div style="font-size:.9375rem;">${escHtml(author.department)}</div>
        </div>
        <div>
          <div class="text-subtle" style="font-size:.75rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Phone</div>
          <div style="font-family:var(--font-mono);">${escHtml(author.phone_number)}</div>
        </div>
        <div>
          <div class="text-subtle" style="font-size:.75rem;font-family:var(--font-heading);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">Account Status</div>
          <span class="badge badge--${escHtml(author.status)}">${escHtml(author.status)}</span>
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  }
}

function _closeRevealModal() {
  document.getElementById('reveal-modal').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Anon Feed Realtime ──
// Shows a sticky banner when other users post new anonymous content.
function _subscribeToAnonFeedUpdates() {
  if (_anonChannel) { supabase.removeChannel(_anonChannel); _anonChannel = null; }
  const uid = _currentUser?.id;
  if (!uid) return;

  _anonChannel = supabase
    .channel('anon-feed-updates')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'anon_posts', filter: 'status=eq.published' },
      (payload) => {
        if (payload.new?.user_id === uid) return; // skip own (already prepended optimistically)
        _showNewAnonPostsBanner();
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[AnonFeed] Realtime channel error');
        _anonChannel = null;
      }
    });
}

function _showNewAnonPostsBanner() {
  if (document.getElementById('anon-new-posts-banner')) return; // already visible
  const listEl = document.getElementById('anon-list');
  if (!listEl) return;

  const banner = document.createElement('div');
  banner.id = 'anon-new-posts-banner';
  banner.style.cssText = [
    'position:sticky', 'top:64px', 'z-index:50', 'display:flex',
    'align-items:center', 'justify-content:center', 'gap:.5rem',
    'margin:.75rem 0', 'padding:.625rem 1.25rem',
    'background:var(--accent)', 'color:#fff',
    'border-radius:2rem', 'cursor:pointer',
    'font-size:.875rem', 'font-family:var(--font-heading)',
    'box-shadow:0 4px 16px rgba(0,0,0,.18)',
    'animation:slideDown .25s ease',
  ].join(';');
  banner.innerHTML = '↑ New posts available — tap to refresh';
  banner.addEventListener('click', () => {
    banner.remove();
    _cursor  = null;
    _hasMore = true;
    document.getElementById('anon-list').innerHTML = '';
    _loadFeed(true);
  });
  listEl.before(banner);
}

