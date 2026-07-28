// Campus Wall — Lost & Found Page
// Browse lost/found items. Post new items with optional image. Mark own posts as resolved.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons } from '../utils.js';
import { uploadToStorage } from '../storage.js';

let _loading    = false;
let _hasMore    = true;
let _cursor     = null;
let _typeFilter = ''; // '' | 'lost' | 'found'

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
      <h1>🔍 Lost &amp; Found</h1>
      <button class="btn btn-primary btn-sm" id="lf-new-btn">${Icons.plus} Post Item</button>
    </div>

    <div style="display:flex;gap:.5rem;margin-bottom:1rem;">
      <button class="btn btn-ghost btn-sm lf-type-btn active" data-type="">All</button>
      <button class="btn btn-ghost btn-sm lf-type-btn" data-type="lost" style="color:var(--danger);">🔴 Lost</button>
      <button class="btn btn-ghost btn-sm lf-type-btn" data-type="found" style="color:var(--success);">🟢 Found</button>
    </div>

    <div id="lf-list" aria-live="polite">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="lf-sentinel" style="height:1px;"></div>

    <!-- Post Modal -->
    <div class="modal-overlay" id="lf-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:480px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Post Lost / Found Item</h3>
          <button class="btn btn-ghost btn-icon" id="lf-close-modal">${Icons.x}</button>
        </div>
        <div class="modal__body" style="display:grid;gap:.75rem;">
          <div style="display:flex;gap:.75rem;">
            <button class="btn lf-type-pick active" data-pick="lost" style="flex:1;background:hsla(0,90%,55%,.1);color:var(--danger);border:1.5px solid currentColor;">🔴 Lost Something</button>
            <button class="btn lf-type-pick" data-pick="found" style="flex:1;background:hsla(140,60%,45%,.1);color:var(--success);border:1.5px solid transparent;">🟢 Found Something</button>
          </div>
          <div>
            <label class="form-label" for="lf-title-input">Item Name *</label>
            <input type="text" id="lf-title-input" class="form-input" placeholder="e.g. Blue wallet, ID card" style="width:100%;">
          </div>
          <div>
            <label class="form-label" for="lf-desc-input">Description *</label>
            <textarea id="lf-desc-input" class="form-input" rows="3" placeholder="Describe the item, any distinctive features…" style="width:100%;resize:vertical;"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
            <div>
              <label class="form-label" for="lf-location-input">Location / Where</label>
              <input type="text" id="lf-location-input" class="form-input" placeholder="e.g. Library, Canteen" style="width:100%;">
            </div>
            <div>
              <label class="form-label" for="lf-contact-input">Contact Info</label>
              <input type="text" id="lf-contact-input" class="form-input" placeholder="Phone or email" style="width:100%;">
            </div>
          </div>
          <div>
            <label class="form-label">Photo (optional)</label>
            <div class="upload-dropzone" id="lf-dropzone" style="padding:1rem;" role="button" tabindex="0">
              <input type="file" id="lf-img-input" accept="image/*" style="display:none;">
              <div class="upload-dropzone__icon" style="font-size:1.5rem;">🖼️</div>
              <div class="upload-dropzone__text" id="lf-img-text" style="font-size:.8125rem;">Click to add a photo</div>
              <div class="upload-dropzone__hint">JPEG/PNG, max 5 MB</div>
            </div>
          </div>
          <div id="lf-modal-error" class="alert alert--error" style="display:none;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="lf-cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="lf-confirm-modal">${Icons.plus} Post</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _loading = false; _hasMore = true; _cursor = null; _typeFilter = '';

  // Type filter pills
  document.querySelectorAll('.lf-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _typeFilter = btn.dataset.type;
      document.querySelectorAll('.lf-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === _typeFilter));
      _reload();
    });
  });

  // Infinite scroll
  const sentinel = document.getElementById('lf-sentinel');
  if (sentinel) {
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _load(); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
  }

  _setupModal();
  _setupListActions();
  await _load(true);
}

function _reload() { _cursor = null; _hasMore = true; _loading = false; _load(true); }

async function _load(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;
  const listEl = document.getElementById('lf-list');
  if (!listEl) return;

  if (initial) listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  else listEl.insertAdjacentHTML('beforeend', '<div id="lf-spin" class="empty-state" style="padding:1rem;"><div class="spinner"></div></div>');

  try {
    const params = new URLSearchParams({ limit: 20 });
    if (_typeFilter) params.set('type', _typeFilter);
    if (_cursor)     params.set('before', _cursor);

    const { data, has_more, next_cursor } = await API.get(`/lostfound?${params}`);
    _hasMore = has_more;
    _cursor  = next_cursor;

    document.getElementById('lf-spin')?.remove();

    if (initial) {
      listEl.innerHTML = !data?.length
        ? `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Nothing here yet</h3><p class="text-muted">Be the first to post!</p></div>`
        : data.map(_renderLfCard).join('');
    } else {
      data?.forEach(item => listEl.insertAdjacentHTML('beforeend', _renderLfCard(item)));
    }
  } catch (err) {
    document.getElementById('lf-spin')?.remove();
    if (initial) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  } finally {
    _loading = false;
  }
}

function _renderLfCard(item) {
  const isOwner = item.poster?.id === Auth.getProfile()?.id;
  const isAdmin = Auth.isAdmin();
  return `
    <div class="lf-card lf-card--${escHtml(item.type)}" data-lf-id="${escHtml(item.id)}">
      ${item.image_url
        ? `<img class="lf-card__img" src="${escHtml(item.image_url)}" alt="${escHtml(item.title)}" loading="lazy">`
        : `<div class="lf-card__img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">${item.type === 'lost' ? '🔴' : '🟢'}</div>`}
      <div class="lf-card__body">
        <div class="lf-card__type">${item.type === 'lost' ? '🔴 Lost' : '🟢 Found'}</div>
        <div class="lf-card__title">${escHtml(item.title)}</div>
        <div class="lf-card__desc">${escHtml(item.description)}</div>
        <div class="lf-card__meta">
          ${item.location ? `📍 ${escHtml(item.location)} · ` : ''}
          ${item.poster?.full_name ? `${escHtml(item.poster.full_name)} · ` : ''}
          ${timeAgo(item.created_at)}
        </div>
        ${item.contact_info ? `<div class="lf-card__meta" style="margin-top:4px;">📞 ${escHtml(item.contact_info)}</div>` : ''}
        <div class="lf-card__actions">
          ${(isOwner || isAdmin) ? `
            <button class="btn btn-sm" style="background:var(--success);color:#fff;font-size:.75rem;" data-action="close-lf" data-id="${escHtml(item.id)}">
              ✅ Mark Resolved
            </button>
            <button class="btn btn-danger btn-sm" style="font-size:.75rem;" data-action="delete-lf" data-id="${escHtml(item.id)}">
              ${Icons.trash} Delete
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function _setupListActions() {
  document.getElementById('lf-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'close-lf') {
      if (!confirm('Mark this item as resolved?')) return;
      btn.disabled = true;
      try {
        await API.patch(`/lostfound/${id}/close`);
        btn.closest('.lf-card')?.remove();
        showToast('Marked as resolved ✅', 'success');
      } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
    }

    if (action === 'delete-lf') {
      if (!confirm('Delete this post?')) return;
      btn.disabled = true;
      try {
        await API.delete(`/lostfound/${id}`);
        btn.closest('.lf-card')?.remove();
        showToast('Post deleted.', 'info');
      } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
    }
  });
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

let _selectedType  = 'lost';
let _selectedImage = null;

function _setupModal() {
  document.getElementById('lf-new-btn')?.addEventListener('click', () => {
    _selectedType = 'lost'; _selectedImage = null;
    document.getElementById('lf-img-text').textContent = 'Click to add a photo';
    document.getElementById('lf-modal-error').style.display = 'none';
    document.getElementById('lf-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('lf-close-modal')?.addEventListener('click', _closeModal);
  document.getElementById('lf-cancel-modal')?.addEventListener('click', _closeModal);
  document.getElementById('lf-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'lf-modal') _closeModal();
  });

  document.querySelectorAll('.lf-type-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      _selectedType = btn.dataset.pick;
      document.querySelectorAll('.lf-type-pick').forEach(b => {
        b.classList.toggle('active', b.dataset.pick === _selectedType);
        b.style.borderColor = b.dataset.pick === _selectedType ? 'currentColor' : 'transparent';
      });
    });
  });

  const dropzone = document.getElementById('lf-dropzone');
  const imgInput = document.getElementById('lf-img-input');
  dropzone?.addEventListener('click', () => imgInput?.click());
  imgInput?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Only image files allowed.', 'error'); return; }
    if (f.size > 5 * 1024 * 1024)    { showToast('Image must be under 5 MB.', 'error'); return; }
    _selectedImage = f;
    document.getElementById('lf-img-text').textContent = `✅ ${f.name}`;
  });

  document.getElementById('lf-confirm-modal')?.addEventListener('click', _submitPost);
}

function _closeModal() {
  document.getElementById('lf-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitPost() {
  const title    = document.getElementById('lf-title-input')?.value.trim();
  const desc     = document.getElementById('lf-desc-input')?.value.trim();
  const location = document.getElementById('lf-location-input')?.value.trim();
  const contact  = document.getElementById('lf-contact-input')?.value.trim();
  const errEl    = document.getElementById('lf-modal-error');
  errEl.style.display = 'none';

  if (!title) { errEl.textContent = 'Item name is required.'; errEl.style.display = 'flex'; return; }
  if (!desc || desc.length < 10) { errEl.textContent = 'Description must be at least 10 characters.'; errEl.style.display = 'flex'; return; }

  const btn = document.getElementById('lf-confirm-modal');
  btn.disabled = true;
  btn.textContent = 'Posting…';

  try {
    let image_url = null;
    if (_selectedImage) {
      const path = `lostfound/${Date.now()}-${_selectedImage.name.replace(/\s+/g, '_')}`;
      image_url  = await uploadToStorage('lostfound-images', path, _selectedImage);
    }

    await API.post('/lostfound', {
      type: _selectedType, title, description: desc,
      location: location || null,
      contact_info: contact || null,
      image_url,
    });

    _closeModal();
    _reload();
    showToast('Item posted! 🎉', 'success');
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${Icons.plus} Post`;
  }
}
