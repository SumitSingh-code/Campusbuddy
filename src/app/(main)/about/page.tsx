'use client'

export default function AboutPage() {
  const features = [
    ['📣', 'Campus Feed', 'Post updates, photos & discussions'],
    ['🎭', 'Anonymous Feed', 'Share thoughts without revealing identity'],
    ['💬', 'Real-time DMs', 'Private one-on-one messaging'],
    ['📄', 'PYQ Library', 'Previous year question papers'],
    ['🔔', 'Notices Board', 'Department notices & announcements'],
    ['🗓️', 'Timetable', 'Personal class schedule editor'],
    ['🔍', 'Lost & Found', 'Help reunite people with their things'],
    ['📚', 'Study Notes', 'Shared notes repository'],
  ]

  const techStack = [
    'Next.js 15+ (App Router)',
    'Node.js · Express',
    'Supabase (DB + Auth + Storage)',
    'Vercel (Hosting)',
    'PWA (Installable)',
  ]

  return (
    <div className="about-page">
      {/* Hero */}
      <div className="about-hero">
        <img src="/icons/icon-192.png" alt="Unigram" className="about-logo" />
        <h1 className="about-title">Unigram</h1>
        <p className="about-tagline">Your campus, connected.</p>
        <div className="about-meta">CRSU · Jind, Haryana · 2025</div>
      </div>

      {/* Story */}
      <div className="about-section">
        <h2 className="about-section-title">📖 The Story</h2>
        <p className="about-text">
          Unigram was built out of frustration — CRSU had no central platform where students could
          share information, post anonymously, find lost items, access previous year questions,
          or simply connect with each other.
        </p>
        <p className="about-text">
          What started as a small side project became a full-featured campus social hub.
        </p>
        <p className="about-text about-text--accent">
          Unigram is an independent student platform and is not affiliated with CRSU or any university body.
        </p>
      </div>

      {/* Features */}
      <div className="about-section">
        <h2 className="about-section-title">⚡ What&apos;s Inside</h2>
        <div className="about-features">
          {features.map(([icon, title, desc]) => (
            <div key={title} className="about-feature">
              <span className="about-feature-icon">{icon}</span>
              <span className="about-feature-text">
                <strong>{title}</strong>
                <span>{desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Built with */}
      <div className="about-section">
        <h2 className="about-section-title">🛠️ Built With</h2>
        <div className="about-tech">
          {techStack.map(t => <span key={t} className="about-tech-chip">{t}</span>)}
        </div>
      </div>

      {/* Links */}
      <div className="about-section">
        <h2 className="about-section-title">🔗 Links</h2>
        <div className="about-links">
          <a href="/privacy" className="about-link-item">Privacy Policy →</a>
          <a href="/terms" className="about-link-item">Terms &amp; Conditions →</a>
          <a href="/contact" className="about-link-item">Grievance / Contact →</a>
          <a href="/wall" className="about-link-item">Contribution Wall →</a>
        </div>
      </div>

      {/* Footer */}
      <div className="about-footer">
        <img src="/icons/icon-192.png" alt="" className="about-footer-logo" />
        <div>
          <div className="about-footer-name">Unigram v2.0</div>
          <div className="about-footer-copy">© 2025 Unigram. All rights reserved.</div>
          <div className="about-footer-note">Independent student platform · Not affiliated with CRSU</div>
        </div>
      </div>

      <style>{aboutStyles}</style>
    </div>
  )
}

const aboutStyles = `
.about-page { max-width: 600px; margin: 0 auto; padding: 0 1rem 4rem; }

.about-hero {
  text-align: center; padding: 2.5rem 1rem 2rem;
  background: linear-gradient(135deg, rgba(212,175,55,.06) 0%, transparent 60%);
  border-radius: 18px; margin-bottom: 1.25rem;
  border: 1px solid var(--border); margin-top: 1rem;
}
.about-logo { width: 72px; height: 72px; border-radius: 18px; margin-bottom: .75rem; box-shadow: 0 4px 24px rgba(212,175,55,.25); }
.about-title { font-size: 2rem; font-weight: 800; letter-spacing: -.04em; color: var(--ink); margin: 0 0 .2rem; }
.about-tagline { font-size: 1rem; color: var(--accent); font-weight: 600; margin: 0 0 .35rem; }
.about-meta { font-size: .75rem; color: var(--ink-muted); letter-spacing: .04em; }

.about-section { margin-bottom: 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; }
.about-section-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0 0 .85rem; }
.about-text { font-size: .8875rem; color: var(--ink-muted); line-height: 1.65; margin: 0 0 .65rem; }
.about-text:last-child { margin-bottom: 0; }
.about-text--accent { color: var(--accent); font-weight: 600; }

.about-features { display: flex; flex-direction: column; gap: .5rem; }
.about-feature { display: flex; align-items: center; gap: .75rem; background: var(--bg); border-radius: 10px; padding: .6rem .85rem; }
.about-feature-icon { font-size: 1.1rem; flex-shrink: 0; width: 24px; text-align: center; }
.about-feature-text { display: flex; flex-direction: column; font-size: .8125rem; }
.about-feature-text strong { color: var(--ink); font-weight: 600; }
.about-feature-text span { color: var(--ink-muted); }

.about-tech { display: flex; flex-wrap: wrap; gap: .5rem; }
.about-tech-chip { font-size: .75rem; font-weight: 600; background: var(--bg); border: 1px solid var(--border); color: var(--ink-muted); border-radius: 8px; padding: .3rem .65rem; }

.about-links { display: flex; flex-direction: column; gap: .5rem; }
.about-link-item { color: var(--ink); font-size: .875rem; font-weight: 600; text-decoration: none; padding: .65rem .85rem; background: var(--bg); border-radius: 10px; display: block; transition: background .12s; }
.about-link-item:hover { background: var(--surface2); }

.about-footer { display: flex; align-items: center; gap: .85rem; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1rem 1.25rem; margin-top: 1.1rem; }
.about-footer-logo { width: 40px; height: 40px; border-radius: 10px; }
.about-footer-name { font-weight: 700; color: var(--ink); font-size: .9rem; }
.about-footer-copy { font-size: .75rem; color: var(--ink-muted); }
.about-footer-note { font-size: .72rem; color: var(--ink-muted); margin-top: .2rem; }
`
