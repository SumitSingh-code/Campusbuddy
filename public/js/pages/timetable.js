// Campus Wall — Timetable Page
// Shows the current user's personal timetable (or master fallback).
// Editable via JSON slot editor or day/period cell tapping.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, Icons } from '../utils.js';

const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAY_IDX = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };

let _timetable = null; // { id, slots, source }
let _editMode  = false;
let _slots     = [];   // working copy when editing

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
      <h1>🗓️ Timetable</h1>
      <div style="display:flex;gap:.5rem;">
        <button class="btn btn-secondary btn-sm" id="tt-edit-btn">${Icons.edit} Edit</button>
        <button class="btn btn-danger btn-sm" id="tt-clear-btn" style="display:none;">Clear</button>
      </div>
    </div>
    <div id="tt-source-label" class="text-subtle" style="font-size:.8125rem;margin-bottom:.75rem;"></div>
    <div id="tt-grid-wrap">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="tt-edit-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:540px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Edit Timetable</h3>
          <button class="btn btn-ghost btn-icon" id="tt-close-edit">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <p class="text-muted" style="font-size:.8125rem;margin-bottom:.75rem;">
            Click a cell to add a class. Click an existing class to remove it.
          </p>
          <div id="tt-edit-grid" class="timetable-grid" style="min-width:500px;overflow-x:auto;"></div>
          <div id="tt-slot-form" style="display:none;margin-top:.75rem;padding:.75rem;background:var(--bg-muted);border-radius:var(--r-lg);">
            <div id="tt-slot-label" style="font-size:.8125rem;color:var(--ink-muted);margin-bottom:.5rem;"></div>
            <div style="display:flex;gap:.5rem;">
              <input type="text" id="tt-slot-subject" class="form-input" placeholder="Subject (e.g. Math 101)" style="flex:1;">
              <input type="text" id="tt-slot-room" class="form-input" placeholder="Room (optional)" style="width:80px;">
              <button class="btn btn-primary btn-sm" id="tt-slot-add">Add</button>
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="tt-cancel-edit">Cancel</button>
          <button class="btn btn-primary" id="tt-save-edit">💾 Save Timetable</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _timetable = null;
  _editMode  = false;
  _slots     = [];

  document.getElementById('tt-edit-btn')?.addEventListener('click', _openEditModal);
  document.getElementById('tt-clear-btn')?.addEventListener('click', _clearTimetable);
  document.getElementById('tt-close-edit')?.addEventListener('click', _closeEditModal);
  document.getElementById('tt-cancel-edit')?.addEventListener('click', _closeEditModal);
  document.getElementById('tt-save-edit')?.addEventListener('click', _saveTimetable);
  document.getElementById('tt-edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'tt-edit-modal') _closeEditModal();
  });

  await _loadTimetable();
}

async function _loadTimetable() {
  try {
    const { data, source } = await API.get('/timetable/mine');
    _timetable = data ? { ...data, source } : null;

    const sourceLabel = document.getElementById('tt-source-label');
    if (sourceLabel) {
      if (!data) sourceLabel.textContent = 'No timetable set yet. Click Edit to add yours.';
      else if (source === 'master') sourceLabel.textContent = `Showing department timetable for ${data.department || 'your dept'}${data.semester ? ` · Semester ${data.semester}` : ''}`;
      else sourceLabel.textContent = `Your personal timetable${data.semester ? ` · Semester ${data.semester}` : ''}`;
    }

    document.getElementById('tt-clear-btn').style.display = (data && source === 'personal') ? 'inline-flex' : 'none';

    _renderGrid('tt-grid-wrap', data?.slots || [], false);
  } catch (err) {
    const wrap = document.getElementById('tt-grid-wrap');
    if (wrap) wrap.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  }
}

function _renderGrid(containerId, slots, editable) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const today = new Date().getDay(); // 0=Sun
  const slotMap = {};
  slots.forEach(s => { slotMap[`${s.day}-${s.period}`] = s; });

  let html = '';
  // Header row: empty corner + days
  html += `<div class="timetable-cell timetable-cell--header"></div>`;
  DAYS.forEach(d => {
    const isToday = DAY_IDX[d] === today;
    html += `<div class="timetable-cell timetable-cell--header ${isToday ? 'timetable-cell--today' : ''}">${d}</div>`;
  });

  // Period rows
  PERIODS.forEach(p => {
    html += `<div class="timetable-cell timetable-cell--time">P${p}</div>`;
    DAYS.forEach(d => {
      const key   = `${d}-${p}`;
      const entry = slotMap[key];
      const isToday = DAY_IDX[d] === today;
      if (entry) {
        html += `<div class="timetable-cell timetable-cell--class ${isToday ? 'timetable-cell--today' : ''}"
          ${editable ? `data-action="tt-remove" data-day="${d}" data-period="${p}" style="cursor:pointer;text-decoration:underline dotted;"` : ''}>
          <div>${escHtml(entry.subject)}</div>
          ${entry.room ? `<div style="font-size:9px;color:var(--ink-subtle);">${escHtml(entry.room)}</div>` : ''}
        </div>`;
      } else {
        html += `<div class="timetable-cell ${isToday ? 'timetable-cell--today' : ''}"
          ${editable ? `data-action="tt-add" data-day="${d}" data-period="${p}" style="cursor:pointer;color:var(--ink-subtle);" title="Add class">${Icons.plus}` : ''}</div>`;
      }
    });
  });

  container.innerHTML = `<div class="timetable-grid" style="min-width:420px;">${html}</div>`;

  if (editable) {
    container.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-action]');
      if (!cell) return;
      const day    = cell.dataset.day;
      const period = parseInt(cell.dataset.period);
      if (cell.dataset.action === 'tt-add')    _showSlotForm(day, period);
      if (cell.dataset.action === 'tt-remove') _removeSlot(day, period);
    });
  }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

let _editDay = null, _editPeriod = null;

function _openEditModal() {
  _slots = _timetable ? JSON.parse(JSON.stringify(_timetable.slots || [])) : [];
  _renderGrid('tt-edit-grid', _slots, true);
  document.getElementById('tt-slot-form').style.display = 'none';
  document.getElementById('tt-edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function _closeEditModal() {
  document.getElementById('tt-edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  _editDay = null; _editPeriod = null;
}

function _showSlotForm(day, period) {
  _editDay = day; _editPeriod = period;
  const form  = document.getElementById('tt-slot-form');
  const label = document.getElementById('tt-slot-label');
  label.textContent = `${day} · Period ${period}`;
  document.getElementById('tt-slot-subject').value = '';
  document.getElementById('tt-slot-room').value    = '';
  form.style.display = 'block';
  document.getElementById('tt-slot-subject').focus();

  document.getElementById('tt-slot-add').onclick = () => {
    const subject = document.getElementById('tt-slot-subject').value.trim();
    const room    = document.getElementById('tt-slot-room').value.trim();
    if (!subject) { showToast('Enter a subject name.', 'error'); return; }
    // Remove existing slot for this cell
    _slots = _slots.filter(s => !(s.day === day && s.period === period));
    _slots.push({ day, period, subject, room: room || null });
    form.style.display = 'none';
    _renderGrid('tt-edit-grid', _slots, true);
  };

  document.getElementById('tt-slot-subject').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('tt-slot-add').click();
  };
}

function _removeSlot(day, period) {
  _slots = _slots.filter(s => !(s.day === day && s.period === period));
  document.getElementById('tt-slot-form').style.display = 'none';
  _renderGrid('tt-edit-grid', _slots, true);
}

async function _saveTimetable() {
  const btn = document.getElementById('tt-save-edit');
  btn.disabled = true;
  try {
    const { data } = await API.put('/timetable/mine', { slots: _slots });
    _timetable = { ...data, source: 'personal' };
    _closeEditModal();
    await _loadTimetable();
    showToast('Timetable saved! 🗓️', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function _clearTimetable() {
  if (!confirm('Clear your personal timetable? The department master timetable (if any) will be shown instead.')) return;
  try {
    await API.delete('/timetable/mine');
    _timetable = null;
    await _loadTimetable();
    showToast('Timetable cleared.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
