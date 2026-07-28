const { supabaseAdmin } = require('../lib/supabase');

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

const authGuard = async (req, res, next) => {
  verifyJwtOnly(req, res, async () => {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(403).json({ error: 'Profile not found', code: 'NO_PROFILE' });
        }
        console.error('authGuard DB error:', error);
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

      req.profile = profile;
      next();
    } catch (err) {
      console.error('authGuard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

module.exports = { verifyJwtOnly, authGuard };
