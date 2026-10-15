import { supabase } from './supabase'

// ─── Token Cache ─────────────────────────────────────────────────
let _cachedToken: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string | null> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken
  const { data: { session } } = await supabase.auth.getSession()
  _cachedToken = session?.access_token || null
  _tokenExpiry = _cachedToken ? Date.now() + 50_000 : 0 // 50-second TTL
  return _cachedToken
}

// ─── Request Helper ──────────────────────────────────────────────
async function request(method: string, path: string, body?: unknown) {
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

  return data
}

// ─── Exported API ────────────────────────────────────────────────
export const api = {
  get:    (path: string) => request('GET', path),
  post:   (path: string, body?: unknown) => request('POST', path, body),
  patch:  (path: string, body?: unknown) => request('PATCH', path, body),
  put:    (path: string, body?: unknown) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
}

export default api
