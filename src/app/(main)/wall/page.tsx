'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  FileText, Clock, Search, BookOpen, Bell,
  Bookmark, MessageCircle, Settings, User
} from 'lucide-react'

const FEATURES = [
  { href: '/pyq',           icon: FileText,       label: 'PYQ Papers',    desc: 'Previous year question papers', color: '#6B55E8' },
  { href: '/timetable',     icon: Clock,          label: 'Timetable',     desc: 'Your class schedule',           color: '#2196F3' },
  { href: '/lost-found',    icon: Search,         label: 'Lost & Found',  desc: 'Lost something? Find it here',  color: '#FF9800' },
  { href: '/notes',         icon: BookOpen,       label: 'Study Notes',   desc: 'Shared notes repository',       color: '#4CAF50' },
  { href: '/notices',       icon: Bell,           label: 'Notices',       desc: 'Official department notices',   color: '#E91E63' },
  { href: '/bookmarks',     icon: Bookmark,       label: 'Bookmarks',     desc: 'Your saved posts',              color: '#D4AF37' },
  { href: '/notifications', icon: MessageCircle,  label: 'Notifications', desc: 'Activity & alerts',             color: '#00BCD4' },
  { href: '/settings',      icon: Settings,       label: 'Settings',      desc: 'App preferences & account',    color: 'var(--ink-muted)' },
]

export default function WallPage() {
  const { profile } = useAuth()

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ padding: '0.5rem 0 1.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>More</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', margin: '0.2rem 0 0' }}>All features in one place</p>
      </div>

      {/* Quick profile strip */}
      {profile && (
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', marginBottom: '1.25rem', textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem' }}>{profile.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem' }}>{profile.full_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{profile.roll_number} · {profile.department}</div>
          </div>
          <User size={16} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
        </Link>
      )}

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {FEATURES.map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.6rem',
              padding: '1rem', background: 'var(--surface)',
              borderRadius: 14, border: '1px solid var(--border)',
              textDecoration: 'none', transition: 'background 0.12s',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: '0.1rem', lineHeight: 1.4 }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem 0 1rem', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
        Unigram · CRSU Jind · Independent student platform
      </div>
    </div>
  )
}
