'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ data: Notification[] }>('/notifications')
        setNotifications(res.data || [])
      } catch {
        // Notifications may not be implemented yet
        setNotifications([])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)' }}>
        <Bell size={20} style={{ color: 'var(--ink-muted)' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Notifications</h2>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <Bell size={40} style={{ color: 'var(--ink-subtle)', margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--ink)', marginBottom: 8 }}>No notifications</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>You&apos;re all caught up!</p>
        </div>
      ) : (
        notifications.map(n => (
          <div key={n.id} style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', background: n.read ? 'var(--surface)' : 'var(--bg-muted)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Bell size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.5 }}>{n.message}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
