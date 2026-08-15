const express = require('express');
const router = express.Router();
const { adminGuard, superAdminGuard } = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(adminGuard);

router.get('/stats', async (req, res) => {
  try {
    // Each query is individually fault-tolerant: if a table doesn't exist yet
    // (e.g. password_reset_requests not migrated) we return 0 for that metric
    // rather than failing the entire stats endpoint.
    const safe = (p) =>
      Promise.resolve(p).catch((e) => {
        console.error('[Admin stats] query error:', e.message);
        return { count: 0, error: null };
      });

    const [r1, r2, r3, r4, r5] = await Promise.all([
      safe(supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
      safe(supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open')),
      safe(supabaseAdmin.from('password_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
      safe(supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')),
      safe(supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'active')),
    ]);

    // Log any DB-level errors (not thrown, just recorded in the result)
    [r1, r2, r3, r4, r5].forEach((r, i) => {
      if (r.error) console.error(`[Admin stats] result[${i}] error:`, r.error);
    });

    res.json({
      pending_signups:     r1.count ?? 0,
      open_reports:        r2.count ?? 0,
      open_reset_requests: r3.count ?? 0,
      total_users:         r4.count ?? 0,
      active_users:        r5.count ?? 0,
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

// ─── GET /app-config ─────────────────────────────────────────────────────────
// Returns global app configuration (cover photo URL etc.)
// Used by admin panel to show current state.

router.get('/app-config', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value, updated_at');

    if (error) {
      console.error('[admin GET /app-config]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert rows to object: { profile_cover_url: '...', ... }
    const config = {};
    (data || []).forEach(row => { config[row.key] = row.value; });
    res.json({ data: config });
  } catch (err) {
    console.error('[admin GET /app-config]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /cover-photo ────────────────────────────────────────────────────────
// Upload a new global profile cover photo (adminGuard — moderator+ only).
// Body: { image_base64: string (data URL), mime_type: string }
// - Uploads to Supabase Storage bucket 'app-assets'
// - Updates app_config row 'profile_cover_url'
// - Deletes the OLD file from storage to free space

router.post('/cover-photo', async (req, res) => {
  try {
    const { image_base64, mime_type } = req.body;

    if (!image_base64 || !mime_type) {
      return res.status(400).json({ error: 'image_base64 and mime_type are required' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mime_type)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images allowed' });
    }

    // Decode base64 → Buffer
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Size check: max 2MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Max 2MB.' });
    }

    const ext      = mime_type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `profile-cover-${Date.now()}.${ext}`;
    const path     = `covers/${filename}`;

    // ── Fetch current cover URL (to delete old file after upload) ─────────────
    const { data: configRow } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'profile_cover_url')
      .single();

    const oldUrl  = configRow?.value || '';
    // Extract storage path from old URL (format: .../storage/v1/object/public/app-assets/covers/xxx.jpg)
    const oldPath = oldUrl ? oldUrl.split('/app-assets/')[1] : null;

    // ── Upload new file to Supabase Storage ───────────────────────────────────
    const { error: uploadError } = await supabaseAdmin.storage
      .from('app-assets')
      .upload(path, buffer, {
        contentType: mime_type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[admin POST /cover-photo] upload error:', uploadError);
      return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
    }

    // ── Get public URL ────────────────────────────────────────────────────────
    const { data: urlData } = supabaseAdmin.storage
      .from('app-assets')
      .getPublicUrl(path);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({ error: 'Could not get public URL after upload' });
    }

    // ── Update app_config ─────────────────────────────────────────────────────
    const { error: configError } = await supabaseAdmin
      .from('app_config')
      .update({ value: publicUrl, updated_by: req.profile.id })
      .eq('key', 'profile_cover_url');

    if (configError) {
      console.error('[admin POST /cover-photo] config update error:', configError);
      return res.status(500).json({ error: 'Database error updating config' });
    }

    // ── Delete old file (non-blocking — failure is logged but not fatal) ──────
    if (oldPath) {
      supabaseAdmin.storage
        .from('app-assets')
        .remove([oldPath])
        .then(({ error: delErr }) => {
          if (delErr) console.warn('[admin POST /cover-photo] old file delete failed:', delErr.message);
          else console.log('[admin POST /cover-photo] old file deleted:', oldPath);
        });
    }

    res.json({ success: true, cover_url: publicUrl });
  } catch (err) {
    console.error('[admin POST /cover-photo]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

