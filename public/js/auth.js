// Campus Wall — Auth Module (Frontend)
// Manages Supabase Auth state, signup/login/logout, profile caching.
import supabase from './supabase.js';
import API from './api.js';
import { showToast } from './utils.js';

// ─── State ───────────────────────────────────────────────────────────────────
let _user    = null;
let _profile = null;
let _authListeners = [];

export const Auth = {
  // ── Getters ────────────────────────────────────────────────────────────────
  getUser()    { return _user; },
  getProfile() { return _profile; },
  isLoggedIn() { return !!_user; },
  isActive()   { return _profile?.status === 'active'; },
  isAdmin()    { return ['moderator','super_admin'].includes(_profile?.role); },
  isSuperAdmin() { return _profile?.role === 'super_admin'; },
  mustChangePassword() { return !!_profile?.must_change_password; },
  needsProfile()  { return _user && !_profile; },

  // ── Init (call on every page load) ────────────────────────────────────────
  async init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      _user = session.user;
      await _fetchProfile();
    }

    // Listen for auth state changes (OAuth callbacks, sign-out, token refresh, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        _user = session.user;
        await _fetchProfile();
        _notify(event);
      } else if (event === 'SIGNED_OUT') {
        _user    = null;
        _profile = null;
        localStorage.removeItem('cw_profile');
        _notify(event);
      } else if (event === 'PASSWORD_RECOVERY') {
        _notify('PASSWORD_RECOVERY');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        _user = session.user;
      }
    });

    return { user: _user, profile: _profile };
  },

  // ── Subscribe to auth events ───────────────────────────────────────────────
  onChange(fn) {
    _authListeners.push(fn);
    return () => { _authListeners = _authListeners.filter(f => f !== fn); };
  },

  // ── Sign in with email + password ─────────────────────────────────────────
  async signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw _mapAuthError(error);
    _user = data.user;
    await _fetchProfile();
    return { user: _user, profile: _profile };
  },

  // ── Sign in with Google OAuth ──────────────────────────────────────────────
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth.html',
      },
    });
    if (error) throw _mapAuthError(error);
    // Page redirects — no return value
  },

  // ── Sign up with email + password, then create profile ────────────────────
  async signUpWithEmail(email, password, profileData) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw _mapAuthError(error);
    if (!data.session) {
      throw new Error('Email confirmation is required. Please check your inbox.');
    }
    _user = data.user;

    // Create profile record
    await API.post('/auth/signup', {
      ...profileData,
      auth_provider: 'email',
    });

    await _fetchProfile();
    return { user: _user, profile: _profile };
  },

  // ── Complete profile (for Google OAuth new users) ──────────────────────────
  async completeProfile(profileData) {
    const res = await API.post('/auth/signup', {
      ...profileData,
      auth_provider: 'google',
    });
    await _fetchProfile();
    return res;
  },

  // ── Submit forgot-password request (no auth needed) ───────────────────────
  async forgotPassword(rollNumber, phoneNumber) {
    return API.post('/auth/forgot-password', {
      roll_number: rollNumber,
      phone_number: phoneNumber,
    });
  },

  // ── Change password (for must_change_password=true flow) ──────────────────
  async changePassword(newPassword) {
    const res = await API.post('/auth/change-password', { new_password: newPassword });
    // Refresh profile to clear must_change_password flag
    await _fetchProfile();
    return res;
  },

  // ── Sign out ───────────────────────────────────────────────────────────────
  async signOut() {
    await supabase.auth.signOut();
    _user    = null;
    _profile = null;
    localStorage.removeItem('cw_profile');
    window.location.href = '/auth.html';
  },

  // ── Refresh profile from server ────────────────────────────────────────────
  async refreshProfile() {
    return _fetchProfile();
  },

  // ── Check if user used Google only (no email identity) ────────────────────
  isGoogleOnly(user) {
    const u = user || _user;
    if (!u?.identities) return false;
    const hasGoogle = u.identities.some(i => i.provider === 'google');
    const hasEmail  = u.identities.some(i => i.provider === 'email');
    return hasGoogle && !hasEmail;
  },

  // ── Get cached profile (fast, no network) ─────────────────────────────────
  getCachedProfile() {
    try {
      const s = localStorage.getItem('cw_profile');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },

  // ── Get current access token ───────────────────────────────────────────────
  async getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _fetchProfile() {
  if (!_user) { _profile = null; return null; }
  try {
    const res = await API.get('/auth/status');
    _profile = res.profile || null;
    if (_profile) {
      localStorage.setItem('cw_profile', JSON.stringify(_profile));
    }
    return _profile;
  } catch (err) {
    // Network error — fall back to cached profile
    const cached = Auth.getCachedProfile();
    if (cached && cached.id === _user.id) {
      _profile = cached;
    }
    console.warn('[Auth] Profile fetch failed, using cache:', err.message);
    return _profile;
  }
}

function _notify(event) {
  _authListeners.forEach(fn => {
    try { fn(event, { user: _user, profile: _profile }); }
    catch (e) { console.error('[Auth] Listener error:', e); }
  });
}

function _mapAuthError(error) {
  const msg = error.message || 'Authentication failed';
  if (msg.includes('Invalid login credentials')) {
    return new Error('Incorrect email or password. Please try again.');
  }
  if (msg.includes('Email not confirmed')) {
    return new Error('Please confirm your email first.');
  }
  if (msg.includes('User already registered')) {
    return new Error('An account with this email already exists. Try logging in instead.');
  }
  return new Error(msg);
}

export default Auth;
