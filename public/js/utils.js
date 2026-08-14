// Campus Wall — Frontend Utilities
import Config from './config.js';

// ─── Department Color Pill ───────────────────────────────────────────────────

/** Deterministic hash: department string → color index 0-9 */
export function getDeptColorIndex(dept) {
  if (!dept) return 0;
  let hash = 0;
  for (let i = 0; i < dept.length; i++) {
    hash = Math.imul(31, hash) + dept.charCodeAt(i) | 0;
  }
  return Math.abs(hash) % 10;
}

/** Renders a department colored pill */
export function deptPill(dept) {
  if (!dept) return '';
  const idx = getDeptColorIndex(dept);
  const label = dept.length > 24 ? dept.substring(0, 22) + '…' : dept;
  return `<span class="dept-pill dept-pill--${idx}">${escHtml(label)}</span>`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

/** Returns avatar HTML (image or initials) */
export function avatarHtml(name, imgUrl, size = '') {
  const sizeClass = size ? ` avatar--${size}` : '';
  const initials = (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  if (imgUrl) {
    return `<div class="avatar${sizeClass}"><img src="${escHtml(imgUrl)}" alt="${escHtml(name || '')}" loading="lazy"></div>`;
  }
  return `<div class="avatar${sizeClass}">${escHtml(initials)}</div>`;
}

// ─── Time Formatting ─────────────────────────────────────────────────────────

/** Human-friendly relative timestamp */
export function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  const secs  = diff / 1000;
  const mins  = secs / 60;
  const hrs   = mins / 60;
  const days  = hrs  / 24;
  const weeks = days / 7;
  if (secs  <  60) return 'just now';
  if (mins  <  60) return `${Math.floor(mins)}m`;
  if (hrs   <  24) return `${Math.floor(hrs)}h`;
  if (days  <   7) return `${Math.floor(days)}d`;
  if (weeks <   4) return `${Math.floor(weeks)}w`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

/** Full date + time string */
export function fullDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

export function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Toast Notifications ─────────────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration ms
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icon = type === 'success' ? Icons.check
             : type === 'error'   ? Icons.x
             : Icons.info;

  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(remove, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

export function skeletonPostCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="post-card" style="padding: 1rem 1rem 0.75rem;">
      <div style="display:flex;gap:.75rem;align-items:center;margin-bottom:.75rem;">
        <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton" style="height:13px;width:55%;margin-bottom:.4rem;"></div>
          <div class="skeleton" style="height:11px;width:35%;"></div>
        </div>
      </div>
      <div class="skeleton" style="height:13px;width:100%;margin-bottom:.4rem;"></div>
      <div class="skeleton" style="height:13px;width:88%;margin-bottom:.4rem;"></div>
      <div class="skeleton" style="height:13px;width:72%;margin-bottom:.75rem;"></div>
      <div style="display:flex;gap:.5rem;padding-top:.75rem;border-top:1px solid var(--border);">
        <div class="skeleton" style="height:32px;width:64px;border-radius:8px;"></div>
        <div class="skeleton" style="height:32px;width:64px;border-radius:8px;"></div>
        <div class="skeleton" style="height:32px;width:80px;border-radius:8px;"></div>
      </div>
    </div>
  `).join('');
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
// Using Feather-style 24x24 icons (no external dependency)

export const Icons = {
  feed:        `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  anon:        `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="3" y1="3" x2="21" y2="21"/></svg>`,
  dm:          `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  bell:        `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user:        `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  upvote:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>`,
  downvote:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`,
  comment:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  more:        `<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
  bookmark:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  image:       `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  x:           `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check:       `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  info:        `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  plus:        `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  send:        `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  shield:      `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  logout:      `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  google:      `<svg viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>`,
  pending:     `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  pyq:         `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  notice:      `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  timetable:   `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  lostfound:   `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  notes:       `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  edit:        `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  search:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  upload:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  trash:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

// ─── Form Validation ─────────────────────────────────────────────────────────

export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
  if (digits.length === 10) return digits;
  return null;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
}

// ─── Image Compression ────────────────────────────────────────────────────────

/**
 * Compress an image File to target size (~200KB).
 * Returns a new Blob.
 */
export async function compressImage(file, maxWidthPx = 1200, targetKB = 250) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        // Try quality 0.85 first, reduce if still too large
        canvas.toBlob((blob) => {
          if (blob.size > targetKB * 1024) {
            canvas.toBlob((blob2) => resolve(blob2), 'image/jpeg', 0.70);
          } else {
            resolve(blob);
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Add active class to current nav item based on hash */
export function updateNavActive(hash) {
  document.querySelectorAll('.nav-item, .nav-link').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.route && hash.startsWith(el.dataset.route)) {
      el.classList.add('active');
    }
  });
}

/** Number formatting with K/M suffix */
export function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/** File size formatting — bytes → human-readable string (e.g. "2.4 MB", "340 KB") */
export function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
