// Campus Wall — Notices Page
// Public read. Admin create/edit/archive via inline form (admin only).

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons } from '../utils.js';

let _loading = false;
let _page    = 1;
let _hasMore = true;
let _filter  = '';

const CATEGORY_ICONS = {
  academic:       '📚',
  exam:           '📝',
  event:          '🎉',
  administrative: '🏛️',
  general:        '📌',
};

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  const isAdmin = Auth.isAdmin();
  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
      <h1>📌 Notices</h1>
      ${isAdmin ? `<button class="btn btn-primary btn-sm" id="notice-new-btn">${Icons.plus} Post Notice</button>` : ''}
    </div>

    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;">
      ${['', 'academic', 'exam', 'event', 'administrative', 'general'].map(c => `
        <button class="btn btn-ghost btn-sm ${c===_filter?'active':''} notice-cat-btn" data-cat="${c}">
          ${c ? CATEGORY_ICONS[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1) : 'All'}
        </button>
      `).join('')}
    </div>

    <div id="notices-list" aria-live="polite">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="notices-sentinel" style="height:1px;"></div>

    ${isAdmin ? `
      <!-- Notice Form Modal -->
      <div class="modal-overlay" id="notice-modal" style="display:none;" role="dialog">
        <div class="modal" style="max-width:500px;">
          <div class="modal__handle"></div>
          <div class="modal__header">
            <h3 id="notice-modal-title">Post Notice</h3>
            <button class="btn btn-ghost btn-icon" id="notice-close-modal">${Icons.x}</button>
          </div>
          <div class="modal__body" style="display:grid;gap:.75rem;">
            <div>
              <label class="form-label" for="notice-title-input">Title *</label>
              <input type="text" id="notice-title-input" class="form-input" placeholder="Notice title" style="width:100%;">
            </div>
            <div>
              <label class="form-label" for="notice-body-input">Body *</label>
              <textarea id="notice-body-input" class="form-input" rows="4" placeholder="Full notice text…" style="width:100%;resize:vertical;"></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label class="form-label" for="notice-cat-select">Category</label>
                <select id="notice-cat-select" class="form-input" style="width:100%;">
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="exam">Exam</option>
                  <option value="event">Event</option>
                  <option value="administrative">Administrative</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="notice-expires-input">Expires (optional)</label>
                <input type="date" id="notice-expires-input" class="form-input" style="width:100%;">
              </div>
            </div>
            <div style="display:flex;gap:1rem;">
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.875rem;">
                <input type="checkbox" id="notice-important"> Mark as Important
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.875rem;">
                <input type="checkbox" id="notice-pinned"> Pin to Top
              </label>
            </div>
            <div id="notice-modal-error" class="alert alert--error" style="display:none;font-size:.8125rem;"></div>
          </div>
          <div class="modal__footer">
            <button class="btn btn-secondary" id="notice-cancel-modal">Cancel</button>
            <button class="btn btn-primary" id="notice-confirm-modal">Post Notice</button>
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

export async function init() {
  _page = 1; _hasMore = true; _loading = false; _filter = '';

  document.querySelectorAll('.notice-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filter = btn.dataset.cat;
      document.querySelectorAll('.notice-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === _filter));
      _reload();
    });
  });

  const sentinel = document.getElementById('notices-sentinel');
  if (sentinel) {
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _load(); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
  }

  if (Auth.isAdmin()) _setupNoticeModal();

  await _load(true);
}

function _reload() { _page = 1; _hasMore = true; _loading = false; _load(true); }

async function _load(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;
  const listEl = document.getElementById('notices-list');
  if (!listEl) return;

  if (initial) listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  else listEl.insertAdjacentHTML('beforeend', '<div id="notif-spin" class="empty-state" style="padding:1rem;"><div class="spinner"></div></div>');

  try {
    const params = new URLSearchParams({ page: _page, limit: 30 });
    if (_filter) params.set('category', _filter);
    const { data, has_more } = await API.get(`/notices?${params}`);
    _hasMore = has_more;
    _page++;

    document.getElementById('notif-spin')?.remove();

    if (initial) {
      listEl.innerHTML = !data?.length
        ? `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No notices</h3><p class="text-muted">Check back later.</p></div>`
        : `<div class="card" style="overflow:hidden;">${data.map(_renderNotice).join('')}</div>`;
    } else {
      const wrap = listEl.querySelector('.card');
      data?.forEach(n => wrap?.insertAdjacentHTML('beforeend', _renderNotice(n)));
    }

    if (Auth.isAdmin()) _setupNoticeActions(listEl);
  } catch (err) {
    document.getElementById('notif-spin')?.remove();
    if (initial) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  } finally {
    _loading = false;
  }
}

function _renderNotice(n) {
  const icon = CATEGORY_ICONS[n.category] || '📌';
  const isAdmin = Auth.isAdmin();
  return `
    <div class="notice-item ${n.is_important ? 'notice-item--important' : ''}" data-notice-id="${escHtml(n.id)}">
      <div class="notice-item__icon">${n.pinned ? '📍' : icon}</div>
      <div class="notice-item__body">
        <div class="notice-item__title">
          ${n.pinned ? '<span style="color:var(--accent);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;margin-right:.25rem;">PINNED</span>' : ''}
          ${n.is_important ? '<span style="color:var(--danger);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;margin-right:.25rem;">IMPORTANT</span>' : ''}
          ${escHtml(n.title)}
        </div>
        <div class="notice-item__desc">${escHtml(n.body)}</div>
        <div class="notice-item__meta">
          ${escHtml(n.category)} · ${timeAgo(n.created_at)}
          ${n.expires_at ? ` · Expires ${new Date(n.expires_at).toLocaleDateString('en-IN')}` : ''}
        </div>
        ${isAdmin ? `
          <div style="display:flex;gap:.5rem;margin-top:.5rem;">
            <button class="btn btn-ghost btn-sm" style="font-size:.75rem;" data-action="archive-notice" data-id="${escHtml(n.id)}">Archive</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function _setupNoticeActions(listEl) {
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="archive-notice"]');
    if (!btn) return;
    if (!confirm('Archive this notice?')) return;
    btn.disabled = true;
    try {
      await API.delete(`/notices/${btn.dataset.id}`);
      btn.closest('.notice-item')?.remove();
      showToast('Notice archived.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

// ─── Notice Modal ─────────────────────────────────────────────────────────────

function _setupNoticeModal() {
  document.getElementById('notice-new-btn')?.addEventListener('click', () => {
    document.getElementById('notice-title-input').value = '';
    document.getElementById('notice-body-input').value  = '';
    document.getElementById('notice-modal-error').style.display = 'none';
    document.getElementById('notice-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('notice-close-modal')?.addEventListener('click', _closeNoticeModal);
  document.getElementById('notice-cancel-modal')?.addEventListener('click', _closeNoticeModal);
  document.getElementById('notice-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'notice-modal') _closeNoticeModal();
  });
  document.getElementById('notice-confirm-modal')?.addEventListener('click', _submitNotice);
}

function _closeNoticeModal() {
  document.getElementById('notice-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitNotice() {
  const title      = document.getElementById('notice-title-input')?.value.trim();
  const body       = document.getElementById('notice-body-input')?.value.trim();
  const category   = document.getElementById('notice-cat-select')?.value;
  const expires_at = document.getElementById('notice-expires-input')?.value;
  const important  = document.getElementById('notice-important')?.checked;
  const pinned     = document.getElementById('notice-pinned')?.checked;
  const errEl      = document.getElementById('notice-modal-error');
  errEl.style.display = 'none';

  if (!title) { errEl.textContent = 'Title is required.'; errEl.style.display = 'flex'; return; }
  if (!body)  { errEl.textContent = 'Body is required.';  errEl.style.display = 'flex'; return; }

  const btn = document.getElementById('notice-confirm-modal');
  btn.disabled = true;
  try {
    await API.post('/notices', {
      title, body, category, is_important: important, pinned,
      expires_at: expires_at || null,
    });
    _closeNoticeModal();
    _reload();
    showToast('Notice posted! 📌', 'success');
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
  }
}
