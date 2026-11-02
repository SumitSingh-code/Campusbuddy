'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, Reply, X, CheckCheck } from 'lucide-react'
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
      return `yesterday at ${timeStr}`
    }

    const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${dateFormatted} at ${timeStr}`
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
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null)

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
    if (!loading) setTimeout(() => scrollToBottom(false), 50)
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

          setTimeout(() => scrollToBottom(true), 50)

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
    }, 40)
  }

  // Double tap to reply, single tap to toggle timestamp
  function handleMessageTap(msg: Message) {
    const now = Date.now()
    if (lastTapRef.current && lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 300) {
      handleReply(msg)
      lastTapRef.current = null
    } else {
      lastTapRef.current = { id: msg.id, time: now }
      setActiveMsgId(prev => prev === msg.id ? null : msg.id)
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
    setTimeout(() => scrollToBottom(true), 40)

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
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
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
    <div className="ig-thread-wrap">
      {/* Instagram Direct Top Header */}
      <header className="ig-thread-header">
        <button className="ig-back-btn" onClick={() => router.push('/dm')} aria-label="Back to chats">
          <ArrowLeft size={22} />
        </button>

        {other ? (
          <Link href={`/profile/${other.id}`} className="ig-user-profile-btn" aria-label={`View ${other.full_name}'s profile`}>
            <div className="ig-header-avatar">
              {other.avatar_url ? (
                <img src={other.avatar_url} alt={other.full_name} className="ig-avatar-img" />
              ) : (
                <span className="ig-avatar-fallback">{getInitials(other.full_name)}</span>
              )}
            </div>

            <div className="ig-header-meta">
              <div className="ig-header-name">
                <span className="truncate">{other.full_name}</span>
                {isGoldenVerified(other) && (
                  <GoldenTick size={15} title="Haryana Day Pioneer · Golden Tick" />
                )}
              </div>
              <div className="ig-header-subtitle">
                {other.department ? other.department : 'CRSU Student'}
              </div>
            </div>
          </Link>
        ) : (
          <div className="ig-header-skeleton">
            <div className="ig-sk-avatar" />
            <div className="ig-sk-lines">
              <div className="ig-sk-line ig-sk-name" />
              <div className="ig-sk-line ig-sk-sub" />
            </div>
          </div>
        )}
      </header>

      {/* Messages Canvas */}
      <div className="ig-messages-canvas">
        {loading ? (
          <div className="ig-loading-center">
            <Loader2 size={24} className="ig-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="ig-empty-state">
            <div className="ig-empty-avatar">
              {other?.avatar_url ? (
                <img src={other.avatar_url} alt="" />
              ) : (
                <span>{other ? getInitials(other.full_name) : '💬'}</span>
              )}
            </div>
            <h3>{other?.full_name || 'Direct Message'}</h3>
            <p>{other?.department ? `${other.department} · CRSU` : 'Start a private conversation'}</p>
            <div className="ig-empty-hint">Say hi to break the ice 👋</div>
          </div>
        ) : (
          groupByDay(messages).map(group => (
            <div key={group.date} className="ig-day-section">
              <div className="ig-day-pill">
                <span>{group.date}</span>
              </div>

              {group.messages.map((msg, i) => {
                const isOwn = msg.sender_id === myId
                const clusterPos = getClusterPosition(group.messages, i)
                const isClusterLast = clusterPos === 'last' || clusterPos === 'single'
                const isLastOwn = msg.id === lastOwnMsg?.id
                const isOptimistic = msg.id.startsWith('temp-')
                const isTimeActive = activeMsgId === msg.id

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`ig-msg-row ${isOwn ? 'is-own' : 'is-other'} cluster-${clusterPos}`}
                    onClick={() => handleMessageTap(msg)}
                  >
                    <div className="ig-bubble-column">
                      <div className={`ig-bubble ${isOwn ? 'ig-bubble--own' : 'ig-bubble--other'} pos-${clusterPos}`}>
                        {/* Quoted preview if reply */}
                        {msg.reply_to && (
                          <div
                            className={`ig-quote-card ${isOwn ? 'ig-quote-card--own' : 'ig-quote-card--other'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              scrollToMessage(msg.reply_to!.id)
                            }}
                            title="Jump to quoted message"
                          >
                            <div className="ig-quote-sender">
                              <Reply size={11} className="ig-quote-icon" />
                              <span>{msg.reply_to.name}</span>
                            </div>
                            <div className="ig-quote-snippet">
                              {msg.reply_to.text}
                            </div>
                          </div>
                        )}

                        <div className="ig-msg-body">
                          {msg.is_deleted ? <em className="ig-deleted-text">This message was deleted</em> : msg.content}
                        </div>
                      </div>

                      {/* Explicit toggle timestamp or sending indicator */}
                      {(isTimeActive || isOptimistic) && (
                        <div className={`ig-time-hint ${isOwn ? 'is-own' : ''}`}>
                          <span>{timeAgo(msg.created_at)}</span>
                          {isOptimistic && <span className="ig-sending-label"> · Sending…</span>}
                        </div>
                      )}

                      {/* Instagram Seen Status under the last own message */}
                      {isOwn && isLastOwn && !isOptimistic && (
                        <div className="ig-seen-row">
                          {msg.read_at ? (
                            <span className="ig-seen-label seen">
                              <CheckCheck size={13} className="ig-seen-check" />
                              <span>Seen {formatSeenTime(msg.read_at)}</span>
                            </span>
                          ) : (
                            <span className="ig-seen-label sent">
                              <span>Sent</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Desktop Hover Quick Reply */}
                    <button
                      className="ig-hover-reply"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReply(msg)
                      }}
                      title="Reply"
                      aria-label="Reply"
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

      {/* Docked Reply Bar & Capsule Composer */}
      <footer className="ig-composer-footer">
        {replyingTo && (
          <div className="ig-docked-reply">
            <div className="ig-docked-reply-accent" />
            <div className="ig-docked-reply-info">
              <div className="ig-docked-reply-title">
                <Reply size={11} />
                <span>
                  Replying to <strong>{replyingTo.sender_id === myId ? 'yourself' : (other?.full_name || 'them')}</strong>
                </span>
              </div>
              <div className="ig-docked-reply-preview">
                {replyingTo.content.slice(0, 90)}
              </div>
            </div>
            <button
              className="ig-docked-reply-close"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className={`ig-capsule-box ${replyingTo ? 'has-reply-dock' : ''}`}>
          <textarea
            ref={textareaRef}
            className="ig-capsule-textarea"
            placeholder={replyingTo ? "Write a reply…" : "Message…"}
            value={content}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button
            className={`ig-capsule-send-btn ${content.trim() ? 'can-send' : ''}`}
            onClick={sendMessage}
            disabled={!content.trim() || sending}
            aria-label="Send message"
          >
            {sending ? <Loader2 size={16} className="ig-spinner" /> : <Send size={15} />}
          </button>
        </div>
      </footer>

      <style>{igThreadStyles}</style>
    </div>
  )
}

const igThreadStyles = `
/* ─── Instagram Direct Precision Container ────────────────────────── */
.ig-thread-wrap {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

/* ─── Header ───────────────────────────────────────────────────────── */
.ig-thread-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 40;
  flex-shrink: 0;
}

.ig-back-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .12s ease;
}
.ig-back-btn:hover {
  background: var(--surface2, rgba(0,0,0,0.06));
}

.ig-user-profile-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
  flex: 1;
}

.ig-header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface2, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--border);
}
.ig-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ig-avatar-fallback {
  font-size: 0.8rem;
  font-weight: 750;
  color: var(--accent);
}

.ig-header-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ig-header-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.25;
}
.ig-header-subtitle {
  font-size: 0.72rem;
  color: var(--ink-muted);
  line-height: 1.2;
  margin-top: 1px;
}

/* Skeleton Loading */
.ig-header-skeleton {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ig-sk-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface2, #E2E8F0);
  animation: igPulse 1.4s infinite ease-in-out;
}
.ig-sk-lines {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ig-sk-line {
  background: var(--surface2, #E2E8F0);
  border-radius: 4px;
  animation: igPulse 1.4s infinite ease-in-out;
}
.ig-sk-name { width: 110px; height: 14px; }
.ig-sk-sub  { width: 70px;  height: 11px; }
@keyframes igPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ─── Messages Canvas ──────────────────────────────────────────────── */
.ig-messages-canvas {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.ig-loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 1rem;
}
.ig-spinner {
  animation: igSpin 0.7s linear infinite;
  color: var(--accent);
}
@keyframes igSpin { to { transform: rotate(360deg); } }

/* Empty state */
.ig-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  margin: auto;
}
.ig-empty-avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--surface2, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.ig-empty-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ig-empty-avatar span { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.ig-empty-state h3 { font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 3px; }
.ig-empty-state p { font-size: 0.8rem; color: var(--ink-muted); margin-bottom: 14px; }
.ig-empty-hint {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  background: var(--surface2, rgba(0,0,0,0.05));
  color: var(--ink);
}

/* Day Section & Pill */
.ig-day-section {
  display: flex;
  flex-direction: column;
}
.ig-day-pill {
  text-align: center;
  margin: 14px 0 8px;
  position: relative;
}
.ig-day-pill span {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}

/* ─── Message Rows & Clean Gutters (No Avatars in 1-on-1) ───────────── */
.ig-msg-row {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  margin-bottom: 2px;
}
.ig-msg-row.is-own {
  justify-content: flex-end;
}
.ig-msg-row.is-other {
  justify-content: flex-start;
}
.ig-msg-row.cluster-last,
.ig-msg-row.cluster-single {
  margin-bottom: 9px;
}

.ig-bubble-column {
  display: flex;
  flex-direction: column;
  max-width: 74%;
}
.ig-msg-row.is-own .ig-bubble-column {
  align-items: flex-end;
}

/* ─── Real Instagram Message Bubbles ───────────────────────────────── */
.ig-bubble {
  padding: 8px 14px;
  font-size: 0.92rem;
  line-height: 1.42;
  word-break: break-word;
  white-space: pre-wrap;
  user-select: text;
  cursor: pointer;
  transition: transform .1s ease, filter .1s ease;
}
.ig-bubble:active {
  transform: scale(0.985);
}

/* Received Bubble (Clean Flat Neutral - Instagram Grey) */
.ig-bubble--other {
  background: var(--surface2, #EFEFEF);
  color: var(--ink, #000000);
}
.pos-single.ig-bubble--other { border-radius: 20px; }
.pos-first.ig-bubble--other  { border-radius: 20px 20px 20px 4px; }
.pos-middle.ig-bubble--other { border-radius: 4px 20px 20px 4px; }
.pos-last.ig-bubble--other   { border-radius: 4px 20px 20px 20px; }

/* Sent Bubble (Instagram Signature Royal Blue/Indigo Gradient) */
.ig-bubble--own {
  background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
  color: #FFFFFF;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.22);
}
.pos-single.ig-bubble--own { border-radius: 20px; }
.pos-first.ig-bubble--own  { border-radius: 20px 20px 4px 20px; }
.pos-middle.ig-bubble--own { border-radius: 20px 4px 4px 20px; }
.pos-last.ig-bubble--own   { border-radius: 20px 4px 20px 20px; }

.ig-deleted-text {
  opacity: 0.7;
  font-style: italic;
}

/* ─── Quoted Preview Card Inside Bubble ─────────────────────────────── */
.ig-quote-card {
  border-radius: 10px;
  padding: 5px 10px;
  margin-bottom: 5px;
  font-size: 0.76rem;
  cursor: pointer;
  transition: opacity .15s ease;
}
.ig-quote-card:hover {
  opacity: 0.88;
}

.ig-quote-card--other {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #2563EB;
}
.ig-quote-card--other .ig-quote-sender {
  color: #2563EB;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ig-quote-card--other .ig-quote-snippet {
  color: var(--ink-muted, #555555);
  margin-top: 1px;
}

.ig-quote-card--own {
  background: rgba(255, 255, 255, 0.18);
  border-left: 3px solid #FFFFFF;
}
.ig-quote-card--own .ig-quote-sender {
  color: #FFFFFF;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ig-quote-card--own .ig-quote-snippet {
  color: rgba(255, 255, 255, 0.88);
  margin-top: 1px;
}

.ig-quote-snippet {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.74rem;
}

/* ─── Compact Inline Timestamps & Seen Row ─────────────────────────── */
.ig-time-hint {
  font-size: 0.65rem;
  color: var(--ink-muted);
  margin-top: 2px;
  padding: 0 4px;
  animation: igFadeIn 0.15s ease;
}
.ig-time-hint.is-own {
  text-align: right;
}
.ig-sending-label {
  color: #2563EB;
  font-weight: 600;
}

.ig-seen-row {
  margin-top: 3px;
  padding: 0 4px;
  animation: igFadeIn 0.2s ease;
}
.ig-seen-label {
  font-size: 0.68rem;
  font-weight: 550;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.ig-seen-label.seen {
  color: #0284C7;
  font-weight: 600;
}
.ig-seen-label.sent {
  color: var(--ink-muted);
}
@keyframes igFadeIn {
  from { opacity: 0; transform: translateY(-2px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Desktop Hover Reply Button ───────────────────────────────────── */
.ig-hover-reply {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease, transform .12s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  flex-shrink: 0;
}
@media (hover: hover) {
  .ig-msg-row:hover .ig-hover-reply {
    opacity: 0.85;
    pointer-events: auto;
  }
  .ig-hover-reply:hover {
    opacity: 1;
    transform: scale(1.08);
    color: var(--ink);
    background: var(--surface2);
  }
}
@media (hover: none) {
  .ig-hover-reply {
    display: none;
  }
}

/* Highlight Jump */
.thread-msg-highlight .ig-bubble {
  animation: igHighlight 1.8s ease-out;
}
@keyframes igHighlight {
  0%   { box-shadow: 0 0 0 3px #2563EB; }
  50%  { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.4); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* ─── Docked Reply Bar Above Composer ──────────────────────────────── */
.ig-composer-footer {
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--bg) 96%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
  z-index: 40;
  flex-shrink: 0;
}

.ig-docked-reply {
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: igSlideUp 0.15s ease-out;
}
@keyframes igSlideUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ig-docked-reply-accent {
  width: 3px;
  height: 26px;
  border-radius: 99px;
  background: #2563EB;
  flex-shrink: 0;
}
.ig-docked-reply-info {
  flex: 1;
  min-width: 0;
}
.ig-docked-reply-title {
  font-size: 0.72rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 4px;
}
.ig-docked-reply-preview {
  font-size: 0.72rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ig-docked-reply-close {
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
.ig-docked-reply-close:hover {
  background: var(--surface2);
  color: var(--ink);
}

/* ─── Instagram Pill Capsule Composer ──────────────────────────────── */
.ig-capsule-box {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 24px;
  padding: 4px 6px 4px 14px;
  transition: border-color .15s ease, box-shadow .15s ease, border-radius .15s ease;
}
.ig-capsule-box:focus-within {
  border-color: #2563EB;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}
.ig-capsule-box.has-reply-dock {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.ig-capsule-textarea {
  flex: 1;
  background: transparent;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  resize: none;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--ink);
  max-height: 100px;
  min-height: 24px;
  font-family: inherit;
  padding: 6px 0;
}
.ig-capsule-textarea::placeholder {
  color: var(--ink-muted);
}

.ig-capsule-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563EB;
  color: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-bottom: 2px;
  opacity: 0.25;
  pointer-events: none;
  transform: scale(0.9);
  transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .15s ease;
}
.ig-capsule-send-btn.can-send {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}
.ig-capsule-send-btn:not(:disabled):active {
  transform: scale(0.92);
}
`
