// Unigram — Settings Page
// Accessed via ⚙️ gear icon on Profile page.
// Sections: Account (Edit Profile, Change Password), Preferences (Dark Mode),
//           Legal (About, Privacy, Terms, Guidelines, Contact), Sign Out.

import API from '../api.js';
import Auth from '../auth.js';
import { showToast, escHtml, Icons } from '../utils.js';

// ─── Dark Mode Helpers ───────────────────────────────────────────────────────
const THEME_KEY = 'unigram_theme';

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  // Update the toggle knob live
  const knob = document.getElementById('settings-dark-toggle');
  if (knob) knob.checked = dark;
}

// ─── SVG icons ───────────────────────────────────────────────────────────────
const chevron = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;

// ─── Render ───────────────────────────────────────────────────────────────────
export function render() {
  return `
    <div id="settings-page" style="max-width:520px;margin:0 auto;padding-bottom:2rem;">

      <!-- Change Password Modal (reused from profile) -->
      <div class="modal-overlay" id="settings-change-pw-modal" style="display:none;" role="dialog">
        <div class="modal" style="max-width:400px;">
          <div class="modal__handle"></div>
          <div class="modal__header">
            <h3>Change Password</h3>
            <button class="btn btn-ghost btn-icon" id="settings-close-pw">${Icons.x}</button>
          </div>
          <div class="modal__body" style="display:grid;gap:.75rem;">
            <div>
              <label class="form-label" for="settings-pw-new">New Password</label>
              <div class="password-wrap">
                <input type="password" id="settings-pw-new" class="form-input" placeholder="Min 8 chars — letter + number" autocomplete="new-password" style="width:100%;">
                <button type="button" class="pw-toggle" data-target="settings-pw-new" aria-label="Show password">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div>
              <label class="form-label" for="settings-pw-confirm">Confirm Password</label>
              <div class="password-wrap">
                <input type="password" id="settings-pw-confirm" class="form-input" placeholder="Repeat password" autocomplete="new-password" style="width:100%;">
                <button type="button" class="pw-toggle" data-target="settings-pw-confirm" aria-label="Show password">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div id="settings-pw-error" class="alert alert--error" style="display:none;"></div>
          </div>
          <div class="modal__footer">
            <button class="btn btn-secondary" id="settings-cancel-pw">Cancel</button>
            <button class="btn btn-primary" id="settings-confirm-pw">Update Password</button>
          </div>
        </div>
      </div>

      <!-- Edit Name Modal -->
      <div class="modal-overlay" id="settings-edit-name-modal" style="display:none;" role="dialog">
        <div class="modal" style="max-width:380px;">
          <div class="modal__handle"></div>
          <div class="modal__header">
            <h3>Edit Name</h3>
            <button class="btn btn-ghost btn-icon" id="settings-close-name">${Icons.x}</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label" for="settings-name-input">Full Name</label>
              <input type="text" id="settings-name-input" class="form-input" placeholder="Your full name" maxlength="80" autocomplete="name">
            </div>
            <div id="settings-name-error" class="alert alert--error" style="display:none;margin-top:.5rem;"></div>
          </div>
          <div class="modal__footer">
            <button class="btn btn-secondary" id="settings-cancel-name">Cancel</button>
            <button class="btn btn-primary" id="settings-confirm-name">Save Name</button>
          </div>
        </div>
      </div>

      <!-- Page Header -->
      <div class="settings-header">
        <a href="#/profile" class="settings-back" aria-label="Back to Profile">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </a>
        <h1 class="settings-title">Settings</h1>
      </div>

      <!-- ── ACCOUNT ──────────────────────────────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-label">Account</div>
        <div class="settings-card">

          <button class="settings-row" id="btn-edit-profile">
            <span class="settings-row-icon settings-icon-blue">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Edit Profile</span>
              <span class="settings-row-sub">Avatar, bio, phone</span>
            </span>
            ${chevron}
          </button>
          <div class="settings-divider"></div>

          <button class="settings-row" id="btn-edit-name">
            <span class="settings-row-icon settings-icon-purple">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Edit Name</span>
              <span class="settings-row-sub" id="settings-name-sub">—</span>
            </span>
            ${chevron}
          </button>
          <div class="settings-divider"></div>

          <div id="settings-pw-row-wrapper">
            <!-- Filled dynamically based on auth_provider -->
          </div>

          <div id="settings-admin-row-wrapper">
            <!-- Admin Panel link (for mods/super_admin only) -->
          </div>

        </div>
      </div>

      <!-- ── PREFERENCES ──────────────────────────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-label">Preferences</div>
        <div class="settings-card">
          <div class="settings-row settings-row--static">
            <span class="settings-row-icon settings-icon-gold">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Light Mode</span>
              <span class="settings-row-sub">Switch to light theme</span>
            </span>
            <label class="settings-toggle" aria-label="Toggle light mode">
              <input type="checkbox" id="settings-dark-toggle" role="switch">
              <span class="settings-toggle-knob"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- ── LEGAL ────────────────────────────────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-label">Legal &amp; Info</div>
        <div class="settings-card">

          <a class="settings-row" href="#/about">
            <span class="settings-row-icon settings-icon-teal">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">About Unigram</span>
            </span>
            ${chevron}
          </a>
          <div class="settings-divider"></div>

          <a class="settings-row" href="#/privacy">
            <span class="settings-row-icon settings-icon-green">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Privacy Policy</span>
            </span>
            ${chevron}
          </a>
          <div class="settings-divider"></div>

          <a class="settings-row" href="#/terms">
            <span class="settings-row-icon settings-icon-orange">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Terms &amp; Conditions</span>
            </span>
            ${chevron}
          </a>
          <div class="settings-divider"></div>

          <a class="settings-row" href="/guidelines.html" target="_blank" rel="noopener">
            <span class="settings-row-icon settings-icon-blue">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Community Guidelines</span>
            </span>
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--ink-subtle);flex-shrink:0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <div class="settings-divider"></div>

          <a class="settings-row" href="#/contact">
            <span class="settings-row-icon settings-icon-pink">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Contact Us / Grievance</span>
            </span>
            ${chevron}
          </a>

        </div>
      </div>

      <!-- ── DANGER ────────────────────────────────────────────────────── -->
      <div class="settings-section">
        <div class="settings-card">
          <button class="settings-row settings-row--danger" id="btn-settings-signout">
            <span class="settings-row-icon settings-icon-red">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <span class="settings-row-content">
              <span class="settings-row-label">Sign Out</span>
            </span>
          </button>
        </div>
      </div>

      <div class="settings-footer">
        <p>Unigram &mdash; CRSU Jind</p>
        <p style="margin-top:.25rem;font-size:.7rem;">Made with ❤️ for students</p>
      </div>

    </div>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export async function init() {
  let profile = null;
  try {
    const { data } = await API.get('/profile/me');
    profile = data;
  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'error');
    return;
  }

  // Populate name sub-label
  const nameSub = document.getElementById('settings-name-sub');
  if (nameSub) nameSub.textContent = profile.full_name || '—';

  // Theme toggle — ON = light mode, OFF = dark mode (dark is default)
  const darkToggle = document.getElementById('settings-dark-toggle');
  if (darkToggle) {
    // Checked = light mode is active
    darkToggle.checked = !isDark();
    darkToggle.addEventListener('change', () => applyTheme(!darkToggle.checked));
  }

  // Password row: email vs Google
  const pwWrapper = document.getElementById('settings-pw-row-wrapper');
  if (pwWrapper) {
    if (profile.auth_provider === 'email') {
      pwWrapper.innerHTML = `
        <div class="settings-divider"></div>
        <button class="settings-row" id="btn-settings-change-pw">
          <span class="settings-row-icon settings-icon-red">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <span class="settings-row-content">
            <span class="settings-row-label">Change Password</span>
          </span>
          ${chevron}
        </button>`;
      document.getElementById('btn-settings-change-pw')?.addEventListener('click', _openPwModal);
    } else {
      pwWrapper.innerHTML = `
        <div class="settings-divider"></div>
        <div class="settings-row settings-row--static settings-row--muted">
          <span class="settings-row-icon settings-icon-muted">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <span class="settings-row-content">
            <span class="settings-row-label" style="color:var(--ink-muted);">Change Password</span>
            <span class="settings-row-sub">Managed by Google</span>
          </span>
        </div>`;
    }
  }

  // Admin Panel row (only for mods/super_admin)
  const adminWrapper = document.getElementById('settings-admin-row-wrapper');
  if (adminWrapper && (profile.role === 'moderator' || profile.role === 'super_admin')) {
    adminWrapper.innerHTML = `
      <div class="settings-divider"></div>
      <a class="settings-row" href="/admin.html">
        <span class="settings-row-icon settings-icon-gold">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <span class="settings-row-content">
          <span class="settings-row-label">Admin Panel</span>
        </span>
        ${chevron}
      </a>`;
  }

  // Edit Profile → navigate to profile page with edit modal trigger
  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    // Store intent so profile page opens the edit modal
    sessionStorage.setItem('profile_open_edit', '1');
    window.location.hash = '#/profile';
  });

  // Edit Name modal
  document.getElementById('btn-edit-name')?.addEventListener('click', () => {
    document.getElementById('settings-name-input').value = profile.full_name || '';
    document.getElementById('settings-name-error').style.display = 'none';
    document.getElementById('settings-edit-name-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('settings-name-input')?.focus(), 80);
  });
  document.getElementById('settings-close-name')?.addEventListener('click', _closeNameModal);
  document.getElementById('settings-cancel-name')?.addEventListener('click', _closeNameModal);
  document.getElementById('settings-edit-name-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-edit-name-modal') _closeNameModal();
  });
  document.getElementById('settings-confirm-name')?.addEventListener('click', async () => {
    const btn   = document.getElementById('settings-confirm-name');
    const val   = document.getElementById('settings-name-input').value.trim();
    const errEl = document.getElementById('settings-name-error');
    errEl.style.display = 'none';
    if (!val || val.length < 2) {
      errEl.textContent = 'Name must be at least 2 characters.';
      errEl.style.display = 'flex'; return;
    }
    btn.disabled = true;
    try {
      await API.patch('/profile/me', { full_name: val });
      profile.full_name = val;
      const sub = document.getElementById('settings-name-sub');
      if (sub) sub.textContent = val;
      _closeNameModal();
      showToast('Name updated!', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'flex';
    } finally { btn.disabled = false; }
  });

  // Change password modal
  document.getElementById('settings-close-pw')?.addEventListener('click', _closePwModal);
  document.getElementById('settings-cancel-pw')?.addEventListener('click', _closePwModal);
  document.getElementById('settings-change-pw-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-change-pw-modal') _closePwModal();
  });
  document.getElementById('settings-confirm-pw')?.addEventListener('click', _submitChangePw);

  // Eye toggles
  _initPwToggles('#settings-change-pw-modal');

  // Sign out
  document.getElementById('btn-settings-signout')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-settings-signout');
    if (btn) btn.disabled = true;
    try {
      await Auth.signOut();
    } catch {
      const { default: supa } = await import('../supabase.js');
      await supa.auth.signOut();
      window.location.href = '/auth.html';
    }
  });
}

export function destroy() {
  document.body.style.overflow = '';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function _openPwModal() {
  document.getElementById('settings-pw-new').value    = '';
  document.getElementById('settings-pw-confirm').value = '';
  document.getElementById('settings-pw-error').style.display = 'none';
  document.getElementById('settings-change-pw-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('settings-pw-new')?.focus(), 80);
}
function _closePwModal() {
  document.getElementById('settings-change-pw-modal').style.display = 'none';
  document.body.style.overflow = '';
}
function _closeNameModal() {
  document.getElementById('settings-edit-name-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitChangePw() {
  const newPw  = document.getElementById('settings-pw-new')?.value;
  const confPw = document.getElementById('settings-pw-confirm')?.value;
  const errEl  = document.getElementById('settings-pw-error');
  errEl.style.display = 'none';

  if (!newPw || newPw.length < 8 || !/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
    errEl.textContent = 'Password must be at least 8 characters with at least 1 letter and 1 number.';
    errEl.style.display = 'flex'; return;
  }
  if (newPw !== confPw) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'flex'; return;
  }
  const btn = document.getElementById('settings-confirm-pw');
  btn.disabled = true;
  try {
    await API.post('/auth/change-password', { new_password: newPw });
    _closePwModal();
    showToast('Password changed successfully! 🎉', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'flex';
  } finally { btn.disabled = false; }
}

function _initPwToggles(scope = '') {
  const eyeOn  = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const container = scope ? document.querySelector(scope) : document;
  container?.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const hidden = inp.type === 'password';
      inp.type = hidden ? 'text' : 'password';
      btn.innerHTML = hidden ? eyeOff : eyeOn;
      btn.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });
}
