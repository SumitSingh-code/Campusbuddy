import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Lazy singleton ──────────────────────────────────────────────
// During Next.js static page generation (SSG/ISR) on Vercel,
// env vars may not be available. We lazily create the client
// only when it's actually needed (at runtime in the browser).

let _supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build / SSG this is expected — return a dummy that won't be used
    if (typeof window === 'undefined') {
      console.warn('[Unigram] Supabase env vars not available during build — using placeholder')
      // Return a placeholder client with a valid-looking URL to avoid crash
      // This will never actually be called during SSG since all pages are 'use client'
      return createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }
    throw new Error(
      '[Unigram] Supabase not configured! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'cw_auth_token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

  return _supabase
}

// Proxy export — all imports get the lazy-initialized client
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as Record<string | symbol, unknown>)[prop]
  },
})

export default supabase
