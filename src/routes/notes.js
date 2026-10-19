'use strict';

// Campus Wall — Study Notes Route
// Students upload notes PDFs. Browse by subject/dept/semester.
// 10 MB limit enforced at storage level via RLS.

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');
const { notify }        = require('../lib/notify');

router.use(authGuard);

// ─── GET / — Browse notes ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      subject    = '',
      department = '',
      semester   = '',
      page       = 1,
      limit      = 20,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let query = supabaseAdmin
      .from('notes')
      .select(`
        id, title, subject, department, semester, description,
        file_url, file_size_bytes, uploader_id, downloads, status, created_at,
        uploader:profiles!uploader_id ( full_name, roll_number, department )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (subject)    query = query.ilike('subject', `%${subject}%`);
    if (department && department !== 'All') query = query.eq('department', department);
    if (semester && semester !== 'All')   query = query.eq('semester', parseInt(semester));

    const { data, count, error } = await query;
    if (error) {
      console.error('[notes GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const mapped = (data || []).map(r => ({
      ...r,
      file_name: r.title || r.subject || 'Study Notes',
      file_size: r.file_size_bytes || 0,
      uploaded_by: r.uploader_id,
      uploader_name: r.uploader?.full_name || 'Student',
    }));

    res.json({
      data: mapped,
      total: count || 0,
      page: pageNum,
      limit: pageSize,
      has_more: offset + pageSize < (count || 0),
    });
  } catch (err) {
    console.error('[notes GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Upload notes record ────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { title, subject, department, semester, description, file_url, file_size_bytes, file_name, file_size } = req.body;

    const safeSubject = (subject || title || file_name || '').trim();
    const safeTitle   = (title || subject || file_name || 'Study Notes').trim();
    const safeDept    = (department || req.profile?.department || '').trim();
    const safeSize    = file_size_bytes ? parseInt(file_size_bytes) : file_size ? parseInt(file_size) : null;

    if (!safeSubject) return res.status(400).json({ error: 'Subject is required' });
    if (!safeDept)    return res.status(400).json({ error: 'Department is required' });
    if (!file_url?.trim())   return res.status(400).json({ error: 'file_url is required' });

    if (semester !== undefined && semester !== null && semester !== '') {
      const sem = parseInt(semester);
      if (isNaN(sem) || sem < 1 || sem > 8) {
        return res.status(400).json({ error: 'Semester must be between 1 and 8' });
      }
    }

    const finalTitle = safeTitle.length >= 3 ? safeTitle : `${safeTitle} Notes`;

    const { data: row, error } = await supabaseAdmin
      .from('notes')
      .insert({
        title:           finalTitle,
        subject:         safeSubject,
        department:      safeDept,
        semester:        semester ? parseInt(semester) : null,
        description:     description?.trim() || null,
        file_url:        file_url.trim(),
        file_size_bytes: safeSize,
        uploader_id:     req.profile.id,
        status:          'published',
        downloads:       0,
      })
      .select('id, title, subject, department, semester, file_url, file_size_bytes, created_at')
      .single();

    if (error) {
      console.error('[notes POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Send background notification to department students who opted into resources alerts
    (async () => {
      try {
        const { data: optInUsers } = await supabaseAdmin
          .from('profiles')
          .select('id, notification_preferences')
          .eq('status', 'active')
          .eq('department', safeDept)
          .neq('id', req.profile.id)
          .limit(100);

        for (const u of (optInUsers || [])) {
          if (u.notification_preferences?.resources === true) {
            notify(u.id, {
              type: 'resource',
              title: `📖 New Notes: ${safeSubject}`,
              body: `${row.title} shared for ${safeDept}`,
              refId: row.id,
              refType: 'notes',
              prefKey: 'resources'
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[notes] Opt-in notification dispatch error:', err.message);
      }
    })();

    res.status(201).json({
      data: {
        ...row,
        file_name: row.title,
        file_size: row.file_size_bytes || 0,
        uploaded_by: req.profile.id,
        uploader_name: req.profile.full_name || 'You',
      }
    });
  } catch (err) {
    console.error('[notes POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/download — Increment download count + get URL ─────────────────

router.post('/:id/download', async (req, res) => {
  try {
    const { data: row } = await supabaseAdmin
      .from('notes')
      .select('id, file_url, downloads, status')
      .eq('id', req.params.id)
      .single();

    if (!row || row.status !== 'published') {
      return res.status(404).json({ error: 'File not found' });
    }

    // Increment downloads (best-effort)
    supabaseAdmin
      .from('notes')
      .update({ downloads: (row.downloads || 0) + 1 })
      .eq('id', req.params.id)
      .then(() => {});

    res.json({ file_url: row.file_url, downloads: (row.downloads || 0) + 1 });
  } catch (err) {
    console.error('[notes POST /:id/download]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Delete notes (owner or admin) ─────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { data: row } = await supabaseAdmin
      .from('notes')
      .select('id, uploader_id')
      .eq('id', req.params.id)
      .single();

    if (!row) return res.status(404).json({ error: 'File not found' });

    const isOwner = row.uploader_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    await supabaseAdmin.from('notes').update({ status: 'deleted' }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[notes DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /meta — Distinct values for filter dropdowns ────────────────────────

router.get('/meta', async (req, res) => {
  try {
    const [subjects, departments] = await Promise.all([
      supabaseAdmin.from('notes').select('subject').eq('status','published').order('subject'),
      supabaseAdmin.from('notes').select('department').eq('status','published').order('department'),
    ]);
    res.json({
      subjects:    [...new Set((subjects.data||[]).map(r => r.subject))],
      departments: [...new Set((departments.data||[]).map(r => r.department))],
      semesters:   [1,2,3,4,5,6,7,8],
    });
  } catch (err) {
    console.error('[notes GET /meta]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
