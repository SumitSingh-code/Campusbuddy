'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/date'
import { toast } from 'sonner'
import { GoldenTick } from '@/components/ui/GoldenTick'
import { isGoldenVerified } from '@/lib/badges'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_deleted?: boolean
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

export default function DMThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const router = useRouter()

  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [content, setContent] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Load conversation + messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Backend GET /dm/conversations/:id returns messages + other_user in one call
        const res = await api.get(`/dm/conversations/${conversationId}`)
        if (cancelled) return
        // Reconstruct convInfo from the other_user field
        if (res.other_user) {
          setConvInfo({ id: conversationId, other_user: res.other_user as ConvInfo['other_user'] })
        }
        setMessages((res.data as Message[]) || [])
        // Mark read (best-effort, already done server-side but call anyway)
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

  // Scroll to bottom on load
  useEffect(() => {
    if (!loading) setTimeout(() => scrollToBottom(false), 50)
  }, [loading, scrollToBottom])

  // Realtime subscription
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
          const newMsg = payload.new as Message
          setMessages(prev => {
            // deduplicate
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(() => scrollToBottom(true), 50)
          // Mark as read if from other user
          if (newMsg.sender_id !== user.id) {
            api.patch(`/dm/conversations/${conversationId}/read`, {}).catch(() => {})
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, user, scrollToBottom])

  async function sendMessage() {
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    const tempContent = text
    setContent('')
    textareaRef.current?.focus()

    // Optimistic
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user!.id,
      content: tempContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(true), 50)

    try {
      await api.post(`/dm/conversations/${conversationId}/messages`, { content: tempContent })
      // realtime will add the real message; remove optimistic
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setContent(tempContent)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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

  return (
    <div className="thread-wrap">
      {/* Top bar */}
      <div className="thread-topbar">
        <button className="thread-back" onClick={() => router.push('/dm')}>
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
                return (
                  <div key={msg.id} className={`thread-msg-row${isOwn ? ' thread-msg-row--own' : ''}`}>
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
                        {msg.is_deleted ? <em className="thread-deleted">This message was deleted</em> : msg.content}
                      </div>
                      <div className={`thread-msg-time${isOwn ? ' thread-msg-time--own' : ''}`}>
                        {timeAgo(msg.created_at)}
                        {msg.id.startsWith('temp-') && <span> · Sending…</span>}
                      </div>
                    </div>
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
        <div className="thread-input-wrap">
          <textarea
            ref={textareaRef}
            className="thread-input"
            placeholder="Message…"
            value={content}
            onChange={autoResize}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={sending}
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
.thread-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
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
  display: flex; align-items: flex-end; gap: .45rem; margin-bottom: .15rem;
}
.thread-msg-row--own { flex-direction: row-reverse; }
.thread-msg-avatar { width: 24px; flex-shrink: 0; }
.thread-small-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
.thread-small-initials { width: 24px; height: 24px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: .6rem; font-weight: 700; color: var(--accent); }

.thread-bubble-wrap { display: flex; flex-direction: column; max-width: 72%; }
.thread-msg-row--own .thread-bubble-wrap { align-items: flex-end; }

.thread-bubble {
  background: var(--surface); border-radius: 16px 16px 16px 4px;
  padding: .55rem .8rem; font-size: .875rem; color: var(--ink);
  line-height: 1.45; word-break: break-word; white-space: pre-wrap;
}
.thread-bubble--own {
  background: var(--accent); color: var(--bg);
  border-radius: 16px 16px 4px 16px;
}
.thread-deleted { color: var(--ink-muted); font-style: italic; }
.thread-msg-time { font-size: .65rem; color: var(--ink-muted); margin-top: .15rem; padding: 0 .1rem; }
.thread-msg-time--own { text-align: right; }

/* Input */
.thread-input-area {
  padding: .65rem .75rem;
  background: var(--bg); border-top: 1px solid var(--border);
  padding-bottom: calc(.65rem + env(safe-area-inset-bottom, 0));
  flex-shrink: 0;
}
.thread-input-wrap {
  display: flex; align-items: flex-end; gap: .6rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: .5rem .5rem .5rem .85rem;
}
.thread-input {
  flex: 1; background: transparent; border: none; outline: none;
  resize: none; font-size: .875rem; color: var(--ink); line-height: 1.45;
  max-height: 120px; font-family: inherit;
}
.thread-input::placeholder { color: var(--ink-muted); }
.thread-send-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent); color: var(--bg); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: opacity .15s;
}
.thread-send-btn:disabled { opacity: .45; cursor: not-allowed; }
.thread-send-btn:not(:disabled):active { opacity: .8; }
`
