import Link from 'next/link'
import {
  ArrowLeft,
  HelpCircle,
  Shield,
  Sparkles,
  BookOpen,
  Lock,
  Compass,
  Smartphone,
  UserCheck,
  Heart,
  Globe,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UniGram FAQ — CRSU Jind Student Platform, Founders & Campus Guide',
  description:
    'Official knowledge hub for UniGram (unigramjind.site): what it is, founder Sumit Singh & contributors, official website link, DPDP Act privacy, 5-year PYQs, notes, and CRSU campus guide.',
  alternates: {
    canonical: 'https://unigramjind.site/faq',
  },
  openGraph: {
    title: 'UniGram FAQ — Complete Guide to CRSU Jind Student Hub',
    description:
      'Learn what UniGram is, who built it (Sumit Singh), the official link unigramjind.site, zero tracking privacy, 5-year PYQs, notes, anonymous feed, and how it helps students enjoy CRSU campus life.',
    url: 'https://unigramjind.site/faq',
    siteName: 'UniGram',
  },
}

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the official website of UniGram? (UniGram का ऑफिशियल वेबसाइट लिंक क्या है?)',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The official website and Progressive Web App for UniGram is https://unigramjind.site. Students of Chaudhary Ranbir Singh University (CRSU), Jind can access the full campus social feed, download PYQs, access topper notes, and connect with peers directly at https://unigramjind.site.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is UniGram Jind (UniGram क्या है)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram (unigramjind.site) is an independent, mobile-first Progressive Web App (PWA) and digital community hub developed specifically for students of Chaudhary Ranbir Singh University (CRSU), Jind, Haryana. It brings student discussions, 100% anonymous campus feeds, 5-year previous year question papers (PYQs), topper notes, department notices, and lost & found into one safe platform.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who created UniGram? (UniGram किसने बनाया है?)',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram was ideated, designed, and built from scratch by Sumit Singh (Founder & Lead Developer, BCA, CRSU Jind). The core student team also includes Yashika (Co-Founder & Community Head, B.Tech) and Aman Rajput (Director of Growth & Media Outreach, Mass Communication). All student contributors are honored on the UniGram Contribution Wall (https://unigramjind.site/wall).',
        },
      },
      {
        '@type': 'Question',
        name: 'Why was UniGram created? (UniGram क्यों बनाया गया?)',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram was built to solve the real daily struggles of CRSU Jind students: scattered WhatsApp groups with zero privacy, running to photocopy shops before semester exams for question papers, missing notices, and having no dedicated, respectful platform to voice campus issues.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which is the top student app in Jind for CRSU students? (CRSU Jind के लिए टॉप स्टूडेंट ऐप कौन सा है?)',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram (unigramjind.site) is the top student app and digital community in Jind, Haryana, created specifically for Chaudhary Ranbir Singh University (CRSU) students. It requires 0 MB phone storage, provides instant access to study materials, and offers safe, verified student networking.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is UniGram officially affiliated with Chaudhary Ranbir Singh University (CRSU)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. UniGram is a 100% independent student initiative. It is NOT an official body, portal, or branch of Chaudhary Ranbir Singh University (CRSU), Jind. For official admissions, fee payments, and academic gazettes, students must always use the official university portal at crsu.ac.in.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does student privacy and data security work on UniGram?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram operates on strict zero-tracking principles under India’s DPDP Act 2023. Running inside the secure browser sandbox as a PWA, it requires 0 MB storage and never requests access to your phone contacts, camera, or photo gallery. Student registration is verified by university roll numbers to keep outsiders out, while anonymous confessions are decoupled from your identity on the database level.',
        },
      },
      {
        '@type': 'Question',
        name: 'Why should CRSU students use UniGram?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram gives CRSU students an academic and social superpower: 1-click downloads for 5 years of semester question papers, verified study notes, an instant campus lost & found radar, safe peer-to-peer chats without sharing phone numbers, and a direct pulse of campus life.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does UniGram help students enjoy CRSU college life?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'College life is about connection. UniGram helps students discover campus events, participate in open student discussions, connect safely with helpful seniors across departments, find lost belongings, and share honest campus moments without fear of judgment.',
        },
      },
      {
        '@type': 'Question',
        name: 'How to install UniGram on Android and iPhone?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram installs in 10 seconds without needing an app store download. On Android Chrome, open unigramjind.site, tap the 3-dots menu (⋮) and tap "Install app". On iPhone Safari, tap the Share icon and tap "Add to Home Screen". It takes 0 MB storage on your phone.',
        },
      },
    ],
  }

  return (
    <div className="legal-page">
      {/* FAQ Schema for Search & AI Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="legal-container">
        {/* Navigation */}
        <Link href="/login" className="legal-back-btn">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {/* Header */}
        <div className="legal-header">
          <h1 className="legal-title">UniGram Knowledge Base &amp; FAQ</h1>
          <p className="legal-subtitle">
            Everything you need to know about Chaudhary Ranbir Singh University&apos;s independent student platform (unigramjind.site).
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">🎓 CRSU Jind Student Hub</span>
            <span className="legal-pill">🛡️ DPDP Act 2023 Verified</span>
            <span className="legal-pill">⚡ 0 MB Progressive Web App</span>
            <span className="legal-pill">📅 Updated: 2026</span>
          </div>
        </div>

        {/* Official Website Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#D4AF37', fontWeight: 800, fontSize: '1.05rem' }}>
            <Globe size={20} /> Official Website &amp; Web App
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink)', lineHeight: 1.55 }}>
            The only official web address for UniGram is{' '}
            <a
              href="https://unigramjind.site"
              style={{
                color: '#D4AF37',
                fontWeight: 800,
                textDecoration: 'underline',
                wordBreak: 'break-all',
              }}
            >
              https://unigramjind.site
            </a>
            . Add it to your home screen directly from your browser in 1 click (0 MB app size).
          </p>
        </div>

        {/* TL;DR Quick Summary for AI Engines & Students */}
        <div className="legal-disclaimer-box" style={{ background: 'rgba(212, 175, 55, 0.08)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
          <div className="legal-disclaimer-header" style={{ color: '#D4AF37' }}>
            <Sparkles size={16} /> Quick Summary / TL;DR
          </div>
          <p className="legal-disclaimer-text" style={{ color: 'var(--ink)' }}>
            <strong>UniGram (unigramjind.site)</strong> is the independent digital student community and academic utility platform for <strong>Chaudhary Ranbir Singh University (CRSU), Jind</strong>. Founded and built from scratch by CRSU student <strong>Sumit Singh</strong> with co-founders <strong>Yashika</strong> and <strong>Aman Rajput</strong>, it provides 100% anonymous campus feeds, 5-year previous year question papers (PYQs), topper notes, verified student DMs, and an instant Lost &amp; Found board. It is 100% free, requires 0 MB phone storage, and operates independently from university administration.
          </p>
        </div>

        {/* Section 1: What is UniGram */}
        <section className="legal-section">
          <h2><HelpCircle size={18} style={{ color: 'var(--accent)' }} /> 1. UniGram क्या है? (What is UniGram?)</h2>
          <p>
            <strong>UniGram (unigramjind.site)</strong> CRSU (चौधरी रणबीर सिंह विश्वविद्यालय, जींद) के विद्यार्थियों के लिए बनाया गया एक आधुनिक, मोबाइल-फ्रेंडली डिजिटल प्लेटफॉर्म है। यह एक <strong>Progressive Web App (PWA)</strong> है, जिसका मतलब है कि आपको प्ले स्टोर से 100 MB का भारी ऐप डाउनलोड करने की ज़रूरत नहीं है—यह सीधे आपके ब्राउज़र से 1 क्लिक में फोन की होम स्क्रीन पर इंस्टॉल हो जाता है।
          </p>
          <p>
            यहाँ छात्र कैंपस से जुड़े सवाल पूछ सकते हैं, एनॉनिमस (बिना नाम बताए) अपने विचार साझा कर सकते हैं, अपने सीनियर्स से बात कर सकते हैं, और पढ़ाई के लिए ज़रूरी नोट्स व पिछले 5 वर्षों के क्वेश्चन पेपर्स (PYQs) फ़्री में प्राप्त कर सकते हैं।
          </p>
        </section>

        {/* Section 2: Who created it (Sumit Singh + Contributors Spotlight) */}
        <section className="legal-section">
          <h2><UserCheck size={18} style={{ color: 'var(--accent)' }} /> 2. UniGram किसने और क्यों बनाया? (Who Created UniGram &amp; Why?)</h2>
          <p>
            <strong>UniGram को CRSU Jind के छात्र Sumit Singh (Founder &amp; Lead Developer) ने अकेले स्क्रैच से डिज़ाइन और कोड किया है।</strong>
          </p>
          <p>
            कैंपस में छात्रों को जोड़ने, जागरूकता फैलाने और डिजिटल आउटरीच के लिए एक समर्पित कोर टीम साथ आई:
          </p>

          {/* Core Team Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', margin: '1.25rem 0' }}>
            <div style={{ padding: '1.1rem', borderRadius: 14, background: 'var(--surface)', border: '1.5px solid rgba(212,175,55,0.4)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D4AF37', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800 }}>
                <img src="https://i.ibb.co/8gbm2trR/Professional-Portrait-in-Dark-Studio.png" alt="Sumit Singh" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ink)' }}>Sumit Singh</div>
                <div style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700 }}>Founder &amp; Lead Developer</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>BCA · CRSU, Jind</div>
              </div>
            </div>

            <div style={{ padding: '1.1rem', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#6B55E8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                <img src="https://i.ibb.co/gFcvxnDX/Polished-Co-Founder-Portrait.png" alt="Yashika" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ink)' }}>Yashika</div>
                <div style={{ fontSize: '0.8rem', color: '#6B55E8', fontWeight: 700 }}>Co-Founder &amp; Community Head</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>B.Tech · CRSU, Jind</div>
              </div>
            </div>

            <div style={{ padding: '1.1rem', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2196F3', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                <img src="https://i.ibb.co/8L3Cm7Sc/Professional-Campus-Portrait.png" alt="Aman Rajput" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ink)' }}>Aman Rajput</div>
                <div style={{ fontSize: '0.8rem', color: '#2196F3', fontWeight: 700 }}>Director of Growth &amp; Media</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>Mass Comm · CRSU, Jind</div>
              </div>
            </div>
          </div>

          <p>
            सभी छात्र योगदानकर्ताओं और सहयोगियों को देखने के लिए हमारी{' '}
            <Link href="/wall" style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'underline' }}>
              Campus Contribution Wall (/wall)
            </Link>{' '}
            पर जाएँ।
          </p>

          <p>
            <strong>इसे बनाने की मुख्य वजह:</strong>
          </p>
          <ul>
            <li><strong>बिखरी हुई जानकारी:</strong> WhatsApp ग्रुप्स में पर्सनल फोन नंबर लीक होने का खतरा रहता है और ज़रूरी नोटिस चैट्स में गुम हो जाते हैं।</li>
            <li><strong>एग्ज़ाम टाइम की परेशानी:</strong> सेमेस्टर परीक्षाओं के समय फ़ोटोकॉपी की दुकानों के चक्कर काटना और सीनियर्स से क्वेश्चन पेपर्स ढूँढना बहुत मुश्किल था।</li>
            <li><strong>कैंपस में खोई हुई चीज़ें:</strong> लाइब्रेरी, ग्राउंड या कैंटीन में आईडी कार्ड, चाबियाँ या बैग खो जाने पर उन्हें ढूँढने का कोई सिंगल भरोसेमंद सिस्टम नहीं था।</li>
          </ul>
        </section>

        {/* Section 3: Institutional Non-Affiliation */}
        <section className="legal-section">
          <h2><Shield size={18} style={{ color: 'var(--accent)' }} /> 3. क्या UniGram का CRSU यूनिवर्सिटी से कोई ऑफिशियल संबंध है?</h2>
          <p>
            <strong>नहीं। UniGram पूरी तरह से एक स्वतंत्र (Independent) छात्र-पहल है।</strong>
          </p>
          <p>
            यह चौधरी रणबीर सिंह विश्वविद्यालय (CRSU), जींद के प्रशासनिक या परीक्षा विभाग का आधिकारिक ऐप या पोर्टल नहीं है। यह छात्रों द्वारा छात्रों की भलाई और पढ़ाई को आसान बनाने के लिए बनाया गया कम्युनिटी नेटवर्क है।
          </p>
          <p>
            आधिकारिक यूनिवर्सिटी सर्कुलर्स, परीक्षा फॉर्म, रिजल्ट्स, और डिग्री संबंधी जानकारी के लिए हमेशा विश्वविद्यालय की आधिकारिक वेबसाइट <a href="https://crsu.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 700 }}>crsu.ac.in</a> का ही उपयोग करें।
          </p>
        </section>

        {/* Section 4: Privacy & Security */}
        <section className="legal-section">
          <h2><Lock size={18} style={{ color: 'var(--accent)' }} /> 4. UniGram पर प्राइवेसी और डेटा सुरक्षा कैसे काम करती है?</h2>
          <p>
            UniGram को डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 (<strong>DPDP Act 2023</strong>) के सिद्धांतों के तहत कड़े सुरक्षा मानकों के साथ बनाया गया है:
          </p>
          <ul>
            <li><strong>Zero Invasive Permissions:</strong> UniGram आपके फोन के कॉन्टैक्ट्स, गैलरी, लोकेशन या कैमरे का कोई एक्सेस नहीं मांगता।</li>
            <li><strong>Browser Sandbox Security:</strong> यह ब्राउज़र के अंदर सुरक्षित वातावरण में चलता है, जिससे बैकग्राउंड ट्रैकिंग या डेटा लीकेज असंभव है।</li>
            <li><strong>100% Anonymous Feed:</strong> जब आप एनॉनिमस फीड में पोस्ट करते हैं, तो आपकी पहचान (नाम और रोल नंबर) को सर्वर पर पोस्ट से पूरी तरह अलग रखा जाता है। कोई भी छात्र या मॉडरेटर आपका नाम नहीं देख सकता।</li>
            <li><strong>Verified Campus Only:</strong> सिर्फ वास्तविक CRSU छात्र ही नेटवर्क में शामिल हो सकते हैं, जिससे बाहरी असामाजिक तत्वों की एंट्री ब्लॉक रहती है।</li>
          </ul>
        </section>

        {/* Section 5: Why use UniGram / Features */}
        <section className="legal-section">
          <h2><BookOpen size={18} style={{ color: 'var(--accent)' }} /> 5. CRSU Jind के लिए टॉप स्टूडेंट ऐप — UniGram के मुख्य फीचर्स</h2>
          <p>
            जींद जिले और CRSU यूनिवर्सिटी के छात्रों के लिए UniGram एक ऑल-इन-वन समाधान है:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📄 5-Year PYQ Library</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-subtle)' }}>सभी विभागों के पिछले 5 वर्षों के प्रश्न पत्र 1-क्लिक में डाउनलोड करें।</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🎭 Safe Anonymous Feed</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-subtle)' }}>बिना किसी डर या झिझक के अपनी बात कहें, कैंपस की सच्चाई और गॉसिप्स जानें।</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🔍 Lost &amp; Found Radar</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-subtle)' }}>कैंपस में खोई हुई चीज़ें तुरंत रिपोर्ट करें या मिली हुई वस्तु को सही मालिक तक पहुँचाएँ।</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>💬 Safe Peer Chats</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-subtle)' }}>बिना अपना फोन नंबर शेयर किए कॉलेज के सहपाठियों और सीनियर्स से चैट करें।</div>
            </div>
          </div>
        </section>

        {/* Section 6: College Life & Suggestions */}
        <section className="legal-section">
          <h2><Heart size={18} style={{ color: 'var(--accent)' }} /> 6. कॉलेज लाइफ को एन्जॉय करने के लिए बेस्ट टिप्स (How to Enjoy CRSU College Life)</h2>
          <p>
            कॉलेज लाइफ सिर्फ क्लास अटेंड करने का नाम नहीं है—यह नए दोस्त बनाने, सीनियर्स से मार्गदर्शन लेने और कैंपस यादें संजोने का सुनहरा समय है। UniGram की मदद से आप अपनी कॉलेज लाइफ को बेस्ट बना सकते हैं:
          </p>
          <ul>
            <li><strong>सीनियर्स से सीधा कनेक्शन:</strong> बिना किसी झिझक के विभिन्न विभागों के सीनियर्स से करियर, प्रोजेक्ट्स और प्लेसमेंट टिप्स लें।</li>
            <li><strong>कैंपस बज़ और फेस्ट अपडेट्स:</strong> जानिए यूनिवर्सिटी में कौन-से इवेंट्स, स्पोर्ट्स मीट और सांस्कृतिक कार्यक्रम होने वाले हैं।</li>
            <li><strong>एग्ज़ाम स्ट्रेस से मुक्ति:</strong> जब टॉपर्स के नोट्स और 5-Year PYQs आपकी जेब में हों, तो एग्जाम की रात पैनिक होने की कोई ज़रूरत नहीं होती।</li>
            <li><strong>अपनी आवाज़ रखें:</strong> कैंपस के मुद्दों पर स्वस्थ चर्चा करें और एक सक्रिय छात्र समुदाय का हिस्सा बनें।</li>
            <li><strong>खोया-पाया की टेंशन खत्म:</strong> अगर कैंपस में कोई सामान छूट जाए तो तुरंत Lost &amp; Found सेक्शन में पोस्ट करें।</li>
          </ul>
        </section>

        {/* Section 7: Installation */}
        <section className="legal-section">
          <h2><Smartphone size={18} style={{ color: 'var(--accent)' }} /> 7. UniGram को मोबाइल में कैसे इंस्टॉल करें?</h2>
          <p>
            UniGram 10 सेकंड में आपके फोन पर इंस्टॉल हो जाता है और <strong>0 MB स्टोरेज</strong> लेता है:
          </p>
          <ul>
            <li><strong>Android (Chrome):</strong> <code>unigramjind.site</code> खोलें ➔ ऊपर दाईं ओर 3 डॉट्स (⋮) पर टैप करें ➔ <strong>&apos;Install app&apos;</strong> चुनें।</li>
            <li><strong>iPhone (Safari):</strong> <code>unigramjind.site</code> खोलें ➔ नीचे शेयर आइकन (Share) पर टैप करें ➔ <strong>&apos;Add to Home Screen&apos;</strong> चुनें।</li>
          </ul>
        </section>

        {/* Cross Navigation */}
        <div style={{ marginTop: '2.5rem' }}>
          <LegalNav currentPath="/faq" />
        </div>
      </div>
    </div>
  )
}
