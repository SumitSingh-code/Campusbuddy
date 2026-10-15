'use client'

import { useEffect } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        animation: 'cf-in .2s ease',
      }}
    >
      <style>{`@keyframes cf-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      <div style={{
        background: 'var(--surface)',
        borderRadius: '18px 18px 0 0',
        padding: '1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom,0))',
        width: '100%', maxWidth: 480,
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        fontFamily: "'Space Grotesk','Segoe UI',sans-serif",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto .85rem' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: '.5rem' }}>{title}</h3>
        <p style={{ fontSize: '.9rem', color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: '1.1rem', textAlign: 'center' }}>{message}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '.75rem', border: 'none', borderRadius: 11,
              background: 'var(--bg-muted)', color: 'var(--ink)',
              fontSize: '.9375rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'opacity .15s',
            }}
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '.75rem', border: 'none', borderRadius: 11,
              background: danger ? 'var(--danger)' : 'var(--accent)',
              color: '#fff',
              fontSize: '.9375rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'opacity .15s',
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
