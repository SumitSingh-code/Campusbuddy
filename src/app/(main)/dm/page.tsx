'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, MessageCircle, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/date'
import { toast } from 'sonner'
import { isPushSupported, enablePushNotifications } from '@/lib/push-client'
import { GoldenTick } from '@/components/ui/GoldenTick'
import { isGoldenVerified } from '@/lib/badges'

interface Conversation {
  id: string
  other_user: {
    id: string
    full_name: string
    avatar_url?: string
    department?: string
    roll_number?: string
  }
  last_message?: string | {
    content?: string
    created_at?: string
    sender_id?: string
  } | null
  last_message_at?: string | null
  is_last_mine?: boolean
  unread_count: number
  updated_at?: string
}

interface SearchUser {
  id: string
  full_name: string
  avatar_url?: string
  department?: string
  roll_number?: string
}

export default function DMPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [showPushPrompt, setShowPushPrompt] = useState(false)

  useEffect(() => {
    if (!isPushSupported() || typeof window === 'undefined') return
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('unigram_dm_push_prompt_dismissed')
      if (!dismissed || Date.now() - parseInt(dismissed, 10) > 7 * 24 * 60 * 60 * 1000) {
        setShowPushPrompt(true)
      }
    }
  }, [])

  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/dm/conversations')
      setConversations(res.data || [])
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Search users
  useEffect(() => {
    if (!showSearch) return
    if (!searchQ.trim()) {
      setSearchResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get(`/dm/search?q=${encodeURIComponent(searchQ.trim())}`)
        setSearchResults((res.data || []).filter((u: SearchUser) => u.id !== user?.id))
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQ, showSearch, user?.id])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 120)
  }, [showSearch])

  async function startConversation(otherUserId: string) {
    setStarting(otherUserId)
    try {
      const res = await api.post('/dm/conversations', { recipient_id: otherUserId, message: '👋' })
      const convId = res.data?.conversation_id
      if (!convId) throw new Error('No conversation ID returned')
      router.push(`/dm/${convId}`)
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to start conversation')
      setStarting(null)
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="dm-page">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="dm-skeleton-row">
            <div className="dm-skeleton-avatar skeleton-pulse" />
            <div className="dm-skeleton-lines">
              <div className="dm-skeleton-line skeleton-pulse" style={{ width: '60%' }} />
              <div className="dm-skeleton-line skeleton-pulse" style={{ width: '40%', height: '12px' }} />
            </div>
          </div>
        ))}
        <style>{dmStyles}</style>
      </div>
    )
  }

  return (
    <div className="dm-page">
      {/* Header */}
      <div className="dm-header">
        <h1 className="dm-title">Messages</h1>
        <button className="dm-new-btn" onClick={() => setShowSearch(true)} aria-label="New message">
          <Plus size={20} />
        </button>
      </div>

      {/* Push notification banner for DMs */}
      {showPushPrompt && (
        <div style={{
          margin: '0.25rem 1rem 0.85rem',
          padding: '0.65rem 0.85rem',
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.22)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: '1.15rem' }}>🔔</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink)', lineHeight: 1.35 }}>
              <strong style={{ display: 'block', fontWeight: 700 }}>Enable chat notifications</strong>
              <span style={{ color: 'var(--ink-muted)' }}>Get notified on your lock screen when friends reply</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={async () => {
                const res = await enablePushNotifications()
                if (res.granted) {
                  setShowPushPrompt(false)
                  toast.success('Chat alerts active! 📲')
                } else if (res.error) {
                  toast.error(res.error)
                }
              }}
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 9,
                padding: '0.38rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Turn on
            </button>
            <button
              onClick={() => {
                setShowPushPrompt(false)
                localStorage.setItem('unigram_dm_push_prompt_dismissed', Date.now().toString())
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '0.85rem',
              }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Conversation list */}
      {error ? (
        <div className="dm-error">{error}</div>
      ) : conversations.length === 0 ? (
        <div className="dm-empty">
          <MessageCircle size={40} strokeWidth={1.2} />
          <p>No conversations yet</p>
          <button className="dm-start-btn" onClick={() => setShowSearch(true)}>
            Start a conversation
          </button>
        </div>
      ) : (
        <div className="dm-list">
          {conversations.map(conv => {
            const other = conv.other_user
            const isUnread = (conv.unread_count || 0) > 0

            // Extract last message text safely
            const rawText = typeof conv.last_message === 'string'
              ? conv.last_message
              : (typeof conv.last_message === 'object' && conv.last_message !== null ? conv.last_message.content : '')

            const isMine = typeof conv.is_last_mine === 'boolean'
              ? conv.is_last_mine
              : (typeof conv.last_message === 'object' && conv.last_message !== null && conv.last_message.sender_id === user?.id)

            const msgTime = conv.last_message_at || (typeof conv.last_message === 'object' && conv.last_message !== null ? conv.last_message.created_at : null)

            return (
              <button
                key={conv.id}
                className={`dm-row${isUnread ? ' dm-row--unread' : ''}`}
                onClick={() => router.push(`/dm/${conv.id}`)}
              >
                <div className="dm-avatar">
                  {other.avatar_url
                    ? <img src={other.avatar_url} alt={other.full_name} className="dm-avatar-img" />
                    : <span className="dm-avatar-initials">{getInitials(other.full_name)}</span>
                  }
                  {isUnread && <span className="dm-unread-dot" />}
                </div>
                <div className="dm-row-content">
                  <div className="dm-row-top">
                    <div className="dm-row-name-wrap">
                      <span className="dm-row-name">{other.full_name}</span>
                      {isGoldenVerified(other) && (
                        <GoldenTick size={14} title="Haryana Day Early Bird Pioneer · Golden Badge" />
                      )}
                      {other.department && (
                        <span className="dm-row-dept-badge" title={other.department}>
                          {other.department}
                        </span>
                      )}
                    </div>
                    {msgTime && (
                      <span className={`dm-row-time${isUnread ? ' dm-row-time--unread' : ''}`}>
                        {timeAgo(msgTime)}
                      </span>
                    )}
                  </div>
                  <div className="dm-row-bottom">
                    <div className={`dm-row-preview${isUnread ? ' dm-row-preview--unread' : ''}`}>
                      {rawText ? (
                        <>
                          {isMine && <span className="dm-row-you">You: </span>}
                          <span>{rawText}</span>
                        </>
                      ) : (
                        <span className="dm-row-empty">No messages yet</span>
                      )}
                    </div>
                    {isUnread && conv.unread_count > 0 && (
                      <span className="dm-unread-badge">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* New Conversation Search Sheet */}
      {showSearch && (
        <div className="dm-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSearch(false) }}>
          <div className="dm-sheet">
            <div className="dm-sheet-handle" />
            <div className="dm-sheet-header">
              <h2 className="dm-sheet-title">New Message</h2>
              <button className="dm-sheet-close" onClick={() => setShowSearch(false)}><X size={18} /></button>
            </div>
            <div className="dm-search-wrap">
              <Search size={16} className="dm-search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="dm-search-input"
                placeholder="Search by name or roll number…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
              {searchQ && <button className="dm-search-clear" onClick={() => setSearchQ('')}><X size={14} /></button>}
            </div>
            <div className="dm-search-results">
              {searching && <div className="dm-search-loading">Searching…</div>}
              {!searching && searchQ && searchResults.length === 0 && (
                <div className="dm-search-empty">No students found</div>
              )}
              {!searching && searchResults.map(u => (
                <button
                  key={u.id}
                  className="dm-search-row"
                  onClick={() => startConversation(u.id)}
                  disabled={starting === u.id}
                >
                  <div className="dm-search-avatar">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.full_name} className="dm-avatar-img" />
                      : <span className="dm-avatar-initials">{getInitials(u.full_name)}</span>
                    }
                  </div>
                  <div className="dm-search-info">
                    <div className="dm-search-name">{u.full_name}</div>
                    <div className="dm-search-meta">
                      {u.roll_number && <span>{u.roll_number}</span>}
                      {u.department && <span>{u.department}</span>}
                    </div>
                  </div>
                  {starting === u.id && <div className="dm-spinner" />}
                </button>
              ))}
              {!searchQ && (
                <div className="dm-search-hint">
                  <Search size={28} strokeWidth={1.2} />
                  <p>Search for a student to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{dmStyles}</style>
    </div>
  )
}

const dmStyles = `
.dm-page { max-width: 600px; margin: 0 auto; min-height: 100%; }

.dm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
  position: sticky; top: 52px; background: var(--bg); z-index: 10;
  border-bottom: 1px solid var(--border);
}
.dm-title { font-size: 1.125rem; font-weight: 700; color: var(--ink); }
.dm-new-btn {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: var(--accent); color: var(--bg); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s;
}
.dm-new-btn:active { opacity: .75; }

.dm-list { display: flex; flex-direction: column; }
.dm-row {
  display: flex; align-items: center; gap: .85rem;
  padding: .85rem 1rem; border: none; background: transparent;
  cursor: pointer; text-align: left; width: 100%;
  border-bottom: 1px solid var(--border); transition: background .12s;
}
.dm-row:active, .dm-row:hover { background: var(--surface); }
.dm-row--unread { background: rgba(var(--accent-rgb, 212,175,55),.05); }

.dm-avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  position: relative; background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
}
.dm-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.dm-avatar-initials { font-size: .95rem; font-weight: 700; color: var(--accent); }
.dm-unread-dot {
  position: absolute; top: 1px; right: 1px;
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--accent); border: 2px solid var(--surface);
}

.dm-row-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dm-row-top { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.dm-row-name-wrap { display: flex; align-items: center; gap: .45rem; min-width: 0; flex: 1; overflow: hidden; }
.dm-row-name { font-weight: 700; font-size: .925rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-row-dept-badge {
  font-size: .66rem; font-weight: 500; padding: 1px 6px; border-radius: 9999px;
  background: #F1F3F5; color: #596273; border: 1px solid #E5E7EB;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
  flex-shrink: 1; line-height: 1.25;
}
.dm-row-time { font-size: .72rem; color: var(--ink-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.dm-row-time--unread { color: var(--accent); font-weight: 600; }

.dm-row-bottom { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.dm-row-preview {
  font-size: .8125rem; color: var(--ink-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}
.dm-row-preview--unread { font-weight: 600; color: var(--ink); }
.dm-row-you { color: var(--ink); font-weight: 600; opacity: .8; }
.dm-row-empty { font-style: italic; color: var(--ink-muted); opacity: .7; }

.dm-unread-badge {
  background: var(--accent); color: var(--bg);
  font-size: .68rem; font-weight: 700; border-radius: 99px;
  padding: 1px 6px; min-width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.dm-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: .85rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center;
}
.dm-start-btn {
  background: var(--accent); color: var(--bg); border: none; border-radius: 10px;
  padding: .65rem 1.25rem; font-weight: 700; font-size: .875rem; cursor: pointer;
  margin-top: .5rem; transition: opacity .15s;
}
.dm-start-btn:active { opacity: .75; }
.dm-error { padding: 2rem 1rem; color: var(--danger); text-align: center; }

/* Skeletons */
.dm-skeleton-row { display: flex; gap: .85rem; padding: .85rem 1rem; border-bottom: 1px solid var(--border); }
.dm-skeleton-avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.dm-skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: .5rem; justify-content: center; }
.dm-skeleton-line { height: 14px; border-radius: 6px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* New conversation sheet */
.dm-sheet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  animation: dmsOverIn .2s ease;
}
@keyframes dmsOverIn { from{opacity:0} to{opacity:1} }
.dm-sheet {
  background: var(--surface); border-radius: 18px 18px 0 0;
  width: 100%; max-width: 600px;
  max-height: 80dvh; display: flex; flex-direction: column;
  animation: dmsIn .25s ease;
}
@keyframes dmsIn { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
.dm-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: var(--border); margin: .75rem auto .25rem;
}
.dm-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .5rem 1rem .75rem;
}
.dm-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.dm-sheet-close {
  width: 30px; height: 30px; border: none; border-radius: 50%;
  background: var(--surface2); color: var(--ink-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.dm-search-wrap {
  position: relative; margin: 0 1rem .75rem;
  display: flex; align-items: center;
  background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 0 .75rem;
}
.dm-search-icon { color: var(--ink-muted); flex-shrink: 0; }
.dm-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  padding: .7rem .5rem; font-size: .9rem; color: var(--ink);
}
.dm-search-clear { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 0; display: flex; }

.dm-search-results { flex: 1; overflow-y: auto; padding: 0 0 env(safe-area-inset-bottom, 1rem); }
.dm-search-loading, .dm-search-empty { padding: 1.5rem; text-align: center; color: var(--ink-muted); font-size: .875rem; }
.dm-search-hint { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2.5rem 1rem; color: var(--ink-muted); text-align: center; }
.dm-search-hint p { font-size: .875rem; }

.dm-search-row {
  display: flex; align-items: center; gap: .85rem;
  width: 100%; padding: .75rem 1rem;
  border: none; background: transparent; cursor: pointer;
  text-align: left; border-bottom: 1px solid var(--border);
  transition: background .12s;
}
.dm-search-row:active, .dm-search-row:hover { background: var(--surface2); }
.dm-search-row:disabled { opacity: .6; cursor: not-allowed; }
.dm-search-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dm-search-info { flex: 1; min-width: 0; }
.dm-search-name { font-weight: 600; font-size: .875rem; color: var(--ink); }
.dm-search-meta { display: flex; gap: .5rem; font-size: .75rem; color: var(--ink-muted); margin-top: .1rem; }

.dm-spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
`
