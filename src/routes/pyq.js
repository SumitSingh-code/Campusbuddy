'use strict';

// Campus Wall — PYQ (Previous Year Questions) Route
// Supports: browse by subject/year/exam-type, upload PDF (students + admins), download, delete (owner/admin).
// Files stored in Supabase Storage bucket 'pyq-files' (private, 10 MB limit).

const express = require('express');
const router  = express.Router();
const { authGuard }       = require('../middleware/authGuard');
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase-admin');

router.use(authGuard);

// ─── GET / — Browse PYQ files ─────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      subject     = '',
      search      = '',
      q           = '',
      year        = '',
      semester    = '',
      exam        = '',
      exam_type   = '',
      dept        = '',
      department  = '',
      page        = 1,
      limit       = 20,
    } = req.query;

    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    const userDept = (req.profile.department || '').trim();

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    // Students only see their own department's PYQ; admins can see All or any dept
    let effectiveDept = (department || dept || '').trim();
    if (!isAdmin && userDept) {
      effectiveDept = userDept;
    }

    const examFilter = (exam_type || exam || '').trim();
    const searchQuery = (search || q || subject || '').trim();
    const semNum = semester && semester !== 'All' ? parseInt(semester) : null;

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

    if (searchQuery) {
      query = query.or(`subject.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
    }
    if (year) query = query.eq('year', parseInt(year));
    if (examFilter) query = query.eq('exam_type', examFilter);
    if (effectiveDept && effectiveDept !== 'All') query = query.eq('department', effectiveDept);
    if (semNum && !isNaN(semNum) && semNum >= 1 && semNum <= 8) {
      query = query.ilike('title', `%Sem%${semNum}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('[pyq GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const mapped = (data || []).map(r => {
      let sem = r.semester || null;
      if (!sem && r.title) {
        const m = r.title.match(/\[Sem\s*(\d+)\]/i) || r.title.match(/Sem\s*(\d+)/i);
        if (m) sem = parseInt(m[1]);
      }
      return {
        ...r,
        semester: sem,
        file_name: r.title || r.subject || 'Question Paper',
        file_size: r.file_size_bytes || 0,
        uploaded_by: r.uploader_id,
        uploader_name: r.uploader?.full_name || 'Student',
      };
    });

    res.json({
      data: mapped,
      total: count || 0,
      user_department: userDept,
      is_admin: isAdmin,
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

router.post('/', async (req, res) => {
  try {
    const {
      title,
      subject,
      year,
      semester,
      exam_type,
      department,
      file_url,
      file_size_bytes,
      file_name,
      file_size,
    } = req.body;

    const isAdmin = ['moderator', 'super_admin'].includes(req.profile.role);
    const userDept = (req.profile?.department || '').trim();

    const safeSubject = (subject || title || file_name || '').trim();
    const safeTitle   = (title || subject || file_name || 'Question Paper').trim();
    // Non-admin students upload to their own registered department
    const safeDept    = (!isAdmin && userDept ? userDept : (department || userDept || '')).trim();
    const safeYear    = year ? parseInt(year) : new Date().getFullYear();
    const safeExam    = ['mid', 'end', 'backlog', 'other'].includes(exam_type) ? exam_type : 'end';
    const safeSize    = file_size_bytes ? parseInt(file_size_bytes) : file_size ? parseInt(file_size) : null;
    const safeSem     = semester ? parseInt(semester) : null;

    if (!safeSubject) return res.status(400).json({ error: 'Subject is required' });
    if (!safeDept)    return res.status(400).json({ error: 'Department is required' });
    if (!file_url?.trim()) return res.status(400).json({ error: 'file_url is required' });
    if (isNaN(safeYear) || safeYear < 1990 || safeYear > new Date().getFullYear() + 2) {
      return res.status(400).json({ error: 'Please enter a valid exam year' });
    }

    const semPrefix = safeSem && safeSem >= 1 && safeSem <= 8 ? `[Sem ${safeSem}] ` : '';
    let finalTitle = safeTitle.length >= 3 ? safeTitle : `${safeTitle} PYQ`;
    if (semPrefix && !finalTitle.includes(`Sem ${safeSem}`)) {
      finalTitle = `${semPrefix}${finalTitle}`;
    }

    const { data: row, error } = await supabaseAdmin
      .from('pyq_files')
      .insert({
        title:           finalTitle,
        subject:         safeSubject,
        year:            safeYear,
        exam_type:       safeExam,
        department:      safeDept,
        file_url:        file_url.trim(),
        file_size_bytes: safeSize,
        uploader_id:     req.profile.id,
        status:          'published',
      })
      .select('id, title, subject, year, exam_type, department, file_url, file_size_bytes, created_at')
      .single();

    if (error) {
      console.error('[pyq POST /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      data: {
        ...row,
        semester: safeSem,
        file_name: row.title,
        file_size: row.file_size_bytes || 0,
        uploaded_by: req.profile.id,
        uploader_name: req.profile.full_name || 'You',
      }
    });
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

    // Best-effort cleanup in storage
    if (row.file_url) {
      try {
        const match = row.file_url.match(/\/object\/public\/([^/]+)\/(.+)$/);
        if (match) {
          const bucket = match[1];
          const path = decodeURIComponent(match[2]);
          await supabaseAdmin.storage.from(bucket).remove([path]);
        }
      } catch (stErr) {
        console.warn('[pyq DELETE storage remove warn]:', stErr.message);
      }
    }

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
