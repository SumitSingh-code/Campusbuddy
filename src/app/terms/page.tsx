import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions — Unigram' }

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/settings" className="legal-back">← Back</Link>
        <h1 className="legal-title">Terms &amp; Conditions</h1>
        <p className="legal-date">Effective Date: August 2026</p>

        <section className="legal-section">
          <h2>1. About Unigram</h2>
          <p>Unigram is an independent student-run platform built for students of Chaudhary Ranbir Singh University (CRSU), Jind. It is <strong>NOT officially affiliated with, endorsed by, or connected to</strong> CRSU or any university authority. The university name is referenced only to identify the student community we serve.</p>
        </section>

        <section className="legal-section">
          <h2>2. Eligibility</h2>
          <p>Unigram is open to enrolled students of CRSU, Jind only. By creating an account, you confirm that you are a current student and that the details you provide (name, roll number, department, phone number) are accurate and belong to you.</p>
        </section>

        <section className="legal-section">
          <h2>3. Account Responsibilities</h2>
          <ul>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Do not share your login credentials with anyone.</li>
            <li>Provide real, accurate information — fake or borrowed details will result in immediate account termination.</li>
            <li>Notify us immediately at <a href="mailto:grievance@unigram.app">grievance@unigram.app</a> if you suspect unauthorized access to your account.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Prohibited Content</h2>
          <p>The following content is strictly prohibited on Unigram:</p>
          <ul>
            <li>Harassment, bullying, or personal attacks against any individual</li>
            <li>Hate speech based on religion, caste, gender, ethnicity, or any protected characteristic</li>
            <li>Defamatory statements about any person or institution</li>
            <li>Explicit or sexual content involving real people</li>
            <li>Doxxing — sharing private personal information of others without their consent</li>
            <li>Illegal content of any kind</li>
            <li>Impersonation of other students, faculty, or university officials</li>
            <li>Spam or repetitive promotional content</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Anonymous Posts</h2>
          <p>When you post to the Anonymous Feed, your identity <strong>is stored in our backend database</strong>, even though your name is hidden from other users in the UI. This is required for moderation and legal compliance under the IT Rules 2021.</p>
          <p>If an anonymous post violates these Terms, administrators can identify the author and take appropriate action, including account suspension or reporting to relevant authorities. <strong>Anonymity is a UI feature, not a legal shield.</strong></p>
        </section>

        <section className="legal-section">
          <h2>6. Intellectual Property</h2>
          <p>You retain all rights to the content you post on Unigram. By posting, you grant Unigram a non-exclusive, royalty-free license to display your content on the platform. We do not claim ownership over your content.</p>
        </section>

        <section className="legal-section">
          <h2>7. Platform Rights</h2>
          <ul>
            <li>We may suspend, restrict, or permanently ban accounts that violate these terms.</li>
            <li>We may modify, discontinue, or add features without prior notice.</li>
            <li>We do not guarantee uninterrupted uptime or availability of the platform.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Takedown Process (IT Rules 2021)</h2>
          <p>To report illegal or harmful content, email <a href="mailto:grievance@unigram.app">grievance@unigram.app</a> with subject &quot;Grievance: [Issue Type]&quot;. We acknowledge within 24 hours and take action within 36 hours as required under IT Rules 2021.</p>
        </section>

        <section className="legal-section">
          <h2>9. Disclaimer</h2>
          <p>Unigram is provided &quot;as is&quot; without any warranty. We are not responsible for user-generated content posted on the platform. We are not responsible for any loss, harm, or damage arising from your use of the platform.</p>
        </section>

        <section className="legal-section">
          <h2>10. Governing Law</h2>
          <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts at Jind, Haryana.</p>
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
.legal-section li { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin-bottom: .35rem; }
.legal-section strong { color: var(--ink); }
.legal-section a { color: var(--accent); }
.legal-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
.legal-nav a { font-size: .8125rem; color: var(--ink-muted); text-decoration: none; font-weight: 600; }
.legal-nav a:hover { color: var(--accent); }
`
