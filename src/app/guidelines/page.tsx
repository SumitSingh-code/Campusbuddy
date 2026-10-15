import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Community Guidelines — Unigram' }

export default function GuidelinesPage() {
  // Redirect to the static HTML file if it exists, otherwise show inline
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/settings" className="legal-back">← Back</Link>
        <h1 className="legal-title">Community Guidelines</h1>
        <p className="legal-date">Effective: August 2026</p>

        <p className="guidelines-intro">
          Unigram is a space for CRSU students to connect, share, and help each other.
          These guidelines exist to keep it safe, respectful, and useful for everyone.
        </p>

        <section className="legal-section">
          <h2>✅ Do&apos;s</h2>
          <ul>
            <li>Share helpful academic resources, notices, and updates</li>
            <li>Be respectful in discussions — disagree with ideas, not people</li>
            <li>Report inappropriate content using the 3-dot menu</li>
            <li>Use your real university information for account verification</li>
            <li>Give credit when sharing others&apos; work</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>❌ Don&apos;ts</h2>
          <ul>
            <li>Harass, bully, or threaten any student or faculty member</li>
            <li>Share hateful content based on religion, caste, gender, or ethnicity</li>
            <li>Post explicit, sexual, or pornographic content</li>
            <li>Reveal personal information of others without consent (doxxing)</li>
            <li>Spread misinformation or fake notices</li>
            <li>Impersonate other students, faculty, or university officials</li>
            <li>Use the anonymous feed as a tool for targeted harassment</li>
            <li>Post spam or repetitive promotional content</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎭 Anonymous Feed — Special Rules</h2>
          <p>The anonymous feed exists so you can share honest thoughts without social pressure. However:</p>
          <ul>
            <li>Your identity is stored internally and accessible to admins for moderation</li>
            <li>Anonymity does not exempt you from these guidelines or legal consequences</li>
            <li>Using anonymity to harass specific individuals will result in an immediate ban</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🛡️ Moderation</h2>
          <p>Our admin team reviews reported content. Violations may result in:</p>
          <ul>
            <li>Content removal</li>
            <li>Temporary suspension</li>
            <li>Permanent ban</li>
            <li>Reporting to university authorities for severe violations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>📬 Report Content</h2>
          <p>Use the 3-dot menu on any post to report it. For urgent matters, email <a href="mailto:grievance@unigram.app">grievance@unigram.app</a>.</p>
        </section>

        <div className="legal-nav">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/contact">Grievance</Link>
        </div>
      </div>
      <style>{guidelinesStyles}</style>
    </div>
  )
}

const guidelinesStyles = `
.legal-page { min-height: 100dvh; background: var(--bg); }
.legal-container { max-width: 640px; margin: 0 auto; padding: 1rem 1.25rem 5rem; }
.legal-back { display: inline-flex; align-items: center; gap: .4rem; color: var(--accent); font-size: .875rem; font-weight: 600; text-decoration: none; margin-bottom: 1.5rem; }
.legal-title { font-size: 1.5rem; font-weight: 800; color: var(--ink); margin: 0 0 .25rem; letter-spacing: -.03em; }
.legal-date { font-size: .78rem; color: var(--ink-muted); margin-bottom: .75rem; }
.guidelines-intro { font-size: .9rem; color: var(--ink-muted); line-height: 1.65; margin-bottom: 1.5rem; padding: 1rem; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); }
.legal-section { margin-bottom: 1.5rem; }
.legal-section h2 { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .6rem; }
.legal-section p { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin: 0 0 .5rem; }
.legal-section ul { padding-left: 1.25rem; margin: .4rem 0; }
.legal-section li { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin-bottom: .35rem; }
.legal-section a { color: var(--accent); }
.legal-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
.legal-nav a { font-size: .8125rem; color: var(--ink-muted); text-decoration: none; font-weight: 600; }
.legal-nav a:hover { color: var(--accent); }
`
