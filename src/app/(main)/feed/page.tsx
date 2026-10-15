'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ImagePlus, X, Send } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { compressImage } from '@/lib/image'
import { uploadToStorage, deleteFromStorage } from '@/lib/storage'
import PostCard, { type Post } from '@/components/PostCard'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import EditPostDialog from '@/components/EditPostDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

export default function FeedPage() {
  const { user, profile, isAdmin } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Compose
  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState<File | null>(null)
  const [composeImagePreview, setComposeImagePreview] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  // Modals
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFeed = useCallback(async (initial = false) => {
    if (!initial && (!hasMore || loadingMore)) return
    if (initial) {
      setLoading(true)
      setCursor(null)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (!initial && cursor) params.set('before', cursor)
      const res = await api.get<{ data: Post[]; next_cursor: string | null; has_more: boolean }>(`/feed?${params}`)
      const newPosts = res.data || []
      setPosts(prev => initial ? newPosts : [...prev, ...newPosts])
      setCursor(res.next_cursor)
      setHasMore(res.has_more)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load feed'
      if (initial) setError(msg)
      else toast.error(msg)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, hasMore, loadingMore])

  useEffect(() => { loadFeed(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadFeed(false) },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadFeed])

  // Vote
  async function handleVote(postId: string, type: 'up' | 'down', current: string | null | undefined) {
    const newVote = current === type ? null : type
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const upvotes = p.upvotes + (current === 'up' ? -1 : 0) + (newVote === 'up' ? 1 : 0)
      const downvotes = p.downvotes + (current === 'down' ? -1 : 0) + (newVote === 'down' ? 1 : 0)
      return { ...p, my_vote: newVote as Post['my_vote'], upvotes, downvotes }
    }))
    try {
      if (newVote === null) {
        await api.delete(`/feed/${postId}/vote`)
      } else {
        await api.post(`/feed/${postId}/vote`, { vote_type: newVote })
      }
    } catch {
      loadFeed(true)
    }
  }

  // Bookmark
  async function handleBookmark(postId: string, current: boolean) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: !current } : p))
    try {
      // POST /feed/:id/bookmark toggles - works for both add and remove
      await api.post(`/feed/${postId}/bookmark`, {})
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: current } : p))
      toast.error('Failed to update bookmark')
    }
  }

  // Image select
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return }
    try {
      const compressed = await compressImage(file, 1200, 250)
      setComposeImage(compressed)
      setComposeImagePreview(URL.createObjectURL(compressed))
    } catch { toast.error('Failed to process image') }
  }

  // Post submit
  async function handleCompose(e: React.FormEvent) {
    e.preventDefault()
    if (!composeText.trim() && !composeImage) return
    setComposing(true)
    try {
      let imageUrl: string | null = null
      if (composeImage) {
        imageUrl = await uploadToStorage(composeImage, `posts/${user?.id}/${Date.now()}`)
      }
      const res = await api.post<{ data: Post }>('/feed', {
        content: composeText.trim(),
        image_url: imageUrl,
      })
      setPosts(prev => [res.data, ...prev])
      setComposeText('')
      setComposeImage(null)
      setComposeImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Post published! 🎉')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish post')
    } finally {
      setComposing(false)
    }
  }

  // Delete
  async function handleDelete(postId: string) {
    try {
      const post = posts.find(p => p.id === postId)
      if (post?.image_url) await deleteFromStorage(post.image_url).catch(() => {})
      await api.delete(`/feed/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setDeletePostId(null)
    }
  }

  const charLen = composeText.length
  const canSubmit = (composeText.trim().length > 0 || !!composeImage) && !composing

  const avatarInitials = profile?.full_name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U'

  return (
    <div>
      {/* Compose box */}
      <form onSubmit={handleCompose} style={{ borderBottom: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-light)', color: 'var(--accent-text)',
            fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : avatarInitials
            }
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder="What's happening on campus? 👋"
              maxLength={1000}
              rows={2}
              style={{
                width: '100%', border: 'none', background: 'none', outline: 'none',
                color: 'var(--ink)', fontSize: '0.9375rem', lineHeight: 1.5,
                resize: 'none', fontFamily: 'inherit',
              }}
            />
            {composeImagePreview && (
              <div style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
                <img src={composeImagePreview} alt="" style={{ maxHeight: 160, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => { setComposeImage(null); setComposeImagePreview(null) }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%',
                    color: '#fff', cursor: 'pointer', width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
          >
            <ImagePlus size={18} />
          </button>
          <span style={{
            marginLeft: 'auto', fontSize: '0.75rem', marginRight: 10,
            color: charLen > 950 ? 'var(--danger)' : 'var(--ink-subtle)',
          }}>
            {charLen}/1000
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: canSubmit ? 'var(--accent)' : 'var(--bg-muted)',
              color: canSubmit ? 'var(--bg)' : 'var(--ink-subtle)',
              fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.15s',
            }}
          >
            <Send size={14} /> Post
          </button>
        </div>
      </form>

      {/* Feed */}
      {loading ? (
        <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>No posts yet</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Be the first to post something on Campus Feed!</p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onVote={handleVote}
              onComment={setCommentsPostId}
              onBookmark={handleBookmark}
              onDelete={id => setDeletePostId(id)}
              onEdit={setEditPost}
              onReport={setReportPostId}
            />
          ))}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)', fontSize: '0.8125rem' }}>
              You&apos;re all caught up 🎉
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setCommentsPostId(null)}
          onCommentCountChange={count => setPosts(prev => prev.map(p => p.id === commentsPostId ? { ...p, comment_count: count } : p))}
        />
      )}
      {reportPostId && (
        <ReportDialog
          postId={reportPostId}
          endpoint="/feed"
          onClose={() => setReportPostId(null)}
        />
      )}
      {editPost && (
        <EditPostDialog
          post={editPost}
          endpoint="/feed"
          onClose={() => setEditPost(null)}
          onSaved={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
            setEditPost(null)
          }}
        />
      )}
      {deletePostId && (
        <ConfirmDialog
          title="Delete post?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deletePostId)}
          onCancel={() => setDeletePostId(null)}
        />
      )}
    </div>
  )
}
