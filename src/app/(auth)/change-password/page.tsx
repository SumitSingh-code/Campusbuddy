'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const { signOut } = useAuth()
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one letter and one number')
      return
    }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      toast.success('Password updated! Please log in again.')
      await signOut()
      router.push('/login')
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-icon-wrap">
          <ShieldCheck size={28} />
        </div>
        <h1 className="cp-title">Set New Password</h1>
        <p className="cp-desc">Your account requires a password update before you can continue.</p>

        <form onSubmit={handleSubmit} className="cp-form">
          <div className="cp-field">
            <Lock size={16} className="cp-field-icon" />
            <input
              type={showNew ? 'text' : 'password'}
              className="cp-input"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <button type="button" className="cp-eye" onClick={() => setShowNew(v => !v)}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="cp-field">
            <Lock size={16} className="cp-field-icon" />
            <input
              type={showConfirm ? 'text' : 'password'}
              className="cp-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <button type="button" className="cp-eye" onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <ul className="cp-rules">
            <li className={newPassword.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
            <li className={/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'valid' : ''}>Contains a letter and a number</li>
            <li className={newPassword && newPassword === confirmPassword ? 'valid' : ''}>Passwords match</li>
          </ul>

          {error && <div className="cp-error">{error}</div>}

          <button type="submit" className="cp-btn" disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      <style>{cpStyles}</style>
    </div>
  )
}

const cpStyles = `
.cp-page {
  min-height: 100dvh; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.cp-card {
  width: 100%; max-width: 400px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 2rem 1.75rem;
  text-align: center;
}
.cp-icon-wrap {
  width: 60px; height: 60px; border-radius: 16px;
  background: rgba(212,175,55,.12); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.cp-title { font-size: 1.25rem; font-weight: 800; color: var(--ink); margin: 0 0 .5rem; }
.cp-desc { font-size: .8375rem; color: var(--ink-muted); margin-bottom: 1.5rem; line-height: 1.55; }

.cp-form { display: flex; flex-direction: column; gap: .85rem; text-align: left; }
.cp-field {
  display: flex; align-items: center; gap: .65rem;
  background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px;
  padding: 0 .85rem; transition: border-color .15s;
}
.cp-field:focus-within { border-color: var(--accent); }
.cp-field-icon { color: var(--ink-muted); flex-shrink: 0; }
.cp-input { flex: 1; background: transparent; border: none; outline: none; padding: .75rem 0; font-size: .9rem; color: var(--ink); font-family: inherit; }
.cp-input::placeholder { color: var(--ink-muted); }
.cp-eye { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 0; display: flex; }

.cp-rules { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
.cp-rules li { font-size: .78rem; color: var(--ink-muted); padding-left: 1.25rem; position: relative; }
.cp-rules li::before { content: '○'; position: absolute; left: 0; }
.cp-rules li.valid { color: #50C878; }
.cp-rules li.valid::before { content: '✓'; }

.cp-error { background: rgba(232,93,78,.1); border: 1px solid rgba(232,93,78,.3); color: #E85D4E; border-radius: 10px; padding: .65rem .85rem; font-size: .8125rem; }
.cp-btn { width: 100%; padding: .85rem; background: var(--accent); color: var(--bg); border: none; border-radius: 12px; font-size: .9375rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
.cp-btn:disabled { opacity: .6; cursor: not-allowed; }
`
