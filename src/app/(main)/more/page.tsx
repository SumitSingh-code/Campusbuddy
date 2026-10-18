'use client'

import Link from 'next/link'
import {
  ArrowUpRight, Bell, BookOpen, CalendarDays, FileText, Ghost,
  MessageCircle, Search, Settings, Trophy,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const campusSpaces = [
  { href: '/anon', icon: Ghost, title: 'Anonymous', description: 'Say what’s on your mind, without your name attached.', label: 'Open conversations' },
  { href: '/notices', icon: Bell, title: 'Bulletin', description: 'Official notices and updates from campus.', label: 'Read notices' },
  { href: '/lost-found', icon: Search, title: 'Lost & found', description: 'Help lost things find their people again.', label: 'Browse items' },
]

const studyLinks = [
  { href: '/notes', icon: BookOpen, title: 'Study notes', description: 'Notes shared by students' },
  { href: '/pyq', icon: FileText, title: 'Past papers', description: 'Previous year question papers' },
  { href: '/timetable', icon: CalendarDays, title: 'Timetable', description: 'Keep your week in view' },
]

export default function ExplorePage() {
  const { profile } = useAuth()
  const initials = profile?.full_name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="explore-page">
      <header className="explore-heading">
        <div><h1>Find your corner.</h1><p>People, notes, notices and the little things that make campus yours.</p></div>
      </header>

      {profile && <Link href="/profile" className="explore-profile">
        <span className="explore-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}</span>
        <span><strong>{profile.full_name}</strong><small>{profile.department} · Your campus identity</small></span>
        <ArrowUpRight size={18} />
      </Link>}

      <section className="explore-section">
        <div className="explore-section-heading"><h2>Campus spaces</h2><p>Pick up where the conversation is.</p></div>
        <div className="explore-space-list">{campusSpaces.map(({ href, icon: Icon, title, description, label }) => <Link key={href} href={href} className="explore-space-row">
          <span className="explore-space-icon"><Icon size={19} /></span>
          <span className="explore-space-copy"><strong>{title}</strong><small>{description}</small></span>
          <span className="explore-space-action">{label}<ArrowUpRight size={15} /></span>
        </Link>)}</div>
      </section>

      <section className="explore-section explore-study-section">
        <div className="explore-section-heading"><h2>Study together</h2><p>Useful things, passed from one student to another.</p></div>
        <div className="explore-study-list">{studyLinks.map(({ href, icon: Icon, title, description }) => <Link key={href} href={href} className="explore-study-row">
          <Icon size={19} /><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={15} />
        </Link>)}</div>
      </section>

      <section className="explore-personal-links" aria-label="Your contribution and settings activity">
        <Link href="/wall"><Trophy size={17} /><span><strong>Contribution wall</strong><small>Meet the people who help build Unigram</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/dm"><MessageCircle size={17} /><span><strong>Start a conversation</strong><small>Catch up with someone from campus</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/settings"><Settings size={17} /><span><strong>Settings</strong><small>Preferences, theme & account</small></span><ArrowUpRight size={16} /></Link>
      </section>

      <footer className="explore-footer">A student space for CRSU, made to feel like yours.</footer>
    </div>
  )
}
