'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Check, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { compressImage } from '@/lib/image'
import { uploadToStorage } from '@/lib/storage'
import { timeAgo } from '@/lib/date'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface LostItem {
  id: string
  type: 'lost' | 'found'
  title: string
  description: string
  location: string
  image_url?: string
  contact_info?: string
  is_resolved: boolean
  posted_by: string
  poster_name?: string
  poster_avatar?: string
  created_at: string
}

export default function LostFoundPage() {
  const { user, isAdmin } = useAuth()
  const [items, setItems] = useState<LostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all')

  const [postOpen, setPostOpen] = useState(false)
  const [type, setType] = useState<'lost' | 'found'>('lost')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadItems() }, [filterType])

  async function loadItems() {
    setLoading(true)
    try {
      const q = filterType !== 'all' ? `?type=${filterType}` : ''
      const res = await api.get(`/lost-found${q}`)
      setItems(res.data || [])
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handlePost() {
    if (!title.trim() || !description.trim() || !location.trim()) {
      toast.error('Title, description and location are required')
      return
    }
    setSaving(true)
    try {
      let imageUrl: string | undefined
      if (image) {
        const compressed = await compressImage(image, 800, 300)
        imageUrl = await uploadToStorage(compressed, `lost-found/${user!.id}/${Date.now()}.jpg`)
      }
      const res = await api.post('/lost-found', {
        type, title: title.trim(), description: description.trim(),
        location: location.trim(), contact_info: contactInfo.trim() || null,
        image_url: imageUrl || null,
      })
      setItems(prev => [res.data, ...prev])
      setPostOpen(false)
      setTitle(''); setDescription(''); setLocation(''); setContactInfo(''); setImage(null); setImagePreview(null)
      toast.success('Posted successfully')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Post failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkFound(item: LostItem) {
    try {
      await api.patch(`/lost-found/${item.id}`, { is_resolved: true })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_resolved: true } : i))
      toast.success('Marked as resolved')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await api.delete(`/lost-found/${confirmDelete}`)
      setItems(prev => prev.filter(i => i.id !== confirmDelete))
      toast.success('Post deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="lf-page">
      {/* Header */}
      <div className="lf-header">
        <h1 className="lf-title">🔍 Lost &amp; Found</h1>
        <button className="lf-post-btn" onClick={() => setPostOpen(true)}><Plus size={15} /> Post</button>
      </div>

      {/* Filter */}
      <div className="lf-filters">
        {(['all', 'lost', 'found'] as const).map(t => (
          <button key={t} className={`lf-chip${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
            {t === 'all' ? 'All' : t === 'lost' ? '😟 Lost' : '🎉 Found'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="lf-loading">
          {[...Array(3)].map((_, i) => <div key={i} className="lf-skeleton skeleton-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="lf-empty">
          <Search size={36} strokeWidth={1.2} />
          <p>No items posted yet</p>
          <button className="lf-post-btn" onClick={() => setPostOpen(true)}>Post first item</button>
        </div>
      ) : (
        <div className="lf-list">
          {items.map(item => (
            <div key={item.id} className={`lf-card${item.is_resolved ? ' lf-card--resolved' : ''}`}>
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="lf-card-image" />
              )}
              <div className="lf-card-body">
                <div className="lf-card-top">
                  <span className={`lf-type-badge lf-type-badge--${item.type}`}>
                    {item.type === 'lost' ? '😟 Lost' : '🎉 Found'}
                  </span>
                  {item.is_resolved && <span className="lf-resolved-badge">✅ Resolved</span>}
                </div>
                <h2 className="lf-card-title">{item.title}</h2>
                <p className="lf-card-desc">{item.description}</p>
                <div className="lf-card-loc">📍 {item.location}</div>
                {item.contact_info && <div className="lf-card-contact">📞 {item.contact_info}</div>}

                <div className="lf-card-footer">
                  <div className="lf-card-poster">
                    <div className="lf-poster-avatar">
                      {item.poster_avatar
                        ? <img src={item.poster_avatar} alt="" className="lf-poster-avatar-img" />
                        : <span>{getInitials(item.poster_name || '?')}</span>
                      }
                    </div>
                    <div>
                      <div className="lf-poster-name">{item.poster_name || 'Anonymous'}</div>
                      <div className="lf-poster-time">{timeAgo(item.created_at)}</div>
                    </div>
                  </div>
                  <div className="lf-card-actions">
                    {item.posted_by === user?.id && !item.is_resolved && (
                      <button className="lf-resolve-btn" onClick={() => handleMarkFound(item)}>
                        <Check size={14} /> Resolve
                      </button>
                    )}
                    {(item.posted_by === user?.id || isAdmin) && (
                      <button className="lf-delete-btn" onClick={() => setConfirmDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Sheet */}
      {postOpen && (
        <div className="lf-overlay" onClick={e => { if (e.target === e.currentTarget) setPostOpen(false) }}>
          <div className="lf-sheet">
            <div className="lf-sheet-handle" />
            <div className="lf-sheet-header">
              <h2 className="lf-sheet-title">Post Item</h2>
              <button className="lf-sheet-close" onClick={() => setPostOpen(false)}><X size={18} /></button>
            </div>
            <div className="lf-form">
              <label className="lf-label">Type</label>
              <div className="lf-type-toggle">
                <button className={`lf-type-btn${type === 'lost' ? ' active' : ''}`} onClick={() => setType('lost')}>😟 Lost</button>
                <button className={`lf-type-btn${type === 'found' ? ' active' : ''}`} onClick={() => setType('found')}>🎉 Found</button>
              </div>

              <label className="lf-label">Title *</label>
              <input className="lf-input" placeholder="e.g. Blue backpack, ID card" value={title} onChange={e => setTitle(e.target.value)} />

              <label className="lf-label">Description *</label>
              <textarea className="lf-input lf-textarea" placeholder="Describe the item, identifying features…" value={description} onChange={e => setDescription(e.target.value)} rows={3} />

              <label className="lf-label">Location *</label>
              <input className="lf-input" placeholder="e.g. Near library, Hostel block B" value={location} onChange={e => setLocation(e.target.value)} />

              <label className="lf-label">Contact Info (optional)</label>
              <input className="lf-input" placeholder="Phone or social media handle" value={contactInfo} onChange={e => setContactInfo(e.target.value)} />

              <label className="lf-label">Photo (optional)</label>
              {imagePreview ? (
                <div className="lf-image-preview">
                  <img src={imagePreview} alt="preview" className="lf-preview-img" />
                  <button className="lf-remove-img" onClick={() => { setImage(null); setImagePreview(null) }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="lf-file-area" onClick={() => imageInputRef.current?.click()}>
                  <Plus size={20} /> <span>Add photo</span>
                </div>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />

              <button className="lf-submit-btn" onClick={handlePost} disabled={saving}>
                {saving ? 'Posting…' : 'Post Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this lost &amp; found post?"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{lfStyles}</style>
    </div>
  )
}

const lfStyles = `
.lf-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.lf-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.lf-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.lf-post-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.lf-filters { display: flex; gap: .45rem; padding: .75rem 1rem; }
.lf-chip { padding: .4rem .85rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .78rem; font-weight: 600; cursor: pointer; }
.lf-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.lf-loading { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.lf-skeleton { height: 140px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.lf-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.lf-empty p { font-size: .875rem; }

.lf-list { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.lf-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.lf-card--resolved { opacity: .7; }
.lf-card-image { width: 100%; height: 180px; object-fit: cover; }
.lf-card-body { padding: .9rem; }
.lf-card-top { display: flex; gap: .5rem; margin-bottom: .6rem; align-items: center; }
.lf-type-badge { font-size: .72rem; font-weight: 700; border-radius: 99px; padding: .2rem .65rem; }
.lf-type-badge--lost { background: rgba(232,93,78,.12); color: #E85D4E; }
.lf-type-badge--found { background: rgba(80,200,120,.12); color: #50C878; }
.lf-resolved-badge { font-size: .72rem; font-weight: 600; background: var(--surface2); border-radius: 99px; padding: .2rem .65rem; color: var(--ink-muted); }
.lf-card-title { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .4rem; }
.lf-card-desc { font-size: .8375rem; color: var(--ink-muted); line-height: 1.5; margin: 0 0 .5rem; }
.lf-card-loc, .lf-card-contact { font-size: .78rem; color: var(--ink-muted); margin-bottom: .2rem; }
.lf-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: .75rem; }
.lf-card-poster { display: flex; align-items: center; gap: .5rem; }
.lf-poster-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: 700; color: var(--accent); overflow: hidden; }
.lf-poster-avatar-img { width: 28px; height: 28px; object-fit: cover; }
.lf-poster-name { font-size: .78rem; font-weight: 600; color: var(--ink); }
.lf-poster-time { font-size: .7rem; color: var(--ink-muted); }
.lf-card-actions { display: flex; gap: .4rem; }
.lf-resolve-btn { display: flex; align-items: center; gap: .3rem; padding: .35rem .75rem; border: 1.5px solid #50C878; color: #50C878; background: transparent; border-radius: 7px; font-size: .75rem; font-weight: 600; cursor: pointer; }
.lf-delete-btn { width: 30px; height: 30px; border: 1px solid var(--border); background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 7px; }

/* Sheet */
.lf-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.lf-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; max-height: 90dvh; overflow-y: auto; animation: lfIn .25s ease; }
@keyframes lfIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.lf-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.lf-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.lf-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.lf-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.lf-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.lf-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.lf-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.lf-input:focus { border-color: var(--accent); }
.lf-textarea { resize: none; }
.lf-type-toggle { display: flex; gap: .5rem; }
.lf-type-btn { flex: 1; padding: .6rem; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); border-radius: 10px; font-size: .875rem; font-weight: 600; cursor: pointer; }
.lf-type-btn.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }
.lf-file-area { border: 2px dashed var(--border); border-radius: 12px; padding: 1.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .5rem; color: var(--ink-muted); font-size: .875rem; }
.lf-image-preview { position: relative; display: inline-block; }
.lf-preview-img { width: 100%; height: 140px; object-fit: cover; border-radius: 10px; }
.lf-remove-img { position: absolute; top: .4rem; right: .4rem; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,.6); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.lf-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; margin-top: .25rem; }
.lf-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`
