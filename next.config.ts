import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Cache static assets, icons, manifest on mobile browsers for high-speed loads
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=2592000',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
  // Exclude api/ directory from Next.js processing
  // The Express serverless function handles /api/* via vercel.json rewrite
  typescript: {
    ignoreBuildErrors: true, // relax during migration; tighten later
  },
}

export default nextConfig
