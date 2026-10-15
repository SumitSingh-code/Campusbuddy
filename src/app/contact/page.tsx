import Link from 'next/link'

export const metadata = { title: 'Grievance Redressal — Unigram' }

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link href="/settings" className="legal-back">← Back</Link>
        <h1 className="legal-title">Grievance Redressal</h1>
        <p className="legal-date">IT Rules 2021 Compliant · Updated August 2026</p>

        <div className="contact-officer-card">
          <div className="contact-officer-icon">⚖️</div>
          <div>
            <div className="contact-officer-title">Grievance Officer</div>
            <div className="contact-officer-name">[Grievance Officer]</div>
            <div className="contact-officer-role">Grievance Officer, Unigram</div>
            <a href="mailto:grievance@unigram.app" className="contact-officer-email">grievance@unigram.app</a>
          </div>
        </div>

        <section className="legal-section">
          <h2>IT Rules 2021 Compliance</h2>
          <p>Unigram operates as an intermediary under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. We maintain a grievance redressal mechanism as mandated by these rules.</p>
        </section>

        <section className="legal-section">
          <h2>How to File a Complaint</h2>
          <p>Email us at <a href="mailto:grievance@unigram.app">grievance@unigram.app</a> with the following details:</p>
          <ul>
            <li><strong>Subject format:</strong> &quot;Grievance: [Issue Type]&quot;</li>
            <li>Examples: &quot;Grievance: Defamatory Post&quot;, &quot;Grievance: Privacy&quot;, &quot;Grievance: Account Issue&quot;</li>
            <li>Your full name and roll number</li>
            <li>Description of the issue</li>
            <li>Link or screenshot (if applicable)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Response Timeline</h2>
          <div className="contact-timeline">
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">Acknowledgment</div>
                <div className="contact-timeline-value">Within 24 hours</div>
              </div>
            </div>
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">Content Takedown</div>
                <div className="contact-timeline-value">Within 36 hours</div>
              </div>
            </div>
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">Account / Data Issues</div>
                <div className="contact-timeline-value">Within 7 days</div>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>Types of Complaints</h2>
          <ul>
            <li>Content complaints (defamatory, harassing, illegal, explicit)</li>
            <li>Privacy or data requests (access, correction, deletion)</li>
            <li>Account issues (wrongful ban, impersonation, unauthorized access)</li>
            <li>Technical issues</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Data Deletion Requests</h2>
          <p>To delete your account and all associated data, email us with subject <strong>&quot;Data Request: Delete Account&quot;</strong>. We process deletion requests within 30 days.</p>
        </section>

        <section className="legal-section">
          <h2>Appeal Process</h2>
          <p>If you are unsatisfied with the resolution of your complaint, you may submit an appeal by emailing us with subject: <strong>&quot;Grievance Appeal: [Original ticket date]&quot;</strong>.</p>
        </section>

        <section className="legal-section">
          <h2>Important Note</h2>
          <p>Unigram is a student-run platform operated on a best-effort basis. We are not a 24/7 operation. We genuinely care about the community and will do our best to address every concern promptly. Thank you for your patience.</p>
        </section>

        <div className="legal-nav">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/contact">Grievance</Link>
        </div>
      </div>
      <style>{contactStyles}</style>
    </div>
  )
}

const contactStyles = `
.legal-page { min-height: 100dvh; background: var(--bg); }
.legal-container { max-width: 640px; margin: 0 auto; padding: 1rem 1.25rem 5rem; }
.legal-back { display: inline-flex; align-items: center; gap: .4rem; color: var(--accent); font-size: .875rem; font-weight: 600; text-decoration: none; margin-bottom: 1.5rem; }
.legal-title { font-size: 1.5rem; font-weight: 800; color: var(--ink); margin: 0 0 .25rem; letter-spacing: -.03em; }
.legal-date { font-size: .78rem; color: var(--ink-muted); margin-bottom: 1.5rem; }

.contact-officer-card {
  display: flex; align-items: center; gap: 1rem;
  background: linear-gradient(135deg, rgba(212,175,55,.1) 0%, var(--surface) 100%);
  border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem;
  margin-bottom: 1.5rem;
}
.contact-officer-icon { font-size: 2rem; flex-shrink: 0; }
.contact-officer-title { font-size: .72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: .2rem; }
.contact-officer-name { font-size: 1rem; font-weight: 800; color: var(--ink); }
.contact-officer-role { font-size: .78rem; color: var(--ink-muted); margin-top: .1rem; }
.contact-officer-email { display: block; color: var(--accent); font-size: .8125rem; font-weight: 600; text-decoration: none; margin-top: .3rem; }

.legal-section { margin-bottom: 1.5rem; }
.legal-section h2 { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .6rem; }
.legal-section p { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin: 0 0 .5rem; }
.legal-section p:last-child { margin-bottom: 0; }
.legal-section ul { padding-left: 1.25rem; margin: .4rem 0; }
.legal-section li { font-size: .875rem; color: var(--ink-muted); line-height: 1.65; margin-bottom: .35rem; }
.legal-section strong { color: var(--ink); }
.legal-section a { color: var(--accent); }

.contact-timeline { display: flex; flex-direction: column; gap: .85rem; margin-top: .5rem; }
.contact-timeline-item { display: flex; align-items: flex-start; gap: .85rem; }
.contact-timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: .25rem; }
.contact-timeline-label { font-size: .8125rem; font-weight: 600; color: var(--ink); }
.contact-timeline-value { font-size: .78rem; color: var(--ink-muted); margin-top: .1rem; }

.legal-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
.legal-nav a { font-size: .8125rem; color: var(--ink-muted); text-decoration: none; font-weight: 600; }
.legal-nav a:hover { color: var(--accent); }
`
