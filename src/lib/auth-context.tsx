'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { api } from './api'
import type { User } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────
export interface Profile {
  id: string
  full_name: string
  roll_number: string
  department: string
  phone_number: string
  email: string | null
  bio: string | null
  avatar_url: string | null
  status: 'pending' | 'active' | 'suspended' | 'banned' | 'rejected'
  role: 'student' | 'moderator' | 'super_admin'
  auth_provider: 'email' | 'google'
  university_name: string
  karma: number
  posts_count: number
  notes_uploaded: number
  must_change_password: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isLoggedIn: boolean
  isActive: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  needsProfile: boolean
  mustChangePassword: boolean
  isGoogleOnly: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string, profileData: Record<string, string>) => Promise<void>
  completeProfile: (profileData: Record<string, string>) => Promise<void>
  forgotPassword: (rollNumber: string, phoneNumber: string) => Promise<unknown>
  changePassword: (newPassword: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch profile from backend
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      return null
    }
    try {
      const res = await api.get('/auth/status')
      const p = (res.profile as Profile) || null
      setProfile(p)
      if (p) {
        localStorage.setItem('cw_profile', JSON.stringify(p))
      }
      return p
    } catch (err) {
      // Retry once after 1.5s (handles token-not-yet-ready race condition)
      try {
        await new Promise(r => setTimeout(r, 1500))
        const res2 = await api.get('/auth/status')
        const p2 = (res2.profile as Profile) || null
        setProfile(p2)
        if (p2) localStorage.setItem('cw_profile', JSON.stringify(p2))
        return p2
      } catch {
        // Final fallback to cached profile
        try {
          const cached = localStorage.getItem('cw_profile')
          if (cached) {
            const p = JSON.parse(cached) as Profile
            if (p.id === currentUser.id) {
              setProfile(p)
              return p
            }
          }
        } catch { /* ignore parse error */ }
        console.warn('[Auth] Profile fetch failed:', err)
        return null
      }
    }
  }, [])

  // Initialize auth
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          localStorage.removeItem('cw_profile')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── Auth Methods ─────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw mapAuthError(error)
    setUser(data.user)
    await fetchProfile(data.user)
  }, [fetchProfile])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login' },
    })
    if (error) throw mapAuthError(error)
  }, [])

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    profileData: Record<string, string>
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw mapAuthError(error)
    if (!data.session) {
      throw new Error('Email confirmation is required. Please check your inbox.')
    }
    setUser(data.user)
    try {
      await api.post('/auth/signup', { ...profileData, email, auth_provider: 'email' })
    } catch (profileErr) {
      try { await supabase.auth.signOut() } catch { /* ignore */ }
      setUser(null)
      setProfile(null)
      localStorage.removeItem('cw_profile')
      throw profileErr
    }
    await fetchProfile(data.user)
  }, [fetchProfile])

  const completeProfile = useCallback(async (profileData: Record<string, string>) => {
    await api.post('/auth/signup', { ...profileData, auth_provider: 'google' })
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  const forgotPassword = useCallback(async (rollNumber: string, phoneNumber: string) => {
    return api.post('/auth/forgot-password', {
      roll_number: rollNumber,
      phone_number: phoneNumber,
    })
  }, [])

  const changePassword = useCallback(async (newPassword: string) => {
    await api.post('/auth/change-password', { new_password: newPassword })
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    localStorage.removeItem('cw_profile')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  // ── Computed Values ──────────────────────────────────────────
  const isGoogleOnly = (() => {
    if (!user?.identities) return false
    const hasGoogle = user.identities.some(i => i.provider === 'google')
    const hasEmail = user.identities.some(i => i.provider === 'email')
    return hasGoogle && !hasEmail
  })()

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isLoggedIn: !!user,
    isActive: profile?.status === 'active',
    isAdmin: ['moderator', 'super_admin'].includes(profile?.role || ''),
    isSuperAdmin: profile?.role === 'super_admin',
    needsProfile: !!user && !profile && !isLoading,
    mustChangePassword: !!profile?.must_change_password,
    isGoogleOnly,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    completeProfile,
    forgotPassword,
    changePassword,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ─── Helpers ─────────────────────────────────────────────────────
function mapAuthError(error: { message: string }): Error {
  const msg = error.message || 'Authentication failed'
  if (msg.includes('Invalid login credentials')) {
    return new Error('Incorrect email or password. Please try again.')
  }
  if (msg.includes('Email not confirmed')) {
    return new Error('Please confirm your email first.')
  }
  if (msg.includes('User already registered')) {
    return new Error('An account with this email already exists. Try logging in instead.')
  }
  return new Error(msg)
}
