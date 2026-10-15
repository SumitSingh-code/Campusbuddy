'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import ConfirmDialog from './ConfirmDialog'

interface Comment {
  id: string
  content: string
  created_at: string
  is_own?: boolean
  author?: {
    id?: string
    full_name?: string
    department?: string
    avatar_url?: string | null
  } | null
}

interface CommentsSheetProps {
  postId: string
  currentUserId?: string | undefined
  isAdmin?: boolean
  commentEndpoint?: string
  onClose: () => void
  onCommentCountChange?: (count: number) => void
}

export default function CommentsSheet({
  postId,
  currentUserId,
  isAdmin = false,
  commentEndpoint = '/feed',
  onClose,
  onCommentCountChange,
}: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ data: Comment[] }>(`${commentEndpoint}/${postId}/comments`)
        setComments(res.data || [])
      } catch {
        toast.error('Failed to load comments')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await api.post<{ data: Comment }>(`${commentEndpoint}/${postId}/comments`, { content: text.trim() })
      const newComments = [...comments, res.data]
      setComments(newComments)
      setText('')
      onCommentCountChange?.(newComments.length)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await api.delete(`${commentEndpoint}/${postId}/comments/${commentId}`)
      const newComments = comments.filter(c => c.id !== commentId)
      setComments(newComments)
      onCommentCountChange?.(newComments.length)
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    } finally {
      setDeleteId(null)
    }
  }

  function getInitials(name?: string) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  }

  function formatCommentTime(ts?: string) {
    if (!ts) return ''
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 680, zIndex: 51,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          display: 'flex', flexDirection: 'column',
          maxHeight: '85vh',
          boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          animation: 'sheet-in .25s cubic-bezier(.32,0,.12,1)',
        }}
      >
        <style>{`@keyframes sheet-in{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>

        {/* Handle + Header */}
        <div style={{ padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 0.75rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
              Comments {comments.length > 0 ? `(${comments.length})` : ''}
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map(comment => {
              const isAnonComment = commentEndpoint.includes('anon') || !comment.author || comment.author.id === 'anonymous'
              const isOwn = Boolean(comment.is_own || (currentUserId && comment.author?.id && comment.author.id === currentUserId))
              const authorName = isAnonComment
                ? 'Anonymous'
                : (comment.author?.full_name || 'User')

              return (
                <div key={comment.id} style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isAnonComment ? 'var(--bg-muted)' : (comment.author?.avatar_url ? 'transparent' : 'var(--bg-muted)'),
                    color: 'var(--ink-muted)',
                    fontWeight: 700, fontSize: isAnonComment ? '1.1rem' : '0.75rem',
                    overflow: 'hidden',
                  }}>
                    {isAnonComment ? (
                      '👻'
                    ) : comment.author?.avatar_url ? (
                      <img src={comment.author.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(comment.author?.full_name || '')
                    )}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-muted)', borderRadius: '0 12px 12px 12px', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ink)' }}>
                        {authorName}
                      </span>
                      {isAnonComment && isOwn && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                          You
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-subtle)' }}>
                        {formatCommentTime(comment.created_at)}
                      </span>
                      {(isOwn || isAdmin) && (
                        <button
                          onClick={() => setDeleteId(comment.id)}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2 }}
                          aria-label="Delete comment"
                        ><Trash2 size={12} /></button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose comment */}
        <form onSubmit={handleSubmit} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write a comment..."
            maxLength={500}
            style={{
              flex: 1, padding: '0.6rem 0.875rem', borderRadius: 20,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--ink)', fontSize: '0.875rem', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            style={{
              padding: '0.6rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: text.trim() ? 'var(--accent)' : 'var(--bg-muted)',
              color: text.trim() ? 'var(--bg)' : 'var(--ink-subtle)',
              fontWeight: 700, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {deleteId && (
        <ConfirmDialog
          title="Delete comment?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
