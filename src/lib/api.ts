import { supabase } from './supabase'

// ─── Concurrency Mutex & Expiry Debounce ──────────────────────────
let activeRefreshPromise: Promise<string | null> | null = null
let isHandlingExpiry = false

/**
 * Cleanly resets the local session and redirects the user if on a protected route.
 * Debounced so multiple concurrent 401s do not trigger duplicate redirects.
 */
export async function handleSessionExpired() {
  if (isHandlingExpiry) return
  isHandlingExpiry = true

  try {
    // 1. Clear local Supabase auth session (scope: 'local' does not kill other devices)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      /* ignore */
    }

    // 2. Clear storage keys
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cw_auth_token')
        localStorage.removeItem('cw_profile')
      } catch {
        /* ignore */
      }

      // 3. Dispatch event so AuthContext immediately synchronizes React state
      window.dispatchEvent(new CustomEvent('unigram:session-expired'))

      // 4. Redirect only if currently on a protected route
      const pathname = window.location.pathname
      const publicPrefixes = [
        '/login',
        '/signup',
        '/forgot-password',
        '/terms',
        '/privacy',
        '/faq',
        '/guidelines',
        '/contact',
      ]
      const isPublic = publicPrefixes.some(
        p => pathname === p || pathname.startsWith(p + '/')
      )

      if (!isPublic) {
        const redirectUrl = encodeURIComponent(pathname + window.location.search)
        window.location.href = `/login?reason=session_expired&redirect=${redirectUrl}`
      }
    }
  } finally {
    setTimeout(() => {
      isHandlingExpiry = false
    }, 2500)
  }
}

// ─── Single-Flight Token Refresh Helper ────────────────────────────
async function executeTokenRefresh(): Promise<string | null> {
  if (activeRefreshPromise) return activeRefreshPromise

  activeRefreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data?.session?.access_token) {
        console.warn('[API] Refresh token rejected or expired on server:', error?.message)
        return null
      }
      return data.session.access_token
    } catch (e) {
      console.warn('[API] Token refresh attempt failed:', e)
      return null
    } finally {
      activeRefreshPromise = null
    }
  })()

  return activeRefreshPromise
}

// ─── Token Helper ─────────────────────────────────────────────────
async function getToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    return executeTokenRefresh()
  }

  // If a refresh is already in-flight from another concurrent call, await it!
  if (activeRefreshPromise) {
    return activeRefreshPromise
  }

  let session = null
  try {
    const res = await supabase.auth.getSession()
    session = res.data?.session
  } catch (e) {
    console.warn('[API] Error retrieving session:', e)
  }

  if (!session?.access_token) {
    return null
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const isExpired = session.expires_at ? session.expires_at <= nowSec : false
  const isExpiringSoon = session.expires_at ? session.expires_at - nowSec < 60 : false

  if (isExpired || isExpiringSoon) {
    return executeTokenRefresh()
  }

  return session.access_token
}

// ─── Request Helper ──────────────────────────────────────────────
async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { retried?: boolean }
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const url = `/api${path}`
  const init: RequestInit = { method, headers }
  if (body !== undefined && body !== null) init.body = JSON.stringify(body)

  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw Object.assign(new Error('Network error — check your connection'), {
      code: 'NETWORK_ERROR',
      status: 0,
    })
  }

  // Automatic retry on 401 Unauthorized using a freshly refreshed session
  if (response.status === 401 && !opts?.retried) {
    const freshToken = await getToken(true)
    if (freshToken && freshToken !== token) {
      return request<T>(method, path, body, { retried: true })
    }

    // Refresh failed or token was permanently rejected by server -> clean recovery
    handleSessionExpired()
  }

  let data: Record<string, unknown>
  try {
    data = await response.json()
  } catch {
    data = { error: `Server returned non-JSON (status ${response.status})` }
  }

  if (!response.ok) {
    const err = Object.assign(
      new Error((data?.error as string) || `Request failed (${response.status})`),
      {
        code: data?.code as string | undefined,
        status: response.status,
        data,
      }
    )
    throw err
  }

  return data as T
}

// ─── Exported API ────────────────────────────────────────────────
export const api = {
  get:    <T = unknown>(path: string) => request<T>('GET', path),
  post:   <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch:  <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put:    <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

export default api
