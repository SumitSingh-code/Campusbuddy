import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join UniGram — Register for CRSU Jind Student Platform',
  description:
    'Create your verified UniGram student account for Chaudhary Ranbir Singh University (CRSU), Jind. Free access to 5-year PYQs, topper notes, lost & found, and anonymous campus feed.',
  alternates: {
    canonical: 'https://unigramjind.site/signup',
  },
  openGraph: {
    title: 'Join UniGram — Register for CRSU Jind Student Platform',
    description:
      'Join thousands of CRSU students on UniGram (unigramjind.site). Safe, verified, and 0 MB PWA.',
    url: 'https://unigramjind.site/signup',
    siteName: 'UniGram',
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
