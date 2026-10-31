'use client'

import { useRouter } from 'next/navigation'
import { Ghost } from 'lucide-react'
import styles from './FeedModeToggle.module.css'

/** Changes feed routes so each mode keeps its existing posting and moderation rules. */
export default function FeedModeToggle({ anonymous = false }: { anonymous?: boolean }) {
  const router = useRouter()

  return (
    <div className={styles.bar}>
      <h1 className={styles.title}>{anonymous ? 'Anonymous feed' : 'Campus feed'}</h1>
      <button
        type="button"
        role="switch"
        aria-checked={anonymous}
        aria-label="Anonymous feed"
        className={styles.toggle}
        onClick={() => router.push(anonymous ? '/feed' : '/anon')}
      >
        <Ghost size={16} aria-hidden="true" />
        <span>Anon</span>
        <span className={styles.track} aria-hidden="true"><span /></span>
      </button>
    </div>
  )
}
