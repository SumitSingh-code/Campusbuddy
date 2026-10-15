'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const STATUS_CONFIG = {
  pending: {
    icon: '⏳',
    title: 'Account Pending Approval',
    desc: 'Your account is under review. Our admins verify each student manually. This usually takes a few hours.',
    color: '#D4AF37',
    bg: 'rgba(212,175,55,.1)',
  },
  banned: {
    icon: '🚫',
    title: 'Account Banned',
    desc: 'Your account has been permanently banned for violating our Community Guidelines. If you believe this is a mistake, contact us.',
    color: '#E85D4E',
    bg: 'rgba(232,93,78,.1)',
  },
  rejected: {
    icon: '❌',
    title: 'Account Rejected',
    desc: 'Your account application was rejected. This may be due to incorrect details. Please contact us if you need help.',
    color: '#E85D4E',
    bg: 'rgba(232,93,78,.1)',
  },
  suspended: {
    icon: '⚠️',
    title: 'Account Suspended',
    desc: 'Your account has been temporarily suspended. Please contact us to understand the reason and resolve the issue.',
    color: '#D4AF37',
    bg: 'rgba(212,175,55,.1)',
  },
}

export default function PendingPage() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const status = (profile?.status as keyof typeof STATUS_CONFIG) || 'pending'
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  // If somehow profile is active, redirect to feed
  useEffect(() => {
    if (profile?.status === 'active') {
      router.replace('/feed')
    }
  }, [profile, router])

  return (
    <div className="pending-page">
      <div className="pending-card">
        <div className="pending-icon-wrap" style={{ background: config.bg }}>
          <span className="pending-icon">{config.icon}</span>
        </div>

        <h1 className="pending-title" style={{ color: config.color }}>{config.title}</h1>
        <p className="pending-desc">{config.desc}</p>

        {profile && (
          <div className="pending-profile-info">
            <div className="pending-profile-row">
              <span className="pending-profile-label">Name</span>
              <span className="pending-profile-value">{profile.full_name}</span>
            </div>
            <div className="pending-profile-row">
              <span className="pending-profile-label">Roll No.</span>
              <span className="pending-profile-value">{profile.roll_number}</span>
            </div>
            <div className="pending-profile-row">
              <span className="pending-profile-label">Department</span>
              <span className="pending-profile-value">{profile.department}</span>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="pending-steps">
            <div className="pending-step pending-step--done">
              <div className="pending-step-dot" />
              <span>Account created</span>
            </div>
            <div className="pending-step pending-step--active">
              <div className="pending-step-dot" />
              <span>Admin review (in progress)</span>
            </div>
            <div className="pending-step">
              <div className="pending-step-dot" />
              <span>Access granted</span>
            </div>
          </div>
        )}

        <div className="pending-contact">
          <p>Need help?</p>
          <a href="mailto:grievance@unigram.app" className="pending-contact-link">grievance@unigram.app</a>
        </div>

        <button className="pending-signout-btn" onClick={() => signOut().then(() => router.push('/login'))}>
          Sign Out
        </button>
      </div>

      <style>{pendingStyles}</style>
    </div>
  )
}

const pendingStyles = `
.pending-page {
  min-height: 100dvh; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.pending-card {
  width: 100%; max-width: 400px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 2rem 1.75rem;
  text-align: center;
  animation: pcIn .3s ease;
}
@keyframes pcIn { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none} }

.pending-icon-wrap {
  width: 72px; height: 72px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.pending-icon { font-size: 2.25rem; }
.pending-title { font-size: 1.2rem; font-weight: 800; margin: 0 0 .65rem; }
.pending-desc { font-size: .8375rem; color: var(--ink-muted); line-height: 1.6; margin-bottom: 1.5rem; }

.pending-profile-info {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 12px; padding: .85rem; margin-bottom: 1.5rem;
  text-align: left;
}
.pending-profile-row { display: flex; justify-content: space-between; align-items: center; padding: .35rem 0; border-bottom: 1px solid var(--border); }
.pending-profile-row:last-child { border-bottom: none; }
.pending-profile-label { font-size: .75rem; color: var(--ink-muted); }
.pending-profile-value { font-size: .8125rem; font-weight: 600; color: var(--ink); }

.pending-steps { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.5rem; text-align: left; }
.pending-step { display: flex; align-items: center; gap: .75rem; font-size: .8125rem; color: var(--ink-muted); }
.pending-step--done { color: #50C878; }
.pending-step--active { color: var(--accent); font-weight: 600; }
.pending-step-dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

.pending-contact { margin-bottom: 1.5rem; }
.pending-contact p { font-size: .78rem; color: var(--ink-muted); margin-bottom: .25rem; }
.pending-contact-link { color: var(--accent); font-size: .8125rem; font-weight: 600; text-decoration: none; }

.pending-signout-btn {
  width: 100%; padding: .75rem;
  background: transparent; border: 1.5px solid var(--border);
  color: var(--ink-muted); border-radius: 12px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  transition: border-color .15s;
}
.pending-signout-btn:hover { border-color: var(--ink-muted); }
`
