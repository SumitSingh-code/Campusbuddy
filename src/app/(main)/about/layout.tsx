import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About UniGram — CRSU Jind Student Platform & Mission',
  description:
    'Learn about UniGram (unigramjind.site): the independent campus social network and academic utility built for Chaudhary Ranbir Singh University (CRSU), Jind. Founded by Sumit Singh.',
  alternates: {
    canonical: 'https://unigramjind.site/about',
  },
  openGraph: {
    title: 'About UniGram — CRSU Jind Student Platform',
    description:
      'The story, technology, and student community behind UniGram (unigramjind.site), Jind.',
    url: 'https://unigramjind.site/about',
    siteName: 'UniGram',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
