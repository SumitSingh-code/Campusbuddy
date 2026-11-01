'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import PostCard, { type Post } from '@/components/PostCard'
import CommentsSheet from '@/components/CommentsSheet'
import ReportDialog from '@/components/ReportDialog'
import { toast } from 'sonner'
import { GoldenTick } from '@/components/ui/GoldenTick'
import { isGoldenVerified } from '@/lib/badges'

interface OtherProfile {
  id: string
  full_name: string
  roll_number: string
  department: string
  avatar_url?: string
  bio?: string
  karma: number
  posts_count: number
  notes_uploaded: number
  role: string
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<OtherProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState('')

  const [activeComments, setActiveComments] = useState<string | null>(null)
  const [activeReport, setActiveReport] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.get(`/profile/${userId}`)
        if (cancelled) return
        setProfile(res.data)
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message || 'User not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (!userId || !profile) return
    setPostsLoading(true)
    api.get(`/feed?author_id=${userId}`)
      .then(res => setPosts(res.data || []))
      .catch(() => {})
      .finally(() => setPostsLoading(false))
  }, [userId, profile])

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
      <div className="up-wrap">
        <div className="up-topbar">
          <button className="up-back" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <div className="up-topbar-skeleton skeleton-pulse" style={{ width: 120 }} />
        </div>
        <div className="up-cover-skeleton skeleton-pulse" />
        <div className="up-content">
          <div className="up-avatar-skeleton skeleton-pulse" />
          <div className="up-skeleton-line skeleton-pulse" style={{ width: '50%', marginTop: '.5rem' }} />
          <div className="up-skeleton-line skeleton-pulse" style={{ width: '30%' }} />
        </div>
        <style>{upStyles}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="up-wrap">
        <div className="up-topbar">
          <button className="up-back" onClick={() => router.back()}><ArrowLeft size={20} /></button>
          <span className="up-topbar-title">Profile</span>
        </div>
        <div className="up-error">{error}</div>
        <style>{upStyles}</style>
      </div>
    )
  }

  return (
    <div className="up-wrap">
      {/* Topbar */}
      <div className="up-topbar">
        <button className="up-back" onClick={() => router.back()}><ArrowLeft size={20} /></button>
        <span className="up-topbar-title">{profile?.full_name || 'Profile'}</span>
      </div>

      {/* Cover */}
      <div className="up-cover" />

      {/* Content */}
      <div className="up-content">
        <div className="up-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name} className="up-avatar-img" />
            : <span className="up-avatar-initials">{profile ? getInitials(profile.full_name) : '?'}</span>
          }
        </div>
        <div className="up-name-row">
          <h1 className="up-name">{profile?.full_name}</h1>
          {isGoldenVerified(profile) && (
            <GoldenTick size={20} title="Haryana Day Early Bird Pioneer · Golden Badge" />
          )}
          {profile?.role && getRoleBadge(profile.role) && (
            <span className="up-role-badge">{getRoleBadge(profile.role)}</span>
          )}
        </div>
        {isGoldenVerified(profile) && (
          <div style={{ marginTop: '0.35rem', marginBottom: '0.25rem' }}>
            <GoldenTick showLabel label="Early Bird Pioneer 🌟" size={14} />
          </div>
        )}
        <div className="up-roll">{profile?.roll_number} · {profile?.department}</div>
        {profile?.bio && <p className="up-bio">{profile.bio}</p>}

        {/* Stats */}
        <div className="up-stats">
          <div className="up-stat">
            <div className="up-stat-value">{profile?.posts_count ?? 0}</div>
            <div className="up-stat-label">Posts</div>
          </div>
          <div className="up-stat-divider" />
          <div className="up-stat">
            <div className="up-stat-value">{profile?.karma ?? 0}</div>
            <div className="up-stat-label">Karma</div>
          </div>
          <div className="up-stat-divider" />
          <div className="up-stat">
            <div className="up-stat-value">{profile?.notes_uploaded ?? 0}</div>
            <div className="up-stat-label">Notes</div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="up-posts-header">
        <BookOpen size={14} /> <span>Posts</span>
      </div>
      {postsLoading ? (
        <div className="up-loading"><div className="up-spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="up-empty">No posts yet</div>
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
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {activeComments && (
        <CommentsSheet postId={activeComments} onClose={() => setActiveComments(null)} />
      )}
      {activeReport && (
        <ReportDialog postId={activeReport} onClose={() => setActiveReport(null)} />
      )}

      <style>{upStyles}</style>
    </div>
  )
}

const upStyles = `
.up-wrap { max-width: 600px; margin: 0 auto; }
.up-topbar {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem 1rem;
  background: var(--bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 52px; z-index: 10;
}
.up-back { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.up-topbar-title { font-size: .9375rem; font-weight: 700; color: var(--ink); }
.up-topbar-skeleton { height: 16px; border-radius: 6px; }

.up-cover { height: 140px; background: linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%); }
.up-cover-skeleton { height: 140px; }

.up-content { padding: 0 1rem 1rem; }
.up-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  border: 3px solid var(--bg); background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; margin-top: -36px;
}
.up-avatar-img { width: 72px; height: 72px; object-fit: cover; }
.up-avatar-initials { font-size: 1.35rem; font-weight: 800; color: var(--accent); }
.up-avatar-skeleton { width: 72px; height: 72px; border-radius: 50%; margin-top: -36px; }

.up-name-row { display: flex; align-items: center; gap: .5rem; margin-top: .65rem; flex-wrap: wrap; }
.up-name { font-size: 1.15rem; font-weight: 800; color: var(--ink); margin: 0; }
.up-role-badge { font-size: .7rem; font-weight: 600; background: rgba(212,175,55,.15); color: var(--accent); border-radius: 6px; padding: .2rem .5rem; }
.up-roll { font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }
.up-bio { font-size: .875rem; color: var(--ink-muted); margin: .5rem 0 0; line-height: 1.55; }

.up-stats { display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: .85rem 0; margin-top: 1rem; }
.up-stat { flex: 1; text-align: center; }
.up-stat-value { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.up-stat-label { font-size: .7rem; color: var(--ink-muted); margin-top: .1rem; }
.up-stat-divider { width: 1px; height: 32px; background: var(--border); }

.up-skeleton-line { height: 14px; border-radius: 6px; margin: .4rem 0; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.up-posts-header { display: flex; align-items: center; gap: .45rem; padding: .75rem 1rem .5rem; font-size: .8125rem; font-weight: 700; color: var(--ink-muted); border-top: 1px solid var(--border); }
.up-loading { display: flex; justify-content: center; padding: 2rem; }
.up-empty { text-align: center; padding: 2.5rem 1rem; color: var(--ink-muted); font-size: .875rem; }
.up-error { padding: 3rem 1rem; text-align: center; color: var(--danger); }
.up-spinner { width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
`
