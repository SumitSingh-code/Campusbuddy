'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, Reply, X, CheckCheck, MoreVertical, Ban, ShieldCheck, ShieldAlert, UserRound } from 'lucide-react'
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
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null)

  const [blockState, setBlockState] = useState<{
    isBlocked: boolean
    blockedByMe: boolean
    blockedByOther: boolean
  }>({ isBlocked: false, blockedByMe: false, blockedByOther: false })

  const [menuOpen, setMenuOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [unblockModalOpen, setUnblockModalOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentUserIdRef = useRef<string | null>(null)
  currentUserIdRef.current = user?.id || profile?.id || null

  const pendingTempIdsRef = useRef<Set<string>>(new Set())
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)
  const messageSwipeRef = useRef<{ id: string; pointerId: number; x: number; y: number } | null>(null)
  const suppressMessageTapRef = useRef(false)
  const contentRef = useRef('')

  const messagesCanvasRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    const canvas = messagesCanvasRef.current
    if (!canvas) return

    // Keep auto-scroll inside the conversation. scrollIntoView() can also move
    // the document viewport when the mobile keyboard resizes the thread.
    canvas.scrollTo({
      top: canvas.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }, [])

  // Keep the thread sized to the visible viewport so the composer stays above
  // the software keyboard on mobile browsers that use an overlay keyboard.
  useEffect(() => {
    const root = document.documentElement
    const visualViewport = window.visualViewport
    let scrollFrame = 0
    let keyboardWasOpen = false

    const syncViewport = () => {
      const visibleHeight = visualViewport?.height ?? window.innerHeight
      const keyboardIsOpen = Boolean(visualViewport && window.innerHeight - visibleHeight > 120)
      const keyboardJustOpened = keyboardIsOpen && !keyboardWasOpen
      keyboardWasOpen = keyboardIsOpen

      root.style.setProperty('--dm-thread-viewport-height', `${Math.round(visibleHeight)}px`)
      if (keyboardIsOpen) root.style.setProperty('--dm-thread-safe-bottom', '0px')
      else root.style.removeProperty('--dm-thread-safe-bottom')

      if (keyboardJustOpened && document.activeElement === textareaRef.current) {
        cancelAnimationFrame(scrollFrame)
        scrollFrame = requestAnimationFrame(() => scrollToBottom(false))
      }
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    visualViewport?.addEventListener('resize', syncViewport)
    visualViewport?.addEventListener('scroll', syncViewport)

    return () => {
      cancelAnimationFrame(scrollFrame)
      window.removeEventListener('resize', syncViewport)
      visualViewport?.removeEventListener('resize', syncViewport)
      visualViewport?.removeEventListener('scroll', syncViewport)
      root.style.removeProperty('--dm-thread-viewport-height')
      root.style.removeProperty('--dm-thread-safe-bottom')
    }
  }, [scrollToBottom])

  function scrollToMessage(msgId: string) {
    const el = document.getElementById(`msg-${msgId}`)
    const canvas = messagesCanvasRef.current
    if (el && canvas) {
      const messageBounds = el.getBoundingClientRect()
      const canvasBounds = canvas.getBoundingClientRect()
      const centeredTop = canvas.scrollTop + messageBounds.top - canvasBounds.top - (canvas.clientHeight - messageBounds.height) / 2
      canvas.scrollTo({ top: centeredTop, behavior: 'smooth' })
      el.classList.add('thread-msg-highlight')
      setTimeout(() => el.classList.remove('thread-msg-highlight'), 1800)
    }
  }

  // Load conversation + messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.get<{
          data?: Message[]
          other_user?: ConvInfo['other_user']
          is_blocked?: boolean
          blocked_by_me?: boolean
          blocked_by_other?: boolean
        }>(`/dm/conversations/${conversationId}`)
        if (cancelled) return
        if (res.other_user) {
          setConvInfo({ id: conversationId, other_user: res.other_user as ConvInfo['other_user'] })
        }
        if (typeof res.is_blocked === 'boolean') {
          setBlockState({
            isBlocked: Boolean(res.is_blocked),
            blockedByMe: Boolean(res.blocked_by_me),
            blockedByOther: Boolean(res.blocked_by_other),
          })
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

  // Close options dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

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

  function handleMessagePointerDown(event: React.PointerEvent<HTMLDivElement>, msg: Message) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    messageSwipeRef.current = {
      id: msg.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMessagePointerUp(event: React.PointerEvent<HTMLDivElement>, msg: Message) {
    const start = messageSwipeRef.current
    messageSwipeRef.current = null
    if (!start || start.id !== msg.id || start.pointerId !== event.pointerId) return

    const deltaX = event.clientX - start.x
    const deltaY = Math.abs(event.clientY - start.y)
    if (deltaX < 56 || deltaY > 48 || deltaY > deltaX * 0.65) return

    // A horizontal swipe replies instead of also triggering the row's tap action.
    suppressMessageTapRef.current = true
    handleReply(msg)
    window.setTimeout(() => {
      suppressMessageTapRef.current = false
    }, 0)
  }

  function handleMessagePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (messageSwipeRef.current?.pointerId === event.pointerId) {
      messageSwipeRef.current = null
    }
  }

  async function handleBlockUser() {
    if (!other?.id || blocking) return
    setBlocking(true)
    try {
      await api.post(`/dm/block/${other.id}`, {})
      setBlockState({
        isBlocked: true,
        blockedByMe: true,
        blockedByOther: false,
      })
      setBlockModalOpen(false)
      setMenuOpen(false)
      toast.success(`${other.full_name} has been blocked.`)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to block user')
    } finally {
      setBlocking(false)
    }
  }

  async function handleUnblockUser() {
    if (!other?.id || blocking) return
    setBlocking(true)
    try {
      await api.post(`/dm/unblock/${other.id}`, {})
      setBlockState({
        isBlocked: false,
        blockedByMe: false,
        blockedByOther: false,
      })
      setUnblockModalOpen(false)
      setMenuOpen(false)
      toast.success(`${other.full_name} has been unblocked.`)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to unblock user')
    } finally {
      setBlocking(false)
    }
  }

  async function sendMessage() {
    if (blockState.isBlocked) {
      toast.error(blockState.blockedByMe ? 'You have blocked this user. Unblock to send a message.' : 'Cannot message this user.')
      return
    }
    const text = contentRef.current.trim()
    if (!text) return
    const tempContent = text
    contentRef.current = ''
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
    requestAnimationFrame(() => scrollToBottom(true))

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
      // Restore the failed text only when the composer has no newer draft.
      if (!contentRef.current.trim()) {
        contentRef.current = tempContent
        setContent(tempContent)
        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.style.height = 'auto'
          textarea.style.height = Math.min(textarea.scrollHeight, 110) + 'px'
        })
      }
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
    contentRef.current = e.target.value
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
          <>
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

            <div className="ig-header-actions" ref={menuRef}>
              <button
                type="button"
                className="ig-options-btn"
                onClick={() => setMenuOpen(prev => !prev)}
                aria-label="Chat options"
              >
                <MoreVertical size={20} />
              </button>

              {menuOpen && (
                <div className="ig-options-menu">
                  <Link
                    href={`/profile/${other.id}`}
                    className="ig-options-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRound size={16} />
                    <span>View Profile</span>
                  </Link>

                  {blockState.blockedByMe ? (
                    <button
                      type="button"
                      className="ig-options-item ig-options-item--success"
                      onClick={() => {
                        setMenuOpen(false)
                        setUnblockModalOpen(true)
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>Unblock User</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ig-options-item ig-options-item--danger"
                      onClick={() => {
                        setMenuOpen(false)
                        setBlockModalOpen(true)
                      }}
                    >
                      <Ban size={16} />
                      <span>Block User</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
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
      <div ref={messagesCanvasRef} className="ig-messages-canvas">
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
                    className={`ig-msg-row ${isOwn ? 'is-own' : 'is-other'} cluster-${clusterPos}${isTimeActive ? ' is-time-active' : ''}`}
                    onPointerDown={event => handleMessagePointerDown(event, msg)}
                    onPointerUp={event => handleMessagePointerUp(event, msg)}
                    onPointerCancel={handleMessagePointerCancel}
                    onClick={() => {
                      if (suppressMessageTapRef.current) {
                        suppressMessageTapRef.current = false
                        return
                      }
                      handleMessageTap(msg)
                    }}
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
                          {isTimeActive && !isOptimistic && (
                            <button
                              type="button"
                              className="ig-inline-reply"
                              onClick={event => {
                                event.stopPropagation()
                                handleReply(msg)
                              }}
                            >
                              <Reply size={12} /> Reply
                            </button>
                          )}
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
                      aria-label={`Reply to ${isOwn ? 'your' : (other?.full_name || 'their')} message`}
                    >
                      <Reply size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Docked Reply Bar & Capsule Composer */}
      <footer className="ig-composer-footer">
        {blockState.isBlocked ? (
          <div className="ig-blocked-banner">
            <div className="ig-blocked-banner-content">
              <ShieldAlert size={19} className="ig-blocked-icon" />
              <div className="ig-blocked-meta">
                {blockState.blockedByMe ? (
                  <>
                    <strong>You blocked {other?.full_name || 'this user'}.</strong>
                    <span>You won&apos;t receive their messages or notifications.</span>
                  </>
                ) : (
                  <>
                    <strong>Messaging unavailable.</strong>
                    <span>You cannot send messages to this account.</span>
                  </>
                )}
              </div>
            </div>
            {blockState.blockedByMe && (
              <button
                type="button"
                className="ig-unblock-pill-btn"
                onClick={() => setUnblockModalOpen(true)}
              >
                Unblock
              </button>
            )}
          </div>
        ) : (
          <>
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
                disabled={!content.trim()}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </footer>

      {/* Block Confirmation Modal */}
      {blockModalOpen && other && (
        <div className="ig-modal-backdrop" onClick={() => !blocking && setBlockModalOpen(false)}>
          <div className="ig-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="ig-modal-icon-wrap ig-modal-icon-wrap--danger">
              <Ban size={28} />
            </div>
            <h3 className="ig-modal-title">Block {other.full_name}?</h3>
            <p className="ig-modal-desc">
              They will not be able to message you or see your online activity on Unigram. You can unblock them at any time.
            </p>
            <div className="ig-modal-actions">
              <button
                type="button"
                className="ig-modal-btn ig-modal-btn--cancel"
                disabled={blocking}
                onClick={() => setBlockModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ig-modal-btn ig-modal-btn--danger"
                disabled={blocking}
                onClick={handleBlockUser}
              >
                {blocking ? 'Blocking…' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Confirmation Modal */}
      {unblockModalOpen && other && (
        <div className="ig-modal-backdrop" onClick={() => !blocking && setUnblockModalOpen(false)}>
          <div className="ig-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="ig-modal-icon-wrap ig-modal-icon-wrap--accent">
              <ShieldCheck size={28} />
            </div>
            <h3 className="ig-modal-title">Unblock {other.full_name}?</h3>
            <p className="ig-modal-desc">
              They will be able to send you messages and see your profile again on Unigram.
            </p>
            <div className="ig-modal-actions">
              <button
                type="button"
                className="ig-modal-btn ig-modal-btn--cancel"
                disabled={blocking}
                onClick={() => setUnblockModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ig-modal-btn ig-modal-btn--primary"
                disabled={blocking}
                onClick={handleUnblockUser}
              >
                {blocking ? 'Unblocking…' : 'Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{igThreadStyles}</style>
    </div>
  )
}

const igThreadStyles = `
/* ─── Instagram Direct Precision Container ────────────────────────── */
.ig-thread-wrap {
  display: flex;
  flex-direction: column;
  height: var(--dm-thread-viewport-height, 100dvh);
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding-top: env(safe-area-inset-top, 0px);
  box-sizing: border-box;
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
  width: 44px;
  height: 44px;
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
  background: var(--bg-muted);
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
  background: var(--accent-light);
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
  color: var(--accent-text);
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
  background: var(--bg-subtle);
  animation: igPulse 1.4s infinite ease-in-out;
}
.ig-sk-lines {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ig-sk-line {
  background: var(--bg-subtle);
  border-radius: 4px;
  animation: igPulse 1.4s infinite ease-in-out;
}
.ig-sk-name { width: 110px; height: 14px; }
.ig-sk-sub  { width: 70px;  height: 11px; }
@keyframes igPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ─── Messages Canvas ──────────────────────────────────────────────── */
.ig-messages-canvas {
  flex: 1;
  min-height: 0;
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
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.ig-empty-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ig-empty-avatar span { font-size: 1.5rem; font-weight: 700; color: var(--accent-text); }
.ig-empty-state h3 { font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 3px; }
.ig-empty-state p { font-size: 0.8rem; color: var(--ink-muted); margin-bottom: 14px; }
.ig-empty-hint {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  background: var(--bg-muted);
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
  touch-action: pan-y;
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
  background: var(--bg-muted);
  color: var(--ink);
}
.pos-single.ig-bubble--other { border-radius: 20px; }
.pos-first.ig-bubble--other  { border-radius: 20px 20px 20px 4px; }
.pos-middle.ig-bubble--other { border-radius: 4px 20px 20px 4px; }
.pos-last.ig-bubble--other   { border-radius: 4px 20px 20px 20px; }

/* Sent Bubble (Instagram Signature Royal Blue/Indigo Gradient) */
.ig-bubble--own {
  background: linear-gradient(140deg, color-mix(in srgb, var(--accent) 70%, white), var(--accent));
  color: #382606;
  box-shadow: 0 1px 3px rgba(146, 96, 15, 0.14);
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
  border-radius: 9px;
  padding: 4px 9px;
  margin-bottom: 5px;
  font-size: 0.73rem;
  cursor: pointer;
  transition: opacity .15s ease;
}
.ig-quote-card:hover {
  opacity: 0.88;
}

.ig-quote-card--other {
  background: var(--accent-light);
  border-left: 2px solid var(--accent);
}
.ig-quote-card--other .ig-quote-sender {
  color: var(--accent-text);
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
  background: rgba(255, 255, 255, 0.48);
  border-left: 2px solid var(--accent-text);
}
.ig-quote-card--own .ig-quote-sender {
  color: var(--accent-text);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ig-quote-card--own .ig-quote-snippet {
  color: #55421f;
  margin-top: 1px;
}

.ig-quote-snippet {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.71rem;
}

/* ─── Compact Inline Timestamps & Seen Row ─────────────────────────── */
.ig-time-hint {
  font-size: 0.65rem;
  color: var(--ink-muted);
  margin-top: 2px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: igFadeIn 0.15s ease;
}
.ig-time-hint.is-own {
  text-align: right;
}
.ig-inline-reply {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--accent-text);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}
.ig-inline-reply:hover { color: var(--ink); }
.ig-sending-label {
  color: var(--accent-text);
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
  color: var(--accent-text);
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
    background: var(--bg-muted);
  }
}
@media (hover: none) {
  .ig-hover-reply {
    display: flex;
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .ig-hover-reply:focus-visible {
    position: static;
    width: 36px;
    height: 36px;
    overflow: visible;
    clip-path: none;
    opacity: 1;
    pointer-events: auto;
  }
}

/* Highlight Jump */
.thread-msg-highlight .ig-bubble {
  animation: igHighlight 1.8s ease-out;
}
@keyframes igHighlight {
  0%   { box-shadow: 0 0 0 3px var(--accent); }
  50%  { box-shadow: 0 0 0 6px var(--accent-ring); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* ─── Docked Reply Bar Above Composer ──────────────────────────────── */
.ig-composer-footer {
  padding: 6px 12px calc(6px + var(--dm-thread-safe-bottom, env(safe-area-inset-bottom, 0px)));
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
  background: var(--accent);
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.ig-docked-reply-close:hover {
  background: var(--bg-muted);
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
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-ring);
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--ink-muted);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-bottom: 0;
  opacity: 1;
  pointer-events: none;
  transform: scale(1);
  transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .15s ease;
}
.ig-capsule-send-btn.can-send {
  background: var(--accent);
  color: #382606;
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}
.ig-capsule-send-btn:focus-visible,
.ig-docked-reply-close:focus-visible,
.ig-inline-reply:focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 2px;
}
.ig-capsule-send-btn:not(:disabled):active {
  transform: scale(0.92);
}

/* ─── Header Options & Block Menu ──────────────────────────────────── */
.ig-header-actions {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.ig-options-btn {
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
  transition: background .12s ease;
}
.ig-options-btn:hover {
  background: var(--bg-muted);
}
.ig-options-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 60;
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.14), 0 8px 10px -6px rgba(0,0,0,0.08);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: igDropdownIn .16s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes igDropdownIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.ig-options-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 550;
  color: var(--ink);
  text-decoration: none;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background .12s ease, color .12s ease;
}
.ig-options-item:hover {
  background: var(--bg-muted);
}
.ig-options-item--danger {
  color: #EF4444;
}
.ig-options-item--danger:hover {
  background: rgba(239, 68, 68, 0.08);
}
.ig-options-item--success {
  color: #10B981;
}
.ig-options-item--success:hover {
  background: rgba(16, 185, 129, 0.08);
}

/* ─── Blocked Composer Banner ──────────────────────────────────────── */
.ig-blocked-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface2, rgba(0,0,0,0.03));
  border: 1px solid var(--border);
  border-radius: 20px;
  min-height: 50px;
}
.ig-blocked-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.ig-blocked-icon {
  color: #EF4444;
  flex-shrink: 0;
}
.ig-blocked-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ig-blocked-meta strong {
  font-size: 0.84rem;
  color: var(--ink);
  font-weight: 700;
  line-height: 1.25;
}
.ig-blocked-meta span {
  font-size: 0.72rem;
  color: var(--ink-muted);
  line-height: 1.25;
}
.ig-unblock-pill-btn {
  padding: 6px 14px;
  border-radius: 99px;
  background: var(--accent);
  color: #382606;
  font-size: 0.78rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity .15s ease, transform .12s ease;
}
.ig-unblock-pill-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

/* ─── Modal Dialogs (Block / Unblock) ──────────────────────────────── */
.ig-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: igBackdropIn .18s ease-out;
}
@keyframes igBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.ig-modal-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  max-width: 380px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.25);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: igModalPop .2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes igModalPop {
  from { opacity: 0; transform: scale(0.93) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.ig-modal-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.ig-modal-icon-wrap--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #EF4444;
}
.ig-modal-icon-wrap--accent {
  background: var(--accent-light, rgba(212, 175, 55, 0.15));
  color: var(--accent-text, #92600F);
}
.ig-modal-title {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}
.ig-modal-desc {
  font-size: 0.84rem;
  color: var(--ink-muted);
  line-height: 1.5;
  margin-bottom: 22px;
}
.ig-modal-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}
.ig-modal-btn {
  flex: 1;
  padding: 11px 16px;
  border-radius: 13px;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s ease, transform .12s ease;
}
.ig-modal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ig-modal-btn--cancel {
  border: 1px solid var(--border);
  background: var(--surface2, rgba(0,0,0,0.05));
  color: var(--ink);
}
.ig-modal-btn--cancel:hover:not(:disabled) {
  background: var(--border);
}
.ig-modal-btn--danger {
  border: none;
  background: #EF4444;
  color: #FFFFFF;
}
.ig-modal-btn--danger:hover:not(:disabled) {
  opacity: 0.92;
}
.ig-modal-btn--primary {
  border: none;
  background: var(--accent);
  color: #382606;
}
.ig-modal-btn--primary:hover:not(:disabled) {
  opacity: 0.92;
}

`
