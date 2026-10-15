// Unigram — Contribution Wall Page
// Separate page from About. Fetches contributors from /api/contributors.

import API from '../api.js';
import { escHtml } from '../utils.js';

export function render() {
  return `
    <div class="about-page">
      <a href="#/settings" class="legal-back">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </a>

      <div class="about-hero" style="padding:1.5rem 1rem 1.25rem;">
        <div style="font-size:2.5rem;margin-bottom:.5rem;">🏆</div>
        <h1 class="about-title" style="font-size:1.6rem;">Contribution Wall</h1>
        <p class="about-tagline" style="font-size:.875rem;">People who made Unigram possible</p>
      </div>

      <div class="about-section">
        <p class="about-text" style="margin-bottom:1.25rem;text-align:center;">
          Every great project is built by great people. Here are the individuals whose
          time, ideas, and effort shaped Unigram.
        </p>
        <div class="contrib-wall" id="contrib-wall">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
      </div>

      <div class="about-footer">
        <img src="/icons/icon-192.png" alt="" class="about-footer-logo">
        <div>
          <div style="font-weight:700;color:var(--ink);">Want to contribute?</div>
          <div style="font-size:.78rem;color:var(--ink-muted);">Reach out to the admin team to be recognised on this wall.</div>
        </div>
      </div>
    </div>

    <style>
      .about-page{max-width:540px;margin:0 auto;padding:1rem 1rem 4rem;font-family:'Space Grotesk','Segoe UI',sans-serif;}
      .about-hero{text-align:center;padding:2rem 1rem 1.75rem;background:linear-gradient(135deg,rgba(212,175,55,.06) 0%,transparent 60%);border-radius:18px;margin-bottom:1.5rem;border:1px solid var(--border);}
      .about-title{font-size:2rem;font-weight:800;letter-spacing:-.04em;color:var(--ink);margin:0 0 .2rem;}
      .about-tagline{font-size:1rem;color:var(--accent);font-weight:600;margin:0;}
      .about-section{margin-bottom:1.75rem;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.25rem;}
      .about-text{font-size:.8875rem;color:var(--ink-muted);line-height:1.65;margin:0 0 .75rem;}
      .contrib-wall{display:flex;flex-direction:column;gap:.85rem;}
      .contrib-card{display:flex;gap:1rem;align-items:flex-start;background:var(--bg);border-radius:14px;padding:1rem;animation:about-fadein .4s both;}
      @keyframes about-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      .contrib-avatar{width:56px;height:56px;border-radius:15px;border:1.5px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;flex-shrink:0;background:rgba(212,175,55,.1);color:#D4AF37;position:relative;overflow:hidden;}
      .contrib-avatar img{width:100%;height:100%;object-fit:cover;border-radius:14px;}
      .contrib-badge{position:absolute;bottom:-3px;right:-3px;font-size:.78rem;line-height:1;}
      .contrib-info{flex:1;min-width:0;}
      .contrib-name{font-weight:700;font-size:.9375rem;color:var(--ink);margin-bottom:.1rem;}
      .contrib-role{font-size:.78rem;font-weight:600;color:var(--accent);margin-bottom:.1rem;}
      .contrib-dept{font-size:.72rem;color:var(--ink-muted);margin-bottom:.4rem;}
      .contrib-detail{font-size:.8125rem;color:var(--ink-muted);line-height:1.55;margin:0;}
      .about-footer{display:flex;align-items:center;gap:.85rem;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1rem 1.25rem;margin-bottom:1rem;}
      .about-footer-logo{width:40px;height:40px;border-radius:10px;}
    </style>
  `;
}

export async function init() {
  window.scrollTo(0, 0);
  const wall = document.getElementById('contrib-wall');
  if (!wall) return;
  try {
    const { data } = await API.get('/contributors');
    if (!data || data.length === 0) {
      wall.innerHTML = '<div class="empty-state"><p style="color:var(--ink-muted);text-align:center;padding:1rem 0;">No contributors listed yet.</p></div>';
      return;
    }
    const BADGES = ['👑','🎨','💡','🔧','🧪','⭐','🚀','🎯','💪','🌟'];
    wall.innerHTML = data.map((c, i) => `
      <div class="contrib-card" style="animation-delay:${i * 0.07}s">
        <div class="contrib-avatar">
          ${c.photo_url
            ? `<img src="${escHtml(c.photo_url)}" alt="${escHtml(c.name)}" onerror="this.style.display='none';this.parentElement.querySelector('.contrib-initials').style.display='flex'"><span class="contrib-initials" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${escHtml(c.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase())}</span>`
            : escHtml(c.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase())
          }
          <span class="contrib-badge">${BADGES[i % BADGES.length]}</span>
        </div>
        <div class="contrib-info">
          <div class="contrib-name">${escHtml(c.name)}</div>
          <div class="contrib-role">${escHtml(c.role)}</div>
          ${c.dept ? `<div class="contrib-dept">${escHtml(c.dept)}</div>` : ''}
          <p class="contrib-detail">${escHtml(c.detail)}</p>
        </div>
      </div>
    `).join('');
  } catch (e) {
    wall.innerHTML = `<div class="alert alert--error">${escHtml(e.message)}</div>`;
  }
}

export function destroy() {}
