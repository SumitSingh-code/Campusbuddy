const express = require('express');
const router = express.Router();
const { adminGuard, superAdminGuard } = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(adminGuard);

router.get('/stats', async (req, res) => {
  try {
    const [
      { count: pending_signups, error: err1 },
      { count: open_reports, error: err2 },
      { count: open_reset_requests, error: err3 },
      { count: total_users, error: err4 },
      { count: active_users, error: err5 }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open').catch(() => ({ count: 0, error: null })),
      supabaseAdmin.from('password_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'active')
    ]);

    if (err1 || err3 || err4 || err5) {
      console.error('Admin stats DB error:', err1 || err3 || err4 || err5);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      pending_signups: pending_signups || 0,
      open_reports: open_reports || 0,
      open_reset_requests: open_reset_requests || 0,
      total_users: total_users || 0,
      active_users: active_users || 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending-signups', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number, department, phone_number, email, auth_provider, created_at, university_name')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Pending signups DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data: data || [] });
  } catch (err) {
    console.error('Pending signups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', req.params.id)
      .eq('status', 'pending')
      .select();

    if (error) {
      console.error('User approve DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found or not in pending status' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('User reject DB error:', updateError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    
    if (deleteAuthError) {
      console.error('User reject auth DB error:', deleteAuthError);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'banned' })
      .eq('id', req.params.id);

    if (error) {
      console.error('User ban DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('User ban error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/suspend', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', req.params.id);

    if (error) {
      console.error('User suspend DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('User suspend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/activate', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', req.params.id);

    if (error) {
      console.error('User activate DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('User activate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { q, status, role, page = 1, limit = 20 } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number, department, phone_number, email, role, status, karma, posts_count, notes_uploaded, auth_provider, created_at', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (role) query = query.eq('role', role);
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,roll_number.ilike.%${q}%`);
    }

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Get users DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      has_more: count > offset + data.length
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reset-requests', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const { data, error } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('status', status)
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Get reset requests DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: data || [] });
  } catch (err) {
    console.error('Get reset requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-requests/:id/resolve', async (req, res) => {
  try {
    const { temp_password } = req.body;
    if (!temp_password || temp_password.length < 8 || !/[a-zA-Z]/.test(temp_password) || !/[0-9]/.test(temp_password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one letter and one number' });
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !request) {
      console.error('Resolve request fetch DB error:', fetchError);
      return res.status(404).json({ error: 'Reset request not found' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', request.roll_number)
      .eq('phone_number', request.phone_number)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: temp_password
    });

    if (updateAuthError) {
      console.error('Resolve request update auth DB error:', updateAuthError);
      return res.status(500).json({ error: 'Error updating password' });
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', profile.id);

    if (updateProfileError) {
      console.error('Resolve request update profile DB error:', updateProfileError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { error: updateRequestError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({
        status: 'resolved',
        resolved_by: req.profile.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateRequestError) {
      console.error('Resolve request update DB error:', updateRequestError);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Resolve request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/reset-requests/:id/reject', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('password_reset_requests')
      .update({
        status: 'rejected',
        resolved_by: req.profile.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (error) {
      console.error('Reject request update DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admins', superAdminGuard, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number, department, role, status, created_at')
      .in('role', ['moderator', 'super_admin'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get admins DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data: data || [] });
  } catch (err) {
    console.error('Get admins error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admins', superAdminGuard, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (role !== 'moderator' && role !== 'super_admin') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', user_id);

    if (error) {
      console.error('Create admin DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admins/:id/demote', superAdminGuard, async (req, res) => {
  try {
    if (req.profile.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', req.params.id);

    if (error) {
      console.error('Demote admin DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Demote admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
