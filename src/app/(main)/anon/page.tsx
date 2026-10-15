'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Ghost, Send, Flag, Trash2, MoreHorizontal, Link2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'

interface AnonPost {
  id: string
  content: string
  created_at: string
  upvotes: number
  downvotes: number
  comment_count: number
  my_vote?: 'up' | 'down' | null
  is_own?: boolean
}

export default function AnonPage() {
  const { user, isAdmin } = useAuth()
  const [posts, setPosts] = useState<AnonPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [composeText, setComposeText] = useState('')
  const [composing, setComposing] = useState(false)
  const [postsToday, setPostsToday] = useState(0)

  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadPosts = useCallback(async (initial = false) => {
    if (!initial && (!hasMore || loadingMore)) return
    if (initial) { setLoading(true); setCursor(null); setHasMore(true) }
    else setLoadingMore(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (!initial && cursor) params.set('before', cursor)
      const res = await api.get<{ data: AnonPost[]; next_cursor: string | null; has_more: boolean; posts_today?: number }>(`/anon?${params}`)
      setPosts(prev => initial ? (res.data || []) : [...prev, ...(res.data || [])])
      setCursor(res.next_cursor)
      setHasMore(res.has_more)
      if (res.posts_today !== undefined) setPostsToday(res.posts_today)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load'
      if (initial) setError(msg)
      else toast.error(msg)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, hasMore, loadingMore])

  useEffect(() => { loadPosts(true) }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadPosts(false) },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadPosts])

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault()
    if (!composeText.trim() || composing) return
    if (postsToday >= 3) { toast.error('You can only post 3 anonymous posts per day'); return }
    setComposing(true)
    try {
      const res = await api.post<{ data: AnonPost; posts_today: number }>('/anon', { content: composeText.trim() })
      setPosts(prev => [{ ...res.data, is_own: true }, ...prev])
      setPostsToday(res.posts_today)
      setComposeText('')
      toast.success('Posted anonymously 👻')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setComposing(false)
    }
  }

  async function handleVote(postId: string, type: 'up' | 'down', current?: string | null) {
    const newVote = current === type ? null : type
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const upvotes = p.upvotes + (current === 'up' ? -1 : 0) + (newVote === 'up' ? 1 : 0)
      const downvotes = p.downvotes + (current === 'down' ? -1 : 0) + (newVote === 'down' ? 1 : 0)
      return { ...p, my_vote: newVote as AnonPost['my_vote'], upvotes, downvotes }
    }))
    try {
      if (newVote === null) {
        // Un-vote: DELETE /anon/:id/vote
        await api.delete(`/anon/${postId}/vote`)
      } else {
        // Vote: POST /anon/:id/vote with { vote_type }
        await api.post(`/anon/${postId}/vote`, { vote_type: newVote })
      }
    } catch { loadPosts(true) }
  }

  async function handleDelete(postId: string) {
    try {
      await api.delete(`/anon/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletePostId(null)
    }
  }

  function copyLink(postId: string) {
    const url = `${window.location.origin}/anon?post=${postId}`
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
    } else {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy'); toast.success('Link copied!') } catch { toast.error('Copy failed') }
      ta.remove()
    }
  }

  const canPost = postsToday < 3

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ghost size={20} style={{ color: 'var(--ink-muted)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Anonymous Feed</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: postsToday >= 3 ? 'var(--danger)' : 'var(--ink-subtle)' }}>{postsToday}/3 posts today</span>
        </div>
      </div>

      {/* Compose */}
      <form onSubmit={handleCompose} style={{ borderBottom: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', fontSize: '1.2rem' }}>👻</div>
          <div style={{ flex: 1 }}>
            <textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder={canPost ? 'Share something anonymously... 🎭' : 'Daily limit reached (3/3 posts)'}
              disabled={!canPost}
              maxLength={1000}
              rows={2}
              style={{ width: '100%', border: 'none', background: 'none', outline: 'none', color: 'var(--ink)', fontSize: '0.9375rem', lineHeight: 1.5, resize: 'none', fontFamily: 'inherit', opacity: canPost ? 1 : 0.5 }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <button
            type="submit"
            disabled={!composeText.trim() || composing || !canPost}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: (composeText.trim() && canPost) ? 'var(--accent)' : 'var(--bg-muted)', color: (composeText.trim() && canPost) ? 'var(--bg)' : 'var(--ink-subtle)', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.15s' }}
          >
            <Send size={14} /> Post
          </button>
        </div>
      </form>

      {/* Info banner */}
      <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>🔒 Posts appear anonymous but your identity is stored for moderation. Violations can be traced.</span>
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👻</div>
          <h3 style={{ color: 'var(--ink)', marginBottom: 8 }}>No anonymous posts yet</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Be the first to share something anonymously!</p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <article key={post.id} id={`anon-${post.id}`} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', fontSize: '1.25rem' }}>👻</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Anonymous</span>
                    {post.is_own && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent-text)' }}>You</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)', marginTop: 2 }}>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--ink-subtle)', cursor: 'pointer' }}>
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(post.is_own || isAdmin) && (
                      <>
                        <DropdownMenuItem onClick={() => setDeletePostId(post.id)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={15} /> Delete post
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!post.is_own && (
                      <DropdownMenuItem onClick={() => setReportPostId(post.id)} style={{ color: 'var(--danger)' }}>
                        <Flag size={15} /> Report post
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => copyLink(post.id)}>
                      <Link2 size={15} /> Copy link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--ink)', marginBottom: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => handleVote(post.id, 'up', post.my_vote)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: post.my_vote === 'up' ? 'var(--success-light)' : 'var(--bg-muted)', color: post.my_vote === 'up' ? 'var(--success)' : 'var(--ink-muted)', fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s' }}>
                  <ThumbsUp size={15} /> {post.upvotes > 0 ? post.upvotes : ''}
                </button>
                <button onClick={() => handleVote(post.id, 'down', post.my_vote)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: post.my_vote === 'down' ? 'var(--danger-light)' : 'var(--bg-muted)', color: post.my_vote === 'down' ? 'var(--danger)' : 'var(--ink-muted)', fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s' }}>
                  <ThumbsDown size={15} /> {post.downvotes > 0 ? post.downvotes : ''}
                </button>
                <button onClick={() => setCommentsPostId(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-muted)', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s' }}>
                  <MessageCircle size={15} /> {post.comment_count > 0 ? `${post.comment_count} Comment${post.comment_count !== 1 ? 's' : ''}` : 'Comment'}
                </button>
              </div>
            </article>
          ))}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>}
          {!hasMore && posts.length > 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)', fontSize: '0.8125rem' }}>You&apos;re all caught up 🎉</div>}
        </>
      )}

      {commentsPostId && (
      <CommentsSheet
          postId={commentsPostId}
          commentEndpoint="/anon"
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setCommentsPostId(null)}
          onCommentCountChange={count => setPosts(prev => prev.map(p => p.id === commentsPostId ? { ...p, comment_count: count } : p))}
        />
      )}
      {reportPostId && <ReportDialog postId={reportPostId} endpoint="/anon" onClose={() => setReportPostId(null)} />}
      {deletePostId && (
        <ConfirmDialog
          title="Delete anonymous post?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deletePostId)}
          onCancel={() => setDeletePostId(null)}
        />
      )}
    </div>
  )
}
