// Campus Wall — API Wrapper (Frontend)
// Wraps calls to the Express backend at /api/*
import supabase from './supabase.js';
import Config from './config.js';

// Get valid access token, auto-refreshing if expired or about to expire
async function getToken(forceRefresh = false) {
  let { data: { session } } = await supabase.auth.getSession();

  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = session?.expires_at ? (session.expires_at <= nowSec) : false;
  const isExpiringSoon = session?.expires_at ? (session.expires_at - nowSec < 60) : false;

  if (forceRefresh || !session?.access_token || isExpiringSoon || isExpired) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        session = data.session;
      } else {
        // If refresh failed and token was expired, clear dead session reference
        if (isExpired) {
          session = null;
        }
      }
    } catch (e) {
      console.warn('[API] Token refresh attempt failed:', e);
      if (isExpired) session = null;
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
    if (freshToken && freshToken !== token) {
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
