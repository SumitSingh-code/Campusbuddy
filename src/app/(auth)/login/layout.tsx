import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login to UniGram — CRSU Jind Student Portal',
  description:
    'Sign in to your UniGram account (unigramjind.site). Access Chaudhary Ranbir Singh University (CRSU) campus feed, 5-year PYQs, topper notes, verified student DMs, and notices.',
  alternates: {
    canonical: 'https://unigramjind.site/login',
  },
  openGraph: {
    title: 'Login to UniGram — CRSU Jind Student Platform',
    description:
      'Connect with CRSU peers, download question papers, and explore the anonymous campus feed.',
    url: 'https://unigramjind.site/login',
    siteName: 'UniGram',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
