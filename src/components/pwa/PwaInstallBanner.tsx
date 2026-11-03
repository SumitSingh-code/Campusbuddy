'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, Share2, PlusSquare, Sparkles, Star, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const SESSION_DISMISS_KEY = 'unigram_install_banner_dismissed_session'

export default function PwaInstallBanner() {
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)

  useEffect(() => {
    setMounted(true)

    // 1. Detect if running as standalone PWA already
    const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
    const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandaloneMatch || isNavigatorStandalone) {
      return // Already installed & opened as standalone PWA app
    }

    // 2. Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream
    setIsIOS(iosDevice)

    // 3. Check session dismissal (allows re-showing in new session / visit)
    let isDismissedInSession = false
    try {
      isDismissedInSession = sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true'
    } catch {}

    if (!isDismissedInSession) {
      setIsVisible(true)
    }

    // 4. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // If prompt available, ensure banner is visible if not in standalone
      if (!isDismissedInSession) {
        setIsVisible(true)
      }
    }

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsVisible(false)
      setShowGuideModal(false)
      try {
        localStorage.setItem('unigram_app_installed', 'true')
      } catch {}
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Global event listener: allows any button (login page, etc.) to trigger install or open guide modal
  useEffect(() => {
    const handleOpenInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt().then(() => {
          return deferredPrompt.userChoice
        }).then((choice) => {
          if (choice?.outcome === 'accepted') {
            setIsVisible(false)
          }
        }).catch(() => {
          setShowGuideModal(true)
        })
      } else {
        setShowGuideModal(true)
      }
    }

    window.addEventListener('unigram:open-install-guide', handleOpenInstall)
    return () => window.removeEventListener('unigram:open-install-guide', handleOpenInstall)
  }, [deferredPrompt])

  const handleDismiss = () => {
    setIsDismissing(true)
    setTimeout(() => {
      setIsVisible(false)
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, 'true')
      } catch {}
    }, 280)
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsVisible(false)
          try {
            localStorage.setItem('unigram_app_installed', 'true')
          } catch {}
        }
      } catch (err) {
        console.warn('Install prompt error:', err)
        setShowGuideModal(true)
      } finally {
        setDeferredPrompt(null)
      }
    } else {
      // Either iOS Safari or browser hasn't fired beforeinstallprompt
      setShowGuideModal(true)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <>
      {isVisible && (
        <section
        role="region"
        aria-label="Install UniGram App"
        style={{
          position: 'relative',
          width: '100%',
          zIndex: 80,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'max-height 0.28s ease, opacity 0.28s ease, transform 0.28s ease',
          maxHeight: isDismissing ? '0px' : '90px',
          opacity: isDismissing ? 0 : 1,
          overflow: 'hidden',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* Subtle gold accent top bar */}
        <div
          style={{
            height: '2px',
            width: '100%',
            background: 'linear-gradient(90deg, #F2A93B 0%, #D4AF37 50%, #F59E0B 100%)',
          }}
        />

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '7px 12px 7px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            minHeight: '48px',
          }}
        >
          {/* Left section: Close button + App Icon + Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss app download banner"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>

            {/* App Icon */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                border: '1px solid rgba(212,175,55,0.35)',
                background: '#0D1424',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <img
                src="/icons/icon-192.png"
                alt="UniGram App"
                width={38}
                height={38}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* App Meta text */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2 }}>
                <span
                  style={{
                    fontWeight: 750,
                    fontSize: '0.86rem',
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  UniGram App
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'var(--accent-light)',
                    color: 'var(--accent-text)',
                    flexShrink: 0,
                  }}
                >
                  CRSU
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--ink-muted)',
                  marginTop: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ color: '#F59E0B', display: 'inline-flex', alignItems: 'center' }}>
                  <Star size={11} fill="#F59E0B" strokeWidth={0} />
                </span>
                <span>Fast & 0 MB · Offline Notes</span>
              </div>
            </div>
          </div>

          {/* Right section: Install Button */}
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              aria-label="Install UniGram application"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, #F2A93B 0%, #D4AF37 100%)',
                color: '#0D1424',
                fontWeight: 750,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(242, 169, 59, 0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(242, 169, 59, 0.45)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(242, 169, 59, 0.35)'
              }}
            >
              <Download size={14} strokeWidth={2.4} />
              <span>Install</span>
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Guide Modal for iOS or manual browser installation */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
              padding: '20px',
              color: 'var(--ink)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/icons/icon-192.png"
                  alt="UniGram"
                  width={36}
                  height={36}
                  style={{
                    borderRadius: '9px',
                    border: '1px solid rgba(212,175,55,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                    Install UniGram App
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', margin: 0 }}>
                    Fast 1-tap campus access on your screen
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                aria-label="Close installation guide"
                style={{
                  background: 'var(--bg-muted)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink-muted)',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Steps */}
            {isIOS ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Tap the <strong>Share</strong> button <Share2 size={14} style={{ display: 'inline', verticalAlign: '-2px', color: '#007AFF' }} /> in Safari toolbar at the bottom.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Tap <strong>Add</strong> at the top right. The UniGram app will be on your home screen!
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Tap the <strong>browser menu (⋮)</strong> in Chrome at the top right corner.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0D1424',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </span>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.35 }}>
                    Tap <strong>Install</strong>. UniGram is installed with zero storage usage!
                  </div>
                </div>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={() => setShowGuideModal(false)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--accent)',
                color: '#0D1424',
                fontWeight: 750,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
