'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Flag,
  Trash2,
  Link2,
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

// ── Stitch Screen Avatar Color Variations ──────────────────────
const AVATAR_BG_STYLES = [
  'bg-pink-50 border-pink-100 dark:bg-pink-950/40 dark:border-pink-900/40',
  'bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900/40',
  'bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/40',
  'bg-cyan-50 border-cyan-100 dark:bg-cyan-950/40 dark:border-cyan-900/40',
]

function getAvatarStyle(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
  }
  return AVATAR_BG_STYLES[Math.abs(hash) % AVATAR_BG_STYLES.length]
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
    <div className="w-full bg-slate-50/50 dark:bg-[var(--bg)] min-h-screen">
      {/* ── BEGIN: SubheaderAndComposer (Stitch Exact Architecture) ── */}
      <section className="bg-white dark:bg-[var(--surface)] px-4 pt-3 pb-3 border-b border-slate-100 dark:border-[var(--border)]">
        {/* Feed Title & Daily Limit Counter */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <div className="text-slate-700 dark:text-neutral-200">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Anonymous Feed
            </h1>
          </div>
          {/* Posts remaining counter */}
          <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-200/70 dark:border-neutral-700 text-[11px] font-medium text-slate-500 dark:text-neutral-400 select-none">
            {postsToday}/3 posts today
          </div>
        </div>

        {/* Composer Box */}
        <form
          onSubmit={handleCompose}
          className="mt-1 bg-white dark:bg-[var(--surface)] rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-3"
        >
          <div className="flex items-start space-x-3">
            {/* Ghost Avatar Placeholder */}
            <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
              👻
            </div>
            {/* Input Field Area */}
            <div className="flex-1 min-w-0">
              <textarea
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                placeholder={canPost ? 'Share something anonymously... 🎭' : 'Daily limit reached (3/3 posts)'}
                disabled={!canPost}
                maxLength={1000}
                rows={2}
                className="w-full text-sm placeholder-slate-400 dark:placeholder-neutral-500 text-slate-800 dark:text-neutral-100 border-none p-0 focus:ring-0 resize-none bg-transparent outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Composer Actions Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between items-center">
            {/* Left helper / mask action */}
            <div className="inline-flex items-center space-x-1.5 text-xs text-slate-400 dark:text-neutral-500 select-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Masked Identity</span>
            </div>

            {/* Send/Post Button */}
            <button
              type="submit"
              disabled={!composeText.trim() || composing || !canPost}
              className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm active:scale-95 ${
                composeText.trim() && canPost
                  ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-amber-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed'
              }`}
            >
              {composing ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <svg className="w-3.5 h-3.5 transform rotate-45 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span>Post</span>
            </button>
          </div>
        </form>
      </section>
      {/* ── END: SubheaderAndComposer ── */}

      {/* ── BEGIN: ModerationNotice (Stitch Exact Warm Cream Banner) ── */}
      <section className="bg-amber-50/70 dark:bg-amber-950/20 border-y border-amber-100/90 dark:border-amber-900/30 px-4 py-2.5">
        <div className="flex items-center space-x-2 text-amber-900/80 dark:text-amber-200 text-[11px] leading-relaxed">
          <span className="text-sm select-none flex-shrink-0" role="img" aria-label="Lock">
            🔒
          </span>
          <p>
            Posts appear anonymous but your identity is stored for moderation. Violations can be traced.
          </p>
        </div>
      </section>
      {/* ── END: ModerationNotice ── */}

      {/* ── BEGIN: FeedPostList (Stitch Feed Items) ── */}
      <section className="divide-y divide-slate-100 dark:divide-neutral-800 bg-white dark:bg-[var(--surface)]">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-50 mx-auto flex items-center justify-center text-lg mb-2">
              👻
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-neutral-100">No anonymous posts yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Be the first to share something anonymously!</p>
          </div>
        ) : (
          posts.map(post => (
            <article
              key={post.id}
              id={`anon-${post.id}`}
              className="p-4 bg-white dark:bg-[var(--surface)] transition hover:bg-slate-50/50 dark:hover:bg-neutral-850"
            >
              {/* Post Author Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Rotating Pastel Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center text-base shadow-sm flex-shrink-0 ${getAvatarStyle(
                      post.id
                    )}`}
                  >
                    👻
                  </div>

                  {/* Author Name and Timestamp (Exact Stitch Header Logic) */}
                  {post.is_own ? (
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">Anonymous</span>
                      {/* 'You' Indicator Tag */}
                      <span className="px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[10px] font-semibold tracking-tight">
                        You
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal ml-1 truncate">
                        • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">Anonymous</span>
                      <p className="text-[11px] text-slate-400 font-normal">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>

                {/* More Options Menu (3-dot svg) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-full cursor-pointer focus-visible:outline-none"
                      type="button"
                      aria-label="More options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
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
                        className="cursor-pointer text-red-600 focus:text-red-600"
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
                          className="cursor-pointer text-red-600 focus:text-red-600"
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
              <div className="mt-2.5 text-sm text-slate-800 dark:text-neutral-100 font-normal leading-relaxed pl-1 whitespace-pre-wrap break-words">
                {post.content}
              </div>

              {/* Engagement Reactions (Exact Stitch SVGs & Buttons) */}
              <div className="mt-3 flex items-center space-x-2">
                {/* Upvote / Like Button */}
                <button
                  onClick={() => handleVote(post.id, 'up', post.my_vote)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    post.my_vote === 'up'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                  type="button"
                  aria-label="Upvote"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {post.upvotes > 0 && <span className="tabular-nums">{post.upvotes}</span>}
                </button>

                {/* Downvote / Dislike Button */}
                <button
                  onClick={() => handleVote(post.id, 'down', post.my_vote)}
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs transition active:scale-95 cursor-pointer ${
                    post.my_vote === 'down'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                  type="button"
                  aria-label="Downvote"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76 1.04m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {post.downvotes > 0 && <span className="tabular-nums text-xs ml-1 font-semibold">{post.downvotes}</span>}
                </button>

                {/* Comments Button */}
                <button
                  onClick={() => setCommentsPostId(post.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 text-xs font-medium transition active:scale-95 cursor-pointer"
                  type="button"
                  aria-label="Comments"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>
                    {post.comment_count > 0
                      ? `${post.comment_count} Comment${post.comment_count > 1 ? 's' : ''}`
                      : 'Comment'}
                  </span>
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      {/* ── END: FeedPostList ── */}

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

      {/* ── MODALS (100% UNTOUCHED LOGIC) ─────────────────────────── */}
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
