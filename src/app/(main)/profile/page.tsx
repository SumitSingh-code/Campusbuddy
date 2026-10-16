'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Settings, Edit3, Phone, BookOpen, X, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { compressImage } from '@/lib/image'
import { uploadToStorage } from '@/lib/storage'
import { timeAgo } from '@/lib/date'
import PostCard, { type Post } from '@/components/PostCard'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import EditPostDialog from '@/components/EditPostDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  full_name: string
  roll_number: string
  department: string
  phone_number?: string
  email?: string
  avatar_url?: string
  bio?: string
  karma: number
  posts_count: number
  notes_uploaded: number
  status: string
  role: string
}

export default function ProfilePage() {
  const { user, profile: authProfile, isAdmin } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Active sheet state
  const [activeComments, setActiveComments] = useState<string | null>(null)
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [activeEdit, setActiveEdit] = useState<Post | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Load profile
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profRes, configRes] = await Promise.all([
          api.get('/profile/me'),
          api.get('/config').catch(() => ({ data: null })),
        ])
        if (cancelled) return
        setProfile(profRes.data)
        setEditBio(profRes.data?.bio || '')
        setEditName(profRes.data?.full_name || '')
        if (configRes.data?.cover_url || configRes.data?.profile_cover_url) {
          setCoverUrl(configRes.data.cover_url || configRes.data.profile_cover_url)
        }
      } catch (e: unknown) {
        if (!cancelled) toast.error((e as Error).message || 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    // auto-open edit if redirected from settings
    if (typeof window !== 'undefined' && sessionStorage.getItem('profile_open_edit') === '1') {
      sessionStorage.removeItem('profile_open_edit')
      setEditOpen(true)
    }
    return () => { cancelled = true }
  }, [])

  // Load own posts
  useEffect(() => {
    if (!user) return
    setPostsLoading(true)
    api.get('/profile/me/posts')
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : []
        const fallback = {
          id: profile?.id || authProfile?.id || user.id,
          full_name: profile?.full_name || authProfile?.full_name || 'Student',
          department: profile?.department || authProfile?.department || '',
          avatar_url: profile?.avatar_url || authProfile?.avatar_url,
          role: profile?.role || authProfile?.role || 'student',
        }
        const enriched = raw.map((p: Post) => ({
          ...p,
          author: p.author?.full_name ? p.author : { ...fallback, ...p.author }
        }))
        setPosts(enriched)
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false))
  }, [user, profile?.id, profile?.full_name, profile?.avatar_url, profile?.department, authProfile])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(file, 400, 80)
      const url = await uploadToStorage(compressed, `avatars/${user.id}/${Date.now()}.jpg`)
      await api.patch('/profile/me', { avatar_url: url })
      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)
      setPosts(prev => prev.map(p => ({
        ...p,
        author: p.author ? { ...p.author, avatar_url: url } : p.author
      })))
      toast.success('Profile photo updated')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Upload failed')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  async function saveProfile() {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      await api.patch('/profile/me', { full_name: editName.trim(), bio: editBio.trim() || null })
      setProfile(prev => prev ? { ...prev, full_name: editName.trim(), bio: editBio.trim() || undefined } : prev)
      setPosts(prev => prev.map(p => ({
        ...p,
        author: p.author ? { ...p.author, full_name: editName.trim() } : p.author
      })))
      setEditOpen(false)
      toast.success('Profile updated')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Post actions
  const handleVote = useCallback(async (postId: string, dir: 1 | -1 | 0) => {
    try {
      const res = await api.post(`/feed/${postId}/vote`, { direction: dir })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...res.data } : p))
    } catch (e: unknown) { toast.error((e as Error).message) }
  }, [])

  const handleBookmark = useCallback(async (postId: string, current: boolean) => {
    try {
      if (current) await api.delete(`/bookmarks/${postId}`)
      else await api.post('/bookmarks', { post_id: postId })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: !current } : p))
    } catch (e: unknown) { toast.error((e as Error).message) }
  }, [])

  const handleDelete = useCallback(async (postId: string) => {
    setConfirmDelete(postId)
  }, [])

  const confirmDeletePost = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await api.delete(`/feed/${confirmDelete}`)
      setPosts(prev => prev.filter(p => p.id !== confirmDelete))
      toast.success('Post deleted')
    } catch (e: unknown) { toast.error((e as Error).message) }
    setConfirmDelete(null)
  }, [confirmDelete])

  const handleEditSaved = useCallback((updated: Post) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== updated.id) return p
      return {
        ...p,
        ...updated,
        author: updated.author || p.author,
      }
    }))
  }, [])

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }

  function getRoleBadge(role: string) {
    if (role === 'super_admin') return '👑 Super Admin'
    if (role === 'moderator') return '🛡️ Moderator'
    return null
  }

  if (loading) {
    return (
      <div className="prof-wrap">
        <div className="prof-cover-skeleton skeleton-pulse" />
        <div className="prof-content">
          <div className="prof-avatar-skeleton skeleton-pulse" />
          <div className="prof-skeleton-line skeleton-pulse" style={{ width: '50%', marginTop: '.5rem' }} />
          <div className="prof-skeleton-line skeleton-pulse" style={{ width: '30%' }} />
        </div>
        <style>{profileStyles}</style>
      </div>
    )
  }

  return (
    <div className="prof-wrap">
      {/* Cover */}
      <div className="prof-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}>
        <div className="prof-cover-overlay" />
        <div className="prof-topbar-actions">
          <button className="prof-icon-btn" onClick={() => router.push('/settings')} aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Avatar + info */}
      <div className="prof-content">
        <div className="prof-avatar-row">
          <div className="prof-avatar-wrap">
            <div className="prof-avatar">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} className="prof-avatar-img" />
                : <span className="prof-avatar-initials">{profile ? getInitials(profile.full_name) : '?'}</span>
              }
              {avatarUploading && <div className="prof-avatar-uploading"><div className="prof-spinner" /></div>}
            </div>
            <button
              className="prof-avatar-cam"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Change photo"
              disabled={avatarUploading}
            >
              <Camera size={14} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>
          <button className="prof-edit-btn" onClick={() => { setEditOpen(true) }}>
            <Edit3 size={14} /> Edit Profile
          </button>
        </div>

        <div className="prof-name-row">
          <h1 className="prof-name">{profile?.full_name}</h1>
          {profile?.role && getRoleBadge(profile.role) && (
            <span className="prof-role-badge">{getRoleBadge(profile.role)}</span>
          )}
        </div>
        <div className="prof-roll">{profile?.roll_number} · {profile?.department}</div>
        {profile?.bio && <p className="prof-bio">{profile.bio}</p>}
        {profile?.phone_number && (
          <div className="prof-phone">
            <Phone size={12} /> {profile.phone_number}
          </div>
        )}

        {/* Stats */}
        <div className="prof-stats">
          <div className="prof-stat">
            <div className="prof-stat-value">{profile?.posts_count ?? 0}</div>
            <div className="prof-stat-label">Posts</div>
          </div>
          <div className="prof-stat-divider" />
          <div className="prof-stat">
            <div className="prof-stat-value">{profile?.karma ?? 0}</div>
            <div className="prof-stat-label">Karma</div>
          </div>
          <div className="prof-stat-divider" />
          <div className="prof-stat">
            <div className="prof-stat-value">{profile?.notes_uploaded ?? 0}</div>
            <div className="prof-stat-label">Notes</div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="prof-posts-header">
        <BookOpen size={14} /> <span>Posts</span>
      </div>
      {postsLoading ? (
        <div className="prof-posts-loading"><div className="prof-spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="prof-empty">No posts yet</div>
      ) : (
        <div>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id || ''}
              isAdmin={isAdmin}
              onVote={handleVote}
              onBookmark={handleBookmark}
              onComment={() => setActiveComments(post.id)}
              onReport={() => setActiveReport(post.id)}
              onEdit={() => setActiveEdit(post)}
              onDelete={() => handleDelete(post.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Profile Sheet */}
      {editOpen && (
        <div className="prof-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}>
          <div className="prof-sheet">
            <div className="prof-sheet-handle" />
            <div className="prof-sheet-header">
              <h2 className="prof-sheet-title">Edit Profile</h2>
              <button className="prof-sheet-close" onClick={() => setEditOpen(false)}><X size={18} /></button>
            </div>
            <div className="prof-sheet-body">
              <label className="prof-field-label">Display Name</label>
              <input
                className="prof-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your full name"
                maxLength={100}
              />
              <label className="prof-field-label" style={{ marginTop: '.75rem' }}>Bio</label>
              <textarea
                className="prof-input prof-textarea"
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Write something about yourself…"
                maxLength={200}
                rows={3}
              />
              <div className="prof-char-count">{editBio.length}/200</div>
              <button className="prof-save-btn" onClick={saveProfile} disabled={saving}>
                {saving ? <div className="prof-spinner prof-spinner--sm" /> : <><Check size={15} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {activeComments && (
        <CommentsSheet postId={activeComments} onClose={() => setActiveComments(null)} />
      )}
      {activeReport && (
        <ReportDialog postId={activeReport} onClose={() => setActiveReport(null)} />
      )}
      {activeEdit && (
        <EditPostDialog
          post={activeEdit}
          onClose={() => setActiveEdit(null)}
          onSaved={handleEditSaved}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this post? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmDeletePost}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{profileStyles}</style>
    </div>
  )
}

const profileStyles = `
.prof-wrap { max-width: 600px; margin: 0 auto; }

/* Cover */
.prof-cover {
  height: 160px; background: var(--surface); background-size: cover; background-position: center;
  position: relative;
}
.prof-cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.1), rgba(0,0,0,.35));
}
.prof-cover-skeleton { height: 160px; }
.prof-topbar-actions { position: absolute; top: .75rem; right: .75rem; display: flex; gap: .5rem; }
.prof-icon-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(0,0,0,.4); backdrop-filter: blur(8px);
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.prof-content { padding: 0 1rem 1rem; position: relative; }
.prof-avatar-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: -40px; }
.prof-avatar-wrap { position: relative; }
.prof-avatar {
  width: 80px; height: 80px; border-radius: 50%;
  border: 3px solid var(--bg);
  background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative;
}
.prof-avatar-img { width: 80px; height: 80px; object-fit: cover; }
.prof-avatar-initials { font-size: 1.5rem; font-weight: 800; color: var(--accent); }
.prof-avatar-uploading {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; border-radius: 50%;
}
.prof-avatar-cam {
  position: absolute; bottom: 0; right: 0;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: var(--bg);
  border: 2px solid var(--bg);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: .65rem;
}
.prof-avatar-skeleton { width: 80px; height: 80px; border-radius: 50%; }

.prof-edit-btn {
  display: flex; align-items: center; gap: .4rem;
  padding: .5rem 1rem; border-radius: 8px;
  border: 1.5px solid var(--border);
  background: transparent; color: var(--ink);
  font-size: .8125rem; font-weight: 600; cursor: pointer;
  transition: background .12s;
}
.prof-edit-btn:hover { background: var(--surface); }

.prof-name-row { display: flex; align-items: center; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
.prof-name { font-size: 1.25rem; font-weight: 800; color: var(--ink); margin: 0; }
.prof-role-badge { font-size: .7rem; font-weight: 600; background: rgba(212,175,55,.15); color: var(--accent); border-radius: 6px; padding: .2rem .5rem; }
.prof-roll { font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }
.prof-bio { font-size: .875rem; color: var(--ink-muted); margin: .5rem 0 .25rem; line-height: 1.55; }
.prof-phone { display: flex; align-items: center; gap: .3rem; font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }

.prof-stats {
  display: flex; align-items: center;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: .85rem 0;
  margin-top: 1rem;
}
.prof-stat { flex: 1; text-align: center; }
.prof-stat-value { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.prof-stat-label { font-size: .7rem; color: var(--ink-muted); margin-top: .1rem; }
.prof-stat-divider { width: 1px; height: 32px; background: var(--border); }

.prof-skeleton-line { height: 14px; border-radius: 6px; margin: .4rem 0; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.prof-posts-header {
  display: flex; align-items: center; gap: .45rem;
  padding: .75rem 1rem .5rem;
  font-size: .8125rem; font-weight: 700; color: var(--ink-muted);
  border-top: 1px solid var(--border);
}
.prof-posts-loading { display: flex; justify-content: center; padding: 2rem; }
.prof-empty { text-align: center; padding: 2.5rem 1rem; color: var(--ink-muted); font-size: .875rem; }

.prof-spinner {
  width: 22px; height: 22px; border: 2px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin .7s linear infinite;
}
.prof-spinner--sm { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to{transform:rotate(360deg)} }

/* Edit sheet */
.prof-sheet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  animation: psOverIn .2s ease;
}
@keyframes psOverIn { from{opacity:0}to{opacity:1} }
.prof-sheet {
  background: var(--surface); border-radius: 18px 18px 0 0;
  width: 100%; max-width: 600px;
  animation: psIn .25s ease;
}
@keyframes psIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.prof-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.prof-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.prof-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.prof-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.prof-sheet-body { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); }
.prof-field-label { display: block; font-size: .78rem; font-weight: 600; color: var(--ink-muted); margin-bottom: .35rem; }
.prof-input {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 10px; padding: .65rem .85rem; font-size: .875rem;
  color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box;
  transition: border-color .15s;
}
.prof-input:focus { border-color: var(--accent); }
.prof-textarea { resize: none; }
.prof-char-count { font-size: .72rem; color: var(--ink-muted); text-align: right; margin-top: .2rem; }
.prof-save-btn {
  width: 100%; margin-top: 1.25rem; padding: .8rem;
  background: var(--accent); color: var(--bg);
  border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .4rem;
  transition: opacity .15s;
}
.prof-save-btn:disabled { opacity: .6; cursor: not-allowed; }
`
