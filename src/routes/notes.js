'use strict';

// Campus Wall — Study Notes Route
// Students upload notes PDFs. Browse by subject/dept/semester.
// 10 MB limit enforced at storage level via RLS.

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');

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
    if (department) query = query.eq('department', department);
    if (semester)   query = query.eq('semester', parseInt(semester));

    const { data, count, error } = await query;
    if (error) {
      console.error('[notes GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      data: data || [],
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
    const { title, subject, department, semester, description, file_url, file_size_bytes } = req.body;

    if (!title?.trim() || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!subject?.trim())    return res.status(400).json({ error: 'Subject is required' });
    if (!department?.trim()) return res.status(400).json({ error: 'Department is required' });
    if (!file_url?.trim())   return res.status(400).json({ error: 'file_url is required' });

    if (semester !== undefined && semester !== null) {
      const sem = parseInt(semester);
      if (isNaN(sem) || sem < 1 || sem > 8) {
        return res.status(400).json({ error: 'Semester must be between 1 and 8' });
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from('notes')
      .insert({
        title:           title.trim(),
        subject:         subject.trim(),
        department:      department.trim(),
        semester:        semester ? parseInt(semester) : null,
        description:     description?.trim() || null,
        file_url:        file_url.trim(),
        file_size_bytes: file_size_bytes ? parseInt(file_size_bytes) : null,
        uploader_id:     req.profile.id,
        status:          'published',
        downloads:       0,
      })
      .select('id, title, subject, department, semester, file_url, created_at')
      .single();

    if (error) {
      console.error('[notes POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: row });
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
