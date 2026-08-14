'use strict';
// Unigram — authGuard middleware
//
// Performance: authGuard previously made 2 SEQUENTIAL Supabase calls:
//   1. supabaseAdmin.auth.getUser(token)   → ~80-150ms (Supabase Auth API)
//   2. supabaseAdmin.from('profiles')...   → ~30-80ms  (DB query)
// Total overhead: ~110-230ms BEFORE the actual route handler ran.
//
// Fix: decode the user ID from the JWT payload (no network call) to use as
// the profile query key, then run auth verification + DB query in parallel
// via Promise.all(). The getUser() call still provides the cryptographically
// verified user object — we just don't wait for it sequentially.
// Saves ~80-150ms per request on every protected endpoint.

const { supabaseAdmin } = require('../lib/supabase');

/**
 * Decode user ID from JWT payload without verifying signature.
 * Used only to initiate the parallel DB query — getUser() still verifies.
 * Returns null if the JWT is malformed (parallel query will just be aborted).
 */
function _getUidFromJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded).sub || null;
  } catch {
    return null;
  }
}

// ─── verifyJwtOnly ───────────────────────────────────────────────────────────
// Verifies the Supabase JWT and sets req.user. Used on routes where the
// profile row may not exist yet (e.g. initial /signup).

const verifyJwtOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('verifyJwtOnly error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── authGuard ────────────────────────────────────────────────────────────────
// Verifies JWT + fetches profile in PARALLEL (was sequential before).
// Sets req.user and req.profile. Checks account status.

const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];

    // Decode user ID from JWT (no network) to start DB query immediately.
    // If decode fails, profileQuery will just return {data:null} and
    // getUser() will fail with UNAUTHORIZED anyway.
    const tentativeUid = _getUidFromJwt(token);

    // ── Run auth verification + DB fetch IN PARALLEL ──────────────────────────
    const [authResult, profileResult] = await Promise.all([
      supabaseAdmin.auth.getUser(token),
      tentativeUid
        ? supabaseAdmin.from('profiles').select('*').eq('id', tentativeUid).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    // Check auth result first
    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
    }

    // If tentativeUid was wrong (edge case) or profile query failed, fall back
    // to a fresh profile query with the verified user.id
    let { data: profile, error: profileError } = profileResult;
    if (!profile && !profileError && user.id !== tentativeUid) {
      ({ data: profile, error: profileError } = await supabaseAdmin
        .from('profiles').select('*').eq('id', user.id).single());
    }

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(403).json({ error: 'Profile not found', code: 'NO_PROFILE' });
      }
      console.error('authGuard DB error:', profileError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!profile) {
      return res.status(403).json({ error: 'Profile not found', code: 'NO_PROFILE' });
    }

    if (profile.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval', code: 'PENDING' });
    }
    if (profile.status === 'banned' || profile.status === 'rejected') {
      return res.status(403).json({ error: 'Account banned', code: 'BANNED' });
    }
    if (profile.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended', code: 'SUSPENDED' });
    }
    if (profile.must_change_password && !req.originalUrl.includes('change-password')) {
      return res.status(403).json({ error: 'Must change password', code: 'MUST_CHANGE_PASSWORD' });
    }

    req.user    = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('authGuard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { verifyJwtOnly, authGuard };
