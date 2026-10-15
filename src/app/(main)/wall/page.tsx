'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface Contributor {
  id?: string
  name: string
  role: string
  dept: string
  detail: string
  initials: string
  color: string
  badge: string
}

const FALLBACK_CONTRIBUTORS: Contributor[] = [
  {
    name: 'Sumit Singh',
    role: 'Founder & Developer',
    dept: 'CRSU, Jind',
    detail: 'Ideated, designed, and built the entire Unigram platform from scratch to connect CRSU students.',
    initials: 'SS',
    color: '#D4AF37',
    badge: '👑',
  },
]

export default function WallPage() {
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contributors')
      .then(res => setContributors(res.data?.length ? res.data : FALLBACK_CONTRIBUTORS))
      .catch(() => setContributors(FALLBACK_CONTRIBUTORS))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="wall-page">
      <div className="wall-hero">
        <div className="wall-trophy">🏆</div>
        <h1 className="wall-title">Contribution Wall</h1>
        <p className="wall-sub">The people who built Unigram</p>
      </div>

      {loading ? (
        <div className="wall-loading">
          {[...Array(2)].map((_, i) => <div key={i} className="wall-skeleton skeleton-pulse" />)}
        </div>
      ) : (
        <div className="wall-list">
          {contributors.map((c, i) => (
            <div key={c.id || i} className="wall-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div
                className="wall-avatar"
                style={{ background: `${c.color}22`, borderColor: `${c.color}44`, color: c.color }}
              >
                {c.initials}
                <span className="wall-badge">{c.badge}</span>
              </div>
              <div className="wall-info">
                <div className="wall-name">{c.name}</div>
                <div className="wall-role" style={{ color: c.color }}>{c.role}</div>
                <div className="wall-dept">{c.dept}</div>
                <p className="wall-detail">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="wall-footer">
        <p>Want to contribute to Unigram?</p>
        <a href="mailto:grievance@unigram.app" className="wall-contact-link">grievance@unigram.app</a>
      </div>

      <style>{wallStyles}</style>
    </div>
  )
}

const wallStyles = `
.wall-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.wall-hero { text-align: center; padding: 2.5rem 1rem 1.5rem; }
.wall-trophy { font-size: 3rem; margin-bottom: .75rem; }
.wall-title { font-size: 1.5rem; font-weight: 800; color: var(--ink); margin: 0 0 .35rem; letter-spacing: -.03em; }
.wall-sub { font-size: .875rem; color: var(--ink-muted); }

.wall-loading { display: flex; flex-direction: column; gap: .75rem; padding: 0 1rem; }
.wall-skeleton { height: 100px; border-radius: 16px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.wall-list { display: flex; flex-direction: column; gap: .85rem; padding: 0 1rem; }
.wall-card {
  display: flex; gap: 1rem; align-items: flex-start;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 1.1rem;
  animation: wallIn .4s both;
}
@keyframes wallIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }

.wall-avatar {
  width: 56px; height: 56px; border-radius: 14px;
  border: 1.5px solid; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.1rem;
  position: relative;
}
.wall-badge {
  position: absolute; bottom: -4px; right: -4px;
  font-size: .85rem; line-height: 1;
}

.wall-info { flex: 1; min-width: 0; }
.wall-name { font-weight: 700; font-size: .9375rem; color: var(--ink); margin-bottom: .1rem; }
.wall-role { font-size: .78rem; font-weight: 600; margin-bottom: .1rem; }
.wall-dept { font-size: .72rem; color: var(--ink-muted); margin-bottom: .4rem; }
.wall-detail { font-size: .8125rem; color: var(--ink-muted); line-height: 1.55; margin: 0; }

.wall-footer { text-align: center; padding: 2rem 1rem 1rem; color: var(--ink-muted); font-size: .8125rem; }
.wall-contact-link { color: var(--accent); font-weight: 600; text-decoration: none; }
`
