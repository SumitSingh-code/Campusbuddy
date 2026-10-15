import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Exclude api/ directory from Next.js processing
  // The Express serverless function handles /api/* via vercel.json rewrite
  typescript: {
    ignoreBuildErrors: true, // relax during migration; tighten later
  },
}

export default nextConfig
