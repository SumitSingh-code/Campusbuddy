'use client'

import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, ThumbsUp, ThumbsDown, MessageCircle, Flag, Pencil, Trash2, Link2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { toast } from 'sonner'

export interface Post {
  id: string
  content: string
  image_url?: string | null
  created_at: string
  upvotes: number
  downvotes: number
  comment_count: number
  my_vote?: 'up' | 'down' | null
  is_bookmarked?: boolean
  author?: {
    id: string
    full_name: string
    department?: string
    role?: string
    avatar_url?: string | null
  } | null
  is_anonymous?: boolean
  is_own_anon?: boolean
}

interface PostCardProps {
  post: Post
  currentUserId: string | undefined
  isAdmin?: boolean
  isAnon?: boolean
  onVote?: (postId: string, type: 'up' | 'down', current: string | null | undefined) => void
  onComment?: (postId: string) => void
  onBookmark?: (postId: string, current: boolean) => void
  onDelete?: (postId: string) => void
  onEdit?: (post: Post) => void
  onReport?: (postId: string) => void
}

const DEPT_COLORS = [
  { bg: 'rgba(30,64,175,.15)', text: '#93C5FD' },
  { bg: 'rgba(107,33,168,.15)', text: '#C4B5FD' },
  { bg: 'rgba(6,95,70,.15)', text: '#6EE7B7' },
  { bg: 'rgba(146,64,14,.15)', text: '#FCD34D' },
  { bg: 'rgba(157,23,77,.15)', text: '#F9A8D4' },
  { bg: 'rgba(22,78,99,.15)', text: '#67E8F9' },
  { bg: 'rgba(55,48,163,.15)', text: '#A5B4FC' },
  { bg: 'rgba(20,83,45,.15)', text: '#86EFAC' },
  { bg: 'rgba(159,18,57,.15)', text: '#FDA4AF' },
  { bg: 'rgba(113,63,18,.15)', text: '#FDE68A' },
]

function getDeptColor(dept: string) {
  let h = 0
  for (let i = 0; i < dept.length; i++) h = (h * 31 + dept.charCodeAt(i)) & 0xffffffff
  return DEPT_COLORS[Math.abs(h) % DEPT_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '' }
}

export default function PostCard({
  post,
  currentUserId,
  isAdmin = false,
  isAnon = false,
  onVote,
  onComment,
  onBookmark,
  onDelete,
  onEdit,
  onReport,
}: PostCardProps) {
  const author = post.author
  const isOwn = isAnon ? !!post.is_own_anon : (author?.id === currentUserId)
  const initials = author?.full_name ? getInitials(author.full_name) : '?'
  const deptColor = author?.department ? getDeptColor(author.department) : DEPT_COLORS[0]
  const isAdminAuthor = ['moderator', 'super_admin'].includes(author?.role || '')

  function copyLink() {
    const url = `${window.location.origin}/${isAnon ? 'anon' : 'feed'}?post=${post.id}`
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    try { document.execCommand('copy'); toast.success('Link copied!') } catch { toast.error('Could not copy') }
    ta.remove()
  }

  return (
    <article
      id={`post-${post.id}`}
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.75rem' }}>
        {/* Avatar */}
        {isAnon && !isOwn ? (
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-muted)', fontSize: '1.25rem',
          }}>👻</div>
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: deptColor.bg, color: deptColor.text,
            fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden',
          }}>
            {author?.avatar_url
              ? <img src={author.avatar_url} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
        )}

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {isAnon && !isOwn ? (
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Anonymous</span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                {author?.full_name || 'Unknown'}
              </span>
            )}
            {isOwn && isAnon && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent-text)' }}>You</span>
            )}
            {isAdminAuthor && !isAnon && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(107,33,168,.15)', color: '#C4B5FD' }}>Admin</span>
            )}
            {author?.department && !isAnon && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 12, background: deptColor.bg, color: deptColor.text }}>
                {author.department}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)', marginTop: 2 }}>{timeAgo(post.created_at)}</div>
        </div>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--ink-subtle)', cursor: 'pointer', flexShrink: 0 }}
              aria-label="Post options"
            >
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(isOwn || isAdmin) && (
              <>
                {!isAnon && isOwn && (
                  <DropdownMenuItem onClick={() => onEdit?.(post)}>
                    <Pencil size={15} /> Edit post
                  </DropdownMenuItem>
                )}
                {(isOwn || isAdmin) && (
                  <DropdownMenuItem onClick={() => onDelete?.(post.id)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={15} /> Delete post
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            {!isOwn && (
              <DropdownMenuItem onClick={() => onReport?.(post.id)} style={{ color: 'var(--danger)' }}>
                <Flag size={15} /> Report post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyLink}>
              <Link2 size={15} /> Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--ink)', marginBottom: post.image_url ? '0.75rem' : '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.content}
      </p>

      {/* Image */}
      {post.image_url && (
        <a href={post.image_url} target="_blank" rel="noopener noreferrer">
          <img
            src={post.image_url}
            alt="Post image"
            loading="lazy"
            style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 12, marginBottom: '0.875rem', cursor: 'zoom-in', display: 'block' }}
          />
        </a>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Upvote */}
        <button
          onClick={() => onVote?.(post.id, 'up', post.my_vote)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: post.my_vote === 'up' ? 'var(--success-light)' : 'var(--bg-muted)',
            color: post.my_vote === 'up' ? 'var(--success)' : 'var(--ink-muted)',
            fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s',
          }}
        >
          <ThumbsUp size={15} /> {post.upvotes > 0 ? post.upvotes : ''}
        </button>

        {/* Downvote */}
        <button
          onClick={() => onVote?.(post.id, 'down', post.my_vote)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: post.my_vote === 'down' ? 'var(--danger-light)' : 'var(--bg-muted)',
            color: post.my_vote === 'down' ? 'var(--danger)' : 'var(--ink-muted)',
            fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s',
          }}
        >
          <ThumbsDown size={15} /> {post.downvotes > 0 ? post.downvotes : ''}
        </button>

        {/* Comments */}
        <button
          onClick={() => onComment?.(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--bg-muted)', color: 'var(--ink-muted)',
            fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.15s',
          }}
        >
          <MessageCircle size={15} />
          {post.comment_count > 0 ? `${post.comment_count} Comment${post.comment_count !== 1 ? 's' : ''}` : 'Comment'}
        </button>
      </div>
    </article>
  )
}
