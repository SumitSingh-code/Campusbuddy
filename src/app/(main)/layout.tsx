'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, AuthProvider } from '@/lib/auth-context'

// ── Bottom nav icons ──────────────────────────────────────────────
function HomeIcon({ filled }: { filled?: boolean }) {
  return filled
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
}
function GhostIcon({ filled }: { filled?: boolean }) {
  return filled
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7v10l3-2 2 2 2-2 2 2 2-2 3 2V9a7 7 0 0 0-7-7zm-2 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" /></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10h.01M15 10h.01M12 2a7 7 0 0 0-7 7v10l3-2 2 2 2-2 2 2 2-2 3 2V9a7 7 0 0 0-7-7z" /></svg>
}
function ChatIcon({ filled }: { filled?: boolean }) {
  return filled
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}
function UserIcon({ filled }: { filled?: boolean }) {
  return filled
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function MoreIcon({ filled }: { filled?: boolean }) {
  return filled
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}

const NAV_ITEMS = [
  { href: '/feed',    label: 'Feed',    Icon: HomeIcon },
  { href: '/anon',    label: 'Anon',    Icon: GhostIcon },
  { href: '/dm',      label: 'DMs',     Icon: ChatIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon },
  { href: '/wall',    label: 'More',    Icon: MoreIcon },
]

// ── App Shell (requires AuthProvider above) ───────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const {
    isLoading, isLoggedIn, isActive,
    needsProfile, mustChangePassword, profile,
  } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn)           { router.replace('/login');                               return }
    if (needsProfile)          { router.replace('/signup?step=profile');                 return }
    if (mustChangePassword)    { router.replace('/change-password');                     return }
    if (profile?.status === 'pending' ||
        profile?.status === 'banned'  ||
        profile?.status === 'rejected') {
      router.replace('/pending?status=' + profile.status)
    }
  }, [isLoading, isLoggedIn, isActive, needsProfile, mustChangePassword, profile, router])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!isLoggedIn || !isActive) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Top nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(var(--surface-rgb, 22 27 34) / .85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', height: 52 }}>
          <Link href="/feed" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/icons/icon-192.png" alt="" width={26} height={26} style={{ borderRadius: 7 }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent)', letterSpacing: '-.02em' }}>
              Unigram
            </span>
          </Link>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80 }}>
        {children}
      </main>

      {/* ── Bottom nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ display: 'flex', maxWidth: 600, margin: '0 auto' }}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isAct = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 0',
                color: isAct ? 'var(--accent)' : 'var(--ink-subtle)',
                textDecoration: 'none', transition: 'color 0.15s',
                fontSize: 10, fontWeight: 600,
                fontFamily: 'var(--font-heading)',
              }}>
                <Icon filled={isAct} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ── Root layout export ────────────────────────────────────────────
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
