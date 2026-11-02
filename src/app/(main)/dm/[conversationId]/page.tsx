'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const { user } = useAuth()
  const router = useRouter()

  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

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
    if (!conversationId || !user) return

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

            // 2. If it's sent by current user, reconcile with matching pending optimistic message
            if (newMsg.sender_id === user.id) {
              const pendingIdx = prev.findIndex(
                m => m.id.startsWith('temp-') && m.sender_id === user.id && m.content === newMsg.content
              )
              if (pendingIdx !== -1) {
                const next = [...prev]
                next[pendingIdx] = newMsg
                return next
              }
            }

            // 3. Otherwise append new message
            return [...prev, newMsg]
          })

          setTimeout(() => scrollToBottom(true), 50)

          // Mark as read if from other user
          if (newMsg.sender_id !== user.id) {
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
  }, [conversationId, user, scrollToBottom])

  function handleReply(msg: Message) {
    setReplyingTo(msg)
    textareaRef.current?.focus()
  }

  async function sendMessage() {
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    const tempContent = text
    setContent('')
    textareaRef.current?.focus()

    const replyMeta: ReplyMeta | null = replyingTo ? {
      id: replyingTo.id,
      name: replyingTo.sender_id === user!.id ? 'You' : (other?.full_name || 'Them'),
      text: replyingTo.content.slice(0, 100),
    } : null

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user!.id,
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

      setMessages(prev => {
        // If the real message was already swapped in by Realtime:
        if (realMsg?.id && prev.some(m => m.id === realMsg.id)) {
          return prev.filter(m => m.id !== tempId)
        }

        // If Realtime hasn't arrived yet, replace tempId with realMsg in-place
        const pendingIdx = prev.findIndex(m => m.id === tempId)
        if (pendingIdx !== -1 && realMsg?.id) {
          const next = [...prev]
          next[pendingIdx] = realMsg
          return next
        }

        return prev
      })
    } catch (e: unknown) {
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

  const other = convInfo?.other_user
  // Last message sent by the current user to display Seen status
  const lastOwnMsg = [...messages].reverse().find(m => m.sender_id === user?.id)

  return (
    <div className="thread-wrap">
      {/* Top bar */}
      <div className="thread-topbar">
        <button className="thread-back" onClick={() => router.push('/dm')} aria-label="Back to chats">
          <ArrowLeft size={20} />
        </button>
        {other ? (
          <div className="thread-user-info">
            <div className="thread-avatar">
              {other.avatar_url
                ? <img src={other.avatar_url} alt={other.full_name} className="thread-avatar-img" />
                : <span className="thread-avatar-initials">{getInitials(other.full_name)}</span>
              }
            </div>
            <div>
              <div className="thread-user-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{other.full_name}</span>
                {isGoldenVerified(other) && (
                  <GoldenTick size={15} title="Haryana Day Early Bird Pioneer · Golden Badge" />
                )}
              </div>
              {other.department && <div className="thread-user-dept">{other.department}</div>}
            </div>
          </div>
        ) : (
          <div className="thread-user-loading" />
        )}
      </div>

      {/* Messages area */}
      <div className="thread-messages">
        {loading ? (
          <div className="thread-loading">
            <Loader2 size={24} className="thread-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="thread-empty">
            <p>No messages yet</p>
            <span>Send a message to start the conversation</span>
          </div>
        ) : (
          groupByDay(messages).map(group => (
            <div key={group.date}>
              <div className="thread-date-divider">{group.date}</div>
              {group.messages.map((msg, i) => {
                const isOwn = msg.sender_id === user?.id
                const prevMsg = group.messages[i - 1]
                const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                const isLastOwn = msg.id === lastOwnMsg?.id

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`thread-msg-row${isOwn ? ' thread-msg-row--own' : ''}`}
                  >
                    {!isOwn && (
                      <div className="thread-msg-avatar">
                        {showAvatar && other?.avatar_url
                          ? <img src={other.avatar_url} alt="" className="thread-small-avatar" />
                          : showAvatar
                          ? <span className="thread-small-initials">{other ? getInitials(other.full_name) : '?'}</span>
                          : null
                        }
                      </div>
                    )}

                    <div className="thread-bubble-wrap">
                      <div className={`thread-bubble${isOwn ? ' thread-bubble--own' : ''}`}>
                        {/* Quoted message if this message is a reply */}
                        {msg.reply_to && (
                          <div
                            className={`thread-bubble-quote${isOwn ? ' thread-bubble-quote--own' : ''}`}
                            onClick={() => scrollToMessage(msg.reply_to!.id)}
                            title="Click to jump to quoted message"
                          >
                            <div className="thread-quote-author">
                              <Reply size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                              {msg.reply_to.name}
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

                      {/* Time timestamp */}
                      <div className={`thread-msg-time${isOwn ? ' thread-msg-time--own' : ''}`}>
                        <span>{timeAgo(msg.created_at)}</span>
                        {msg.id.startsWith('temp-') && <span> · Sending…</span>}
                      </div>

                      {/* Instagram-style Seen Status with Timestamp */}
                      {isOwn && isLastOwn && !msg.id.startsWith('temp-') && (
                        <div className="thread-seen-indicator">
                          {msg.read_at ? (
                            <span
                              className="thread-seen-text seen"
                              title={`Seen on ${new Date(msg.read_at).toLocaleString('en-IN')}`}
                            >
                              <CheckCheck size={13} className="thread-seen-icon seen" />
                              Seen {formatSeenTime(msg.read_at)}
                            </span>
                          ) : (
                            <span className="thread-seen-text sent">
                              <Check size={13} className="thread-seen-icon sent" />
                              Sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Reply button */}
                    <button
                      className="thread-msg-reply-action"
                      onClick={() => handleReply(msg)}
                      title="Reply to message"
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

      {/* Input area */}
      <div className="thread-input-area">
        {/* Instagram-style Docked Reply Preview */}
        {replyingTo && (
          <div className="thread-reply-bar">
            <div className="thread-reply-bar-accent" />
            <div className="thread-reply-bar-body">
              <div className="thread-reply-bar-title">
                <Reply size={12} />
                <span>
                  Replying to <strong>{replyingTo.sender_id === user?.id ? 'yourself' : (other?.full_name || 'them')}</strong>
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

        <div className={`thread-input-wrap${replyingTo ? ' has-reply' : ''}`}>
          <textarea
            ref={textareaRef}
            className="thread-input"
            placeholder={replyingTo ? "Write your reply…" : "Message…"}
            value={content}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button
            className="thread-send-btn"
            onClick={sendMessage}
            disabled={!content.trim() || sending}
            aria-label="Send"
          >
            {sending ? <Loader2 size={18} className="thread-spinner" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      <style>{threadStyles}</style>
    </div>
  )
}

const threadStyles = `
.thread-wrap {
  display: flex; flex-direction: column;
  height: calc(100dvh - 52px - 64px);
  max-width: 600px; margin: 0 auto;
}

/* Topbar */
.thread-topbar {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem 1rem;
  background: var(--bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 52px; z-index: 10; flex-shrink: 0;
}
.thread-back {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: var(--surface); color: var(--ink);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
}
.thread-user-info { display: flex; align-items: center; gap: .65rem; }
.thread-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--surface2, #f1f4f8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.thread-avatar-img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
.thread-avatar-initials { font-size: .75rem; font-weight: 700; color: var(--accent); }
.thread-user-name { font-size: .9rem; font-weight: 700; color: var(--ink); }
.thread-user-dept { font-size: .72rem; color: var(--ink-muted); }
.thread-user-loading { height: 18px; width: 120px; border-radius: 6px; background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

/* Messages */
.thread-messages { flex: 1; overflow-y: auto; padding: .75rem .75rem 0; display: flex; flex-direction: column; gap: .25rem; }
.thread-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
.thread-spinner { animation: spin .7s linear infinite; color: var(--accent); }
@keyframes spin { to{transform:rotate(360deg)} }
.thread-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .4rem; padding: 3rem 1rem; color: var(--ink-muted); text-align: center; flex: 1; }
.thread-empty p { font-weight: 600; font-size: .875rem; color: var(--ink); }
.thread-empty span { font-size: .8rem; }

.thread-date-divider {
  text-align: center; font-size: .7rem; color: var(--ink-muted);
  margin: .85rem 0 .35rem; letter-spacing: .03em;
  position: relative;
}
.thread-date-divider::before,
.thread-date-divider::after {
  content: ''; position: absolute; top: 50%; width: 28%;
  height: 1px; background: var(--border);
}
.thread-date-divider::before { left: 0; }
.thread-date-divider::after { right: 0; }

.thread-msg-row {
  display: flex; align-items: flex-end; gap: .45rem; margin-bottom: .25rem;
  position: relative;
}
.thread-msg-row--own { flex-direction: row-reverse; }
.thread-msg-avatar { width: 24px; flex-shrink: 0; }
.thread-small-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
.thread-small-initials { width: 24px; height: 24px; border-radius: 50%; background: var(--surface2, #f1f4f8); display: flex; align-items: center; justify-content: center; font-size: .6rem; font-weight: 700; color: var(--accent); }

.thread-bubble-wrap { display: flex; flex-direction: column; max-width: 74%; }
.thread-msg-row--own .thread-bubble-wrap { align-items: flex-end; }

.thread-bubble {
  background: var(--surface); border-radius: 16px 16px 16px 4px;
  padding: .55rem .8rem; font-size: .875rem; color: var(--ink);
  line-height: 1.45; word-break: break-word; white-space: pre-wrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  border: 1px solid var(--border);
}
.thread-bubble--own {
  background: var(--accent); color: #0D1424;
  border-radius: 16px 16px 4px 16px;
  border: none;
}
.thread-deleted { color: var(--ink-muted); font-style: italic; }

.thread-msg-time { font-size: .65rem; color: var(--ink-muted); margin-top: .15rem; padding: 0 .1rem; }
.thread-msg-time--own { text-align: right; }

/* Quoted message in bubble */
.thread-bubble-quote {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 4px 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: opacity .15s ease;
  font-size: .78rem;
  max-width: 100%;
}
.thread-bubble-quote:hover { opacity: .82; }
.thread-bubble--own .thread-bubble-quote {
  background: rgba(0, 0, 0, 0.12);
  border-left-color: #0D1424;
}
.thread-quote-author {
  font-weight: 750;
  font-size: .7rem;
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  color: var(--ink);
}
.thread-bubble--own .thread-quote-author { color: #0D1424; }
.thread-quote-snippet {
  font-size: .74rem;
  opacity: .88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quick reply button beside bubble */
.thread-msg-reply-action {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink-muted);
  width: 26px; height: 26px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s ease, transform .15s ease, background .15s ease;
  margin: 0 4px;
  flex-shrink: 0;
  align-self: center;
}
.thread-msg-row:hover .thread-msg-reply-action {
  opacity: 1;
}
.thread-msg-reply-action:hover {
  background: var(--surface-2, #f1f4f8);
  color: var(--ink);
  transform: scale(1.1);
}
@media (max-width: 768px) {
  .thread-msg-reply-action {
    opacity: 0.55;
  }
}

/* Seen Status Indicator (Instagram Style) */
.thread-seen-indicator {
  display: flex;
  justify-content: flex-end;
  margin-top: 2px;
  padding: 0 2px;
  animation: fadeInSeen .25s ease;
}
@keyframes fadeInSeen {
  from { opacity: 0; transform: translateY(-2px); }
  to   { opacity: 1; transform: translateY(0); }
}
.thread-seen-text {
  font-size: .68rem;
  color: var(--ink-muted);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: inherit;
  font-weight: 500;
}
.thread-seen-text.seen {
  color: var(--accent-text, #92600F);
  font-weight: 600;
}
.thread-seen-icon.seen {
  color: #0284C7; /* Instagram-style subtle blue double check */
}
.thread-seen-icon.sent {
  color: var(--ink-muted);
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

/* Reply Bar Docked Above Composer */
.thread-reply-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  padding: 7px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  animation: slideUpReply .18s ease-out;
}
@keyframes slideUpReply {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.thread-reply-bar-accent {
  width: 3px;
  height: 26px;
  border-radius: 99px;
  background: var(--accent);
  flex-shrink: 0;
}
.thread-reply-bar-body {
  flex: 1;
  min-width: 0;
}
.thread-reply-bar-title {
  font-size: .75rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 5px;
}
.thread-reply-bar-snippet {
  font-size: .74rem;
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
  width: 24px; height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, color .15s;
}
.thread-reply-bar-close:hover {
  background: var(--bg-muted, #f1f4f8);
  color: var(--ink);
}
.thread-input-wrap.has-reply {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* Input */
.thread-input-area {
  padding: .5rem .75rem .65rem;
  background: var(--bg); border-top: 1px solid var(--border);
  padding-bottom: calc(.65rem + env(safe-area-inset-bottom, 0));
  flex-shrink: 0;
}
.thread-input-wrap {
  display: flex; align-items: flex-end; gap: .6rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: .5rem .5rem .5rem .85rem;
  transition: border-radius .15s ease;
}
.thread-input {
  flex: 1; background: transparent; border: none; outline: none;
  resize: none; font-size: .875rem; color: var(--ink); line-height: 1.45;
  max-height: 120px; font-family: inherit;
}
.thread-input::placeholder { color: var(--ink-muted); }
.thread-send-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent); color: #0D1424; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: opacity .15s;
}
.thread-send-btn:disabled { opacity: .45; cursor: not-allowed; }
.thread-send-btn:not(:disabled):active { opacity: .8; }
`
