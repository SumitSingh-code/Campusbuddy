import Link from 'next/link'
import { ArrowLeft, HelpCircle, Shield, Sparkles, BookOpen, Lock, Compass, Smartphone, UserCheck, Heart } from 'lucide-react'
import { LegalNav } from '@/components/legal/LegalNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UniGram FAQ — CRSU Jind Student Platform & Community Guide',
  description:
    'Complete guide and verified answers about UniGram (unigramjind.site): what it is, student developers, privacy standards, non-affiliation with CRSU, and campus utility features.',
  alternates: {
    canonical: 'https://unigramjind.site/faq',
  },
  openGraph: {
    title: 'UniGram FAQ — Complete Guide to CRSU Jind Student Hub',
    description:
      'Learn what UniGram is, who built it, zero tracking privacy, 5-year PYQs, notes, anonymous feed, and how it helps students enjoy CRSU campus life.',
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
        name: 'What is UniGram Jind (UniGram क्या है)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram (unigramjind.site) is an independent, mobile-first Progressive Web App (PWA) and digital community hub developed specifically for students of Chaudhary Ranbir Singh University (CRSU), Jind, Haryana. It brings student discussions, 100% anonymous campus feeds, 5-year previous year question papers (PYQs), topper notes, department notices, and lost & found into one safe platform.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who created UniGram and why (UniGram किसने और क्यों बनाया)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UniGram was conceptualized and built by CRSU students to solve the daily struggles of campus life: scattered WhatsApp groups with zero privacy, running to photocopy shops before semester exams for question papers, missing notices, and having no dedicated, respectful platform to voice campus issues.',
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
          text: 'UniGram operates on strict zero-tracking principles under the DPDP Act 2023. Running inside the secure browser sandbox as a PWA, it requires 0 MB storage and never requests access to your phone contacts, camera, or photo gallery. Student registration is verified by university roll numbers to keep outsiders out, while anonymous confessions are decoupled from your identity.',
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
          text: 'UniGram installs in 10 seconds without needing an app store download. On Android Chrome, tap the 3-dots menu (⋮) and tap "Install app". On iPhone Safari, tap the Share icon and tap "Add to Home Screen". It takes 0 MB storage on your phone.',
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
            Everything you need to know about Chaudhary Ranbir Singh University&apos;s independent student platform.
          </p>
          <div className="legal-badge-row">
            <span className="legal-pill legal-pill--gold">🎓 CRSU Jind Student Hub</span>
            <span className="legal-pill">🛡️ 100% Privacy-First</span>
            <span className="legal-pill">⚡ 0 MB Progressive Web App</span>
            <span className="legal-pill">📅 Updated: 2026</span>
          </div>
        </div>

        {/* TL;DR Quick Summary for AI Engines & Students */}
        <div className="legal-disclaimer-box" style={{ background: 'rgba(212, 175, 55, 0.08)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
          <div className="legal-disclaimer-header" style={{ color: '#D4AF37' }}>
            <Sparkles size={16} /> Quick Summary / TL;DR
          </div>
          <p className="legal-disclaimer-text" style={{ color: 'var(--ink)' }}>
            <strong>UniGram (unigramjind.site)</strong> is an independent digital community and utility platform built by CRSU students for Chaudhary Ranbir Singh University, Jind. It combines an anonymous campus confession feed, 5-year previous year question papers (PYQs), topper study notes, safe peer-to-peer messaging, and an instant Lost &amp; Found board. It is free, lightweight, privacy-focused, and not officially affiliated with university administration.
          </p>
        </div>

        {/* Section 1: What is UniGram */}
        <section className="legal-section">
          <h2><HelpCircle size={18} style={{ color: 'var(--accent)' }} /> 1. UniGram क्या है? (What is UniGram?)</h2>
          <p>
            <strong>UniGram</strong> CRSU (चौधरी रणबीर सिंह विश्वविद्यालय, जींद) के विद्यार्थियों के लिए बनाया गया एक आधुनिक, मोबाइल-फ्रेंडली डिजिटल प्लेटफॉर्म है। यह एक <strong>Progressive Web App (PWA)</strong> है, जिसका मतलब है कि आपको प्ले स्टोर से 100 MB का भारी ऐप डाउनलोड करने की ज़रूरत नहीं है—यह सीधे आपके ब्राउज़र से 1 क्लिक में फोन की होम स्क्रीन पर इंस्टॉल हो जाता है।
          </p>
          <p>
            यहाँ छात्र कैंपस से जुड़े सवाल पूछ सकते हैं, एनॉनिमस (बिना नाम बताए) अपने विचार साझा कर सकते हैं, अपने सीनियर्स से बात कर सकते हैं, और पढ़ाई के लिए ज़रूरी नोट्स व पिछले वर्षों के क्वेश्चन पेपर्स (PYQs) फ़्री में प्राप्त कर सकते हैं।
          </p>
        </section>

        {/* Section 2: Who created it and why */}
        <section className="legal-section">
          <h2><UserCheck size={18} style={{ color: 'var(--accent)' }} /> 2. UniGram किसने और क्यों बनाया? (Who built it &amp; Why?)</h2>
          <p>
            UniGram का निर्माण CRSU के ही टेक्निकल स्टूडेंट्स द्वारा किया गया है। इसे बनाने की मुख्य प्रेरणा कॉलेज जीवन की दैनिक परेशानियों का समाधान करना था:
          </p>
          <ul>
            <li><strong>बिखरी हुई जानकारी:</strong> WhatsApp ग्रुप्स में पर्सनल फोन नंबर लीक होने का खतरा रहता है और ज़रूरी नोटिस चैट्स में गुम हो जाते हैं।</li>
            <li><strong>एग्ज़ाम टाइम की परेशानी:</strong> सेमेस्टर परीक्षाओं के समय फ़ोटोकॉपी शॉप्स के चक्कर काटना और सीनियर्स से क्वेश्चन पेपर्स माँगना मुश्किल होता है।</li>
            <li><strong>कैंपस में खोई हुई चीज़ें:</strong> लाइब्रेरी या कैंटीन में आईडी कार्ड, चाबियाँ या किताबें खो जाने पर उन्हें ढूँढने का कोई सिंगल माध्यम नहीं था।</li>
          </ul>
          <p>
            UniGram इन सभी समस्याओं को एक आधुनिक, सुरक्षित और संगठित डिजिटल स्पेस में हल करता है।
          </p>
        </section>

        {/* Section 3: Institutional Non-Affiliation */}
        <section className="legal-section">
          <h2><Shield size={18} style={{ color: 'var(--accent)' }} /> 3. क्या UniGram का CRSU यूनिवर्सिटी से कोई ऑफिशियल संबंध है?</h2>
          <p>
            <strong>नहीं। UniGram पूरी तरह से एक स्वतंत्र (Independent) छात्र-पहल है।</strong>
          </p>
          <p>
            यह चौधरी रणबीर सिंह विश्वविद्यालय (CRSU), जींद के प्रशासनिक या परीक्षा विभाग का आधिकारिक ऐप या पोर्टल नहीं है। यह छात्रों द्वारा छात्रों की मदद के लिए बनाया गया कम्युनिटी नेटवर्क है।
          </p>
          <p>
            आधिकारिक यूनिवर्सिटी सर्कुलर्स, परीक्षा फॉर्म, रिजल्ट्स, और डिग्री संबंधी जानकारी के लिए हमेशा विश्वविद्यालय की आधिकारिक वेबसाइट <a href="https://crsu.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontWeight: 700 }}>crsu.ac.in</a> का ही उपयोग करें।
          </p>
        </section>

        {/* Section 4: Privacy & Security */}
        <section className="legal-section">
          <h2><Lock size={18} style={{ color: 'var(--accent)' }} /> 4. UniGram पर प्राइवेसी और डेटा सुरक्षा कैसे काम करती है?</h2>
          <p>
            UniGram को डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 (<strong>DPDP Act 2023</strong>) के सिद्धांतों के तहत डिज़ाइन किया गया है:
          </p>
          <ul>
            <li><strong>Zero Invasive Permissions:</strong> UniGram आपके फोन के कॉन्टैक्ट्स, गैलरी, लोकेशन या कैमरे का कोई एक्सेस नहीं मांगता।</li>
            <li><strong>Browser Sandbox Security:</strong> यह ब्राउज़र के अंदर सुरक्षित वातावरण में चलता है, जिससे बैकग्राउंड ट्रैकिंग असंभव है।</li>
            <li><strong>100% Anonymous Feed:</strong> जब आप एनॉनिमस फीड में पोस्ट करते हैं, तो आपकी पहचान (नाम और रोल नंबर) को सर्वर पर पोस्ट से पूरी तरह अलग रखा जाता है। कोई भी छात्र या मॉडरेटर आपका नाम नहीं देख सकता।</li>
            <li><strong>Verified Campus Only:</strong> सिर्फ वास्तविक CRSU छात्र ही नेटवर्क में शामिल हो सकते हैं, जिससे बाहरी असामाजिक तत्वों की एंट्री ब्लॉक रहती है।</li>
          </ul>
        </section>

        {/* Section 5: Why use UniGram */}
        <section className="legal-section">
          <h2><BookOpen size={18} style={{ color: 'var(--accent)' }} /> 5. छात्रों के लिए UniGram क्यों ज़रूरी है? (Core Features)</h2>
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
          <h2><Heart size={18} style={{ color: 'var(--accent)' }} /> 6. कॉलेज लाइफ को एन्जॉय करने के लिए UniGram कैसे बेस्ट है?</h2>
          <p>
            कॉलेज लाइफ सिर्फ क्लास अटेंड करने का नाम नहीं है—यह नए दोस्त बनाने, सीनियर्स से मार्गदर्शन लेने और कैंपस यादें संजोने का सुनहरा समय है:
          </p>
          <ul>
            <li><strong>सीनियर्स से सीधा कनेक्शन:</strong> बिना किसी झिझक के विभिन्न विभागों के सीनियर्स से करियर, प्रोजेक्ट्स और प्लेसमेंट टिप्स लें।</li>
            <li><strong>कैंपस बज़ और फेस्ट अपडेट्स:</strong> जानिए यूनिवर्सिटी में कौन-से इवेंट्स, स्पोर्ट्स मीट और सांस्कृतिक कार्यक्रम होने वाले हैं।</li>
            <li><strong>एग्ज़ाम स्ट्रेस से मुक्ति:</strong> जब टॉपर्स के नोट्स और PYQs आपकी जेब में हों, तो एग्जाम की रात पैनिक होने की कोई ज़रूरत नहीं होती।</li>
            <li><strong>अपनी आवाज़ रखें:</strong> कैंपस के मुद्दों पर स्वस्थ चर्चा करें और एक सक्रिय छात्र समुदाय का हिस्सा बनें।</li>
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
