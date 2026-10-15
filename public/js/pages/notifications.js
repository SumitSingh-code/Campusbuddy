// Campus Wall — Notifications Page Module
// Realtime: subscribes to new notifications via Supabase postgres_changes.
// Also updates the nav bell badge when unread count changes.

import API from '../api.js';
import supabase from '../supabase.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons } from '../utils.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _cursor     = null;
let _hasMore    = true;
let _loading    = false;
let _channel    = null;
let _observer   = null; // IntersectionObserver for infinite scroll

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
      <h1>Notifications</h1>
      <button class="btn btn-ghost btn-sm" id="mark-all-read-btn" style="font-size:.8125rem;">
        Mark all read
      </button>
    </div>
    <div id="notif-list" role="feed" aria-label="Notifications" aria-busy="true">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="notif-sentinel" style="height:1px;"></div>
    <div id="notif-end-msg" style="display:none;text-align:center;padding:2rem 0;color:var(--ink-subtle);font-size:.8125rem;">
      You're all caught up ✓
    </div>
  `;
}

export async function init() {
  _cursor  = null;
  _hasMore = true;
  _loading = false;

  document.getElementById('mark-all-read-btn')?.addEventListener('click', _markAllRead);

  // Infinite scroll
  const sentinel = document.getElementById('notif-sentinel');
  if (sentinel) {
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _loadNotifs(); },
      { rootMargin: '200px' }
    );
    _observer.observe(sentinel);
  }

  // Click delegation
  document.getElementById('notif-list')?.addEventListener('click', _handleClick);

  // Realtime: subscribe to new notifications
  _subscribeToNotifications();

  await _loadNotifs(true);
}

// ─── Load Notifications ───────────────────────────────────────────────────────

async function _loadNotifs(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;

  const listEl = document.getElementById('notif-list');
  if (!listEl) return;

  if (!initial) {
    const spinner = document.createElement('div');
    spinner.id = 'notif-loading-more';
    spinner.className = 'empty-state';
    spinner.style.padding = '1rem 0';
    spinner.innerHTML = '<div class="spinner"></div>';
    listEl.appendChild(spinner);
  }

  try {
    const params = new URLSearchParams({ limit: 30 });
    if (_cursor) params.set('before', _cursor);

    const { data, next_cursor, has_more } = await API.get(`/notifications?${params}`);
    _cursor  = next_cursor;
    _hasMore = has_more;

    document.getElementById('notif-loading-more')?.remove();

    if (initial) {
      listEl.setAttribute('aria-busy', 'false');
      if (!data || data.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <h3>All caught up</h3>
            <p class="text-muted">Your notifications will appear here.</p>
          </div>
        `;
        _hasMore = false;
        return;
      }
      listEl.innerHTML = data.map(n => _renderNotif(n)).join('');
    } else {
      if (data && data.length > 0) {
        data.forEach(n => listEl.insertAdjacentHTML('beforeend', _renderNotif(n)));
      }
    }

    if (!_hasMore) {
      document.getElementById('notif-end-msg').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('notif-loading-more')?.remove();
    if (initial) {
      const listEl = document.getElementById('notif-list');
      if (listEl) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
    }
  } finally {
    _loading = false;
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

const NOTIF_ICONS = {
  comment:  '💬',
  dm:       '✉️',
  vote:     '⬆️',
  mention:  '@',
  admin:    '⚠️',
  default:  '🔔',
};

function _renderNotif(notif) {
  const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
  return `
    <div
      class="notif-item ${notif.is_read ? '' : 'notif-item--unread'}"
      data-notif-id="${escHtml(notif.id)}"
      data-ref-type="${escHtml(notif.ref_type || '')}"
      data-ref-id="${escHtml(notif.ref_id || '')}"
      data-is-read="${notif.is_read}"
      role="button"
      tabindex="0"
    >
      <div class="notif-icon-wrap">${icon}</div>
      <div class="notif-body">
        <div class="notif-title">${escHtml(notif.title)}</div>
        ${notif.body ? `<div class="notif-text">${escHtml(notif.body)}</div>` : ''}
        <div class="notif-time">${timeAgo(notif.created_at)}</div>
      </div>
      ${!notif.is_read ? '<div class="notif-dot" aria-label="Unread"></div>' : ''}
      <button
        class="btn btn-ghost btn-icon notif-delete-btn"
        data-action="delete-notif"
        data-notif-id="${escHtml(notif.id)}"
        aria-label="Dismiss notification"
        style="margin-left:auto;flex-shrink:0;opacity:0;transition:opacity .15s;"
      >${Icons.x}</button>
    </div>
  `;
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function _handleClick(e) {
  // Delete button
  const deleteBtn = e.target.closest('[data-action="delete-notif"]');
  if (deleteBtn) {
    e.stopPropagation();
    const notifId = deleteBtn.dataset.notifId;
    await _deleteNotif(notifId);
    return;
  }

  // Notification item click → mark read + navigate
  const item = e.target.closest('.notif-item');
  if (!item) return;

  const notifId  = item.dataset.notifId;
  const refType  = item.dataset.refType;
  const refId    = item.dataset.refId;
  const isRead   = item.dataset.isRead === 'true';

  // Mark as read
  if (!isRead) {
    item.classList.remove('notif-item--unread');
    item.querySelector('.notif-dot')?.remove();
    item.dataset.isRead = 'true';
    API.patch(`/notifications/${notifId}/read`).catch(() => {});
    _decrementNavBadge();
  }

  // Navigate to referenced content
  if (refType === 'post') {
    window.location.hash = '/feed';
    // TODO Phase 7: scroll to specific post
  } else if (refType === 'anon_post') {
    window.location.hash = '/anon';
  } else if (refType === 'conversation') {
    window.location.hash = '/dm';
    // TODO: auto-open conversation
  }
}

async function _markAllRead() {
  const btn = document.getElementById('mark-all-read-btn');
  btn.disabled = true;
  try {
    await API.patch('/notifications/read-all');
    document.querySelectorAll('.notif-item--unread').forEach(el => {
      el.classList.remove('notif-item--unread');
      el.querySelector('.notif-dot')?.remove();
      el.dataset.isRead = 'true';
    });
    _resetNavBadge();
    showToast('All notifications marked as read.', 'success', 2000);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function _deleteNotif(notifId) {
  const el = document.querySelector(`[data-notif-id="${notifId}"]`);
  try {
    await API.delete(`/notifications/${notifId}`);
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity .15s';
      setTimeout(() => el.remove(), 150);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Nav Badge Helpers ────────────────────────────────────────────────────────

function _decrementNavBadge() {
  const badge = document.getElementById('notif-nav-badge');
  if (!badge) return;
  const current = parseInt(badge.textContent) || 0;
  const newVal  = Math.max(0, current - 1);
  if (newVal === 0) badge.style.display = 'none';
  else badge.textContent = newVal;
}

function _resetNavBadge() {
  const badge = document.getElementById('notif-nav-badge');
  if (badge) badge.style.display = 'none';
}

function _incrementNavBadge() {
  const badge = document.getElementById('notif-nav-badge');
  if (!badge) return;
  const current = parseInt(badge.textContent) || 0;
  badge.textContent  = current + 1;
  badge.style.display = 'flex';
}

// ─── Realtime Subscription ────────────────────────────────────────────────────

function _subscribeToNotifications() {
  const user = Auth.getUser();
  if (!user?.id) return;

  // Remove any stale channel from a previous visit before creating a new one
  if (_channel) { supabase.removeChannel(_channel); _channel = null; }

  _channel = supabase
    .channel('campus-wall-notifications')
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const notif = payload.new;
        if (!notif) return;

        // Only update the visible list — badge + toast are handled by
        // the global 'cw-notif-global' channel to avoid duplicate updates.
        const listEl = document.getElementById('notif-list');
        if (listEl) {
          const emptyState = listEl.querySelector('.empty-state');
          if (emptyState) listEl.innerHTML = '';
          listEl.insertAdjacentHTML('afterbegin', _renderNotif(notif));
        }
      }
    )
    .subscribe();
}

// ── Exported teardown — called by router.js on navigation away ──
export function destroy() {
  if (_channel) { supabase.removeChannel(_channel); _channel = null; }
  if (_observer) { _observer.disconnect(); _observer = null; }
}

// ─── Global Realtime Init (called from index.html once on login) ──────────────
// This allows badge updates even when user is NOT on the notifications page.
export function initGlobalRealtime(userId) {
  if (!userId) return;
  // Subscribe to new notifications globally
  supabase
    .channel('cw-notif-global')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        _incrementNavBadge();
        showToast(payload.new?.title || 'New notification', 'info', 4000);
      }
    )
    .subscribe();
}
