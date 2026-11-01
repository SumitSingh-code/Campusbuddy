// Campus Wall — API Wrapper (Frontend)
// Wraps calls to the Express backend at /api/*
import supabase from './supabase.js';
import Config from './config.js';

let activeRefreshPromise = null;
let isHandlingExpiry = false;

export async function handleSessionExpired() {
  if (isHandlingExpiry) return;
  isHandlingExpiry = true;

  try {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {}

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cw_auth_token');
        localStorage.removeItem('cw_profile');
      } catch (_) {}

      const pathname = window.location.pathname;
      const isPublic = ['/login', '/signup', '/auth.html', '/forgot-password'].some(
        p => pathname === p || pathname.startsWith(p)
      );

      if (!isPublic) {
        window.location.href = `/login?reason=session_expired&redirect=${encodeURIComponent(pathname + window.location.search)}`;
      }
    }
  } finally {
    setTimeout(() => { isHandlingExpiry = false; }, 2500);
  }
}

// Get valid access token, auto-refreshing if expired or about to expire
async function getToken(forceRefresh = false) {
  if (forceRefresh && activeRefreshPromise) {
    return activeRefreshPromise;
  }

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  let { data: { session } } = await supabase.auth.getSession();

  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = session?.expires_at ? (session.expires_at <= nowSec) : false;
  const isExpiringSoon = session?.expires_at ? (session.expires_at - nowSec < 60) : false;

  if (!forceRefresh && !isExpired && !isExpiringSoon && session?.access_token) {
    return session.access_token;
  }

  activeRefreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        return data.session.access_token;
      }
      return null;
    } catch (e) {
      console.warn('[API] Token refresh attempt failed:', e);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

async function request(method, path, body = null, opts = {}) {
  const token = opts.token ?? await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${Config.API_BASE}/api${path}`;
  const init = { method, headers };
  if (body !== null) init.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url, init);
  } catch (networkErr) {
    throw Object.assign(new Error('Network error — check your connection'), {
      code: 'NETWORK_ERROR', status: 0,
    });
  }

  // Automatic retry on 401 Unauthorized using a freshly refreshed token
  if (response.status === 401 && !opts._retried) {
    const freshToken = await getToken(true);
    if (freshToken && freshToken !== token) {
      return request(method, path, body, { ...opts, token: freshToken, _retried: true });
    }
    // Refresh failed or token was permanently rejected on server -> clean recovery
    handleSessionExpired();
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: `Server returned non-JSON (status ${response.status})` };
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Request failed (${response.status})`);
    err.code = data?.code;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const API = {
  get:    (path, opts)        => request('GET',    path, null, opts),
  post:   (path, body, opts)  => request('POST',   path, body, opts),
  patch:  (path, body, opts)  => request('PATCH',  path, body, opts),
  put:    (path, body, opts)  => request('PUT',    path, body, opts),
  delete: (path, opts)        => request('DELETE', path, null, opts),
};

export default API;
