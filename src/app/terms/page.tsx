import Link from 'next/link'
import { ArrowLeft, Shield, Scale, AlertTriangle, FileText, CheckCircle2, Ban, Lock } from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'

export const metadata = {
  title: 'Terms & Conditions — UniGram CRSU',
  description: 'Terms of Service and Intermediary User Agreement for the UniGram student platform (CRSU Jind, unigramjind.site).',
  alternates: {
    canonical: 'https://unigramjind.site/terms',
  },
}

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back Link */}
        <Link href="/settings" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>

        {/* Page Header */}
        <div className="legal-header">
          <h1 className="legal-title">Terms &amp; Conditions</h1>
          <p className="legal-subtitle">
            User Agreement &amp; Platform Terms governing your access and usage of Unigram.
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">⚖️ IT Act 2000 Section 79 Safe Harbor</span>
            <span className="legal-pill">🛡️ IT Rules 2021 Compliant</span>
            <span className="legal-pill">📅 Updated: 2026</span>
          </div>
        </div>

        {/* Prominent University Disclaimer */}
        <div className="legal-disclaimer-box">
          <div className="legal-disclaimer-header">
            <Shield size={16} /> Section 1: Institutional Non-Affiliation &amp; Nominative Fair Use
          </div>
          <p className="legal-disclaimer-text">
            <strong>Unigram is an independent, non-commercial student-run software project.</strong> It is <strong>NOT</strong> an official application, body, or representative of <strong>Chaudhary Ranbir Singh University (CRSU), Jind</strong>, its administrative council, or any affiliated colleges. The university name &quot;CRSU&quot; and related department designations are utilized solely under the doctrine of <strong>Nominative Fair Use</strong> (Section 30, Trade Marks Act, 1999) to accurately designate the student community served. Unigram does not claim any endorsement, sponsorship, or institutional affiliation. For official university circulars, examinations, and official notifications, users must consult <a href="https://crsu.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 700 }}>crsu.ac.in</a>.
          </p>
        </div>

        {/* Section 2: Intermediary Status & Section 79 Safe Harbor */}
        <section className="legal-section">
          <h2><Scale size={18} style={{ color: 'var(--accent)' }} /> 2. Intermediary Status &amp; Statutory Safe Harbor (IT Act, 2000)</h2>
          <p>
            Unigram operates strictly as an <strong>&quot;Intermediary&quot;</strong> as defined under Section 2(1)(w) of the Information Technology Act, 2000 (as amended) and governed by the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
          </p>
          <p>
            Pursuant to <strong>Section 79 of the Information Technology Act, 2000</strong>:
          </p>
          <ul>
            <li>Unigram functions solely as an electronic platform facilitating peer-to-peer communication, discussions, and educational resource sharing among university students.</li>
            <li>Unigram does not initiate user transmissions, does not select the receivers of user transmissions, and does not select or modify information contained in user posts.</li>
            <li><strong>You, as the user, are solely and personally legally responsible and liable</strong> for all content, statements, media, comments, and messages you create, upload, or transmit on or through Unigram.</li>
            <li>Unigram, its student developers, creators, administrators, and coordinators disclaim any and all liability for third-party user-generated content.</li>
          </ul>
        </section>

        {/* Section 3: Eligibility & Account Registration */}
        <section className="legal-section">
          <h2><CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> 3. Student Eligibility &amp; Account Integrity</h2>
          <p>
            Unigram is designed exclusively for currently enrolled students of CRSU Jind. By registering for an account, you affirm and warrant that:
          </p>
          <ul>
            <li>You are a bona fide student enrolled in a recognized program or department of CRSU Jind.</li>
            <li>All personal details submitted during registration (including your Full Name, Roll Number, Department, and Mobile Number) are truthful, accurate, current, and belong to you.</li>
            <li>You will not create accounts using false identities, borrowed roll numbers, or impersonate other students, faculty members, or university authorities. Falsification of records will lead to immediate account termination and permanent device banning.</li>
            <li>You are responsible for safeguarding your login credentials. You agree to notify Unigram immediately at <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a> if you discover unauthorized access.</li>
          </ul>
        </section>

        {/* Section 4: Prohibited Content & Zero-Tolerance Standards */}
        <section className="legal-section">
          <h2><Ban size={18} style={{ color: 'var(--danger)' }} /> 4. Prohibited Content &amp; Student Conduct</h2>
          <p>
            In strict compliance with Rule 3(1)(b) of the IT Rules 2021 and applicable Indian criminal law (Bharatiya Nyaya Sanhita, 2023 / Indian Penal Code), users are strictly prohibited from hosting, displaying, uploading, modifying, publishing, transmitting, or sharing any content that:
          </p>
          <ul>
            <li><strong>Harassment &amp; Bullying:</strong> Defames, harasses, stalks, intimidates, abuses, or insults any fellow student, faculty member, university officer, or third party.</li>
            <li><strong>Anti-Ragging Compliance:</strong> Violates UGC Regulations on Curbing the Menace of Ragging in Higher Educational Institutions or involves psychological, verbal, physical, or online ragging.</li>
            <li><strong>Defamation &amp; False Statements:</strong> Contains defamatory, libelous, false, or fabricated allegations against individuals or institutions.</li>
            <li><strong>Obscene &amp; Sexual Media:</strong> Is pornographic, sexually explicit, pedophilic, non-consensual sexual media (Section 66E &amp; 67 IT Act), or invasive of privacy.</li>
            <li><strong>Doxxing &amp; Privacy Breach:</strong> Reveals private phone numbers, home addresses, private photos, or personal sensitive data of any individual without explicit consent.</li>
            <li><strong>Hate Speech &amp; Disruption:</strong> Promotes disharmony, hatred, or ill-will between different religious, caste, linguistic, regional, or gender groups.</li>
            <li><strong>Academic Malpractice:</strong> Solicits, facilitates, or leaks ongoing or live university examination papers, question leaks, or academic fraud.</li>
            <li><strong>Spam &amp; Malicious Code:</strong> Contains software viruses, phishing links, unsolicited commercial advertising, or automated bot activities.</li>
          </ul>
        </section>

        {/* Section 5: Anonymous Feed Transparency */}
        <section className="legal-section">
          <h2><Lock size={18} style={{ color: 'var(--accent)' }} /> 5. Anonymous Feed — Legal Transparency Notice</h2>
          <div className="legal-callout">
            <p>
              <strong>IMPORTANT STATUTORY NOTICE:</strong> Anonymity on Unigram is an interface design feature provided so students can share feedback and open campus queries without peer social anxiety. <strong>It is NOT a legal shield, immunity, or defense against civil or criminal law.</strong>
            </p>
          </div>
          <p>
            In strict compliance with Rule 3(1)(h) of the IT Rules 2021, all anonymous posts are internally linked to the authenticated user ID and audit logs in our encrypted database.
          </p>
          <p>
            If any anonymous post violates these Terms, Indian law, or constitutes harassment/defamation, administrators maintain the right and statutory duty to remove the content and, upon receipt of a lawful order or notice by competent authorities or grievance bodies, disclose the author&apos;s identity as mandated by law.
          </p>
        </section>

        {/* Section 6: Study Materials & Copyright Fair Dealing */}
        <section className="legal-section">
          <h2><FileText size={18} style={{ color: 'var(--ink)' }} /> 6. Study Notes, PYQ Library &amp; Educational Fair Dealing</h2>
          <p>
            Unigram provides community-driven repositories for study notes and previous years question papers (PYQs).
          </p>
          <ul>
            <li>All study materials, lecture summaries, and solved/unsolved past question papers uploaded by students are shared strictly under the doctrine of <strong>Fair Dealing for non-commercial educational study, review, and private research</strong> pursuant to Section 52(1)(a) of the Indian Copyright Act, 1957.</li>
            <li>Users uploading notes warrant that their shared content does not violate proprietary copyrights of commercial publications.</li>
            <li>If any copyright holder or faculty author objects to any document hosted on the platform, they may submit a formal takedown notice to <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a>. We remove validly identified copyrighted materials within 36 hours.</li>
          </ul>
        </section>

        {/* Section 7: Moderation, Strikes & Account Termination */}
        <section className="legal-section">
          <h2><AlertTriangle size={18} style={{ color: 'var(--warning)' }} /> 7. Platform Moderation &amp; Administrative Discretion</h2>
          <p>
            To maintain a safe, constructive university environment, Unigram administrators and automated filters reserve the absolute right to:
          </p>
          <ul>
            <li>Review all reported content and remove any material deemed in violation of these Terms or Community Guidelines.</li>
            <li>Issue formal warnings, temporary account suspensions (read-only mode), or permanent bans to offending accounts.</li>
            <li>Block repeat-offending devices and forward verified criminal threats or severe violations (such as ragging or non-consensual media) to competent disciplinary or law enforcement authorities.</li>
            <li>Discontinue, modify, or update features of the platform at any time without prior liability.</li>
          </ul>
        </section>

        {/* Section 8: Indemnification */}
        <section className="legal-section">
          <h2><Shield size={18} style={{ color: 'var(--accent)' }} /> 8. User Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Unigram, its founders, student developers, volunteer moderators, and contributors from and against any claims, liabilities, damages, losses, expenses, legal notices, or costs (including legal counsel fees) arising from or in any way connected with:
          </p>
          <ul>
            <li>Your access to or use of the platform.</li>
            <li>Any content or material you post, publish, upload, or transmit on Unigram.</li>
            <li>Your violation of these Terms, Community Guidelines, or any applicable Indian law.</li>
            <li>Your infringement of any third party&apos;s rights, including copyright, intellectual property, privacy, or reputation rights.</li>
          </ul>
        </section>

        {/* Section 9: Disclaimer of Warranties & Limitation of Liability */}
        <section className="legal-section">
          <h2>⚖️ 9. Disclaimer of Warranties &amp; Limitation of Liability</h2>
          <p>
            Unigram is provided on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis without warranties of any kind, whether express or implied.
          </p>
          <p>
            To the maximum extent permitted by applicable law, Unigram and its student creators shall not be liable for any direct, indirect, incidental, punitive, or consequential damages resulting from:
          </p>
          <ul>
            <li>Any user-generated statements, opinions, or campus discussions published on the platform.</li>
            <li>Platform downtime, server interruptions, lost data, or notification delays.</li>
            <li>Any unauthorized access to or alteration of your transmissions or data.</li>
          </ul>
        </section>

        {/* Section 10: Takedown Process & Grievance Mechanism */}
        <section className="legal-section">
          <h2>📬 10. Grievance Redressal &amp; Takedown Mechanism (IT Rules 2021)</h2>
          <p>
            Any student, faculty member, university officer, or third party who has an objection to any content hosted on Unigram may file an expeditious complaint:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a></li>
            <li><strong>Subject Line:</strong> &quot;Grievance: [Post / User / Issue Type]&quot;</li>
            <li><strong>Timelines:</strong> Acknowledged within <strong>24 hours</strong>; examined and acted upon within <strong>36 hours</strong> for prima facie unlawful content pursuant to Rule 3(1)(d) of the IT Rules 2021.</li>
          </ul>
          <p>
            For complete procedural details, see our <Link href="/contact" style={{ color: 'var(--accent)', fontWeight: 700 }}>Grievance Redressal Page →</Link>.
          </p>
        </section>

        {/* Section 11: Governing Law & Jurisdiction */}
        <section className="legal-section">
          <h2>🏛️ 11. Governing Law &amp; Dispute Jurisdiction</h2>
          <p>
            These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, proceeding, or suit arising out of or related to Unigram shall be subject to the exclusive territorial jurisdiction of the competent courts located at <strong>Jind, Haryana, India</strong>.
          </p>
        </section>

        {/* Section 12: Contact & Inquiries */}
        <section className="legal-section">
          <h2>✉️ 12. Contact &amp; Communication</h2>
          <p>
            For any queries, clarification on these Terms, or partnerships, contact our student team:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:unigramjind@gmail.com">unigramjind@gmail.com</a></li>
            <li><strong>Instagram:</strong> <a href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3" target="_blank" rel="noopener noreferrer">@unigramjind ↗</a></li>
          </ul>
        </section>

        {/* Shared Bottom Legal Nav */}
        <LegalNav currentPath="/terms" />
      </div>
    </div>
  )
}
