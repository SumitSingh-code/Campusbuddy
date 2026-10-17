'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ImagePlus, X, Send, Bell, Plus, Trash2, FileText, Sparkles, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { compressImage } from '@/lib/image'
import { uploadToStorage, deleteFromStorage } from '@/lib/storage'
import { timeAgo } from '@/lib/date'
import PostCard, { type Post } from '@/components/PostCard'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import EditPostDialog from '@/components/EditPostDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

export type FeedFilterType = 'all' | 'dept' | 'announcements' | 'holiday' | 'exam' | 'event'

interface FeedNotice {
  id: string
  title: string
  content?: string
  body?: string
  category: string
  attachment_url?: string
  created_by: string
  poster_name?: string
  created_at: string
}

export default function FeedPage() {
  const { user, profile, isAdmin } = useAuth()

  // Filter strip state
  const [activeFilter, setActiveFilter] = useState<FeedFilterType>('all')

  // Feed Posts state
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Official Notices state (for notice category filters)
  const [notices, setNotices] = useState<FeedNotice[]>([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null)
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null)

  // Admin Post Notice modal
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticeSaving, setNoticeSaving] = useState(false)

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

  const isNoticeView = ['announcements', 'holiday', 'exam', 'event'].includes(activeFilter)

  // Load feed posts
  const loadFeed = useCallback(async (initial = false, deptOverride?: string | null) => {
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
      const targetDept = deptOverride !== undefined ? deptOverride : (activeFilter === 'dept' ? (profile?.department || 'my') : null)
      if (targetDept) params.set('department', targetDept)

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
  }, [cursor, hasMore, loadingMore, activeFilter, profile?.department])

  // Load official notices
  const loadNotices = useCallback(async (category: FeedFilterType) => {
    setNoticesLoading(true)
    try {
      let catParam = category === 'announcements' ? 'general' : category
      const res = await api.get<{ data: FeedNotice[] }>(`/notices?category=${encodeURIComponent(catParam)}`)
      const raw = Array.isArray(res.data) ? res.data : []
      const mapped = raw.map((n: FeedNotice) => ({
        ...n,
        content: n.content || n.body || '',
        poster_name: n.poster_name || 'Admin',
      }))
      setNotices(mapped)
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load notices')
    } finally {
      setNoticesLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFeed(true, null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Tab / Filter switch
  function handleFilterChange(filter: FeedFilterType) {
    if (filter === activeFilter) return
    setActiveFilter(filter)
    if (filter === 'all') {
      loadFeed(true, null)
    } else if (filter === 'dept') {
      loadFeed(true, profile?.department || 'my')
    } else {
      loadNotices(filter)
    }
  }

  // Infinite scroll (only when in post feed)
  useEffect(() => {
    if (isNoticeView) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadFeed(false) },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadFeed, isNoticeView])

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

  // Delete post
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

  // Admin: Post notice from feed
  async function handlePostNotice() {
    if (!isAdmin) return
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      toast.error('Title and content are required')
      return
    }
    if (noticeTitle.trim().length < 3) {
      toast.error('Title must be at least 3 characters')
      return
    }
    setNoticeSaving(true)
    try {
      const catParam = activeFilter === 'announcements' ? 'general' : activeFilter
      const res = await api.post('/notices', {
        title: noticeTitle.trim(),
        body: noticeContent.trim(),
        content: noticeContent.trim(),
        category: catParam,
      })
      const createdNotice: FeedNotice = {
        ...res.data,
        content: res.data?.content || res.data?.body || noticeContent.trim(),
        poster_name: res.data?.poster_name || 'Admin',
      }
      setNotices(prev => [createdNotice, ...prev])
      setNoticeModalOpen(false)
      setNoticeTitle('')
      setNoticeContent('')
      toast.success('Notice posted successfully! 📢')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to post notice')
    } finally {
      setNoticeSaving(false)
    }
  }

  // Admin: Delete notice
  async function handleDeleteNotice(id: string) {
    try {
      await api.delete(`/notices/${id}`)
      setNotices(prev => prev.filter(n => n.id !== id))
      toast.success('Notice deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to delete notice')
    } finally {
      setDeleteNoticeId(null)
    }
  }

  const charLen = composeText.length
  const canSubmit = (composeText.trim().length > 0 || !!composeImage) && !composing

  const avatarInitials = profile?.full_name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U'

  // Filter Pills list (Matches reference image)
  const PILLS: { id: FeedFilterType; label: string; isDept?: boolean }[] = [
    { id: 'all', label: 'For you' },
    { id: 'dept', label: 'My Department', isDept: true },
    { id: 'announcements', label: 'Announcements' },
    { id: 'holiday', label: 'Holidays' },
    { id: 'exam', label: 'Exams' },
    { id: 'event', label: 'Events' },
  ]

  function getCategoryNoticeTitle(filter: FeedFilterType) {
    switch (filter) {
      case 'holiday': return 'Campus holidays'
      case 'exam': return 'Exam schedules and circulars'
      case 'event': return 'Campus events and activities'
      default: return 'Official university announcements'
    }
  }

  return (
    <div>
      {/* ── TOP HORIZONTAL FILTER STRIP ("Campus Pulse") ── */}
      {!isNoticeView && <section className="feed-page-intro">
        <div><h1>Campus, in the loop.</h1><p>Good things happen when we keep each other posted.</p></div>
        <span className="feed-campus-mark" aria-hidden="true"><span /></span>
      </section>}
      {!isNoticeView && <nav className="feed-pulse-links" aria-label="Explore campus spaces">
        <Link href="/anon"><span className="pulse-link-mark pulse-anon" />Anonymous conversations</Link>
        <Link href="/notices"><span className="pulse-link-mark pulse-notices" />Campus bulletin</Link>
        <Link href="/notes"><span className="pulse-link-mark pulse-notes" />Study library</Link>
      </nav>}
      <div className="feed-strip-wrapper">
        <div className="feed-strip-container">
          {PILLS.map(pill => {
            const isActive = activeFilter === pill.id
            return (
              <button
                key={pill.id}
                onClick={() => handleFilterChange(pill.id)}
                className={`feed-pill-btn ${isActive ? 'feed-pill-active' : 'feed-pill-inactive'}`}
                aria-pressed={isActive}
              >
                {pill.isDept && (
                  <span className={`feed-dept-dot ${isActive ? 'feed-dept-dot-active' : ''}`} />
                )}
                <span>{pill.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── DEPARTMENT BANNER (Shown when My Department filter is active) ── */}
      {activeFilter === 'dept' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(34, 197, 94, 0.08)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.18)',
          fontSize: '0.8125rem',
        }}>
          <span style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span>Showing posts from: <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{profile?.department || 'Your Department'}</strong></span>
          </span>
        </div>
      )}

      {/* ── COMPOSER BOX (Shown on Feed tabs: 'all' and 'dept') ── */}
      {!isNoticeView && (
        <form id="composer" className="feed-composer" onSubmit={handleCompose} style={{ borderBottom: '1px solid var(--border)', padding: '1rem', background: 'var(--surface)' }}>
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
                placeholder={activeFilter === 'dept' ? `Share something with ${profile?.department || 'your department'}… 💬` : "What's happening on campus? 👋"}
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
      )}

      {/* ── NOTICE VIEW HEADER (When on Announcements / Holiday / Exam / Event) ── */}
      {isNoticeView && (
        <div className="notice-hub-header">
          <div>
            <h2 className="notice-hub-title">{getCategoryNoticeTitle(activeFilter)}</h2>
            <p className="notice-hub-sub">Official verified circulars from university administration</p>
          </div>
          {isAdmin && (
            <button className="notice-hub-post-btn" onClick={() => setNoticeModalOpen(true)}>
              <Plus size={14} /> Post Notice
            </button>
          )}
        </div>
      )}

      {/* ── NOTICES LIST (When on a notice category) ── */}
      {isNoticeView && (
        <div style={{ padding: '0.75rem 1rem' }}>
          {noticesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ height: 110, borderRadius: 14, background: 'var(--surface)', animation: 'sk-pulse 1.4s infinite' }} />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              <h3 style={{ color: 'var(--ink)', marginBottom: 6, fontSize: '1rem', fontWeight: 700 }}>
                No {activeFilter} notices yet
              </h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.825rem' }}>
                Check back later for official university circulars.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {notices.map(notice => (
                <div key={notice.id} className="official-notice-card">
                  <div className="official-notice-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="official-verified-badge">🏛️ CRSU Official</span>
                      <span className="official-cat-badge">
                        {notice.category ? (notice.category.charAt(0).toUpperCase() + notice.category.slice(1)) : 'General'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>{timeAgo(notice.created_at)}</span>
                    </div>
                    {isAdmin && (
                      <button
                        className="official-delete-btn"
                        onClick={() => setDeleteNoticeId(notice.id)}
                        title="Delete notice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <h3 className="official-notice-title">{notice.title}</h3>
                  <p
                    className={`official-notice-body ${expandedNoticeId === notice.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedNoticeId(expandedNoticeId === notice.id ? null : notice.id)}
                  >
                    {notice.content || notice.body || ''}
                  </p>
                  {(notice.content || notice.body || '').length > 120 && (
                    <button
                      className="official-read-more"
                      onClick={() => setExpandedNoticeId(expandedNoticeId === notice.id ? null : notice.id)}
                    >
                      {expandedNoticeId === notice.id ? 'Show less' : 'Read full notice…'}
                    </button>
                  )}
                  {notice.attachment_url && (
                    <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" className="official-attach-link">
                      <ExternalLink size={13} /> View Attached Document
                    </a>
                  )}
                  <div className="official-poster-tag">Posted by {notice.poster_name || 'Administration'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOCIAL FEED POSTS (When on 'all' or 'dept') ── */}
      {!isNoticeView && (
        <>
          {loading ? (
            <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>
                {activeFilter === 'dept' ? `No posts yet in ${profile?.department || 'your department'}` : 'No posts yet'}
              </h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
                {activeFilter === 'dept'
                  ? `Be the first from ${profile?.department || 'your department'} to share something!`
                  : 'Be the first to post something on Campus Feed!'}
              </p>
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
        </>
      )}

      {/* ── ADMIN: POST NOTICE MODAL ── */}
      {noticeModalOpen && isAdmin && (
        <div className="notice-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setNoticeModalOpen(false) }}>
          <div className="notice-modal-box">
            <div className="notice-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Post {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Notice
              </h3>
              <button
                onClick={() => setNoticeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)', display: 'block', marginBottom: 4 }}>Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Holiday Schedule, Exam Datesheet…"
                  value={noticeTitle}
                  onChange={e => setNoticeTitle(e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)',
                    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)', display: 'block', marginBottom: 4 }}>Content *</label>
                <textarea
                  placeholder="Full details of the notice circular…"
                  value={noticeContent}
                  onChange={e => setNoticeContent(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)',
                    fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <button
                onClick={handlePostNotice}
                disabled={noticeSaving}
                style={{
                  width: '100%', padding: '0.75rem', background: 'var(--accent)',
                  color: 'var(--bg)', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                  opacity: noticeSaving ? 0.6 : 1, transition: 'opacity 0.15s',
                }}
              >
                {noticeSaving ? 'Publishing…' : 'Publish Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN: CONFIRM DELETE NOTICE MODAL ── */}
      {deleteNoticeId && (
        <ConfirmDialog
          title="Delete Notice?"
          message="This notice will be archived and removed from the active notice feed."
          confirmLabel="Delete"
          onConfirm={() => handleDeleteNotice(deleteNoticeId)}
          onCancel={() => setDeleteNoticeId(null)}
        />
      )}

      {/* ── POST MODALS (COMMENTS, REPORT, EDIT, DELETE) ── */}
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

      <style>{feedStyles}</style>
    </div>
  )
}

const feedStyles = `
/* ─── Horizontal Filter Strip ─── */
.feed-strip-wrapper {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 57px;
  z-index: 30;
}

.feed-strip-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  white-space: nowrap;
}

.feed-strip-container::-webkit-scrollbar {
  display: none;
}

.feed-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.42rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  border: 1px solid transparent;
  user-select: none;
  font-family: inherit;
}

/* Active Pill (matches comp: solid black/charcoal with white text) */
.feed-pill-active {
  background: #111827 !important;
  color: #FFFFFF !important;
  border-color: #111827 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Inactive Pill (matches comp: light grey with subtle border) */
.feed-pill-inactive {
  background: #F3F4F6;
  color: #374151;
  border: 1px solid #E5E7EB;
}

.feed-pill-inactive:hover {
  background: #E5E7EB;
}

.feed-pill-inactive:active {
  transform: scale(0.97);
}

/* Green Live Indicator Dot for Department */
.feed-dept-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  display: inline-block;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.feed-dept-dot-active {
  background: #34D399;
  box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.35);
}

/* ─── Notice Hub Header ─── */
.notice-hub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.notice-hub-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}

.notice-hub-sub {
  font-size: 0.72rem;
  color: var(--ink-muted);
  margin: 2px 0 0;
}

.notice-hub-post-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.notice-hub-post-btn:hover {
  opacity: 0.9;
}

/* ─── Official Notice Card ─── */
.official-notice-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.15s;
}

.official-notice-card:hover {
  border-color: rgba(212, 175, 55, 0.4);
}

.official-notice-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.official-verified-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-radius: 6px;
  padding: 2px 6px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.official-cat-badge {
  font-size: 0.68rem;
  font-weight: 600;
  background: #F1F3F5;
  color: #596273;
  border-radius: 6px;
  padding: 2px 6px;
  border: 1px solid #E5E7EB;
}

.official-delete-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.12s;
}

.official-delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.official-notice-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.45rem;
  line-height: 1.4;
}

.official-notice-body {
  font-size: 0.84rem;
  color: var(--ink-muted);
  line-height: 1.55;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  cursor: pointer;
}

.official-notice-body.expanded {
  display: block;
  -webkit-line-clamp: unset;
}

.official-read-more {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.3rem 0 0;
}

.official-attach-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--accent);
  text-decoration: none;
  margin-top: 0.6rem;
  font-weight: 600;
}

.official-poster-tag {
  font-size: 0.7rem;
  color: var(--ink-muted);
  margin-top: 0.65rem;
  padding-top: 0.45rem;
  border-top: 1px dashed var(--border);
}

/* ─── Notice Modal Sheet ─── */
.notice-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.notice-modal-box {
  background: var(--surface);
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  padding: 1.25rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
}

.notice-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
`
