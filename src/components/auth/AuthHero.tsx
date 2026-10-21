'use client'

import { useState, useEffect } from 'react'

interface AuthHeroProps {
  title?: string
  subtitle?: string
  tagline?: string
  badge?: string
}

export function AuthHero({
  title = 'Unigram',
  subtitle = 'CRSU · JIND',
  tagline = 'Your campus, connected',
  badge,
}: AuthHeroProps) {
  const [coverUrl, setCoverUrl] = useState<string>('/images/default-cover.jpg')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        if (cancelled) return
        const url = cfg?.data?.profile_cover_url || cfg?.data?.cover_url
        if (url) {
          setCoverUrl(url)
        }
      })
      .catch(() => {
        // Fallback to local default-cover.jpg
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="auth-hero">
      <img
        src={coverUrl}
        alt="CRSU Campus, Jind"
        className={`auth-hero-img ${loaded ? 'show' : ''}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (coverUrl !== '/images/default-cover.jpg') {
            setCoverUrl('/images/default-cover.jpg')
          }
        }}
      />
      <div className="auth-hero-overlay" />
      <div className="auth-hero-brand">
        <img
          src="/icons/icon-192.png"
          alt="Unigram"
          className="auth-hero-logo"
          width={50}
          height={50}
        />
        <div className="auth-hero-meta">
          <div className="auth-hero-name">{title}</div>
          <div className="auth-hero-crsu">{subtitle}</div>
          {badge ? (
            <div className="auth-hero-badge">{badge}</div>
          ) : tagline ? (
            <div className="auth-hero-tag">{tagline}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
