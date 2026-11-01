'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { AuthHero } from '@/components/auth/AuthHero'

function LoginContent() {
  const { signInWithEmail, signInWithGoogle, signOut, isLoggedIn, isLoading, isProfileLoading, profile, needsProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect')
  const reason = searchParams.get('reason')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // If arriving due to an expired/revoked session, purge dead local credentials
  useEffect(() => {
    if (reason === 'session_expired') {
      signOut().catch(() => {})
    }
  }, [reason, signOut])

  useEffect(() => {
    // If arriving because session expired, do not auto-redirect back!
    if (reason === 'session_expired') return

    if (isLoading || isProfileLoading) return
    if (!isLoggedIn) return
    if (needsProfile) { router.replace('/signup?step=profile'); return }
    if (profile?.must_change_password)  { router.replace('/change-password'); return }
    if (profile?.status && profile.status !== 'active') {
      router.replace('/pending?status=' + profile.status); return
    }
    if (profile) {
      if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('/login')) {
        router.replace(redirectTarget)
      } else {
        router.replace('/feed')
      }
    }
  }, [isLoading, isProfileLoading, isLoggedIn, profile, needsProfile, router, redirectTarget, reason])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signInWithEmail(email.trim(), password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    try {
      const redirectUrl = redirectTarget
        ? `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTarget)}`
        : `${window.location.origin}/login`
      await signInWithGoogle({ redirectTo: redirectUrl })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.75rem 0.875rem', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--ink)', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-box">
        {/* Campus Cover Photo Hero */}
        <AuthHero
          title="Unigram"
          subtitle="CRSU · JIND"
          tagline="Your campus, connected"
        />

        {/* Card Body */}
        <div className="auth-card-body">
          <div style={{ marginBottom: '1.25rem' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 3 }}>
              Welcome back 👋
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.84rem' }}>
              Sign in to your Unigram account
            </p>
          </div>

          {/* Session Expired / Switch Device Banner */}
          {reason === 'session_expired' && (
            <div
              style={{
                padding: '0.75rem 0.875rem',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
                color: '#dc2626',
                fontSize: '0.82rem',
                lineHeight: 1.45,
                marginBottom: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⏱️</span>
              <span>Your session expired or your account was active on another device. Please sign in to continue.</span>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '0.75rem',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--ink-subtle)', fontSize: '0.75rem', fontWeight: 600 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" required style={inp} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>Password</label>
                <Link href="/forgot-password" style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required style={{ ...inp, paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%',
                padding: '0.78rem',
                borderRadius: 12,
                background: 'var(--accent)',
                color: 'var(--bg)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                border: 'none',
                cursor: 'pointer',
                opacity: (loading || !email || !password) ? 0.6 : 1,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
              Join Unigram
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--ink-subtle)', lineHeight: 1.4 }}>
            Unigram · Independent student platform<br />Not affiliated with CRSU
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
