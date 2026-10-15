// Campus Wall — PYQ Page
// Browse/search previous year question papers. Upload via Supabase Storage (client-side) + metadata form.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons, fmtBytes, showConfirm } from '../utils.js';
import { uploadToStorage } from '../storage.js';

let _meta = { subjects: [], departments: [], years: [] };
let _page = 1;
let _hasMore = true;
let _loading = false;
let _filters = { subject: '', year: '', exam: '', dept: '' };

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header">
      <h1>📄 Previous Year Questions</h1>
      <button class="btn btn-primary btn-sm" id="pyq-upload-btn">
        ${Icons.upload} Upload
      </button>
    </div>

    <div class="util-filter-bar" id="pyq-filters">
      <div class="search-bar" style="flex:1;min-width:180px;">
        ${Icons.search}
        <input type="search" id="pyq-search" placeholder="Search subject…" aria-label="Search PYQ">
      </div>
      <select id="pyq-year-filter" class="form-input" style="min-width:100px;" aria-label="Filter by year">
        <option value="">All Years</option>
      </select>
      <select id="pyq-exam-filter" class="form-input" style="min-width:110px;" aria-label="Filter by exam type">
        <option value="">All Exams</option>
        <option value="mid">Mid-Term</option>
        <option value="end">End-Term</option>
        <option value="backlog">Backlog</option>
        <option value="other">Other</option>
      </select>
      <select id="pyq-dept-filter" class="form-input" style="min-width:130px;" aria-label="Filter by department">
        <option value="">All Departments</option>
      </select>
    </div>

    <div id="pyq-list" aria-label="PYQ files" aria-busy="true">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>
    <div id="pyq-sentinel" style="height:1px;"></div>

    <!-- Upload Modal -->
    <div class="modal-overlay" id="pyq-upload-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:480px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Upload PYQ</h3>
          <button class="btn btn-ghost btn-icon" id="pyq-close-modal">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <div class="upload-dropzone" id="pyq-dropzone" role="button" tabindex="0">
            <input type="file" id="pyq-file-input" accept=".pdf" style="display:none;">
            <div class="upload-dropzone__icon">📄</div>
            <div class="upload-dropzone__text" id="pyq-drop-text">Drop PDF here or click to browse</div>
            <div class="upload-dropzone__hint">Max 10 MB · PDF only</div>
          </div>
          <div style="display:grid;gap:.75rem;margin-top:.75rem;">
            <div>
              <label class="form-label" for="pyq-title">Title *</label>
              <input type="text" id="pyq-title" class="form-input" placeholder="e.g. Structural Analysis End-Term 2023" style="width:100%;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label class="form-label" for="pyq-subject">Subject *</label>
                <input type="text" id="pyq-subject" class="form-input" placeholder="e.g. Civil Design" style="width:100%;">
              </div>
              <div>
                <label class="form-label" for="pyq-upload-year">Year *</label>
                <input type="number" id="pyq-upload-year" class="form-input" placeholder="${new Date().getFullYear()}" style="width:100%;" min="2000" max="${new Date().getFullYear() + 1}">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
              <div>
                <label class="form-label" for="pyq-exam-type">Exam Type *</label>
                <select id="pyq-exam-type" class="form-input" style="width:100%;">
                  <option value="">Select…</option>
                  <option value="mid">Mid-Term</option>
                  <option value="end">End-Term</option>
                  <option value="backlog">Backlog</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="pyq-dept">Department *</label>
                <input type="text" id="pyq-dept" class="form-input" placeholder="e.g. Civil Engg." style="width:100%;" value="${Auth.getProfile()?.department || ''}">
              </div>
            </div>
          </div>
          <div id="pyq-upload-error" class="alert alert--error" style="display:none;margin-top:.75rem;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="pyq-cancel-upload">Cancel</button>
          <button class="btn btn-primary" id="pyq-confirm-upload" disabled>${Icons.upload} Upload</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _page = 1; _hasMore = true; _loading = false;
  _filters = { subject: '', year: '', exam: '', dept: '' };

  await _loadMeta();
  _setupFilters();
  _setupUploadModal();
  _setupInfiniteScroll();
  await _loadPyq(true);
}

async function _loadMeta() {
  try {
    const { subjects, departments, years } = await API.get('/pyq/meta');
    _meta = { subjects, departments, years };

    const yearSel = document.getElementById('pyq-year-filter');
    years.forEach(y => yearSel.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));

    const deptSel = document.getElementById('pyq-dept-filter');
    departments.forEach(d => deptSel.insertAdjacentHTML('beforeend', `<option value="${escHtml(d)}">${escHtml(d)}</option>`));
  } catch (_) {}
}

function _setupFilters() {
  let searchTimeout;
  document.getElementById('pyq-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { _filters.subject = e.target.value.trim(); _reload(); }, 350);
  });
  document.getElementById('pyq-year-filter')?.addEventListener('change', (e) => { _filters.year = e.target.value; _reload(); });
  document.getElementById('pyq-exam-filter')?.addEventListener('change', (e) => { _filters.exam = e.target.value; _reload(); });
  document.getElementById('pyq-dept-filter')?.addEventListener('change', (e) => { _filters.dept = e.target.value; _reload(); });
}

function _reload() { _page = 1; _hasMore = true; _loading = false; _loadPyq(true); }

function _setupInfiniteScroll() {
  const sentinel = document.getElementById('pyq-sentinel');
  if (!sentinel) return;
  const obs = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting && _hasMore && !_loading) _loadPyq(); },
    { rootMargin: '200px' }
  );
  obs.observe(sentinel);
}

async function _loadPyq(initial = false) {
  if (_loading || !_hasMore) return;
  _loading = true;
  const listEl = document.getElementById('pyq-list');
  if (!listEl) return;

  if (initial) {
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  } else {
    listEl.insertAdjacentHTML('beforeend', '<div class="empty-state" id="pyq-loading-more" style="padding:1rem;"><div class="spinner"></div></div>');
  }

  try {
    const params = new URLSearchParams({ page: _page, limit: 20 });
    if (_filters.subject) params.set('subject', _filters.subject);
    if (_filters.year)    params.set('year',    _filters.year);
    if (_filters.exam)    params.set('exam',    _filters.exam);
    if (_filters.dept)    params.set('dept',    _filters.dept);

    const { data, has_more } = await API.get(`/pyq?${params}`);
    _hasMore = has_more;
    _page++;

    document.getElementById('pyq-loading-more')?.remove();
    listEl.setAttribute('aria-busy', 'false');

    if (initial) {
      listEl.innerHTML = !data?.length
        ? `<div class="empty-state"><div class="empty-state-icon">📂</div><h3>No PYQs found</h3><p class="text-muted">Be the first to upload!</p></div>`
        : data.map(_renderPyqCard).join('');
    } else {
      data?.forEach(f => listEl.insertAdjacentHTML('beforeend', _renderPyqCard(f)));
    }

    _setupPyqActions(listEl);
  } catch (err) {
    document.getElementById('pyq-loading-more')?.remove();
    if (initial) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  } finally {
    _loading = false;
  }
}

function _renderPyqCard(f) {
  const examLabel = { mid: 'Mid-Term', end: 'End-Term', backlog: 'Backlog', other: 'Other' };
  const sizeStr   = f.file_size_bytes ? fmtBytes(f.file_size_bytes) : '';
  const isOwner   = f.uploader_id === Auth.getProfile()?.id;
  const isAdmin   = Auth.isAdmin();
  return `
    <div class="util-card" data-pyq-id="${escHtml(f.id)}">
      <div class="util-card__header">
        <div style="flex:1;">
          <div class="util-card__title">${escHtml(f.title)}</div>
          <div class="util-card__meta">${escHtml(f.subject)} · ${escHtml(String(f.year))} · ${escHtml(examLabel[f.exam_type] || f.exam_type)}</div>
        </div>
        <div style="text-align:right;font-size:.75rem;color:var(--ink-subtle);flex-shrink:0;">
          ${sizeStr ? `<span>${sizeStr}</span><br>` : ''}
          <span>${timeAgo(f.created_at)}</span>
        </div>
      </div>
      <div class="util-card__tags">
        <span class="badge badge--muted">${escHtml(f.department || 'General')}</span>
        ${f.uploader?.full_name ? `<span class="badge badge--accent">By ${escHtml(f.uploader.full_name)}</span>` : ''}
      </div>
      <div class="util-card__actions">
        <a class="btn btn-primary btn-sm" href="${escHtml(f.file_url)}" target="_blank" rel="noopener" download>
          ${Icons.download} Download
        </a>
        ${(isOwner || isAdmin) ? `
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" data-action="delete-pyq" data-id="${escHtml(f.id)}">
            ${Icons.trash} Delete
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function _setupPyqActions(listEl) {
  listEl.removeEventListener('click', _handlePyqClick);
  listEl.addEventListener('click', _handlePyqClick);
}

async function _handlePyqClick(e) {
  const btn = e.target.closest('[data-action="delete-pyq"]');
  if (!btn) return;
  const ok = await showConfirm('Delete this PYQ? This cannot be undone.', 'Delete');
  if (!ok) return;
  btn.disabled = true;
  try {
    await API.delete(`/pyq/${btn.dataset.id}`);
    btn.closest('.util-card')?.remove();
    showToast('PYQ deleted.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

let _selectedFile = null;

function _setupUploadModal() {
  document.getElementById('pyq-upload-btn')?.addEventListener('click', () => {
    _selectedFile = null;
    document.getElementById('pyq-drop-text').textContent = 'Drop PDF here or click to browse';
    document.getElementById('pyq-confirm-upload').disabled = true;
    document.getElementById('pyq-upload-error').style.display = 'none';
    document.getElementById('pyq-upload-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('pyq-close-modal')?.addEventListener('click', _closeUploadModal);
  document.getElementById('pyq-cancel-upload')?.addEventListener('click', _closeUploadModal);
  document.getElementById('pyq-upload-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'pyq-upload-modal') _closeUploadModal();
  });

  const dropzone = document.getElementById('pyq-dropzone');
  const fileInput = document.getElementById('pyq-file-input');
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) _setFile(file);
  });
  fileInput?.addEventListener('change', (e) => { if (e.target.files[0]) _setFile(e.target.files[0]); });

  document.getElementById('pyq-confirm-upload')?.addEventListener('click', _confirmUpload);
}

function _setFile(file) {
  if (file.type !== 'application/pdf') {
    showToast('Only PDF files are allowed.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('File must be under 10 MB.', 'error');
    return;
  }
  _selectedFile = file;
  document.getElementById('pyq-drop-text').textContent = `✅ ${file.name} (${fmtBytes(file.size)})`;
  document.getElementById('pyq-confirm-upload').disabled = false;
}

function _closeUploadModal() {
  document.getElementById('pyq-upload-modal').style.display = 'none';
  document.body.style.overflow = '';
  _selectedFile = null;
}

async function _confirmUpload() {
  const title    = document.getElementById('pyq-title')?.value.trim();
  const subject  = document.getElementById('pyq-subject')?.value.trim();
  const year     = document.getElementById('pyq-upload-year')?.value.trim();
  const examType = document.getElementById('pyq-exam-type')?.value;
  const dept     = document.getElementById('pyq-dept')?.value.trim();
  const errEl    = document.getElementById('pyq-upload-error');
  errEl.style.display = 'none';

  if (!_selectedFile) { errEl.textContent = 'Please select a PDF.'; errEl.style.display = 'flex'; return; }
  if (!title)         { errEl.textContent = 'Title is required.'; errEl.style.display = 'flex'; return; }
  if (!subject)       { errEl.textContent = 'Subject is required.'; errEl.style.display = 'flex'; return; }
  if (!year)          { errEl.textContent = 'Year is required.'; errEl.style.display = 'flex'; return; }
  if (!examType)      { errEl.textContent = 'Exam type is required.'; errEl.style.display = 'flex'; return; }
  if (!dept)          { errEl.textContent = 'Department is required.'; errEl.style.display = 'flex'; return; }

  const btn = document.getElementById('pyq-confirm-upload');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    // Upload file to Supabase Storage
    const path     = `pyq/${Date.now()}-${_selectedFile.name.replace(/\s+/g, '_')}`;
    const file_url = await uploadToStorage('pyq-files', path, _selectedFile);

    // Save metadata
    await API.post('/pyq', {
      title, subject, year: parseInt(year), exam_type: examType,
      department: dept, file_url, file_size_bytes: _selectedFile.size,
    });

    _closeUploadModal();
    _reload();
    showToast('PYQ uploaded successfully! 🎉', 'success');
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${Icons.upload} Upload`;
  }
}
