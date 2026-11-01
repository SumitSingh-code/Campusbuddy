'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DEPARTMENTS } from '@/lib/constants'
import { AuthHero } from '@/components/auth/AuthHero'

function SignupContent() {
  const { signUpWithEmail, signInWithGoogle, completeProfile, signOut, user, isLoggedIn, isLoading, isProfileLoading, needsProfile, profile } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const isProfileStep = params.get('step') === 'profile'

  const [step,       setStep]       = useState(isProfileStep ? 2 : 1)
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [fullName,   setFullName]   = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [phone,      setPhone]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!isLoading && !isProfileLoading && isLoggedIn && !needsProfile) {
      if (profile?.status === 'active') {
        router.replace('/feed')
      } else {
        router.replace('/pending')
      }
    }
  }, [isLoading, isProfileLoading, isLoggedIn, needsProfile, profile, router])

  useEffect(() => {
    if (isProfileStep || needsProfile) {
      setStep(2)
      if (!fullName) {
        const meta = user?.user_metadata
        const gName = (meta?.full_name || meta?.name || '') as string
        if (gName) setFullName(gName)
      }
    }
  }, [isProfileStep, needsProfile, user, fullName])

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle({ redirectTo: `${window.location.origin}/signup?step=profile` })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed')
      setLoading(false)
    }
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with a letter and number.'); return
    }
    setStep(2)
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10)   { setError('Enter a valid 10-digit phone number.'); return }
    if (fullName.trim().length < 2) { setError('Please enter your full name.'); return }
    if (!department)                { setError('Please select your department.'); return }
    setLoading(true)
    try {
      const profileData = {
        full_name:    fullName.trim(),
        roll_number:  rollNumber.trim().toUpperCase(),
        department,
        phone_number: cleanPhone,
      }
      if (isProfileStep || needsProfile) await completeProfile(profileData)
      else                               await signUpWithEmail(email.trim(), password, profileData)
      router.replace('/pending')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.75rem 0.875rem', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--ink)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }

  const isProfileMode = isProfileStep || needsProfile

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-box">
        <AuthHero
          title={step === 1 && !isProfileMode ? 'Join Unigram' : 'Almost there!'}
          subtitle="CRSU · JIND"
          badge={step === 1 && !isProfileMode ? 'Step 1 of 2 — Account' : 'Step 2 of 2 — Profile'}
        />

        <div className="auth-card-body">
          {/* Progress bar */}
          {!isProfileMode && (
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
              {[1, 2].map(n => (
                <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= n ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
              ))}
            </div>
          )}

          {/* Back navigation */}
          {isProfileMode ? (
            <button
              type="button"
              onClick={async () => { await signOut(); router.replace('/login') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              <ArrowLeft size={16} /> Use a different account
            </button>
          ) : step === 1 ? (
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: '1rem', textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to login
            </Link>
          ) : (
            <button onClick={() => setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              <ArrowLeft size={16} /> Back to Step 1
            </button>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 3 }}>
              {step === 1 && !isProfileMode ? 'Create account' : 'Your details'}
            </h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.84rem' }}>
              {step === 1 && !isProfileMode
                ? 'Join Unigram — CRSU Jind'
                : (user?.email ? `Logged in as ${user.email}. Complete your student profile:` : 'Fill in your university information')}
            </p>
          </div>

          {step === 1 && !isProfileMode ? (
            <div>
              {/* Google Signup */}
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
                Sign up with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ color: 'var(--ink-subtle)', fontSize: '0.75rem', fontWeight: 600 }}>or sign up with email</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={lbl}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars, letter + number" required style={{ ...inp, paddingRight: '2.75rem' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 4 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>{error}</div>}
                <button type="submit" style={{ width: '100%', padding: '0.78rem', borderRadius: 12, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Continue
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--ink-muted)', marginTop: '0.75rem' }}>
                  Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                </p>
              </form>
            </div>
          ) : (
            <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As on university records" required style={inp} />
              </div>
              <div>
                <label style={lbl}>Roll Number</label>
                <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 22MCA001" required style={inp} />
              </div>
              <div>
                <label style={lbl}>Stream / Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} required style={{ ...inp, appearance: 'none' as const }}>
                  <option value="">Select Stream / Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Phone Number (10 digits)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required style={inp} />
              </div>
              {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.78rem', borderRadius: 12, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--ink-subtle)', lineHeight: 1.4 }}>
            Unigram · Independent student platform<br />Not affiliated with CRSU
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense fallback={null}><SignupContent /></Suspense>
}
