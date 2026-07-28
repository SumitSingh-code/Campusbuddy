// Campus Wall — Feed Page Module (Named Campus Feed)
// Handles compose, infinite scroll, votes, comments, bookmarks, reports, edit.

import API from '../api.js';
import supabase from '../supabase.js';
import Auth from '../auth.js';
import { showToast, compressImage, escHtml, timeAgo, fmtNum, skeletonPostCards, Icons } from '../utils.js';
import {
  renderPostCard,
  renderComment,
  renderComposeArea,
  renderCommentsModal,
  renderReportModal,
  renderEditModal,
  renderPostMenuItems,
  renderOptionsDropdown,
} from '../components.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _cursor       = null;    // next-page cursor (ISO timestamp)
let _loading      = false;
let _hasMore      = true;
let _currentUser  = null;
let _activePostId = null;    // post ID currently open in comments/report/edit drawer
let _pendingImg   = null;    // compressed Blob for compose image
let _pendingImgUrl = null;   // Supabase Storage public URL after upload
let _observer     = null;    // IntersectionObserver for infinite scroll

// ─── Exported API (called by router.js) ──────────────────────────────────────

/** Returns the initial HTML skeleton for the page. */
export function render() {
  const profile = Auth.getProfile();
  return `
    ${renderComposeArea(profile)}
    <div id="feed-list" role="feed" aria-label="Campus feed" aria-busy="true">
      ${skeletonPostCards(4)}
    </div>
    <div id="feed-sentinel" style="height:1px;"></div>
    <div id="feed-end-msg" style="display:none;text-align:center;padding:2rem 0;color:var(--ink-subtle);font-size:.8125rem;font-family:var(--font-heading);">
      You're all caught up ✓
    </div>
    ${renderCommentsModal()}
    ${renderReportModal()}
    ${renderEditModal()}
  `;
}

/** Hydrates the page after HTML is injected into the DOM. */
export async function init() {
  _currentUser = Auth.getUser();
  _cursor      = null;
  _hasMore     = true;

  _setupCompose();
  _setupCommentsModal();
  _setupReportModal();
  _setupEditModal();
  _setupEventDelegation();
  _setupInfiniteScroll();

  await _loadFeed(true);
}

// ─── Feed Loading ─────────────────────────────────────────────────────────────

async function _loadFeed(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;

  const listEl = document.getElementById('feed-list');
  if (!listEl) return;

  if (!initial) {
    // Append a small loading indicator at the bottom
    const spinner = document.createElement('div');
    spinner.id    = 'feed-loading-more';
    spinner.className = 'empty-state';
    spinner.style.padding = '1rem 0';
    spinner.innerHTML = '<div class="spinner"></div>';
    listEl.appendChild(spinner);
  }

  try {
    const params = new URLSearchParams({ limit: 25 });
    if (_cursor) params.set('before', _cursor);

    const { data, next_cursor, has_more } = await API.get(`/feed?${params}`);

    _cursor  = next_cursor;
    _hasMore = has_more;

    // Remove loading spinner if loading more
    document.getElementById('feed-loading-more')?.remove();

    if (initial) {
      listEl.setAttribute('aria-busy', 'false');
      if (!data || data.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h3>No posts yet</h3>
            <p class="text-muted">Be the first to post something on Campus Wall!</p>
          </div>
        `;
        _hasMore = false;
        return;
      }
      listEl.innerHTML = data.map(p => renderPostCard(p, _currentUser?.id)).join('');
    } else {
      if (data && data.length > 0) {
        data.forEach(p => {
          listEl.insertAdjacentHTML('beforeend', renderPostCard(p, _currentUser?.id));
        });
      }
    }

    if (!_hasMore) {
      document.getElementById('feed-end-msg').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('feed-loading-more')?.remove();
    if (initial) {
      listEl.innerHTML = `
        <div class="alert alert--error">${escHtml(err.message)}</div>
      `;
    } else {
      showToast('Failed to load more posts: ' + err.message, 'error');
    }
  } finally {
    _loading = false;
  }
}

// ─── Infinite Scroll ──────────────────────────────────────────────────────────

function _setupInfiniteScroll() {
  const sentinel = document.getElementById('feed-sentinel');
  if (!sentinel) return;

  _observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && _hasMore && !_loading) {
        _loadFeed(false);
      }
    },
    { rootMargin: '200px' }
  );
  _observer.observe(sentinel);
}

// ─── Compose ──────────────────────────────────────────────────────────────────

function _setupCompose() {
  const input   = document.getElementById('compose-input');
  const submit  = document.getElementById('compose-submit');
  const charCnt = document.getElementById('compose-char-count');
  const imgInput = document.getElementById('compose-image-input');
  const removeImg = document.getElementById('compose-remove-img');

  if (!input || !submit) return;

  // Character counter + enable/disable button
  input.addEventListener('input', () => {
    const len = input.value.length;
    charCnt.textContent = `${len} / 1000`;
    charCnt.className   = `char-count${len > 950 ? ' warn' : ''}${len >= 1000 ? ' over' : ''}`;
    submit.disabled     = len === 0 && !_pendingImgUrl;
  });

  // Image selection + compression
  imgInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10MB.', 'error'); return; }

    try {
      _pendingImg = await compressImage(file, 1200, 250);
      const objectUrl = URL.createObjectURL(_pendingImg);
      document.getElementById('compose-preview-img').src = objectUrl;
      document.getElementById('compose-image-preview').style.display = 'block';
      submit.disabled = input.value.trim().length === 0 && !_pendingImg;
    } catch {
      showToast('Failed to process image.', 'error');
    }
  });

  removeImg?.addEventListener('click', () => {
    _pendingImg    = null;
    _pendingImgUrl = null;
    imgInput.value = '';
    document.getElementById('compose-image-preview').style.display = 'none';
    document.getElementById('compose-preview-img').src = '';
    submit.disabled = input.value.trim().length === 0;
  });

  // Submit
  submit.addEventListener('click', _submitPost);

  // Ctrl+Enter shortcut
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !submit.disabled) {
      _submitPost();
    }
  });

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 240) + 'px';
  });
}

async function _submitPost() {
  const input   = document.getElementById('compose-input');
  const submit  = document.getElementById('compose-submit');
  const errEl   = document.getElementById('compose-error');
  const content = input.value.trim();

  errEl.style.display = 'none';

  if (!content && !_pendingImg) return;

  submit.disabled = true;
  submit.classList.add('btn-loading');

  try {
    let imageUrl = null;

    // Upload image to Supabase Storage if present
    if (_pendingImg) {
      const userId   = _currentUser?.id;
      const filename = `${userId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('post-images')
        .upload(filename, _pendingImg, { contentType: 'image/jpeg', upsert: false });

      if (uploadErr) throw new Error('Image upload failed: ' + uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(uploadData.path);

      imageUrl = publicUrl;
    }

    const { data: newPost } = await API.post('/feed', { content, image_url: imageUrl });

    // Prepend the new post to the feed
    const listEl = document.getElementById('feed-list');
    if (listEl) {
      const emptyState = listEl.querySelector('.empty-state');
      if (emptyState) listEl.innerHTML = '';
      listEl.insertAdjacentHTML('afterbegin', renderPostCard(newPost, _currentUser?.id));
    }

    // Reset compose
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('compose-char-count').textContent = '0 / 1000';
    document.getElementById('compose-image-preview').style.display = 'none';
    document.getElementById('compose-preview-img').src = '';
    document.getElementById('compose-image-input').value = '';
    _pendingImg    = null;
    _pendingImgUrl = null;

    showToast('Posted!', 'success', 2000);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    submit.disabled = false;
    submit.classList.remove('btn-loading');
    // Re-evaluate disabled state
    submit.disabled = input.value.trim().length === 0 && !_pendingImg;
  }
}

// ─── Event Delegation ─────────────────────────────────────────────────────────
// All post card interactions delegated from #page-content

function _setupEventDelegation() {
  const root = document.getElementById('page-content');
  if (!root) return;

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) {
      // Close any open dropdown on outside click
      _closeDropdown();
      return;
    }

    const action = btn.dataset.action;
    const postId = btn.dataset.postId;

    switch (action) {
      case 'vote':         await _handleVote(btn, postId, btn.dataset.type); break;
      case 'open-comments': _openComments(postId); break;
      case 'bookmark':     await _handleBookmark(btn, postId); break;
      case 'post-menu':    _openPostMenu(btn, postId, btn.dataset.isOwn === 'true', btn.dataset.created); break;
      case 'edit-post':    _closeDropdown(); _openEditModal(postId); break;
      case 'delete-post':  _closeDropdown(); await _deletePost(postId); break;
      case 'report-post':  _closeDropdown(); _openReportModal(postId); break;
      case 'copy-link':    _closeDropdown(); _copyPostLink(postId); break;
      case 'delete-comment': await _deleteComment(btn.dataset.commentId); break;
    }
  });
}

// ─── Vote Handling ────────────────────────────────────────────────────────────

async function _handleVote(btn, postId, type) {
  const card    = document.getElementById(`post-${postId}`);
  if (!card) return;

  const upBtn   = card.querySelector('.vote-btn.upvote');
  const downBtn = card.querySelector('.vote-btn.downvote');
  const current = btn.dataset.current; // '' | 'up' | 'down'
  const isToggleOff = current === type;

  // Optimistic UI
  const prevUp   = parseInt(upBtn.querySelector('.vote-count').textContent.replace(/[KM].*/, '')) || 0;
  const prevDown = parseInt(downBtn.querySelector('.vote-count').textContent.replace(/[KM].*/, '')) || 0;

  _setVoteUI(upBtn, downBtn, isToggleOff ? null : type);
  [upBtn, downBtn].forEach(b => b.disabled = true);

  try {
    let result;
    if (isToggleOff) {
      result = await API.delete(`/feed/${postId}/vote`);
    } else {
      result = await API.post(`/feed/${postId}/vote`, { vote_type: type });
    }

    // Update counts from server
    upBtn.querySelector('.vote-count').textContent   = fmtNum(result.upvotes ?? prevUp);
    downBtn.querySelector('.vote-count').textContent = fmtNum(result.downvotes ?? prevDown);

    // Update data-current on both buttons
    const newVote = result.my_vote || '';
    upBtn.dataset.current   = newVote;
    downBtn.dataset.current = newVote;
  } catch (err) {
    // Revert
    _setVoteUI(upBtn, downBtn, current || null);
    showToast(err.message, 'error');
  } finally {
    [upBtn, downBtn].forEach(b => b.disabled = false);
  }
}

function _setVoteUI(upBtn, downBtn, activeType) {
  upBtn.classList.toggle('active', activeType === 'up');
  downBtn.classList.toggle('active', activeType === 'down');
  upBtn.setAttribute('aria-pressed', activeType === 'up');
  downBtn.setAttribute('aria-pressed', activeType === 'down');
}

// ─── Bookmark Handling ────────────────────────────────────────────────────────

async function _handleBookmark(btn, postId) {
  const wasBookmarked = btn.dataset.bookmarked === 'true';
  btn.disabled = true;

  // Optimistic
  btn.dataset.bookmarked = !wasBookmarked;
  btn.style.color = !wasBookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
  btn.setAttribute('aria-pressed', !wasBookmarked);

  try {
    const { is_bookmarked } = await API.post(`/feed/${postId}/bookmark`);
    btn.dataset.bookmarked = is_bookmarked;
    btn.style.color = is_bookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
    showToast(is_bookmarked ? 'Bookmarked!' : 'Bookmark removed', 'success', 1800);
  } catch (err) {
    // Revert
    btn.dataset.bookmarked = wasBookmarked;
    btn.style.color = wasBookmarked ? 'var(--accent)' : 'var(--ink-subtle)';
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ─── Post Options Menu ────────────────────────────────────────────────────────

function _openPostMenu(triggerBtn, postId, isOwn, createdAt) {
  _closeDropdown();

  const isAdmin = Auth.isAdmin();
  const items   = renderPostMenuItems(postId, isOwn, isAdmin, createdAt);
  const dropHtml = renderOptionsDropdown(postId, items);

  document.body.insertAdjacentHTML('beforeend', dropHtml);

  const drop = document.getElementById('options-dropdown');
  const rect = triggerBtn.getBoundingClientRect();

  // Position below the trigger button
  const top  = Math.min(rect.bottom + 4, window.innerHeight - 200);
  const left = Math.max(8, Math.min(rect.right - 180, window.innerWidth - 196));
  drop.style.top  = `${top}px`;
  drop.style.left = `${left}px`;

  // Auto-close on scroll or ESC
  const cleanup = () => _closeDropdown();
  window.addEventListener('scroll', cleanup, { once: true, passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cleanup(); }, { once: true });
}

function _closeDropdown() {
  document.getElementById('options-dropdown')?.remove();
}

function _copyPostLink(postId) {
  const url = `${window.location.origin}/#/post/${postId}`;
  navigator.clipboard?.writeText(url).then(() => showToast('Link copied!', 'success', 1800));
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

async function _deletePost(postId) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    await API.delete(`/feed/${postId}`);
    const card = document.getElementById(`post-${postId}`);
    if (card) {
      card.style.transition = 'opacity .2s ease';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 200);
    }
    showToast('Post deleted.', 'info', 2000);
  } catch (err) {
    showToast(err.message, 'error');
  }
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !commentSubmit.disabled) {
      _submitComment();
    }
  });

  commentSubmit?.addEventListener('click', _submitComment);
}

function _openComments(postId) {
  _activePostId = postId;
  const modal   = document.getElementById('comments-modal');
  const body    = document.getElementById('comments-body');
  const input   = document.getElementById('comment-input');
  const submit  = document.getElementById('comment-submit');
  const errEl   = document.getElementById('comment-error');

  if (!modal) return;

  // Reset
  body.innerHTML    = '<div class="empty-state"><div class="spinner"></div></div>';
  input.value       = '';
  submit.disabled   = true;
  errEl.style.display = 'none';

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
    const { data: comments } = await API.get(`/feed/${postId}/comments?limit=50`);
    if (!comments || comments.length === 0) {
      body.innerHTML = '<div class="empty-state" style="padding:2rem 0;"><div class="empty-state-icon" style="font-size:2rem;">💬</div><p class="text-muted">No comments yet. Be first!</p></div>';
    } else {
      body.innerHTML = comments.map(c => renderComment(c, _currentUser?.id)).join('');
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
  submit.disabled     = true;
  submit.classList.add('btn-loading');

  try {
    const { data: comment } = await API.post(`/feed/${_activePostId}/comments`, { content });

    // Append comment
    const body = document.getElementById('comments-body');
    const emptyState = body.querySelector('.empty-state');
    if (emptyState) body.innerHTML = '';
    body.insertAdjacentHTML('beforeend', renderComment(comment, _currentUser?.id));
    body.scrollTop = body.scrollHeight;

    // Update comment count on the post card
    const card = document.getElementById(`post-${_activePostId}`);
    const commentBtn = card?.querySelector('[data-action="open-comments"]');
    if (commentBtn) {
      const span = commentBtn.querySelector('span');
      const prevCount = parseInt(span?.textContent) || 0;
      const newCount  = prevCount + 1;
      if (span) span.textContent = `${newCount} Comment${newCount !== 1 ? 's' : ''}`;
    }

    input.value     = '';
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
  if (!confirm('Delete this comment?')) return;
  try {
    await API.delete(`/feed/${_activePostId}/comments/${commentId}`);
    const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
    commentEl?.remove();
    showToast('Comment deleted.', 'info', 1800);
  } catch (err) {
    showToast(err.message, 'error');
  }
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
    await API.post(`/feed/${_activePostId}/report`, { reason });
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function _setupEditModal() {
  document.getElementById('close-edit-modal')?.addEventListener('click', _closeEditModal);
  document.getElementById('cancel-edit')?.addEventListener('click', _closeEditModal);
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') _closeEditModal();
  });

  const editContent = document.getElementById('edit-content');
  const editCharCnt = document.getElementById('edit-char-count');
  editContent?.addEventListener('input', () => {
    const len = editContent.value.length;
    editCharCnt.textContent = `${len} / 1000`;
    editCharCnt.className   = `char-count${len > 950 ? ' warn' : ''}${len >= 1000 ? ' over' : ''}`;
  });

  document.getElementById('submit-edit')?.addEventListener('click', _submitEdit);
}

async function _openEditModal(postId) {
  _activePostId = postId;

  // Fetch current content
  try {
    const { data: post } = await API.get(`/feed/${postId}`);
    const editContent = document.getElementById('edit-content');
    editContent.value = post.content;
    document.getElementById('edit-char-count').textContent = `${post.content.length} / 1000`;
    document.getElementById('edit-error').style.display = 'none';
    document.getElementById('edit-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    editContent.focus();
  } catch (err) {
    showToast('Could not load post: ' + err.message, 'error');
  }
}

function _closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitEdit() {
  const content = document.getElementById('edit-content').value.trim();
  const errEl   = document.getElementById('edit-error');
  const btn     = document.getElementById('submit-edit');
  errEl.style.display = 'none';

  if (!content) { errEl.textContent = 'Content cannot be empty.'; errEl.style.display = 'flex'; return; }

  btn.classList.add('btn-loading');
  btn.disabled = true;

  try {
    const { data: updated } = await API.patch(`/feed/${_activePostId}`, { content });

    // Update post card in DOM
    const card = document.getElementById(`post-${_activePostId}`);
    if (card) {
      const contentEl = card.querySelector('.post-card__content');
      if (contentEl) contentEl.textContent = updated.content;
    }

    _closeEditModal();
    showToast('Post updated!', 'success', 2000);
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}
