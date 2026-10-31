import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'

export const metadata = {
  title: 'Privacy Policy — UniGram CRSU',
  description: 'Privacy Policy and Data Protection standards for the UniGram student platform (CRSU Jind, unigramjind.site), compliant with DPDP Act 2023.',
  alternates: {
    canonical: 'https://unigramjind.site/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back Link */}
        <Link href="/settings" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Page Header */}
        <div className="legal-header">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-subtitle">
            How Unigram collects, protects, processes, and respects your personal data.
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">🛡️ DPDP Act 2023 Compliant</span>
            <span className="legal-pill">🔒 TLS 1.3 / HTTPS Encryption</span>
            <span className="legal-pill">📅 Updated: 2026</span>
          </div>
        </div>

        {/* Institutional Non-Affiliation Disclaimer */}
        <div className="legal-disclaimer-box">
          <div className="legal-disclaimer-header">
            <Shield size={16} /> Section 1: Data Fiduciary &amp; Independent Identity
          </div>
          <p className="legal-disclaimer-text">
            <strong>Unigram is an independent, non-commercial student-run software project.</strong> It is <strong>NOT</strong> officially affiliated with, endorsed, operated, or sponsored by <strong>Chaudhary Ranbir Singh University (CRSU), Jind</strong>, or any government university body. All student information collected is managed solely by the student developer team to operate the student network. For all privacy inquiries or data requests, contact our designated privacy desk at <a href="mailto:unigramjind@gmail.com" style={{ color: '#D4AF37', fontWeight: 700 }}>unigramjind@gmail.com</a>.
          </p>
        </div>

        {/* Section 2: Data We Collect */}
        <section className="legal-section">
          <h2><Database size={18} style={{ color: 'var(--accent)' }} /> 2. Personal Data We Collect</h2>
          <p>
            We adhere to strict data minimization principles under the Digital Personal Data Protection Act, 2023 (DPDP Act 2023). We only collect data that is strictly necessary to authenticate students, safeguard the campus network, and operate platform features:
          </p>
          <ul>
            <li><strong>Mandatory Verification Data:</strong> Full Name, University Roll Number, Academic Department, and 10-digit Mobile Phone Number. This data is collected to verify that every user is a bona fide CRSU student and prevent unauthorized outsiders from entering the network.</li>
            <li><strong>Authentication Data:</strong> Email address and encrypted authentication tokens provided through Supabase Auth or Google OAuth.</li>
            <li><strong>User Profile Data (Optional):</strong> Custom profile bio, avatar photograph, and graduation year (if provided voluntarily).</li>
            <li><strong>User-Generated Content:</strong> Posts published on the campus feed, anonymous posts, comments, study notes, past papers, and direct messages (DMs).</li>
            <li><strong>Push Notification Subscriptions:</strong> Standard browser Web Push endpoint tokens (via Firebase Cloud Messaging / Apple Push Notification service) required solely to deliver notification alerts for direct messages, notices, and interactions you opted into.</li>
            <li><strong>What We NEVER Collect:</strong> We do NOT collect GPS location data, phone contacts, call logs, SMS contents, browsing history outside Unigram, or payment/banking information.</li>
          </ul>
        </section>

        {/* Section 3: Purpose of Processing */}
        <section className="legal-section">
          <h2><CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> 3. Lawful Purpose of Data Processing</h2>
          <p>
            Your personal data is processed solely for lawful, student-focused operational purposes:
          </p>
          <ul>
            <li><strong>Campus Safety &amp; Verification:</strong> Validating student identities to ensure the community remains safe, civilized, and protected against trolls, spam, and non-student harassment.</li>
            <li><strong>Account Recovery:</strong> Using your registered roll number and phone number to verify and process administrative password reset requests.</li>
            <li><strong>Platform Functionality:</strong> Powering real-time DMs, campus announcements, student notices, and timetable schedules.</li>
            <li><strong>Legal &amp; Moderation Compliance:</strong> Ensuring compliance with the Information Technology (Intermediary Guidelines) Rules, 2021 and maintaining auditability to investigate verified reports of cyberbullying, harassment, or ragging.</li>
          </ul>
        </section>

        {/* Section 4: Anonymous Feed Transparency */}
        <section className="legal-section">
          <h2><Eye size={18} style={{ color: 'var(--warning)' }} /> 4. The Anonymous Feed &amp; Audit Trail Notice</h2>
          <div className="legal-callout">
            <p>
              <strong>STATUTORY TRANSPARENCY NOTICE:</strong> When you post in the Anonymous Feed, your name and department are masked from public view in the user interface. However, <strong>your post is internally linked to your authenticated user ID in our secure database.</strong>
            </p>
          </div>
          <p>
            This internal linkage is mandatory under Rule 3(1)(h) of the Information Technology (Intermediary Guidelines) Rules, 2021. Anonymity on Unigram is an interface courtesy designed to foster honest questions without social hesitation — <strong>it does NOT grant immunity for unlawful acts, defamation, threats, or harassment.</strong>
          </p>
          <p>
            Author identification is strictly restricted: no regular user or standard moderator can view author identities. Identity logs are examined solely by super-administrators under formal grievance proceedings or upon receipt of a lawful order issued by law enforcement or competent courts.
          </p>
        </section>

        {/* Section 5: Data Storage & Infrastructure */}
        <section className="legal-section">
          <h2><Lock size={18} style={{ color: 'var(--ink)' }} /> 5. Data Storage, Hosting &amp; Cloud Security</h2>
          <p>
            We implement industry-standard cryptographic and architectural measures to safeguard student information:
          </p>
          <ul>
            <li><strong>Encrypted Transport:</strong> All data transmitted between your browser or phone and Unigram servers is encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS).</li>
            <li><strong>Cloud Database &amp; Storage:</strong> Our primary databases and file storage buckets are hosted on Supabase enterprise infrastructure (PostgreSQL) with strict Row Level Security (RLS) policies preventing unauthorized cross-user access.</li>
            <li><strong>Password Protection:</strong> Passwords are never stored in plain text. They are hashed using one-way salted cryptographic hashing algorithms (bcrypt/Argon2). Platform administrators cannot see or retrieve your original password.</li>
          </ul>
        </section>

        {/* Section 6: Zero Data Selling */}
        <section className="legal-section">
          <h2>🚫 6. Absolute Zero Data-Selling Policy</h2>
          <p>
            <strong>Unigram will NEVER sell, lease, rent, monetize, or trade your personal data, phone number, email, or chat logs to any third-party marketing agency, advertiser, or data broker.</strong>
          </p>
          <p>
            Unigram is built by students as a non-commercial academic social utility. We do not use third-party behavioral ad trackers or cross-site commercial profiling tools.
          </p>
        </section>

        {/* Section 7: Student Data Rights (DPDP Act 2023) */}
        <section className="legal-section">
          <h2><Shield size={18} style={{ color: 'var(--accent)' }} /> 7. Your Data Rights Under DPDP Act 2023</h2>
          <p>
            As a student and data principal under the Digital Personal Data Protection Act, 2023, you enjoy statutory rights regarding your personal information:
          </p>
          <ul>
            <li><strong>Right to Access:</strong> You may request a summary of the personal data processed by Unigram associated with your account.</li>
            <li><strong>Right to Correction:</strong> You may request the correction of inaccurate, outdated, or misleading details (e.g., updating your full name or department) through the in-app profile editor or via email.</li>
            <li><strong>Right to Erasure / Account Deletion:</strong> You have the right to request the complete deletion of your account, profile, and personal identifiers.</li>
            <li><strong>Right of Grievance Redressal:</strong> You have the right to lodge a grievance with our privacy desk regarding any concern related to personal data processing.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a> with the subject line <strong>&quot;Data Request: [Access / Correction / Deletion]&quot;</strong>. We respond to verified student requests within <strong>7 business days</strong>.
          </p>
        </section>

        {/* Section 8: Data Retention & Deletion */}
        <section className="legal-section">
          <h2><Trash2 size={18} style={{ color: 'var(--danger)' }} /> 8. Data Retention &amp; Erasure Timelines</h2>
          <p>
            Your account data is retained as long as your account remains active on Unigram. When you submit a verified deletion request:
          </p>
          <ul>
            <li>Your account profile, login credentials, phone number, and roll number are permanently expunged from active user records within <strong>30 days</strong>.</li>
            <li>Direct messages sent to other users will display your profile as &quot;Deleted Student&quot;.</li>
            <li>Certain server audit and moderation logs may be preserved in an anonymized, non-personally identifiable state for a period mandated by Rule 3(1)(h) of the IT Rules 2021 solely to comply with statutory legal requirements.</li>
          </ul>
        </section>

        {/* Section 9: Law Enforcement Disclosures */}
        <section className="legal-section">
          <h2>🏛️ 9. Disclosure to Law Enforcement Authorities</h2>
          <p>
            Unigram cooperates with legal authorities strictly in accordance with Indian law:
          </p>
          <ul>
            <li>We do NOT volunteer or hand over user data arbitrarily.</li>
            <li>We disclose relevant user logs only upon receiving a formal, lawful notice issued by an authorized officer or court of competent jurisdiction under Section 91 of the Code of Criminal Procedure, 1973 (or Section 94 of Bharatiya Nagarik Suraksha Sanhita, 2023) or pursuant to valid directives under the Information Technology Act, 2000.</li>
          </ul>
        </section>

        {/* Section 10: Minors */}
        <section className="legal-section">
          <h2>🎓 10. University Age Requirement</h2>
          <p>
            Unigram is designed exclusively for enrolled collegiate students in undergraduate, postgraduate, or research programs (typically aged 18 and older). We do not knowingly collect personal data from minors below 18 years.
          </p>
        </section>

        {/* Section 11: Privacy Inquiries */}
        <section className="legal-section">
          <h2>📬 11. Privacy Contact Desk</h2>
          <p>
            For any questions, clarifications, or requests concerning this Privacy Policy, contact:
          </p>
          <ul>
            <li><strong>Official Privacy Desk:</strong> <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a></li>
            <li><strong>Instagram Handle:</strong> <a href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3" target="_blank" rel="noopener noreferrer">@unigramjind ↗</a></li>
            <li><strong>Geographic Location:</strong> Jind, Haryana — 126102, India</li>
          </ul>
        </section>

        {/* Shared Bottom Legal Nav */}
        <LegalNav currentPath="/privacy" />
      </div>
    </div>
  )
}
