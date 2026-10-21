import Link from 'next/link'
import { ArrowLeft, Shield, CheckCircle2, XCircle, AlertTriangle, Lock, Eye, Flag, HeartHandshake } from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'

export const metadata = {
  title: 'Community Guidelines — Unigram',
  description: 'Community standards, anti-ragging zero tolerance, and student conduct guidelines for Unigram (CRSU Jind).',
}

export default function GuidelinesPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back Link */}
        <Link href="/settings" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Page Header */}
        <div className="legal-header">
          <h1 className="legal-title">Community Guidelines</h1>
          <p className="legal-subtitle">
            Safety, mutual respect, and academic integrity standards for all CRSU students on Unigram.
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">🛡️ Zero-Tolerance Anti-Ragging (UGC Compliant)</span>
            <span className="legal-pill">🤝 Safe Student Discourse</span>
            <span className="legal-pill">📅 Effective: 2026</span>
          </div>
        </div>

        {/* Institutional Non-Affiliation Disclaimer */}
        <div className="legal-disclaimer-box">
          <div className="legal-disclaimer-header">
            <Shield size={16} /> Independent Student Initiative Disclaimer
          </div>
          <p className="legal-disclaimer-text">
            <strong>Unigram is an independent, non-commercial student-led platform</strong> created to help CRSU students share knowledge and communicate constructively. It is <strong>NOT</strong> an official publication or official authority of Chaudhary Ranbir Singh University (CRSU), Jind. All students using this platform are required to conduct themselves in accordance with these standards and the laws of India.
          </p>
        </div>

        {/* Section 1: Core Philosophy */}
        <section className="legal-section">
          <h2><HeartHandshake size={18} style={{ color: 'var(--accent)' }} /> 1. The Core Philosophy</h2>
          <p>
            Unigram was built to make campus life easier, kinder, and more collaborative. Whether you are a fresher looking for campus guidance or a senior sharing previous year exam papers, our community thrives when students treat each other with dignity, empathy, and academic camaraderie.
          </p>
        </section>

        {/* Section 2: The Do's */}
        <section className="legal-section">
          <h2><CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> 2. Community Best Practices (The Do&apos;s)</h2>
          <ul>
            <li><strong>Support Fellow Students:</strong> Share verified lecture notes, previous year question papers (PYQs), exam tips, and departmental updates.</li>
            <li><strong>Constructive Debate:</strong> Critique ideas, not individuals. Respect diverse perspectives across different departments, batches, and backgrounds.</li>
            <li><strong>Help Others Find Lost Items:</strong> Use the Lost &amp; Found hub to reunite fellow students with lost ID cards, notebooks, keys, or belongings.</li>
            <li><strong>Credit Peer Work:</strong> Give credit when sharing study notes or academic materials prepared by other students or professors.</li>
            <li><strong>Use Moderation Reporting:</strong> If you spot abusive content or harassment, use the in-app 3-dot report menu immediately to alert student moderators.</li>
          </ul>
        </section>

        {/* Section 3: Strict Prohibitions & Zero-Tolerance */}
        <section className="legal-section">
          <h2><XCircle size={18} style={{ color: 'var(--danger)' }} /> 3. Strict Prohibitions (Zero-Tolerance)</h2>
          <p>
            The following actions are strictly prohibited on Unigram and will trigger immediate disciplinary sanctions:
          </p>
          <ul>
            <li><strong>Zero-Tolerance Anti-Ragging:</strong> In strict compliance with the UGC Regulations on Curbing the Menace of Ragging in Higher Educational Institutions, any form of ragging, hazing, verbal mockery, psychological humiliation, or threatening behavior directed at freshers or junior students is severely banned. Verified ragging reports will be referred to statutory authorities.</li>
            <li><strong>Cyberbullying &amp; Harassment:</strong> Targeted name-calling, intimidation, stalking, repetitive unwanted private messages (DMs), or humiliating fellow students.</li>
            <li><strong>Defamation &amp; Character Assassination:</strong> Publishing unverified rumors, malicious gossip, or defamatory allegations against teachers, university administrative staff, or fellow students.</li>
            <li><strong>Non-Consensual Media &amp; Privacy Violations:</strong> Sharing private photographs, personal chat screenshots without consent, or sexually explicit content (strictly forbidden under Sections 66E, 67, and 67A of the IT Act, 2000).</li>
            <li><strong>Doxxing:</strong> Disclosing anyone&apos;s personal phone number, hostel room number, residential address, or family details without their explicit authorization.</li>
            <li><strong>Academic Fraud &amp; Live Exam Leaks:</strong> Sharing or soliciting live/ongoing university question papers or facilitating real-time examination cheating. (Historical past-year papers from concluded exams are encouraged; live exam leaks are banned).</li>
            <li><strong>Hate Speech &amp; Communal Animosity:</strong> Promoting hate, violence, or discrimination based on religion, caste, gender, disability, or regional origin.</li>
            <li><strong>Impersonation &amp; Fake Details:</strong> Pretending to be someone else, using someone else&apos;s university roll number, or fabricating official notices.</li>
          </ul>
        </section>

        {/* Section 4: Anonymous Feed Rules */}
        <section className="legal-section">
          <h2><Eye size={18} style={{ color: 'var(--accent)' }} /> 4. Anonymous Feed — Specific Rules</h2>
          <div className="legal-callout">
            <p>
              <strong>IMPORTANT:</strong> The Anonymous Feed is designed for asking questions about campus life, discussing academic stress, or sharing honest campus reflections without peer pressure. <strong>It is NEVER a license to abuse people.</strong>
            </p>
          </div>
          <ul>
            <li><strong>No Naming Individuals:</strong> Do not mention names of specific students or faculty members in a derogatory or harassing way in anonymous posts.</li>
            <li><strong>Identity Auditability:</strong> In compliance with Indian law (IT Rules 2021), all anonymous posts are internally linked to the authenticated user ID in our database. Anonymity is visual only and does not grant legal immunity.</li>
            <li><strong>Targeted Abuse Penalty:</strong> Any user utilizing the anonymous feed to harass an individual will face an immediate permanent ban and hardware device block.</li>
          </ul>
        </section>

        {/* Section 5: Moderation System & Strike Tiers */}
        <section className="legal-section">
          <h2><AlertTriangle size={18} style={{ color: 'var(--warning)' }} /> 5. Enforcement &amp; Strike Policy</h2>
          <p>
            Reported content is promptly reviewed by our student administration team according to a graduated enforcement ladder:
          </p>
          <ul>
            <li><strong>Tier 1 — Warning &amp; Content Removal:</strong> Minor or first-time infractions result in content deletion and an in-app notice regarding the violated guideline.</li>
            <li><strong>Tier 2 — Temporary Suspension:</strong> Second or serious violations result in an account suspension for 7 to 14 days (account placed in read-only mode).</li>
            <li><strong>Tier 3 — Permanent Account Ban:</strong> Persistent violations, hate speech, or targeted bullying result in an immediate, irreversible ban and device block.</li>
            <li><strong>Severe Criminal Violations:</strong> In cases involving ragging, non-consensual media, or threats of violence, Unigram reserves the right and duty to report verified evidence to law enforcement authorities.</li>
          </ul>
        </section>

        {/* Section 6: How to Report Violations */}
        <section className="legal-section">
          <h2><Flag size={18} style={{ color: 'var(--ink)' }} /> 6. How to Report Violations</h2>
          <p>
            If you encounter any post, comment, or direct message that violates these guidelines:
          </p>
          <ol>
            <li><strong>In-App 3-Dot Menu:</strong> Tap the three dots (•••) on the post or comment and select <strong>&quot;Report Post&quot;</strong>. Select the violation category. This flags the post for priority review.</li>
            <li><strong>Urgent Inquiries / Serious Harassment:</strong> Email our team directly at <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a> with subject <strong>&quot;Urgent: Safety Violation&quot;</strong> and include the post link or screenshot.</li>
            <li><strong>Direct Message on Instagram:</strong> DM <a href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3" target="_blank" rel="noopener noreferrer">@unigramjind ↗</a> for emergency assistance.</li>
          </ol>
        </section>

        {/* Shared Bottom Legal Nav */}
        <LegalNav currentPath="/guidelines" />
      </div>
    </div>
  )
}
