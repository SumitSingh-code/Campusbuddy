import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="nf-page">
      <div className="nf-content">
        <div className="nf-emoji">🔍</div>
        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Page not found</h2>
        <p className="nf-desc">This page doesn&apos;t exist or has been moved.</p>
        <Link href="/feed" className="nf-btn">Go to Feed</Link>
      </div>
      <style>{`
        .nf-page {
          min-height: 100dvh; background: var(--bg, #0D1117);
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        }
        .nf-content { text-align: center; }
        .nf-emoji { font-size: 4rem; margin-bottom: 1rem; }
        .nf-code { font-size: 5rem; font-weight: 900; color: var(--accent, #D4AF37); margin: 0; letter-spacing: -.06em; line-height: 1; }
        .nf-title { font-size: 1.5rem; font-weight: 700; color: var(--ink, #F0F0F0); margin: .5rem 0 .5rem; }
        .nf-desc { font-size: .9rem; color: var(--ink-muted, rgba(240,240,240,.5)); margin-bottom: 2rem; }
        .nf-btn {
          display: inline-flex; align-items: center;
          padding: .8rem 2rem; background: var(--accent, #D4AF37);
          color: var(--bg, #0D1117); border-radius: 12px;
          font-size: .9375rem; font-weight: 700; text-decoration: none;
          transition: opacity .15s;
        }
        .nf-btn:active { opacity: .8; }
      `}</style>
    </div>
  )
}
