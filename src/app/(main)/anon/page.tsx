'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Ghost,
  Send,
  Flag,
  Trash2,
  MoreHorizontal,
  Link2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Smile,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

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

// ── Soft pastel palette for avatar backgrounds (matches Stitch design) ────
const PASTEL_AVATARS = [
  '#FCE7F3', // Soft Pink
  '#EDE9FE', // Soft Lavender
  '#FEF9C3', // Soft Amber/Yellow
  '#CFFAFE', // Soft Mint/Cyan
  '#DCFCE7', // Soft Green
  '#FFE4E6', // Soft Rose
]

function getAvatarPastel(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
  }
  return PASTEL_AVATARS[Math.abs(hash) % PASTEL_AVATARS.length]
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
      const res = await api.get<{
        data: AnonPost[]
        next_cursor: string | null
        has_more: boolean
        posts_today?: number
      }>(`/anon?${params}`)
      setPosts(prev => (initial ? res.data || [] : [...prev, ...(res.data || [])]))
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

  useEffect(() => {
    loadPosts(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(false)
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadPosts])

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault()
    if (!composeText.trim() || composing) return
    if (postsToday >= 3) {
      toast.error('You can only post 3 anonymous posts per day')
      return
    }
    setComposing(true)
    try {
      const res = await api.post<{ data: AnonPost; posts_today: number }>('/anon', {
        content: composeText.trim(),
      })
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
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p
        const upvotes = p.upvotes + (current === 'up' ? -1 : 0) + (newVote === 'up' ? 1 : 0)
        const downvotes = p.downvotes + (current === 'down' ? -1 : 0) + (newVote === 'down' ? 1 : 0)
        return { ...p, my_vote: newVote as AnonPost['my_vote'], upvotes, downvotes }
      })
    )
    try {
      if (newVote === null) {
        await api.delete(`/anon/${postId}/vote`)
      } else {
        await api.post(`/anon/${postId}/vote`, { vote_type: newVote })
      }
    } catch {
      loadPosts(true)
    }
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
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
        toast.success('Link copied!')
      } catch {
        toast.error('Copy failed')
      }
      ta.remove()
    }
  }

  const canPost = postsToday < 3

  return (
    <div className="w-full bg-white dark:bg-[var(--bg)] min-h-screen">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="sticky top-[52px] z-30 bg-white dark:bg-[var(--surface)] border-b border-slate-100 dark:border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Ghost size={22} className="text-slate-900 dark:text-neutral-100 stroke-[2.2]" />
          <h1 className="font-heading font-bold text-[18px] text-slate-900 dark:text-white tracking-tight">
            Anonymous Feed
          </h1>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#F1F5F9] dark:bg-neutral-800 text-[12px] font-medium text-[#475569] dark:text-neutral-300 select-none">
          {postsToday}/3 posts today
        </div>
      </div>

      {/* ── COMPOSE CARD ───────────────────────────────────────────── */}
      <div className="m-3 sm:m-4 p-3.5 sm:p-4 bg-white dark:bg-[var(--surface)] border border-slate-200/90 dark:border-neutral-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleCompose}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-[#EDE9FE] dark:bg-violet-950/40 text-[1.3rem]">
              👻
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                placeholder={canPost ? "Share something anonymously... 🎭" : "Daily limit reached (3/3 posts)"}
                disabled={!canPost}
                maxLength={1000}
                rows={2}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-slate-800 dark:text-neutral-100 placeholder:text-slate-400 font-normal disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 text-[13px] font-medium select-none">
              <Smile size={16} />
              <span>Masked Identity</span>
            </div>

            <button
              type="submit"
              disabled={!composeText.trim() || composing || !canPost}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13.5px] font-semibold transition-all active:scale-95 ${
                composeText.trim() && canPost
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 cursor-pointer shadow-xs'
                  : 'bg-[#F1F5F9] dark:bg-neutral-800 text-[#475569] dark:text-neutral-400 cursor-not-allowed'
              }`}
            >
              <Send size={13} strokeWidth={2.2} />
              <span>Post</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── MODERATION NOTICE BANNER ───────────────────────────────── */}
      <div className="bg-[#FFFDF0] dark:bg-amber-950/20 border-y border-[#FEF3C7] dark:border-amber-900/30 px-4 py-2.5 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#92400E] dark:text-amber-200">
        <span className="text-[14px] flex-shrink-0 mt-0.5" role="img" aria-label="Lock">🔒</span>
        <div>
          <p>Posts appear anonymous but your identity is stored for moderation.</p>
          <p>Violations can be traced.</p>
        </div>
      </div>

      {/* ── POSTS LIST ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 text-sm">{error}</div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-2">👻</div>
          <h3 className="font-semibold text-slate-800 dark:text-neutral-200 mb-1">
            No anonymous posts yet
          </h3>
          <p className="text-slate-400 text-sm">Be the first to share something anonymously!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
          {posts.map(post => (
            <article
              key={post.id}
              id={`anon-${post.id}`}
              className="bg-white dark:bg-[var(--surface)] p-4 sm:p-5 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[1.3rem] shadow-xs"
                    style={{ backgroundColor: getAvatarPastel(post.id) }}
                  >
                    👻
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-slate-900 dark:text-white tracking-tight">
                        Anonymous
                      </span>
                      {post.is_own && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/60 dark:text-amber-300">
                          You
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[13px] text-slate-400 dark:text-neutral-500 mt-0.5"
                      title={new Date(post.created_at).toLocaleString()}
                    >
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* 3-Dot Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      aria-label="Options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => copyLink(post.id)} className="cursor-pointer">
                      <Link2 size={14} className="mr-2" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    {!post.is_own && (
                      <DropdownMenuItem
                        onClick={() => setReportPostId(post.id)}
                        className="cursor-pointer text-[var(--danger)] focus:text-[var(--danger)]"
                      >
                        <Flag size={14} className="mr-2" />
                        <span>Report post</span>
                      </DropdownMenuItem>
                    )}
                    {(post.is_own || isAdmin) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletePostId(post.id)}
                          className="cursor-pointer text-[var(--danger)] focus:text-[var(--danger)]"
                        >
                          <Trash2 size={14} className="mr-2" />
                          <span>Delete post</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Content */}
              <p className="text-[15px] sm:text-[15.5px] leading-relaxed text-slate-900 dark:text-neutral-100 my-2.5 font-normal whitespace-pre-wrap break-words select-text">
                {post.content}
              </p>

              {/* Action Bar */}
              <div className="flex items-center gap-2 pt-1 mt-3">
                {/* Upvote */}
                <button
                  type="button"
                  onClick={() => handleVote(post.id, 'up', post.my_vote)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-semibold transition-colors active:scale-95 cursor-pointer ${
                    post.my_vote === 'up'
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 border border-transparent'
                  }`}
                  aria-label="Upvote"
                >
                  <ThumbsUp size={14} className={post.my_vote === 'up' ? 'fill-current' : ''} />
                  {post.upvotes > 0 && <span className="tabular-nums font-semibold">{post.upvotes}</span>}
                </button>

                {/* Downvote */}
                <button
                  type="button"
                  onClick={() => handleVote(post.id, 'down', post.my_vote)}
                  className={`inline-flex items-center justify-center h-8 px-3 rounded-xl text-xs font-semibold transition-colors active:scale-95 cursor-pointer ${
                    post.my_vote === 'down'
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 border border-transparent'
                  }`}
                  aria-label="Downvote"
                >
                  <ThumbsDown size={14} className={post.my_vote === 'down' ? 'fill-current' : ''} />
                  {post.downvotes > 0 && <span className="tabular-nums font-semibold ml-1.5">{post.downvotes}</span>}
                </button>

                {/* Comments */}
                <button
                  type="button"
                  onClick={() => setCommentsPostId(post.id)}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-medium bg-[#F1F5F9] text-[#334155] hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors active:scale-95 cursor-pointer"
                  aria-label="Comments"
                >
                  <MessageCircle size={14} />
                  <span>
                    {post.comment_count > 0
                      ? `${post.comment_count} Comment${post.comment_count > 1 ? 's' : ''}`
                      : 'Comment'}
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading More Spinner */}
      {loadingMore && (
        <div className="py-6 flex justify-center">
          <div className="spinner" />
        </div>
      )}

      {/* End of Feed Message */}
      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center text-slate-400 dark:text-neutral-500 text-xs select-none">
          You&apos;re all caught up 🎉
        </div>
      )}

      {/* ── MODALS (100% UNTOUCHED BEHAVIOR) ───────────────────────── */}
      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          commentEndpoint="/anon"
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setCommentsPostId(null)}
          onCommentCountChange={count =>
            setPosts(prev =>
              prev.map(p => (p.id === commentsPostId ? { ...p, comment_count: count } : p))
            )
          }
        />
      )}

      {reportPostId && (
        <ReportDialog postId={reportPostId} endpoint="/anon" onClose={() => setReportPostId(null)} />
      )}

      {deletePostId && (
        <ConfirmDialog
          title="Delete anonymous post?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deletePostId)}
          onCancel={() => setDeletePostId(null)}
        />
      )}
    </div>
  )
}
