// Unigram — About & Contribution Wall
import API from '../api.js';
import { escHtml } from '../utils.js';

export function render() {
  return `
    <div class="about-page">
      <a href="#/settings" class="legal-back">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </a>

      <div class="about-hero">
        <img src="/icons/icon-192.png" alt="Unigram" class="about-logo">
        <h1 class="about-title">Unigram</h1>
        <p class="about-tagline">Your campus, connected.</p>
        <div class="about-meta">CRSU · Jind, Haryana · 2025</div>
      </div>

      <div class="about-section">
        <h2 class="about-section-title">📖 The Story</h2>
        <p class="about-text">Unigram was built out of frustration — CRSU had no central platform where students could share information, post anonymously, find lost items, access previous year questions, or simply connect with each other.</p>
        <p class="about-text">What started as a small side project became a full-featured campus social hub: a feed, anonymous posts, real-time DMs, PYQs, notices, timetable, lost &amp; found, study notes, and an admin panel — all in one place.</p>
        <p class="about-text" style="color:var(--accent);font-weight:600;">Independent student platform · Not affiliated with CRSU or any university body.</p>
      </div>

      <div class="about-section">
        <h2 class="about-section-title">⚡ What's Inside</h2>
        <div class="about-features" id="about-features">
          ${[['📣','Campus Feed','Post updates, photos & discussions'],['🎭','Anonymous Feed','Share thoughts without revealing identity'],['💬','Real-time DMs','Private one-on-one messaging'],['📄','PYQ Library','Previous year question papers'],['🔔','Notices Board','Official department notices'],['🗓️','Timetable','Personal class schedule editor'],['🔍','Lost & Found','Help reunite people with their things'],['📚','Study Notes','Shared notes repository'],['🔖','Bookmarks','Save posts for later']].map(([icon,title,desc])=>`
          <div class="about-feature-chip"><span class="about-feature-icon">${icon}</span><span class="about-feature-text"><strong>${title}</strong><span>${desc}</span></span></div>`).join('')}
        </div>
      </div>

      <div class="about-section">
        <h2 class="about-section-title">🏆 Contribution Wall</h2>
        <p class="about-text" style="margin-bottom:1rem;">These are the people who made Unigram possible.</p>
        <div class="contrib-wall" id="contrib-wall">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
      </div>

      <div class="about-section">
        <h2 class="about-section-title">🛠️ Built With</h2>
        <div class="about-tech">
          ${['HTML · CSS · Vanilla JS','Node.js · Express','Supabase (DB + Auth + Storage)','Vercel (Hosting)','PWA (Installable App)'].map(t=>`<span class="about-tech-chip">${t}</span>`).join('')}
        </div>
      </div>

      <div class="about-footer">
        <img src="/icons/icon-192.png" alt="" class="about-footer-logo">
        <div>
          <div style="font-weight:700;color:var(--ink);">Unigram v1.0</div>
          <div style="font-size:.75rem;color:var(--ink-muted);">© 2025 Unigram. All rights reserved.</div>
          <div style="font-size:.72rem;color:var(--ink-muted);margin-top:.2rem;">Independent student platform · Not affiliated with CRSU</div>
        </div>
      </div>
    </div>

    <style>
      .about-page{max-width:540px;margin:0 auto;padding:1rem 1rem 4rem;font-family:'Space Grotesk','Segoe UI',sans-serif;}
      .about-hero{text-align:center;padding:2rem 1rem 1.75rem;background:linear-gradient(135deg,rgba(212,175,55,.06) 0%,transparent 60%);border-radius:18px;margin-bottom:1.5rem;border:1px solid var(--border);}
      .about-logo{width:72px;height:72px;border-radius:18px;margin-bottom:.75rem;box-shadow:0 4px 24px rgba(212,175,55,.25);}
      .about-title{font-size:2rem;font-weight:800;letter-spacing:-.04em;color:var(--ink);margin:0 0 .2rem;}
      .about-tagline{font-size:1rem;color:var(--accent);font-weight:600;margin:0 0 .35rem;}
      .about-meta{font-size:.75rem;color:var(--ink-muted);letter-spacing:.04em;}
      .about-section{margin-bottom:1.75rem;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.25rem;}
      .about-section-title{font-size:1rem;font-weight:700;color:var(--ink);margin:0 0 .85rem;}
      .about-text{font-size:.8875rem;color:var(--ink-muted);line-height:1.65;margin:0 0 .75rem;}
      .about-text:last-child{margin-bottom:0;}
      .about-features{display:flex;flex-direction:column;gap:.55rem;}
      .about-feature-chip{display:flex;align-items:center;gap:.75rem;background:var(--bg);border-radius:10px;padding:.6rem .85rem;}
      .about-feature-icon{font-size:1.1rem;flex-shrink:0;width:24px;text-align:center;}
      .about-feature-text{display:flex;flex-direction:column;font-size:.8125rem;}
      .about-feature-text strong{color:var(--ink);font-weight:600;}
      .about-feature-text span{color:var(--ink-muted);}
      .contrib-wall{display:flex;flex-direction:column;gap:.85rem;}
      .contrib-card{display:flex;gap:1rem;align-items:flex-start;background:var(--bg);border-radius:14px;padding:1rem;animation:about-fadein .4s both;}
      @keyframes about-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      .contrib-avatar{width:52px;height:52px;border-radius:14px;border:1.5px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;flex-shrink:0;background:rgba(212,175,55,.1);color:#D4AF37;position:relative;overflow:hidden;}
      .contrib-avatar img{width:100%;height:100%;object-fit:cover;border-radius:13px;}
      .contrib-badge{position:absolute;bottom:-3px;right:-3px;font-size:.75rem;}
      .contrib-info{flex:1;min-width:0;}
      .contrib-name{font-weight:700;font-size:.9375rem;color:var(--ink);margin-bottom:.1rem;}
      .contrib-role{font-size:.78rem;font-weight:600;color:var(--accent);margin-bottom:.1rem;}
      .contrib-dept{font-size:.72rem;color:var(--ink-muted);margin-bottom:.4rem;}
      .contrib-detail{font-size:.8125rem;color:var(--ink-muted);line-height:1.55;margin:0;}
      .about-tech{display:flex;flex-wrap:wrap;gap:.5rem;}
      .about-tech-chip{font-size:.75rem;font-weight:600;background:var(--bg);border:1px solid var(--border);color:var(--ink-muted);border-radius:8px;padding:.3rem .65rem;}
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
      wall.innerHTML = '<div class="empty-state"><p style="color:var(--ink-muted);">No contributors listed yet.</p></div>';
      return;
    }
    const BADGES = ['👑','🎨','💡','🔧','🧪','⭐','🚀'];
    wall.innerHTML = data.map((c, i) => `
      <div class="contrib-card" style="animation-delay:${i * 0.08}s">
        <div class="contrib-avatar">
          ${c.photo_url ? `<img src="${escHtml(c.photo_url)}" alt="" onerror="this.parentElement.textContent='${escHtml(c.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase())}'">` : escHtml(c.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase())}
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
