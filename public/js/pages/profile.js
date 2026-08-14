// Campus Wall — Profile Page
// Own profile: avatar, name, stats, bio (editable), post history, change password.
// Other user's profile (hash param ?id=xxx): public read-only view.

import API from '../api.js';
import Auth from '../auth.js';
import supabase from '../supabase.js';
import { showToast, escHtml, timeAgo, Icons, fmtNum, deptPill } from '../utils.js';
import { uploadToStorage } from '../storage.js';

let _profile     = null; // the profile being viewed
let _isOwnProfile = false;
let _postCursor   = null;
let _hasMorePosts = true;
let _loadingPosts = false;

// ─── Exported API ─────────────────────────────────────────────────────────────

export function render() {
  // Render shell; actual data loaded in init()
  return `
    <div id="profile-page">
      <div class="empty-state"><div class="spinner"></div></div>
    </div>

    <!-- Edit Profile Modal -->
    <div class="modal-overlay" id="profile-edit-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:440px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Edit Profile</h3>
          <button class="btn btn-ghost btn-icon" id="profile-close-edit">${Icons.x}</button>
        </div>
        <div class="modal__body" style="display:grid;gap:.75rem;">
          <!-- Avatar upload -->
          <div style="text-align:center;">
            <div id="edit-avatar-preview" class="avatar avatar--xl" style="margin:0 auto .75rem;cursor:pointer;" title="Click to change avatar"></div>
            <input type="file" id="edit-avatar-input" accept="image/*" style="display:none;">
            <button class="btn btn-ghost btn-sm" id="edit-avatar-btn">${Icons.upload} Change Avatar</button>
          </div>
          <div>
            <label class="form-label" for="edit-bio-input">Bio <span style="color:var(--ink-subtle);">(max 200 chars)</span></label>
            <textarea id="edit-bio-input" class="form-input" rows="3" maxlength="200" placeholder="Tell the campus a little about yourself…" style="width:100%;resize:vertical;"></textarea>
            <div style="text-align:right;font-size:11px;color:var(--ink-subtle);margin-top:2px;">
              <span id="edit-bio-count">0</span>/200
            </div>
          </div>
          <div>
            <label class="form-label" for="edit-phone-input">Phone Number</label>
            <input type="tel" id="edit-phone-input" class="form-input" placeholder="10-digit mobile number" maxlength="10" style="width:100%;" inputmode="numeric">
          </div>
          <div id="profile-edit-error" class="alert alert--error" style="display:none;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="profile-cancel-edit">Cancel</button>
          <button class="btn btn-primary" id="profile-confirm-edit">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal-overlay" id="change-pw-modal" style="display:none;" role="dialog">
      <div class="modal" style="max-width:400px;">
        <div class="modal__handle"></div>
        <div class="modal__header">
          <h3>Change Password</h3>
          <button class="btn btn-ghost btn-icon" id="close-change-pw">${Icons.x}</button>
        </div>
        <div class="modal__body" style="display:grid;gap:.75rem;">
          <div>
            <label class="form-label" for="new-pw-input">New Password</label>
            <div class="password-wrap">
              <input type="password" id="new-pw-input" class="form-input" placeholder="Min 8 chars with 1 letter + 1 number" style="width:100%;" autocomplete="new-password">
              <button type="button" class="pw-toggle" data-target="new-pw-input" aria-label="Show password"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div>
            <label class="form-label" for="confirm-pw-input">Confirm Password</label>
            <div class="password-wrap">
              <input type="password" id="confirm-pw-input" class="form-input" placeholder="Repeat password" style="width:100%;" autocomplete="new-password">
              <button type="button" class="pw-toggle" data-target="confirm-pw-input" aria-label="Show password"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div id="change-pw-error" class="alert alert--error" style="display:none;font-size:.8125rem;"></div>
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" id="cancel-change-pw">Cancel</button>
          <button class="btn btn-primary" id="confirm-change-pw">Update Password</button>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  _postCursor = null; _hasMorePosts = true; _loadingPosts = false;

  // Determine whose profile to show
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const targetId = params.get('id');
  const myId = Auth.getProfile()?.id;

  _isOwnProfile = !targetId || targetId === myId;

  try {
    if (_isOwnProfile) {
      const { data } = await API.get('/profile/me');
      _profile = data;
    } else {
      const { data } = await API.get(`/profile/${targetId}`);
      _profile = data;
    }
  } catch (err) {
    document.getElementById('profile-page').innerHTML =
      `<div class="alert alert--error">${escHtml(err.message)}</div>`;
    return;
  }

  _renderProfile();
  if (_isOwnProfile) {
    _setupEditModal();
    _setupChangePasswordModal();
    _setupPostScroll();
    await _loadPosts(true);
    // Auto-open edit modal if coming from Settings "Edit Profile"
    if (sessionStorage.getItem('profile_open_edit') === '1') {
      sessionStorage.removeItem('profile_open_edit');
      _openEditModal();
    }
  }
}

// ─── Render Profile ───────────────────────────────────────────────────────────

function _renderProfile() {
  const p = _profile;
  const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const hasAvatar = !!p.avatar_url;

  document.getElementById('profile-page').innerHTML = `
    <!-- Profile Header -->
    <div class="profile-header" style="position:relative;">
      ${_isOwnProfile ? `
        <a href="#/settings" class="btn btn-ghost btn-icon" style="position:absolute;top:0;right:0;color:var(--ink-muted);" title="Settings" aria-label="Open Settings">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </a>
      ` : ''}
      <div class="profile-avatar-wrap">
        ${hasAvatar
          ? `<img src="${escHtml(p.avatar_url)}" alt="${escHtml(p.full_name)}" class="avatar avatar--xl profile-avatar-img">`
          : `<div class="avatar avatar--xl" id="profile-avatar-initials">${escHtml(initials)}</div>`}
      </div>
      <div class="profile-info">
        <div class="profile-name">${escHtml(p.full_name)}</div>
        <div class="profile-roll">${p.roll_number ? escHtml(p.roll_number) : ''}</div>
        <div style="margin-top:4px;">${deptPill(p.department)}</div>
        ${p.bio ? `<p class="profile-bio">${escHtml(p.bio)}</p>` : ''}
        <div class="profile-joined text-subtle">Joined ${timeAgo(p.created_at)}</div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="profile-stats">
      <div class="profile-stat">
        <div class="profile-stat__value">${fmtNum(p.karma || 0)}</div>
        <div class="profile-stat__label">Karma</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat__value">${fmtNum(p.posts_count || 0)}</div>
        <div class="profile-stat__label">Posts</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat__value">${fmtNum(p.notes_uploaded || 0)}</div>
        <div class="profile-stat__label">Notes</div>
      </div>
    </div>

    <!-- Own Posts -->
    ${_isOwnProfile ? `
      <div class="profile-section-title">My Posts</div>
      <div id="profile-posts" aria-live="polite">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
      <div id="profile-posts-sentinel" style="height:1px;"></div>
    ` : `
      <div class="empty-state" style="padding:2rem;">
        <p class="text-muted">Posts are visible on the Campus Feed.</p>
        <a class="btn btn-secondary btn-sm" href="#/feed">Go to Feed</a>
      </div>
    `}
  `;

  // Wire eye-toggles on the change-pw modal (opened from Settings)
  _initPwToggles();
}
}

// ─── Own Post History ─────────────────────────────────────────────────────────

function _setupPostScroll() {
  const sentinel = document.getElementById('profile-posts-sentinel');
  if (!sentinel) return;
  const obs = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting && _hasMorePosts && !_loadingPosts) _loadPosts(); },
    { rootMargin: '200px' }
  );
  obs.observe(sentinel);
}

async function _loadPosts(initial = false) {
  if (_loadingPosts || !_hasMorePosts) return;
  _loadingPosts = true;
  const listEl = document.getElementById('profile-posts');
  if (!listEl) return;

  if (!initial) listEl.insertAdjacentHTML('beforeend', '<div id="pp-spin" class="empty-state" style="padding:1rem;"><div class="spinner"></div></div>');

  try {
    const params = new URLSearchParams({ limit: 15 });
    if (_postCursor) params.set('before', _postCursor);
    const { data, has_more, next_cursor } = await API.get(`/profile/me/posts?${params}`);
    _hasMorePosts = has_more;
    _postCursor   = next_cursor;
    document.getElementById('pp-spin')?.remove();

    if (initial) {
      listEl.innerHTML = !data?.length
        ? `<div class="empty-state" style="padding:2rem;"><div class="empty-state-icon">📝</div><p class="text-muted">No posts yet. Share something on the feed!</p></div>`
        : data.map(_renderMiniPost).join('');
    } else {
      data?.forEach(p => listEl.insertAdjacentHTML('beforeend', _renderMiniPost(p)));
    }
  } catch (err) {
    document.getElementById('pp-spin')?.remove();
    if (initial && listEl) listEl.innerHTML = `<div class="alert alert--error">${escHtml(err.message)}</div>`;
  } finally {
    _loadingPosts = false;
  }
}

function _renderMiniPost(post) {
  return `
    <div class="mini-post-item">
      <div class="mini-post-content">${escHtml(post.content?.substring(0, 160) || '')}${post.content?.length > 160 ? '…' : ''}</div>
      <div class="mini-post-meta">
        ⬆ ${post.upvotes || 0} · 💬 ${post.comments_count || 0} · ${timeAgo(post.created_at)}
        ${post.updated_at && post.updated_at !== post.created_at ? '<span class="text-subtle"> · edited</span>' : ''}
      </div>
    </div>
  `;
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

let _newAvatarFile = null;

function _openEditModal() {
  const p = _profile;
  _newAvatarFile = null;

  // Populate form
  const bioInput   = document.getElementById('edit-bio-input');
  const phoneInput = document.getElementById('edit-phone-input');
  const bioCount   = document.getElementById('edit-bio-count');
  const avatarPrev = document.getElementById('edit-avatar-preview');

  if (bioInput)  bioInput.value  = p.bio || '';
  if (phoneInput) phoneInput.value = p.phone_number || '';
  if (bioCount)  bioCount.textContent = (p.bio || '').length;

  if (avatarPrev) {
    if (p.avatar_url) {
      avatarPrev.style.backgroundImage = `url('${p.avatar_url}')`;
      avatarPrev.style.backgroundSize = 'cover';
      avatarPrev.textContent = '';
    } else {
      const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarPrev.textContent = initials;
      avatarPrev.style.backgroundImage = '';
    }
  }

  document.getElementById('profile-edit-error').style.display = 'none';
  document.getElementById('profile-edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';

  bioInput?.addEventListener('input', () => {
    if (bioCount) bioCount.textContent = bioInput.value.length;
  });
}

function _setupEditModal() {
  document.getElementById('profile-close-edit')?.addEventListener('click', _closeEditModal);
  document.getElementById('profile-cancel-edit')?.addEventListener('click', _closeEditModal);
  document.getElementById('profile-edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'profile-edit-modal') _closeEditModal();
  });
  document.getElementById('profile-confirm-edit')?.addEventListener('click', _saveProfile);

  // Avatar upload
  const avatarInput = document.getElementById('edit-avatar-input');
  document.getElementById('edit-avatar-btn')?.addEventListener('click', () => avatarInput?.click());
  document.getElementById('edit-avatar-preview')?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Only image files.', 'error'); return; }
    if (f.size > 3 * 1024 * 1024) { showToast('Avatar must be under 3 MB.', 'error'); return; }
    _newAvatarFile = f;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const prev = document.getElementById('edit-avatar-preview');
      if (prev) {
        prev.style.backgroundImage = `url('${ev.target.result}')`;
        prev.style.backgroundSize  = 'cover';
        prev.textContent = '';
      }
    };
    reader.readAsDataURL(f);
  });
}

function _closeEditModal() {
  document.getElementById('profile-edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  _newAvatarFile = null;
}

async function _saveProfile() {
  const bio   = document.getElementById('edit-bio-input')?.value.trim();
  const phone = document.getElementById('edit-phone-input')?.value.replace(/\D/g, '');
  const errEl = document.getElementById('profile-edit-error');
  errEl.style.display = 'none';

  const btn = document.getElementById('profile-confirm-edit');
  btn.disabled = true;

  try {
    const updates = {};

    // Upload new avatar if selected
    if (_newAvatarFile) {
      const uid  = _profile.id;
      const ext  = _newAvatarFile.name.split('.').pop() || 'jpg';
      const path = `avatars/${uid}.${ext}`;
      updates.avatar_url = await uploadToStorage('avatars', path, _newAvatarFile);
    }

    updates.bio = bio;
    if (phone) updates.phone_number = phone;

    const { data } = await API.patch('/profile/me', updates);
    _profile = { ..._profile, ...data };

    _closeEditModal();
    _renderProfile();
    _setupEditModal();
    _setupChangePasswordModal();
    _setupPostScroll();
    await _loadPosts(true);
    showToast('Profile updated! ✅', 'success');
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
  }
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function _setupChangePasswordModal() {
  document.getElementById('close-change-pw')?.addEventListener('click', _closeChangePw);
  document.getElementById('cancel-change-pw')?.addEventListener('click', _closeChangePw);
  document.getElementById('change-pw-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'change-pw-modal') _closeChangePw();
  });
  document.getElementById('confirm-change-pw')?.addEventListener('click', _submitChangePw);
}

function _closeChangePw() {
  document.getElementById('change-pw-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitChangePw() {
  const newPw  = document.getElementById('new-pw-input')?.value;
  const confPw = document.getElementById('confirm-pw-input')?.value;
  const errEl  = document.getElementById('change-pw-error');
  errEl.style.display = 'none';

  if (!newPw || newPw.length < 8 || !/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
    errEl.textContent = 'Password must be at least 8 characters with at least 1 letter and 1 number.';
    errEl.style.display = 'flex';
    return;
  }
  if (newPw !== confPw) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'flex';
    return;
  }

  const btn = document.getElementById('confirm-change-pw');
  btn.disabled = true;
  try {
    await API.post('/auth/change-password', { new_password: newPw });
    _closeChangePw();
    showToast('Password changed successfully! 🔑', 'success');
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
  }
}

// ─── Password Eye Toggle ────────────────────────────────────────────────────
function _initPwToggles() {
  const eyeOn  = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  document.querySelectorAll('#change-pw-modal .pw-toggle').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => {
      const inp = document.getElementById(fresh.dataset.target);
      if (!inp) return;
      const hidden = inp.type === 'password';
      inp.type = hidden ? 'text' : 'password';
      fresh.innerHTML = hidden ? eyeOff : eyeOn;
      fresh.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });
}