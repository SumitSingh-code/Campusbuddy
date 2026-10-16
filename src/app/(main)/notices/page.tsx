'use client'

import { useState, useEffect } from 'react'
import { Bell, Megaphone, Info, Plus, X, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/date'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Notice {
  id: string
  title: string
  content?: string
  body?: string
  category: string
  attachment_url?: string
  created_by: string
  poster_name?: string
  created_at: string
}

const CATEGORIES = ['General', 'Academic', 'Exam', 'Event', 'Administrative', 'Holiday']

export default function NoticesPage() {
  const { isAdmin } = useAuth()

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('All')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadNotices() }, [filterCat])

  async function loadNotices() {
    setLoading(true)
    try {
      const q = filterCat !== 'All' ? `?category=${encodeURIComponent(filterCat.toLowerCase())}` : ''
      const res = await api.get(`/notices${q}`)
      const raw = Array.isArray(res.data) ? res.data : []
      const mapped = raw.map((n: Notice) => ({
        ...n,
        content: n.content || n.body || '',
        poster_name: n.poster_name || 'Admin',
      }))
      setNotices(mapped)
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load notices')
    } finally {
      setLoading(false)
    }
  }

  async function handlePost() {
    if (!isAdmin) {
      toast.error('Only administrators can post notices.')
      return
    }
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }
    if (title.trim().length < 3) {
      toast.error('Title must be at least 3 characters')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/notices', {
        title: title.trim(),
        body: content.trim(),
        content: content.trim(),
        category: category.toLowerCase(),
      })
      const createdNotice = {
        ...res.data,
        content: res.data?.content || res.data?.body || content.trim(),
        poster_name: res.data?.poster_name || 'Admin',
      }
      setNotices(prev => [createdNotice, ...prev])
      setUploadOpen(false)
      setTitle('')
      setContent('')
      setCategory('General')
      toast.success('Notice posted successfully')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to post notice')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await api.delete(`/notices/${confirmDelete}`)
      setNotices(prev => prev.filter(n => n.id !== confirmDelete))
      toast.success('Notice deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  function getCategoryIcon(cat: string) {
    const c = (cat || '').toLowerCase()
    const map: Record<string, string> = {
      general: '📢',
      academic: '📚',
      admission: '🎓',
      exam: '📝',
      event: '🎉',
      administrative: '🏛️',
      holiday: '🏖️',
      other: '📌',
    }
    return map[c] || '📢'
  }

  return (
    <div className="notices-page">
      {/* Header */}
      <div className="notices-header">
        <h1 className="notices-title">📢 Notices</h1>
        {isAdmin && (
          <button className="notices-post-btn" onClick={() => setUploadOpen(true)}>
            <Plus size={15} /> Post
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="notices-filters">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            className={`notices-chip${filterCat === cat ? ' active' : ''}`}
            onClick={() => setFilterCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="notices-loading">
          {[...Array(3)].map((_, i) => <div key={i} className="notices-skeleton skeleton-pulse" />)}
        </div>
      ) : notices.length === 0 ? (
        <div className="notices-empty">
          <Bell size={36} strokeWidth={1.2} />
          <p>No notices yet</p>
        </div>
      ) : (
        <div className="notices-list">
          {notices.map(notice => (
            <div key={notice.id} className="notice-card">
              <div className="notice-top">
                <span className="notice-cat-icon">{getCategoryIcon(notice.category)}</span>
                <div className="notice-meta-wrap">
                  <span className="notice-cat-badge">
                    {notice.category ? (notice.category.charAt(0).toUpperCase() + notice.category.slice(1)) : 'General'}
                  </span>
                  <span className="notice-time">{timeAgo(notice.created_at)}</span>
                </div>
                {isAdmin && (
                  <button className="notice-delete-btn" onClick={() => setConfirmDelete(notice.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <h2 className="notice-title">{notice.title}</h2>
              <p
                className={`notice-content${expanded === notice.id ? ' expanded' : ''}`}
                onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}
              >
                {notice.content || notice.body || ''}
              </p>
              {(notice.content || notice.body || '').length > 120 && (
                <button className="notice-read-more" onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}>
                  {expanded === notice.id ? 'Show less' : 'Read more'}
                </button>
              )}
              {notice.attachment_url && (
                <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" className="notice-attachment">
                  📎 View Attachment
                </a>
              )}
              <div className="notice-poster">Posted by {notice.poster_name || 'Admin'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Post Notice Sheet (admin only) */}
      {uploadOpen && isAdmin && (
        <div className="notices-overlay" onClick={e => { if (e.target === e.currentTarget) setUploadOpen(false) }}>
          <div className="notices-sheet">
            <div className="notices-sheet-handle" />
            <div className="notices-sheet-header">
              <h2 className="notices-sheet-title">Post Notice</h2>
              <button className="notices-sheet-close" onClick={() => setUploadOpen(false)}><X size={18} /></button>
            </div>
            <div className="notices-form">
              <label className="notices-label">Title *</label>
              <input className="notices-input" placeholder="Notice title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />

              <label className="notices-label">Category</label>
              <select className="notices-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>

              <label className="notices-label">Content *</label>
              <textarea className="notices-input notices-textarea" placeholder="Write the notice…" value={content} onChange={e => setContent(e.target.value)} rows={5} />

              <button className="notices-submit-btn" onClick={handlePost} disabled={saving}>
                {saving ? 'Posting…' : 'Post Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this notice?"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{noticesStyles}</style>
    </div>
  )
}

const noticesStyles = `
.notices-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.notices-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.notices-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.notices-post-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.notices-filters { display: flex; gap: .45rem; padding: .75rem 1rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.notices-filters::-webkit-scrollbar { display: none; }
.notices-chip { flex-shrink: 0; padding: .4rem .85rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .78rem; font-weight: 600; cursor: pointer; }
.notices-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.notices-loading { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.notices-skeleton { height: 110px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.notices-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.notices-empty p { font-size: .875rem; }

.notices-list { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.notice-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1rem; }
.notice-top { display: flex; align-items: center; gap: .5rem; margin-bottom: .65rem; }
.notice-cat-icon { font-size: 1.1rem; }
.notice-meta-wrap { flex: 1; display: flex; gap: .5rem; align-items: center; }
.notice-cat-badge { font-size: .7rem; font-weight: 600; background: var(--surface2); border-radius: 4px; padding: .15rem .45rem; color: var(--ink-muted); }
.notice-time { font-size: .7rem; color: var(--ink-muted); }
.notice-delete-btn { width: 28px; height: 28px; border: none; background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px; }

.notice-title { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .45rem; }
.notice-content { font-size: .8375rem; color: var(--ink-muted); line-height: 1.55; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; cursor: pointer; }
.notice-content.expanded { display: block; -webkit-line-clamp: unset; }
.notice-read-more { background: none; border: none; color: var(--accent); font-size: .78rem; font-weight: 600; cursor: pointer; padding: .2rem 0; }
.notice-attachment { display: inline-flex; align-items: center; gap: .35rem; font-size: .78rem; color: var(--accent); text-decoration: none; margin-top: .5rem; font-weight: 600; }
.notice-poster { font-size: .7rem; color: var(--ink-muted); margin-top: .65rem; }

/* Sheet */
.notices-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.notices-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; animation: ncIn .25s ease; }
@keyframes ncIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.notices-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.notices-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.notices-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.notices-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.notices-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.notices-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.notices-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.notices-input:focus { border-color: var(--accent); }
.notices-textarea { resize: none; }
.notices-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; }
.notices-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`
