import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Unigram' }

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/settings" className="legal-back">← Back</Link>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-date">Effective Date: August 2026</p>

        <section className="legal-section">
          <h2>1. Who We Are</h2>
          <p>Unigram is an independent student-run platform built for students of Chaudhary Ranbir Singh University (CRSU), Jind, Haryana. We are not officially affiliated with, endorsed by, or connected to CRSU or any university body in any way.</p>
          <p>Contact: <a href="mailto:grievance@unigram.app">grievance@unigram.app</a></p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Collect</h2>
          <p><strong>Required at signup:</strong> Full name, roll number, department, phone number.</p>
          <p><strong>Optional:</strong> Email address (required for email/password login; optional for Google login), profile avatar photo.</p>
          <p><strong>Content data:</strong> Posts you create (including anonymous posts), DM messages, comments, notes uploaded.</p>
          <p><strong>Authentication:</strong> Auth provider used (Google or email/password).</p>
          <p>We do not collect device identifiers, browser fingerprints, or location data beyond what you voluntarily provide.</p>
        </section>

        <section className="legal-section">
          <h2>3. Why We Collect It</h2>
          <ul>
            <li>Account creation, identity verification, and moderation</li>
            <li>Account recovery via phone number (for reset requests)</li>
            <li>Platform functionality (feed, DMs, timetable, etc.)</li>
            <li>Safety: even anonymous posts are tied to your identity internally for moderation and legal compliance</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Anonymous Feed</h2>
          <p>When you post to the Anonymous Feed, your post appears without your name in the UI. However, your identity <strong>is stored in our database</strong> and is accessible to platform administrators for moderation and legal compliance under the IT Rules 2021. If a post is reported and found to violate our terms, the author can be identified and action taken.</p>
          <p>Anonymity on Unigram is a UI feature — not a legal protection.</p>
        </section>

        <section className="legal-section">
          <h2>5. Where Data Is Stored</h2>
          <p>All data is stored on the Supabase platform (cloud database and storage). Servers may be located outside India. We do not sell your data to third parties.</p>
        </section>

        <section className="legal-section">
          <h2>6. How Long We Keep Your Data</h2>
          <p>Data is retained while your account is active. Upon a deletion request: your profile and personal data will be deleted within 30 days. Posts and DMs may be retained in anonymized form for moderation records.</p>
        </section>

        <section className="legal-section">
          <h2>7. Your Rights (DPDP Act 2023)</h2>
          <ul>
            <li><strong>Access:</strong> Request a copy of your data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
          </ul>
          <p>To exercise these rights, email <a href="mailto:grievance@unigram.app">grievance@unigram.app</a> with subject &quot;Data Request&quot;. We respond within 7 days.</p>
        </section>

        <section className="legal-section">
          <h2>8. Data Security</h2>
          <p>Passwords are stored as cryptographic hashes by Supabase Auth and are never accessible in plain text. Platform administrators cannot view your password. Data in transit is protected by TLS/HTTPS.</p>
        </section>

        <section className="legal-section">
          <h2>9. Children</h2>
          <p>Unigram is intended for university students (18 years and older). We do not knowingly collect data from minors.</p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to This Policy</h2>
          <p>We may update this policy periodically. Changes will be announced within the app. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section className="legal-section">
          <h2>11. Contact</h2>
          <p><a href="mailto:grievance@unigram.app">grievance@unigram.app</a></p>
        </section>

        <div className="legal-nav">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/contact">Grievance</Link>
        </div>
      </div>
      <style>{legalStyles}</style>
    </div>
  )
}

const legalStyles = `
.legal-page { min-height: 100dvh; background: var(--bg); }
.legal-container { max-width: 640px; margin: 0 auto; padding: 1rem 1.25rem 5rem; }
.legal-back { display: inline-flex; align-items: center; gap: .4rem; color: var(--accent); font-size: .875rem; font-weight: 600; text-decoration: none; margin-bottom: 1.5rem; }
.legal-title { font-size: 1.5rem; font-weight: 800; color: var(--ink); margin: 0 0 .25rem; letter-spacing: -.03em; }
.legal-date { font-size: .78rem; color: var(--ink-muted); margin-bottom: 1.5rem; }
.legal-section { margin-bottom: 1.5rem; }
.legal-section h2 { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .6rem; }
.legal-section p { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin: 0 0 .5rem; }
.legal-section p:last-child { margin-bottom: 0; }
.legal-section ul { padding-left: 1.25rem; margin: .4rem 0; }
.legal-section li { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin-bottom: .3rem; }
.legal-section a { color: var(--accent); }
.legal-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
.legal-nav a { font-size: .8125rem; color: var(--ink-muted); text-decoration: none; font-weight: 600; }
.legal-nav a:hover { color: var(--accent); }
`
