'use strict';

// Campus Wall — Timetable Route
// Students upload their own timetable (JSON grid data — no file upload, just structured data).
// Admin can upload a "master" timetable per department/semester.
// GET returns: own timetable, or master for their dept/semester if they haven't set one.

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.use(authGuard);

const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PERIODS = 8;

function validateSlots(slots) {
  if (!Array.isArray(slots)) return 'slots must be an array';
  for (const s of slots) {
    if (!DAYS.includes(s.day))                                         return `Invalid day: ${s.day}`;
    if (typeof s.period !== 'number' || s.period < 1 || s.period > MAX_PERIODS) return `Invalid period: ${s.period}`;
    if (!s.subject || typeof s.subject !== 'string' || !s.subject.trim()) return 'Each slot must have a subject';
  }
  return null;
}

// ─── GET /mine — Get current user's timetable ─────────────────────────────────

router.get('/mine', async (req, res) => {
  try {
    const uid = req.profile.id;

    const { data: own } = await supabaseAdmin
      .from('timetables')
      .select('id, slots, department, semester, label, updated_at, owner_id')
      .eq('owner_id', uid)
      .eq('is_master', false)
      .maybeSingle();

    if (own) return res.json({ data: own, source: 'personal' });

    // Fallback: master timetable for their dept
    const { data: master } = await supabaseAdmin
      .from('timetables')
      .select('id, slots, department, semester, label, updated_at')
      .eq('is_master', true)
      .eq('department', req.profile.department)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (master) return res.json({ data: master, source: 'master' });

    res.json({ data: null, source: null });
  } catch (err) {
    console.error('[timetable GET /mine]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /mine — Save personal timetable ──────────────────────────────────────

router.put('/mine', async (req, res) => {
  try {
    const { slots, semester, label } = req.body;
    const uid = req.profile.id;

    const validErr = validateSlots(slots);
    if (validErr) return res.status(400).json({ error: validErr });

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabaseAdmin
      .from('timetables')
      .select('id')
      .eq('owner_id', uid)
      .eq('is_master', false)
      .maybeSingle();

    let row, error;
    if (existing) {
      ({ data: row, error } = await supabaseAdmin
        .from('timetables')
        .update({
          slots,
          semester:   semester || null,
          label:      label?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data: row, error } = await supabaseAdmin
        .from('timetables')
        .insert({
          owner_id:   uid,
          department: req.profile.department,
          semester:   semester || null,
          label:      label?.trim() || null,
          slots,
          is_master:  false,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('[timetable PUT /mine]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data: row });
  } catch (err) {
    console.error('[timetable PUT /mine]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /mine — Clear personal timetable ─────────────────────────────────

router.delete('/mine', async (req, res) => {
  try {
    await supabaseAdmin
      .from('timetables')
      .delete()
      .eq('owner_id', req.profile.id)
      .eq('is_master', false);
    res.json({ success: true });
  } catch (err) {
    console.error('[timetable DELETE /mine]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /master — List master timetables (admin view) ───────────────────────

router.get('/master', adminGuard, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('timetables')
      .select('id, department, semester, label, updated_at, created_at')
      .eq('is_master', true)
      .order('department')
      .order('semester');

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[timetable GET /master]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /master — Create master timetable (admin only) ─────────────────────

router.post('/master', adminGuard, async (req, res) => {
  try {
    const { slots, department, semester, label } = req.body;

    if (!department?.trim()) return res.status(400).json({ error: 'Department is required' });
    const validErr = validateSlots(slots);
    if (validErr) return res.status(400).json({ error: validErr });

    const { data: row, error } = await supabaseAdmin
      .from('timetables')
      .insert({
        owner_id:   req.profile.id,
        department: department.trim(),
        semester:   semester || null,
        label:      label?.trim() || null,
        slots,
        is_master:  true,
      })
      .select()
      .single();

    if (error) {
      console.error('[timetable POST /master]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ data: row });
  } catch (err) {
    console.error('[timetable POST /master]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /master/:id — Delete a master timetable (admin only) ──────────────

router.delete('/master/:id', adminGuard, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('timetables')
      .delete()
      .eq('id', req.params.id)
      .eq('is_master', true);

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  } catch (err) {
    console.error('[timetable DELETE /master/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
