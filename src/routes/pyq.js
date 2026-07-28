'use strict';

// Campus Wall — PYQ (Previous Year Questions) Route
// Supports: browse by subject/year/exam-type, upload PDF (students + admins), download, delete (owner/admin).
// Files stored in Supabase Storage bucket 'pyq-files' (private, 10 MB limit).

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase');

router.use(authGuard);

// ─── GET / — Browse PYQ files ─────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      subject  = '',
      year     = '',
      exam     = '',
      dept     = '',
      page     = 1,
      limit    = 20,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let query = supabaseAdmin
      .from('pyq_files')
      .select(`
        id, title, subject, year, exam_type, department,
        file_url, file_size_bytes, uploader_id, status, created_at,
        uploader:profiles!uploader_id ( full_name, roll_number )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (subject) query = query.ilike('subject', `%${subject}%`);
    if (year)    query = query.eq('year', parseInt(year));
    if (exam)    query = query.eq('exam_type', exam);
    if (dept)    query = query.eq('department', dept);

    const { data, count, error } = await query;
    if (error) {
      console.error('[pyq GET /]', error);
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
    console.error('[pyq GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / — Upload a PYQ record ────────────────────────────────────────────
// The client uploads the file directly to Supabase Storage (signed URL or public URL),
// then sends the resulting file_url + metadata to this endpoint to create the DB record.

router.post('/', async (req, res) => {
  try {
    const { title, subject, year, exam_type, department, file_url, file_size_bytes } = req.body;

    // Validation
    if (!title?.trim() || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!subject?.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!year || isNaN(parseInt(year)) || parseInt(year) < 2000 || parseInt(year) > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Please enter a valid exam year' });
    }
    if (!['mid', 'end', 'backlog', 'other'].includes(exam_type)) {
      return res.status(400).json({ error: 'exam_type must be mid, end, backlog, or other' });
    }
    if (!department?.trim()) return res.status(400).json({ error: 'Department is required' });
    if (!file_url?.trim())   return res.status(400).json({ error: 'file_url is required' });

    const { data: row, error } = await supabaseAdmin
      .from('pyq_files')
      .insert({
        title:           title.trim(),
        subject:         subject.trim(),
        year:            parseInt(year),
        exam_type,
        department:      department.trim(),
        file_url:        file_url.trim(),
        file_size_bytes: file_size_bytes ? parseInt(file_size_bytes) : null,
        uploader_id:     req.profile.id,
        status:          'published',
      })
      .select('id, title, subject, year, exam_type, department, file_url, file_size_bytes, created_at')
      .single();

    if (error) {
      console.error('[pyq POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: row });
  } catch (err) {
    console.error('[pyq POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Delete a PYQ file (owner or admin) ────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { data: row } = await supabaseAdmin
      .from('pyq_files')
      .select('id, uploader_id, file_url')
      .eq('id', req.params.id)
      .single();

    if (!row) return res.status(404).json({ error: 'File not found' });

    const isOwner = row.uploader_id === req.profile.id;
    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    await supabaseAdmin.from('pyq_files').update({ status: 'deleted' }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[pyq DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /meta — Distinct subjects, departments, years for filter dropdowns ───

router.get('/meta', async (req, res) => {
  try {
    const [subjects, departments, years] = await Promise.all([
      supabaseAdmin.from('pyq_files').select('subject').eq('status', 'published').order('subject'),
      supabaseAdmin.from('pyq_files').select('department').eq('status', 'published').order('department'),
      supabaseAdmin.from('pyq_files').select('year').eq('status', 'published').order('year', { ascending: false }),
    ]);

    res.json({
      subjects:    [...new Set((subjects.data || []).map(r => r.subject))],
      departments: [...new Set((departments.data || []).map(r => r.department))],
      years:       [...new Set((years.data || []).map(r => r.year))],
    });
  } catch (err) {
    console.error('[pyq GET /meta]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
