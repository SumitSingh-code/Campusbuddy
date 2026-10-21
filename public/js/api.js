// Campus Wall — API Wrapper (Frontend)
// Wraps calls to the Express backend at /api/*
import supabase from './supabase.js';
import Config from './config.js';

// Get valid access token, auto-refreshing if expired or about to expire
async function getToken(forceRefresh = false) {
  let { data: { session } } = await supabase.auth.getSession();

  // If token is expiring within 60 seconds or force refresh requested
  const isExpiringSoon = session?.expires_at
    ? (session.expires_at * 1000 - Date.now() < 60_000)
    : false;

  if (forceRefresh || !session?.access_token || isExpiringSoon) {
    try {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data?.session) {
        session = refreshed.data.session;
      }
    } catch (e) {
      console.warn('[API] Token refresh attempt failed:', e);
    }
  }

  return session?.access_token || null;
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
    if (freshToken) {
      return request(method, path, body, { ...opts, token: freshToken, _retried: true });
    }
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
