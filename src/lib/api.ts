import { supabase } from './supabase'

// ─── Token Helper ─────────────────────────────────────────────────
async function getToken(forceRefresh = false): Promise<string | null> {
  let { data: { session } } = await supabase.auth.getSession()

  const nowSec = Math.floor(Date.now() / 1000)
  const isExpired = session?.expires_at ? (session.expires_at <= nowSec) : false
  const isExpiringSoon = session?.expires_at ? (session.expires_at - nowSec < 60) : false

  if (forceRefresh || !session?.access_token || isExpiringSoon || isExpired) {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (!error && data?.session?.access_token) {
        session = data.session
      } else if (isExpired) {
        session = null
      }
    } catch (e) {
      console.warn('[API] Token refresh attempt failed:', e)
      if (isExpired) session = null
    }
  }

  return session?.access_token || null
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
