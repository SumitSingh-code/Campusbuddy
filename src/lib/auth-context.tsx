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
  notification_preferences?: {
    dm?: boolean
    comments?: boolean
    anon_replies?: boolean
    dept_notices?: boolean
    lost_found?: boolean
    resources?: boolean
  }
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isProfileLoading: boolean
  isLoggedIn: boolean
  isActive: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  needsProfile: boolean
  mustChangePassword: boolean
  isGoogleOnly: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: (options?: { redirectTo?: string }) => Promise<void>
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
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  // Fetch profile from backend or directly from Supabase DB
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      setProfileChecked(true)
      setIsProfileLoading(false)
      return null
    }

    setIsProfileLoading(true)

    // 1. Instant optimistic profile check from localStorage
    try {
      const cached = localStorage.getItem('cw_profile')
      if (cached) {
        const p = JSON.parse(cached) as Profile
        if (p && p.id === currentUser.id) {
          setProfile(p)
        }
      }
    } catch {}

    // 2. Direct query from Supabase database (sub-50ms via RLS, bypasses serverless cold start)
    try {
      const { data: dbProfile, error: dbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (!dbErr && dbProfile) {
        const p = dbProfile as Profile
        setProfile(p)
        localStorage.setItem('cw_profile', JSON.stringify(p))
        setProfileChecked(true)
        setIsProfileLoading(false)
        return p
      }

      // If dbProfile is null (user genuinely has no profile record yet),
      // verify via backend /auth/status endpoint
      if (!dbProfile && !dbErr) {
        try {
          const res = await api.get<{ profile?: Profile }>('/auth/status')
          if (res?.profile) {
            setProfile(res.profile)
            localStorage.setItem('cw_profile', JSON.stringify(res.profile))
            setProfileChecked(true)
            setIsProfileLoading(false)
            return res.profile
          }
        } catch {}

        // User genuinely has no profile row in DB (e.g. brand new Google signup)
        setProfile(null)
        setProfileChecked(true)
        setIsProfileLoading(false)
        return null
      }
    } catch (err) {
      console.warn('[Auth] Direct profile fetch error:', err)
    }

    // 3. Fallback to /api/auth/status
    try {
      const res = await api.get<{ profile?: Profile }>('/auth/status')
      const p = (res?.profile as Profile) || null
      setProfile(p)
      if (p) localStorage.setItem('cw_profile', JSON.stringify(p))
      setProfileChecked(true)
      setIsProfileLoading(false)
      return p
    } catch (err) {
      console.warn('[Auth] Profile fetch failed:', err)
      setProfileChecked(true)
      setIsProfileLoading(false)
      return null
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
        } else {
          setProfileChecked(true)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) setProfileChecked(true)
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
          setProfileChecked(false)
          setIsProfileLoading(false)
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

  const signInWithGoogle = useCallback(async (options?: { redirectTo?: string }) => {
    const defaultRedirect = typeof window !== 'undefined' ? `${window.location.origin}/login` : ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: options?.redirectTo || defaultRedirect,
      },
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
    await api.post('/auth/signup', {
      ...profileData,
      email: user?.email || '',
      auth_provider: 'google',
    })
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
    isProfileLoading,
    isLoggedIn: !!user,
    isActive: profile?.status === 'active',
    isAdmin: ['moderator', 'super_admin'].includes(profile?.role || ''),
    isSuperAdmin: profile?.role === 'super_admin',
    needsProfile: !!user && !profile && !isLoading && !isProfileLoading && profileChecked,
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
