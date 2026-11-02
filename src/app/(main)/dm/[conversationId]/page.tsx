'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, Reply, X, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/date'
import { toast } from 'sonner'
import { GoldenTick } from '@/components/ui/GoldenTick'
import { isGoldenVerified } from '@/lib/badges'

interface ReplyMeta {
  id: string
  name: string
  text: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_deleted?: boolean
  read_at?: string | null
  is_read?: boolean
  reply_to?: ReplyMeta | null
}

interface ConvInfo {
  id: string
  other_user: {
    id: string
    full_name: string
    avatar_url?: string
    department?: string
    roll_number?: string
  }
}

function parseRawContent(raw: string): { text: string; replyTo: ReplyMeta | null } {
  if (typeof raw === 'string' && raw.startsWith('{"_reply":')) {
    try {
      const p = JSON.parse(raw)
      if (p && p._reply && typeof p.text === 'string') {
        return { text: p.text, replyTo: p._reply }
      }
    } catch (_) {}
  }
  return { text: raw, replyTo: null }
}

function formatSeenTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 2) return 'just now'

    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return `at ${timeStr}`

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
      return `yesterday, ${timeStr}`
    }

    const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${dateFormatted}, ${timeStr}`
  } catch {
    return 'recently'
  }
}

export default function DMThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user, profile } = useAuth()
  const router = useRouter()

  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const currentUserIdRef = useRef<string | null>(null)
  currentUserIdRef.current = user?.id || profile?.id || null

  const pendingTempIdsRef = useRef<Set<string>>(new Set())
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  function scrollToMessage(msgId: string) {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('thread-msg-highlight')
      setTimeout(() => el.classList.remove('thread-msg-highlight'), 1800)
    }
  }

  // Load conversation + messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.get(`/dm/conversations/${conversationId}`)
        if (cancelled) return
        if (res.other_user) {
          setConvInfo({ id: conversationId, other_user: res.other_user as ConvInfo['other_user'] })
        }
        const msgs = ((res.data as Message[]) || []).map(m => {
          const parsed = parseRawContent(m.content)
          return {
            ...m,
            content: parsed.text,
            reply_to: m.reply_to || parsed.replyTo,
          }
        })
        setMessages(msgs)
        // Mark read
        api.patch(`/dm/conversations/${conversationId}/read`, {}).catch(() => {})
      } catch (e: unknown) {
        if (!cancelled) toast.error((e as Error).message || 'Failed to load conversation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [conversationId])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading) setTimeout(() => scrollToBottom(false), 60)
  }, [loading, scrollToBottom])

  // Realtime subscription for incoming messages & read receipts
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`dm-thread-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const raw = payload.new as Message
          if (!raw || !raw.id) return

          const parsed = parseRawContent(raw.content)
          const newMsg: Message = {
            ...raw,
            content: parsed.text,
            reply_to: parsed.replyTo,
          }

          setMessages(prev => {
            // 1. If this exact message ID is already in the list, ignore
            if (prev.some(m => m.id === newMsg.id)) return prev

            // 2. Check if this is the current user's message
            const myId = currentUserIdRef.current
            const isMine = Boolean(myId && newMsg.sender_id === myId)

            if (isMine) {
              // Reconcile with pending optimistic temp message
              // Match by content first, else match the earliest temp message
              const matchByContent = prev.findIndex(m => m.id.startsWith('temp-') && m.content === newMsg.content)
              const firstPending = prev.findIndex(m => m.id.startsWith('temp-'))
              const targetIdx = matchByContent !== -1 ? matchByContent : firstPending

              if (targetIdx !== -1) {
                const tempMsg = prev[targetIdx]
                pendingTempIdsRef.current.delete(tempMsg.id)
                const next = [...prev]
                next[targetIdx] = newMsg
                return next
              }
            }

            // 3. Otherwise append new incoming message
            return [...prev, newMsg]
          })

          setTimeout(() => scrollToBottom(true), 60)

          // Mark as read if from other user
          const myId = currentUserIdRef.current
          if (myId && newMsg.sender_id !== myId) {
            api.patch(`/dm/conversations/${conversationId}/read`, {}).catch(() => {})
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          if (!updated || !updated.id) return

          const parsed = parseRawContent(updated.content)
          setMessages(prev => prev.map(m => m.id === updated.id ? {
            ...m,
            ...updated,
            content: parsed.text,
            reply_to: m.reply_to || parsed.replyTo,
          } : m))
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, scrollToBottom])

  function handleReply(msg: Message) {
    setReplyingTo(msg)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  // Double tap or click on mobile to quickly reply
  function handleMessageTap(msg: Message) {
    const now = Date.now()
    if (lastTapRef.current && lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 320) {
      handleReply(msg)
      lastTapRef.current = null
    } else {
      lastTapRef.current = { id: msg.id, time: now }
    }
  }

  async function sendMessage() {
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    const tempContent = text
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    textareaRef.current?.focus()

    const other = convInfo?.other_user
    const myId = currentUserIdRef.current || user?.id || ''

    const replyMeta: ReplyMeta | null = replyingTo ? {
      id: replyingTo.id,
      name: replyingTo.sender_id === myId ? 'You' : (other?.full_name || 'Them'),
      text: replyingTo.content.slice(0, 100),
    } : null

    // Optimistic message with unique temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    pendingTempIdsRef.current.add(tempId)

    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: myId,
      content: tempContent,
      reply_to: replyMeta,
      created_at: new Date().toISOString(),
      read_at: null,
    }

    setMessages(prev => [...prev, optimistic])
    setReplyingTo(null)
    setTimeout(() => scrollToBottom(true), 50)

    try {
      const res = await api.post<{ data: Message }>(`/dm/conversations/${conversationId}/messages`, {
        content: tempContent,
        reply_to: replyMeta,
      })
      const realMsg = (res as { data?: Message })?.data || (res as unknown as Message)
      pendingTempIdsRef.current.delete(tempId)

      setMessages(prev => {
        // If Realtime already swapped it in:
        if (realMsg?.id && prev.some(m => m.id === realMsg.id)) {
          return prev.filter(m => m.id !== tempId)
        }

        // If Realtime hasn't arrived yet, replace tempId in-place:
        const pendingIdx = prev.findIndex(m => m.id === tempId)
        if (pendingIdx !== -1 && realMsg?.id) {
          const next = [...prev]
          next[pendingIdx] = realMsg
          return next
        }

        return prev
      })
    } catch (e: unknown) {
      pendingTempIdsRef.current.delete(tempId)
      toast.error((e as Error).message || 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setContent(tempContent)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault()
      setReplyingTo(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }

  // Group messages by day
  function groupByDay(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = []
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      const last = groups[groups.length - 1]
      if (last?.date === date) last.messages.push(msg)
      else groups.push({ date, messages: [msg] })
    })
    return groups
  }

  // Instagram-style clustering: compute bubble corner grouping position
  function getClusterPosition(
    messages: Message[],
    index: number
  ): 'single' | 'first' | 'middle' | 'last' {
    const curr = messages[index]
    const prev = messages[index - 1]
    const next = messages[index + 1]

    const sameSenderPrev = prev && prev.sender_id === curr.sender_id &&
      Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 2 * 60 * 1000
    const sameSenderNext = next && next.sender_id === curr.sender_id &&
      Math.abs(new Date(next.created_at).getTime() - new Date(curr.created_at).getTime()) < 2 * 60 * 1000

    if (!sameSenderPrev && !sameSenderNext) return 'single'
    if (!sameSenderPrev && sameSenderNext) return 'first'
    if (sameSenderPrev && sameSenderNext) return 'middle'
    return 'last'
  }

  const other = convInfo?.other_user
  const myId = currentUserIdRef.current || user?.id

  // Last message sent by the current user to display Seen status
  const lastOwnMsg = [...messages].reverse().find(m => m.sender_id === myId)

  return (
    <div className="thread-wrap">
      {/* Top bar (Instagram Direct Style) */}
      <header className="thread-topbar">
        <button className="thread-back" onClick={() => router.push('/dm')} aria-label="Back to chats">
          <ArrowLeft size={20} />
        </button>

        {other ? (
          <Link href={`/profile/${other.id}`} className="thread-user-info" aria-label={`View ${other.full_name}'s profile`}>
            <div className="thread-avatar">
              {other.avatar_url ? (
                <img src={other.avatar_url} alt={other.full_name} className="thread-avatar-img" />
              ) : (
                <span className="thread-avatar-initials">{getInitials(other.full_name)}</span>
              )}
            </div>
            <div className="thread-user-meta">
              <div className="thread-user-name">
                <span className="truncate">{other.full_name}</span>
                {isGoldenVerified(other) && (
                  <GoldenTick size={14} title="Haryana Day Early Bird Pioneer · Golden Badge" />
                )}
              </div>
              <div className="thread-user-status">
                {other.department || 'CRSU Student'}
              </div>
            </div>
          </Link>
        ) : (
          <div className="thread-user-loading">
            <div className="sk-avatar" />
            <div className="sk-lines">
              <span className="sk-line sk-line-name" />
              <span className="sk-line sk-line-dept" />
            </div>
          </div>
        )}
      </header>

      {/* Messages area */}
      <div className="thread-messages">
        {loading ? (
          <div className="thread-loading">
            <Loader2 size={24} className="thread-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="thread-empty">
            <div className="thread-empty-icon">💬</div>
            <p>No messages yet</p>
            <span>Say hi to {other?.full_name || 'start chatting'}</span>
          </div>
        ) : (
          groupByDay(messages).map(group => (
            <div key={group.date} className="thread-day-group">
              <div className="thread-date-divider">
                <span>{group.date}</span>
              </div>

              {group.messages.map((msg, i) => {
                const isOwn = msg.sender_id === myId
                const clusterPos = getClusterPosition(group.messages, i)
                const isClusterLast = clusterPos === 'last' || clusterPos === 'single'
                const isClusterFirst = clusterPos === 'first' || clusterPos === 'single'
                const isLastOwn = msg.id === lastOwnMsg?.id
                const isOptimistic = msg.id.startsWith('temp-')

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`thread-msg-row ${isOwn ? 'thread-msg-row--own' : 'thread-msg-row--other'} cluster-${clusterPos}`}
                    onDoubleClick={() => handleReply(msg)}
                    onClick={() => handleMessageTap(msg)}
                  >
                    {/* Other user avatar (only on the last message of the cluster) */}
                    {!isOwn && (
                      <div className="thread-msg-avatar">
                        {isClusterLast && (
                          other?.avatar_url ? (
                            <img src={other.avatar_url} alt="" className="thread-small-avatar" />
                          ) : (
                            <span className="thread-small-initials">{other ? getInitials(other.full_name) : '?'}</span>
                          )
                        )}
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div className="thread-bubble-wrap">
                      <div
                        className={`thread-bubble ${isOwn ? 'thread-bubble--own' : 'thread-bubble--other'} bubble-pos-${clusterPos}`}
                      >
                        {/* Quoted message if this message is a reply */}
                        {msg.reply_to && (
                          <div
                            className={`thread-bubble-quote ${isOwn ? 'thread-bubble-quote--own' : 'thread-bubble-quote--other'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              scrollToMessage(msg.reply_to!.id)
                            }}
                            title="Click to view quoted message"
                          >
                            <div className="thread-quote-author">
                              <Reply size={11} className="thread-quote-icon" />
                              <span>{msg.reply_to.name}</span>
                            </div>
                            <div className="thread-quote-snippet">
                              {msg.reply_to.text}
                            </div>
                          </div>
                        )}

                        <div className="thread-bubble-content">
                          {msg.is_deleted ? <em className="thread-deleted">This message was deleted</em> : msg.content}
                        </div>
                      </div>

                      {/* Timestamp (only on the last message of the cluster, or sending indicator) */}
                      {(isClusterLast || isOptimistic) && (
                        <div className={`thread-msg-time ${isOwn ? 'thread-msg-time--own' : ''}`}>
                          <span>{timeAgo(msg.created_at)}</span>
                          {isOptimistic && <span className="thread-sending-dot"> · Sending…</span>}
                        </div>
                      )}

                      {/* Instagram-style Seen Status on the last own message */}
                      {isOwn && isLastOwn && !isOptimistic && (
                        <div className="thread-seen-indicator">
                          {msg.read_at ? (
                            <span
                              className="thread-seen-text seen"
                              title={`Seen on ${new Date(msg.read_at).toLocaleString('en-IN')}`}
                            >
                              <CheckCheck size={14} className="thread-seen-icon seen" />
                              <span>Seen {formatSeenTime(msg.read_at)}</span>
                            </span>
                          ) : (
                            <span className="thread-seen-text sent">
                              <Check size={13} className="thread-seen-icon sent" />
                              <span>Sent</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Desktop Hover Quick Reply Button */}
                    <button
                      className="thread-msg-reply-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReply(msg)
                      }}
                      title="Reply"
                      aria-label="Reply to message"
                    >
                      <Reply size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area (Instagram Capsule Bar) */}
      <div className="thread-input-area">
        {/* Instagram-style Docked Reply Preview */}
        {replyingTo && (
          <div className="thread-reply-bar">
            <div className="thread-reply-bar-accent" />
            <div className="thread-reply-bar-body">
              <div className="thread-reply-bar-title">
                <Reply size={12} />
                <span>
                  Replying to <strong>{replyingTo.sender_id === myId ? 'yourself' : (other?.full_name || 'them')}</strong>
                </span>
              </div>
              <div className="thread-reply-bar-snippet">
                {replyingTo.content.slice(0, 100)}
              </div>
            </div>
            <button
              className="thread-reply-bar-close"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
              title="Cancel reply"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className={`thread-composer-box ${replyingTo ? 'has-reply' : ''}`}>
          <textarea
            ref={textareaRef}
            className="thread-composer-input"
            placeholder={replyingTo ? "Write a reply…" : "Message…"}
            value={content}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button
            className={`thread-send-btn ${content.trim() ? 'is-active' : ''}`}
            onClick={sendMessage}
            disabled={!content.trim() || sending}
            aria-label="Send"
          >
            {sending ? <Loader2 size={16} className="thread-spinner" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      <style>{threadStyles}</style>
    </div>
  )
}

const threadStyles = `
/* Immersive Instagram-Grade Direct Thread */
.thread-wrap {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

/* Topbar */
.thread-topbar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.85rem;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 30;
  flex-shrink: 0;
}
.thread-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s ease;
}
.thread-back:hover {
  background: var(--surface2, rgba(0,0,0,0.05));
}

.thread-user-info {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  color: inherit;
  min-width: 0;
  flex: 1;
}
.thread-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface2, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px var(--border);
  overflow: hidden;
}
.thread-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thread-avatar-initials {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--accent);
}
.thread-user-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.thread-user-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.25;
}
.thread-user-status {
  font-size: 0.72rem;
  color: var(--ink-muted);
  line-height: 1.2;
  margin-top: 2px;
}

/* Skeleton Loading */
.thread-user-loading {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.sk-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface2, #e5e7eb);
  animation: skPulse 1.4s infinite ease-in-out;
}
.sk-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sk-line {
  display: block;
  background: var(--surface2, #e5e7eb);
  border-radius: 4px;
  animation: skPulse 1.4s infinite ease-in-out;
}
.sk-line-name { width: 110px; height: 14px; }
.sk-line-dept { width: 75px; height: 11px; }
@keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Messages Area */
.thread-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}
.thread-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 1rem;
}
.thread-spinner {
  animation: spin 0.7s linear infinite;
  color: var(--accent);
}
@keyframes spin { to { transform: rotate(360deg); } }

.thread-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
  text-align: center;
  margin: auto;
  color: var(--ink-muted);
}
.thread-empty-icon {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  opacity: 0.85;
}
.thread-empty p {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.2rem;
}
.thread-empty span {
  font-size: 0.82rem;
}

/* Date Divider */
.thread-day-group {
  display: flex;
  flex-direction: column;
}
.thread-date-divider {
  text-align: center;
  margin: 1rem 0 0.65rem;
  position: relative;
}
.thread-date-divider span {
  display: inline-block;
  padding: 3px 12px;
  background: var(--surface2, rgba(0,0,0,0.05));
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}

/* Message Rows & Clustering */
.thread-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  position: relative;
  user-select: text;
  margin-bottom: 2px;
}
.thread-msg-row--own {
  flex-direction: row-reverse;
}
.thread-msg-row.cluster-last,
.thread-msg-row.cluster-single {
  margin-bottom: 8px;
}

.thread-msg-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.thread-small-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 1px var(--border);
}
.thread-small-initials {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface2, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--accent);
}

.thread-bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 76%;
}
.thread-msg-row--own .thread-bubble-wrap {
  align-items: flex-end;
}

/* Bubble Styling */
.thread-bubble {
  padding: 0.55rem 0.85rem;
  font-size: 0.9rem;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
  transition: transform .12s ease;
  position: relative;
}

/* Received Bubbles */
.thread-bubble--other {
  background: var(--surface2, #f3f4f6);
  color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.bubble-pos-single.thread-bubble--other {
  border-radius: 18px 18px 18px 4px;
}
.bubble-pos-first.thread-bubble--other {
  border-radius: 18px 18px 18px 4px;
}
.bubble-pos-middle.thread-bubble--other {
  border-radius: 4px 18px 18px 4px;
}
.bubble-pos-last.thread-bubble--other {
  border-radius: 4px 18px 18px 18px;
}

/* Sent Bubbles (Instagram Warm Gold / Amber Gradient) */
.thread-bubble--own {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: #0A0F1D;
  border: none;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.18);
  font-weight: 480;
}
.bubble-pos-single.thread-bubble--own {
  border-radius: 18px 18px 4px 18px;
}
.bubble-pos-first.thread-bubble--own {
  border-radius: 18px 18px 4px 18px;
}
.bubble-pos-middle.thread-bubble--own {
  border-radius: 18px 4px 4px 18px;
}
.bubble-pos-last.thread-bubble--own {
  border-radius: 18px 4px 18px 18px;
}

.thread-deleted {
  color: var(--ink-muted);
  font-style: italic;
}

/* Quoted Reply Card Inside Bubble */
.thread-bubble-quote {
  border-radius: 8px;
  padding: 5px 9px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: opacity .15s ease;
  max-width: 100%;
}
.thread-bubble-quote:hover {
  opacity: 0.85;
}
.thread-bubble-quote--other {
  background: rgba(0, 0, 0, 0.04);
  border-left: 3px solid var(--accent);
}
.thread-bubble-quote--own {
  background: rgba(0, 0, 0, 0.12);
  border-left: 3px solid #0A0F1D;
}
.thread-quote-author {
  font-weight: 750;
  font-size: 0.7rem;
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.thread-bubble-quote--other .thread-quote-author {
  color: var(--accent-text, #92600F);
}
.thread-bubble-quote--own .thread-quote-author {
  color: #0A0F1D;
}
.thread-quote-snippet {
  font-size: 0.74rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thread-bubble-quote--other .thread-quote-snippet {
  color: var(--ink-muted);
}
.thread-bubble-quote--own .thread-quote-snippet {
  color: rgba(10, 15, 29, 0.88);
}

/* Timestamps */
.thread-msg-time {
  font-size: 0.65rem;
  color: var(--ink-muted);
  margin-top: 2px;
  padding: 0 4px;
}
.thread-msg-time--own {
  text-align: right;
}
.thread-sending-dot {
  color: var(--accent-text, #92600F);
  font-weight: 600;
}

/* Seen Status Indicator (Instagram Sky Blue Double Check) */
.thread-seen-indicator {
  display: flex;
  justify-content: flex-end;
  margin-top: 3px;
  padding: 0 4px;
  animation: fadeInSeen 0.22s ease-out;
}
@keyframes fadeInSeen {
  from { opacity: 0; transform: translateY(-3px); }
  to   { opacity: 1; transform: translateY(0); }
}
.thread-seen-text {
  font-size: 0.69rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-weight: 550;
}
.thread-seen-text.seen {
  color: #0284C7;
  font-weight: 600;
}
.thread-seen-icon.seen {
  color: #0284C7;
}
.thread-seen-text.sent {
  color: var(--ink-muted);
}
.thread-seen-icon.sent {
  color: var(--ink-muted);
}

/* Quick Reply Action beside Bubble (Desktop hover only) */
.thread-msg-reply-action {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink-muted);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease, transform .15s ease, background .15s ease;
  margin: 0 4px;
  flex-shrink: 0;
  align-self: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
@media (hover: hover) {
  .thread-msg-row:hover .thread-msg-reply-action {
    opacity: 0.85;
    pointer-events: auto;
  }
  .thread-msg-reply-action:hover {
    opacity: 1;
    background: var(--surface2, #f1f4f8);
    color: var(--ink);
    transform: scale(1.08);
  }
}
@media (hover: none) {
  .thread-msg-reply-action {
    display: none;
  }
}

/* Highlight message animation on jump */
.thread-msg-highlight .thread-bubble {
  animation: highlightGlow 1.8s ease-out;
}
@keyframes highlightGlow {
  0%   { box-shadow: 0 0 0 3px var(--accent); }
  50%  { box-shadow: 0 0 0 6px var(--accent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* Docked Reply Bar Above Composer */
.thread-reply-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideUpReply 0.18s ease-out;
}
@keyframes slideUpReply {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.thread-reply-bar-accent {
  width: 3px;
  height: 28px;
  border-radius: 99px;
  background: var(--accent);
  flex-shrink: 0;
}
.thread-reply-bar-body {
  flex: 1;
  min-width: 0;
}
.thread-reply-bar-title {
  font-size: 0.74rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 5px;
}
.thread-reply-bar-snippet {
  font-size: 0.74rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.thread-reply-bar-close {
  background: transparent;
  border: none;
  color: var(--ink-muted);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.thread-reply-bar-close:hover {
  background: var(--surface2, #f1f4f8);
  color: var(--ink);
}

/* Composer / Input Area (Instagram Pill Standard) */
.thread-input-area {
  padding: 0.5rem 0.85rem calc(0.55rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--bg) 96%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 30;
}

.thread-composer-box {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 26px;
  padding: 4px 6px 4px 14px;
  transition: border-color .15s ease, box-shadow .15s ease, border-radius .15s ease;
}
.thread-composer-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.16);
}
.thread-composer-box.has-reply {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.thread-composer-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  box-shadow: none;
  resize: none;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink);
  max-height: 110px;
  min-height: 24px;
  font-family: inherit;
  padding: 6px 0;
}
.thread-composer-input::placeholder {
  color: var(--ink-muted);
}
.thread-composer-input:focus {
  outline: none;
  box-shadow: none;
}

.thread-send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: #0D1424;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-bottom: 1px;
  opacity: 0.35;
  pointer-events: none;
  transform: scale(0.92);
  transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .15s ease, box-shadow .15s ease;
}
.thread-send-btn.is-active {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.38);
}
.thread-send-btn:not(:disabled):active {
  transform: scale(0.92);
}
`
