// Campus Wall — Admin Panel Page
// 6-tab interface: Dashboard | Signups | Reports | Users | Resets | Admins*
// *Admins tab visible to super_admin only.
// Client-side guard: redirects to /feed if not admin.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, timeAgo, Icons } from '../utils.js';

// ─── State ────────────────────────────────────────────────────────────────────
let _activeTab    = 'dashboard';
let _isSuperAdmin = false;

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="admin-page" id="admin-page">
      <!-- Sidebar / Tab Bar -->
      <nav class="admin-sidebar" id="admin-sidebar" aria-label="Admin sections">
        <button class="admin-tab-btn active" data-tab="dashboard">
          <span>📊</span><span>Dashboard</span>
        </button>
        <button class="admin-tab-btn" data-tab="signups">
          <span>👥</span><span>Signups</span>
          <span class="admin-tab-badge" id="tab-badge-signups" style="display:none;"></span>
        </button>
        <button class="admin-tab-btn" data-tab="reports">
          <span>🚩</span><span>Reports</span>
          <span class="admin-tab-badge" id="tab-badge-reports" style="display:none;"></span>
        </button>
        <button class="admin-tab-btn" data-tab="users">
          <span>👤</span><span>Users</span>
        </button>
        <button class="admin-tab-btn" data-tab="resets">
          <span>🔑</span><span>Resets</span>
          <span class="admin-tab-badge" id="tab-badge-resets" style="display:none;"></span>
        </button>
        <button class="admin-tab-btn" data-tab="admins" id="admins-tab-btn" style="display:none;">
          <span>⚙️</span><span>Admins</span>
        </button>
        <button class="admin-tab-btn" data-tab="branding">
          <span>🖼️</span><span>Branding</span>
        </button>
      </nav>

      <!-- Tab content -->
      <div class="admin-content-area" id="admin-content">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Reject User Modal -->
    <div class="modal-overlay" id="reject-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:400px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Reject Signup</h3>
          <button class="btn btn-ghost btn-icon" id="close-reject-modal">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <label class="form-label" for="reject-reason-input">Reason (optional — for internal record)</label>
          <input type="text" id="reject-reason-input" class="form-input" placeholder="Duplicate account, invalid info, etc." style="width:100%;">
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-reject-btn">Cancel</button>
          <button class="btn btn-danger" id="confirm-reject-btn">Reject &amp; Delete Account</button>
        </div>
      </div>
    </div>

    <!-- Temp Password Modal (resolve reset) -->
    <div class="modal-overlay" id="temp-pw-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:400px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Set Temporary Password</h3>
          <button class="btn btn-ghost btn-icon" id="close-temp-pw-modal">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <p class="text-muted" style="font-size:.8125rem;margin-bottom:.75rem;">
            User will be required to change this on next login.
          </p>
          <label class="form-label" for="temp-pw-input">Temporary Password</label>
          <input type="text" id="temp-pw-input" class="form-input" placeholder="Min 8 chars, 1 letter + 1 number" style="width:100%;"
            autocomplete="new-password">
          <div id="temp-pw-error" class="alert alert--error" style="display:none;margin-top:.5rem;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-temp-pw-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-temp-pw-btn">Set Password &amp; Resolve</button>
        </div>
      </div>
    </div>

    <!-- Promote Admin Modal -->
    <div class="modal-overlay" id="promote-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:380px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Set Admin Role</h3>
          <button class="btn btn-ghost btn-icon" id="close-promote-modal">${Icons.x}</button>
        </div>
        <div class="modal__body">
          <p class="text-muted" style="font-size:.8125rem;margin-bottom:.75rem;" id="promote-modal-desc"></p>
          <label class="form-label">New Role</label>
          <select id="promote-role-select" class="form-input" style="width:100%;">
            <option value="moderator">Moderator</option>
            <option value="super_admin">Super Admin</option>
            <option value="student">Student (demote)</option>
          </select>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-promote-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-promote-btn">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  // Client-side guard
  if (!Auth.isAdmin()) { window.location.hash = '/feed'; return; }
  _isSuperAdmin = Auth.isSuperAdmin();

  if (_isSuperAdmin) {
    document.getElementById('admins-tab-btn').style.display = 'flex';
  }

  _setupTabNav();
  _setupModals();
  await _switchTab('dashboard');
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────

function _setupTabNav() {
  document.getElementById('admin-sidebar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) _switchTab(btn.dataset.tab);
  });
}

async function _switchTab(tab) {
  _activeTab = tab;

  // Update active button
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  // Load content
  const content = document.getElementById('admin-content');
  content.innerHTML = '<div class="empty-state" style="padding:3rem;"><div class="spinner"></div></div>';

  try {
    switch (tab) {
      case 'dashboard': await _loadDashboard(); break;
      case 'signups':   await _loadSignups();   break;
      case 'reports':   await _loadReports();   break;
      case 'users':     await _loadUsers();     break;
      case 'resets':    await _loadResets();    break;
      case 'admins':    await _loadAdmins();    break;
      case 'branding':  await _loadBranding();  break;
    }
  } catch (err) {
    content.innerHTML = `<div class="alert alert--error" style="margin:1.5rem;">${escHtml(err.message)}</div>`;
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function _loadDashboard() {
  const { data: stats } = await API.get('/admin/stats');
  const content = document.getElementById('admin-content');

  // Update tab badges
  _setBadge('signups', stats.pending_signups);
  _setBadge('reports', stats.open_reports);
  _setBadge('resets',  stats.open_reset_requests);

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>Dashboard</h2>
      <span class="text-subtle" style="font-size:.8125rem;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
    </div>

    <div class="stats-grid">
      ${_statCard('👥', 'Pending Signups', stats.pending_signups, 'accent', () => _switchTab('signups'))}
      ${_statCard('🚩', 'Open Reports',    stats.open_reports,   'danger', () => _switchTab('reports'))}
      ${_statCard('🔑', 'Reset Requests',  stats.open_reset_requests, 'warning', () => _switchTab('resets'))}
      ${_statCard('🎓', 'Total Students',  stats.total_users,    '')}
      ${_statCard('✅', 'Active Students', stats.active_users,   'success')}
    </div>

    <div class="admin-quick-actions">
      <h3 style="font-size:.875rem;font-family:var(--font-heading);color:var(--ink-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem;">Quick Actions</h3>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" data-quick="signups">
          Review Signups ${stats.pending_signups > 0 ? `(${stats.pending_signups})` : ''}
        </button>
        <button class="btn btn-secondary btn-sm" data-quick="reports">
          View Reports ${stats.open_reports > 0 ? `(${stats.open_reports})` : ''}
        </button>
        <button class="btn btn-secondary btn-sm" data-quick="resets">
          Resolve Resets ${stats.open_reset_requests > 0 ? `(${stats.open_reset_requests})` : ''}
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.quick));
  });
  content.querySelectorAll('[data-stat-tab]').forEach(card => {
    card.addEventListener('click', () => _switchTab(card.dataset.statTab));
  });
}

function _statCard(icon, label, value, color = '', onClick = null) {
  const colorClass = color ? `stat-card--${color}` : '';
  const clickable  = onClick ? 'style="cursor:pointer;"' : '';
  const tabAttr    = onClick ? `data-stat-tab="..."` : '';
  return `
    <div class="stat-card ${colorClass}" ${clickable}>
      <div class="stat-card__icon">${icon}</div>
      <div class="stat-card__value">${value ?? '–'}</div>
      <div class="stat-card__label">${label}</div>
    </div>
  `;
}

function _setBadge(tab, count) {
  const el = document.getElementById(`tab-badge-${tab}`);
  if (!el) return;
  if (count > 0) { el.textContent = count; el.style.display = 'flex'; }
  else { el.style.display = 'none'; }
}

// ─── Pending Signups ──────────────────────────────────────────────────────────

async function _loadSignups() {
  const { data } = await API.get('/admin/pending-signups');
  const content  = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>Pending Signups</h2>
      <span class="text-subtle" style="font-size:.8125rem;">${data?.length ?? 0} awaiting approval</span>
    </div>
    <div id="signups-list">
      ${!data?.length ? `
        <div class="empty-state" style="padding:3rem;">
          <div class="empty-state-icon">✅</div>
          <h3>All clear!</h3>
          <p class="text-muted">No pending signups.</p>
        </div>
      ` : data.map(_signupRow).join('')}
    </div>
  `;

  // Event delegation
  content.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-signup-action]');
    if (!btn) return;
    const { signupAction, userId } = btn.dataset;
    if (signupAction === 'approve') await _approveUser(userId, btn);
    if (signupAction === 'reject')  _openRejectModal(userId);
  });
}

function _signupRow(u) {
  const provider = u.auth_provider === 'google'
    ? '<span class="badge badge--muted">Google</span>'
    : '<span class="badge badge--muted">Email</span>';
  return `
    <div class="signup-row" id="signup-row-${escHtml(u.id)}">
      <div class="signup-row__info">
        <div class="signup-row__name">${escHtml(u.full_name)}</div>
        <div class="signup-row__meta">
          <span class="font-mono">${escHtml(u.roll_number)}</span> ·
          ${escHtml(u.department)} ·
          <span class="font-mono">${escHtml(u.phone_number)}</span>
          ${u.email ? ` · ${escHtml(u.email)}` : ''}
          · ${provider}
        </div>
        <div class="signup-row__time text-subtle">Applied ${timeAgo(u.created_at)}</div>
      </div>
      <div class="signup-row__actions">
        <button class="btn btn-sm" style="background:var(--success);color:#fff;"
          data-signup-action="approve" data-user-id="${escHtml(u.id)}" aria-label="Approve ${escHtml(u.full_name)}">
          ✅ Approve
        </button>
        <button class="btn btn-danger btn-sm"
          data-signup-action="reject" data-user-id="${escHtml(u.id)}" aria-label="Reject ${escHtml(u.full_name)}">
          ❌ Reject
        </button>
      </div>
    </div>
  `;
}

async function _approveUser(userId, btn) {
  if (!confirm('Approve this signup?')) return;
  btn.disabled = true;
  try {
    await API.patch(`/admin/users/${userId}/approve`);
    document.getElementById(`signup-row-${userId}`)?.remove();
    const badge = document.getElementById('tab-badge-signups');
    if (badge) {
      const cur = parseInt(badge.textContent) || 0;
      if (cur <= 1) badge.style.display = 'none';
      else badge.textContent = cur - 1;
    }
    showToast('Signup approved ✅', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// Reject modal state
let _rejectTargetId = null;

function _openRejectModal(userId) {
  _rejectTargetId = userId;
  document.getElementById('reject-reason-input').value = '';
  document.getElementById('reject-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function _closeRejectModal() {
  document.getElementById('reject-modal').style.display = 'none';
  document.body.style.overflow = '';
  _rejectTargetId = null;
}

async function _confirmReject() {
  if (!_rejectTargetId) return;
  const reason = document.getElementById('reject-reason-input').value.trim();
  const btn    = document.getElementById('confirm-reject-btn');
  btn.disabled = true;
  try {
    await API.patch(`/admin/users/${_rejectTargetId}/reject`, { reason });
    document.getElementById(`signup-row-${_rejectTargetId}`)?.remove();
    const badge = document.getElementById('tab-badge-signups');
    if (badge) {
      const cur = parseInt(badge.textContent) || 0;
      if (cur <= 1) badge.style.display = 'none';
      else badge.textContent = cur - 1;
    }
    _closeRejectModal();
    showToast('Signup rejected.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  } finally { btn.disabled = false; }
}

// ─── Reports Queue ────────────────────────────────────────────────────────────

async function _loadReports() {
  const { data, total } = await API.get('/reports?status=open&limit=30');
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>Open Reports</h2>
      <span class="text-subtle" style="font-size:.8125rem;">${total ?? 0} open</span>
    </div>
    <div id="reports-list">
      ${!data?.length ? `
        <div class="empty-state" style="padding:3rem;">
          <div class="empty-state-icon">🎉</div>
          <h3>No open reports!</h3>
          <p class="text-muted">The community is behaving.</p>
        </div>
      ` : data.map(_reportCard).join('')}
    </div>
  `;

  content.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-report-action]');
    if (!btn) return;
    const { reportAction, reportId } = btn.dataset;
    if (reportAction === 'dismiss')        await _dismissReport(reportId, btn);
    if (reportAction === 'delete-content') await _deleteReportContent(reportId, btn);
    if (reportAction === 'warn-user')      await _warnReportUser(reportId, btn);
  });
}

function _reportCard(r) {
  const typeLabel = r.ref_type.replace('_', ' ');
  const deleted   = r.is_content_deleted;
  return `
    <div class="report-card" id="report-card-${escHtml(r.id)}">
      <div class="report-card__header">
        <div>
          <span class="badge badge--${r.ref_type.includes('anon') ? 'muted' : 'accent'}" style="text-transform:capitalize;">
            ${escHtml(typeLabel)}
          </span>
          <span class="text-subtle" style="font-size:.75rem;margin-left:.5rem;">${timeAgo(r.created_at)}</span>
        </div>
        ${deleted ? `<span class="badge badge--muted">Already deleted</span>` : ''}
      </div>

      <div class="report-card__reason">
        <strong>Reason:</strong> ${escHtml(r.reason)}
      </div>

      <div class="report-card__preview ${deleted ? 'report-card__preview--deleted' : ''}">
        ${escHtml(r.content_preview || '[Content unavailable]')}
      </div>

      ${r.reporter ? `
        <div class="report-card__reporter text-subtle">
          Reported by: ${escHtml(r.reporter.full_name)} (${escHtml(r.reporter.roll_number)})
        </div>
      ` : ''}

      <div class="report-card__actions">
        <button class="btn btn-ghost btn-sm" data-report-action="dismiss" data-report-id="${escHtml(r.id)}">
          Dismiss
        </button>
        ${!deleted ? `
          <button class="btn btn-ghost btn-sm" style="color:var(--ink-muted);"
            data-report-action="warn-user" data-report-id="${escHtml(r.id)}">
            ⚠️ Warn Author
          </button>
          <button class="btn btn-danger btn-sm" data-report-action="delete-content" data-report-id="${escHtml(r.id)}">
            🗑️ Delete Content
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

async function _dismissReport(reportId, btn) {
  if (!confirm('Dismiss this report? No action will be taken on the content.')) return;
  btn.disabled = true;
  try {
    await API.patch(`/reports/${reportId}/dismiss`);
    document.getElementById(`report-card-${reportId}`)?.remove();
    showToast('Report dismissed.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function _deleteReportContent(reportId, btn) {
  if (!confirm('Delete the reported content? This will notify the author and remove the post/comment.')) return;
  btn.disabled = true;
  try {
    await API.patch(`/reports/${reportId}/delete-content`);
    document.getElementById(`report-card-${reportId}`)?.remove();
    showToast('Content deleted and report closed.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

async function _warnReportUser(reportId, btn) {
  if (!confirm('Send a community guidelines warning to the content author?')) return;
  btn.disabled = true;
  try {
    await API.patch(`/reports/${reportId}/warn-user`);
    document.getElementById(`report-card-${reportId}`)?.remove();
    showToast('Warning sent to author. Report closed.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

let _userSearchTimeout = null;

async function _loadUsers(q = '', status = '', page = 1) {
  const content = document.getElementById('admin-content');
  const params  = new URLSearchParams({ limit: 20, page });
  if (q)      params.set('q', q);
  if (status) params.set('status', status);

  const { data, total, has_more } = await API.get(`/admin/users?${params}`);

  if (!document.getElementById('users-search-bar')) {
    // First load — render the full shell
    content.innerHTML = `
      <div class="admin-section-header">
        <h2>User Management</h2>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;">
        <div class="search-bar" style="flex:1;min-width:200px;">
          ${Icons.search}
          <input type="search" id="users-search-bar" placeholder="Search by name or roll number…" value="${escHtml(q)}" aria-label="Search users">
        </div>
        <select id="users-status-filter" class="form-input" style="min-width:140px;">
          <option value="">All statuses</option>
          <option value="active" ${status==='active'?'selected':''}>Active</option>
          <option value="pending" ${status==='pending'?'selected':''}>Pending</option>
          <option value="suspended" ${status==='suspended'?'selected':''}>Suspended</option>
          <option value="banned" ${status==='banned'?'selected':''}>Banned</option>
        </select>
      </div>
      <div id="users-table-wrap"></div>
      <div id="users-load-more-wrap" style="text-align:center;padding:1rem;"></div>
    `;

    document.getElementById('users-search-bar')?.addEventListener('input', (e) => {
      clearTimeout(_userSearchTimeout);
      _userSearchTimeout = setTimeout(() => {
        _loadUsers(e.target.value.trim(), document.getElementById('users-status-filter').value);
      }, 350);
    });

    document.getElementById('users-status-filter')?.addEventListener('change', (e) => {
      _loadUsers(document.getElementById('users-search-bar').value.trim(), e.target.value);
    });

    content.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-user-action]');
      if (!btn) return;
      const { userAction, userId } = btn.dataset;
      if (userAction === 'ban')      await _changeUserStatus(userId, 'ban');
      if (userAction === 'suspend')  await _changeUserStatus(userId, 'suspend');
      if (userAction === 'activate') await _changeUserStatus(userId, 'activate');
    });
  }

  // Render user rows into table
  const wrap = document.getElementById('users-table-wrap');
  const lmWrap = document.getElementById('users-load-more-wrap');
  if (!wrap) return;

  wrap.innerHTML = !data?.length
    ? `<div class="empty-state" style="padding:2rem;"><p class="text-muted">No users found.</p></div>`
    : `<div class="user-table">${data.map(_userTableRow).join('')}</div>
       <div class="text-subtle" style="font-size:.75rem;text-align:right;padding:.5rem 0;">${total} total users</div>`;

  lmWrap.innerHTML = has_more
    ? `<button class="btn btn-secondary btn-sm" id="users-load-more">Load more</button>`
    : '';

  document.getElementById('users-load-more')?.addEventListener('click', () => {
    _loadUsers(q, status, page + 1);
  });
}

function _userTableRow(u) {
  const statusMap = {
    active:    'success',
    pending:   'accent',
    suspended: 'warning',
    banned:    'danger',
    rejected:  'danger',
  };
  const roleMap = {
    student:    '',
    moderator:  'accent',
    super_admin: 'danger',
  };
  return `
    <div class="user-row" id="user-row-${escHtml(u.id)}">
      <div class="user-row__info" style="flex:1;">
        <div class="user-row__name">
          ${escHtml(u.full_name)}
          ${u.role !== 'student' ? `<span class="badge badge--${roleMap[u.role]||''}" style="margin-left:.25rem;font-size:10px;">${escHtml(u.role.replace('_',' '))}</span>` : ''}
        </div>
        <div class="user-row__meta">
          ${escHtml(u.roll_number)} · ${escHtml(u.department)} ·
          <span class="badge badge--${statusMap[u.status]||''}">${escHtml(u.status)}</span>
        </div>
        <div class="user-row__meta" style="margin-top:2px;">
          ${escHtml(u.phone_number)} · ${u.auth_provider === 'google' ? 'Google' : 'Email'}
          · Karma: ${u.karma ?? 0} · Posts: ${u.posts_count ?? 0}
        </div>
      </div>
      <div class="user-row__actions">
        ${u.status !== 'banned' ? `
          <button class="btn btn-danger btn-sm" data-user-action="ban" data-user-id="${escHtml(u.id)}">Ban</button>
        ` : ''}
        ${u.status === 'active' ? `
          <button class="btn btn-secondary btn-sm" data-user-action="suspend" data-user-id="${escHtml(u.id)}">Suspend</button>
        ` : ''}
        ${u.status !== 'active' ? `
          <button class="btn btn-sm" style="background:var(--success);color:#fff;" data-user-action="activate" data-user-id="${escHtml(u.id)}">Activate</button>
        ` : ''}
      </div>
    </div>
  `;
}

async function _changeUserStatus(userId, action) {
  const labels = { ban: 'ban', suspend: 'suspend', activate: 'activate' };
  if (!confirm(`${labels[action]} this user?`)) return;
  try {
    await API.patch(`/admin/users/${userId}/${action}`);
    showToast(`User ${action}d.`, 'success');
    // Refresh current user row
    const row = document.getElementById(`user-row-${userId}`);
    if (row) {
      const q = document.getElementById('users-search-bar')?.value || '';
      const s = document.getElementById('users-status-filter')?.value || '';
      await _loadUsers(q, s);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Password Resets ──────────────────────────────────────────────────────────

async function _loadResets() {
  const { data } = await API.get('/admin/reset-requests?status=pending');
  const content  = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>Password Reset Requests</h2>
      <span class="text-subtle" style="font-size:.8125rem;">${data?.length ?? 0} pending</span>
    </div>
    <div id="resets-list">
      ${!data?.length ? `
        <div class="empty-state" style="padding:3rem;">
          <div class="empty-state-icon">✅</div>
          <h3>No pending resets.</h3>
        </div>
      ` : data.map(_resetRow).join('')}
    </div>
  `;

  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reset-action]');
    if (!btn) return;
    const { resetAction, resetId } = btn.dataset;
    if (resetAction === 'resolve') _openTempPwModal(resetId);
    if (resetAction === 'reject')  _rejectReset(resetId, btn);
  });
}

function _resetRow(r) {
  return `
    <div class="signup-row" id="reset-row-${escHtml(r.id)}">
      <div class="signup-row__info">
        <div class="signup-row__name" style="font-family:var(--font-mono);">${escHtml(r.roll_number)}</div>
        <div class="signup-row__meta">Phone: <span class="font-mono">${escHtml(r.phone_number)}</span></div>
        <div class="signup-row__time text-subtle">Requested ${timeAgo(r.requested_at)}</div>
      </div>
      <div class="signup-row__actions">
        <button class="btn btn-primary btn-sm" data-reset-action="resolve" data-reset-id="${escHtml(r.id)}">
          🔑 Set Password
        </button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" data-reset-action="reject" data-reset-id="${escHtml(r.id)}">
          Reject
        </button>
      </div>
    </div>
  `;
}

let _resetTargetId = null;

function _openTempPwModal(resetId) {
  _resetTargetId = resetId;
  document.getElementById('temp-pw-input').value  = '';
  document.getElementById('temp-pw-error').style.display = 'none';
  document.getElementById('temp-pw-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('temp-pw-input')?.focus(), 100);
}

function _closeTempPwModal() {
  document.getElementById('temp-pw-modal').style.display = 'none';
  document.body.style.overflow = '';
  _resetTargetId = null;
}

async function _confirmTempPw() {
  if (!_resetTargetId) return;
  const pw  = document.getElementById('temp-pw-input').value.trim();
  const err = document.getElementById('temp-pw-error');
  err.style.display = 'none';

  if (!pw || pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    err.textContent   = 'Password must be at least 8 chars with at least 1 letter and 1 number.';
    err.style.display = 'flex';
    return;
  }

  const btn = document.getElementById('confirm-temp-pw-btn');
  btn.disabled = true;
  try {
    await API.post(`/admin/reset-requests/${_resetTargetId}/resolve`, { temp_password: pw });
    document.getElementById(`reset-row-${_resetTargetId}`)?.remove();
    _closeTempPwModal();
    showToast('Password set. User will be prompted to change it on next login.', 'success', 5000);
  } catch (error) {
    err.textContent   = error.message;
    err.style.display = 'flex';
  } finally {
    btn.disabled = false;
  }
}

async function _rejectReset(resetId, btn) {
  if (!confirm('Reject this password reset request?')) return;
  btn.disabled = true;
  try {
    await API.patch(`/admin/reset-requests/${resetId}/reject`);
    document.getElementById(`reset-row-${resetId}`)?.remove();
    showToast('Reset request rejected.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

// ─── Admin Accounts (super_admin only) ───────────────────────────────────────

async function _loadAdmins() {
  if (!_isSuperAdmin) {
    document.getElementById('admin-content').innerHTML = `
      <div class="empty-state" style="padding:3rem;"><p class="text-muted">Access restricted to Super Admin.</p></div>
    `;
    return;
  }

  const { data } = await API.get('/admin/admins');
  const me = Auth.getProfile();
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>Admin Accounts</h2>
    </div>
    <div style="margin-bottom:1rem;">
      <p class="text-muted" style="font-size:.8125rem;">
        To promote a student to admin/moderator, go to Users tab, search for them, then use the promote action.
      </p>
    </div>
    <div id="admins-list">
      ${!data?.length ? `<div class="empty-state" style="padding:2rem;"><p class="text-muted">No admins found.</p></div>`
        : data.map(a => _adminRow(a, a.id === me?.id)).join('')}
    </div>
  `;

  // Add promote action to users tab too — for now, simple button in admins list
  content.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-admin-action]');
    if (!btn) return;
    const { adminAction, adminId } = btn.dataset;
    if (adminAction === 'change-role') _openPromoteModal(adminId, btn.dataset.adminName);
    if (adminAction === 'demote')      await _demoteAdmin(adminId);
  });
}

function _adminRow(a, isSelf) {
  const roleColor = a.role === 'super_admin' ? 'danger' : 'accent';
  return `
    <div class="user-row" id="admin-row-${escHtml(a.id)}">
      <div class="user-row__info" style="flex:1;">
        <div class="user-row__name">
          ${escHtml(a.full_name)}
          ${isSelf ? '<span class="badge badge--muted" style="font-size:10px;">You</span>' : ''}
        </div>
        <div class="user-row__meta">
          ${escHtml(a.roll_number)} · ${escHtml(a.department)} ·
          <span class="badge badge--${roleColor}">${escHtml(a.role.replace('_', ' '))}</span> ·
          <span class="badge badge--${a.status === 'active' ? 'success' : 'danger'}">${escHtml(a.status)}</span>
        </div>
        <div class="user-row__meta text-subtle">Joined ${timeAgo(a.created_at)}</div>
      </div>
      ${!isSelf ? `
        <div class="user-row__actions">
          <button class="btn btn-secondary btn-sm"
            data-admin-action="change-role"
            data-admin-id="${escHtml(a.id)}"
            data-admin-name="${escHtml(a.full_name)}">
            Change Role
          </button>
          <button class="btn btn-danger btn-sm"
            data-admin-action="demote"
            data-admin-id="${escHtml(a.id)}">
            Demote to Student
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

let _promoteTargetId = null;

function _openPromoteModal(adminId, adminName) {
  _promoteTargetId = adminId;
  document.getElementById('promote-modal-desc').textContent = `Change role for: ${adminName}`;
  document.getElementById('promote-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function _closePromoteModal() {
  document.getElementById('promote-modal').style.display = 'none';
  document.body.style.overflow = '';
  _promoteTargetId = null;
}

async function _confirmPromote() {
  if (!_promoteTargetId) return;
  const role = document.getElementById('promote-role-select').value;
  const btn  = document.getElementById('confirm-promote-btn');
  btn.disabled = true;
  try {
    if (role === 'student') {
      await API.patch(`/admin/admins/${_promoteTargetId}/demote`);
    } else {
      await API.post('/admin/admins', { user_id: _promoteTargetId, role });
    }
    _closePromoteModal();
    await _loadAdmins();
    showToast('Role updated.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function _demoteAdmin(adminId) {
  if (!confirm('Demote this admin to student? They will lose all admin access.')) return;
  try {
    await API.patch(`/admin/admins/${adminId}/demote`);
    document.getElementById(`admin-row-${adminId}`)?.remove();
    showToast('Admin demoted to student.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Modal Setup ──────────────────────────────────────────────────────────────

function _setupModals() {
  // Reject modal
  document.getElementById('close-reject-modal')?.addEventListener('click', _closeRejectModal);
  document.getElementById('cancel-reject-btn')?.addEventListener('click', _closeRejectModal);
  document.getElementById('confirm-reject-btn')?.addEventListener('click', _confirmReject);
  document.getElementById('reject-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'reject-modal') _closeRejectModal();
  });

  // Temp PW modal
  document.getElementById('close-temp-pw-modal')?.addEventListener('click', _closeTempPwModal);
  document.getElementById('cancel-temp-pw-btn')?.addEventListener('click', _closeTempPwModal);
  document.getElementById('confirm-temp-pw-btn')?.addEventListener('click', _confirmTempPw);
  document.getElementById('temp-pw-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'temp-pw-modal') _closeTempPwModal();
  });
  document.getElementById('temp-pw-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _confirmTempPw();
  });

  // Promote modal
  document.getElementById('close-promote-modal')?.addEventListener('click', _closePromoteModal);
  document.getElementById('cancel-promote-btn')?.addEventListener('click', _closePromoteModal);
  document.getElementById('confirm-promote-btn')?.addEventListener('click', _confirmPromote);
  document.getElementById('promote-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'promote-modal') _closePromoteModal();
  });
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

async function _loadBranding() {
  const content = document.getElementById('admin-content');

  // Fetch current cover URL
  let currentCover = '';
  try {
    const res  = await fetch('/api/config');
    const json = await res.json();
    currentCover = json.data?.profile_cover_url || '';
  } catch (_) {}

  content.innerHTML = `
    <div class="admin-section-header">
      <h2>🖼️ Branding</h2>
      <span class="text-subtle" style="font-size:.8125rem;">Global profile cover photo</span>
    </div>

    <div style="max-width:600px;padding:0 var(--s4) var(--s4);">

      <!-- Current Cover Preview -->
      <div style="margin-bottom:1.25rem;">
        <div class="form-label" style="margin-bottom:.5rem;">Current Cover Photo</div>
        <div id="branding-cover-preview" style="
          width:100%;
          height:140px;
          border-radius:12px;
          background:${currentCover
            ? `url('${escHtml(currentCover)}') center/cover no-repeat`
            : 'linear-gradient(135deg, var(--ink-navy) 0%, #2a3a6e 100%)'};
          border:1.5px solid var(--border);
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
          overflow:hidden;
        ">
          ${!currentCover ? `<span style="color:var(--ink-subtle);font-size:.8125rem;">No cover photo set — default gradient shown</span>` : ''}
        </div>
        ${currentCover ? `<p style="font-size:.75rem;color:var(--ink-subtle);margin-top:.4rem;word-break:break-all;">${escHtml(currentCover)}</p>` : ''}
      </div>

      <!-- Upload New Cover -->
      <div class="card" style="padding:1.25rem;">
        <div class="form-label">Upload New Cover Photo</div>
        <p style="font-size:.8125rem;color:var(--ink-subtle);margin:.25rem 0 1rem;">
          Accepted: JPG, PNG, WebP &nbsp;·&nbsp; Max size: 2MB &nbsp;·&nbsp;
          Recommended: <strong>1600 × 400px</strong> (4:1 landscape)<br>
          The old photo will be <strong>automatically deleted</strong> from storage.
        </p>

        <!-- File drop zone -->
        <label id="branding-drop-zone" style="
          display:block;
          border:2px dashed var(--border);
          border-radius:10px;
          padding:2rem;
          text-align:center;
          cursor:pointer;
          transition:border-color .2s,background .2s;
          margin-bottom:1rem;
        " for="branding-file-input">
          <div id="branding-drop-icon" style="font-size:2rem;margin-bottom:.5rem;">📁</div>
          <div id="branding-drop-label" style="font-size:.875rem;color:var(--ink-subtle);">
            Click to choose a file or drag and drop here
          </div>
          <input type="file" id="branding-file-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
        </label>

        <!-- New image preview -->
        <div id="branding-new-preview" style="display:none;margin-bottom:1rem;">
          <div class="form-label" style="margin-bottom:.5rem;">New Photo Preview</div>
          <img id="branding-new-img" src="" alt="New cover preview" style="
            width:100%;height:140px;object-fit:cover;
            border-radius:10px;border:1.5px solid var(--border);
          ">
          <p id="branding-file-info" style="font-size:.75rem;color:var(--ink-subtle);margin-top:.4rem;"></p>
        </div>

        <div id="branding-error" class="alert alert--error" style="display:none;margin-bottom:.75rem;font-size:.8125rem;"></div>

        <button class="btn btn-primary" id="branding-upload-btn" disabled style="width:100%;">
          Upload & Apply Cover Photo
        </button>
      </div>

    </div>
  `;

  // ── Wire up file picker ───────────────────────────────────────────────────
  const fileInput  = document.getElementById('branding-file-input');
  const dropZone   = document.getElementById('branding-drop-zone');
  const newPreview = document.getElementById('branding-new-preview');
  const newImg     = document.getElementById('branding-new-img');
  const fileInfo   = document.getElementById('branding-file-info');
  const uploadBtn  = document.getElementById('branding-upload-btn');
  const errEl      = document.getElementById('branding-error');
  let   _file      = null;

  function _showFile(file) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    errEl.style.display = 'none';

    if (!allowed.includes(file.type)) {
      errEl.textContent = 'Only JPG, PNG, or WebP files are allowed.';
      errEl.style.display = 'block';
      uploadBtn.disabled = true;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      errEl.textContent = 'File is too large. Maximum size is 2MB.';
      errEl.style.display = 'block';
      uploadBtn.disabled = true;
      return;
    }

    _file = file;
    const url = URL.createObjectURL(file);
    newImg.src = url;
    fileInfo.textContent = `${file.name}  ·  ${(file.size / 1024).toFixed(0)} KB`;
    newPreview.style.display = 'block';
    uploadBtn.disabled = false;

    // Update drop zone label
    document.getElementById('branding-drop-icon').textContent = '✅';
    document.getElementById('branding-drop-label').textContent = file.name;
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) _showFile(fileInput.files[0]);
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent)';
    dropZone.style.background  = 'rgba(var(--accent-rgb),.05)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '';
    dropZone.style.background  = '';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    dropZone.style.background  = '';
    if (e.dataTransfer.files[0]) _showFile(e.dataTransfer.files[0]);
  });

  // ── Upload ────────────────────────────────────────────────────────────────
  uploadBtn.addEventListener('click', async () => {
    if (!_file) return;

    uploadBtn.disabled    = true;
    uploadBtn.textContent = 'Uploading…';
    errEl.style.display   = 'none';

    try {
      // Convert file to base64 data URL
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(_file);
      });

      const { data, error } = await API.post('/admin/cover-photo', {
        image_base64: base64,
        mime_type:    _file.type,
      });

      if (error) throw new Error(error);

      showToast('✅ Cover photo updated! All profiles will show the new cover.', 'success');

      // Reload branding tab to show new cover
      await _loadBranding();

    } catch (err) {
      errEl.textContent   = err.message || 'Upload failed. Please try again.';
      errEl.style.display = 'block';
      uploadBtn.disabled  = false;
      uploadBtn.textContent = 'Upload & Apply Cover Photo';
    }
  });
}

