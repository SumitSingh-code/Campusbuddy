'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, BookOpen, CalendarDays, ChevronRight, Compass, FileText,
  Home, MessageCircle, Plus, Search, ShieldCheck, UserRound, X,
} from 'lucide-react'
import { useAuth, AuthProvider } from '@/lib/auth-context'

const primaryLinks = [
  { href: '/feed', label: 'Home', Icon: Home },
  { href: '/more', label: 'Explore', Icon: Compass },
  { href: '/dm', label: 'Chats', Icon: MessageCircle },
  { href: '/profile', label: 'You', Icon: UserRound },
]

const campusLinks = [
  { href: '/anon', label: 'Anonymous', Icon: ShieldCheck },
  { href: '/notices', label: 'Bulletin', Icon: Bell },
  { href: '/notes', label: 'Study notes', Icon: BookOpen },
  { href: '/pyq', label: 'Past papers', Icon: FileText },
  { href: '/timetable', label: 'Timetable', Icon: CalendarDays },
]

const createActions = [
  { href: '/feed#composer', label: 'Public post', detail: 'Share with your campus', Icon: MessageCircle },
  { href: '/anon', label: 'Anonymous post', detail: 'Start a private-by-design discussion', Icon: ShieldCheck },
  { href: '/lost-found', label: 'Lost or found item', detail: 'Help something find its way home', Icon: Search },
  { href: '/notes', label: 'Upload study notes', detail: 'Add to the shared library', Icon: BookOpen },
]

function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isLoggedIn, isActive, needsProfile, mustChangePassword, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAnonRoute = pathname === '/anon'
  const [createOpen, setCreateOpen] = useState(false)
  const currentLink = [...primaryLinks, ...campusLinks].find(link =>
    link.href === '/feed' ? pathname === '/feed' : pathname === link.href || pathname.startsWith(link.href + '/')
  )
  const pageTitle = currentLink?.label || (pathname === '/more' ? 'Explore' : 'Campus')
  const initials = profile?.full_name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) { router.replace('/login'); return }
    if (needsProfile) { router.replace('/signup?step=profile'); return }
    if (mustChangePassword) { router.replace('/change-password'); return }
    if (profile?.status === 'pending' || profile?.status === 'banned' || profile?.status === 'rejected') {
      router.replace('/pending?status=' + profile.status)
    }
  }, [isLoading, isLoggedIn, isActive, needsProfile, mustChangePassword, profile, router])

  useEffect(() => {
    if (!createOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createOpen])

  if (isLoading) return <div className="app-loading"><div className="spinner" /></div>
  if (!isLoggedIn || !isActive) return null

  return (
    <div className="app-shell">
      <header className={`mobile-header${isAnonRoute ? ' anon-mobile-header' : ''}`}>
        <Link href="/feed" className="brand-lockup" aria-label="Unigram home">
          <img src="/icons/icon-192.png" alt="" width={30} height={30} />
          <span>unigram</span>
        </Link>
        <div className="mobile-header-actions">
          {isAnonRoute ? (
            <Link href="/profile" className="anon-mobile-profile" aria-label="Your profile">
              <span className="anon-mobile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}</span>
              <span className="anon-mobile-presence" aria-hidden="true" />
            </Link>
          ) : <><span className="mobile-page-title">{pageTitle}</span><Link href="/notifications" className="icon-control" aria-label="Notifications"><Bell size={20} /></Link></>}
        </div>
      </header>

      <div className="app-grid">
        <aside className="desktop-sidebar" aria-label="Main navigation">
          <Link href="/feed" className="brand-lockup sidebar-brand">
            <img src="/icons/icon-192.png" alt="" width={32} height={32} />
            <span>unigram</span>
          </Link>
          <button className="create-primary" aria-label="Create" onClick={() => setCreateOpen(true)}><Plus size={19} /> Create</button>
          <nav className="sidebar-nav">
            <span className="nav-section-label">Your campus</span>
            {primaryLinks.map(({ href, label, Icon }) => {
              const active = href === '/feed' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
              return <Link key={href} href={href} aria-label={label} className={`sidebar-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}><Icon size={19} strokeWidth={active ? 2.4 : 1.9} /><span>{label}</span></Link>
            })}
            <span className="nav-section-label nav-section-spaced">Campus spaces</span>
            {campusLinks.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return <Link key={href} href={href} aria-label={label} className={`sidebar-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}><Icon size={18} strokeWidth={active ? 2.4 : 1.9} /><span>{label}</span></Link>
            })}
          </nav>
          <Link href="/profile" className="sidebar-user">
            <span className="user-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}</span>
            <span className="sidebar-user-copy"><strong>{profile?.full_name || 'Your profile'}</strong><small>{profile?.department || 'CRSU student'}</small></span>
            <ChevronRight size={16} />
          </Link>
        </aside>

        <div className="mobile-header-spacer" />
        <main className="main-column">{children}</main>

        <aside className="context-sidebar" aria-label="Campus shortcuts">
          <div className="context-card campus-context">
            <div className="campus-context-mark"><span /></div>
            <h2>{profile?.university_name || 'CRSU Jind'}</h2>
            <p>Your campus, in the loop.</p>
            <Link href="/notices">Check the bulletin <ChevronRight size={15} /></Link>
          </div>
          <div className="context-links">
            <h2>Quick stops</h2>
            <Link href="/notices"><Bell size={17} /><span>Campus notices</span><ChevronRight size={15} /></Link>
            <Link href="/timetable"><CalendarDays size={17} /><span>Class timetable</span><ChevronRight size={15} /></Link>
            <Link href="/notes"><BookOpen size={17} /><span>Study library</span><ChevronRight size={15} /></Link>
          </div>
          <div className="context-footer"><Link href="/about">About</Link><Link href="/guidelines">Guidelines</Link><Link href="/settings">Settings</Link><span>Unigram · CRSU</span></div>
        </aside>
      </div>

      <nav className={`mobile-bottom-nav${isAnonRoute ? ' anon-context-nav' : ''}`} aria-label="Primary navigation">
        {isAnonRoute ? <>
          <Link href="/feed" aria-label="Feed"><Home size={19} /><span>Feed</span></Link>
          <Link href="/anon" className="is-active" aria-current="page"><ShieldCheck size={19} /><span>Anon</span></Link>
          <Link href="/dm" aria-label="DMs"><MessageCircle size={19} /><span>DMs</span></Link>
          <Link href="/profile" aria-label="Profile"><UserRound size={19} /><span>Profile</span></Link>
          <Link href="/more" aria-label="More"><Compass size={19} /><span>More</span></Link>
        </> : <>
          <Link href="/feed" className={pathname === '/feed' ? 'is-active' : ''} aria-current={pathname === '/feed' ? 'page' : undefined}><Home size={21} /><span>Home</span></Link>
          <Link href="/more" className={pathname === '/more' ? 'is-active' : ''} aria-current={pathname === '/more' ? 'page' : undefined}><Compass size={21} /><span>Explore</span></Link>
          <button className="mobile-create-button" onClick={() => setCreateOpen(true)} aria-label="Create"><Plus size={22} /></button>
          <Link href="/dm" className={pathname === '/dm' || pathname.startsWith('/dm/') ? 'is-active' : ''} aria-current={pathname.startsWith('/dm') ? 'page' : undefined}><MessageCircle size={21} /><span>Chats</span></Link>
          <Link href="/profile" className={pathname.startsWith('/profile') ? 'is-active' : ''} aria-current={pathname.startsWith('/profile') ? 'page' : undefined}><UserRound size={21} /><span>You</span></Link>
        </>}
      </nav>

      {createOpen && <div className="create-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setCreateOpen(false) }}>
        <section className="create-sheet" role="dialog" aria-modal="true" aria-labelledby="create-sheet-title">
          <div className="create-sheet-heading"><div><h2 id="create-sheet-title">Make a little noise.</h2><p>What would you like to share?</p></div><button className="icon-control" onClick={() => setCreateOpen(false)} aria-label="Close create menu"><X size={20} /></button></div>
          <div className="create-actions">{createActions.map(({ href, label, detail, Icon }) => <Link key={href} href={href} onClick={() => setCreateOpen(false)}><span className="create-action-icon"><Icon size={19} /></span><span className="create-action-copy"><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={17} /></Link>)}</div>
        </section>
      </div>}
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
}
