'use client'

import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X,
  Send,
  Trash2,
  Ghost,
  MessageCircle,
  LockKeyhole,
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './ui/alert-dialog'
import styles from './CommentsSheet.module.css'

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
  currentUserId?: string
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
  const anonymous = commentEndpoint === '/anon'
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAfterSubmit = useRef(false)
  const openerRef = useRef<HTMLElement | null>(
    typeof document === 'undefined'
      ? null
      : (document.activeElement as HTMLElement)
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    async function load() {
      try {
        const res = await api.get<{ data: Comment[] }>(
          `${commentEndpoint}/${postId}/comments`
        )
        if (active) setComments(res.data || [])
      } catch {
        if (active)
          setLoadError('Replies could not be loaded. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [postId, commentEndpoint, retry])

  useEffect(() => {
    if (!scrollAfterSubmit.current) return
    scrollAfterSubmit.current = false
    bottomRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [comments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting || loading || loadError) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await api.post<{ data: Comment }>(
        `${commentEndpoint}/${postId}/comments`,
        { content: text.trim() }
      )
      const newComments = [...comments, res.data]
      scrollAfterSubmit.current = true
      setComments(newComments)
      setText('')
      onCommentCountChange?.(newComments.length)
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Reply could not be sent. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId || deleting) return
    setDeleting(true)
    try {
      await api.delete(`${commentEndpoint}/${postId}/comments/${deleteId}`)
      const newComments = comments.filter((c) => c.id !== deleteId)
      setComments(newComments)
      onCommentCountChange?.(newComments.length)
      setDeleteId(null)
      toast.success('Reply deleted')
    } catch {
      toast.error('Reply could not be deleted. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  function formatCommentTime(ts: string) {
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.sheet}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            openerRef.current?.focus()
          }}
        >
          <header className={styles.header}>
            <div className={styles.handle} aria-hidden="true" />
            <div className={styles.headingRow}>
              <span className={styles.headingIcon} aria-hidden="true">
                {anonymous ? <Ghost size={21} /> : <MessageCircle size={21} />}
              </span>
              <div className={styles.headingCopy}>
                <Dialog.Title className={styles.title}>
                  {anonymous ? 'Anonymous conversation' : 'Comments'}
                </Dialog.Title>
                <Dialog.Description className={styles.subtitle}>
                  {loading
                    ? 'Loading replies…'
                    : loadError
                      ? 'Unable to load replies'
                      : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'} · Keep it respectful`}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className={styles.iconButton}
                aria-label="Close conversation"
              >
                <X size={20} />
              </Dialog.Close>
            </div>
          </header>
          {anonymous && (
            <p className={styles.identityNotice}>
              <LockKeyhole size={14} aria-hidden="true" />
              Your name is hidden here. Identity is stored for moderation.
            </p>
          )}
          <section
            className={styles.messages}
            aria-label="Replies"
            aria-busy={loading}
          >
            {loading ? (
              <div className={styles.state} role="status">
                <div className="spinner" />
                <p>Loading the conversation…</p>
              </div>
            ) : loadError ? (
              <div className={styles.state} role="alert">
                <p>{loadError}</p>
                <button
                  className={styles.retryButton}
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className={styles.state}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  <MessageCircle size={26} />
                </span>
                <h3>Start the conversation</h3>
                <p>
                  {anonymous
                    ? 'Be the first to reply anonymously.'
                    : 'Share a thought or ask a question.'}
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isAnonComment =
                  anonymous ||
                  !comment.author ||
                  comment.author.id === 'anonymous'
                const isOwn = Boolean(
                  comment.is_own ||
                  (currentUserId && comment.author?.id === currentUserId)
                )
                const authorName = isAnonComment
                  ? 'Anonymous'
                  : comment.author?.full_name || 'User'
                const initials = authorName
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <article
                    key={comment.id}
                    className={`${styles.message} ${isOwn ? styles.ownMessage : ''}`}
                  >
                    <span className={styles.avatar} aria-hidden="true">
                      {isAnonComment ? (
                        <Ghost size={17} />
                      ) : comment.author?.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="" />
                      ) : (
                        initials
                      )}
                    </span>
                    <div className={styles.bubble}>
                      <div className={styles.messageMeta}>
                        <strong>{authorName}</strong>
                        {isOwn && <span className={styles.youBadge}>You</span>}
                        <time dateTime={comment.created_at}>
                          {formatCommentTime(comment.created_at)}
                        </time>
                        {(isOwn || isAdmin) && (
                          <button
                            className={`${styles.iconButton} ${styles.deleteButton}`}
                            onClick={() => setDeleteId(comment.id)}
                            aria-label="Delete reply"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  </article>
                )
              })
            )}
            <div ref={bottomRef} />
          </section>
          <form
            onSubmit={handleSubmit}
            className={styles.composer}
            aria-label="Write a reply"
          >
            <div className={styles.composerLabel}>
              <label htmlFor="conversation-reply">
                {anonymous ? 'Reply anonymously' : 'Write a reply'}
              </label>
              <span>{text.length}/500</span>
            </div>
            <textarea
              id="conversation-reply"
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setSubmitError('')
              }}
              placeholder={
                anonymous ? 'Add to the conversation…' : 'Write your reply…'
              }
              maxLength={500}
              rows={2}
              disabled={submitting}
              aria-describedby={submitError ? 'reply-error' : undefined}
              aria-invalid={!!submitError}
            />
            {submitError && (
              <p id="reply-error" className={styles.error} role="alert">
                {submitError}
              </p>
            )}
            <div className={styles.composerFooter}>
              <span>
                {anonymous ? (
                  <>
                    <Ghost size={14} aria-hidden="true" />
                    Posting as Anonymous
                  </>
                ) : (
                  'Posting with your profile'
                )}
              </span>
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!text.trim() || submitting || loading || !!loadError}
              >
                <Send size={15} aria-hidden="true" />
                {submitting ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
          <AlertDialog
            open={!!deleteId}
            onOpenChange={(open) => {
              if (!open && !deleting) setDeleteId(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogTitle>Delete reply?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(event) => {
                    event.preventDefault()
                    handleDelete()
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
