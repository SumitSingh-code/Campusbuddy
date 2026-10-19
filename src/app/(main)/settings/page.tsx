'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, LogOut, Moon, Sun, Lock, User, Pencil, Shield, Users, Info, FileText, BookOpen, Mail, ExternalLink, Bell, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

const THEME_KEY = 'unigram_theme'

function isDark() {
  if (typeof window === 'undefined') return true
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

function applyTheme(dark: boolean) {
  if (dark) document.documentElement.setAttribute('data-theme', 'dark')
  else document.documentElement.removeAttribute('data-theme')
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

interface NotificationPreferences {
  dm: boolean
  comments: boolean
  anon_replies: boolean
  dept_notices: boolean
  lost_found: boolean
  resources: boolean
}

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  dm: true,
  comments: true,
  anon_replies: true,
  dept_notices: true,
  lost_found: false,
  resources: false,
}

const NOTIF_PREFS_KEY = 'unigram_notif_prefs'

function Row({ icon, label, sub, href, onClick, danger, external }: { icon: React.ReactNode; label: string; sub?: string; href?: string; onClick?: () => void; danger?: boolean; external?: boolean }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', cursor: 'pointer', textDecoration: 'none', color: danger ? 'var(--danger)' : 'var(--ink)' }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: danger ? 'rgba(248,81,73,.12)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: danger ? 'var(--danger)' : 'var(--ink-muted)' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</span>}
      </span>
      {external ? <ExternalLink size={14} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />}
    </div>
  )
  if (href) {
    const isStaticOrExternal = external || href.endsWith('.html') || href.startsWith('http') || href.startsWith('mailto:')
    if (isStaticOrExternal) {
      return (
        <a
          href={href}
          target={external && href.startsWith('http') ? '_blank' : undefined}
          rel={external && href.startsWith('http') ? 'noopener noreferrer' : undefined}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          {content}
        </a>
      )
    }
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link>
  }
  return <button onClick={onClick} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>{content}</button>
}

export default function SettingsPage() {
  const { profile, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const [dark, setDark] = useState(true)
  const [signOutConfirm, setSignOutConfirm] = useState(false)

  // Name modal
  const [nameModal, setNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  // PW modal
  const [pwModal, setPwModal] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  // Notifications modal & state
  const [notifModal, setNotifModal] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS)
  const [browserPermission, setBrowserPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [requestingPush, setRequestingPush] = useState(false)

  useEffect(() => {
    setDark(isDark())
    if (profile) {
      setNameInput(profile.full_name)
      const profWithPrefs = profile as unknown as { notification_preferences?: NotificationPreferences }
      if (profWithPrefs.notification_preferences && typeof profWithPrefs.notification_preferences === 'object') {
        setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...profWithPrefs.notification_preferences })
      } else {
        try {
          const cached = localStorage.getItem(NOTIF_PREFS_KEY)
          if (cached) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(cached) })
        } catch {}
      }
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [profile])

  async function toggleNotifPref(key: keyof NotificationPreferences) {
    const nextVal = !notifPrefs[key]
    const updated = { ...notifPrefs, [key]: nextVal }
    setNotifPrefs(updated)
    try {
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated))
      await api.patch('/profile/me', { notification_preferences: updated })
      toast.success('Preferences saved')
    } catch {
      toast.success('Preferences saved')
    }
  }

  async function requestPushPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported on this browser')
      return
    }
    setRequestingPush(true)
    try {
      const perm = await Notification.requestPermission()
      setBrowserPermission(perm)
      if (perm === 'granted') {
        toast.success('Device notifications enabled! 🎉')
      } else if (perm === 'denied') {
        toast.error('Notifications blocked in browser settings')
      }
    } catch {
      toast.error('Could not request notification permission')
    } finally {
      setRequestingPush(false)
    }
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    applyTheme(next)
  }

  async function saveName() {
    if (!nameInput.trim() || nameInput.trim().length < 2) { toast.error('Name too short'); return }
    setNameSaving(true)
    try {
      await api.patch('/profile/me', { full_name: nameInput.trim() })
      toast.success('Name updated!')
      setNameModal(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name')
    } finally { setNameSaving(false) }
  }

  async function savePw() {
    setPwError('')
    if (newPw.length < 8 || !/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      setPwError('Min 8 chars, must include a letter and a number'); return
    }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', { new_password: newPw })
      toast.success('Password changed! 🎉')
      setPwModal(false)
      setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password')
    } finally { setPwSaving(false) }
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  const divider = <div style={{ height: 1, background: 'var(--border)', margin: '0 1rem' }} />
  const sectionLabel = (text: string) => <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.5rem 1rem 0.25rem' }}>{text}</div>
  const card = (children: React.ReactNode) => <div style={{ background: 'var(--surface)', borderRadius: 14, margin: '0 0 0.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>{children}</div>

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 0 2rem' }}>
      {/* Header */}
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/profile" style={{ color: 'var(--ink-muted)', display: 'flex' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </Link>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ink)' }}>Settings</h1>
      </div>

      <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Account */}
        {sectionLabel('Account')}
        {card(
          <>
            <Row icon={<User size={16} />} label="Edit Profile" sub="Avatar, bio, phone" onClick={() => { sessionStorage.setItem('profile_open_edit', '1'); router.push('/profile') }} />
            {divider}
            <Row icon={<Pencil size={16} />} label="Edit Name" sub={profile?.full_name} onClick={() => { setNameInput(profile?.full_name || ''); setNameModal(true) }} />
            {divider}
            {profile?.auth_provider === 'email'
              ? <Row icon={<Lock size={16} />} label="Change Password" onClick={() => setPwModal(true)} />
              : <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-muted)' }}><Lock size={16} /></span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-muted)' }}>Change Password</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>Managed by Google</span>
                  </span>
                </div>
            }
            {isAdmin && (
              <>
                {divider}
                <Row icon={<Shield size={16} />} label="Admin Panel" href="/admin.html" external />
              </>
            )}
          </>
        )}

        {/* Preferences */}
        {sectionLabel('Preferences')}
        {card(
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-muted)' }}>
                {dark ? <Moon size={16} /> : <Sun size={16} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Light Mode</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Switch to light theme</span>
              </span>
              {/* Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: !dark ? 'var(--accent)' : 'var(--bg-subtle)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  left: !dark ? 23 : 3,
                  boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                }} />
              </button>
            </div>
            {divider}
            <Row
              icon={<Bell size={16} />}
              label="Notification Settings"
              sub="DMs, comments, notices & alerts"
              onClick={() => setNotifModal(true)}
            />
          </>
        )}

        {/* Connect & Community */}
        {sectionLabel('Connect & Community')}
        {card(
          <>
            <Row icon={<Users size={16} />} label="Contribution Wall" sub="People who built Unigram" href="/wall" />
            {divider}
            <Row icon={<InstagramIcon size={16} />} label="Instagram" sub="@unigramjind" href="https://www.instagram.com/unigramjind?psln=eDk0Y2NiY3VwMDM3" external />
            {divider}
            <Row icon={<Mail size={16} />} label="Official Email" sub="unigramjind@gmail.com" href="mailto:unigramjind@gmail.com" external />
          </>
        )}

        {/* Legal */}
        {sectionLabel('Legal & Info')}
        {card(
          <>
            <Row icon={<Info size={16} />} label="App Info" href="/about" />
            {divider}
            <Row icon={<Lock size={16} />} label="Privacy Policy" href="/privacy" />
            {divider}
            <Row icon={<FileText size={16} />} label="Terms & Conditions" href="/terms" />
            {divider}
            <Row icon={<BookOpen size={16} />} label="Community Guidelines" href="/guidelines" />
            {divider}
            <Row icon={<Mail size={16} />} label="Contact / Grievance" href="/contact" />
          </>
        )}

        {/* Sign Out */}
        <div style={{ marginTop: 8 }}>
          {card(
            <Row icon={<LogOut size={16} />} label="Sign Out" onClick={() => setSignOutConfirm(true)} danger />
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem', fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>
          Unigram — CRSU Jind<br />Made with ❤️ for students
        </div>
      </div>

      {/* Name modal */}
      {nameModal && (
        <>
          <div onClick={() => setNameModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 51, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.25rem', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom,0))', boxShadow: '0 -8px 40px rgba(0,0,0,.4)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>Edit Name</h3>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              maxLength={80}
              placeholder="Your full name"
              style={{ width: '100%', padding: '0.7rem 0.875rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNameModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveName} disabled={nameSaving} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', opacity: nameSaving ? 0.7 : 1 }}>{nameSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </>
      )}

      {/* PW modal */}
      {pwModal && (
        <>
          <div onClick={() => setPwModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 51, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.25rem', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom,0))', boxShadow: '0 -8px 40px rgba(0,0,0,.4)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>Change Password</h3>
            {[{ label: 'New Password', val: newPw, set: setNewPw }, { label: 'Confirm Password', val: confirmPw, set: setConfirmPw }].map(({ label, val, set }) => (
              <div key={label} style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{label}</label>
                <input type="password" value={val} onChange={e => set(e.target.value)} placeholder="Min 8 chars, letter + number" style={{ width: '100%', padding: '0.7rem 0.875rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
            ))}
            {pwError && <div style={{ padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{pwError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPwModal(false); setPwError('') }} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={savePw} disabled={pwSaving} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', opacity: pwSaving ? 0.7 : 1 }}>{pwSaving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </>
      )}

      {/* Notification Settings Modal */}
      {notifModal && (
        <>
          <div onClick={() => setNotifModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', zIndex: 51, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.25rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom,0))', boxShadow: '0 -8px 40px rgba(0,0,0,.4)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,175,55,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Bell size={17} />
                </span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>Notification Settings</h3>
              </div>
              <button onClick={() => setNotifModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Device Permission Status */}
            {browserPermission === 'granted' ? (
              <div style={{ background: 'rgba(76,154,106,.1)', border: '1px solid rgba(76,154,106,.25)', borderRadius: 12, padding: '0.75rem 0.9rem', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.1rem' }}>
                <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>Device Notifications Active</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>You will receive real-time alerts in your notification bar.</div>
                </div>
              </div>
            ) : browserPermission === 'denied' ? (
              <div style={{ background: 'rgba(232,93,78,.1)', border: '1px solid rgba(232,93,78,.25)', borderRadius: 12, padding: '0.75rem 0.9rem', marginBottom: '1.1rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 2 }}>⚠️ Notifications Blocked</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Tap the site settings icon in your browser address bar to allow alerts.</div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.75rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '1.1rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>Turn on Device Push</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Alerts even when the app is closed</div>
                </div>
                <button
                  onClick={requestPushPermission}
                  disabled={requestingPush}
                  style={{ padding: '0.45rem 0.85rem', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {requestingPush ? 'Enabling...' : 'Enable'}
                </button>
              </div>
            )}

            {/* Toggle Rows List */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {[
                { key: 'dm' as const, label: 'Direct Messages', sub: 'Private one-on-one chats', icon: '💬' },
                { key: 'comments' as const, label: 'Comments & Replies', sub: 'When someone comments on your post', icon: '📝' },
                { key: 'anon_replies' as const, label: 'Anonymous Replies', sub: 'Replies to your anonymous posts (private)', icon: '🎭' },
                { key: 'dept_notices' as const, label: 'Department Notices', sub: 'Notices matching your department', icon: '📢' },
                { key: 'lost_found' as const, label: 'Lost & Found Alerts', sub: 'New lost or found item reports', icon: '🔍' },
                { key: 'resources' as const, label: 'Past Papers & Notes', sub: 'New study material for your branch', icon: '📚' },
              ].map(({ key, label, sub, icon }, idx) => (
                <div key={key}>
                  {idx > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '0 1rem' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{sub}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotifPref(key)}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: notifPrefs[key] ? 'var(--accent)' : 'var(--bg-subtle)',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        left: notifPrefs[key] ? 22 : 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
                      }} />
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '0 1rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1.1rem' }}>🚨</span>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>Emergency & Holiday Circulars</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Official administrative circulars</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-muted)', color: 'var(--ink-subtle)', border: '1px solid var(--border)' }}>
                  Essential
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setNotifModal(false)}
                style={{ padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {signOutConfirm && (
        <ConfirmDialog
          title="Sign out?"
          message="You will need to sign in again."
          confirmLabel="Sign Out"
          danger={false}
          onConfirm={handleSignOut}
          onCancel={() => setSignOutConfirm(false)}
        />
      )}
    </div>
  )
}
