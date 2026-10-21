import Link from 'next/link'
import { ArrowLeft, Shield, Mail, Clock, CheckCircle2, AlertCircle, Send, MessageSquare } from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'

function InstagramIcon({ size = 15, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

export const metadata = {
  title: 'Grievance Redressal & Contact — Unigram',
  description: 'Official Grievance Redressal mechanism for Unigram compliant with Rule 3(2) of the Information Technology Rules, 2021.',
}

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back Link */}
        <Link href="/settings" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Page Header */}
        <div className="legal-header">
          <h1 className="legal-title">Grievance Redressal &amp; Contact</h1>
          <p className="legal-subtitle">
            Formal grievance redressal desk compliant with Rule 3(2) of the Information Technology (Intermediary Guidelines) Rules, 2021.
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">🛡️ IT Rules 2021 Compliant</span>
            <span className="legal-pill">⏱️ 24-Hour Acknowledgment Desk</span>
            <span className="legal-pill">📅 Updated: 2026</span>
          </div>
        </div>

        {/* Institutional Non-Affiliation Disclaimer */}
        <div className="legal-disclaimer-box">
          <div className="legal-disclaimer-header">
            <Shield size={16} /> Independent Student Initiative Notice
          </div>
          <p className="legal-disclaimer-text">
            <strong>Unigram is an independent student-run platform</strong> operating for the student community of Chaudhary Ranbir Singh University (CRSU), Jind. It is <strong>NOT</strong> an official body of CRSU Jind. For official university administration, examinations, or official grievances, please visit <a href="https://crsu.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 700 }}>crsu.ac.in</a>. For all concerns related to user posts on Unigram, use the dedicated desk below.
          </p>
        </div>

        {/* Designated Grievance Officer Card */}
        <div className="contact-officer-card">
          <div className="contact-officer-icon">📬</div>
          <div style={{ flex: 1 }}>
            <div className="contact-officer-title">Designated Grievance Desk</div>
            <div className="contact-officer-name">Grievance Officer · Unigram Student Community</div>
            <div className="contact-officer-role">Appointed under Rule 3(2), IT (Intermediary Guidelines) Rules, 2021</div>
            <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <a href="mailto:unigramjind@gmail.com" className="contact-officer-email">
                <Mail size={15} /> unigramjind@gmail.com
              </a>
              <a
                href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#E1306C', fontSize: '0.82rem', fontWeight: 650, textDecoration: 'none' }}
              >
                <InstagramIcon size={15} /> @unigramjind ↗
              </a>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)', marginTop: '0.5rem' }}>
              Location: Jind, Haryana — 126102, India
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <a
            href="mailto:unigramjind@gmail.com?subject=Grievance:%20Content%20Violation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1.5px solid var(--accent)',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <Send size={16} style={{ color: 'var(--accent)' }} /> Report Content Violation
          </a>
          <a
            href="mailto:unigramjind@gmail.com?subject=Data%20Request:%20Delete%20Account"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontWeight: 650,
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} style={{ color: 'var(--danger)' }} /> Request Account Deletion
          </a>
        </div>

        {/* Dedicated Bridge for Faculty & University Officers */}
        <section className="legal-section" style={{ borderLeft: '4px solid #D4AF37' }}>
          <h2>🎓 Priority Channel for University Faculty &amp; Administration</h2>
          <p>
            We hold Chaudhary Ranbir Singh University (CRSU), its esteemed faculty members, and administrative officers in the highest respect. Unigram was created solely to help students collaborate academically.
          </p>
          <p>
            If any faculty member, department head, or university administrative official finds any user post inaccurate, inappropriate, or concerning:
          </p>
          <ul>
            <li>Please email us directly at <a href="mailto:unigramjind@gmail.com?subject=Priority:%20Faculty%20or%20University%20Inquiry">unigramjind@gmail.com</a> with the subject line <strong>&quot;Priority: Faculty / University Notice&quot;</strong>.</li>
            <li>We treat all faculty communications with utmost urgency and will resolve verified concerns within <strong>12 to 24 hours</strong> without necessitating formal administrative proceedings.</li>
          </ul>
        </section>

        {/* Section: Statutory Grievance Mechanism */}
        <section className="legal-section">
          <h2>⚖️ IT Rules 2021 Grievance Redressal Mandate</h2>
          <p>
            In accordance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, any user or affected individual may submit a grievance to our designated Grievance Desk regarding any content that violates platform terms or applicable law.
          </p>
        </section>

        {/* Section: How to File a Grievance */}
        <section className="legal-section">
          <h2>📝 How to File a Formal Grievance</h2>
          <p>
            To enable our team to investigate and act swiftly, please email <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a> with the following details:
          </p>
          <ul>
            <li><strong>Subject Format:</strong> &quot;Grievance: [Issue Category]&quot; (e.g., <em>Grievance: Defamation</em>, <em>Grievance: Privacy Infringement</em>, <em>Grievance: Harassment</em>, <em>Grievance: Account Dispute</em>).</li>
            <li><strong>Complainant Information:</strong> Your Full Name and University Roll Number (if an enrolled student).</li>
            <li><strong>Specific Violation Description:</strong> Clear explanation of why the content violates platform guidelines or law.</li>
            <li><strong>Evidence:</strong> Post link, screenshot, or username of the offending post/account.</li>
          </ul>
        </section>

        {/* Section: Statutory Timelines */}
        <section className="legal-section">
          <h2>⏱️ Statutory Resolution Timelines (Rule 3)</h2>
          <div className="contact-timeline">
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">1. Acknowledgment of Complaint</div>
                <div className="contact-timeline-value">Within <strong>24 hours</strong> of receipt with a ticket reference.</div>
              </div>
            </div>
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">2. Takedown of Prima Facie Unlawful Content</div>
                <div className="contact-timeline-value">Within <strong>36 hours</strong> pursuant to Rule 3(1)(d) (for severe violations such as defamation, non-consensual media, or threats).</div>
              </div>
            </div>
            <div className="contact-timeline-item">
              <div className="contact-timeline-dot" />
              <div>
                <div className="contact-timeline-label">3. Complete Redressal / Communication of Action</div>
                <div className="contact-timeline-value">Within <strong>15 days</strong> as mandated by law (typically resolved within 3 to 7 days).</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Categories of Complaints */}
        <section className="legal-section">
          <h2>📁 Categories of Inquiries Handled</h2>
          <ul>
            <li><strong>Content Grievances:</strong> Defamatory statements, cyberbullying, abusive language, or doxxing.</li>
            <li><strong>Anti-Ragging Complaints:</strong> Urgent investigation of any attempted hazing or bullying.</li>
            <li><strong>Privacy &amp; Data Rights:</strong> DPDP Act 2023 requests for data access, correction, or permanent account deletion.</li>
            <li><strong>Copyright &amp; Study Notes:</strong> Removal requests by authors or copyright holders of shared educational documents.</li>
            <li><strong>Account &amp; Access Issues:</strong> Wrongful account suspensions, impersonation reports, or password recovery appeals.</li>
          </ul>
        </section>

        {/* Section: Appeal Process */}
        <section className="legal-section">
          <h2>🔄 Appeal Mechanism</h2>
          <p>
            If a complainant or account holder is dissatisfied with a grievance determination, they may submit a formal appeal within 15 days by emailing <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a> with the subject line <strong>&quot;Grievance Appeal: [Ticket Date / Case Reference]&quot;</strong>. Appeals are escalated to the platform founder for independent review.
          </p>
        </section>

        {/* Section: Operational Note */}
        <section className="legal-section">
          <h2>💬 Student Operation Commitment</h2>
          <p>
            Unigram is maintained by dedicated university students on a voluntary basis. We are deeply committed to maintaining a safe, respectful, and civilized digital campus. Every complaint is treated with seriousness, confidentiality, and fairness. Thank you for your support and patience.
          </p>
        </section>

        {/* Shared Bottom Legal Nav */}
        <LegalNav currentPath="/contact" />
      </div>

      <style>{`
        .contact-officer-card {
          display: flex;
          align-items: flex-start;
          gap: 1.15rem;
          background: linear-gradient(135deg, rgba(212,175,55,.12) 0%, var(--surface) 100%);
          border: 1.5px solid rgba(212,175,55,.3);
          border-radius: 18px;
          padding: 1.35rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 16px rgba(0,0,0,.04);
        }
        .contact-officer-icon {
          font-size: 2.25rem;
          line-height: 1;
        }
        .contact-officer-title {
          font-size: 0.72rem;
          font-weight: 750;
          color: #D4AF37;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.25rem;
        }
        .contact-officer-name {
          font-family: var(--font-heading, 'Space Grotesk', sans-serif);
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--ink);
        }
        .contact-officer-role {
          font-size: 0.78rem;
          color: var(--ink-muted);
          margin-top: 0.15rem;
        }
        .contact-officer-email {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
        }
        .contact-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.75rem;
        }
        .contact-timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }
        .contact-timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          margin-top: 0.3rem;
          box-shadow: 0 0 0 3px rgba(242,169,59,0.2);
        }
        .contact-timeline-label {
          font-size: 0.8875rem;
          font-weight: 700;
          color: var(--ink);
        }
        .contact-timeline-value {
          font-size: 0.8125rem;
          color: var(--ink-muted);
          margin-top: 0.15rem;
          line-height: 1.45;
        }
      `}</style>
    </div>
  )
}
