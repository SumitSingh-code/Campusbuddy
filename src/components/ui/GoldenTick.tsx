'use client'

import React from 'react'

interface GoldenTickProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  showLabel?: boolean
  label?: string
  title?: string
}

export function GoldenTick({
  size = 16,
  className = '',
  style = {},
  showLabel = false,
  label = 'Pioneer',
  title = 'Haryana Day Early Bird Pioneer · Golden Badge',
}: GoldenTickProps) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(217, 119, 6, 0.45))',
        ...style,
      }}
      className={className}
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="unigram-gold-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="30%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="unigram-gold-shimmer" x1="4" y1="4" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Verified Scalloped Rosette (12-pointed rounded seal) */}
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        fill="url(#unigram-gold-grad)"
      />

      {/* Upper Subtle Highlight */}
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12c0 .34.03.68.08 1.01C4.16 6.84 9.17 3.5 15.5 3.5c2.4 0 4.6.65 6.47 1.78.18 2.12.28 4.47.28 6.72z"
        fill="url(#unigram-gold-shimmer)"
        opacity="0.5"
      />

      {/* Crisp White Inner Checkmark */}
      <path
        d="M10.5 16.25L6.5 12.25L7.91 10.84L10.5 13.42L17.09 6.83L18.5 8.25L10.5 16.25Z"
        fill="#FFFFFF"
      />
    </svg>
  )

  if (!showLabel) {
    return (
      <span
        title={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 1,
          cursor: 'help',
        }}
      >
        {icon}
      </span>
    )
  }

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px 2px 6px',
        borderRadius: 9999,
        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.85) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#92400E',
        letterSpacing: '0.01em',
        cursor: 'help',
        lineHeight: 1.3,
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

export default GoldenTick
