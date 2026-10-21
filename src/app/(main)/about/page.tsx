'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, Shield, Code, Heart, ExternalLink, Mail } from 'lucide-react'

function InstagramIcon({ size = 17, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

export default function AboutPage() {
  const features = [
    { icon: '📣', title: 'Campus Feed', desc: 'Real-time student discussions, campus questions & photos' },
    { icon: '🎭', title: 'Anonymous Feed', desc: 'Share genuine thoughts and campus queries with pseudonymity' },
    { icon: '💬', title: 'Real-time DMs', desc: 'Private one-on-one student messaging with instant notifications' },
    { icon: '📄', title: 'PYQ Library', desc: 'Organized previous years question papers repository' },
    { icon: '🔔', title: 'Notices Board', desc: 'Department announcements and student circulars' },
    { icon: '🗓️', title: 'Timetable', desc: 'Personal weekly class schedule planner and viewer' },
    { icon: '🔍', title: 'Lost & Found', desc: 'Community board to reunite lost campus items with their owners' },
    { icon: '📚', title: 'Study Notes', desc: 'Peer-to-peer study notes and academic resource repository' },
  ]

  const techStack = [
    'Next.js 16 (App Router)',
    'Node.js · Express Engine',
    'Supabase (PostgreSQL, Auth & RLS)',
    'Vercel Edge Cloud',
    'PWA · Web Push Notifications',
  ]

  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back navigation */}
        <Link href="/settings" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Hero Banner */}
        <div className="about-hero">
          <img src="/icons/icon-192.png" alt="Unigram" className="about-logo" />
          <h1 className="about-title">Unigram</h1>
          <p className="about-tagline">Your campus, connected.</p>
          <div className="about-meta">Independent Student Platform · CRSU Jind · Founded 2026</div>
        </div>

        {/* Institutional Non-Affiliation Disclaimer */}
        <div className="legal-disclaimer-box">
          <div className="legal-disclaimer-header">
            <Shield size={16} /> Important University Disclaimer
          </div>
          <p className="legal-disclaimer-text">
            <strong>Unigram is an independent, non-commercial student-led initiative.</strong> It is <strong>NOT</strong> officially affiliated with, endorsed, operated, or sponsored by <strong>Chaudhary Ranbir Singh University (CRSU), Jind</strong>, or any of its administrative or academic departments. All trademarks, college names, and logos belong to their respective holders; their mention here is strictly for identification and nominative fair use to describe the student community served. For official university circulars, admissions, results, and administrative inquiries, always consult the official portal at{' '}
            <a href="https://crsu.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'underline' }}>
              crsu.ac.in ↗
            </a>.
          </p>
        </div>

        {/* The Story */}
        <div className="legal-section">
          <h2>📖 The Story &amp; Vision</h2>
          <p>
            Unigram was born out of a genuine need on the CRSU Jind campus — students lacked a modern, centralized, and student-first digital space where they could connect, share study materials, discover past year exam papers, locate lost items, and communicate openly.
          </p>
          <p>
            What began as an open student project has evolved into a dedicated campus social utility built by students, for students. Our vision is to empower every student at CRSU with accessible peer knowledge, collaborative learning, and respectful community discussion.
          </p>
        </div>

        {/* What's Inside */}
        <div className="legal-section">
          <h2>⚡ What&apos;s Inside Unigram</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' }}>
            {features.map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg)', borderRadius: 12, padding: '0.75rem 0.85rem', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contribution & Community */}
        <div className="legal-section">
          <h2>🏆 The People Who Built It</h2>
          <p>
            Unigram is built with transparency and gratitude. Every student, developer, designer, and student coordinator who contributed code, feedback, or helped students join is recognized on our Contribution Wall.
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <Link
              href="/wall"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.6rem 1.1rem',
                borderRadius: 10,
                background: 'var(--accent)',
                color: 'var(--bg)',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Sparkles size={16} /> View Contribution Wall →
            </Link>
          </div>
        </div>

        {/* Built With (Tech Stack) */}
        <div className="legal-section">
          <h2>🛠️ Technology Architecture</h2>
          <p style={{ marginBottom: '0.75rem' }}>
            Designed for high performance, modern security standards, and responsive PWA accessibility:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {techStack.map(t => (
              <span key={t} className="legal-pill">
                <Code size={13} style={{ color: 'var(--accent)' }} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Official Channels */}
        <div className="legal-section">
          <h2>🔗 Official Student Channels</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            <a
              href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--ink)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 650, fontSize: '0.875rem' }}>
                <InstagramIcon size={17} style={{ color: '#E1306C' }} /> Instagram: @unigramjind
              </span>
              <ExternalLink size={15} style={{ color: 'var(--ink-muted)' }} />
            </a>
            <a
              href="mailto:unigramjind@gmail.com"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--ink)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 650, fontSize: '0.875rem' }}>
                <Mail size={17} style={{ color: 'var(--accent)' }} /> Official Email: unigramjind@gmail.com
              </span>
              <ExternalLink size={15} style={{ color: 'var(--ink-muted)' }} />
            </a>
          </div>
        </div>

        {/* Legal Quick Nav */}
        <div className="legal-section">
          <h2>⚖️ Legal, Privacy &amp; Governance</h2>
          <p>
            We take student privacy, community safety, and compliance with Indian law seriously. Review our transparent policies:
          </p>
          <div className="legal-nav-grid" style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <Link href="/terms" className="legal-nav-card">
              <span className="legal-nav-card-title">Terms &amp; Conditions →</span>
              <span className="legal-nav-card-desc">Platform rules, user agreement &amp; Section 79 IT Act terms</span>
            </Link>
            <Link href="/privacy" className="legal-nav-card">
              <span className="legal-nav-card-title">Privacy Policy →</span>
              <span className="legal-nav-card-desc">DPDP Act 2023 compliance, data rights &amp; protection</span>
            </Link>
            <Link href="/guidelines" className="legal-nav-card">
              <span className="legal-nav-card-title">Community Guidelines →</span>
              <span className="legal-nav-card-desc">Safety, zero-tolerance anti-ragging &amp; respect standards</span>
            </Link>
            <Link href="/contact" className="legal-nav-card">
              <span className="legal-nav-card-title">Grievance Redressal →</span>
              <span className="legal-nav-card-desc">IT Rules 2021 compliance &amp; 24h complaint desk</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="about-footer">
          <img src="/icons/icon-192.png" alt="Unigram" className="about-footer-logo" />
          <div>
            <div className="about-footer-name">Unigram Platform v2.0</div>
            <div className="about-footer-copy">© 2026 Unigram. All rights reserved.</div>
            <div className="about-footer-note">Independent student platform · Not affiliated with CRSU Jind</div>
          </div>
        </div>
      </div>

      <style>{`
        .about-hero {
          text-align: center;
          padding: 2.25rem 1rem 1.85rem;
          background: linear-gradient(135deg, rgba(212,175,55,.1) 0%, var(--surface) 80%);
          border-radius: 20px;
          margin-bottom: 1.25rem;
          border: 1px solid var(--border);
        }
        .about-logo {
          width: 68px;
          height: 68px;
          border-radius: 17px;
          margin: 0 auto 0.85rem;
          display: block;
          box-shadow: 0 6px 20px rgba(212,175,55,.3);
        }
        .about-title {
          font-family: var(--font-heading, 'Space Grotesk', sans-serif);
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: -.03em;
          color: var(--ink);
          margin: 0 0 0.25rem;
        }
        .about-tagline {
          font-size: 1.05rem;
          color: var(--accent);
          font-weight: 700;
          margin: 0 0 0.5rem;
        }
        .about-meta {
          font-size: 0.78rem;
          color: var(--ink-muted);
          font-weight: 550;
        }
        .about-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.15rem 1.35rem;
          margin-top: 1.5rem;
        }
        .about-footer-logo {
          width: 44px;
          height: 44px;
          border-radius: 11px;
        }
        .about-footer-name {
          font-weight: 800;
          color: var(--ink);
          font-size: 0.92rem;
        }
        .about-footer-copy {
          font-size: 0.78rem;
          color: var(--ink-muted);
          margin-top: 0.15rem;
        }
        .about-footer-note {
          font-size: 0.72rem;
          color: var(--ink-subtle);
          margin-top: 0.2rem;
        }
      `}</style>
    </div>
  )
}
