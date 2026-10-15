'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const REASONS = [
  'Harassment or bullying',
  'Misinformation or fake news',
  'Inappropriate content',
  'Spam',
  'Hate speech or discrimination',
  'Copyright violation',
  'Other',
]

interface ReportDialogProps {
  postId: string
  endpoint: string // e.g. '/feed' or '/anon'
  onClose: () => void
}

export default function ReportDialog({ postId, endpoint, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return
    setSubmitting(true)
    try {
      await api.post(`${endpoint}/${postId}/report`, { reason, details: details.trim() })
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, zIndex: 51,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        padding: '1.25rem',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom,0))',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: 'sheet-in .25s ease',
      }}>
        <style>{`@keyframes sheet-in{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>Report Submitted</h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Thank you for helping keep Unigram safe.</p>
            <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, background: 'var(--bg-muted)', color: 'var(--ink)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.85rem' }}>Report Post</h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.8125rem', marginBottom: '0.85rem' }}>Select a reason:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.85rem' }}>
              {REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', borderRadius: 10, background: reason === r ? 'var(--accent-light)' : 'var(--bg-muted)', cursor: 'pointer', border: reason === r ? '1px solid var(--accent)' : '1px solid transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--ink)', fontWeight: reason === r ? 600 : 400 }}>{r}</span>
                </label>
              ))}
            </div>
            {reason && (
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Additional details (optional)"
                rows={2}
                maxLength={300}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', outline: 'none', marginBottom: '0.85rem' }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={!reason || submitting} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!reason || submitting) ? 0.6 : 1 }}>
                {submitting ? 'Sending...' : 'Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
