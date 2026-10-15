// Campus Wall — API Wrapper (Frontend)
// Wraps calls to the Express backend at /api/*
import supabase from './supabase.js';
import Config from './config.js';

// Token cache — avoids one getSession() call per API request
let _cachedToken  = null;
let _tokenExpiry  = 0;

async function getToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const { data: { session } } = await supabase.auth.getSession();
  _cachedToken = session?.access_token || null;
  _tokenExpiry = _cachedToken ? Date.now() + 50_000 : 0; // 50-second TTL
  return _cachedToken;
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
