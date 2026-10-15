// Campus Wall — Notes Page
// Browse/search study notes PDFs. Upload via Supabase Storage (same pattern as PYQ).

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons, fmtBytes, showConfirm } from '../utils.js';
import { uploadToStorage } from '../storage.js';

let _page = 1, _hasMore = true, _loading = false;
let _filters = { subject: '', department: '', semester: '' };

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
      <h1>📝 Study Notes</h1>
      <button class="btn btn-primary btn-sm" id="notes-upload-btn">${Icons.upload} Upload</button>
    </div>

    <div class="util-filter-bar" id="notes-filters">
      <div class="search-bar" style="flex:1;min-width:160px;">
        ${Icons.search}
        <input type="search" id="notes-search" placeholder="Search subject…" aria-label="Search notes">
      </div>
      <select id="notes-dept-filter" class="form-input" style="min-width:130px;" aria-label="Filter by department">
        <option value="">All Departments</option>
      </select>
      <select id="notes-sem-filter" class="form-input" style="min-width:110px;" aria-label="Filter by semester">
        <option value="">All Semesters</option>
        ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}">Semester ${s}</option>`).join('')}
      </select>
    </div>

    <div id="notes-list" aria-live="polite">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="notes-sentinel" style="height:1px;"></div>

    <!-- Upload Modal -->
    <div class="modal-overlay" id="notes-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:480px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Upload Notes</h3>
          <button class="btn btn-ghost btn-icon" id="notes-close-modal">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <div class="upload-dropzone" id="notes-dropzone" role="button" tabindex="0" style="margin-bottom:.75rem;">
            <input type="file" id="notes-file-input" accept=".pdf" style="display:none;">
            <div class="upload-dropzone__icon">📝</div>
            <div class="upload-dropzone__text" id="notes-drop-text">Drop PDF here or click to browse</div>
            <div class="upload-dropzone__hint">Max 10 MB · PDF only</div>
          </div>
          <div style="display:grid;gap:.75rem;">
            <div>
              <label class="form-label" for="notes-title">Title *</label>
              <input type="text" id="notes-title" class="form-input" placeholder="e.g. Unit 3 Data Structures Notes" style="width:100%;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label class="form-label" for="notes-subject">Subject *</label>
                <input type="text" id="notes-subject" class="form-input" placeholder="e.g. Data Structures" style="width:100%;">
              </div>
              <div>
                <label class="form-label" for="notes-dept">Department *</label>
                <input type="text" id="notes-dept" class="form-input" placeholder="e.g. CSE" style="width:100%;" value="${Auth.getProfile()?.department || ''}">
              </div>
            </div>
            <div>
              <label class="form-label" for="notes-sem">Semester</label>
              <select id="notes-sem" class="form-input" style="width:100%;">
                <option value="">Not specified</option>
                ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}">Semester ${s}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" for="notes-desc">Description (optional)</label>
              <textarea id="notes-desc" class="form-input" rows="2" placeholder="Topics covered…" style="width:100%;resize:vertical;"></textarea>
            </div>
          </div>
          <div id="notes-upload-error" class="alert alert--error" style="display:none;margin-top:.75rem;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="notes-cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="notes-confirm-modal" disabled>${Icons.upload} Upload</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _page = 1; _hasMore = true; _loading = false;
  _filters = { subject: '', department: '', semester: '' };

  await _loadMeta();
  _setupFilters();
  _setupUploadModal();
  _setupInfiniteScroll();
  await _loadNotes(true);
}

async function _loadMeta() {
  try {
    const { departments } = await API.get('/notes/meta');
    const deptSel = document.getElementById('notes-dept-filter');
    departments.forEach(d => deptSel.insertAdjacentHTML('beforeend', `<option value="${escHtml(d)}">${escHtml(d)}</option>`));
  } catch (_) {}
}

function _setupFilters() {
  let searchTimeout;
  document.getElementById('notes-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { _filters.subject = e.target.value.trim(); _reload(); }, 350);
  });
  document.getElementById('notes-dept-filter')?.addEventListener('change', (e) => { _filters.department = e.target.value; _reload(); });
  document.getElementById('notes-sem-filter')?.addEventListener('change',  (e) => { _filters.semester   = e.target.value; _reload(); });
}

function _reload() { _page = 1; _hasMore = true; _loading = false; _loadNotes(true); }

function _setupInfiniteScroll() {
  const sentinel = document.getElementById('notes-sentinel');
  if (!sentinel) return;
  const obs = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _loadNotes(); },
    { rootMargin: '200px' }
  );
  obs.observe(sentinel);
}

async function _loadNotes(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;
  const listEl = document.getElementById('notes-list');
  if (!listEl) return;

  if (initial) listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  else listEl.insertAdjacentHTML('beforeend', '<div id="notes-spin" class="empty-state" style="padding:1rem;"><div class="spinner"></div></div>');

  try {
    const params = new URLSearchParams({ page: _page, limit: 20 });
    if (_filters.subject)    params.set('subject',    _filters.subject);
    if (_filters.department) params.set('department', _filters.department);
    if (_filters.semester)   params.set('semester',   _filters.semester);

    const { data, has_more } = await API.get(`/notes?${params}`);
    _hasMore = has_more;
    _page++;
    document.getElementById('notes-spin')?.remove();

    if (initial) {
      listEl.innerHTML = !data?.length
        ? `<div class="empty-state"><div class="empty-state-icon">📂</div><h3>No notes yet</h3><p class="text-muted">Upload notes to help your classmates!</p></div>`
        : data.map(_renderNoteCard).join('');
    } else {
      data?.forEach(n => listEl.insertAdjacentHTML('beforeend', _renderNoteCard(n)));
    }

    listEl.removeEventListener('click', _handleNoteClick);
    listEl.addEventListener('click', _handleNoteClick);
  } catch (err) {
    document.getElementById('notes-spin')?.remove();
    if (initial) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  } finally {
    _loading = false;
  }
}

function _renderNoteCard(n) {
  const isOwner = n.uploader_id === Auth.getProfile()?.id;
  const isAdmin = Auth.isAdmin();
  const sizeStr = n.file_size_bytes ? fmtBytes(n.file_size_bytes) : '';
  return `
    <div class="util-card" data-note-id="${escHtml(n.id)}">
      <div class="util-card__header">
        <div style="flex:1;">
          <div class="util-card__title">${escHtml(n.title)}</div>
          <div class="util-card__meta">${escHtml(n.subject)} · ${escHtml(n.department)}${n.semester ? ` · Sem ${n.semester}` : ''}</div>
        </div>
        <div style="text-align:right;font-size:.75rem;color:var(--ink-subtle);flex-shrink:0;">
          ${sizeStr ? `<span>${sizeStr}</span><br>` : ''}
          <span>${timeAgo(n.created_at)}</span>
        </div>
      </div>
      ${n.description ? `<div style="font-size:var(--text-xs);color:var(--ink-muted);">${escHtml(n.description)}</div>` : ''}
      <div class="util-card__tags">
        ${n.uploader?.full_name ? `<span class="badge badge--accent">By ${escHtml(n.uploader.full_name)}</span>` : ''}
        ${n.downloads ? `<span class="badge badge--muted">⬇ ${n.downloads} downloads</span>` : ''}
      </div>
      <div class="util-card__actions">
        <button class="btn btn-primary btn-sm" data-action="download-note" data-id="${escHtml(n.id)}" data-url="${escHtml(n.file_url)}">
          ${Icons.download} Download
        </button>
        ${(isOwner || isAdmin) ? `
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" data-action="delete-note" data-id="${escHtml(n.id)}">
            ${Icons.trash} Delete
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

async function _handleNoteClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'download-note') {
    try {
      const { file_url } = await API.post(`/notes/${btn.dataset.id}/download`, {});
      window.open(file_url, '_blank', 'noopener');
    } catch (_) {
      window.open(btn.dataset.url, '_blank', 'noopener');
    }
  }

  if (btn.dataset.action === 'delete-note') {
    const ok = await showConfirm('Delete this notes file?', 'Delete');
    if (!ok) return;
    btn.disabled = true;
    try {
      await API.delete(`/notes/${btn.dataset.id}`);
      btn.closest('.util-card')?.remove();
      showToast('Deleted.', 'info');
    } catch (err) { showToast(err.message, 'error'); btn.disabled = false; }
  }
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

let _selectedFile = null;

function _setupUploadModal() {
  document.getElementById('notes-upload-btn')?.addEventListener('click', () => {
    _selectedFile = null;
    document.getElementById('notes-drop-text').textContent = 'Drop PDF here or click to browse';
    document.getElementById('notes-confirm-modal').disabled = true;
    document.getElementById('notes-upload-error').style.display = 'none';
    document.getElementById('notes-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('notes-close-modal')?.addEventListener('click', _closeModal);
  document.getElementById('notes-cancel-modal')?.addEventListener('click', _closeModal);
  document.getElementById('notes-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'notes-modal') _closeModal();
  });

  const dropzone = document.getElementById('notes-dropzone');
  const fileInput = document.getElementById('notes-file-input');
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) _setFile(f); });
  fileInput?.addEventListener('change', (e) => { if (e.target.files[0]) _setFile(e.target.files[0]); });

  document.getElementById('notes-confirm-modal')?.addEventListener('click', _confirmUpload);
}

function _setFile(file) {
  if (file.type !== 'application/pdf') { showToast('Only PDF files.', 'error'); return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('Max 10 MB.', 'error'); return; }
  _selectedFile = file;
  document.getElementById('notes-drop-text').textContent = `✅ ${file.name} (${fmtBytes(file.size)})`;
  document.getElementById('notes-confirm-modal').disabled = false;
}

function _closeModal() {
  document.getElementById('notes-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _confirmUpload() {
  const title = document.getElementById('notes-title')?.value.trim();
  const subj  = document.getElementById('notes-subject')?.value.trim();
  const dept  = document.getElementById('notes-dept')?.value.trim();
  const sem   = document.getElementById('notes-sem')?.value;
  const desc  = document.getElementById('notes-desc')?.value.trim();
  const errEl = document.getElementById('notes-upload-error');
  errEl.style.display = 'none';

  if (!_selectedFile) { errEl.textContent = 'Please select a PDF.'; errEl.style.display = 'flex'; return; }
  if (!title) { errEl.textContent = 'Title is required.'; errEl.style.display = 'flex'; return; }
  if (!subj)  { errEl.textContent = 'Subject is required.'; errEl.style.display = 'flex'; return; }
  if (!dept)  { errEl.textContent = 'Department is required.'; errEl.style.display = 'flex'; return; }

  const btn = document.getElementById('notes-confirm-modal');
  btn.disabled = true; btn.textContent = 'Uploading…';
  try {
    const path     = `notes/${Date.now()}-${_selectedFile.name.replace(/\s+/g, '_')}`;
    const file_url = await uploadToStorage('notes-files', path, _selectedFile);
    await API.post('/notes', {
      title, subject: subj, department: dept, semester: sem || null,
      description: desc || null, file_url, file_size_bytes: _selectedFile.size,
    });
    _closeModal();
    _reload();
    showToast('Notes uploaded! 📝', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${Icons.upload} Upload`;
  }
}
