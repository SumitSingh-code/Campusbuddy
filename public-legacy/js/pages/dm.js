// Campus Wall — DM Page Module
// Two-panel SPA: conversation list → thread view.
// Mobile: single panel at a time (list → thread with back button).
// Desktop: side-by-side.
// Realtime: Supabase postgres_changes on messages filtered to active conversation.

import API from '../api.js';
import supabase from '../supabase.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, deptPill, fmtNum, Icons } from '../utils.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _currentUser  = null;
let _activeConvId = null;   // currently open thread
let _otherUser    = null;   // profile of the other participant
let _realtimeChannel    = null; // per-thread realtime channel
let _convListChannel    = null; // conversation-list realtime channel
let _convListClickSetup = false; // guard against duplicate click listeners
let _hasMoreMessages  = true;
let _oldestCursor     = null;  // for "load older" pagination
let _loadingOlder     = false;
let _newConvModal     = null;  // reference to modal element

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="dm-page" id="dm-page">

      <!-- ── Left panel: Conversation List ───────────────────── -->
      <div class="dm-panel dm-list-panel" id="dm-list-panel">
        <div class="dm-list-header">
          <h2 style="font-family:var(--font-heading);font-size:1.125rem;font-weight:800;">Messages</h2>
          <button class="btn btn-primary btn-sm" id="dm-new-btn" aria-label="New message">
            ${Icons.plus} New
          </button>
        </div>
        <div class="dm-search-wrap">
          <input type="search" id="dm-search" class="dm-search-input" placeholder="Search conversations\u2026" autocomplete="off" aria-label="Search conversations">
        </div>
        <div id="dm-conversations-list">
          <div class="empty-state" style="padding:3rem 1rem;">
            <div class="spinner"></div>
          </div>
        </div>
      </div>

      <!-- ── Right panel: Thread View ──────────────────────── -->
      <div class="dm-panel dm-thread-panel" id="dm-thread-panel">

        <!-- Empty state (no conversation selected) -->
        <div class="dm-empty-prompt" id="dm-empty-state">
          <div class="dm-empty-prompt__icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="color:var(--accent);"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>
          </div>
          <div class="dm-empty-prompt__title">Your Messages</div>
          <p class="dm-empty-prompt__sub">Send a private message to any student on Unigram.</p>
          <button class="btn btn-primary btn-sm" id="dm-new-btn-2">
            ${Icons.plus} Start Conversation
          </button>
        </div>

        <!-- Thread (shown when conversation is selected) -->
        <div id="dm-thread-view" class="dm-thread-view" style="display:none;">
          <!-- Thread header -->
          <div class="dm-thread-header">
            <button class="btn btn-ghost btn-icon dm-back-btn" id="dm-back-btn" aria-label="Back to conversations">
              ${Icons.x}
            </button>
            <div class="dm-thread-recipient" id="dm-thread-recipient">
              <div class="avatar avatar--sm" id="dm-recipient-avatar"></div>
              <div>
                <div class="dm-recipient-name" id="dm-recipient-name">…</div>
                <div class="dm-recipient-dept" id="dm-recipient-dept"></div>
              </div>
            </div>
          </div>

          <!-- Load older button (sticky at top of messages area) -->
          <div id="dm-load-older-wrap" class="dm-load-older-wrap" style="display:none;">
            <button class="btn btn-ghost btn-sm" id="dm-load-older">Load older messages</button>
          </div>

          <!-- Messages -->
          <div class="dm-messages" id="dm-messages" role="log" aria-live="polite"></div>

          <!-- Compose -->
          <div class="dm-compose-bar">
            <textarea
              id="dm-compose-input"
              class="dm-compose-input"
              placeholder="Message…"
              maxlength="1000"
              rows="1"
              aria-label="Type a message"
            ></textarea>
            <button class="btn btn-primary dm-send-btn" id="dm-send-btn" disabled aria-label="Send message">
              ${Icons.send}
            </button>
          </div>
          <div id="dm-compose-error" class="alert alert--error" style="display:none;margin:.25rem .75rem .5rem;font-size:.8125rem;"></div>
        </div>

      </div>
    </div>

    <!-- New Message Search Modal -->
    <div class="modal-overlay" id="dm-new-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="New message">
      <div class="modal" style="max-width:420px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>New Message</h3>
          <button class="btn btn-ghost btn-icon" id="dm-close-new-modal" aria-label="Close">${Icons.x}</button>
        </div>
        <div class="modal__body" style="padding-bottom:0;">
          <input
            type="search"
            id="dm-user-search"
            class="form-input"
            placeholder="Search by name or roll number…"
            autocomplete="off"
            aria-label="Search users"
            style="width:100%;margin-bottom:.75rem;"
          >
          <div id="dm-search-results" style="max-height:240px;overflow-y:auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _currentUser        = Auth.getUser();
  _activeConvId       = null;
  _otherUser          = null;
  _convListClickSetup = false; // reset so fresh listener attaches to new DOM

  _setupNewMessageModal();
  _setupCompose();
  _setupBackButton();

  await _loadConversationList();

  // DM search — client-side filter by name
  document.getElementById('dm-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const items = document.querySelectorAll('.conv-item');
    items.forEach(item => {
      const name = item.querySelector('.conv-name')?.textContent?.toLowerCase() || '';
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });
  _subscribeToConversationList(); // realtime sidebar updates
}

// ─── Conversation List ────────────────────────────────────────────────────────

async function _loadConversationList() {
  const listEl = document.getElementById('dm-conversations-list');
  if (!listEl) return;

  try {
    const { data } = await API.get('/dm/conversations');
    if (!data || data.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:3rem 1rem;">
          <div class="empty-state-icon">📭</div>
          <p class="text-muted">No messages yet.<br>Start a conversation!</p>
        </div>
      `;
      return;
    }
    listEl.innerHTML = data.map(conv => _renderConvItem(conv)).join('');

    // Click delegation — only attach once per page visit to avoid accumulation
    if (!_convListClickSetup) {
      listEl.addEventListener('click', (e) => {
        const item = e.target.closest('.dm-conv-item');
        if (item) _openThread(item.dataset.convId);
      });
      _convListClickSetup = true;
    }
  } catch (err) {
    listEl.innerHTML = `<div class="alert alert--error" style="margin:1rem;">${escHtml(err.message)}</div>`;
  }
}

function _renderConvItem(conv) {
  const u = conv.other_user || {};
  const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const hasUnread = conv.unread_count > 0;
  const preview   = conv.last_message
    ? (conv.is_last_mine ? 'You: ' : '') + conv.last_message
    : 'No messages yet';

  return `
    <div class="dm-conv-item ${hasUnread ? 'dm-conv-item--unread' : ''}" data-conv-id="${escHtml(conv.id)}" role="button" tabindex="0">
      <div class="avatar">${escHtml(initials)}</div>
      <div class="dm-conv-info">
        <div class="dm-conv-name">${escHtml(u.full_name || 'Unknown')}</div>
        <div class="dm-conv-preview">${escHtml(preview)}</div>
      </div>
      <div class="dm-conv-meta">
        <div class="dm-conv-time">${conv.last_message_at ? timeAgo(conv.last_message_at) : ''}</div>
        ${hasUnread ? `<div class="dm-conv-badge">${conv.unread_count > 99 ? '99+' : conv.unread_count}</div>` : ''}
      </div>
    </div>
  `;
}

// ─── Thread View ──────────────────────────────────────────────────────────────

async function _openThread(convId) {
  if (_activeConvId === convId) return;

  // Unsubscribe from previous channel
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }

  _activeConvId     = convId;
  _hasMoreMessages  = true;
  _oldestCursor     = null;

  // Mobile: show thread panel, hide list
  document.getElementById('dm-list-panel')?.classList.add('dm-list-hidden');
  document.getElementById('dm-thread-panel')?.classList.add('dm-thread-active');

  // Show thread view, hide empty state
  document.getElementById('dm-empty-state').style.display  = 'none';
  const threadView = document.getElementById('dm-thread-view');
  threadView.style.display = 'flex';
  threadView.style.flexDirection = 'column';
  threadView.style.height = '100%';

  // Show loading
  const msgEl = document.getElementById('dm-messages');
  msgEl.innerHTML = '<div class="empty-state" style="padding:2rem;"><div class="spinner"></div></div>';
  document.getElementById('dm-compose-input').disabled = true;
  document.getElementById('dm-send-btn').disabled = true;

  try {
    const { data, next_cursor, has_more, other_user } = await API.get(`/dm/conversations/${convId}?limit=30`);

    _otherUser    = other_user;
    _hasMoreMessages = has_more;
    _oldestCursor = data.length > 0 ? data[0].created_at : null; // oldest is first after reversing

    // Update thread header
    _updateThreadHeader(other_user);

    // Render messages
    msgEl.innerHTML = data.length === 0
      ? '<div class="empty-state" style="padding:3rem;"><p class="text-muted">Start the conversation!</p></div>'
      : data.map(m => _renderMessage(m)).join('');

    _scrollToBottom(false);

    // Show "load older" if there are more
    document.getElementById('dm-load-older-wrap').style.display = has_more ? 'block' : 'none';

    // Mark conversation as read — update the unread badge in conv list
    _clearConvBadge(convId);

    // Enable compose
    document.getElementById('dm-compose-input').disabled = false;

    // Subscribe to realtime new messages
    _subscribeToMessages(convId);

    // Mark active conv item
    document.querySelectorAll('.dm-conv-item').forEach(el => el.classList.toggle('active', el.dataset.convId === convId));
  } catch (err) {
    msgEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  }
}

function _updateThreadHeader(user) {
  if (!user) return;
  const initials = (user.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('dm-recipient-avatar').textContent = initials;
  document.getElementById('dm-recipient-name').textContent   = user.full_name || 'Unknown';
  document.getElementById('dm-recipient-dept').innerHTML     = user.department ? deptPill(user.department) : '';
}

function _renderMessage(msg) {
  const isMine  = msg.is_mine;
  const timeStr = timeAgo(msg.created_at);
  return `
    <div class="dm-msg ${isMine ? 'dm-msg--mine' : 'dm-msg--theirs'}" data-msg-id="${escHtml(msg.id)}">
      <div class="dm-bubble">${escHtml(msg.content)}</div>
      <div class="dm-msg-meta">
        ${timeStr}
        ${isMine && msg.is_read ? ' · Read' : ''}
      </div>
    </div>
  `;
}

function _scrollToBottom(smooth = true) {
  const msgEl = document.getElementById('dm-messages');
  if (!msgEl) return;
  // Use rAF to ensure DOM has painted before measuring scrollHeight
  requestAnimationFrame(() => {
    msgEl.scrollTo({ top: msgEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}

function _clearConvBadge(convId) {
  const convItem = document.querySelector(`[data-conv-id="${convId}"]`);
  if (!convItem) return;
  convItem.classList.remove('dm-conv-item--unread');
  convItem.querySelector('.dm-conv-badge')?.remove();
}

// ─── Load Older Messages ──────────────────────────────────────────────────────

function _setupBackButton() {
  document.getElementById('dm-back-btn')?.addEventListener('click', () => {
    // Mobile: go back to list
    document.getElementById('dm-list-panel')?.classList.remove('dm-list-hidden');
    document.getElementById('dm-thread-panel')?.classList.remove('dm-thread-active');
    _activeConvId = null;
    if (_realtimeChannel) { supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; }
  });

  document.getElementById('dm-load-older')?.addEventListener('click', async () => {
    if (_loadingOlder || !_hasMoreMessages || !_activeConvId || !_oldestCursor) return;
    _loadingOlder = true;
    const btn = document.getElementById('dm-load-older');
    btn.textContent = 'Loading…';
    btn.disabled = true;

    try {
      const { data, has_more } = await API.get(`/dm/conversations/${_activeConvId}?limit=20&before=${_oldestCursor}`);
      _hasMoreMessages = has_more;
      if (data && data.length > 0) {
        _oldestCursor = data[0].created_at;
        const msgEl    = document.getElementById('dm-messages');
        const prevH    = msgEl.scrollHeight;
        const html     = data.map(m => _renderMessage(m)).join('');
        msgEl.insertAdjacentHTML('afterbegin', html);
        // Preserve scroll position
        msgEl.scrollTop = msgEl.scrollHeight - prevH;
      }
      if (!has_more) document.getElementById('dm-load-older-wrap').style.display = 'none';
    } catch (err) {
      showToast('Failed to load older messages', 'error');
    } finally {
      _loadingOlder = false;
      btn.textContent = 'Load older messages';
      btn.disabled = false;
    }
  });
}

// ─── Realtime Subscription ────────────────────────────────────────────────────

function _subscribeToMessages(convId) {
  _realtimeChannel = supabase
    .channel(`dm-conv-${convId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${convId}` },
      (payload) => {
        const msg = payload.new;
        if (!msg) return;

        const msgEl = document.getElementById('dm-messages');
        if (!msgEl) return;

        // Don't duplicate our own sent messages (they're added optimistically)
        if (msg.sender_id === _currentUser?.id) return;

        const formattedMsg = { ...msg, is_mine: msg.sender_id === _currentUser?.id };
        // Remove empty state if present
        const emptyState = msgEl.querySelector('.empty-state');
        if (emptyState) msgEl.innerHTML = '';

        msgEl.insertAdjacentHTML('beforeend', _renderMessage(formattedMsg));
        _scrollToBottom(true);

        // Update conversation list preview
        _updateConvPreview(convId, msg.content, msg.created_at, false);

        // Mark as read immediately since we're viewing it
        API.patch(`/dm/conversations/${convId}/read`).catch(() => {});
      }
    )
    .subscribe();
}

function _updateConvPreview(convId, content, time, isMine) {
  const convItem = document.querySelector(`[data-conv-id="${convId}"]`);
  if (!convItem) return;
  const previewEl = convItem.querySelector('.dm-conv-preview');
  const timeEl    = convItem.querySelector('.dm-conv-time');
  if (previewEl) previewEl.textContent = (isMine ? 'You: ' : '') + content.substring(0, 60);
  if (timeEl)    timeEl.textContent    = timeAgo(time);
}

// ─── Compose ──────────────────────────────────────────────────────────────────

function _setupCompose() {
  const input  = document.getElementById('dm-compose-input');
  const sendBtn = document.getElementById('dm-send-btn');
  if (!input || !sendBtn) return;

  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0;
    // Auto-grow
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
      e.preventDefault();
      _sendMessage();
    }
  });

  sendBtn.addEventListener('click', _sendMessage);
}

async function _sendMessage() {
  if (!_activeConvId) return;
  const input  = document.getElementById('dm-compose-input');
  const errEl  = document.getElementById('dm-compose-error');
  const sendBtn = document.getElementById('dm-send-btn');
  const content = input.value.trim();
  if (!content) return;

  errEl.style.display = 'none';
  sendBtn.disabled    = true;
  sendBtn.classList.add('btn-loading');

  // Optimistic: add message immediately
  const msgEl    = document.getElementById('dm-messages');
  const emptyState = msgEl?.querySelector('.empty-state');
  if (emptyState) msgEl.innerHTML = '';
  const tempId   = `temp-${Date.now()}`;
  const tempMsg  = {
    id: tempId, content, is_mine: true, is_read: false,
    created_at: new Date().toISOString(), sender_id: _currentUser?.id,
  };
  msgEl?.insertAdjacentHTML('beforeend', _renderMessage(tempMsg));
  _scrollToBottom(true);
  input.value = '';
  input.style.height = 'auto';

  try {
    const { data: msg } = await API.post(`/dm/conversations/${_activeConvId}/messages`, { content });
    // Replace temp message with real one (update data-msg-id)
    const tempEl = document.querySelector(`[data-msg-id="${tempId}"]`);
    if (tempEl && msg) { tempEl.dataset.msgId = msg.id; }

    _updateConvPreview(_activeConvId, content, msg.created_at, true);
  } catch (err) {
    // Remove optimistic message on failure
    document.querySelector(`[data-msg-id="${tempId}"]`)?.remove();
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
    input.value = content; // restore
  } finally {
    sendBtn.classList.remove('btn-loading');
    sendBtn.disabled = input.value.trim().length === 0;
  }
}

// ─── New Message Modal ────────────────────────────────────────────────────────

let _searchTimeout = null;

function _setupNewMessageModal() {
  const openBtns = [document.getElementById('dm-new-btn'), document.getElementById('dm-new-btn-2')];
  openBtns.forEach(btn => btn?.addEventListener('click', _openNewModal));
  document.getElementById('dm-close-new-modal')?.addEventListener('click', _closeNewModal);
  document.getElementById('dm-new-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'dm-new-modal') _closeNewModal();
  });

  const searchInput = document.getElementById('dm-user-search');
  searchInput?.addEventListener('input', () => {
    clearTimeout(_searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      document.getElementById('dm-search-results').innerHTML = '';
      return;
    }
    _searchTimeout = setTimeout(() => _searchUsers(q), 300);
  });

  // Delegate click on search results
  document.getElementById('dm-search-results')?.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-user-id]');
    if (!item) return;
    const userId   = item.dataset.userId;
    const userName = item.dataset.userName;
    _closeNewModal();
    await _startConversation(userId, userName);
  });
}

function _openNewModal() {
  document.getElementById('dm-user-search').value = '';
  document.getElementById('dm-search-results').innerHTML = '';
  document.getElementById('dm-new-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('dm-user-search')?.focus(), 100);
}

function _closeNewModal() {
  document.getElementById('dm-new-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _searchUsers(q) {
  const resultsEl = document.getElementById('dm-search-results');
  resultsEl.innerHTML = '<div class="empty-state" style="padding:.75rem;"><div class="spinner spinner--sm"></div></div>';
  try {
    const { data } = await API.get(`/dm/search?q=${encodeURIComponent(q)}`);
    if (!data || data.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state" style="padding:1rem;font-size:.875rem;color:var(--ink-muted);">No users found.</div>';
      return;
    }
    resultsEl.innerHTML = data.map(u => {
      const initials = (u.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      return `
        <div class="dm-search-item" data-user-id="${escHtml(u.id)}" data-user-name="${escHtml(u.full_name)}" role="button" tabindex="0">
          <div class="avatar avatar--sm">${escHtml(initials)}</div>
          <div>
            <div style="font-family:var(--font-heading);font-weight:600;font-size:.875rem;">${escHtml(u.full_name)}</div>
            <div style="font-size:.75rem;color:var(--ink-muted);font-family:var(--font-mono);">${escHtml(u.roll_number || u.department || '')}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    resultsEl.innerHTML = `<div class="alert alert--error" style="margin:.5rem;">${escHtml(err.message)}</div>`;
  }
}

async function _startConversation(userId, userName) {
  // Prompt for first message
  const firstMsg = prompt(`Message to ${userName}:`);
  if (!firstMsg || !firstMsg.trim()) return;

  try {
    const { data } = await API.post('/dm/conversations', { recipient_id: userId, message: firstMsg.trim() });
    // Refresh conversation list and open the new thread
    await _loadConversationList();
    _openThread(data.conversation_id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Conversation List Realtime ──
// Subscribes to dm_conversations so the sidebar updates automatically when
// another user sends a new message or starts a new conversation.
function _subscribeToConversationList() {
  if (_convListChannel) { supabase.removeChannel(_convListChannel); _convListChannel = null; }
  const uid = _currentUser?.id;
  if (!uid) return;

  _convListChannel = supabase
    .channel(`dm-convlist-${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_conversations' },
      () => { _loadConversationList(); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
      () => { _loadConversationList(); }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[DM] Conv list channel error');
        _convListChannel = null;
      }
    });
}

// ── Exported teardown — called by router.js on navigation away ──
export function destroy() {
  if (_realtimeChannel) { supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; }
  if (_convListChannel) { supabase.removeChannel(_convListChannel); _convListChannel = null; }
  _activeConvId = null;
}