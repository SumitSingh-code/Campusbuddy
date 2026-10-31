import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contribution Wall — UniGram CRSU Founders & Student Contributors',
  description:
    'Meet the students behind UniGram (unigramjind.site): Sumit Singh (Founder & Lead Developer), Yashika (Co-Founder & Community Head), Aman Rajput, and the CRSU Jind community.',
  alternates: {
    canonical: 'https://unigramjind.site/wall',
  },
  openGraph: {
    title: 'UniGram Contribution Wall — CRSU Jind Student Team',
    description:
      'Recognizing the visionaries and developers of Chaudhary Ranbir Singh University (CRSU), Jind student platform.',
    url: 'https://unigramjind.site/wall',
    siteName: 'UniGram',
  },
}

export default function WallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
