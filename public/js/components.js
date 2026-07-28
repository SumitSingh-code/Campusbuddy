// Campus Wall — Shared UI Component Renderers
// All functions return HTML strings. They are called by page modules
// and inserted into the DOM via innerHTML.
import { escHtml, timeAgo, deptPill, avatarHtml, fmtNum, Icons } from './utils.js';

// ─── Post Card ────────────────────────────────────────────────────────────────

/**
 * Render a full post card.
 * @param {object} post    - post object from API
 * @param {string} currentUserId - auth.uid()
 * @returns {string} HTML
 */
export function renderPostCard(post, currentUserId) {
  const a        = post.author || {};
  const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const isOwn    = a.id === currentUserId;
  const isAdmin  = ['moderator', 'super_admin'].includes(a.role);

  const upActive   = post.my_vote === 'up'   ? 'active' : '';
  const downActive = post.my_vote === 'down' ? 'active' : '';
  const bmActive   = post.is_bookmarked ? 'is-bookmarked' : '';

  return `
    <article class="post-card" data-post-id="${escHtml(post.id)}" id="post-${escHtml(post.id)}">
      <div class="post-card__header">
        <div class="avatar">${escHtml(initials)}</div>
        <div class="post-card__meta">
          <div class="post-card__author">
            <span class="post-card__name">${escHtml(a.full_name || 'Unknown')}</span>
            ${deptPill(a.department)}
            ${isAdmin ? `<span class="badge badge--admin" style="font-size:10px;">Admin</span>` : ''}
          </div>
          <div class="post-card__time">${timeAgo(post.created_at)}</div>
        </div>
        <button
          class="more-btn"
          data-action="post-menu"
          data-post-id="${escHtml(post.id)}"
          data-is-own="${isOwn}"
          data-created="${escHtml(post.created_at)}"
          aria-label="Post options"
          aria-haspopup="true"
        >${Icons.more}</button>
      </div>

      <div class="post-card__content">${escHtml(post.content)}</div>

      ${post.image_url ? `
        <img
          class="post-card__image"
          src="${escHtml(post.image_url)}"
          alt="Post image"
          loading="lazy"
          onclick="window.open('${escHtml(post.image_url)}','_blank')"
          style="cursor:zoom-in;"
        >
      ` : ''}

      <div class="post-card__actions">
        <button
          class="vote-btn upvote ${upActive}"
          data-action="vote"
          data-post-id="${escHtml(post.id)}"
          data-type="up"
          data-current="${escHtml(post.my_vote || '')}"
          aria-label="Upvote (${post.upvotes})"
          aria-pressed="${post.my_vote === 'up'}"
        >
          ${Icons.upvote}
          <span class="vote-count">${fmtNum(post.upvotes)}</span>
        </button>
        <button
          class="vote-btn downvote ${downActive}"
          data-action="vote"
          data-post-id="${escHtml(post.id)}"
          data-type="down"
          data-current="${escHtml(post.my_vote || '')}"
          aria-label="Downvote (${post.downvotes})"
          aria-pressed="${post.my_vote === 'down'}"
        >
          ${Icons.downvote}
          <span class="vote-count">${fmtNum(post.downvotes)}</span>
        </button>
        <button
          class="comment-btn"
          data-action="open-comments"
          data-post-id="${escHtml(post.id)}"
          aria-label="${post.comment_count} comments"
        >
          ${Icons.comment}
          <span>${post.comment_count > 0 ? fmtNum(post.comment_count) : ''} Comment${post.comment_count !== 1 ? 's' : ''}</span>
        </button>
        <button
          class="more-btn ${bmActive}"
          data-action="bookmark"
          data-post-id="${escHtml(post.id)}"
          data-bookmarked="${post.is_bookmarked}"
          aria-label="${post.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}"
          aria-pressed="${post.is_bookmarked}"
          style="margin-left:auto;color:${post.is_bookmarked ? 'var(--accent)' : 'var(--ink-subtle)'};"
        >${Icons.bookmark}</button>
      </div>
    </article>
  `;
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

/**
 * Render a single comment.
 */
export function renderComment(comment, currentUserId) {
  const a        = comment.author || {};
  const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const isOwn    = a.id === currentUserId;

  return `
    <div class="comment" data-comment-id="${escHtml(comment.id)}">
      <div class="avatar avatar--sm">${escHtml(initials)}</div>
      <div class="comment__body">
        <div class="comment__header">
          <span class="comment__name">${escHtml(a.full_name || 'Unknown')}</span>
          ${deptPill(a.department)}
          <span class="comment__time">${timeAgo(comment.created_at)}</span>
          ${isOwn ? `
            <button
              class="btn btn-ghost btn-sm"
              data-action="delete-comment"
              data-comment-id="${escHtml(comment.id)}"
              style="margin-left:auto;color:var(--danger);min-height:28px;font-size:11px;"
            >Delete</button>
          ` : ''}
        </div>
        <div class="comment__text">${escHtml(comment.content)}</div>
      </div>
    </div>
  `;
}

// ─── Post Options Dropdown ────────────────────────────────────────────────────

/**
 * Returns the inner content of a post options dropdown.
 * @param {string} postId
 * @param {boolean} isOwn - viewer is the author
 * @param {boolean} isAdmin - viewer is admin
 * @param {string} createdAt - ISO string of post creation
 */
export function renderPostMenuItems(postId, isOwn, isAdmin, createdAt) {
  const ageMs       = Date.now() - new Date(createdAt).getTime();
  const canEdit     = isOwn && ageMs < 5 * 60 * 1000;
  const canDelete   = isOwn || isAdmin;

  return `
    ${canEdit ? `
      <button class="admin-nav-item" data-action="edit-post" data-post-id="${escHtml(postId)}" style="color:var(--ink);">
        ✏️ Edit post
      </button>
    ` : ''}
    ${canDelete ? `
      <button class="admin-nav-item" data-action="delete-post" data-post-id="${escHtml(postId)}" style="color:var(--danger);">
        🗑️ Delete post
      </button>
    ` : ''}
    ${!isOwn ? `
      <button class="admin-nav-item" data-action="report-post" data-post-id="${escHtml(postId)}" style="color:var(--ink-muted);">
        🚩 Report post
      </button>
    ` : ''}
    <button class="admin-nav-item" data-action="copy-link" data-post-id="${escHtml(postId)}" style="color:var(--ink-muted);">
      🔗 Copy link
    </button>
  `;
}

// ─── Compose Area ─────────────────────────────────────────────────────────────

export function renderComposeArea(profile) {
  const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return `
    <div class="compose-card" id="compose-card">
      <div style="display:flex;gap:.75rem;align-items:flex-start;">
        <div class="avatar" style="flex-shrink:0;margin-top:2px;">${escHtml(initials)}</div>
        <textarea
          id="compose-input"
          placeholder="What's on your mind, ${escHtml(profile.full_name?.split(' ')[0] || 'there')}?"
          maxlength="1000"
          rows="2"
          style="flex:1;"
          aria-label="Compose post"
        ></textarea>
      </div>

      <div id="compose-image-preview" style="display:none;margin-top:.75rem;position:relative;">
        <img id="compose-preview-img" style="max-height:200px;border-radius:var(--r-md);width:100%;object-fit:cover;" alt="">
        <button
          id="compose-remove-img"
          class="btn btn-ghost btn-sm"
          style="position:absolute;top:.5rem;right:.5rem;background:rgba(0,0,0,.55);color:#fff;border-radius:50%;width:30px;height:30px;padding:0;"
          aria-label="Remove image"
        >${Icons.x}</button>
      </div>

      <div class="compose-card__footer">
        <div style="display:flex;gap:.5rem;align-items:center;">
          <label class="btn btn-ghost btn-sm" for="compose-image-input" style="cursor:pointer;" title="Attach image">
            ${Icons.image}
            <input
              type="file"
              id="compose-image-input"
              accept="image/*"
              style="display:none;"
              aria-label="Attach image"
            >
          </label>
          <span class="char-count" id="compose-char-count">0 / 1000</span>
        </div>
        <button class="btn btn-primary btn-sm" id="compose-submit" disabled>
          Post
        </button>
      </div>
      <div id="compose-error" class="alert alert--error" style="display:none;margin-top:.75rem;"></div>
    </div>
  `;
}

// ─── Comments Drawer Modal ────────────────────────────────────────────────────

export function renderCommentsModal() {
  return `
    <div class="modal-overlay" id="comments-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Comments">
      <div class="modal">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3 id="comments-modal-title">Comments</h3>
          <button class="btn btn-ghost btn-icon" id="close-comments-modal" aria-label="Close comments">
            ${Icons.x}
          </button>
        </div>
        <div class="modal__body" id="comments-body" style="padding:0 1.25rem 1rem;max-height:55vh;overflow-y:auto;">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
        <div class="modal__footer" style="padding:.75rem 1.25rem;gap:.75rem;align-items:flex-end;">
          <textarea
            id="comment-input"
            placeholder="Write a comment…"
            maxlength="500"
            rows="2"
            class="form-textarea"
            style="flex:1;min-height:64px;resize:none;padding:.5rem .75rem;font-size:.875rem;"
            aria-label="Write a comment"
          ></textarea>
          <button class="btn btn-primary btn-sm" id="comment-submit" disabled aria-label="Post comment">
            ${Icons.send}
          </button>
        </div>
        <div id="comment-error" class="alert alert--error" style="display:none;margin:.25rem 1.25rem .75rem;"></div>
      </div>
    </div>
  `;
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

export function renderReportModal() {
  return `
    <div class="modal-overlay" id="report-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Report post">
      <div class="modal" style="max-width:420px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Report Post</h3>
          <button class="btn btn-ghost btn-icon" id="close-report-modal" aria-label="Close">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <p class="text-muted" style="font-size:.875rem;margin-bottom:1rem;">
            Tell us why this post violates the community guidelines.
          </p>
          <div class="form-group" style="margin-bottom:.5rem;">
            <textarea
              id="report-reason"
              class="form-textarea"
              placeholder="e.g. Contains offensive language, harassment, misinformation…"
              maxlength="500"
              rows="3"
            ></textarea>
          </div>
          <div id="report-error" class="alert alert--error" style="display:none;margin-top:.5rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-report">Cancel</button>
          <button class="btn btn-danger" id="submit-report">Submit Report</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Edit Post Modal ──────────────────────────────────────────────────────────

export function renderEditModal() {
  return `
    <div class="modal-overlay" id="edit-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Edit post">
      <div class="modal" style="max-width:480px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Edit Post</h3>
          <button class="btn btn-ghost btn-icon" id="close-edit-modal" aria-label="Close">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <div class="alert alert--warning" style="font-size:.8125rem;margin-bottom:1rem;">
            Posts can only be edited within 5 minutes of posting.
          </div>
          <textarea
            id="edit-content"
            class="form-textarea"
            maxlength="1000"
            rows="5"
          ></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:.25rem;">
            <span class="char-count" id="edit-char-count">0 / 1000</span>
          </div>
          <div id="edit-error" class="alert alert--error" style="display:none;margin-top:.5rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-edit">Cancel</button>
          <button class="btn btn-primary" id="submit-edit">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Post options dropdown (floating) ────────────────────────────────────────

export function renderOptionsDropdown(postId, items) {
  return `
    <div
      class="options-dropdown"
      id="options-dropdown"
      data-post-id="${escHtml(postId)}"
      role="menu"
      style="
        position:fixed;
        background:var(--surface);
        border:1px solid var(--border);
        border-radius:var(--r-lg);
        box-shadow:var(--shadow-lg);
        min-width:180px;
        z-index:500;
        overflow:hidden;
        padding:.25rem 0;
      "
    >
      ${items}
    </div>
  `;
}

// ================================================================
// PHASE 3 — ANONYMOUS FEED COMPONENTS
// ================================================================

// ─── Anon Post Card ───────────────────────────────────────────────────────────

/**
 * Render an anonymous post card.
 * Never shows real author — just "Anonymous" with a ghost icon.
 * If isAdmin=true, a "Reveal" option appears in the options menu.
 * is_own is already computed server-side; we use it to show/hide delete.
 *
 * @param {object} post    - anon post from API (no .author, has .is_own)
 * @param {boolean} isAdmin
 */
export function renderAnonPostCard(post, isAdmin = false) {
  const upActive   = post.my_vote === 'up'   ? 'active' : '';
  const downActive = post.my_vote === 'down' ? 'active' : '';
  const bmActive   = post.is_bookmarked ? 'is-bookmarked' : '';

  return `
    <article class="post-card anon-post-card" data-post-id="${escHtml(post.id)}" id="anon-post-${escHtml(post.id)}">
      <div class="post-card__header">
        <div class="avatar anon-avatar" aria-hidden="true">👻</div>
        <div class="post-card__meta">
          <div class="post-card__author">
            <span class="post-card__name" style="color:var(--ink-muted);font-style:italic;">Anonymous</span>
            ${post.is_own ? `<span class="badge badge--muted" style="font-size:10px;">You</span>` : ''}
            ${isAdmin && post.user_id ? `<span class="badge badge--admin" style="font-size:10px;">ID available</span>` : ''}
          </div>
          <div class="post-card__time">${timeAgo(post.created_at)}</div>
        </div>
        <button
          class="more-btn"
          data-action="anon-post-menu"
          data-post-id="${escHtml(post.id)}"
          data-is-own="${!!post.is_own}"
          aria-label="Post options"
          aria-haspopup="true"
        >${Icons.more}</button>
      </div>

      <div class="post-card__content">${escHtml(post.content)}</div>

      ${post.image_url ? `
        <img
          class="post-card__image"
          src="${escHtml(post.image_url)}"
          alt="Post image"
          loading="lazy"
          onclick="window.open('${escHtml(post.image_url)}','_blank')"
          style="cursor:zoom-in;"
        >
      ` : ''}

      <div class="post-card__actions">
        <button
          class="vote-btn upvote ${upActive}"
          data-action="anon-vote"
          data-post-id="${escHtml(post.id)}"
          data-type="up"
          data-current="${escHtml(post.my_vote || '')}"
          aria-label="Upvote (${post.upvotes})"
          aria-pressed="${post.my_vote === 'up'}"
        >
          ${Icons.upvote}
          <span class="vote-count">${fmtNum(post.upvotes)}</span>
        </button>
        <button
          class="vote-btn downvote ${downActive}"
          data-action="anon-vote"
          data-post-id="${escHtml(post.id)}"
          data-type="down"
          data-current="${escHtml(post.my_vote || '')}"
          aria-label="Downvote (${post.downvotes})"
          aria-pressed="${post.my_vote === 'down'}"
        >
          ${Icons.downvote}
          <span class="vote-count">${fmtNum(post.downvotes)}</span>
        </button>
        <button
          class="comment-btn"
          data-action="anon-open-comments"
          data-post-id="${escHtml(post.id)}"
          aria-label="${post.comment_count} comments"
        >
          ${Icons.comment}
          <span>${post.comment_count > 0 ? fmtNum(post.comment_count) : ''} Comment${post.comment_count !== 1 ? 's' : ''}</span>
        </button>
        <button
          class="more-btn ${bmActive}"
          data-action="anon-bookmark"
          data-post-id="${escHtml(post.id)}"
          data-bookmarked="${post.is_bookmarked}"
          aria-label="${post.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}"
          aria-pressed="${post.is_bookmarked}"
          style="margin-left:auto;color:${post.is_bookmarked ? 'var(--accent)' : 'var(--ink-subtle)'};"
        >${Icons.bookmark}</button>
      </div>
    </article>
  `;
}

// ─── Anon Comment ─────────────────────────────────────────────────────────────

/**
 * Render an anonymous comment.
 * No author name shown to regular users.
 * is_own is computed server-side — owner sees a delete button.
 */
export function renderAnonComment(comment, isAdmin = false) {
  return `
    <div class="comment" data-comment-id="${escHtml(comment.id)}">
      <div class="avatar avatar--sm anon-avatar" aria-hidden="true">👻</div>
      <div class="comment__body">
        <div class="comment__header">
          <span class="comment__name" style="color:var(--ink-muted);font-style:italic;">Anonymous</span>
          ${comment.is_own ? `<span class="badge badge--muted" style="font-size:10px;">You</span>` : ''}
          <span class="comment__time">${timeAgo(comment.created_at)}</span>
          ${(comment.is_own || isAdmin) ? `
            <button
              class="btn btn-ghost btn-sm"
              data-action="anon-delete-comment"
              data-comment-id="${escHtml(comment.id)}"
              style="margin-left:auto;color:var(--danger);min-height:28px;font-size:11px;"
            >Delete</button>
          ` : ''}
        </div>
        <div class="comment__text">${escHtml(comment.content)}</div>
      </div>
    </div>
  `;
}

// ─── Anon Compose Area ────────────────────────────────────────────────────────

export function renderAnonComposeArea(profile) {
  return `
    <div class="compose-card anon-compose-card" id="anon-compose-card">
      <div class="anon-compose-header">
        <div class="avatar anon-avatar" style="flex-shrink:0;" aria-hidden="true">👻</div>
        <div style="flex:1;">
          <div style="font-family:var(--font-heading);font-weight:700;font-size:.875rem;color:var(--ink);margin-bottom:2px;">Post Anonymously</div>
          <div style="font-size:.75rem;color:var(--ink-muted);">Your name is hidden. Admins can reveal identity if needed.</div>
        </div>
        <div class="anon-limit-badge">3/day</div>
      </div>

      <textarea
        id="anon-compose-input"
        placeholder="Share something — no one will know it's you…"
        maxlength="1000"
        rows="2"
        style="width:100%;border:none;background:transparent;outline:none;resize:none;font-family:var(--font-body);font-size:var(--text-sm);color:var(--ink);line-height:1.6;margin-top:.75rem;min-height:48px;max-height:240px;overflow-y:auto;"
        aria-label="Compose anonymous post"
      ></textarea>

      <div id="anon-compose-image-preview" style="display:none;margin-top:.75rem;position:relative;">
        <img id="anon-compose-preview-img" style="max-height:200px;border-radius:var(--r-md);width:100%;object-fit:cover;" alt="">
        <button
          id="anon-compose-remove-img"
          class="btn btn-ghost btn-sm"
          style="position:absolute;top:.5rem;right:.5rem;background:rgba(0,0,0,.55);color:#fff;border-radius:50%;width:30px;height:30px;padding:0;"
          aria-label="Remove image"
        >${Icons.x}</button>
      </div>

      <div class="compose-card__footer">
        <div style="display:flex;gap:.5rem;align-items:center;">
          <label class="btn btn-ghost btn-sm" for="anon-compose-image-input" style="cursor:pointer;" title="Attach image">
            ${Icons.image}
            <input type="file" id="anon-compose-image-input" accept="image/*" style="display:none;" aria-label="Attach image">
          </label>
          <span class="char-count" id="anon-compose-char-count">0 / 1000</span>
        </div>
        <button class="btn btn-anon btn-sm" id="anon-compose-submit" disabled>
          Post Anonymously
        </button>
      </div>
      <div id="anon-compose-error" class="alert alert--error" style="display:none;margin-top:.75rem;"></div>
    </div>
  `;
}
