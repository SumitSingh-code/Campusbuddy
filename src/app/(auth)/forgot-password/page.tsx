'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

function ForgotContent() {
  const [rollNumber, setRollNumber] = useState('')
  const [phone,      setPhone]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post('/auth/forgot-password', {
        roll_number:  rollNumber.trim().toUpperCase(),
        phone_number: phone.replace(/\D/g, ''),
      })
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed. Please try again.')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.875rem', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--ink)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to login
        </Link>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.75rem' }}>Request Submitted</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              If your details match our records, a password reset request has been submitted.
              An admin will provide you a temporary password. Check back in a few hours.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Reset Password</h1>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Enter your roll number and registered phone number.</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Roll Number</label>
                <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 22MCA001" required style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required style={inp} />
              </div>
              {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotContent /></Suspense>
}
