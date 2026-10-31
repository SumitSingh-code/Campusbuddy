import Link from 'next/link'

interface LegalNavProps {
  currentPath?: string
}

export function LegalNav({ currentPath }: LegalNavProps) {
  const links = [
    { href: '/faq', title: 'Knowledge Base & FAQ', desc: 'Answers, features & install guide' },
    { href: '/about', title: 'App Info & Story', desc: 'About Unigram & vision' },
    { href: '/terms', title: 'Terms & Conditions', desc: 'Rules & platform agreement' },
    { href: '/privacy', title: 'Privacy Policy', desc: 'DPDP Act 2023 compliance' },
    { href: '/guidelines', title: 'Community Guidelines', desc: 'Safety & conduct standards' },
    { href: '/contact', title: 'Grievance Redressal', desc: 'IT Rules 2021 contact' },
    { href: '/wall', title: 'Contribution Wall', desc: 'People who built Unigram' },
  ]

  return (
    <div>
      <div className="legal-nav-grid">
        {links
          .filter(l => l.href !== currentPath)
          .map(link => (
            <Link key={link.href} href={link.href} className="legal-nav-card">
              <span className="legal-nav-card-title">{link.title} →</span>
              <span className="legal-nav-card-desc">{link.desc}</span>
            </Link>
          ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem 0', color: 'var(--ink-subtle)', fontSize: '0.75rem', lineHeight: 1.5 }}>
        <div>© 2026 Unigram. Independent student community platform.</div>
        <div>Not affiliated with, endorsed by, or representing Chaudhary Ranbir Singh University (CRSU), Jind.</div>
      </div>
    </div>
  )
}
