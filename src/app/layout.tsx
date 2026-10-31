import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://unigramjind.site'),
  title: {
    default: 'UniGram — CRSU Campus Social Hub & Student Portal',
    template: '%s | UniGram CRSU',
  },
  description:
    'UniGram is the official campus social network and academic portal for Chaudhary Ranbir Singh University (CRSU), Jind. Anonymous feed, verified student DMs, PYQs, topper notes, lost & found, and notices.',
  keywords: [
    'CRSU',
    'CRSU Jind',
    'Chaudhary Ranbir Singh University',
    'UniGram',
    'UniGram Jind',
    'CRSU PYQ',
    'CRSU Question Papers',
    'CRSU Notes',
    'CRSU Campus',
    'CRSU Student Portal',
  ],
  authors: [{ name: 'UniGram Team' }],
  creator: 'UniGram',
  publisher: 'UniGram',
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://unigramjind.site',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://unigramjind.site',
    title: 'UniGram — CRSU Campus Social Hub & Student Portal',
    description:
      'The all-in-one digital campus hub for Chaudhary Ranbir Singh University (CRSU), Jind. 100% Anonymous Feed, PYQs, Notes, Safe DMs & Lost & Found.',
    siteName: 'UniGram',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'UniGram CRSU',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'UniGram — CRSU Campus Hub',
    description: 'Chaudhary Ranbir Singh University (CRSU) Jind student portal and social network.',
    images: ['/icons/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAFAF7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* Theme initialization — defaults to light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('unigram_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.removeAttribute('data-theme');if(!t)localStorage.setItem('unigram_theme','light');}})();`,
          }}
        />
        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW reg failed',e);});});}`,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </body>
    </html>
  )
}
