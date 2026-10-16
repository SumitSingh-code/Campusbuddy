'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Sparkles, Mail } from 'lucide-react'
import { api } from '@/lib/api'

interface Contributor {
  id?: string
  name: string
  role: string
  dept?: string | null
  detail: string
  photo_url?: string | null
  sort_order?: number
}

const FALLBACK_CONTRIBUTORS: Contributor[] = [
  {
    name: 'Sumit Singh',
    role: 'Founder & Developer',
    dept: 'CRSU, Jind',
    detail: 'Ideated, designed, and built the entire Unigram platform from scratch to connect CRSU students.',
    photo_url: null,
  },
]

const BADGES = ['👑', '🎨', '💡', '🔧', '🧪', '⭐', '🚀', '🎯', '💪', '🌟']
const COLORS = ['#D4AF37', '#6B55E8', '#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#00BCD4']

function getInitials(name: string) {
  return (name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function ContributionWallPage() {
  const router = useRouter()
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContributors() {
      try {
        const res = await api.get<{ data: Contributor[] }>('/contributors')
        if (res.data && res.data.length > 0) {
          setContributors(res.data)
        } else {
          setContributors(FALLBACK_CONTRIBUTORS)
        }
      } catch (err) {
        console.error('Failed to load contributors:', err)
        setContributors(FALLBACK_CONTRIBUTORS)
      } finally {
        setLoading(false)
      }
    }
    loadContributors()
  }, [])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 1rem 4rem', fontFamily: 'inherit' }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--ink-muted)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '0.4rem 0',
          marginBottom: '0.75rem',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '2rem 1.25rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(212,175,55,.1) 0%, transparent 70%)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(212,175,55,.18)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            color: '#D4AF37',
          }}
        >
          <Trophy size={28} />
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '-.03em',
            color: 'var(--ink)',
            margin: '0 0 0.35rem',
          }}
        >
          Contribution Wall
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--accent)', fontWeight: 600, margin: '0 0 0.5rem' }}>
          The people who made Unigram possible
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          Every great community project is built by passionate individuals. Here are the contributors whose ideas, development, and support brought Unigram to life.
        </p>
      </div>

      {/* Contributors list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {loading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 96,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))
        ) : contributors.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
            }}
          >
            <Sparkles size={32} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.25rem' }}>
              No contributors listed yet
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', margin: 0 }}>
              Contributors added via the Admin Panel will appear here.
            </p>
          </div>
        ) : (
          contributors.map((c, i) => {
            const color = COLORS[i % COLORS.length]
            const badge = BADGES[i % BADGES.length]
            const initials = getInitials(c.name)

            return (
              <div
                key={c.id || i}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '1.1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: `1.5px solid ${color}44`,
                    background: `${color}18`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt={c.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback to initials if photo fails
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                      background: 'var(--surface)',
                      borderRadius: '50%',
                      padding: '1px',
                    }}
                  >
                    {badge}
                  </span>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                      {c.name}
                    </span>
                    {c.dept && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 9999,
                          background: '#F1F3F5',
                          color: '#596273',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        {c.dept}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.35rem' }}>
                    {c.role}
                  </div>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--ink-muted)',
                      lineHeight: 1.5,
                      margin: 0,
                      wordBreak: 'break-word',
                    }}
                  >
                    {c.detail}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          <Mail size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>
            Want to contribute?
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.1rem' }}>
            Reach out to the admin team or email{' '}
            <a href="mailto:grievance@unigram.app" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              grievance@unigram.app
            </a>{' '}
            to get recognized on this wall.
          </div>
        </div>
      </div>
    </div>
  )
}
