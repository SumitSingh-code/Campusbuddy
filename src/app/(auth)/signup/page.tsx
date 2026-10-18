'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DEPARTMENTS } from '@/lib/constants'

function SignupContent() {
  const { signUpWithEmail, completeProfile, isLoggedIn, isLoading, needsProfile } = useAuth()
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
    if (!isLoading && isLoggedIn && !needsProfile) router.replace('/pending')
  }, [isLoading, isLoggedIn, needsProfile, router])

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
      if (isProfileStep) await completeProfile(profileData)
      else               await signUpWithEmail(email.trim(), password, profileData)
      router.replace('/pending')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.875rem', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--ink)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Progress bar */}
        {!isProfileStep && (
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
            {[1, 2].map(n => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
        )}

        {/* Back link */}
        {step === 1 && !isProfileStep && (
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '1rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to login
          </Link>
        )}
        {step === 2 && !isProfileStep && (
          <button onClick={() => setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
            {step === 1 ? 'Create account' : 'Your details'}
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
            {step === 1 ? 'Join Unigram — CRSU Jind' : 'Fill in your university information'}
          </p>
        </div>

        {step === 1 && !isProfileStep ? (
          <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={lbl}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" required style={inp} />
            </div>
            <div><label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars, letter + number" required style={{ ...inp, paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>{error}</div>}
            <button type="submit" style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Continue</button>
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link></p>
          </form>
        ) : (
          <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={lbl}>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As on university records" required style={inp} />
            </div>
            <div><label style={lbl}>Roll Number</label>
              <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 22MCA001" required style={inp} />
            </div>
            <div><label style={lbl}>Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} required style={{ ...inp, appearance: 'none' as const }}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required style={inp} />
            </div>
            {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense fallback={null}><SignupContent /></Suspense>
}
