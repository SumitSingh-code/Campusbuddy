'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import PostCard, { type Post } from '@/components/PostCard'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import { toast } from 'sonner'
import { Bookmark } from 'lucide-react'

export default function BookmarksPage() {
  const { user, isAdmin } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [reportPostId, setReportPostId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ data: Post[] }>('/bookmarks')
        setPosts(res.data || [])
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load bookmarks')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleVote(postId: string, type: 'up' | 'down', current?: string | null) {
    const newVote = current === type ? null : type
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const upvotes = p.upvotes + (current === 'up' ? -1 : 0) + (newVote === 'up' ? 1 : 0)
      const downvotes = p.downvotes + (current === 'down' ? -1 : 0) + (newVote === 'down' ? 1 : 0)
      return { ...p, my_vote: newVote as Post['my_vote'], upvotes, downvotes }
    }))
    try { await api.post(`/feed/${postId}/vote`, { type: newVote }) } catch { /* revert */ }
  }

  async function handleBookmark(postId: string, current: boolean) {
    // Removing bookmark = removing from this list
    if (current) {
      try {
        await api.delete(`/bookmarks/${postId}`)
        setPosts(prev => prev.filter(p => p.id !== postId))
        toast.success('Bookmark removed')
      } catch { toast.error('Failed to remove bookmark') }
    }
  }

  return (
    <div>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)' }}>
        <Bookmark size={20} style={{ color: 'var(--accent)' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Bookmarks</h2>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <Bookmark size={40} style={{ color: 'var(--ink-subtle)', margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--ink)', marginBottom: 8 }}>No bookmarks yet</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Tap the bookmark icon on any post to save it here.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={{ ...post, is_bookmarked: true }}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onVote={handleVote}
            onComment={setCommentsPostId}
            onBookmark={handleBookmark}
            onReport={setReportPostId}
          />
        ))
      )}

      {commentsPostId && (
        <CommentsSheet postId={commentsPostId} currentUserId={user?.id} isAdmin={isAdmin} onClose={() => setCommentsPostId(null)}
          onCommentCountChange={count => setPosts(prev => prev.map(p => p.id === commentsPostId ? { ...p, comment_count: count } : p))}
        />
      )}
      {reportPostId && <ReportDialog postId={reportPostId} endpoint="/feed" onClose={() => setReportPostId(null)} />}
    </div>
  )
}
